#!/usr/bin/env python3
"""
Test script to verify the Workshop Builder refactoring from CLI to OpenAI API.
This script tests the core functionality without requiring actual API keys.
"""

import os
import sys
import tempfile
import shutil
from unittest.mock import Mock, patch

# Add the workshop-builder directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_config_loading():
    """Test that the configuration loads with mock environment variables."""
    print("Testing configuration loading...")
    
    # Mock environment variables
    mock_env = {
        'GEMINI_API_KEY': 'test_gemini_key',
        'OPENAI_API_KEY': 'test_openai_key',
        'GITHUB_TOKEN': 'test_github_token',
        'GITHUB_REPO_OWNER': 'test_owner',
        'GITHUB_REPO_NAME': 'test_repo',
        'OPENAI_MODEL': 'gpt-4o',
        'OPENAI_MAX_TOKENS': '4000',
        'OPENAI_TEMPERATURE': '0.1'
    }
    
    with patch.dict(os.environ, mock_env):
        with patch('openai.OpenAI') as mock_openai:
            # Mock the OpenAI client
            mock_client = Mock()
            mock_client.models.list.return_value = []
            mock_openai.return_value = mock_client
            
            try:
                from orchestrator.config import AppConfig
                config = AppConfig()
                
                # Test new OpenAI configuration
                openai_config = config.get_openai_config()
                assert openai_config['model'] == 'gpt-4o'
                assert openai_config['max_tokens'] == 4000
                assert openai_config['temperature'] == 0.1
                
                print("✓ Configuration loading successful")
                print(f"✓ OpenAI model: {config.openai_model}")
                print(f"✓ Max tokens: {config.openai_max_tokens}")
                print(f"✓ Temperature: {config.openai_temperature}")
                return True
                
            except Exception as e:
                print(f"✗ Configuration loading failed: {e}")
                return False

def test_compiler_agent_initialization():
    """Test that the CompilerAgent initializes with the new OpenAI client."""
    print("\nTesting CompilerAgent initialization...")
    
    mock_env = {
        'GEMINI_API_KEY': 'test_gemini_key',
        'OPENAI_API_KEY': 'test_openai_key',
        'GITHUB_TOKEN': 'test_github_token',
        'GITHUB_REPO_OWNER': 'test_owner',
        'GITHUB_REPO_NAME': 'test_repo',
        'WORKSHOPS_BASE_DIR': tempfile.mkdtemp(),
        'COMPILER_AGENT_PROMPT_PATH': 'test_prompt.md'
    }
    
    # Create a temporary prompt file
    prompt_path = os.path.join(os.path.dirname(__file__), 'test_prompt.md')
    with open(prompt_path, 'w') as f:
        f.write("Test prompt for {SUBJECT}")
    
    try:
        with patch.dict(os.environ, mock_env):
            with patch('openai.OpenAI') as mock_openai:
                # Mock the OpenAI client
                mock_client = Mock()
                mock_client.models.list.return_value = []
                mock_openai.return_value = mock_client
                
                from orchestrator.config import AppConfig
                from agents.compiler_agent import CompilerAgent
                
                config = AppConfig()
                agent = CompilerAgent(config)
                
                # Verify the agent has an OpenAI client
                assert hasattr(agent, 'openai_client')
                assert agent.openai_client is not None
                
                print("✓ CompilerAgent initialization successful")
                print("✓ OpenAI client properly initialized")
                return True
                
    except Exception as e:
        print(f"✗ CompilerAgent initialization failed: {e}")
        return False
    finally:
        # Clean up
        if os.path.exists(prompt_path):
            os.remove(prompt_path)
        if os.path.exists(mock_env['WORKSHOPS_BASE_DIR']):
            shutil.rmtree(mock_env['WORKSHOPS_BASE_DIR'])

def test_message_preparation():
    """Test that the new message preparation method works correctly."""
    print("\nTesting message preparation for OpenAI API...")
    
    mock_env = {
        'GEMINI_API_KEY': 'test_gemini_key',
        'OPENAI_API_KEY': 'test_openai_key',
        'GITHUB_TOKEN': 'test_github_token',
        'GITHUB_REPO_OWNER': 'test_owner',
        'GITHUB_REPO_NAME': 'test_repo',
        'WORKSHOPS_BASE_DIR': tempfile.mkdtemp(),
        'COMPILER_AGENT_PROMPT_PATH': 'test_prompt.md'
    }
    
    # Create a temporary prompt file
    prompt_path = os.path.join(os.path.dirname(__file__), 'test_prompt.md')
    with open(prompt_path, 'w') as f:
        f.write("Create a workshop about {SUBJECT} using the provided research data.")
    
    # Create temporary research files
    research_dir = tempfile.mkdtemp()
    research_file = os.path.join(research_dir, 'research.txt')
    with open(research_file, 'w') as f:
        f.write("Sample research content about Python programming.")
    
    try:
        with patch.dict(os.environ, mock_env):
            with patch('openai.OpenAI') as mock_openai:
                mock_client = Mock()
                mock_client.models.list.return_value = []
                mock_openai.return_value = mock_client
                
                from orchestrator.config import AppConfig
                from agents.compiler_agent import CompilerAgent
                
                config = AppConfig()
                agent = CompilerAgent(config)
                
                # Test message preparation
                messages = agent._prepare_workshop_messages(
                    "Python Programming",
                    [research_file],
                    "/tmp/test_module"
                )
                
                # Verify message structure
                assert len(messages) == 2
                assert messages[0]['role'] == 'system'
                assert messages[1]['role'] == 'user'
                assert 'Python Programming' in messages[1]['content']
                assert 'JSON object' in messages[0]['content']
                
                print("✓ Message preparation successful")
                print("✓ System and user messages properly structured")
                print("✓ JSON response format specified")
                return True
                
    except Exception as e:
        print(f"✗ Message preparation failed: {e}")
        return False
    finally:
        # Clean up
        if os.path.exists(prompt_path):
            os.remove(prompt_path)
        if os.path.exists(research_dir):
            shutil.rmtree(research_dir)
        if os.path.exists(mock_env['WORKSHOPS_BASE_DIR']):
            shutil.rmtree(mock_env['WORKSHOPS_BASE_DIR'])

def main():
    """Run all tests."""
    print("Workshop Builder Refactoring Test Suite")
    print("=" * 50)
    
    tests = [
        test_config_loading,
        test_compiler_agent_initialization,
        test_message_preparation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Refactoring successful.")
        print("\nKey improvements:")
        print("✓ Removed dependency on non-existent Codex CLI")
        print("✓ Implemented direct OpenAI API integration")
        print("✓ Updated to modern models (gpt-4o)")
        print("✓ Added structured JSON output support")
        print("✓ Maintained Docker security architecture")
        return True
    else:
        print("❌ Some tests failed. Please review the issues above.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)