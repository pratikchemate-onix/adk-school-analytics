"""Unit tests for BigQuery tools."""

from unittest.mock import MagicMock, patch

from app.bq_tools import fetch_metadata, list_datasets, list_tables, run_query


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


class TestListDatasets:
    def test_list_datasets_success(self):
        mock_context = MagicMock()
        with patch("app.bq_tools._get_client") as mock_get_client:
            mock_client = MagicMock()

            mock_dataset_item = MagicMock()
            mock_dataset_item.reference = MagicMock()
            mock_dataset = MagicMock()
            mock_dataset.dataset_id = "cdsl_agentic_demo"
            mock_dataset.description = "CDSL securities dataset"

            mock_client.list_datasets.return_value = [mock_dataset_item]
            mock_client.get_dataset.return_value = mock_dataset
            mock_get_client.return_value = mock_client

            result = list_datasets(mock_context)
            assert result["status"] == "success"
            assert "datasets" in result


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


class TestQueryLimitFailsafe:
    def test_blocks_after_max_queries(self):
        import os

        from app.bq_tools import reset_query_count

        reset_query_count()
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
        import os

        from app.bq_tools import reset_query_count

        reset_query_count()
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
        import os

        from app.bq_tools import reset_query_count

        reset_query_count()
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
