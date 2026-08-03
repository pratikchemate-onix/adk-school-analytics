"""Provides BigQuery utility functions for read-only query execution."""

import datetime
import logging
import os
import re
import time
from typing import Any

from google.adk.tools import ToolContext
from google.cloud import bigquery
from google.oauth2 import service_account

logger = logging.getLogger(__name__)

_query_call_counts: dict[str, int] = {}
_bq_client: bigquery.Client | None = None
_metadata_cache: dict[str, tuple[dict[str, Any], float]] = {}
_METADATA_CACHE_TTL = 600  # 10 minutes

# SQL logger — separate logger so it can be filtered independently
_sql_logger = logging.getLogger(__name__ + ".sql")


def _rewrite_sum_safe_cast(query: str) -> str:
    """Wrap every SUM(expr) with SUM(SAFE_CAST(expr AS FLOAT64)).

    This prevents 'No matching signature for SUM on STRING' BigQuery errors
    when the LLM generates SUM() on a STRING-typed column.  SAFE_CAST returns
    NULL for values that cannot be converted, so numeric-string columns still
    aggregate correctly while pure-text columns silently return NULL instead of
    crashing.

    Only rewrites bare SUM(expr) forms — does not touch SAFE_CAST that is
    already present.
    """
    # Match SUM( ... ) that does NOT already contain SAFE_CAST to avoid double-wrapping.
    # Handles: SUM(col), SUM(t.col), SUM(DISTINCT col) — but not SUM(SAFE_CAST(...))
    pattern = re.compile(
        r'\bSUM\s*\(\s*(?!SAFE_CAST\b)((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*)\s*\)',
        re.IGNORECASE,
    )

    def _wrap(m: re.Match) -> str:
        inner = m.group(1).strip()
        # Preserve DISTINCT keyword if present: SUM(DISTINCT col) → SUM(DISTINCT SAFE_CAST(col AS FLOAT64))
        distinct_match = re.match(r'^(DISTINCT\s+)', inner, re.IGNORECASE)
        if distinct_match:
            prefix = distinct_match.group(1)
            rest = inner[len(prefix):]
            return f"SUM({prefix}SAFE_CAST({rest} AS FLOAT64))"
        return f"SUM(SAFE_CAST({inner} AS FLOAT64))"

    rewritten = pattern.sub(_wrap, query)
    if rewritten != query:
        _sql_logger.info("Rewrote SUM() → SUM(SAFE_CAST(... AS FLOAT64)):\nBefore: %s\nAfter:  %s", query, rewritten)
    return rewritten


def _get_max_query_calls() -> int:
    return int(os.getenv("BQ_MAX_QUERIES_PER_INVOCATION", "10"))


def reset_query_count(invocation_id: str | None = None) -> None:
    """Reset query count for a specific invocation or all invocations.

    Args:
        invocation_id: If provided, reset only this invocation. If None, reset all.
    """
    global _query_call_counts
    if invocation_id:
        _query_call_counts.pop(invocation_id, None)
    else:
        _query_call_counts.clear()


