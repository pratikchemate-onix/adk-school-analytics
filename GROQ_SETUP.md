# Groq API Setup Guide - FASTEST Inference! ⚡

Groq offers **the fastest LLM inference** in the world with a generous free tier!

## 🎯 Why Groq is Perfect For You

✅ **FASTEST** - 3-10x faster than other providers  
✅ **FREE TIER** - 30 requests/min, 14,400/day (enough for testing)  
✅ **GREAT MODELS** - Llama 3.3 70B, Mixtral, Gemma 2  
✅ **CHEAP** - Only $0.59/M tokens when you exceed free tier  
✅ **OpenAI Compatible** - Easy integration  

## 📊 Available Models on Groq

| Model | Context | Speed | Quality | Best For | Pricing (Paid Tier) |
|-------|---------|-------|---------|----------|---------------------|
| **llama-3.3-70b-versatile** ⭐ | 128K | Fast | Excellent | SQL, Analytics | $0.59 input / $0.79 output |
| llama-3.1-70b-versatile | 128K | Fast | Excellent | General purpose | $0.59 / $0.79 |
| llama-3.2-90b-text-preview | 128K | Fast | Very Good | Long context | $0.59 / $0.79 |
| mixtral-8x7b-32768 | 32K | VERY Fast | Good | Quick queries | $0.24 / $0.24 |
| gemma2-9b-it | 8K | ULTRA Fast | Good | Simple tasks | $0.20 / $0.20 |

**Recommendation:** Start with `llama-3.3-70b-versatile` - best quality for SQL!

---

## ⚡ Quick Setup (2 Minutes)

### Method 1: Automatic Setup (Easiest!)

```bash
# Navigate to project
cd /home/ashish/adk_agents/adk-school-analytics

# Activate virtualenv
source .venv/bin/activate

# Run setup script with your API key
./setup_groq.sh gsk_YOUR_API_KEY_HERE
```

**That's it!** The script will:
1. Install dependencies
2. Configure .env
3. Test the connection
4. Show you results

### Method 2: Manual Setup

```bash
# 1. Activate virtualenv
source /home/ashish/adk_agents/adk-school-analytics/.venv/bin/activate

# 2. Install dependencies
pip install openai python-dotenv

# 3. Add to .env
cat >> .env << 'EOF'

# Groq Configuration
CUSTOM_MODEL_API_KEY=gsk_YOUR_API_KEY_HERE
CUSTOM_MODEL_BASE_URL=https://api.groq.com/openai/v1
CUSTOM_MODEL_NAME=llama-3.3-70b-versatile
USE_CUSTOM_MODEL=true
EOF

# 4. Test it
python test_custom_model.py
```

---

## 🧪 Testing Your Setup

### Test 1: Quick Test
```bash
python test_custom_model.py
```

Expected output:
```
✓ Environment configured correctly!
✓ Model Response: Hello! I am working correctly.
✓ Generated SQL: SELECT student_id, name, marks FROM students ORDER BY marks DESC LIMIT 10
✓ All tests passed!
```

### Test 2: SQL Generation Test
```bash
python app/custom_model_client.py
```

### Test 3: Interactive Test
```python
from app.custom_model_client import CustomModelClient

# Initialize
client = CustomModelClient()

# Your question
response = client.generate_content([
    {"role": "system", "content": "You are a BigQuery SQL expert."},
    {"role": "user", "content": "Write a query to find top 10 students by marks"}
])

print(response['content'])
```

---

## 💰 Pricing & Limits

### Free Tier (Perfect for Testing!)
- **30 requests per minute**
- **14,400 requests per day**
- **6,000 tokens per minute**
- **No credit card required!**

For 300 users testing:
- If each user makes 5 queries/day = 1,500 queries/day
- **You're within free tier!** ✅

### Paid Tier (When You Scale)

**llama-3.3-70b-versatile:**
- Input: $0.59 per 1M tokens
- Output: $0.79 per 1M tokens

**Example monthly cost (300 users, 20 queries/day/user):**
- 6,000 queries/day × 30 days = 180,000 queries/month
- Avg 500 input + 200 output tokens per query
- Cost: 180K × (500×$0.59 + 200×$0.79) / 1M = **~$82/month**
- **Per user: $0.27/month**

**Still 99% cheaper than self-hosting ($6,400/month)!**

---

## 🔥 Groq Speed Advantage

### Inference Speed Comparison (Tokens/Second)

| Provider | Model | Speed (tok/sec) | Groq Advantage |
|----------|-------|-----------------|----------------|
| **Groq** | Llama 3.1 70B | **250-300** | 🏆 Baseline |
| Together AI | Llama 3.1 70B | 80-100 | 3x slower |
| Replicate | Llama 3.1 70B | 50-80 | 4x slower |
| Vertex AI | Gemini Flash | 100-150 | 2x slower |

**Groq is FAST!** User sees responses almost instantly.

---

## 🎯 Recommended Model for Your Use Case

### For BigQuery SQL Analytics:

**Primary: llama-3.3-70b-versatile**
```bash
CUSTOM_MODEL_NAME=llama-3.3-70b-versatile
```

Why:
- ✅ 128K context (handles large schemas)
- ✅ Excellent code generation (includes SQL)
- ✅ Latest Llama model
- ✅ Free tier covers testing
- ✅ Only $0.59-0.79/M when you scale

