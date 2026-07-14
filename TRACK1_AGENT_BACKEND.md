# Track 1: Agent / Backend — Chart Spec Output

**Owner:** Person 1  
**Estimated time:** 1–2 hours  
**Files touched:** `app/agent.py`, `Makefile`  
**No overlap with Track 2 — you will not touch any files in `frontend/`**

---

## Goal

Modify the agent to output a **JSON chart specification** inside a ` ```chart ` code fence instead of generating matplotlib PNG images. The frontend (Track 2) will consume this spec and render interactive charts using Recharts.

---

## The Shared Contract (Do Not Change)

This JSON format is the interface between Track 1 and Track 2. Both tracks must use exactly this format:

### Bar / Line / Area Charts

```json
{
  "type": "bar",
  "title": "Dormant Accounts by Branch State",
  "x_key": "dp_brnch_state",
  "y_keys": ["dormant_count", "total_balance"],
  "data": [
    { "dp_brnch_state": "MAHARASHTRA", "dormant_count": 142, "total_balance": 980000 },
    { "dp_brnch_state": "DELHI",       "dormant_count": 98,  "total_balance": 670000 }
  ]
}
```

### Pie Charts

```json
{
  "type": "pie",
  "title": "Account Distribution by Tier",
  "name_key": "tier",
  "value_key": "account_count",
  "data": [
    { "tier": "TIER 1", "account_count": 540 },
    { "tier": "TIER 2", "account_count": 310 }
  ]
}
```

---

## Tasks

### Task 1.1 — Remove BuiltInCodeExecutor Import

**File:** `app/agent.py`  
**Line:** 10

```python
# DELETE this line:
from google.adk.code_executors import BuiltInCodeExecutor
```

---

### Task 1.2 — Delete `_strip_code_parts` Function

**File:** `app/agent.py`  
**Lines:** 459–499

Delete the entire function:

```python
def _strip_code_parts(callback_context, llm_response):
    """Clean up model response parts before presenting to user:
    - Strip executable_code parts (Python code blocks)
    - Strip code_execution_result parts (Outcome/Output lines)
    - Deduplicate inline_data image parts (prevent duplicate 'Saved as artifact' lines)
    - Ensure the first text part after an image starts on a new line
    """
    # ... entire function body ...
    llm_response.content.parts = new_parts
    return None
```

Delete all of it. This function only existed to clean up `BuiltInCodeExecutor` output, which we are removing.

---

### Task 1.3 — Clean Up `root_agent` Constructor

**File:** `app/agent.py`  
**Lines:** 513–514

Find the `LlmAgent` constructor around line 502–515:

```python
root_agent = LlmAgent(
    name="cdsl_bigquery_agent",
    description="Agent to execute read-only BigQuery queries on CDSL securities data",
    model=os.getenv("ROOT_AGENT_MODEL", "gemini-2.5-flash"),
    instruction=return_instructions_root(),
    global_instruction=return_global_instruction,
    generate_content_config=types.GenerateContentConfig(
        max_output_tokens=int(os.environ.get("MAX_OUTPUT_TOKEN", 4096)),
        temperature=float(os.environ.get("TEMPERATURE", 1.0)),
    ),
    tools=[list_tables, fetch_metadata, get_table_relationships, run_query],
    code_executor=BuiltInCodeExecutor(),        # DELETE THIS LINE
    after_model_callback=_strip_code_parts,     # DELETE THIS LINE
)
```

**Delete these two lines:**
- `code_executor=BuiltInCodeExecutor(),`
- `after_model_callback=_strip_code_parts,`

The constructor should end with just the `tools=` line (no trailing comma on the last item).

---

### Task 1.4 — Replace Step 5 in System Prompt

**File:** `app/agent.py`  
**Lines:** 201–259 (approximately — look for `### Step 5: Data Visualization`)

Find the entire Step 5 section and replace it with the new content below.

**DELETE everything from:**
```
    ### Step 5: Data Visualization (If Requested)

    Only proceed if the user explicitly requests a chart, graph, or plot.
    ...
    (all the matplotlib plt.savefig ax.bar ax.pie instructions)
    ...
    Never output or describe the Python code in your response — only present
    the chart and a 1-2 sentence business interpretation of what it shows.
```

**REPLACE WITH:**

