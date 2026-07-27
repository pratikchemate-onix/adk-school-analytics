#!/bin/bash
# Quick Setup Script for Groq API Integration

echo "=============================================="
echo "🚀 Groq API Setup Script"
echo "=============================================="
echo ""

# Check if API key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Groq API key"
    echo ""
    echo "Usage: ./setup_groq.sh <your_groq_api_key>"
    echo ""
    echo "Get your key from: https://console.groq.com/keys"
    exit 1
fi

GROQ_API_KEY="$1"

echo "Step 1: Activating virtual environment..."
source .venv/bin/activate

echo "Step 2: Installing dependencies..."
pip install -q openai python-dotenv

echo "Step 3: Configuring environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    touch .env
fi

# Remove old custom model config if exists
sed -i '/CUSTOM_MODEL/d' .env

# Add Groq configuration
cat >> .env << EOF

# ===================================
# GROQ API CONFIGURATION
# ===================================
CUSTOM_MODEL_API_KEY=$GROQ_API_KEY
CUSTOM_MODEL_BASE_URL=https://api.groq.com/openai/v1
CUSTOM_MODEL_NAME=llama-3.3-70b-versatile
USE_CUSTOM_MODEL=true
EOF

echo "✅ Configuration added to .env"

echo ""
echo "Step 4: Testing Groq connection..."
python3 test_custom_model.py

echo ""
echo "=============================================="
echo "✅ Setup Complete!"
echo "=============================================="
echo ""
echo "Model: llama-3.3-70b-versatile (Groq)"
echo "Free Tier: 30 req/min, 14,400/day"
echo "Speed: VERY FAST ⚡"
echo ""
echo "Next steps:"
echo "1. Check test results above"
echo "2. Try SQL generation: python app/custom_model_client.py"
echo "3. Monitor usage: https://console.groq.com/usage"
echo ""
