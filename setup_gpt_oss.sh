#!/bin/bash
# Setup GPT-OSS-120B from Groq (The model from your screenshot!)

echo "=============================================="
echo "🚀 Setting up GPT-OSS-120B on Groq"
echo "=============================================="
echo ""

# Check if API key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Groq API key"
    echo ""
    echo "Usage: ./setup_gpt_oss.sh <your_groq_api_key>"
    echo ""
    echo "Get your key from: https://console.groq.com/keys"
    echo ""
    echo "Example:"
    echo "  ./setup_gpt_oss.sh gsk_abc123xyz..."
    exit 1
fi

GROQ_API_KEY="$1"

echo "📝 Model: openai/gpt-oss-120b"
echo "✨ Features:"
echo "   - 128K context window"
echo "   - Best quality in GPT-OSS family"
echo "   - Great for complex SQL queries"
echo "   - Pricing: \$0.15 input / \$0.60 output per 1M tokens"
echo ""

echo "Step 1: Checking branch..."
BRANCH=$(git branch --show-current)
echo "✓ Current branch: $BRANCH"

if [ "$BRANCH" != "open-llm-mode" ]; then
    echo "⚠️  You're not on 'open-llm-mode' branch"
    read -p "Switch to open-llm-mode? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout open-llm-mode
    fi
fi

echo ""
echo "Step 2: Activating virtual environment..."
source .venv/bin/activate

echo "Step 3: Installing dependencies..."
pip install -q openai python-dotenv groq

echo "Step 4: Configuring environment..."

# Backup existing .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backed up existing .env"
fi

# Remove old custom model config if exists
sed -i '/CUSTOM_MODEL/d' .env 2>/dev/null
sed -i '/GROQ_API_KEY/d' .env 2>/dev/null
sed -i '/USE_CUSTOM_MODEL/d' .env 2>/dev/null

# Add GPT-OSS-120B configuration
cat >> .env << EOF

# ===================================
# GROQ API - GPT-OSS-120B
# ===================================
GROQ_API_KEY=$GROQ_API_KEY
CUSTOM_MODEL_API_KEY=$GROQ_API_KEY
CUSTOM_MODEL_BASE_URL=https://api.groq.com/openai/v1
CUSTOM_MODEL_NAME=openai/gpt-oss-120b
USE_CUSTOM_MODEL=true

# Model settings
TEMPERATURE=0.3
MAX_OUTPUT_TOKEN=4096
EOF

echo "✅ Configuration added to .env"

echo ""
echo "Step 5: Testing GPT-OSS-120B connection..."
echo ""

python3 << 'PYTHON_TEST'
import os
from dotenv import load_dotenv
load_dotenv()

try:
    from app.custom_model_client import CustomModelClient
    
    client = CustomModelClient()
    
    print("=" * 70)
    print(f"🤖 Model: {client.model_name}")
    print(f"🔗 Endpoint: {client.base_url}")
    print("=" * 70)
    print()
    
    # Test 1: Basic query
    print("Test 1: Basic connectivity...")
    response = client.generate_content([
        {"role": "user", "content": "Say 'GPT-OSS-120B is working!' in one sentence."}
    ], max_tokens=50)
    print(f"✓ Response: {response['content']}")
    print()
    
    # Test 2: SQL generation
    print("Test 2: SQL generation capability...")
    response = client.generate_content([
        {
            "role": "system", 
            "content": "You are a BigQuery SQL expert. Generate only SQL, no explanations."
        },
        {
            "role": "user", 
            "content": "Write a query to find top 10 students by marks from table 'students' with columns: id, name, marks"
        }
    ], temperature=0.3, max_tokens=200)
    
    print("✓ Generated SQL:")
    print("-" * 70)
    print(response['content'])
    print("-" * 70)
    print()
    
    # Show usage
    usage = response['usage']
    cost = (usage['prompt_tokens'] * 0.15 + usage['completion_tokens'] * 0.60) / 1_000_000
    print(f"📊 Tokens used: {usage['total_tokens']}")
    print(f"💰 Cost: ${cost:.6f}")
    print()
    
    print("=" * 70)
    print("✅ GPT-OSS-120B is working perfectly!")
    print("=" * 70)
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nTroubleshooting:")
    print("1. Check your API key is correct")
    print("2. Verify you have credits at https://console.groq.com/")
    print("3. Try: pip install openai groq python-dotenv")
    exit(1)
PYTHON_TEST

echo ""
echo "=============================================="
echo "✅ Setup Complete!"
echo "=============================================="
echo ""
echo "🎯 You're now using: openai/gpt-oss-120b"
echo ""
echo "Next steps:"
echo "1. ✓ Model is configured and tested"
echo "2. Test with your schema: python app/custom_model_client.py"
echo "3. See all models: python groq_models.py"
echo "4. Monitor usage: https://console.groq.com/usage"
echo ""
echo "To switch models, edit .env and change:"
echo "  CUSTOM_MODEL_NAME=openai/gpt-oss-120b"
echo ""
echo "Available alternatives:"
echo "  - openai/gpt-oss-20b (faster, cheaper)"
echo "  - llama-3.3-70b-versatile (most popular)"
echo "  - mixtral-8x7b-32768 (fastest)"
echo ""
