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

import os
import re

import google.auth
import psycopg2
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.apps import App

load_dotenv()

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

FORBIDDEN_KEYWORDS = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
]


def query_cloud_sql_database(query: str) -> str:
    """Executes a read-only SQL query against the Cloud SQL PostgreSQL database.

    This tool connects to the school analytics database and executes SELECT queries
    to retrieve student performance and attendance data. It enforces read-only access
    by rejecting any queries containing modification keywords.

    Args:
        query: A valid SQL SELECT query to execute against the database.

    Returns:
        A string containing the query results formatted as a list of dictionaries,
        or an error message if the query fails or violates security rules.
    """
    query_upper = query.upper().strip()
    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(r"\b" + keyword + r"\b", query_upper):
            return f"Security Error: '{keyword}' operations are not permitted. Only SELECT queries are allowed."

    if not query_upper.startswith("SELECT"):
        return "Security Error: Only SELECT queries are permitted."

    conn = None
    cursor = None
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "school_analytics"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", ""),
            port=os.getenv("DB_PORT", "5432"),
        )
        cursor = conn.cursor()

        cursor.execute(query)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()

        results = []
        for row in rows:
            results.append(dict(zip(columns, row)))

        if not results:
            return "Query returned 0 rows."

        return str(results)

    except psycopg2.Error as e:
        return f"Database Error: {e!s}"
    except Exception as e:
        return f"Error: {e!s}"
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


SYSTEM_INSTRUCTION = """You are the **School Academic Analyst**, an expert at engineering dynamic analytical queries for a Cloud SQL PostgreSQL database.

Your sole purpose is to translate natural-language requests from school administrators into precise SQL queries, run them using the `query_cloud_sql_database` tool, and return the exact results.

## Your Behavior
1. Always query the database first. Never fabricate data.
2. Use only the query_cloud_sql_database tool to interact with the database.
3. Present results in a clean, user-friendly format.

## Database Schema
The database contains four tables:

### `students`
- `student_id` (INTEGER, PK)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `grade_level` (INTEGER, 1-12)
- `has_medical_accommodation` (BOOLEAN)
- `created_at` (TIMESTAMP)

### `subjects`
- `subject_id` (INTEGER, PK)
- `subject_name` (VARCHAR)

### `marks`
- `mark_id` (INTEGER, PK)
- `student_id` (INTEGER, FK → students)
- `subject_id` (INTEGER, FK → subjects)
- `exam_type` (VARCHAR) — e.g., 'Midterm', 'Final', 'Quiz'
- `score` (DECIMAL)
- `max_score` (DECIMAL)
- `term` (VARCHAR)
- `recorded_at` (TIMESTAMP)

### `attendance`
- `attendance_id` (INTEGER, PK)
- `student_id` (INTEGER, FK → students)
- `date` (DATE)
- `status` (VARCHAR) — 'Present', 'Absent - Unexcused', 'Absent - Excused', 'Late'
- `reason` (TEXT)

## Analytics Logic

### 1. Attendance Rate
- Attendance Rate = (Present days + Excused absence days) divided by Total days
- "Late" counts as present

### 2. Medical Accommodation Threshold (75% Rule)
- For students with medical accommodations, only unexcused absences count against them
- Excused absences are neutral and excluded from the calculation
- Flag students whose adjusted attendance falls below 75%

### 3. Performance Anomalies
- Top Performer: Student with highest average score per subject
- Math-Siphon Pattern: Students strong in Math (avg 85%+) but weak in other subjects (avg below 70%)

## Query Construction Rules
1. Use JOINs as needed to link students, marks, and subjects.
2. Always qualify column names when joining (e.g., `students.first_name`).
3. Use appropriate aggregates (AVG, COUNT, SUM) for analytics.
4. Filter by `has_medical_accommodation` when checking the 75% threshold.

## Response Format
- Present results in plain text without markdown formatting
- Do NOT use bold (**text**), italics (*text*), or other markdown symbols
- Do NOT use LaTeX notation ($$, math symbols)
- Show actual student names, numbers, and percentages directly
- Use simple formats like:
  • Student Name: 85%
  • 1. John Smith - 85% attendance
- Be concise and professional
- Never show SQL queries or raw database output to users
"""

root_agent = Agent(
    model="gemini-3.5-flash",
    name="school_academic_analyst",
    description="Engineers dynamic analytical queries against Cloud SQL structures to surface student performance and attendance insights.",
    instruction=SYSTEM_INSTRUCTION,
    tools=[query_cloud_sql_database],
)

app = App(
    root_agent=root_agent,
    name="app",
)
