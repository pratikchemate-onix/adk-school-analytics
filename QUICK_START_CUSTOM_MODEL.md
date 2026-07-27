# Quick Start: Third-Party Model Integration

Get started with Together AI or OpenRouter in **5 minutes** - no infrastructure setup needed!

## 🎯 What You'll Get

- **Pay-per-use pricing** - No upfront costs, no servers to manage
- **Open-source models** - Qwen2.5, DeepSeek, Llama, and more
- **OpenAI-compatible API** - Easy to integrate
- **Testing environment** - Validate before production

---

## ⚡ Option 1: Together AI (EASIEST - Recommended!)

### Step 1: Get API Key (2 minutes)

1. Go to **https://api.together.ai/**
2. Sign up (get $5 free credit!)
3. Navigate to **Settings → API Keys**
4. Create new key and copy it

### Step 2: Configure Environment (1 minute)

```bash
# Copy the custom model template
cat .env.custom_model >> .env

# Edit .env and replace:
# CUSTOM_MODEL_API_KEY=your_together_ai_key_here
# with your actual API key
```

Or manually add to `.env`:

```bash
# Together AI Configuration
CUSTOM_MODEL_API_KEY=your_api_key_here
CUSTOM_MODEL_BASE_URL=https://api.together.ai/v1
CUSTOM_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct-Turbo
USE_CUSTOM_MODEL=true
```

### Step 3: Install Dependencies (1 minute)

```bash
pip install openai python-dotenv
```

### Step 4: Test (1 minute)

```bash
# Run the test script
python test_custom_model.py
```

You should see:
```
✓ Environment configured correctly!
✓ Model Response: Hello! I am working correctly.
✓ Generated SQL: SELECT student_id, name, marks FROM students ORDER BY marks DESC LIMIT 10
✓ All tests passed!
```

**That's it! You're running an open-source model!**

---

## 💰 Pricing Comparison

### Together AI Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|------------------------|----------|
| Qwen2.5-7B-Instruct-Turbo | $0.30 | $0.30 | SQL, Fast responses |
| Qwen3.5-9B | $0.17 | $0.25 | Vision + SQL |
| DeepSeek-V4-Pro | $1.74 | $3.48 | Complex reasoning |
| Llama-3.3-70B-Turbo | $1.04 | $1.04 | General purpose |

### Cost Estimate for Your Use Case (300 users)

Assumptions:
- 300 users × 20 queries/day = 6,000 queries/day
- Average query: 500 input tokens, 200 output tokens

**Using Qwen2.5-7B:**
- Daily cost: 6,000 × (500 × $0.30 + 200 × $0.30) / 1M = **$1.26/day**
- Monthly cost: **~$38/month**
- **Cost per user: $0.13/month**

**Compare to self-hosting:** $6,400/month for infrastructure!

---

## 🔧 Alternative Providers

### Option 2: OpenRouter (Multiple Providers)

```bash
# In .env
CUSTOM_MODEL_API_KEY=your_openrouter_key
CUSTOM_MODEL_BASE_URL=https://openrouter.ai/api/v1
CUSTOM_MODEL_NAME=qwen/qwen-2.5-7b-instruct
```

Get key: https://openrouter.ai/keys

**Pros:**
- Access to 100+ models from different providers
- Automatic fallback if one provider is down
- Competitive pricing

**Cons:**
- Slightly more expensive than direct providers
- Extra routing layer

### Option 3: Replicate (Custom Models)

Good for deploying your own fine-tuned models, but requires more setup.

---

## 📊 Available Models on Together AI

### For SQL/Analytics (Recommended)

1. **Qwen2.5-7B-Instruct-Turbo** ⭐ BEST VALUE
   - Price: $0.30/M tokens (both ways)
   - Fast inference
   - Great SQL generation
   - 32K context

2. **Qwen3.5-9B**
   - Price: $0.17 input / $0.25 output
   - Multimodal (vision support)
   - Good for complex queries

3. **DeepSeek-V4-Pro** (if you need best quality)
   - Price: $1.74 input / $3.48 output
   - State-of-the-art reasoning
   - 512K context
   - More expensive

### Check All Models
Browse: https://docs.together.ai/docs/serverless-models

---

## 🧪 Testing Your Setup

### Test 1: Basic Connectivity
```bash
python test_custom_model.py
```

### Test 2: SQL Generation
```python
from app.custom_model_client import CustomModelClient

client = CustomModelClient()

response = client.generate_content([
    {"role": "system", "content": "You are a SQL expert."},
    {"role": "user", "content": "Generate SQL to find top 10 customers by revenue"}
])

print(response['content'])
```

### Test 3: Integration with Your BigQuery Tools
```python
# Example: Use custom model for query generation
client = CustomModelClient()

# User question
user_query = "Show me students enrolled in 2024"

# Generate SQL
response = client.generate_content([
    {"role": "system", "content": "Generate BigQuery SQL only."},
    {"role": "user", "content": f"Table: students (id, name, enrollment_year). Query: {user_query}"}
])

sql = response['content']
print(f"Generated SQL: {sql}")

# Now execute with your existing BigQuery tools
# result = run_query(sql)
```

---

## 🚀 Next Steps

### For Testing (Easiest)
1. Run `python test_custom_model.py`
2. Try SQL generation with your actual schema
3. Compare quality vs Gemini Flash
4. Monitor costs in Together AI dashboard

### For Production Integration
You have two paths:

**Path A: Replace Gemini Calls Directly**
- Modify your agent.py to use CustomModelClient
- Bypass ADK's LlmAgent for model calls
- Keep using your BigQuery tools
- Pros: Simple, works immediately
- Cons: Lose some ADK features

**Path B: Configure ADK to Use Custom Endpoint**
- Check if ADK supports custom model providers
- May require ADK configuration or patches
- Pros: Keep all ADK features
- Cons: More complex setup

---

## 📞 Support

### Together AI
- Docs: https://docs.together.ai
- Discord: https://discord.gg/6ZVRF8uE
- Support: support@together.ai

### OpenRouter
- Docs: https://openrouter.ai/docs
- Discord: https://discord.gg/fVyRaUDgxW

---

## ❓ Common Issues

### "API key not found"
- Make sure you've added the key to `.env`
- Key should start with your API key from Together AI
- Restart your Python shell after editing `.env`

### "Model not found"
- Check model name at: https://docs.together.ai/docs/serverless-models
- Model string is case-sensitive
- Format: `Organization/ModelName`

### "Rate limit exceeded"
- Together AI free tier: 60 requests/minute
- Upgrade to paid tier for higher limits
- Or add retry logic with exponential backoff

---

## 💡 Pro Tips

1. **Start with smallest model** (Qwen2.5-7B) to minimize costs during testing
2. **Monitor usage** in Together AI dashboard to track costs
3. **Cache common queries** to reduce API calls
4. **Use temperature=0.3** for SQL generation (more deterministic)
5. **Set max_tokens** based on expected SQL length (saves money)

---

**Ready to try it? Run:** `python test_custom_model.py`
