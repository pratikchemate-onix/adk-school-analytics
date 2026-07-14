"""Unit tests for BigQuery tools."""

import datetime
import os
import time
from unittest.mock import MagicMock, patch

import pytest

import app.bq_tools as bq_tools_module
from app.bq_tools import fetch_metadata, list_tables, run_query, reset_query_count


@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset all module-level singletons and caches before each test."""
    reset_query_count()
    bq_tools_module._bq_client = None
    bq_tools_module._metadata_cache = {}
    yield
    reset_query_count()
    bq_tools_module._bq_client = None
    bq_tools_module._metadata_cache = {}


class TestIsoDate:
    def test_date_converted(self):
        from app.bq_tools import _to_iso_date
        assert _to_iso_date(datetime.date(2024, 1, 15)) == "2024-01-15"

    def test_datetime_converted(self):
        from app.bq_tools import _to_iso_date
        assert _to_iso_date(datetime.datetime(2024, 1, 15, 10, 30)) == "2024-01-15T10:30:00"

    def test_non_date_passthrough(self):
        from app.bq_tools import _to_iso_date
        assert _to_iso_date(42) == 42
        assert _to_iso_date("hello") == "hello"
        assert _to_iso_date(None) is None


class TestGetClient:
    def test_singleton_reused(self):
        mock_client = MagicMock()
        with patch("google.cloud.bigquery.Client", return_value=mock_client):
            ctx = MagicMock()
            c1 = bq_tools_module._get_client(ctx)
            c2 = bq_tools_module._get_client(ctx)
        assert c1 is c2

    def test_raises_on_failure(self):
        with patch("google.cloud.bigquery.Client", side_effect=Exception("auth failed")):
            with pytest.raises(RuntimeError, match="auth failed"):
                bq_tools_module._get_client(MagicMock())


class TestRunQuerySecurity:
    def test_rejects_insert_query(self):
        mock_context = MagicMock()
        result = run_query(
            "INSERT INTO isin_data VALUES (1, 'TEST')", mock_context, dry_run=False
        )
        assert result["status"] == "error"
        assert "SELECT" in result["error_message"]

    def test_rejects_update_query(self):
        mock_context = MagicMock()
        result = run_query(
            "UPDATE isin_data SET isin = 'HACKED' WHERE id = 1",
            mock_context,
            dry_run=False,
        )
        assert result["status"] == "error"

    def test_rejects_delete_query(self):
        mock_context = MagicMock()
        result = run_query(
            "DELETE FROM isin_data WHERE id = 1", mock_context, dry_run=False
        )
        assert result["status"] == "error"

    def test_rejects_drop_query(self):
        mock_context = MagicMock()
        result = run_query("DROP TABLE isin_data", mock_context, dry_run=False)
        assert result["status"] == "error"

    def test_rejects_create_query(self):
        mock_context = MagicMock()
        result = run_query(
            "CREATE TABLE malicious (id INT)", mock_context, dry_run=False
        )
        assert result["status"] == "error"

    def test_rejects_non_select_query(self):
        mock_context = MagicMock()
        result = run_query(
            "EXPLAIN SELECT * FROM isin_data", mock_context, dry_run=False
        )
        assert result["status"] == "error"

    def test_accepts_select_query(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_job = MagicMock()
            mock_job.result.return_value = []
            mock_client.query.return_value = mock_job
            mock_get_client.return_value = mock_client

            result = run_query(
                "SELECT * FROM isin_data LIMIT 10", mock_context, dry_run=False
            )
            assert result["status"] == "success"

    def test_accepts_with_query(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_job = MagicMock()
            mock_job.result.return_value = []
            mock_client.query.return_value = mock_job
            mock_get_client.return_value = mock_client

            result = run_query(
                "WITH cte AS (SELECT 1) SELECT * FROM cte", mock_context, dry_run=False
            )
            assert result["status"] == "success"

    def test_accepts_comment_prefixed_select(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_job = MagicMock()
            mock_job.result.return_value = []
            mock_client.query.return_value = mock_job
            mock_get_client.return_value = mock_client

            result = run_query(
                "-- generated query\nSELECT 1", mock_context, dry_run=False
            )
            assert result["status"] == "success"

    def test_rejects_multistatement_query(self):
        mock_context = MagicMock()
        result = run_query(
            "SELECT 1; DROP TABLE isin_data", mock_context, dry_run=False
        )
        assert result["status"] == "error"
        assert "multi-statement" in result["error_message"].lower()

    def test_error_path_returns_error_status(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.query.side_effect = Exception("BQ unavailable")
            mock_get_client.return_value = mock_client

            result = run_query("SELECT 1", mock_context, dry_run=False)
            assert result["status"] == "error"
            assert "BQ unavailable" in result["error_message"]


class TestRunQueryResultTruncation:
    def test_result_truncated_to_limit(self):
        mock_context = MagicMock()
        original_limit = os.environ.get("BQ_RESULT_LIMIT")
        os.environ["BQ_RESULT_LIMIT"] = "3"
        try:
            with patch("app.bq_tools._get_client") as mock_get_client:
                mock_client = MagicMock()
                mock_job = MagicMock()
                # Return 10 rows; only 3 should come back in data
                mock_rows = [MagicMock(**{"keys.return_value": ["n"], "__iter__": lambda s: iter([("n", i)])}) for i in range(10)]
                for i, row in enumerate(mock_rows):
                    row.__iter__ = lambda s, i=i: iter([("n", i)])
                    row.keys = lambda i=i: ["n"]
                # Use dicts directly — the function calls dict(row) on each
                mock_job.result.return_value = [{"n": i} for i in range(10)]
                mock_client.query.return_value = mock_job
                mock_get_client.return_value = mock_client

                result = run_query("SELECT n FROM t", mock_context, dry_run=False)
                assert result["status"] == "success"
                assert len(result["data"]) == 3
        finally:
            if original_limit is not None:
                os.environ["BQ_RESULT_LIMIT"] = original_limit
            else:
                os.environ.pop("BQ_RESULT_LIMIT", None)


class TestRunQueryDryRun:
    def test_dry_run_returns_cost_estimate(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_job = MagicMock()
            mock_job.total_bytes_processed = 1024 * 1024 * 100
            mock_client.query.return_value = mock_job
            mock_get_client.return_value = mock_client
    
            result = run_query("SELECT * FROM isin_data", mock_context, dry_run=True)
            assert result["status"] == "success"
            assert "bytes_processed" in result
            assert "estimated_cost_usd" in result


class TestListTables:
    def test_list_tables_success(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()

            mock_table_item = MagicMock()
            mock_table_item.reference = MagicMock()
            mock_table = MagicMock()
            mock_table.table_id = "isin_data"
            mock_table.table_type = "TABLE"
            mock_table.description = "ISIN master data"

            mock_client.list_tables.return_value = [mock_table_item]
            mock_client.get_table.return_value = mock_table
            mock_get_client.return_value = mock_client

            result = list_tables(
                "cdsl_agentic_demo", mock_context, project_id="search-ahmed"
            )
            assert result["status"] == "success"
            assert "tables" in result


class TestFetchMetadata:
    def test_fetch_metadata_success(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()

            from google.cloud.bigquery import SchemaField

            mock_table = MagicMock()
            mock_table.table_id = "isin_data"
            mock_table.description = "ISIN master data"
            mock_table.num_rows = 1000
            mock_table.num_bytes = 1024 * 1024
            mock_table.schema = [
                SchemaField("isin", "STRING", description="ISIN code"),
                SchemaField("security_name", "STRING", description="Security name"),
            ]

            mock_client.get_table.return_value = mock_table
            mock_get_client.return_value = mock_client

            result = fetch_metadata(
                "cdsl_agentic_demo",
                "isin_data",
                mock_context,
                project_id="search-ahmed",
            )
            assert result["status"] == "success"
            assert "columns" in result
            assert len(result["columns"]) == 2


class TestListTablesExtra:
    def test_empty_dataset(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.list_tables.return_value = []
            mock_get_client.return_value = mock_client

            result = list_tables("cdsl_agentic_demo", mock_context, project_id="p")
            assert result["status"] == "success"
            assert result["tables"] == []

    def test_error_path(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.list_tables.side_effect = Exception("permission denied")
            mock_get_client.return_value = mock_client

            result = list_tables("cdsl_agentic_demo", mock_context, project_id="p")
            assert result["status"] == "error"
            assert "permission denied" in result["error_message"]


class TestFetchMetadataExtra:
    def _make_mock_table(self, schema_fields):
        from google.cloud.bigquery import SchemaField
        mock_table = MagicMock()
        mock_table.table_id = "t"
        mock_table.description = "desc"
        mock_table.num_rows = 10
        mock_table.num_bytes = 1024
        mock_table.schema = [SchemaField(name, ftype) for name, ftype in schema_fields]
        return mock_table

    def test_ttl_cache_hit_skips_bq(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get_table.return_value = self._make_mock_table([("id", "INTEGER")])
            mock_client.query.return_value = MagicMock()
            mock_get_client.return_value = mock_client

            fetch_metadata("ds", "t", mock_context, project_id="p")
            fetch_metadata("ds", "t", mock_context, project_id="p")
            # Second call must not hit BigQuery
            assert mock_client.get_table.call_count == 1

    def test_ttl_expiry_refetches(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get_table.return_value = self._make_mock_table([("id", "INTEGER")])
            mock_get_client.return_value = mock_client

            fetch_metadata("ds", "t", mock_context, project_id="p")
            # Manually expire the cache entry
            key = "p.ds.t"
            result, _ = bq_tools_module._metadata_cache[key]
            bq_tools_module._metadata_cache[key] = (result, time.time() - 700)

            fetch_metadata("ds", "t", mock_context, project_id="p")
            assert mock_client.get_table.call_count == 2

    def test_zero_string_columns_skips_distinct_query(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get_table.return_value = self._make_mock_table([("count", "INTEGER")])
            mock_get_client.return_value = mock_client

            result = fetch_metadata("ds", "t", mock_context, project_id="p")
            assert result["status"] == "success"
            mock_client.query.assert_not_called()

    def test_error_path(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.get_table.side_effect = Exception("table not found")
            mock_get_client.return_value = mock_client

            result = fetch_metadata("ds", "t", mock_context, project_id="p")
            assert result["status"] == "error"
            assert "table not found" in result["error_message"]


class TestQueryLimitFailsafe:
    def test_blocks_after_max_queries(self):
        original_val = os.environ.get("BQ_MAX_QUERIES_PER_INVOCATION")
        os.environ["BQ_MAX_QUERIES_PER_INVOCATION"] = "3"

        try:
            mock_context = MagicMock()
            mock_context.invocation_id = "test-invocation-123"

            with patch("app.bq_tools._get_client") as mock_get_client:
                mock_client = MagicMock()
                mock_job = MagicMock()
                mock_job.result.return_value = []
                mock_client.query.return_value = mock_job
                mock_get_client.return_value = mock_client

                for i in range(3):
                    result = run_query(f"SELECT {i}", mock_context, dry_run=False)
                    assert result["status"] == "success", (
                        f"Query {i + 1} should succeed"
                    )

                result = run_query("SELECT 4", mock_context, dry_run=False)
                assert result["status"] == "error"
                assert "limit exceeded" in result["error_message"].lower()
        finally:
            if original_val is not None:
                os.environ["BQ_MAX_QUERIES_PER_INVOCATION"] = original_val
            else:
                os.environ.pop("BQ_MAX_QUERIES_PER_INVOCATION", None)

    def test_different_invocations_independent(self):
        original_val = os.environ.get("BQ_MAX_QUERIES_PER_INVOCATION")
        os.environ["BQ_MAX_QUERIES_PER_INVOCATION"] = "3"

        try:
            with patch("app.bq_tools._get_client") as mock_get_client:
                mock_client = MagicMock()
                mock_job = MagicMock()
                mock_job.result.return_value = []
                mock_client.query.return_value = mock_job
                mock_get_client.return_value = mock_client

                context1 = MagicMock()
                context1.invocation_id = "invocation-1"
                context2 = MagicMock()
                context2.invocation_id = "invocation-2"

                for i in range(3):
                    run_query(f"SELECT {i}", context1, dry_run=False)

                result1 = run_query("SELECT overflow", context1, dry_run=False)
                assert result1["status"] == "error"

                result2 = run_query("SELECT new", context2, dry_run=False)
                assert result2["status"] == "success"
        finally:
            if original_val is not None:
                os.environ["BQ_MAX_QUERIES_PER_INVOCATION"] = original_val
            else:
                os.environ.pop("BQ_MAX_QUERIES_PER_INVOCATION", None)

    def test_reset_clears_counts(self):
        original_val = os.environ.get("BQ_MAX_QUERIES_PER_INVOCATION")
        os.environ["BQ_MAX_QUERIES_PER_INVOCATION"] = "3"

        try:
            mock_context = MagicMock()
            mock_context.invocation_id = "test-reset"

            with patch("app.bq_tools._get_client") as mock_get_client:
                mock_client = MagicMock()
                mock_job = MagicMock()
                mock_job.result.return_value = []
                mock_client.query.return_value = mock_job
                mock_get_client.return_value = mock_client

                for i in range(3):
                    run_query(f"SELECT {i}", mock_context, dry_run=False)

                result = run_query("SELECT overflow", mock_context, dry_run=False)
                assert result["status"] == "error"

                reset_query_count("test-reset")

                result = run_query("SELECT after_reset", mock_context, dry_run=False)
                assert result["status"] == "success"
        finally:
            if original_val is not None:
                os.environ["BQ_MAX_QUERIES_PER_INVOCATION"] = original_val
            else:
                os.environ.pop("BQ_MAX_QUERIES_PER_INVOCATION", None)
