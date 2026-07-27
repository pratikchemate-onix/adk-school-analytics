"""
Custom Model Client for Third-Party API Integration
Supports Together AI, OpenRouter, Replicate, and other OpenAI-compatible endpoints
"""

import os
from openai import OpenAI
from typing import Any, Dict, Optional, List


class CustomModelClient:
    """
    Wrapper for third-party LLM APIs (Together AI, OpenRouter, etc.)
    Provides OpenAI-compatible interface for ADK integration
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        """
        Initialize custom model client
        
        Args:
            api_key: API key for the third-party service (reads from env if not provided)
            base_url: Base URL for the API (default: Together AI)
            model_name: Model name to use (default: Qwen2.5-7B-Instruct-Turbo)
        """
        # Default to Together AI
        self.api_key = api_key or os.getenv("CUSTOM_MODEL_API_KEY")
        self.base_url = base_url or os.getenv(
            "CUSTOM_MODEL_BASE_URL", 
            "https://api.together.ai/v1"
        )
        self.model_name = model_name or os.getenv(
            "CUSTOM_MODEL_NAME", 
            "Qwen/Qwen2.5-7B-Instruct-Turbo"
        )
        
        if not self.api_key:
            raise ValueError(
                "API key not found! Set CUSTOM_MODEL_API_KEY environment variable "
                "or pass api_key parameter"
            )
        
        # Initialize OpenAI client pointing to custom endpoint
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
    
    def generate_content(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 1.0,
        max_tokens: int = 4096,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate content using the custom model
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional parameters
            
        Returns:
            Response dict with 'content' and metadata
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            return {
                "content": response.choices[0].message.content,
                "role": response.choices[0].message.role,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }
            }
        except Exception as e:
            print(f"Error calling custom model: {e}")
            raise
    
    def stream_content(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 1.0,
        max_tokens: int = 4096,
        **kwargs
    ):
        """
        Stream content from the custom model
        
        Args:
            messages: List of message dicts
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Yields:
            Content chunks as they arrive
        """
        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )
            
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            print(f"Error streaming from custom model: {e}")
            raise


# Convenience function for quick testing
def test_custom_model():
    """Quick test of the custom model client"""
    client = CustomModelClient()
    
    messages = [
        {"role": "system", "content": "You are a helpful SQL assistant."},
        {"role": "user", "content": "Write a SELECT query to find top 10 users by revenue."}
    ]
    
    print(f"Testing model: {client.model_name}")
    print(f"Base URL: {client.base_url}")
    print("\nSending request...\n")
    
    response = client.generate_content(messages)
    
    print("Response:")
    print(response["content"])
    print(f"\nTokens used: {response['usage']['total_tokens']}")
    print(f"Cost estimate: ${(response['usage']['prompt_tokens'] * 0.30 + response['usage']['completion_tokens'] * 0.30) / 1_000_000:.6f}")


if __name__ == "__main__":
    test_custom_model()
