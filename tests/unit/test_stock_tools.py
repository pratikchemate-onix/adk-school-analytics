"""Unit tests for stock market tools."""

import time
from unittest.mock import MagicMock, patch

import httpx
import pandas as pd
import pytest

import app.stock_tools as stock_tools_module
from app.stock_tools import (
    get_company_profile,
    get_stock_fundamentals,
    get_stock_historical_prices,
    get_stock_quote,
    search_stock_symbol,
)


@pytest.fixture(autouse=True)
def reset_global_state(monkeypatch):
    """Reset all module-level singletons and caches before each test."""
    stock_tools_module._http_client = None
    stock_tools_module._quote_cache = {}
    stock_tools_module._profile_cache = {}
    stock_tools_module._historical_cache = {}
    stock_tools_module._fundamentals_cache = {}
    stock_tools_module._symbol_search_cache = {}
    monkeypatch.setenv("TWELVE_DATA_API_KEY", "test-twelve-data-key")
    monkeypatch.setenv("ALPHA_VANTAGE_API_KEY", "test-av-key")
    yield
    stock_tools_module._http_client = None
    stock_tools_module._quote_cache = {}
    stock_tools_module._profile_cache = {}
    stock_tools_module._historical_cache = {}
    stock_tools_module._fundamentals_cache = {}
    stock_tools_module._symbol_search_cache = {}


def _mock_response(status_code=200, json_data=None, text=""):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.text = text
    return resp


class TestToFloatHelper:
    def test_parses_numeric_string(self):
        assert stock_tools_module._to_float("12.5") == 12.5

    def test_none_string_returns_none(self):
        assert stock_tools_module._to_float("None") is None

    def test_none_returns_none(self):
        assert stock_tools_module._to_float(None) is None

    def test_empty_string_returns_none(self):
        assert stock_tools_module._to_float("") is None

    def test_unparseable_returns_none(self):
        assert stock_tools_module._to_float("n/a") is None


class TestGetHttpClient:
    def test_singleton_reused(self):
        c1 = stock_tools_module._get_http_client()
        c2 = stock_tools_module._get_http_client()
        assert c1 is c2


class TestGetStockQuote:
    def test_success(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "symbol": "AAPL",
                    "close": "150.00",
                    "change": "1.50",
                    "percent_change": "1.00",
                    "high": "151.00",
                    "low": "149.00",
                    "open": "149.50",
                    "previous_close": "148.50",
                    "timestamp": 1700000000,
                }
            )
            mock_get_client.return_value = mock_client

            result = get_stock_quote("aapl", mock_context)
            assert result["status"] == "success"
            assert result["symbol"] == "AAPL"
            assert result["current_price"] == 150.0

    def test_ticker_not_found(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                status_code=400,
                json_data={"code": 400, "message": "**symbol** not found", "status": "error"},
            )
            mock_get_client.return_value = mock_client

            result = get_stock_quote("BOGUS", mock_context)
            assert result["status"] == "error"
            assert "No quote data found" in result["error_message"]

    def test_missing_api_key(self, monkeypatch):
        monkeypatch.delenv("TWELVE_DATA_API_KEY", raising=False)
        mock_context = MagicMock()
        result = get_stock_quote("AAPL", mock_context)
        assert result["status"] == "error"
        assert "not configured" in result["error_message"]

    def test_network_error(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.side_effect = httpx.ConnectError("connection failed")
            mock_get_client.return_value = mock_client

            result = get_stock_quote("AAPL", mock_context)
            assert result["status"] == "error"
            assert "Network error" in result["error_message"]

    def test_rate_limit(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(status_code=429)
            mock_get_client.return_value = mock_client

            result = get_stock_quote("AAPL", mock_context)
            assert result["status"] == "error"
            assert "rate limit" in result["error_message"].lower()

    def test_cache_hit_skips_network(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "close": "150.00", "change": "1.50", "percent_change": "1.00",
                    "high": "151.00", "low": "149.00", "open": "149.50",
                    "previous_close": "148.50", "timestamp": 1700000000,
                }
            )
            mock_get_client.return_value = mock_client

            get_stock_quote("AAPL", mock_context)
            get_stock_quote("AAPL", mock_context)
            assert mock_client.get.call_count == 1

    def test_cache_expiry_refetches(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "close": "150.00", "change": "1.50", "percent_change": "1.00",
                    "high": "151.00", "low": "149.00", "open": "149.50",
                    "previous_close": "148.50", "timestamp": 1700000000,
                }
            )
            mock_get_client.return_value = mock_client

            get_stock_quote("AAPL", mock_context)
            result, _ = stock_tools_module._quote_cache["AAPL"]
            stock_tools_module._quote_cache["AAPL"] = (result, time.time() - 61)

            get_stock_quote("AAPL", mock_context)
            assert mock_client.get.call_count == 2


