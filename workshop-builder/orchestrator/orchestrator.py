import logging
import os
import shutil
import time
from pathlib import Path
from typing import Optional

from .config import AppConfig
from ..agents import (
    ResearchAgent, ResearchAgentError,
    CompilerAgent, CompilerAgentError,
    GitAgent, GitAgentError
)

class OrchestratorError(Exception):
    """Custom exception for Orchestrator errors."""
    pass

class Orchestrator:
    def __init__(self, config: AppConfig):
        self.config = config
        self.logger = config.get_logger(__name__)
        self.logger.info("Orchestrator initialized with Codex framework integration.")

        # Resolve absolute path for temp_data_dir if it's relative
        if not os.path.isabs(self.config.temp_data_dir):
            script_dir = os.path.dirname(os.path.abspath(__file__))
            self.config.temp_data_dir = os.path.join(script_dir, '..', self.config.temp_data_dir)
            self.config.temp_data_dir = os.path.normpath(self.config.temp_data_dir)
        
        self.logger.debug(f"Temporary data directory set to: {self.config.temp_data_dir}")
        
        # Create orchestrator AGENTS.MD for guidance
        self._create_orchestrator_agents_md()

    def _create_orchestrator_agents_md(self):
        """Create AGENTS.MD file for orchestrator guidance following Codex best practices."""
        agents_md_path = os.path.join(os.path.dirname(__file__), "AGENTS.MD")
        
        agents_md_content = """# AGENTS.MD - Orchestrator Guidance for AI Agents

## Project Context
This is the AI Workshop Builder orchestrator that coordinates multiple specialized agents to generate educational workshop content.

## Orchestration Flow
1. **Research Phase**: Gemini Flash 2.5 deep research via ResearchAgent
2. **Compilation Phase**: OpenAI Codex CLI integration via CompilerAgent
3. **Publishing Phase**: GitHub PR creation via GitAgent

## Agent Coordination Principles
- Each agent operates independently with clear interfaces
- Error handling cascades appropriately through the pipeline
- Temporary data is managed securely and cleaned up
- All operations follow Codex framework best practices

## Quality Standards
- Comprehensive logging at each phase
- Proper error handling and recovery
- Clean separation of concerns between agents
- Professional PR creation with detailed descriptions

## Forbidden Actions
- Do not bypass agent interfaces
- Do not skip error handling
- Do not leave temporary data uncleaned
- Do not proceed if any agent fails critically

## Success Criteria
- Research data successfully generated and validated
- Workshop module compiled with proper structure
- Professional PR created with comprehensive description
- All temporary resources cleaned up properly
"""
        
        try:
            with open(agents_md_path, 'w', encoding='utf-8') as f:
                f.write(agents_md_content)
            self.logger.debug(f"Created orchestrator AGENTS.MD: {agents_md_path}")
        except Exception as e:
            self.logger.warning(f"Could not create orchestrator AGENTS.MD: {e}")


    def _setup_temp_dir(self):
        """Creates or cleans the temporary directory for research data."""
        if os.path.exists(self.config.temp_data_dir):
            self.logger.info(f"Cleaning existing temporary data directory: {self.config.temp_data_dir}")
            try:
                shutil.rmtree(self.config.temp_data_dir)
            except OSError as e:
                self.logger.error(f"Error removing temporary directory {self.config.temp_data_dir}: {e}")
                raise # Re-raise to halt execution if temp dir can't be managed
        
        try:
            os.makedirs(self.config.temp_data_dir, exist_ok=True)
            self.logger.info(f"Ensured temporary data directory exists: {self.config.temp_data_dir}")
        except OSError as e:
            self.logger.error(f"Error creating temporary directory {self.config.temp_data_dir}: {e}")
            raise


    def _cleanup_temp_dir(self):
        """Removes the temporary directory after processing."""
        if os.path.exists(self.config.temp_data_dir):
            self.logger.info(f"Cleaning up temporary data directory: {self.config.temp_data_dir}")
            try:
                shutil.rmtree(self.config.temp_data_dir)
            except OSError as e:
                self.logger.warning(f"Could not remove temporary directory {self.config.temp_data_dir}: {e}")
        else:
            self.logger.debug(f"Temporary data directory not found for cleanup: {self.config.temp_data_dir}")


    def run(self, topic: str) -> dict:
        """
        Execute the complete workshop generation pipeline using Codex framework.
        
        Args:
            topic (str): The workshop topic to research and generate content for
            
        Returns:
            dict: Results containing module_path, pr_url, and generation metadata
        """
        start_time = time.time()
        self.logger.info(f"🚀 Starting Codex-powered workshop generation for topic: '{topic}'")
        
        results = {
            'topic': topic,
            'success': False,
            'module_path': None,
            'pr_url': None,
            'generation_time': None,
            'research_files_count': 0,
            'workshop_number': None,
            'error': None
        }
        
        try:
            # Setup temporary workspace
            self._setup_temp_dir()
            self.logger.info("📁 Temporary workspace prepared")

            # Phase 1: Deep Research using Gemini Flash 2.5
            self.logger.info(f"🔍 Phase 1: Executing deep research for '{topic}' using Gemini Flash 2.5")
            research_agent = ResearchAgent(self.config, self.config.temp_data_dir)
            research_data_paths = research_agent.fetch_unstructured_data(topic)
            
            if not research_data_paths:
                raise ResearchAgentError("No research data was generated - cannot proceed")
            
            results['research_files_count'] = len(research_data_paths)
            self.logger.info(f"✅ Research Phase complete: {len(research_data_paths)} comprehensive data files generated")

            # Phase 2: Content Compilation using OpenAI Codex CLI
            self.logger.info(f"⚙️ Phase 2: Compiling workshop content using OpenAI Codex CLI")
            compiler_agent = CompilerAgent(self.config)
            module_path = compiler_agent.compile_workshop(topic, research_data_paths)
            
            if not module_path or not os.path.exists(module_path):
                raise CompilerAgentError(f"Workshop compilation failed - module not created at {module_path}")
            
            results['module_path'] = module_path
            
            # Extract workshop number for proper tracking
            workshop_number = self._extract_workshop_number(module_path)
            results['workshop_number'] = workshop_number
            self.logger.info(f"✅ Compilation Phase complete: Workshop {workshop_number} created at {module_path}")

            # Phase 3: Professional PR Creation and Publishing
            self.logger.info(f"📤 Phase 3: Creating professional PR for workshop {workshop_number}")
            git_agent = GitAgent(self.config)
            pr_url = git_agent.publish_module(module_path, topic, workshop_number)
            
            if not pr_url:
                raise GitAgentError("PR creation failed - no URL returned")
            
            results['pr_url'] = pr_url
            results['success'] = True
            results['generation_time'] = round(time.time() - start_time, 2)
            
            self.logger.info(f"✅ Publishing Phase complete: Professional PR created at {pr_url}")
            self.logger.info(f"🎉 Workshop generation completed successfully in {results['generation_time']}s")
            
            # Print success summary
            self._print_success_summary(results)
            
            return results

        except (ResearchAgentError, CompilerAgentError, GitAgentError) as agent_error:
            results['error'] = str(agent_error)
            results['generation_time'] = round(time.time() - start_time, 2)
            self.logger.error(f"❌ Agent error during workshop generation: {agent_error}", exc_info=True)
            self._print_error_summary(results, agent_error)
            raise
            
        except Exception as e:
            results['error'] = str(e)
            results['generation_time'] = round(time.time() - start_time, 2)
            self.logger.error(f"❌ Unexpected error in orchestrator: {e}", exc_info=True)
            self._print_error_summary(results, e)
            raise OrchestratorError(f"Workshop generation failed: {e}") from e
            
        finally:
            self._cleanup_temp_dir()
            self.logger.info("🧹 Temporary workspace cleaned up")

    def _extract_workshop_number(self, module_path: str) -> str:
        """Extract workshop number from module path following workshop-XX-slug format."""
        module_dir_name = os.path.basename(module_path)
        try:
            parts = module_dir_name.split('-')
            if len(parts) >= 2 and parts[0] == 'workshop':
                workshop_number = parts[1]
                if workshop_number.isdigit():
                    return workshop_number
            raise ValueError(f"Invalid workshop directory format: {module_dir_name}")
        except (IndexError, ValueError) as e:
            self.logger.warning(f"Could not parse workshop number from '{module_dir_name}': {e}")
            return "XX"  # Fallback

    def _print_success_summary(self, results: dict):
        """Print a comprehensive success summary."""
        print("\n" + "="*80)
        print("🎉 WORKSHOP GENERATION COMPLETED SUCCESSFULLY")
        print("="*80)
        print(f"📚 Topic: {results['topic']}")
        print(f"🔢 Workshop Number: {results['workshop_number']}")
        print(f"📁 Module Path: {results['module_path']}")
        print(f"🔗 Pull Request: {results['pr_url']}")
        print(f"📊 Research Files: {results['research_files_count']}")
        print(f"⏱️  Generation Time: {results['generation_time']}s")
        print("\n🔧 Generated using:")
        print("  • Gemini Flash 2.5 for deep research")
        print("  • OpenAI Codex CLI for content compilation")
        print("  • GitHub API for professional PR creation")
        print("\n✅ Ready for review and integration!")
        print("="*80)

    def _print_error_summary(self, results: dict, error: Exception):
        """Print a comprehensive error summary."""
        print("\n" + "="*80)
        print("❌ WORKSHOP GENERATION FAILED")
        print("="*80)
        print(f"📚 Topic: {results['topic']}")
        print(f"⏱️  Runtime: {results['generation_time']}s")
        print(f"📊 Research Files Generated: {results['research_files_count']}")
        if results['module_path']:
            print(f"📁 Partial Module: {results['module_path']}")
        print(f"🚨 Error: {error}")
        print("\n🔧 Check logs for detailed error information")
        print("="*80)

