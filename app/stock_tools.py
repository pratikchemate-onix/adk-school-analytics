"""Provides stock market data tools (Twelve Data quotes/profile, Alpha Vantage history/fundamentals, yfinance for NSE/BSE)."""

import logging
import os
import re
import time
from typing import Any

import httpx
import pandas as pd
import yfinance as yf
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)

TWELVE_DATA_API_KEY_ENV = "TWELVE_DATA_API_KEY"
ALPHA_VANTAGE_API_KEY_ENV = "ALPHA_VANTAGE_API_KEY"

TWELVE_DATA_BASE_URL = "https://api.twelvedata.com"
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

_HTTP_TIMEOUT = float(os.getenv("STOCK_TOOLS_HTTP_TIMEOUT", "10"))

_QUOTE_CACHE_TTL = int(os.getenv("STOCK_QUOTE_CACHE_TTL", "60"))
_PROFILE_CACHE_TTL = int(os.getenv("STOCK_PROFILE_CACHE_TTL", "86400"))
_HISTORICAL_CACHE_TTL = int(os.getenv("STOCK_HISTORICAL_CACHE_TTL", "3600"))
_FUNDAMENTALS_CACHE_TTL = int(os.getenv("STOCK_FUNDAMENTALS_CACHE_TTL", "86400"))
_SYMBOL_SEARCH_CACHE_TTL = int(os.getenv("STOCK_SYMBOL_SEARCH_CACHE_TTL", "86400"))

_HISTORICAL_MAX_POINTS = int(os.getenv("STOCK_HISTORICAL_MAX_POINTS", "90"))
_SYMBOL_SEARCH_MAX_MATCHES = 5

_INDIAN_TICKER_SUFFIXES = (".NS", ".BO")
_YFINANCE_PERIOD_BY_OUTPUT_SIZE = {"compact": "6mo", "full": "max"}

_http_client: httpx.Client | None = None
_quote_cache: dict[str, tuple[dict[str, Any], float]] = {}
_profile_cache: dict[str, tuple[dict[str, Any], float]] = {}
_historical_cache: dict[str, tuple[dict[str, Any], float]] = {}
_fundamentals_cache: dict[str, tuple[dict[str, Any], float]] = {}
_symbol_search_cache: dict[str, tuple[dict[str, Any], float]] = {}


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is not None:
        return _http_client
    _http_client = httpx.Client(timeout=_HTTP_TIMEOUT)
    return _http_client


def _require_api_key(env_var: str, provider_name: str) -> str | None:
    key = os.getenv(env_var)
    if not key:
        logger.error(f"{provider_name} API key not configured (env var {env_var} is unset).")
        return None
    return key


def _to_float(value: Any) -> float | None:
    if value is None or value == "None" or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _cache_get(cache: dict[str, tuple[dict[str, Any], float]], key: str, ttl: int) -> dict[str, Any] | None:
    if key in cache:
        cached_result, timestamp = cache[key]
        if time.time() - timestamp < ttl:
            return cached_result
    return None


def _handle_http_error(e: httpx.HTTPError, provider_name: str) -> dict[str, Any]:
    error_msg = f"Network error contacting {provider_name}: {e}"
    logger.error(error_msg)
    return {"status": "error", "error_message": error_msg}


def _is_indian_ticker(symbol: str) -> bool:
    """True if symbol has the NSE (.NS) or BSE (.BO) suffix (case-insensitive)."""
    return symbol.upper().endswith(_INDIAN_TICKER_SUFFIXES)


def _yfinance_error(context: str, e: Exception) -> dict[str, Any]:
    """Map a yfinance exception to the tools' standard error shape."""
    msg = str(e)
    is_rate_limited = (
        "rate limit" in msg.lower()
        or "too many requests" in msg.lower()
        or e.__class__.__name__ == "YFRateLimitError"
    )
    if is_rate_limited:
        error_msg = (
            "Yahoo Finance (yfinance) rate limit hit. This is an unofficial, "
            "unauthenticated data source with no guaranteed quota — wait and retry."
        )
    else:
        error_msg = f"Error fetching data from Yahoo Finance for '{context}': {e}"
    logger.error(error_msg)
    return {"status": "error", "error_message": error_msg}


