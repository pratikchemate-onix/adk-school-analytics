"""Provides BigQuery utility functions for read-only query execution."""

import datetime
import logging
import os
from typing import Any

from google.adk.tools import ToolContext
from google.cloud import bigquery
from google.oauth2 import service_account

logger = logging.getLogger(__name__)


def _get_client(tool_context: ToolContext) -> bigquery.Client:
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
        return client
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


def list_datasets(tool_context: ToolContext) -> dict[str, Any]:
    """List all BigQuery datasets available across all configured projects.

    Returns each dataset's project ID, dataset ID, and description. Use this
    as the first discovery step to find which datasets exist across projects,
    then call list_tables with both the project_id and dataset_id.

    Projects are controlled by the ALLOWED_PROJECTS environment variable
    (comma-separated list). Falls back to GOOGLE_CLOUD_PROJECT if unset.

    Requires the bigquery.metadataViewer role on each project.

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "datasets" (list of dicts with "project_id",
            "dataset_id", and "description" for each dataset).
        On error: includes "error_message".
    """
    logger.info(
        "Listing datasets across all configured projects",
        extra={"invocation_id": tool_context.invocation_id},
    )
    primary_project = os.getenv("GOOGLE_CLOUD_PROJECT")
    allowed_projects_str = os.getenv("ALLOWED_PROJECTS", "")
    if allowed_projects_str:
        projects = [p.strip() for p in allowed_projects_str.split(",") if p.strip()]
    else:
        projects = [primary_project]

    try:
        client = _get_client(tool_context)
        datasets = []
        for project in projects:
            for dataset_item in client.list_datasets(project=project):
                dataset = client.get_dataset(dataset_item.reference)
                datasets.append(
                    {
                        "project_id": project,
                        "dataset_id": dataset.dataset_id,
                        "description": dataset.description or "",
                    }
                )
        report = f"Found {len(datasets)} dataset(s) across {len(projects)} project(s)."
        logger.info(report)
        return {
            "status": "success",
            "datasets": datasets,
        }
    except Exception as e:
        logger.error(f"Error listing datasets: {e}")
        return {
            "status": "error",
            "error_message": str(e),
        }


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
            defaults to the primary configured project. Use the project_id
            returned from list_datasets to query cross-project datasets.

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
            returned from list_datasets or list_tables to query cross-project
            tables.

    Returns:
        A dictionary with "status" key ("success" or "error").
        On success: includes "project_id", "dataset_id", "table_id",
            "description", "num_rows", "num_bytes", and "columns" (list of
            dicts with "name", "type", and "description" for each column).
        On error: includes "error_message".
    """
    resolved_project = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
    logger.info(
        f"Fetching metadata for {resolved_project}.{dataset_id}.{table_id}",
        extra={"invocation_id": tool_context.invocation_id},
    )
    try:
        client = _get_client(tool_context)
        table_ref = f"{resolved_project}.{dataset_id}.{table_id}"
        table = client.get_table(table_ref)
        columns = [
            {
                "name": field.name,
                "type": field.field_type,
                "description": field.description or "",
            }
            for field in table.schema
        ]
        report = f"Fetched metadata for {resolved_project}.{dataset_id}.{table_id}: {len(columns)} columns."
        logger.info(report)
        return {
            "status": "success",
            "project_id": resolved_project,
            "dataset_id": dataset_id,
            "table_id": table_id,
            "description": table.description or "",
            "num_rows": table.num_rows,
            "num_bytes": table.num_bytes,
            "columns": columns,
        }
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
    cleaned_query = query.strip().upper()
    if not (cleaned_query.startswith("SELECT") or cleaned_query.startswith("WITH")):
        error_msg = "Only SELECT queries are allowed to ensure read-only access."
        logger.error(error_msg)
        return {
            "status": "error",
            "error_message": error_msg,
        }
    try:
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
        rows = list(query_job.result())
        limit = int(os.getenv("BQ_RESULT_LIMIT", 100))
        results = [{k: _to_iso_date(v) for k, v in dict(row).items()} for row in rows]
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
