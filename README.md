# BigQuery Analytics Agent

An AI-powered natural language interface for querying CDSL securities and depository data stored in BigQuery. Users can ask questions in plain English and get insights without writing SQL.

- **Model:** Gemini 3.5 Flash
- **Runtime:** Google Agent Development Kit (ADK)
- **Database:** BigQuery (`search-ahmed.cdsl_agentic_demo`)

## Project Structure

```
cdsl-bigquery-agent/
├── app/
│   ├── agent.py          # CDSL analytics agent with 5-step query workflow
│   ├── bq_tools.py       # BigQuery tools (list_tables, fetch_metadata, run_query)
│   ├── agent_engine_app.py    # Agent Engine deployment wrapper
│   └── app_utils/             # Utilities (telemetry, deploy, typing)
├── tests/
│   ├── unit/                  # Tool security + execution tests
│   └── integration/           # Agent stream tests
├── .env.example               # Environment variable template
├── Makefile                   # Dev commands
└── pyproject.toml             # Dependencies
```

## Requirements

- **uv** — Python package manager ([install](https://docs.astral.sh/uv/getting-started/installation/))
- **Google Cloud SDK** — for GCP/Vertex AI access ([install](https://cloud.google.com/sdk/docs/install))
- **Service Account** — with BigQuery access (see Setup below)
- **make** — pre-installed on most Unix systems

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/pratikchemate-onix/adk-school-analytics
cd adk-school-analytics
git checkout CDSL
```

### 2. Create a Service Account

Create a GCP Service Account with the following roles on the `search-ahmed` project:

- `roles/bigquery.dataViewer` — read access to BigQuery datasets
- `roles/bigquery.jobUser` — permission to run queries

Download the JSON key file and save it securely (never commit to git).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set the path to your Service Account key:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/sa-key.json
```

### 4. Install and run

```bash
make install
make playground
```

Open `http://127.0.0.1:8501`, select the `app` folder, and start querying.

## BigQuery Dataset

The agent queries the `cdsl_agentic_demo` dataset in the `search-ahmed` project.

| Table | Description |
|-------|-------------|
| `agg_count` | Aggregated count data |
| `bo_monthly_data` | Back office monthly data |
| `dp_version_states` | Depository participant version states |
| `isin_data` | ISIN master data for securities |

The agent discovers table schemas dynamically via `list_tables` and `fetch_metadata` tools.

## Sample Queries

Try these in the playground:

```
Show me all tables in the dataset.
What columns are in the isin_data table?
List the top 10 rows from isin_data.
How many records are in bo_monthly_data?
Show me the schema for dp_version_states.
```

## How It Works

The agent follows a 5-step workflow:

1. **Table Discovery** — Matches user intent to available tables via `list_tables`
2. **Schema Validation** — Fetches live schema via `fetch_metadata`
3. **SQL Construction** — Builds safe, optimized queries
4. **Dry Run** — Validates query before execution
5. **Execution** — Runs query and presents results

## Security

- **Read-only:** Only SELECT and WITH queries allowed
- **No DML/DDL:** INSERT, UPDATE, DELETE, CREATE, DROP all blocked
- **Row limits:** Configurable via `BQ_RESULT_LIMIT` (default: 100)
- **Project-scoped:** Only queries `search-ahmed.cdsl_agentic_demo`

## Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make playground` | Launch local dev environment |
| `make test` | Run unit and integration tests |
| `make lint` | Run code quality checks |
| `make deploy` | Deploy to Google Agent Engine |

## Deployment

```bash
gcloud config set project search-ahmed
make deploy
```

See the [deployment guide](https://googlecloudplatform.github.io/agent-starter-pack/guide/deployment) for CI/CD and Terraform setup.
