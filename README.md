# CDSL Analytics Agent

An AI-powered natural language interface for querying CDSL securities and depository data stored in BigQuery. Ask questions in plain English and get structured insights — including interactive charts — without writing SQL.

- **Model:** Gemini 2.5 Flash (via Vertex AI)
- **Backend Runtime:** Google Agent Development Kit (ADK)
- **Frontend:** Next.js 16 + Apache ECharts
- **Database:** BigQuery (`search-ahmed.cdsl_agentic_demo`)
- **Deployment:** Vertex AI Agent Engine (backend) + Cloud Run (frontend)

## Project Structure

```
adk-schoool/
├── app/
│   ├── agent.py                  # CDSL analytics agent with 5-step query workflow
│   ├── bq_tools.py               # BigQuery tools (list_tables, fetch_metadata, run_query)
│   ├── agent_engine_app.py       # Vertex AI Agent Engine deployment wrapper
│   └── app_utils/                # Utilities (telemetry, deploy, typing)
├── tests/
│   ├── unit/                     # Tool security + execution tests
│   └── integration/              # Agent stream tests
├── frontend/
│   ├── app/                      # Next.js App Router (page, layout, globals)
│   ├── components/
│   │   ├── ChatInput.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── MessageBubble.jsx     # Parses agent responses, renders chart blocks
│   │   ├── Sidebar.jsx
│   │   └── charts/
│   │       ├── ChartRenderer.jsx         # Routes spec.type to the correct view
│   │       ├── EChartsWrapper.jsx        # SSR-safe dynamic import of echarts-for-react
│   │       ├── BarChartView.jsx
│   │       ├── HBarChartView.jsx
│   │       ├── LineChartView.jsx
│   │       ├── AreaChartView.jsx
│   │       ├── PieChartView.jsx
│   │       └── StackedBarChartView.jsx
│   ├── lib/
│   │   ├── adkClient.js          # Streams responses from the ADK API
│   │   ├── chartUtils.js         # ECharts option builders + theme palettes
│   │   └── useThemeColors.js     # MutationObserver hook for dark/light mode
│   ├── Dockerfile
│   └── package.json
├── .env.example                  # Environment variable template
├── Makefile                      # Dev and deploy commands
└── pyproject.toml                # Python dependencies
```

## Requirements

- **uv** — Python package manager ([install](https://docs.astral.sh/uv/getting-started/installation/))
- **Node.js 18+** — for the Next.js frontend
- **Google Cloud SDK** — for GCP/Vertex AI access ([install](https://cloud.google.com/sdk/docs/install))
- **make** — pre-installed on most Unix systems

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/pratikchemate-onix/adk-school-analytics
cd adk-school-analytics
git checkout CDSL
```

### 2. Configure environment

```bash
cp .env.example .env
```

The key variables:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID (`search-ahmed`) |
| `GOOGLE_CLOUD_LOCATION` | Region (`us-central1`) |
| `ROOT_AGENT_MODEL` | Gemini model (`gemini-2.5-flash`) |
| `BQ_RESULT_LIMIT` | Max rows returned per query (default: 100) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to SA key (optional if using ADC) |

Authentication options:
- **Service Account key** — set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json`
- **Application Default Credentials** — run `gcloud auth application-default login`

### 3. Install and run the backend

```bash
make install        # Install Python dependencies
make playground     # Launch ADK local playground (port 8501)
```

Or start just the API server (for the frontend):

```bash
make api-server     # Starts ADK API server on port 8000
```

### 4. Install and run the frontend

```bash
make frontend-install   # npm install
make frontend-dev       # Next.js dev server on port 3000
```

The frontend connects to `http://localhost:8000` (ADK API server) by default.

## Chart Visualization

The agent can return charts embedded in its responses. When a user explicitly asks for a graph or chart, the agent emits a JSON block that the frontend renders using Apache ECharts.

Supported chart types:

| Type | Description |
|------|-------------|
| `bar` | Vertical bar chart |
| `hbar` | Horizontal bar chart |
| `line` | Line chart |
| `area` | Filled area chart |
| `pie` | Pie / donut chart |
| `stacked_bar` | Stacked bar chart |

All charts support:
- **Hover tooltips** with formatted values
- **Drill-down** — click a bar/slice to query a deeper breakdown
- **Toolbox** — save as image, view raw data, reset zoom
- **Data zoom** — slider appears automatically for datasets > 12 points
- **Dark/light mode** — colors update in real time when the theme is toggled

Unknown chart types fall back to a formatted data table.

## BigQuery Dataset

The agent queries the `cdsl_agentic_demo` dataset in the `search-ahmed` project.

| Table | Description |
|-------|-------------|
| `bo_monthly_data` | Customer/BO account master data (balance, dormancy, PAN linkage, tier) |
| `dp_version_states` | DP branch/version and state metadata |
| `isin_data` | ISIN master data for securities |
| `agg_count` | Monthly aggregated customer counts by category (Tier, Gender, AgeRange, IncomeRange, Balance, Dormant status) |
| `dp_hst` | *Not yet available* — referenced in code as a future transaction-history table, but no data has been loaded into BigQuery yet |

The agent discovers table schemas dynamically at startup via direct BigQuery API calls.

## Sample Queries

```
Show me active customer accounts along with their branch's state and DP type.
Which ISINs had the highest demat count last month?
Show me a bar chart of monthly BO counts by category.
Compare active vs dormant account trends over the last 6 months.
What is the state-wise breakdown of DP participants?
```

## How It Works

The agent follows a structured workflow per query:

1. **Table Identification** — Maps user intent to the relevant tables using pre-loaded schemas and relationship metadata
2. **Schema Validation** — Fetches live column definitions via `fetch_metadata`
3. **SQL Construction** — Builds safe, optimized read-only queries with fully-qualified table names
4. **Dry Run** — Validates query syntax and cost before execution
5. **Execution** — Runs the query, formats results, and optionally emits a chart spec

## Security

- **Read-only:** Only `SELECT` and `WITH` queries allowed
- **No DML/DDL:** `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP` all blocked
- **Row limits:** Configurable via `BQ_RESULT_LIMIT` (default: 100)
- **Project-scoped:** Only queries `search-ahmed.cdsl_agentic_demo`

## Commands

| Command | Description |
|---------|-------------|
| `make install` | Install Python dependencies |
| `make playground` | Launch local ADK playground (port 8501) |
| `make api-server` | Start ADK API server for frontend (port 8000) |
| `make frontend-install` | Install frontend npm dependencies |
| `make frontend-dev` | Start Next.js dev server (port 3000) |
| `make test` | Run unit and integration tests |
| `make lint` | Run ruff, codespell, and type checks |
| `make deploy` | Deploy backend to Vertex AI Agent Engine |
| `make frontend-deploy` | Deploy frontend to Cloud Run |

## Deployment

### Backend (Vertex AI Agent Engine)

```bash
gcloud config set project search-ahmed
make deploy
```

The backend is deployed to:
`projects/36231825761/locations/us-central1/reasoningEngines/2407788078073643008`

### Frontend (Cloud Run)

```bash
make frontend-deploy
```

Before deploying, grant the Compute Service Account access to call the Agent Engine:

```bash
gcloud projects add-iam-policy-binding search-ahmed \
  --member="serviceAccount:36231825761-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

The frontend on Cloud Run uses the GCP metadata server for authentication — no token management needed.
