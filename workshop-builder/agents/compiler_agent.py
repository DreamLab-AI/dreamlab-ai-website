import logging
import os
import json
import shutil
import tempfile
from pathlib import Path
from typing import List, Dict, Any

import openai

# Handle both relative and absolute imports for flexibility
try:
    from ..orchestrator.config import AppConfig
except ImportError:
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from orchestrator.config import AppConfig

class CompilerAgentError(Exception):
    """Custom exception for CompilerAgent errors."""
    pass

class CompilerAgent:
    def __init__(self, config: AppConfig):
        self.config = config
        self.logger = config.get_logger(__name__)
        self.logger.info("CompilerAgent initialized.")

        if not self.config.openai_api_key:
            self.logger.error("OpenAI API key is not configured.")
            raise CompilerAgentError("OpenAI API key missing.")
        
        # Initialize OpenAI client
        self.openai_client = openai.OpenAI(api_key=self.config.openai_api_key)
        
        # Resolve compiler_agent_prompt_path to be absolute
        if not os.path.isabs(self.config.compiler_agent_prompt_path):
            script_dir = os.path.dirname(os.path.abspath(__file__))
            self.config.compiler_agent_prompt_path = os.path.join(script_dir, '..', self.config.compiler_agent_prompt_path)
            self.config.compiler_agent_prompt_path = os.path.normpath(self.config.compiler_agent_prompt_path)
        
        if not os.path.exists(self.config.compiler_agent_prompt_path):
            self.logger.error(f"Compiler agent prompt file not found at: {self.config.compiler_agent_prompt_path}")
            raise CompilerAgentError(f"Compiler agent prompt file not found: {self.config.compiler_agent_prompt_path}")
        
        self.logger.debug(f"Compiler agent prompt path: {self.config.compiler_agent_prompt_path}")
        
        # Verify OpenAI API connectivity
        self._verify_openai_api()

    def _verify_openai_api(self):
        """Verify that the OpenAI API is accessible."""
        try:
            # Test API connectivity with a simple models list call
            models = self.openai_client.models.list()
            self.logger.info("OpenAI API connectivity verified successfully")
        except Exception as e:
            self.logger.warning(f"OpenAI API verification failed: {e}")
            # Don't raise error here - we'll handle this gracefully in compile_workshop

    def _create_agents_md(self, module_path: str, topic: str) -> str:
        """Create an AGENTS.MD file for the workshop module following Codex best practices."""
        agents_md_path = os.path.join(module_path, "AGENTS.MD")
        
        agents_md_content = f"""# AGENTS.MD - Workshop Module Guidance for AI Agents

## Project Context
This is a workshop module for: **{topic}**

## Code Style
- Use clear, educational markdown formatting
- Include proper code blocks with language specifiers
- Use descriptive headings and subheadings
- Maintain consistent tone throughout the workshop

## Content Standards
- All content must be accurate and educational
- Include practical examples and exercises where applicable
- Explain technical concepts clearly for learners
- Use proper markdown syntax for all formatting

## File Structure Requirements
- Follow the XX_filename.md naming convention
- Ensure manifest.json accurately lists all files in order
- Include comprehensive README.md with navigation
- Maintain logical progression from basic to advanced concepts

## Forbidden Actions
- Do not create files outside the workshop module directory
- Do not modify existing workshop modules
- Do not include placeholder content without clear instructions
- Do not break the established file naming conventions

## Quality Guidelines
- Ensure all code examples are functional and tested
- Include clear learning objectives for each section
- Provide step-by-step instructions for practical exercises
- Review content for accuracy and completeness before finalizing
"""
        
        with open(agents_md_path, 'w', encoding='utf-8') as f:
            f.write(agents_md_content)
        
        self.logger.info(f"Created AGENTS.MD file: {agents_md_path}")
        return agents_md_path

    def _prepare_workshop_messages(self, topic: str, research_data_paths: List[str], module_path: str) -> List[Dict[str, str]]:
        """Prepare messages for OpenAI Chat Completions API."""
        
        # Read the base prompt template
        with open(self.config.compiler_agent_prompt_path, 'r', encoding='utf-8') as f:
            base_prompt = f.read()
        
        # Read research data content
        research_content = ""
        for data_path in research_data_paths:
            try:
                with open(data_path, 'r', encoding='utf-8') as f:
                    research_content += f"\n\n--- Content from {os.path.basename(data_path)} ---\n"
                    research_content += f.read()
                    research_content += "\n--- End of file ---\n"
            except Exception as e:
                self.logger.warning(f"Could not read research file {data_path}: {e}")
        
        # Create structured messages for chat completions
        system_message = f"""You are an expert educational content creator specializing in technical workshops. Your task is to create comprehensive, well-structured workshop modules based on research data.

{base_prompt}

You must respond with a JSON object containing the workshop files. The JSON structure should be:
{{
    "files": {{
        "manifest.json": "content of manifest.json",
        "README.md": "content of README.md",
        "00_introduction.md": "content of introduction",
        "01_core_concepts.md": "content of core concepts",
        "02_practical_examples.md": "content of practical examples",
        "03_advanced_topics.md": "content of advanced topics (if applicable)",
        "04_conclusion.md": "content of conclusion"
    }}
}}

Ensure all content is educational, accurate, and follows markdown best practices."""

        user_message = f"""Create a comprehensive workshop module for: "{topic}"

RESEARCH DATA:
{research_content}

Requirements:
1. Analyze the research data thoroughly
2. Create a logical sequence of markdown files (00_introduction.md, 01_core_concepts.md, etc.)
3. Generate manifest.json with the correct file listing and metadata
4. Create a comprehensive README.md with navigation
5. Ensure all content is educational, accurate, and well-structured
6. Include practical examples and exercises where applicable
7. Use proper markdown formatting throughout

The workshop should be suitable for learners wanting to understand {topic} and follow established educational patterns."""

        return [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]

    def _execute_openai_api(self, messages: List[Dict[str, str]], module_path: str) -> bool:
        """Execute OpenAI API call to generate workshop content."""
        try:
            self.logger.info("Calling OpenAI API for workshop compilation...")
            
            # Make API call using chat completions
            response = self.openai_client.chat.completions.create(
                model=self.config.openai_model,
                messages=messages,
                max_tokens=self.config.openai_max_tokens,
                temperature=self.config.openai_temperature,
                response_format={"type": "json_object"}  # Ensure JSON response
            )
            
            # Extract the generated content
            content = response.choices[0].message.content
            self.logger.debug(f"OpenAI API response received: {len(content)} characters")
            
            # Parse the JSON response
            try:
                workshop_data = json.loads(content)
                files_data = workshop_data.get("files", {})
                
                if not files_data:
                    self.logger.error("No files data found in OpenAI response")
                    return False
                
                # Write all files to the module directory
                for filename, file_content in files_data.items():
                    file_path = os.path.join(module_path, filename)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(file_content)
                    self.logger.info(f"Created file: {filename}")
                
                self.logger.info(f"OpenAI API execution completed successfully. Created {len(files_data)} files.")
                return True
                
            except json.JSONDecodeError as e:
                self.logger.error(f"Failed to parse JSON response from OpenAI: {e}")
                self.logger.debug(f"Raw response content: {content}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error executing OpenAI API call: {e}", exc_info=True)
            return False

    def _fallback_generation(self, topic: str, research_data_paths: List[str], module_path: str):
        """Fallback content generation when Codex CLI is not available."""
        self.logger.warning("Using fallback content generation (Codex CLI not available)")
        
        # Create basic workshop structure
        intro_content = f"""# Introduction to {topic}

This workshop provides a comprehensive introduction to {topic}.

## Learning Objectives

By the end of this workshop, you will:
- Understand the fundamental concepts of {topic}
- Be able to apply key principles in practical scenarios
- Have hands-on experience with relevant tools and techniques

## Prerequisites

- Basic understanding of related technologies
- Access to necessary development tools

## Workshop Structure

This workshop is organized into several sections, each building upon the previous one.
"""

        concepts_content = f"""# Core Concepts of {topic}

## Overview

This section covers the fundamental concepts you need to understand {topic}.

## Key Principles

[Content would be generated based on research data]

## Important Terminology

[Definitions and explanations]

## Practical Applications

[Real-world examples and use cases]
"""

        # Write basic files
        with open(os.path.join(module_path, "00_introduction.md"), "w", encoding="utf-8") as f:
            f.write(intro_content)
        
        with open(os.path.join(module_path, "01_core_concepts.md"), "w", encoding="utf-8") as f:
            f.write(concepts_content)
        
        # Create manifest.json
        manifest_data = {
            "id": f"workshop-{self._determine_next_workshop_number()}-{self._slugify_topic(topic)}",
            "title": f"Workshop: {topic}",
            "files": ["00_introduction.md", "01_core_concepts.md"]
        }
        
        with open(os.path.join(module_path, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)
        
        # Create README.md
        readme_content = f"""# Workshop: {topic}

Welcome to the workshop on {topic}.

## Sections

- [00 Introduction](./00_introduction.md)
- [01 Core Concepts](./01_core_concepts.md)

## Note

This workshop was generated using fallback content generation.
For optimal results, ensure the OpenAI Codex CLI is properly installed and configured.
"""
        
        with open(os.path.join(module_path, "README.md"), "w", encoding="utf-8") as f:
            f.write(readme_content)


    def _determine_next_workshop_number(self) -> int:
        """Determine the next workshop number based on existing workshops."""
        # Use workshops_output_dir if available, otherwise workshops_base_dir
        if hasattr(self.config, 'workshops_output_dir') and self.config.workshops_output_dir:
            base_dir = self.config.workshops_output_dir
        else:
            base_dir = self.config.workshops_base_dir
            
        if not os.path.exists(base_dir):
            return 1
        
        existing_workshops = [
            d for d in os.listdir(base_dir)
            if os.path.isdir(os.path.join(base_dir, d))
            and d.startswith("workshop-")
        ]
        
        if not existing_workshops:
            return 1
        
        # Extract numbers from workshop directories
        numbers = []
        for workshop in existing_workshops:
            try:
                # Extract number from "workshop-XX-topic" format
                parts = workshop.split("-")
                if len(parts) >= 2:
                    numbers.append(int(parts[1]))
            except ValueError:
                continue
        
        return max(numbers) + 1 if numbers else 1

    def _slugify_topic(self, topic: str) -> str:
        """Convert topic to a URL-friendly slug."""
        import re
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r'[^\w\s-]', '', topic.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')


    def compile_workshop(self, topic: str, research_data_paths: list) -> str:
        """
        Compile a workshop from research data using Codex CLI.
        
        Args:
            topic (str): The workshop topic
            research_data_paths (list): List of paths to research data files
            
        Returns:
            str: Path to the compiled workshop module directory
        """
        self.logger.info(f"Starting workshop compilation for topic: {topic}")
        
        # Create module directory
        module_path = self._create_module_directory(topic)
        
        # Create AGENTS.MD file for proper Codex guidance
        self._create_agents_md(module_path, topic)
        
        # Prepare messages for OpenAI API
        messages = self._prepare_workshop_messages(topic, research_data_paths, module_path)
        
        # Try to execute OpenAI API call
        success = self._execute_openai_api(messages, module_path)
        
        if not success:
            self.logger.warning("Codex CLI execution failed, using fallback generation")
            self._fallback_generation(topic, research_data_paths, module_path)
        
        # Validate the generated workshop
        self._validate_workshop_structure(module_path)
        
        self.logger.info(f"Workshop compilation completed. Module created at: {module_path}")
        return module_path

    def _create_module_directory(self, topic: str) -> str:
        """Create the workshop module directory."""
        # Determine the next workshop number
        workshop_number = self._determine_next_workshop_number()
        
        # Create module directory name
        topic_slug = self._slugify_topic(topic)
        module_name = f"workshop-{workshop_number}-{topic_slug}"
        
        # Create full path - use workshops_output_dir if available, otherwise workshops_base_dir
        if hasattr(self.config, 'workshops_output_dir') and self.config.workshops_output_dir:
            module_path = os.path.join(self.config.workshops_output_dir, module_name)
        else:
            module_path = os.path.join(self.config.workshops_base_dir, module_name)
        
        # Create directory if it doesn't exist
        if os.path.exists(module_path):
            self.logger.warning(f"Module directory {module_path} already exists. Removing for fresh creation.")
            shutil.rmtree(module_path)
        
        os.makedirs(module_path, exist_ok=True)
        
        self.logger.info(f"Created module directory: {module_path}")
        return module_path

    def _validate_workshop_structure(self, module_path: str):
        """Validate that the workshop has the required structure."""
        required_files = ['manifest.json', 'README.md']
        
        for required_file in required_files:
            file_path = os.path.join(module_path, required_file)
            if not os.path.exists(file_path):
                self.logger.warning(f"Required file missing: {required_file}")
                # Create minimal version if missing
                if required_file == 'manifest.json':
                    self._create_minimal_manifest(module_path)
                elif required_file == 'README.md':
                    self._create_minimal_readme(module_path)
        
        # Check for at least one content file
        content_files = [f for f in os.listdir(module_path)
                        if f.endswith('.md') and f != 'README.md' and f != 'AGENTS.MD']
        
        if not content_files:
            self.logger.warning("No content files found, creating minimal structure")
            self._create_minimal_content(module_path)

    def _create_minimal_manifest(self, module_path: str):
        """Create a minimal manifest.json file."""
        topic = os.path.basename(module_path).replace('workshop-', '').replace('-', ' ').title()
        
        # Find all markdown files except README.md and AGENTS.MD
        md_files = sorted([f for f in os.listdir(module_path)
                          if f.endswith('.md') and f not in ['README.md', 'AGENTS.MD']])
        
        manifest_data = {
            "id": os.path.basename(module_path),
            "title": f"Workshop: {topic}",
            "files": md_files if md_files else ["00_introduction.md"]
        }
        
        manifest_path = os.path.join(module_path, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)
        
        self.logger.info(f"Created minimal manifest.json: {manifest_path}")

    def _create_minimal_readme(self, module_path: str):
        """Create a minimal README.md file."""
        topic = os.path.basename(module_path).replace('workshop-', '').replace('-', ' ').title()
        
        readme_content = f"""# Workshop: {topic}

Welcome to the workshop on {topic}.

This workshop was generated automatically. Please refer to the individual sections for detailed content.

## Workshop Structure

The workshop is organized into logical sections that build upon each other.
"""
        
        readme_path = os.path.join(module_path, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(readme_content)
        
        self.logger.info(f"Created minimal README.md: {readme_path}")

    def _create_minimal_content(self, module_path: str):
        """Create minimal content if no content files exist."""
        topic = os.path.basename(module_path).replace('workshop-', '').replace('-', ' ').title()
        
        intro_content = f"""# Introduction to {topic}

This workshop provides an introduction to {topic}.

## Overview

This section introduces the key concepts and objectives of this workshop.

## Learning Objectives

By completing this workshop, you will gain understanding of the fundamental aspects of {topic}.
"""
        
        intro_path = os.path.join(module_path, "00_introduction.md")
        with open(intro_path, "w", encoding="utf-8") as f:
            f.write(intro_content)
        
        self.logger.info(f"Created minimal content file: {intro_path}")


if __name__ == '__main__':
    print("Testing CompilerAgent (requires .env file in workshop-builder directory)")

    if not os.path.exists(os.path.join(os.path.dirname(__file__), '..', '.env')):
        print("Creating a dummy .env for CompilerAgent test...")
        with open(os.path.join(os.path.dirname(__file__), '..', '.env'), 'w') as f:
            f.write('OPENAI_API_KEY="dummy_openai_key_for_test"\n')
            f.write('GEMINI_API_KEY="dummy"\nGITHUB_TOKEN="dummy"\nGITHUB_REPO_OWNER="dummy"\nGITHUB_REPO_NAME="dummy"\n')
            f.write('LOG_LEVEL="DEBUG"\n')
            f.write('WORKSHOPS_BASE_DIR="../public/data/workshops_compile_test"\n')
            f.write('COMPILER_AGENT_PROMPT_PATH="workshop_compiler_agent_prompt.md"\n') # Ensure this exists

    # Create dummy compiler prompt if it doesn't exist
    dummy_prompt_path = os.path.join(os.path.dirname(__file__), '..', "workshop_compiler_agent_prompt.md")
    if not os.path.exists(dummy_prompt_path):
        print(f"Creating dummy compiler prompt at {dummy_prompt_path}")
        with open(dummy_prompt_path, "w") as f_prompt:
            f_prompt.write("This is a dummy {{SUBJECT}} prompt for {{INPUT_FILE_PATHS}}.")

    try:
        logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        config = AppConfig()

        # Resolve workshops_base_dir for this test
        if not os.path.isabs(config.workshops_base_dir):
            script_dir = os.path.dirname(os.path.abspath(__file__)) # agents dir
            config.workshops_base_dir = os.path.join(script_dir, '..', config.workshops_base_dir)
            config.workshops_base_dir = os.path.normpath(config.workshops_base_dir)
        
        # Create the test workshops base dir if it doesn't exist
        os.makedirs(config.workshops_base_dir, exist_ok=True)
        print(f"Using test workshops base directory for compile: {config.workshops_base_dir}")

        # Dummy research data paths
        dummy_research_files = [
            os.path.join(os.path.dirname(__file__), '..', "dummy_research1.txt"),
            os.path.join(os.path.dirname(__file__), '..', "dummy_research2.txt")
        ]
        for drf in dummy_research_files:
            with open(drf, "w") as f_dummy: f_dummy.write("Dummy research content.")


        agent = CompilerAgent(config)
        module_output_path = agent.compile_workshop("Test Compile Topic", dummy_research_files)
        print(f"CompilerAgent test created module at: {module_output_path}")
        
        if os.path.exists(module_output_path):
            print(f"Contents of {module_output_path}: {os.listdir(module_output_path)}")
        else:
            print(f"Error: Module path {module_output_path} was not created.")
            
        print("CompilerAgent test completed.")

    except CompilerAgentError as cae:
        print(f"CompilerAgent Error: {cae}")
    except ValueError as ve: # For AppConfig issues
        print(f"Configuration Error: {ve}")
    except Exception as e:
        print(f"CompilerAgent test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up dummy .env, prompt, research files, and test workshops dir
        dummy_env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        if "dummy_openai_key_for_test" in open(dummy_env_path).read():
             os.remove(dummy_env_path)
             print("Removed dummy .env used for CompilerAgent test.")
        
        if "dummy {{SUBJECT}} prompt" in open(dummy_prompt_path).read():
            os.remove(dummy_prompt_path)
            print(f"Removed dummy compiler prompt: {dummy_prompt_path}")

        for drf in dummy_research_files:
            if os.path.exists(drf): os.remove(drf)
        print("Removed dummy research files.")

        test_compile_workshops_dir = config.workshops_base_dir # It was resolved
        if os.path.exists(test_compile_workshops_dir) and "workshops_compile_test" in test_compile_workshops_dir:
            shutil.rmtree(test_compile_workshops_dir)
            print(f"Cleaned up test compile workshops directory: {test_compile_workshops_dir}")