class TestGetCompanyProfile:
    def test_success(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "name": "Apple Inc",
                    "sector": "Technology",
                    "industry": "Consumer Electronics",
                    "employees": 164000,
                    "CEO": "Tim Cook",
                    "website": "https://apple.com",
                    "country": "US",
                    "exchange": "NASDAQ",
                    "description": "Apple Inc designs, manufactures, and markets smartphones...",
                }
            )
            mock_get_client.return_value = mock_client

            result = get_company_profile("aapl", mock_context)
            assert result["status"] == "success"
            assert result["name"] == "Apple Inc"
            assert result["ceo"] == "Tim Cook"

    def test_ticker_not_found(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                status_code=400,
                json_data={"code": 400, "message": "**symbol** not found", "status": "error"},
            )
            mock_get_client.return_value = mock_client

            result = get_company_profile("BOGUS", mock_context)
            assert result["status"] == "error"
            assert "No company profile found" in result["error_message"]

    def test_missing_api_key(self, monkeypatch):
        monkeypatch.delenv("TWELVE_DATA_API_KEY", raising=False)
        mock_context = MagicMock()
        result = get_company_profile("AAPL", mock_context)
        assert result["status"] == "error"
        assert "not configured" in result["error_message"]

    def test_cache_hit_skips_network(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(json_data={"name": "Apple Inc"})
            mock_get_client.return_value = mock_client

            get_company_profile("AAPL", mock_context)
            get_company_profile("AAPL", mock_context)
            assert mock_client.get.call_count == 1

    def test_cache_expiry_refetches(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(json_data={"name": "Apple Inc"})
            mock_get_client.return_value = mock_client

            get_company_profile("AAPL", mock_context)
            result, _ = stock_tools_module._profile_cache["AAPL"]
            stock_tools_module._profile_cache["AAPL"] = (result, time.time() - 86401)

            get_company_profile("AAPL", mock_context)
            assert mock_client.get.call_count == 2


class TestGetStockHistoricalPrices:
    def _series(self, n=5):
        return {
            f"2024-01-{i + 1:02d}": {
                "1. open": str(100 + i),
                "2. high": str(101 + i),
                "3. low": str(99 + i),
                "4. close": str(100.5 + i),
                "5. volume": str(1000 + i),
            }
            for i in range(n)
        }

    def test_success_parses_and_sorts(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={"Time Series (Daily)": self._series(5)}
            )
            mock_get_client.return_value = mock_client

            result = get_stock_historical_prices("AAPL", mock_context)
            assert result["status"] == "success"
            assert len(result["data"]) == 5
            dates = [row["date"] for row in result["data"]]
            assert dates == sorted(dates)

    def test_error_message_not_found(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={"Error Message": "Invalid symbol"}
            )
            mock_get_client.return_value = mock_client

            result = get_stock_historical_prices("BOGUS", mock_context)
            assert result["status"] == "error"
            assert "No historical data found" in result["error_message"]

    def test_note_rate_limit(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={"Note": "Thank you for using Alpha Vantage! Our standard API..."}
            )
            mock_get_client.return_value = mock_client

            result = get_stock_historical_prices("AAPL", mock_context)
            assert result["status"] == "error"
            assert "rate limit" in result["error_message"].lower()

    def test_information_rate_limit(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={"Information": "quota exceeded"}
            )
            mock_get_client.return_value = mock_client

            result = get_stock_historical_prices("AAPL", mock_context)
            assert result["status"] == "error"
            assert "rate limit" in result["error_message"].lower()

    def test_missing_api_key(self, monkeypatch):
        monkeypatch.delenv("ALPHA_VANTAGE_API_KEY", raising=False)
        mock_context = MagicMock()
        result = get_stock_historical_prices("AAPL", mock_context)
        assert result["status"] == "error"
        assert "not configured" in result["error_message"]

    def test_row_capping(self):
        mock_context = MagicMock()
        original_max = stock_tools_module._HISTORICAL_MAX_POINTS
        stock_tools_module._HISTORICAL_MAX_POINTS = 3
        try:
            with patch("app.stock_tools._get_http_client") as mock_get_client:
                mock_client = MagicMock()
                mock_client.get.return_value = _mock_response(
                    json_data={"Time Series (Daily)": self._series(10)}
                )
                mock_get_client.return_value = mock_client

                result = get_stock_historical_prices("AAPL", mock_context)
                assert result["status"] == "success"
                assert len(result["data"]) == 3
                assert "Showing most recent 3" in result["report"]
        finally:
            stock_tools_module._HISTORICAL_MAX_POINTS = original_max

    def test_cache_hit_skips_network(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={"Time Series (Daily)": self._series(2)}
            )
            mock_get_client.return_value = mock_client

            get_stock_historical_prices("AAPL", mock_context)
            get_stock_historical_prices("AAPL", mock_context)
            assert mock_client.get.call_count == 1

    def test_cache_expiry_refetches(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={"Time Series (Daily)": self._series(2)}
            )
            mock_get_client.return_value = mock_client

            get_stock_historical_prices("AAPL", mock_context)
            key = "AAPL:compact"
            result, _ = stock_tools_module._historical_cache[key]
            stock_tools_module._historical_cache[key] = (result, time.time() - 3601)

            get_stock_historical_prices("AAPL", mock_context)
            assert mock_client.get.call_count == 2


class TestGetStockFundamentals:
    def test_success_with_float_casting(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "Name": "Apple Inc",
                    "Sector": "Technology",
                    "Industry": "Consumer Electronics",
                    "PERatio": "28.5",
                    "PEGRatio": "None",
                    "EPS": "6.1",
                    "DividendYield": "0.005",
                    "MarketCapitalization": "3000000000000",
                    "52WeekHigh": "199.5",
                    "52WeekLow": "150.0",
                    "RevenueTTM": "400000000000",
                    "ProfitMargin": "0.25",
                    "Beta": "1.2",
                }
            )
            mock_get_client.return_value = mock_client

            result = get_stock_fundamentals("aapl", mock_context)
            assert result["status"] == "success"
            assert result["pe_ratio"] == 28.5
            assert result["peg_ratio"] is None

    def test_empty_dict_not_found(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(json_data={})
            mock_get_client.return_value = mock_client

            result = get_stock_fundamentals("BOGUS", mock_context)
            assert result["status"] == "error"
            assert "No fundamentals data found" in result["error_message"]

    def test_note_rate_limit(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={"Note": "Thank you for using Alpha Vantage!"}
            )
            mock_get_client.return_value = mock_client

            result = get_stock_fundamentals("AAPL", mock_context)
            assert result["status"] == "error"
            assert "rate limit" in result["error_message"].lower()

    def test_missing_api_key(self, monkeypatch):
        monkeypatch.delenv("ALPHA_VANTAGE_API_KEY", raising=False)
        mock_context = MagicMock()
        result = get_stock_fundamentals("AAPL", mock_context)
        assert result["status"] == "error"
        assert "not configured" in result["error_message"]


class TestSearchStockSymbol:
    def test_success(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "data": [
                        {
                            "symbol": "AAPL",
                            "instrument_name": "Apple Inc",
                            "exchange": "NASDAQ",
                            "country": "United States",
                            "instrument_type": "Common Stock",
                        }
                    ],
                    "status": "ok",
                }
            )
            mock_get_client.return_value = mock_client

            result = search_stock_symbol("Apple", mock_context)
            assert result["status"] == "success"
            assert result["query"] == "Apple"
            assert len(result["matches"]) == 1
            assert result["matches"][0]["symbol"] == "AAPL"
            assert result["matches"][0]["name"] == "Apple Inc"
            assert result["matches"][0]["exchange"] == "NASDAQ"

    def test_caps_at_five_matches(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "data": [
                        {"symbol": f"SYM{i}", "instrument_name": f"Company {i}"} for i in range(10)
                    ],
                    "status": "ok",
                }
            )
            mock_get_client.return_value = mock_client

            result = search_stock_symbol("common", mock_context)
            assert result["status"] == "success"
            assert len(result["matches"]) == 5

    def test_no_matches(self):
        mock_context = MagicMock()
        with (
            patch("app.stock_tools._get_http_client") as mock_get_client,
            patch("app.stock_tools.yf.Search") as mock_search_cls,
        ):
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(json_data={"data": [], "status": "ok"})
            mock_get_client.return_value = mock_client
            mock_search_cls.return_value.quotes = []

            result = search_stock_symbol("SpaceX", mock_context)
            assert result["status"] == "error"
            assert "No tradable ticker found" in result["error_message"]

    def test_provider_error(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                status_code=400,
                json_data={"code": 400, "message": "bad request", "status": "error"},
            )
            mock_get_client.return_value = mock_client

            result = search_stock_symbol("???", mock_context)
            assert result["status"] == "error"
            assert "Twelve Data error" in result["error_message"]

    def test_missing_api_key(self, monkeypatch):
        monkeypatch.delenv("TWELVE_DATA_API_KEY", raising=False)
        mock_context = MagicMock()
        result = search_stock_symbol("Apple", mock_context)
        assert result["status"] == "error"
        assert "not configured" in result["error_message"]

    def test_network_error(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.side_effect = httpx.ConnectError("connection failed")
            mock_get_client.return_value = mock_client

            result = search_stock_symbol("Apple", mock_context)
            assert result["status"] == "error"
            assert "Network error" in result["error_message"]

    def test_rate_limit(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(status_code=429)
            mock_get_client.return_value = mock_client

            result = search_stock_symbol("Apple", mock_context)
            assert result["status"] == "error"
            assert "rate limit" in result["error_message"].lower()

    def test_cache_hit_skips_network(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "data": [{"symbol": "AAPL", "instrument_name": "Apple Inc"}],
                    "status": "ok",
                }
            )
            mock_get_client.return_value = mock_client

            search_stock_symbol("Apple", mock_context)
            search_stock_symbol("Apple", mock_context)
            assert mock_client.get.call_count == 1

    def test_cache_expiry_refetches(self):
        mock_context = MagicMock()
        with patch("app.stock_tools._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(
                json_data={
                    "data": [{"symbol": "AAPL", "instrument_name": "Apple Inc"}],
                    "status": "ok",
                }
            )
            mock_get_client.return_value = mock_client

            search_stock_symbol("Apple", mock_context)
            key = "apple"
            result, _ = stock_tools_module._symbol_search_cache[key]
            stock_tools_module._symbol_search_cache[key] = (result, time.time() - 86401)

            search_stock_symbol("Apple", mock_context)
            assert mock_client.get.call_count == 2


class TestIsIndianTicker:
    def test_ns_suffix(self):
        assert stock_tools_module._is_indian_ticker("RELIANCE.NS") is True

    def test_bo_suffix(self):
        assert stock_tools_module._is_indian_ticker("RELIANCE.BO") is True

    def test_case_insensitive(self):
        assert stock_tools_module._is_indian_ticker("reliance.ns") is True

    def test_non_indian_ticker(self):
        assert stock_tools_module._is_indian_ticker("AAPL") is False


class TestGetStockQuoteIndianRouting:
    def test_success(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {
                "currentPrice": 2900.5,
                "previousClose": 2880.0,
                "regularMarketChange": 20.5,
                "regularMarketChangePercent": 0.71,
                "dayHigh": 2910.0,
                "dayLow": 2875.0,
                "open": 2885.0,
                "regularMarketTime": 1700000000,
            }
            mock_ticker_cls.return_value = mock_ticker

            result = get_stock_quote("reliance.ns", mock_context)
            assert result["status"] == "success"
            assert result["symbol"] == "RELIANCE.NS"
            assert result["current_price"] == 2900.5
            assert result["change"] == 20.5
            mock_ticker_cls.assert_called_once_with("RELIANCE.NS")

    def test_no_data_found(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {"trailingPegRatio": None}
            mock_ticker_cls.return_value = mock_ticker

            result = get_stock_quote("BOGUS.NS", mock_context)
            assert result["status"] == "error"
            assert "No data found" in result["error_message"]

    def test_exception_maps_to_error(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker_cls.side_effect = RuntimeError("boom")

            result = get_stock_quote("RELIANCE.NS", mock_context)
            assert result["status"] == "error"
            assert "Yahoo Finance" in result["error_message"]

    def test_does_not_call_twelve_data(self):
        mock_context = MagicMock()
        with (
            patch("app.stock_tools.yf.Ticker") as mock_ticker_cls,
            patch("app.stock_tools._get_http_client") as mock_get_client,
        ):
            mock_ticker = MagicMock()
            mock_ticker.info = {"currentPrice": 100.0, "longName": "Test"}
            mock_ticker_cls.return_value = mock_ticker

            get_stock_quote("RELIANCE.NS", mock_context)
            mock_get_client.assert_not_called()

    def test_cache_hit_skips_network(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {"currentPrice": 2900.5, "previousClose": 2880.0}
            mock_ticker_cls.return_value = mock_ticker

            get_stock_quote("RELIANCE.NS", mock_context)
            get_stock_quote("RELIANCE.NS", mock_context)
            assert mock_ticker_cls.call_count == 1


class TestGetCompanyProfileIndianRouting:
    def test_success_extracts_ceo_from_managing_director_title(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {
                "longName": "Reliance Industries Limited",
                "sector": "Energy",
                "industry": "Oil & Gas Refining & Marketing",
                "fullTimeEmployees": 404501,
                "website": "https://www.ril.com",
                "country": "India",
                "exchange": "NSI",
                "longBusinessSummary": "Reliance Industries Limited engages in...",
                "companyOfficers": [
                    {"name": "Mr. Mukesh Dhirubhai Ambani", "title": "Chairman & MD"},
                    {"name": "Ms. Savithri Parekh", "title": "Company Secretary & Compliance Officer"},
                ],
            }
            mock_ticker_cls.return_value = mock_ticker

            result = get_company_profile("RELIANCE.NS", mock_context)
            assert result["status"] == "success"
            assert result["name"] == "Reliance Industries Limited"
            assert result["ceo"] == "Mr. Mukesh Dhirubhai Ambani"
            assert result["country"] == "India"

    def test_no_matching_officer_title_returns_none_ceo(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {
                "longName": "Some Company",
                "companyOfficers": [{"name": "Someone", "title": "Company Secretary"}],
            }
            mock_ticker_cls.return_value = mock_ticker

            result = get_company_profile("SOME.NS", mock_context)
            assert result["status"] == "success"
            assert result["ceo"] is None

    def test_no_data_found(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {}
            mock_ticker_cls.return_value = mock_ticker

            result = get_company_profile("BOGUS.NS", mock_context)
            assert result["status"] == "error"
            assert "No data found" in result["error_message"]


class TestGetStockHistoricalPricesIndianRouting:
    def _dataframe(self, n=5):
        index = pd.date_range("2024-01-01", periods=n, freq="D")
        return pd.DataFrame(
            {
                "Open": [100.0 + i for i in range(n)],
                "High": [101.0 + i for i in range(n)],
                "Low": [99.0 + i for i in range(n)],
                "Close": [100.5 + i for i in range(n)],
                "Volume": [1000 + i for i in range(n)],
            },
            index=index,
        )

    def test_success_compact_uses_6mo_period(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.history.return_value = self._dataframe(5)
            mock_ticker_cls.return_value = mock_ticker

            result = get_stock_historical_prices("RELIANCE.NS", mock_context)
            assert result["status"] == "success"
            assert len(result["data"]) == 5
            mock_ticker.history.assert_called_once_with(period="6mo", interval="1d", auto_adjust=False)

    def test_full_output_size_uses_max_period(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.history.return_value = self._dataframe(3)
            mock_ticker_cls.return_value = mock_ticker

            get_stock_historical_prices("RELIANCE.NS", mock_context, output_size="full")
            mock_ticker.history.assert_called_once_with(period="max", interval="1d", auto_adjust=False)

    def test_empty_dataframe_returns_error(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.history.return_value = pd.DataFrame()
            mock_ticker_cls.return_value = mock_ticker

            result = get_stock_historical_prices("BOGUS.NS", mock_context)
            assert result["status"] == "error"
            assert "No historical data found" in result["error_message"]


class TestGetStockFundamentalsIndianRouting:
    def test_success_normalizes_dividend_yield_to_fraction(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {
                "longName": "Reliance Industries Limited",
                "sector": "Energy",
                "industry": "Oil & Gas Refining & Marketing",
                "trailingPE": 24.1,
                "pegRatio": 0.82,
                "trailingEps": 55.21,
                "dividendYield": 0.45,
                "marketCap": 18011721302016,
                "fiftyTwoWeekHigh": 1611.8,
                "fiftyTwoWeekLow": 1253.2,
                "totalRevenue": 11118400503808,
                "profitMargins": 0.0672,
                "beta": None,
            }
            mock_ticker_cls.return_value = mock_ticker

            result = get_stock_fundamentals("RELIANCE.NS", mock_context)
            assert result["status"] == "success"
            assert result["pe_ratio"] == 24.1
            assert result["dividend_yield"] == pytest.approx(0.0045)

    def test_no_data_found(self):
        mock_context = MagicMock()
        with patch("app.stock_tools.yf.Ticker") as mock_ticker_cls:
            mock_ticker = MagicMock()
            mock_ticker.info = {}
            mock_ticker_cls.return_value = mock_ticker

            result = get_stock_fundamentals("BOGUS.NS", mock_context)
            assert result["status"] == "error"
            assert "No data found" in result["error_message"]


class TestSearchStockSymbolYFinanceFallback:
    def test_falls_back_to_yfinance_when_twelve_data_has_zero_matches(self):
        mock_context = MagicMock()
        with (
            patch("app.stock_tools._get_http_client") as mock_get_client,
            patch("app.stock_tools.yf.Search") as mock_search_cls,
        ):
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(json_data={"data": [], "status": "ok"})
            mock_get_client.return_value = mock_client
            mock_search_cls.return_value.quotes = [
                {
                    "symbol": "RELIANCE.NS",
                    "longname": "Reliance Industries Limited",
                    "exchange": "NSI",
                    "quoteType": "EQUITY",
                }
            ]

            result = search_stock_symbol("Reliance Industries", mock_context)
            assert result["status"] == "success"
            assert result["matches"][0]["symbol"] == "RELIANCE.NS"
            assert result["matches"][0]["country"] == "India"

    def test_both_providers_zero_matches_still_errors(self):
        mock_context = MagicMock()
        with (
            patch("app.stock_tools._get_http_client") as mock_get_client,
            patch("app.stock_tools.yf.Search") as mock_search_cls,
        ):
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(json_data={"data": [], "status": "ok"})
            mock_get_client.return_value = mock_client
            mock_search_cls.return_value.quotes = []

            result = search_stock_symbol("NotARealCompanyXyz", mock_context)
            assert result["status"] == "error"
            assert "No tradable ticker found" in result["error_message"]

    def test_yfinance_search_exception_treated_as_no_matches(self):
        mock_context = MagicMock()
        with (
            patch("app.stock_tools._get_http_client") as mock_get_client,
            patch("app.stock_tools.yf.Search") as mock_search_cls,
        ):
            mock_client = MagicMock()
            mock_client.get.return_value = _mock_response(json_data={"data": [], "status": "ok"})
            mock_get_client.return_value = mock_client
            mock_search_cls.side_effect = RuntimeError("boom")

            result = search_stock_symbol("NotARealCompanyXyz", mock_context)
            assert result["status"] == "error"
            assert "No tradable ticker found" in result["error_message"]
