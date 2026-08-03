# Quick Start: Enable Groq in 3 Commands

**Total Time:** < 5 minutes

---

## 🚀 Enable Groq Now

### Step 1: Edit .env (30 seconds)
```bash
cd /home/ashish/adk_agents/adk-school-analytics
nano .env

# Find line 30 and change:
# USE_LITELLM=false
# To:
# USE_LITELLM=true

# Save and exit (Ctrl+X, Y, Enter)
```

**Or use sed for one-liner:**
```bash
sed -i 's/USE_LITELLM=false/USE_LITELLM=true/' .env
```

---

### Step 2: Verify Configuration (10 seconds)
```bash
grep "USE_LITELLM" .env
grep "LITELLM_MODEL" .env
grep "GROQ_API_KEY" .env
```

**Expected output:**
```
USE_LITELLM=true
LITELLM_MODEL=groq/llama-3.3-70b-versatile
GROQ_API_KEY=gsk_TRpw... (your key)
```

---

### Step 3: Test (2 minutes)
```bash
source .venv/bin/activate
python test_groq_integration.py
```

**Expected:** Tests pass showing Groq is working ✅

---

## 🔄 Switch Back to Vertex AI

### Quick Rollback:
```bash
sed -i 's/USE_LITELLM=true/USE_LITELLM=false/' .env
```

That's it!

---

## 📝 Available Models

Edit `LITELLM_MODEL` in `.env`:

```bash
# Best quality (recommended)
LITELLM_MODEL=groq/llama-3.3-70b-versatile

# Stable alternative
LITELLM_MODEL=groq/llama-3.1-70b-versatile

# Fast & cheap (testing)
LITELLM_MODEL=groq/llama-3.1-8b-instant

# Mixtral
LITELLM_MODEL=groq/mixtral-8x7b-32768
```

---

## 🧪 Quick Test Commands

### Test 1: Check imports
```bash
source .venv/bin/activate
python3 -c "from google.adk.models.lite_llm import LiteLlm; print('✅ LiteLLM ready')"
```

### Test 2: Check agent
```bash
python test_groq_integration.py
```

### Test 3: Run playground
```bash
make playground
```

### Test 4: Deploy to production
```bash
make deploy
```

---

## 📊 Check Which Model is Active

```bash
grep "USE_LITELLM" .env
```

**Output:**
- `USE_LITELLM=true` → Using Groq
- `USE_LITELLM=false` → Using Vertex AI

---

## 💰 Cost Comparison

| Provider | Model | Cost/Month (300 users) |
|----------|-------|------------------------|
| **Groq** ✅ | Llama 3.3 70B | **~$60** |
| Vertex AI | Llama 3.1 405B | ~$1,200 |
| Vertex AI | Gemini Flash | ~$1,200 |

**Groq saves you 95%!**

---

## 📚 Documentation

- `GROQ_INTEGRATION_COMPLETE.md` - Full implementation summary
- `docs/GROQ_INTEGRATION_SUMMARY.md` - Quick reference
- `docs/GROQ_LITELLM_TESTING_GUIDE.md` - Detailed testing

---

## ✅ That's It!

**You're ready to use Groq!**

**Current status:** Implementation complete, ready for testing

**To enable:** Change 1 line in `.env` and test

**To rollback:** Change the same line back

**No risk, easy to try!** 🎉
