# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from app.agent import query_cloud_sql_database


class TestQueryCloudSqlDatabaseSecurity:
    def test_rejects_insert_query(self):
        result = query_cloud_sql_database(
            "INSERT INTO students (first_name, last_name, grade_level) VALUES ('Test', 'User', 10)"
        )
        assert "Security Error" in result
        assert "INSERT" in result

    def test_rejects_update_query(self):
        result = query_cloud_sql_database(
            "UPDATE students SET first_name = 'Hacked' WHERE student_id = 1"
        )
        assert "Security Error" in result
        assert "UPDATE" in result

    def test_rejects_delete_query(self):
        result = query_cloud_sql_database("DELETE FROM students WHERE student_id = 1")
        assert "Security Error" in result
        assert "DELETE" in result

    def test_rejects_drop_query(self):
        result = query_cloud_sql_database("DROP TABLE students")
        assert "Security Error" in result
        assert "DROP" in result

    def test_rejects_alter_query(self):
        result = query_cloud_sql_database("ALTER TABLE students ADD COLUMN hack TEXT")
        assert "Security Error" in result
        assert "ALTER" in result

    def test_rejects_create_query(self):
        result = query_cloud_sql_database("CREATE TABLE malicious (id INT)")
        assert "Security Error" in result
        assert "CREATE" in result

    def test_rejects_truncate_query(self):
        result = query_cloud_sql_database("TRUNCATE TABLE students")
        assert "Security Error" in result
        assert "TRUNCATE" in result

    def test_rejects_non_select_query(self):
        result = query_cloud_sql_database("EXPLAIN SELECT * FROM students")
        assert "Security Error" in result
        assert "SELECT" in result

    def test_rejects_case_insensitive_keywords(self):
        result = query_cloud_sql_database(
            "insert into students values (1, 'a', 'b', 10, false)"
        )
        assert "Security Error" in result

    def test_rejects_keyword_in_middle_of_query(self):
        result = query_cloud_sql_database(
            "SELECT * FROM students; DELETE FROM students WHERE true"
        )
        assert "Security Error" in result


class TestQueryCloudSqlDatabaseExecution:
    def test_handles_nonexistent_database_gracefully(self, monkeypatch):
        monkeypatch.setenv("DB_HOST", "nonexistent-host-12345")
        monkeypatch.setenv("DB_NAME", "nonexistent_db")
        result = query_cloud_sql_database("SELECT 1")
        assert "Error" in result or "Database Error" in result

    def test_empty_result_returns_zero_rows(self, monkeypatch):
        from unittest.mock import MagicMock, patch

        import psycopg2

        mock_cursor = MagicMock()
        mock_cursor.description = [("student_id",), ("first_name",)]
        mock_cursor.fetchall.return_value = []

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch.object(psycopg2, "connect", return_value=mock_conn):
            result = query_cloud_sql_database(
                "SELECT * FROM students WHERE student_id = 99999"
            )
            assert "0 rows" in result

    def test_returns_formatted_results(self, monkeypatch):
        from unittest.mock import MagicMock, patch

        import psycopg2

        mock_cursor = MagicMock()
        mock_cursor.description = [("student_id",), ("first_name",), ("last_name",)]
        mock_cursor.fetchall.return_value = [(1, "John", "Doe"), (2, "Jane", "Smith")]

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch.object(psycopg2, "connect", return_value=mock_conn):
            result = query_cloud_sql_database(
                "SELECT student_id, first_name, last_name FROM students LIMIT 2"
            )
            assert "John" in result
            assert "Jane" in result
            assert "student_id" in result