def _yfinance_info(symbol: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Fetch yf.Ticker(symbol).info once; shared by quote/profile/fundamentals.

    An invalid ticker doesn't raise or return an empty dict — yfinance returns a
    near-empty dict (e.g. {"trailingPegRatio": None}) with no price/name fields,
    so "not found" is detected by the absence of those fields rather than falsiness.

    Returns (info, None) on success, or (None, error_dict) on failure/not-found.
    """
    try:
        info = yf.Ticker(symbol).info
    except Exception as e:
        return None, _yfinance_error(symbol, e)
    if not info or not (info.get("currentPrice") or info.get("regularMarketPrice") or info.get("longName")):
        return None, {
            "status": "error",
            "error_message": f"No data found for ticker '{symbol}' on Yahoo Finance. Verify the ticker symbol is correct.",
        }
    return info, None


def _extract_ceo(info: dict[str, Any]) -> str | None:
    """yfinance has no flat 'ceo' field; scan companyOfficers for a matching title.

    Indian companies commonly title their top executive "Managing Director" or
    "Chairman & MD" rather than "CEO", so title tokens are matched in addition
    to the "chief executive"/"ceo" phrase.
    """
    for officer in info.get("companyOfficers") or []:
        title = (officer.get("title") or "").lower()
        tokens = re.split(r"[^a-z]+", title)
        if "chief executive" in title or "ceo" in tokens or "md" in tokens or "managing director" in title:
            return officer.get("name")
    return None


def _finalize_historical_rows(symbol: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Sort, cap, and wrap daily OHLCV rows into the tools' standard shape.

    Shared by both providers so historical data has identical capping/report
    behavior regardless of which one served it.
    """
    rows.sort(key=lambda r: r["date"])
    total = len(rows)
    if total > _HISTORICAL_MAX_POINTS:
        rows = rows[-_HISTORICAL_MAX_POINTS:]
    report = f"Fetched {total} daily bars for {symbol}."
    if total > _HISTORICAL_MAX_POINTS:
        report += f" Showing most recent {_HISTORICAL_MAX_POINTS}."
    return {"status": "success", "symbol": symbol, "report": report, "data": rows}


def _yfinance_quote(symbol: str) -> dict[str, Any]:
    info, error = _yfinance_info(symbol)
    if error:
        return error
    current = info.get("currentPrice") or info.get("regularMarketPrice")
    previous_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
    change = info.get("regularMarketChange")
    if change is None and current is not None and previous_close is not None:
        change = current - previous_close
    percent_change = info.get("regularMarketChangePercent")
    if percent_change is None and change is not None and previous_close:
        percent_change = (change / previous_close) * 100
    return {
        "status": "success",
        "symbol": symbol,
        "current_price": current,
        "change": change,
        "percent_change": percent_change,
        "day_high": info.get("dayHigh") or info.get("regularMarketDayHigh"),
        "day_low": info.get("dayLow") or info.get("regularMarketDayLow"),
        "day_open": info.get("open") or info.get("regularMarketOpen"),
        "previous_close": previous_close,
        "as_of": info.get("regularMarketTime"),
    }


def _yfinance_profile(symbol: str) -> dict[str, Any]:
    info, error = _yfinance_info(symbol)
    if error:
        return error
    return {
        "status": "success",
        "symbol": symbol,
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "employees": info.get("fullTimeEmployees"),
        "ceo": _extract_ceo(info),
        "website": info.get("website"),
        "country": info.get("country"),
        "exchange": info.get("exchange") or info.get("fullExchangeName"),
        "description": info.get("longBusinessSummary"),
    }


def _yfinance_fundamentals(symbol: str) -> dict[str, Any]:
    info, error = _yfinance_info(symbol)
    if error:
        return error
    dividend_yield = info.get("dividendYield")
    return {
        "status": "success",
        "symbol": symbol,
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "pe_ratio": info.get("trailingPE") or info.get("forwardPE"),
        "peg_ratio": info.get("trailingPegRatio") or info.get("pegRatio"),
        "eps": info.get("trailingEps"),
        # yfinance reports dividendYield as a percent (e.g. 0.45 = 0.45%), while
        # Alpha Vantage's DividendYield is a fraction (e.g. 0.0045) — normalize
        # to a fraction so callers get a consistent scale regardless of provider.
        "dividend_yield": dividend_yield / 100 if dividend_yield is not None else None,
        "market_cap": info.get("marketCap"),
        "52_week_high": info.get("fiftyTwoWeekHigh"),
        "52_week_low": info.get("fiftyTwoWeekLow"),
        "revenue_ttm": info.get("totalRevenue"),
        "profit_margin": info.get("profitMargins"),
        "beta": info.get("beta"),
    }


def _yfinance_historical(symbol: str, output_size: str) -> dict[str, Any]:
    period = _YFINANCE_PERIOD_BY_OUTPUT_SIZE.get(output_size, "6mo")
    try:
        df = yf.Ticker(symbol).history(period=period, interval="1d", auto_adjust=False)
    except Exception as e:
        return _yfinance_error(symbol, e)
    if df is None or df.empty:
        return {
            "status": "error",
            "error_message": f"No historical data found for ticker '{symbol}' on Yahoo Finance.",
        }
    rows = [
        {
            "date": index.strftime("%Y-%m-%d"),
            "open": None if pd.isna(bar.Open) else float(bar.Open),
            "high": None if pd.isna(bar.High) else float(bar.High),
            "low": None if pd.isna(bar.Low) else float(bar.Low),
            "close": None if pd.isna(bar.Close) else float(bar.Close),
            "volume": None if pd.isna(bar.Volume) else int(bar.Volume),
        }
        for index, bar in df.iterrows()
    ]
    return _finalize_historical_rows(symbol, rows)


def _yfinance_search(query: str) -> list[dict[str, Any]]:
    """Best-effort Yahoo autocomplete fallback. Always returns a list (empty on any failure)."""
    try:
        quotes = yf.Search(query, max_results=_SYMBOL_SEARCH_MAX_MATCHES).quotes
    except Exception as e:
        logger.error(f"yfinance search fallback failed for '{query}': {e}")
        return []
    matches = []
    for q in quotes or []:
        symbol = q.get("symbol")
        if not symbol:
            continue
        exchange = q.get("exchange")
        matches.append(
            {
                "symbol": symbol,
                "name": q.get("longname") or q.get("shortname"),
                "exchange": exchange,
                "country": "India" if exchange in ("NSI", "BSE") else None,
                "instrument_type": q.get("quoteType"),
            }
        )
    return matches[:_SYMBOL_SEARCH_MAX_MATCHES]


def get_stock_quote(symbol: str, tool_context: ToolContext) -> dict[str, Any]:
    """Get the latest stock quote for a ticker symbol.

    Returns the current price, change, percent change, day high/low/open, and
    previous close for a single exchange ticker. Use this for "what's the
    current price of X" style questions.

    The symbol must be an exchange ticker (e.g. "AAPL", "MSFT"), not a company
    name. If the user names a company, resolve it to its ticker yourself
    before calling this tool; ask the user to confirm if you are unsure or the
    company is ambiguous.

    Args:
        symbol: The exchange ticker symbol (e.g. "AAPL").

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "symbol", "current_price", "change",
            "percent_change", "day_high", "day_low", "day_open",
            "previous_close", and "as_of" (unix timestamp of the quote).
        On error: includes "error_message".
    """
    symbol = symbol.strip().upper()
    cached = _cache_get(_quote_cache, symbol, _QUOTE_CACHE_TTL)
    if cached is not None:
        logger.info(f"Using cached quote for {symbol}")
        return cached

    if _is_indian_ticker(symbol):
        logger.info(
            f"Routing {symbol} to Yahoo Finance (yfinance)",
            extra={"invocation_id": tool_context.invocation_id},
        )
        result = _yfinance_quote(symbol)
        if result.get("status") == "success":
            _quote_cache[symbol] = (result, time.time())
        return result

    api_key = _require_api_key(TWELVE_DATA_API_KEY_ENV, "Twelve Data")
    if not api_key:
        return {
            "status": "error",
            "error_message": (
                f"Twelve Data API key is not configured. Set the {TWELVE_DATA_API_KEY_ENV} "
                "environment variable."
            ),
        }

    logger.info(
        f"Fetching stock quote for {symbol}",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_http_client()
        response = client.get(
            f"{TWELVE_DATA_BASE_URL}/quote", params={"symbol": symbol, "apikey": api_key}
        )
        if response.status_code == 429:
            return {
                "status": "error",
                "error_message": "Twelve Data rate limit exceeded (800 calls/day, 8/min free tier). Please wait and retry.",
            }
        if response.status_code in (401, 403):
            return {"status": "error", "error_message": "Twelve Data API key is invalid or unauthorized."}

        data = response.json()
        if isinstance(data, dict) and data.get("status") == "error":
            message = data.get("message", "Unknown error")
            if data.get("code") in (400, 404):
                return {
                    "status": "error",
                    "error_message": f"No quote data found for ticker '{symbol}'. Verify the ticker symbol is correct.",
                }
            return {"status": "error", "error_message": f"Twelve Data error: {message}"}
        if response.status_code != 200:
            return {
                "status": "error",
                "error_message": f"Twelve Data returned HTTP {response.status_code}: {response.text}",
            }

        result = {
            "status": "success",
            "symbol": symbol,
            "current_price": _to_float(data.get("close")),
            "change": _to_float(data.get("change")),
            "percent_change": _to_float(data.get("percent_change")),
            "day_high": _to_float(data.get("high")),
            "day_low": _to_float(data.get("low")),
            "day_open": _to_float(data.get("open")),
            "previous_close": _to_float(data.get("previous_close")),
            "as_of": data.get("timestamp"),
        }
        _quote_cache[symbol] = (result, time.time())
        return result
    except httpx.HTTPError as e:
        return _handle_http_error(e, "Twelve Data")
    except Exception as e:
        logger.error(f"Error fetching stock quote for {symbol}: {e}")
        return {"status": "error", "error_message": str(e)}


def get_company_profile(symbol: str, tool_context: ToolContext) -> dict[str, Any]:
    """Get company identity/overview information for a ticker symbol.

    Returns the company name, sector, industry, exchange, employee count,
    CEO, website, country, and a short description. This is a company
    identity snapshot — NOT financial ratios. Use this for "tell me about
    company X" / "what sector is X in" style questions. For valuation ratios
    (P/E, EPS, dividend yield), use get_stock_fundamentals instead.

    Args:
        symbol: The exchange ticker symbol (e.g. "AAPL").

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "symbol", "name", "sector", "industry",
            "employees", "ceo", "website", "country", "exchange",
            "description".
        On error: includes "error_message".
    """
    symbol = symbol.strip().upper()
    cached = _cache_get(_profile_cache, symbol, _PROFILE_CACHE_TTL)
    if cached is not None:
        logger.info(f"Using cached company profile for {symbol}")
        return cached

    if _is_indian_ticker(symbol):
        logger.info(
            f"Routing {symbol} to Yahoo Finance (yfinance)",
            extra={"invocation_id": tool_context.invocation_id},
        )
        result = _yfinance_profile(symbol)
        if result.get("status") == "success":
            _profile_cache[symbol] = (result, time.time())
        return result

    api_key = _require_api_key(TWELVE_DATA_API_KEY_ENV, "Twelve Data")
    if not api_key:
        return {
            "status": "error",
            "error_message": (
                f"Twelve Data API key is not configured. Set the {TWELVE_DATA_API_KEY_ENV} "
                "environment variable."
            ),
        }

    logger.info(
        f"Fetching company profile for {symbol}",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_http_client()
        response = client.get(
            f"{TWELVE_DATA_BASE_URL}/profile", params={"symbol": symbol, "apikey": api_key}
        )
        if response.status_code == 429:
            return {
                "status": "error",
                "error_message": "Twelve Data rate limit exceeded (800 calls/day, 8/min free tier). Please wait and retry.",
            }
        if response.status_code in (401, 403):
            return {"status": "error", "error_message": "Twelve Data API key is invalid or unauthorized."}

        data = response.json()
        if isinstance(data, dict) and data.get("status") == "error":
            message = data.get("message", "Unknown error")
            if data.get("code") in (400, 404):
                return {
                    "status": "error",
                    "error_message": f"No company profile found for ticker '{symbol}'.",
                }
            return {"status": "error", "error_message": f"Twelve Data error: {message}"}
        if response.status_code != 200:
            return {
                "status": "error",
                "error_message": f"Twelve Data returned HTTP {response.status_code}: {response.text}",
            }
        if not data:
            return {
                "status": "error",
                "error_message": f"No company profile found for ticker '{symbol}'.",
            }

        result = {
            "status": "success",
            "symbol": symbol,
            "name": data.get("name"),
            "sector": data.get("sector"),
            "industry": data.get("industry"),
            "employees": data.get("employees"),
            "ceo": data.get("CEO"),
            "website": data.get("website"),
            "country": data.get("country"),
            "exchange": data.get("exchange"),
            "description": data.get("description"),
        }
        _profile_cache[symbol] = (result, time.time())
        return result
    except httpx.HTTPError as e:
        return _handle_http_error(e, "Twelve Data")
    except Exception as e:
        logger.error(f"Error fetching company profile for {symbol}: {e}")
        return {"status": "error", "error_message": str(e)}


def search_stock_symbol(query: str, tool_context: ToolContext) -> dict[str, Any]:
    """Search for a company's tradable ticker symbol by name.

    Looks up live candidate ticker matches for a company name via the data
    provider — use this BEFORE calling get_stock_quote, get_company_profile,
    get_stock_historical_prices, or get_stock_fundamentals whenever the user
    names a company rather than giving a raw ticker symbol. Do not guess a
    ticker from memory; memorized company-to-ticker mappings can be stale
    (companies go public, delist, rename, or change primary listings after
    a model's training cutoff). If no matches are returned, that means the
    company has no tradable ticker known to the data provider right now — it
    may be private, delisted, or the name may be misspelled.

    Args:
        query: The company name or partial name to search for (e.g. "Apple",
            "Tesla"), not a ticker symbol.

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "query" and "matches" (list of up to 5 dicts,
            each with "symbol", "name", "exchange", "country",
            "instrument_type"). More than one match means the name is
            ambiguous — ask the user to confirm which one they mean.
        On error: includes "error_message" (e.g. no matches found, or the
            provider could not be reached).
    """
    cache_key = query.strip().lower()
    cached = _cache_get(_symbol_search_cache, cache_key, _SYMBOL_SEARCH_CACHE_TTL)
    if cached is not None:
        logger.info(f"Using cached symbol search for '{query}'")
        return cached

    api_key = _require_api_key(TWELVE_DATA_API_KEY_ENV, "Twelve Data")
    if not api_key:
        return {
            "status": "error",
            "error_message": (
                f"Twelve Data API key is not configured. Set the {TWELVE_DATA_API_KEY_ENV} "
                "environment variable."
            ),
        }

    logger.info(
        f"Searching stock symbol for '{query}'",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_http_client()
        response = client.get(
            f"{TWELVE_DATA_BASE_URL}/symbol_search", params={"symbol": query, "apikey": api_key}
        )
        if response.status_code == 429:
            return {
                "status": "error",
                "error_message": "Twelve Data rate limit exceeded (800 calls/day, 8/min free tier). Please wait and retry.",
            }
        if response.status_code in (401, 403):
            return {"status": "error", "error_message": "Twelve Data API key is invalid or unauthorized."}

        data = response.json()
        if isinstance(data, dict) and data.get("status") == "error":
            message = data.get("message", "Unknown error")
            return {"status": "error", "error_message": f"Twelve Data error: {message}"}
        if response.status_code != 200:
            return {
                "status": "error",
                "error_message": f"Twelve Data returned HTTP {response.status_code}: {response.text}",
            }

        entries = data.get("data") or []
        matches = [
            {
                "symbol": entry.get("symbol"),
                "name": entry.get("instrument_name"),
                "exchange": entry.get("exchange"),
                "country": entry.get("country"),
                "instrument_type": entry.get("instrument_type"),
            }
            for entry in entries[:_SYMBOL_SEARCH_MAX_MATCHES]
        ]

        if not matches:
            matches = _yfinance_search(query)
            if matches:
                result = {"status": "success", "query": query, "matches": matches}
                _symbol_search_cache[cache_key] = (result, time.time())
                return result
            return {
                "status": "error",
                "error_message": (
                    f"No tradable ticker found for '{query}'. It may be privately held, "
                    "delisted, or the name may be misspelled."
                ),
            }

        result = {"status": "success", "query": query, "matches": matches}
        _symbol_search_cache[cache_key] = (result, time.time())
        return result
    except httpx.HTTPError as e:
        return _handle_http_error(e, "Twelve Data")
    except Exception as e:
        logger.error(f"Error searching stock symbol for '{query}': {e}")
        return {"status": "error", "error_message": str(e)}


def get_stock_historical_prices(
    symbol: str, tool_context: ToolContext, output_size: str = "compact"
) -> dict[str, Any]:
    """Get daily historical OHLC price data for a ticker symbol.

    Returns a time series of daily open/high/low/close/volume bars, suitable
    for charting a price trend. Use this for "show me the price history /
    trend / chart for X" style questions.

    Args:
        symbol: The exchange ticker symbol (e.g. "AAPL").
        output_size: "compact" (default, last 100 trading days) or "full"
            (20+ years of history). Only use "full" if the user explicitly
            asks for multi-year history — it returns a much larger payload.

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "symbol", "report", and "data" (list of dicts
            with "date", "open", "high", "low", "close", "volume", sorted
            ascending by date, capped to the most recent data points).
        On error: includes "error_message".
    """
    symbol = symbol.strip().upper()
    cache_key = f"{symbol}:{output_size}"
    cached = _cache_get(_historical_cache, cache_key, _HISTORICAL_CACHE_TTL)
    if cached is not None:
        logger.info(f"Using cached historical prices for {cache_key}")
        return cached

    if _is_indian_ticker(symbol):
        logger.info(
            f"Routing {symbol} to Yahoo Finance (yfinance)",
            extra={"invocation_id": tool_context.invocation_id},
        )
        result = _yfinance_historical(symbol, output_size)
        if result.get("status") == "success":
            _historical_cache[cache_key] = (result, time.time())
        return result

    api_key = _require_api_key(ALPHA_VANTAGE_API_KEY_ENV, "Alpha Vantage")
    if not api_key:
        return {
            "status": "error",
            "error_message": (
                f"Alpha Vantage API key is not configured. Set the {ALPHA_VANTAGE_API_KEY_ENV} "
                "environment variable."
            ),
        }

    logger.info(
        f"Fetching historical prices for {symbol} (output_size={output_size})",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_http_client()
        response = client.get(
            ALPHA_VANTAGE_BASE_URL,
            params={
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "outputsize": output_size,
                "apikey": api_key,
            },
        )
        if response.status_code != 200:
            return {
                "status": "error",
                "error_message": f"Alpha Vantage returned HTTP {response.status_code}: {response.text}",
            }

        data = response.json()
        if "Error Message" in data:
            return {
                "status": "error",
                "error_message": f"No historical data found for ticker '{symbol}'. It may be an invalid symbol.",
            }
        if "Note" in data or "Information" in data:
            return {
                "status": "error",
                "error_message": (
                    "Alpha Vantage rate limit reached (free tier: 25 requests/day, 5/min). "
                    "Try again later or upgrade the plan."
                ),
            }

        series = data.get("Time Series (Daily)")
        if not series:
            return {
                "status": "error",
                "error_message": f"Alpha Vantage response did not include time series data for '{symbol}'.",
            }

        rows = [
            {
                "date": date_str,
                "open": _to_float(bar.get("1. open")),
                "high": _to_float(bar.get("2. high")),
                "low": _to_float(bar.get("3. low")),
                "close": _to_float(bar.get("4. close")),
                "volume": int(bar["5. volume"]) if bar.get("5. volume") else None,
            }
            for date_str, bar in series.items()
        ]

        result = _finalize_historical_rows(symbol, rows)
        _historical_cache[cache_key] = (result, time.time())
        return result
    except httpx.HTTPError as e:
        return _handle_http_error(e, "Alpha Vantage")
    except Exception as e:
        logger.error(f"Error fetching historical prices for {symbol}: {e}")
        return {"status": "error", "error_message": str(e)}


def get_stock_fundamentals(symbol: str, tool_context: ToolContext) -> dict[str, Any]:
    """Get valuation and financial ratios for a ticker symbol.

    Returns P/E ratio, PEG ratio, EPS, dividend yield, 52-week high/low,
    revenue TTM, profit margin, and beta. Use this ONLY when the user
    explicitly asks about valuation/ratios (e.g. "what's the P/E of X", "is X
    cheap or expensive") — this uses the Alpha Vantage API, which has a very
    low free-tier daily quota, so do not call it automatically alongside a
    quote or historical-price request.

    Args:
        symbol: The exchange ticker symbol (e.g. "AAPL").

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "symbol", "name", "sector", "industry",
            "pe_ratio", "peg_ratio", "eps", "dividend_yield", "market_cap",
            "52_week_high", "52_week_low", "revenue_ttm", "profit_margin",
            "beta".
        On error: includes "error_message".
    """
    symbol = symbol.strip().upper()
    cached = _cache_get(_fundamentals_cache, symbol, _FUNDAMENTALS_CACHE_TTL)
    if cached is not None:
        logger.info(f"Using cached fundamentals for {symbol}")
        return cached

    if _is_indian_ticker(symbol):
        logger.info(
            f"Routing {symbol} to Yahoo Finance (yfinance)",
            extra={"invocation_id": tool_context.invocation_id},
        )
        result = _yfinance_fundamentals(symbol)
        if result.get("status") == "success":
            _fundamentals_cache[symbol] = (result, time.time())
        return result

    api_key = _require_api_key(ALPHA_VANTAGE_API_KEY_ENV, "Alpha Vantage")
    if not api_key:
        return {
            "status": "error",
            "error_message": (
                f"Alpha Vantage API key is not configured. Set the {ALPHA_VANTAGE_API_KEY_ENV} "
                "environment variable."
            ),
        }

    logger.info(
        f"Fetching fundamentals for {symbol}",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_http_client()
        response = client.get(
            ALPHA_VANTAGE_BASE_URL,
            params={"function": "OVERVIEW", "symbol": symbol, "apikey": api_key},
        )
        if response.status_code != 200:
            return {
                "status": "error",
                "error_message": f"Alpha Vantage returned HTTP {response.status_code}: {response.text}",
            }

        data = response.json()
        if "Note" in data or "Information" in data:
            return {
                "status": "error",
                "error_message": (
                    "Alpha Vantage rate limit reached (free tier: 25 requests/day, 5/min). "
                    "Try again later or upgrade the plan."
                ),
            }
        if not data:
            return {
                "status": "error",
                "error_message": f"No fundamentals data found for ticker '{symbol}'.",
            }

        result = {
            "status": "success",
            "symbol": symbol,
            "name": data.get("Name"),
            "sector": data.get("Sector"),
            "industry": data.get("Industry"),
            "pe_ratio": _to_float(data.get("PERatio")),
            "peg_ratio": _to_float(data.get("PEGRatio")),
            "eps": _to_float(data.get("EPS")),
            "dividend_yield": _to_float(data.get("DividendYield")),
            "market_cap": _to_float(data.get("MarketCapitalization")),
            "52_week_high": _to_float(data.get("52WeekHigh")),
            "52_week_low": _to_float(data.get("52WeekLow")),
            "revenue_ttm": _to_float(data.get("RevenueTTM")),
            "profit_margin": _to_float(data.get("ProfitMargin")),
            "beta": _to_float(data.get("Beta")),
        }
        _fundamentals_cache[symbol] = (result, time.time())
        return result
    except httpx.HTTPError as e:
        return _handle_http_error(e, "Alpha Vantage")
    except Exception as e:
        logger.error(f"Error fetching fundamentals for {symbol}: {e}")
        return {"status": "error", "error_message": str(e)}
