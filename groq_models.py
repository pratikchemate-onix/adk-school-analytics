#!/usr/bin/env python3
"""
List all available models from Groq API
Run this to see what models you can use
"""

import os
from dotenv import load_dotenv

load_dotenv()

def list_groq_models():
    """List all available Groq models"""
    api_key = os.getenv("CUSTOM_MODEL_API_KEY") or os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print("⚠️  No API key found!")
        print("Add to .env: CUSTOM_MODEL_API_KEY=gsk_YOUR_KEY")
        print("\nOr test with a key:")
        print("  GROQ_API_KEY=gsk_xxx python groq_models.py")
        return
    
    try:
        from groq import Groq
        
        client = Groq(api_key=api_key)
        models = client.models.list()
        
        print("=" * 80)
        print("🚀 AVAILABLE GROQ MODELS")
        print("=" * 80)
        print()
        
        # Categorize models
        chat_models = []
        other_models = []
        
        for model in models.data:
            if 'whisper' in model.id.lower() or 'distil' in model.id.lower():
                other_models.append(model)
            else:
                chat_models.append(model)
        
        print("📝 CHAT/TEXT MODELS (Use these for SQL generation):")
        print("-" * 80)
        for i, model in enumerate(chat_models, 1):
            print(f"{i}. {model.id}")
            if hasattr(model, 'context_window'):
                print(f"   Context: {model.context_window}")
        
        if other_models:
            print()
            print("🎤 OTHER MODELS (Audio/Speech):")
            print("-" * 80)
            for model in other_models:
                print(f"- {model.id}")
        
        print()
        print("=" * 80)
        print(f"Total models: {len(models.data)}")
        print("=" * 80)
        
        return chat_models
        
    except ImportError:
        print("Installing groq package...")
        import subprocess
        subprocess.check_call(["pip", "install", "-q", "groq"])
        print("✓ Installed! Run again: python groq_models.py")
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure your API key is valid!")
        print("Get it from: https://console.groq.com/keys")


if __name__ == "__main__":
    list_groq_models()