def _get_client(tool_context: ToolContext) -> bigquery.Client:
    global _bq_client
    if _bq_client is not None:
        return _bq_client

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    logger.info(f"Getting BigQuery client for project: {project_id}")
    try:
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path and os.path.exists(credentials_path):
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path
            )
            client = bigquery.Client(project=project_id, credentials=credentials)
            logger.info(
                f"Successfully created BigQuery client with SA credentials for project: {project_id}"
            )
        else:
            client = bigquery.Client(project=project_id)
            logger.info(
                f"Successfully created BigQuery client with ADC for project: {project_id}"
            )
        _bq_client = client
        return _bq_client
    except Exception as e:
        error_msg = (
            f"Failed to create BigQuery client: {e}. Ensure credentials are configured."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e


def _to_iso_date(value: Any) -> Any:
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    return value


def list_tables(
    dataset_id: str, tool_context: ToolContext, project_id: str = ""
) -> dict[str, Any]:
    """List all tables available in a BigQuery dataset.

    Returns each table's ID, type, and description. Use this tool to discover
    which tables exist before calling fetch_metadata for detailed schema
    information.

    Requires the bigquery.metadataViewer role.

    Args:
        dataset_id: The BigQuery dataset ID to list tables from
            (e.g. "my_dataset").
        project_id: The GCP project ID containing the dataset. If not provided,
            defaults to the primary configured project.

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "project_id", "dataset_id" and "tables" (list of
            dicts with "table_id", "type", and "description" for each table).
        On error: includes "error_message".
    """
    resolved_project = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
    logger.info(
        f"Listing tables in {resolved_project}.{dataset_id}",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_client(tool_context)
        dataset_ref = f"{resolved_project}.{dataset_id}"
        tables = []
        for table_item in client.list_tables(dataset_ref):
            table = client.get_table(table_item.reference)
            tables.append(
                {
                    "table_id": table.table_id,
                    "type": table.table_type,
                    "description": table.description or "",
                }
            )
        report = f"Found {len(tables)} table(s) in {resolved_project}.{dataset_id}."
        logger.info(report)
        return {
            "status": "success",
            "project_id": resolved_project,
            "dataset_id": dataset_id,
            "tables": tables,
        }
    except Exception as e:
        logger.error(f"Error listing tables in {resolved_project}.{dataset_id}: {e}")
        return {
            "status": "error",
            "error_message": str(e),
        }


def fetch_metadata(
    dataset_id: str,
    table_id: str,
    tool_context: ToolContext,
    project_id: str = "",
) -> dict[str, Any]:
    """Fetch schema metadata for a BigQuery table.

    Retrieves the table description, column names, column types, and column
    descriptions directly from BigQuery using the metadata API. Requires the
    bigquery.metadataViewer role. Use this tool to inspect a table's schema
    before constructing SQL queries.

    Args:
        dataset_id: The BigQuery dataset ID (e.g. "my_dataset").
        table_id: The BigQuery table ID (e.g. "my_table").
        project_id: The GCP project ID containing the table. If not provided,
            defaults to the primary configured project. Use the project_id
            returned from list_tables to query cross-project
            tables.

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "project_id", "dataset_id", "table_id",
            "description", "num_rows", "num_bytes", and "columns" (list of
            dicts with "name", "type", and "description" for each column).
        On error: includes "error_message".
    """
    resolved_project = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
    cache_key = f"{resolved_project}.{dataset_id}.{table_id}"

    if cache_key in _metadata_cache:
        cached_result, timestamp = _metadata_cache[cache_key]
        if time.time() - timestamp < _METADATA_CACHE_TTL:
            logger.info(f"Using cached metadata for {cache_key}")
            return cached_result

    logger.info(
        f"Fetching metadata for {cache_key}",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_client(tool_context)
        table_ref = cache_key
        table = client.get_table(table_ref)
        string_fields = [f for f in table.schema if f.field_type == "STRING"]
        distinct_values_map = {}
        if string_fields:
            union_parts = []
            for field in string_fields:
                q_part = f"(SELECT '{field.name}' AS col, CAST(`{field.name}` AS STRING) AS val FROM `{table_ref}` WHERE `{field.name}` IS NOT NULL GROUP BY val LIMIT 20)"
                union_parts.append(q_part)

            union_query = "\nUNION ALL\n".join(union_parts)
            try:
                for row in client.query(union_query).result():
                    col_name = row[0]
                    val = row[1]
                    if col_name not in distinct_values_map:
                        distinct_values_map[col_name] = []
                    distinct_values_map[col_name].append(val)
            except Exception as e:
                logger.warning(f"Could not fetch distinct values for {table_ref}: {e}")

        columns = []
        for field in table.schema:
            col_info = {
                "name": field.name,
                "type": field.field_type,
                "description": field.description or "",
            }
            if field.name in distinct_values_map:
                col_info["distinct_values"] = distinct_values_map[field.name]
            columns.append(col_info)
        report = f"Fetched metadata for {resolved_project}.{dataset_id}.{table_id}: {len(columns)} columns."
        logger.info(report)
        result = {
            "status": "success",
            "project_id": resolved_project,
            "dataset_id": dataset_id,
            "table_id": table_id,
            "description": table.description or "",
            "num_rows": table.num_rows,
            "num_bytes": table.num_bytes,
            "columns": columns,
        }
        _metadata_cache[cache_key] = (result, time.time())
        return result
    except Exception as e:
        logger.error(
            f"Error fetching metadata for {resolved_project}.{dataset_id}.{table_id}: {e}"
        )
        return {
            "status": "error",
            "error_message": str(e),
        }


def run_query(
    query: str, tool_context: ToolContext, dry_run: bool = False
) -> dict[str, Any]:
    """Execute a read-only SQL query against BigQuery.

    Only SELECT and WITH queries are allowed. Dry run mode validates the query
    without executing it, returning cost estimates.

    Args:
        query: The SQL query to execute.
        dry_run: If True, only validate the query without executing.

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success (dry_run=False): includes "report" and "data" (list of dicts).
        On success (dry_run=True): includes "report", "bytes_processed", "estimated_cost_usd".
        On error: includes "error_message".
    """
    logger.info(
        f"Running query (dry_run={dry_run})",
        extra={"invocation_id": tool_context.invocation_id},
    )

    invocation_id = tool_context.invocation_id
    max_calls = _get_max_query_calls()
    current_count = _query_call_counts.get(invocation_id, 0)
    if current_count >= max_calls:
        error_msg = f"Query limit exceeded: Maximum {max_calls} queries allowed per request. This is a safety limit to prevent runaway loops."
        logger.error(error_msg)
        return {
            "status": "error",
            "error_message": error_msg,
        }
    _query_call_counts[invocation_id] = current_count + 1

    if ";" in query:
        error_msg = "Multi-statement queries are not allowed."
        logger.error(error_msg)
        return {"status": "error", "error_message": error_msg}

    # Strip leading SQL comments before checking the statement type so that
    # comment-prefixed SELECT queries are accepted rather than rejected.
    stripped = re.sub(r"^(--[^\n]*\n|/\*.*?\*/\s*)+", "", query.strip(), flags=re.DOTALL)
    cleaned_query = stripped.upper()
    if not (cleaned_query.startswith("SELECT") or cleaned_query.startswith("WITH")):
        error_msg = "Only SELECT queries are allowed to ensure read-only access."
        logger.error(error_msg)
        return {
            "status": "error",
            "error_message": error_msg,
        }
    try:
        # Log the raw SQL so we can see exactly what the model generated.
        _sql_logger.info("Executing SQL:\n%s", query)

        # Server-side safety: rewrite SUM(col) → SUM(SAFE_CAST(col AS FLOAT64))
        # so that STRING-typed columns don't crash BigQuery.
        query = _rewrite_sum_safe_cast(query)

        client = _get_client(tool_context)
        if dry_run:
            job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)
            query_job = client.query(query, job_config=job_config)
            bytes_processed = query_job.total_bytes_processed
            gb_processed = bytes_processed / (1024**3)
            estimated_cost_usd = gb_processed * 6.25
            report = (
                f"Dry run complete. "
                f"Estimated bytes processed: {bytes_processed:,} "
                f"({gb_processed:.4f} GB, ~${estimated_cost_usd:.4f} USD)."
            )
            logger.info(report)
            return {
                "status": "success",
                "report": report,
                "bytes_processed": bytes_processed,
                "estimated_cost_usd": round(estimated_cost_usd, 4),
            }
        query_job = client.query(query)
        rows = list(query_job.result(timeout=30))
        limit = int(os.getenv("BQ_RESULT_LIMIT", 100))
        results = [{k: _to_iso_date(v) for k, v in dict(row).items()} for row in rows]
        results = results[:limit]
        report = f"Query executed successfully. Returned {len(rows)} rows."
        if len(rows) > limit:
            report += f" Showing first {limit} rows."
        return {
            "status": "success",
            "report": report,
            "data": results,
        }
    except Exception as e:
        logger.error(f"Error running query: {e}")
        return {
            "status": "error",
            "error_message": str(e),
        }


# ---------------------------------------------------------------------------
# Table Relationship Registry
# ---------------------------------------------------------------------------

_TABLE_RELATIONSHIPS: list[dict[str, Any]] = [
    {
        "from_table": "dp_hst",
        "from_column": "dp_hst_br_id",
        "to_table": "dp_version_states",
        "to_column": "dp_id",
        "join_type": "INNER JOIN",
        "join_expression": "dp_hst.dp_hst_br_id = dp_version_states.dp_id",
        "description": (
            "Each transaction row links to the DP branch that processed it. "
            "dp_hst_br_id is the FK; dp_version_states.dp_id is the PK."
        ),
    },
    {
        "from_table": "dp_hst",
        "from_column": "dp_hst_ccy_cde",
        "to_table": "isin_data",
        "to_column": "isin",
        "join_type": "INNER JOIN",
        "join_expression": "dp_hst.dp_hst_ccy_cde = isin_data.isin",
        "description": (
            "Each transaction row links to the security (ISIN) that was transacted. "
            "dp_hst_ccy_cde carries the ISIN code; isin_data.isin is the PK."
        ),
    },
    {
        "from_table": "dp_hst",
        "from_column": "dp_hst_br_id",
        "to_table": "bo_monthly_data",
        "to_column": "brnch_numb",
        "join_type": "INNER JOIN",
        "join_expression": "dp_hst.dp_hst_br_id = bo_monthly_data.brnch_numb",
        "description": (
            "Transactions at a branch correlate to customer accounts registered at that same branch. "
            "This is a branch-level join (not account-level) — multiple BO accounts can share one branch."
        ),
    },
    {
        "from_table": "bo_monthly_data",
        "from_column": "brnch_numb",
        "to_table": "dp_version_states",
        "to_column": "dp_id",
        "join_type": "INNER JOIN",
        "join_expression": "bo_monthly_data.brnch_numb = dp_version_states.dp_id",
        "description": (
            "Get the exact branch master record for each customer account. "
            "Use this when you need branch location, state, DP type, or status alongside customer data."
        ),
    },
    {
        "from_table": "bo_monthly_data",
        "from_column": "parent_dp",
        "to_table": "dp_version_states",
        "to_column": "dp_id",
        "join_type": "LEFT JOIN",
        "join_expression": "bo_monthly_data.parent_dp = dp_version_states.dp_id",
        "description": (
            "Fetch the parent branch's own master record for a customer account. "
            "Use when you specifically need parent DP details (name, type, state) for each customer."
        ),
    },
    {
        "from_table": "bo_monthly_data",
        "from_column": "parent_dp",
        "to_table": "dp_version_states",
        "to_column": "parent_dp_id",
        "join_type": "INNER JOIN",
        "join_expression": "bo_monthly_data.parent_dp = dp_version_states.parent_dp_id",
        "description": (
            "PREFERRED join for parent-group analytics. "
            "Groups customer accounts and branches under the same parent DP umbrella. "
            "Produces the most matched rows — use this for DP-group-level aggregations."
        ),
    },
]

_RECOMMENDED_JOIN_PATHS: dict[str, str] = {
    "customer_with_branch_info": (
        "bo_monthly_data INNER JOIN dp_version_states "
        "ON bo_monthly_data.brnch_numb = dp_version_states.dp_id"
    ),
    "customer_by_parent_group": (
        "bo_monthly_data INNER JOIN dp_version_states "
        "ON bo_monthly_data.parent_dp = dp_version_states.parent_dp_id  -- PREFERRED for group analytics"
    ),
    "transaction_with_security": (
        "dp_hst INNER JOIN isin_data "
        "ON dp_hst.dp_hst_ccy_cde = isin_data.isin"
    ),
    "transaction_with_branch": (
        "dp_hst INNER JOIN dp_version_states "
        "ON dp_hst.dp_hst_br_id = dp_version_states.dp_id"
    ),
    "transaction_with_customer_at_branch": (
        "dp_hst INNER JOIN bo_monthly_data "
        "ON dp_hst.dp_hst_br_id = bo_monthly_data.brnch_numb"
    ),
    "transaction_branch_security_3table": (
        "dp_hst "
        "INNER JOIN dp_version_states ON dp_hst.dp_hst_br_id = dp_version_states.dp_id "
        "INNER JOIN isin_data ON dp_hst.dp_hst_ccy_cde = isin_data.isin"
    ),
    "full_4table_join": (
        "dp_hst "
        "INNER JOIN dp_version_states ON dp_hst.dp_hst_br_id = dp_version_states.dp_id "
        "INNER JOIN bo_monthly_data ON dp_hst.dp_hst_br_id = bo_monthly_data.brnch_numb "
        "INNER JOIN isin_data ON dp_hst.dp_hst_ccy_cde = isin_data.isin"
    ),
    "agg_count": (
        "Query agg_count standalone — it has no FK relationships. "
        "Filter by catg, sub_catg, sub_catg2, and process_date."
    ),
}


def get_table_relationships(
    table_name: str, tool_context: ToolContext
) -> dict[str, Any]:
    """Return the foreign key relationship map for CDSL dataset tables.

    Call this tool before constructing any multi-table (JOIN) SQL query to
    determine the correct join columns between tables. Always call it when
    the query spans two or more tables — never guess join columns.

    Pass the name of the primary or central table in your query (e.g. "dp_hst"
    for transaction queries, "bo_monthly_data" for customer queries). Pass "all"
    to retrieve the complete relationship registry for all tables.

    Args:
        table_name: The BigQuery table to look up relationships for.
            Valid values: "dp_hst", "bo_monthly_data", "dp_version_states",
            "isin_data", "agg_count", or "all".

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "table_name", "relationships" (list of join
            definitions with from_table, from_column, to_table, to_column,
            join_type, join_expression, and description), and
            "recommended_join_paths" (pre-built path strings for common
            multi-table patterns).
        Special case — "agg_count": returns empty relationships list
            and a note explaining it must be queried standalone.
        On error: includes "error_message" with list of valid table names.
    """
    logger.info(
        f"Getting table relationships for: '{table_name}'",
        extra={"invocation_id": tool_context.invocation_id},
    )

    normalized = table_name.strip().lower()

    # agg_count has no FK relationships — return early with explanation
    if normalized == "agg_count":
        return {
            "status": "success",
            "table_name": "agg_count",
            "relationships": [],
            "note": (
                "agg_count has NO foreign key relationships to any other table. "
                "It is a pre-aggregated monthly summary table (category counts, demat counts). "
                "Query it standalone using filters on catg, sub_catg, sub_catg2, and process_date. "
                "Do NOT attempt to JOIN agg_count to other tables via column equality."
            ),
            "recommended_join_paths": {
                "agg_count": _RECOMMENDED_JOIN_PATHS["agg_count"]
            },
        }

    # Return full registry
    if normalized in ("", "all"):
        return {
            "status": "success",
            "table_name": "all",
            "relationships": _TABLE_RELATIONSHIPS,
            "recommended_join_paths": _RECOMMENDED_JOIN_PATHS,
        }

    # Filter to entries that involve the requested table
    known_tables = {
        "dp_hst", "bo_monthly_data", "dp_version_states", "isin_data", "agg_count"
    }
    if normalized not in known_tables:
        return {
            "status": "error",
            "error_message": (
                f"Unknown table '{table_name}'. "
                f"Valid table names: {', '.join(sorted(known_tables))}."
            ),
        }

    matched = [
        r for r in _TABLE_RELATIONSHIPS
        if r["from_table"] == normalized or r["to_table"] == normalized
    ]

    return {
        "status": "success",
        "table_name": table_name,
        "relationships": matched,
        "recommended_join_paths": _RECOMMENDED_JOIN_PATHS,
    }
