# AI-Powered School Academic Analytics System

An autonomous analytics agent built with **Google ADK** and **PostgreSQL** that translates natural language queries into SQL, runs them against a school database, and returns conversational insights.

- **Model:** Gemini 3.5 Flash
- **Runtime:** Google Agent Development Kit (ADK)
- **Database:** PostgreSQL (local or Google Cloud SQL)

## Project Structure

```
adk-school-analytics/
├── app/
│   ├── agent.py               # Analytics agent + query_cloud_sql_database tool
│   ├── agent_engine_app.py    # Agent Engine deployment wrapper
│   └── app_utils/             # Utilities (telemetry, deploy, typing)
├── data/
│   └── seed.sql               # Pre-generated synthetic dataset (ready to import)
├── tests/
│   ├── unit/                  # Tool security + execution tests
│   ├── integration/           # Agent stream tests
│   └── eval/                  # ADK evaluation sets
├── schema.sql                 # Database DDL (4 tables + indexes)
├── seed_data.py               # Synthetic data generator (Faker)
├── .env.example               # Environment variable template
├── Makefile                   # Dev commands
└── pyproject.toml             # Dependencies
```

## Requirements

- **uv** — Python package manager ([install](https://docs.astral.sh/uv/getting-started/installation/))
- **PostgreSQL 14+** — local instance or Google Cloud SQL
- **Google Cloud SDK** — for GCP/Vertex AI access ([install](https://cloud.google.com/sdk/docs/install))
- **make** — pre-installed on most Unix systems

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/pratikchemate-onix/adk-school-analytics
cd adk-school-analytics
```

### 2. Set up the database

```bash
createdb school_analytics
psql -d school_analytics -f schema.sql       # create tables and indexes
psql -d school_analytics -f data/seed.sql    # load synthetic dataset
```

### 3. Configure credentials

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```
DB_HOST=localhost
DB_NAME=school_analytics
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_PORT=5432
```

### 4. Install and run

```bash
make install
make playground
```

Open `http://127.0.0.1:8501`, select the `app` folder, and start querying.

## Dataset

The `data/seed.sql` file contains a pre-generated synthetic dataset:

| Table | Rows | Notes |
|-------|------|-------|
| students | 50 | 10 with medical accommodations |
| subjects | 6 | Mathematics, Science, English, History, Geography, Art |
| marks | 1800 | 5 students with injected math-spike anomaly |
| attendance | 4000 | 5 students injected below 75% threshold |

To regenerate fresh data instead:

```bash
uv run python seed_data.py
```

## Sample Queries

Try these in the playground:

```
Who is the top performer in Mathematics?
Show me students below 75% attendance.
Find students strong in Math but weak in other subjects.
List students with medical accommodations and their attendance rates.
Which student has the highest average score across all subjects?
```

## Analytics Logic

**Attendance Rate**
Attendance is calculated as `(Present + Absent-Excused) / Total Days`.
Students with medical accommodations are only penalized for unexcused absences — excused absences are treated as neutral.

**Math-Siphon Pattern**
Students with a Mathematics average of 85%+ but below 70% in all other subjects.

**75% Threshold**
A student is flagged only if their unexcused-only attendance falls below 75%.

## Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make playground` | Launch local dev environment |
| `make test` | Run unit and integration tests |
| `make lint` | Run code quality checks |
| `make eval` | Run ADK evaluation |
| `make deploy` | Deploy to Google Agent Engine |

## Deployment

```bash
gcloud config set project <your-project-id>
make deploy
```

See the [deployment guide](https://googlecloudplatform.github.io/agent-starter-pack/guide/deployment) for CI/CD and Terraform setup.