if __name__ == '__main__':
    # For basic testing of Orchestrator (requires a .env file and paths set up)
    print("Testing Orchestrator (requires .env file in workshop-builder directory)")
    
    # Create a dummy .env if it doesn't exist for this specific test
    # In a real scenario, cli.py would handle AppConfig instantiation
    if not os.path.exists(os.path.join(os.path.dirname(__file__), '..', '.env')):
        print("Creating a dummy .env for orchestrator test...")
        with open(os.path.join(os.path.dirname(__file__), '..', '.env'), 'w') as f:
            f.write('GEMINI_API_KEY="dummy_gemini"\n')
            f.write('OPENAI_API_KEY="dummy_openai"\n')
            f.write('GITHUB_TOKEN="dummy_github_token"\n')
            f.write('GITHUB_REPO_OWNER="testowner"\n')
            f.write('GITHUB_REPO_NAME="testrepo"\n')
            f.write('WORKSHOPS_BASE_DIR="../public/data/workshops_test"\n') # Use a test dir
            f.write('LOG_LEVEL="DEBUG"\n')

    try:
        # Setup basic logging for this direct test
        logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        config = AppConfig()
        
        # Ensure workshops_base_dir is absolute for the test
        if not os.path.isabs(config.workshops_base_dir):
            script_dir = os.path.dirname(os.path.abspath(__file__)) # orchestrator dir
            config.workshops_base_dir = os.path.join(script_dir, '..', config.workshops_base_dir) # relative to workshop-builder
            config.workshops_base_dir = os.path.normpath(config.workshops_base_dir)
        
        # Create the test workshops base dir if it doesn't exist
        os.makedirs(config.workshops_base_dir, exist_ok=True)
        print(f"Using test workshops base directory: {config.workshops_base_dir}")

        orchestrator = Orchestrator(config)
        orchestrator.run("Test Topic Orchestrator")
    except ValueError as ve:
        print(f"Configuration Error: {ve}")
    except Exception as e:
        print(f"Orchestrator test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up dummy .env if created by this test
        dummy_env_path = os.path.join(os.path.dirname(__file__), '..', '.env_dummy_created')
        if os.path.exists(dummy_env_path): # A bit of a hack to signal it was dummy
             os.remove(os.path.join(os.path.dirname(__file__), '..', '.env'))
             print("Removed dummy .env")
        # Clean up test workshops dir
        test_workshops_dir = os.path.join(os.path.dirname(__file__), '..', "../public/data/workshops_test")
        test_workshops_dir = os.path.normpath(test_workshops_dir)
        if os.path.exists(test_workshops_dir) and "workshops_test" in test_workshops_dir : # Safety check
            print(f"Cleaning up test workshops directory: {test_workshops_dir}")
            shutil.rmtree(test_workshops_dir)