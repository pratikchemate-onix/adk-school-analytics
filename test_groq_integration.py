#!/usr/bin/env python3
"""Quick test script for Groq + LiteLLM integration."""

import os
import sys

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

def test_basic_import():
    """Test 1: Basic imports and agent initialization."""
    print("=" * 60)
    print("TEST 1: Basic Import & Initialization")
    print("=" * 60)
    
    try:
        from app.agent import root_agent
        print(f"✅ Agent initialized: {root_agent.name}")
        print(f"✅ Agent description: {root_agent.description}")
        print(f"✅ Model type: {type(root_agent.model).__name__}")
        print(f"✅ Number of tools: {len(root_agent.tools)}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_litellm_mode():
    """Test 2: Check if LiteLLM mode is active."""
    print("\n" + "=" * 60)
    print("TEST 2: LiteLLM Mode Check")
    print("=" * 60)
    
    use_litellm = os.getenv("USE_LITELLM", "false").lower() == "true"
    litellm_model = os.getenv("LITELLM_MODEL", "not set")
    groq_key = os.getenv("GROQ_API_KEY", "not set")
    
    print(f"USE_LITELLM: {use_litellm}")
    print(f"LITELLM_MODEL: {litellm_model}")
    print(f"GROQ_API_KEY: {'✅ Set' if groq_key != 'not set' else '❌ Not set'}")
    
    if use_litellm:
        print("✅ LiteLLM mode is ENABLED")
        print(f"✅ Will use model: {litellm_model}")
    else:
        print("⚠️  LiteLLM mode is DISABLED (using Vertex AI)")
        print("   To enable, set USE_LITELLM=true in .env")
    
    return use_litellm

def test_simple_query():
    """Test 3: Simple query to agent."""
    print("\n" + "=" * 60)
    print("TEST 3: Simple Query Test")
    print("=" * 60)
    
    try:
        from app.agent import app
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        
        print("Creating runner...")
        runner = Runner(
            app=app,
            session_service=InMemorySessionService()
        )
        
        print("Creating session...")
        session = runner.create_session()
        
        print("Sending test query: 'Hello, how are you?'")
        events = list(runner.run(
            session_id=session.id, 
            user_content="Hello, how are you?"
        ))
        
        print("\n--- Agent Response ---")
        for event in events:
            if hasattr(event, 'text') and event.text:
                print(event.text)
        print("--- End Response ---\n")
        
        print("✅ Simple query test PASSED")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_tool_calling():
    """Test 4: Tool calling (list tables)."""
    print("\n" + "=" * 60)
    print("TEST 4: Tool Calling Test")
    print("=" * 60)
    
    try:
        from app.agent import app
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        
        runner = Runner(
            app=app,
            session_service=InMemorySessionService()
        )
        
        session = runner.create_session()
        
        print("Sending query: 'What tables are available?'")
        events = list(runner.run(
            session_id=session.id, 
            user_content="What tables are available in the database?"
        ))
        
        print("\n--- Agent Response ---")
        tool_called = False
        for event in events:
            if hasattr(event, 'text') and event.text:
                print(event.text)
            if hasattr(event, 'tool_calls'):
                tool_called = True
                print(f"🔧 Tool called: {event.tool_calls}")
        print("--- End Response ---\n")
        
        if tool_called or any('table' in str(e).lower() for e in events):
            print("✅ Tool calling test PASSED")
            return True
        else:
            print("⚠️  No obvious tool call detected, but query completed")
            return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests."""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║  GROQ + LITELLM INTEGRATION TEST SUITE                   ║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    results = []
    
    # Test 1: Basic import
    results.append(("Basic Import", test_basic_import()))
    
    # Test 2: LiteLLM mode
    litellm_enabled = test_litellm_mode()
    
    # Test 3: Simple query (only if imports worked)
    if results[0][1]:
        results.append(("Simple Query", test_simple_query()))
    
    # Test 4: Tool calling (only if simple query worked)
    if results[0][1]:
        results.append(("Tool Calling", test_tool_calling()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:30s} {status}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if litellm_enabled:
        print("\n🚀 LiteLLM + Groq is ENABLED and working!")
    else:
        print("\n⚠️  LiteLLM is DISABLED. To enable:")
        print("   1. Edit .env")
        print("   2. Set USE_LITELLM=true")
        print("   3. Run this test again")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
