#!/usr/bin/env python3
"""
Quick Test Script for Third-Party Model Integration
Tests Together AI / OpenRouter / Custom endpoints without modifying main agent
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def print_banner(text):
    """Print a nice banner"""
    width = 70
    print("\n" + "=" * width)
    print(f"  {text}")
    print("=" * width + "\n")


def check_environment():
    """Check if environment is configured"""
    print_banner("Step 1: Checking Environment Configuration")
    
    required_vars = ["CUSTOM_MODEL_API_KEY", "CUSTOM_MODEL_BASE_URL", "CUSTOM_MODEL_NAME"]
    missing = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask API key for security
            if "KEY" in var:
                display_value = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
            else:
                display_value = value
            print(f"✓ {var}: {display_value}")
        else:
            print(f"✗ {var}: NOT SET")
            missing.append(var)
    
    if missing:
        print("\n⚠️  Missing required environment variables!")
        print("\nTo fix this:")
        print("1. Copy settings from .env.custom_model to .env")
        print("2. Replace 'your_together_ai_key_here' with your actual API key")
        print("3. Get your key from: https://api.together.ai/settings/api-keys")
        return False
    
    print("\n✓ Environment configured correctly!")
    return True


def test_basic_query():
    """Test basic model query"""
    print_banner("Step 2: Testing Basic Model Query")
    
    try:
        from app.custom_model_client import CustomModelClient
        
        client = CustomModelClient()
        
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'Hello! I am working correctly.' in one sentence."}
        ]
        
        print("Sending test message to model...")
        response = client.generate_content(messages, max_tokens=100)
        
        print("\n✓ Model Response:")
        print(f"  {response['content']}")
        print(f"\n✓ Tokens Used: {response['usage']['total_tokens']}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def test_sql_generation():
    """Test SQL generation capability"""
    print_banner("Step 3: Testing SQL Generation (Your Use Case)")
    
    try:
        from app.custom_model_client import CustomModelClient
        
        client = CustomModelClient()
        
        messages = [
            {
                "role": "system", 
                "content": "You are a SQL expert. Generate clean, efficient SQL queries."
            },
            {
                "role": "user", 
                "content": "Write a BigQuery SQL query to find the top 10 students by total marks from a table called 'students' with columns: student_id, name, marks. Include only the SQL query."
            }
        ]
        
        print("Testing SQL generation capability...")
        response = client.generate_content(messages, max_tokens=500, temperature=0.3)
        
        print("\n✓ Generated SQL:")
        print("-" * 70)
        print(response['content'])
        print("-" * 70)
        
        print(f"\n✓ Tokens: {response['usage']['total_tokens']}")
        cost = (response['usage']['prompt_tokens'] * 0.30 + 
                response['usage']['completion_tokens'] * 0.30) / 1_000_000
        print(f"✓ Estimated Cost: ${cost:.6f}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def test_streaming():
    """Test streaming response"""
    print_banner("Step 4: Testing Streaming Response (Optional)")
    
    try:
        from app.custom_model_client import CustomModelClient
        
        client = CustomModelClient()
        
        messages = [
            {"role": "user", "content": "Count from 1 to 5, each number on a new line."}
        ]
        
        print("Testing streaming capability...")
        print("\n✓ Streamed Response:")
        print("-" * 70)
        
        for chunk in client.stream_content(messages, max_tokens=100):
            print(chunk, end="", flush=True)
        
        print("\n" + "-" * 70)
        print("\n✓ Streaming works!")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def show_next_steps():
    """Show what to do next"""
    print_banner("Next Steps: Integration with Your ADK Agent")
    
    print("""
Now that the custom model is working, you have TWO options:

OPTION A: Use Custom Model Directly (Recommended for Testing)
   → Bypass ADK temporarily
   → Use custom_model_client.py directly in your code
   → Good for: Testing model performance before full integration
   
   Steps:
   1. Import: from app.custom_model_client import CustomModelClient
   2. Use it in your query logic instead of ADK's LlmAgent
   3. Test with real BigQuery queries

OPTION B: Integrate with ADK (Requires ADK Modification)
   → Modify ADK to support custom endpoints
   → Keep using LlmAgent with your custom model
   → Good for: Production deployment
   
   Challenge: ADK is tightly coupled to Vertex AI
   Solution: We need to check if ADK supports custom model providers
   
Let me know which option you want to try!
    """)


def main():
    """Run all tests"""
    print_banner("🚀 Custom Model Integration Test Suite")
    
    print("""
This script tests your third-party LLM endpoint (Together AI, OpenRouter, etc.)
Before running, make sure you've:
  1. Copied .env.custom_model settings to .env
  2. Added your API key
  3. Installed: pip install openai python-dotenv
    """)
    
    input("Press Enter to start tests...")
    
    # Run tests
    tests_passed = 0
    total_tests = 4
    
    if check_environment():
        tests_passed += 1
        
        if test_basic_query():
            tests_passed += 1
            
            if test_sql_generation():
                tests_passed += 1
                
                if test_streaming():
                    tests_passed += 1
    
    # Summary
    print_banner(f"Test Results: {tests_passed}/{total_tests} Passed")
    
    if tests_passed == total_tests:
        print("✓ All tests passed! Your custom model is working correctly.")
        show_next_steps()
        return 0
    else:
        print(f"✗ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