**Alternative: mixtral-8x7b-32768** (if you need SPEED)
```bash
CUSTOM_MODEL_NAME=mixtral-8x7b-32768
```

Why:
- ✅ SUPER FAST inference
- ✅ Good SQL generation
- ✅ Cheaper: $0.24/M tokens
- ✅ 32K context (enough for most schemas)

---

## 📝 Integration Examples

### Example 1: Simple SQL Generation

```python
from app.custom_model_client import CustomModelClient

client = CustomModelClient()

# Generate SQL
response = client.generate_content([
    {"role": "system", "content": "You are a BigQuery SQL expert. Generate only SQL, no explanations."},
    {"role": "user", "content": "Show top 10 students by marks from students table"}
], temperature=0.3, max_tokens=500)

print(response['content'])
# Output: SELECT * FROM students ORDER BY marks DESC LIMIT 10
```

### Example 2: With Your BigQuery Schema

```python
from app.custom_model_client import CustomModelClient

client = CustomModelClient()

# Your actual schema
schema = """
Table: cdsl_securities
Columns:
- security_id (STRING)
- isin (STRING)
- company_name (STRING)
- market_cap (NUMERIC)
- created_date (DATE)
"""

user_question = "Find companies with market cap over 1 billion"

response = client.generate_content([
    {"role": "system", "content": f"You are a BigQuery expert. Schema:\n{schema}"},
    {"role": "user", "content": user_question}
], temperature=0.3)

sql = response['content']
print(f"Generated SQL:\n{sql}")

# Now execute with your run_query tool
# result = run_query(sql)
```

### Example 3: Streaming Response

```python
from app.custom_model_client import CustomModelClient

client = CustomModelClient()

print("Generating SQL... ")

for chunk in client.stream_content([
    {"role": "user", "content": "Explain BigQuery partitioning in 3 sentences"}
]):
    print(chunk, end="", flush=True)
```

---

## 🔍 Monitoring & Debugging

### Check Usage
Dashboard: https://console.groq.com/usage

### Monitor API Calls
```python
response = client.generate_content([...])

print(f"Tokens used: {response['usage']['total_tokens']}")
print(f"Prompt tokens: {response['usage']['prompt_tokens']}")
print(f"Completion tokens: {response['usage']['completion_tokens']}")

# Calculate cost (paid tier)
cost = (
    response['usage']['prompt_tokens'] * 0.59 +
    response['usage']['completion_tokens'] * 0.79
) / 1_000_000

print(f"Cost: ${cost:.6f}")
```

### Enable Debug Logging
```python
import os
os.environ['DEBUG'] = 'true'

# Now client will print detailed logs
client = CustomModelClient()
```

---

## ❓ Troubleshooting

### "API key not found"
```bash
# Check .env file
grep CUSTOM_MODEL_API_KEY .env

# Should show:
# CUSTOM_MODEL_API_KEY=gsk_...

# If not, add it:
echo 'CUSTOM_MODEL_API_KEY=gsk_YOUR_KEY' >> .env
```

### "Rate limit exceeded"
Free tier limits:
- 30 requests/minute
- 6,000 tokens/minute

Solutions:
1. Wait a minute and retry
2. Reduce request frequency
3. Upgrade to paid tier (still very cheap!)

### "Model not found"
Check available models:
```python
from openai import OpenAI
client = OpenAI(
    api_key="gsk_YOUR_KEY",
    base_url="https://api.groq.com/openai/v1"
)
models = client.models.list()
for model in models.data:
    print(model.id)
```

---

## 🚀 Next Steps

### 1. Test Basic Setup
```bash
python test_custom_model.py
```

### 2. Test SQL Generation
```bash
python app/custom_model_client.py
```

### 3. Try With Your Real Schema
Edit and run:
```python
# test_real_schema.py
from app.custom_model_client import CustomModelClient

client = CustomModelClient()

# Add your actual table schema
schema = "..." # Your schema here

response = client.generate_content([
    {"role": "system", "content": f"Schema: {schema}"},
    {"role": "user", "content": "Your actual query here"}
])

print(response['content'])
```

### 4. Compare vs Gemini Flash
Run same queries on both and compare:
- Response quality
- Speed
- Cost
- Accuracy

### 5. Monitor Usage
- Go to: https://console.groq.com/usage
- Check requests, tokens, costs
- Stay within free tier or upgrade

---

## 💡 Pro Tips

1. **Use temperature=0.3 for SQL** - More deterministic, fewer errors
2. **Set max_tokens** based on expected length - Saves tokens
3. **Cache common queries** - Reduce API calls
4. **Use streaming** for better UX - Users see response immediately
5. **Monitor the free tier** - Stay within limits during testing
6. **Llama 3.3 70B is best** - Don't downgrade unless you need speed

---

## 📞 Support

- **Groq Docs:** https://console.groq.com/docs
- **Discord:** https://discord.gg/groq
- **GitHub:** https://github.com/groq

---

## 🎉 Summary

**You chose Groq - Excellent choice!**

✅ Fastest inference in the market  
✅ Free tier covers all testing  
✅ Great Llama 3.3 70B model  
✅ OpenAI-compatible (easy setup)  
✅ Cheap when you scale ($0.59/M)  

**Your setup command:**
```bash
cd /home/ashish/adk_agents/adk-school-analytics
source .venv/bin/activate
./setup_groq.sh gsk_YOUR_GROQ_API_KEY
```

**Happy coding! 🚀**