```python
    ### Step 5: Data Visualization (If Requested)

    Only proceed if the user explicitly requests a chart, graph, or plot.
    Do NOT call run_query again — use the data already retrieved in Step 4.

    **Step 5a: Chartability check — evaluate BEFORE generating any spec**

    A chart can only be generated when ALL THREE conditions are true:
      1. The result contains 2 or more rows.
      2. At least one numeric column (COUNT, SUM, AVG, INTEGER, FLOAT).
      3. At least one categorical or date column for axis labels.

    If ANY condition fails:
      - Explain why the result cannot be charted
      - Suggest one concrete query modification that would produce a chartable result
      - STOP. Do not generate a chart spec.

    Common unchartable patterns:
      - SELECT COUNT(*) with no GROUP BY → single number, no axis
      - Single-row lookups (WHERE id = '...') → nothing to compare
      - Results with only text/string columns → no quantitative dimension
      - All rows share the same category value → no variation to plot

    **Step 5b: Generate chart specification (only if Step 5a passes)**

    Output EXACTLY the JSON structure below inside a ```chart code fence.
    Do NOT output any other code blocks. Do NOT explain the JSON. Just output it.

    Chart type selection rules:
      - Comparing values across categories (≤ 20 categories)  → type: "bar"
      - Trend over time (date/time on x-axis)                 → type: "line"
      - Part-of-whole distribution (≤ 6 slices)              → type: "pie"
      - Cumulative trend with filled area                     → type: "area"

    **For bar / line / area charts, output exactly:**

    ```chart
    {
      "type": "bar",
      "title": "Human-readable chart title describing the data",
      "x_key": "exact_column_name_for_x_axis",
      "y_keys": ["metric_column_1"],
      "data": [
        { "x_axis_column": "value1", "metric_column_1": 123 },
        { "x_axis_column": "value2", "metric_column_1": 456 }
      ]
    }
    ```

    **For pie charts, output exactly:**

    ```chart
    {
      "type": "pie",
      "title": "Human-readable chart title",
      "name_key": "category_column_name",
      "value_key": "numeric_column_name",
      "data": [
        { "category_column": "Category A", "numeric_column": 100 },
        { "category_column": "Category B", "numeric_column": 75 }
      ]
    }
    ```

    **Critical rules:**
      - Use exact column names from the query result (no renaming)
      - Cap data at 20 rows for bar/line/area charts
      - Cap data at 6 rows for pie charts
      - y_keys may contain multiple columns for grouped comparison charts
      - After the ```chart block, add 1–2 sentences of business interpretation
      - Do NOT include markdown, Python code, or any other content inside the ```chart block
      - The JSON must be valid (no trailing commas, proper quoting)
```

---

### Task 1.5 — Update Step 4 Chartability Notice

**File:** `app/agent.py`  
**Around line 194** (in Step 4, after the SQL presentation)

Find the chartability notice:

```python
      * If the result has 2+ rows, at least one numeric column, and at least one categorical or date column → append:
        "This result can be visualized — ask me for a chart to see a graphical breakdown."
```

**Change to:**

```python
      * If the result has 2+ rows, at least one numeric column, and at least one categorical or date column → append:
        "This result can be visualized — ask me for a chart and I will generate an interactive chart in the UI."
```

---

### Task 1.6 — Add `api-server` Target to Makefile

**File:** `Makefile`  
**Location:** Add after the `playground:` target (around line 25)

Add this new target:

```makefile
# Start ADK API server for frontend consumption
api-server:
	@echo "==============================================================================="
	@echo "| Starting ADK API server on port 8000...                                     |"
	@echo "| Frontend should connect to: http://localhost:8000                           |"
	@echo "==============================================================================="
	uv run adk api_server . --port 8000
```

---

## Testing Instructions

### Test 1: Syntax Check

```bash
cd /home/ashish/adk_agents/adk-school-analytics
source .venv/bin/activate
python -c "from app.agent import root_agent; print('OK')"
```

Expected output: `OK`

---

### Test 2: Run API Server

```bash
make api-server
```

Expected: Server starts on port 8000, no errors.

---

### Test 3: Test Chart Output via curl

In a separate terminal:

```bash
# Create a session
curl -X POST http://localhost:8000/apps/app/users/test-user/sessions

# Copy the sessionId from the response, then run:
curl -X POST http://localhost:8000/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "app",
    "user_id": "test-user",
    "session_id": "YOUR_SESSION_ID_HERE",
    "new_message": {
      "role": "user",
      "parts": [{ "text": "Show dormant accounts by branch state as a bar chart" }]
    }
  }'
```

Expected: SSE stream contains text, then a ` ```chart ` block with valid JSON, then more text.

---

### Test 4: Test via ADK Playground (Optional)

```bash
make playground
```

Open http://127.0.0.1:8501, ask for a chart, verify the response contains:
1. SQL query shown
2. Data table
3. ` ```chart ` code block with valid JSON
4. Business interpretation text

---

## What NOT to Do

- Do NOT touch any files in `frontend/` directory (that's Track 2)
- Do NOT change the JSON chart spec format (it's the shared contract)
- Do NOT modify `bq_tools.py` (no changes needed there)
- Do NOT change Steps 1–4 workflow logic (only Step 5 changes)

---

## Deliverable Checklist

- [ ] Task 1.1: Removed `BuiltInCodeExecutor` import
- [ ] Task 1.2: Deleted `_strip_code_parts` function
- [ ] Task 1.3: Removed `code_executor` and `after_model_callback` from `root_agent`
- [ ] Task 1.4: Replaced Step 5 with chart spec instructions
- [ ] Task 1.5: Updated chartability notice wording
- [ ] Task 1.6: Added `api-server` Makefile target
- [ ] Test 1: Syntax check passes
- [ ] Test 2: API server starts successfully
- [ ] Test 3: Chart request outputs valid ` ```chart ` JSON

---

## Integration (Day 2)

Once Track 2 is ready, run integration:

```bash
# Terminal 1:
make api-server

# Terminal 2:
cd frontend && npm run dev

# Browser: http://localhost:3000
```

Send: "Show dormant accounts by state as a chart"

Expected: Interactive Recharts bar chart renders inline in the chat.
