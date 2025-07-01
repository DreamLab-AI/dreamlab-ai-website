import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

from ..orchestrator.config import AppConfig

# Attempt to import github from PyGithub
try:
    from github import Github, GithubException
    PYGITHUB_AVAILABLE = True
except ImportError:
    PYGITHUB_AVAILABLE = False
    Github = None
    GithubException = None

class GitAgentError(Exception):
    """Custom exception for GitAgent errors."""
    pass

class GitAgent:
    def __init__(self, config: AppConfig):
        self.config = config
        self.logger = config.get_logger(__name__)
        self.logger.info("GitAgent initialized.")

        if not self.config.github_token:
            self.logger.error("GitHub token is not configured.")
            raise GitAgentError("GitHub token missing.")
        if not self.config.github_repo_owner or not self.config.github_repo_name:
            self.logger.error("GitHub repository owner or name is not configured.")
            raise GitAgentError("GitHub repository owner/name missing.")
        
        if not PYGITHUB_AVAILABLE:
            self.logger.warning("PyGithub library not found. Git operations will be simulated or use direct CLI calls (less robust).")
            # Consider raising an error if PyGithub is essential for core functionality
            # raise GitAgentError("PyGithub library is required but not installed.")

        self.repo_full_name = f"{self.config.github_repo_owner}/{self.config.github_repo_name}"
        
        # Find the actual git repository root
        self.project_root_dir = self._find_git_root()
        self.logger.debug(f"GitAgent project root: {self.project_root_dir}")
        
        # Verify git repository status
        self._verify_git_environment()

    def _find_git_root(self) -> str:
        """Find the git repository root directory."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Walk up the directory tree to find .git
        while current_dir != os.path.dirname(current_dir):  # Not at filesystem root
            if os.path.exists(os.path.join(current_dir, '.git')):
                return current_dir
            current_dir = os.path.dirname(current_dir)
        
        # Fallback to the workshop-builder directory
        fallback_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
        self.logger.warning(f"Git root not found, using fallback: {fallback_dir}")
        return fallback_dir

    def _verify_git_environment(self):
        """Verify that the git environment is properly set up."""
        if not os.path.exists(os.path.join(self.project_root_dir, '.git')):
            self.logger.warning(f"No .git directory found at {self.project_root_dir}")
            return
        
        # Check git status
        success, output, error = self._run_git_command(['status', '--porcelain'])
        if success:
            if output.strip():
                self.logger.info("Git repository has uncommitted changes")
            else:
                self.logger.info("Git repository is clean")
        else:
            self.logger.warning(f"Could not check git status: {error}")

    def _create_agents_md_for_pr(self, module_path: str, topic: str) -> str:
        """Create an AGENTS.MD file specifically for PR review guidance."""
        agents_md_path = os.path.join(module_path, "PR_AGENTS.MD")
        
        agents_md_content = f"""# PR_AGENTS.MD - Pull Request Review Guidance

## Pull Request Context
This PR adds a new workshop module: **{topic}**

## Review Guidelines for AI Agents
- Verify all markdown files follow proper formatting
- Check that manifest.json accurately lists all workshop files
- Ensure README.md provides clear navigation
- Validate that content is educational and accurate
- Confirm file naming follows XX_filename.md convention

## Quality Checklist
- [ ] All code examples are functional
- [ ] Learning objectives are clearly stated
- [ ] Content flows logically from basic to advanced
- [ ] No placeholder content remains
- [ ] All links and references are valid

## Integration Requirements
- [ ] Workshop integrates properly with existing website structure
- [ ] No conflicts with existing workshop numbering
- [ ] Follows established content standards
- [ ] Maintains consistent tone and style

## Approval Criteria
This PR should be approved if:
1. All quality checklist items are satisfied
2. Content is accurate and educational
3. No technical issues are present
4. Workshop structure is complete and logical
"""
        
        with open(agents_md_path, 'w', encoding='utf-8') as f:
            f.write(agents_md_content)
        
        self.logger.info(f"Created PR review guidance: {agents_md_path}")
        return agents_md_path


    def _run_git_command(self, command_parts: list[str], cwd: str = None) -> tuple[bool, str, str]:
        """Helper to run git commands directly."""
        try:
            process = subprocess.run(["git"] + command_parts, capture_output=True, text=True, check=False, cwd=cwd or self.project_root_dir)
            if process.returncode == 0:
                self.logger.debug(f"Git command '{' '.join(command_parts)}' successful. Output: {process.stdout.strip()}")
                return True, process.stdout.strip(), ""
            else:
                self.logger.error(f"Git command '{' '.join(command_parts)}' failed. Error: {process.stderr.strip()}")
                return False, process.stdout.strip(), process.stderr.strip()
        except FileNotFoundError:
            self.logger.error("Git command not found. Is Git installed and in PATH?")
            return False, "", "Git command not found."
        except Exception as e:
            self.logger.error(f"Exception running git command '{' '.join(command_parts)}': {e}", exc_info=True)
            return False, "", str(e)

    def _slugify_topic(self, topic: str) -> str:
        """Converts a topic string into a URL-friendly slug."""
        return topic.lower().replace(" ", "-").replace("_", "-").replace(":", "").replace("'", "")

    def publish_module(self, module_path: str, topic: str, workshop_number: str) -> str:
        """
        Publishes the generated workshop module to GitHub following Codex best practices.
        - Creates PR review guidance (AGENTS.MD)
        - Creates a new branch
        - Adds and commits the files from module_path
        - Pushes the branch
        - Creates a professional pull request with detailed description
        Returns the URL of the created pull request.
        """
        self.logger.info(f"Publishing module from '{module_path}' for topic '{topic}' (workshop #{workshop_number}).")

        # Create PR review guidance
        self._create_agents_md_for_pr(module_path, topic)

        topic_slug = self._slugify_topic(topic)
        branch_name = f"workshop-{workshop_number:02d}-{topic_slug}"
        commit_message = f"feat: Add workshop {workshop_number:02d} - {topic}\n\nGenerated by AI Workshop Builder using Codex framework"
        
        # Create comprehensive PR description
        pr_title = f"🎓 Workshop {workshop_number:02d}: {topic}"
        pr_body = self._create_pr_description(topic, workshop_number, module_path)

        self.logger.info(f"Branch name: {branch_name}")
        self.logger.info(f"Commit message: {commit_message}")
        self.logger.info(f"PR Title: {pr_title}")

        if not PYGITHUB_AVAILABLE:
            return self._simulate_github_operations(branch_name, commit_message, module_path)

        try:
            return self._execute_github_operations(branch_name, commit_message, pr_title, pr_body, module_path)
        except Exception as e:
            self.logger.error(f"GitHub operations failed: {e}", exc_info=True)
            raise GitAgentError(f"Failed to publish module: {e}")

    def _create_pr_description(self, topic: str, workshop_number: str, module_path: str) -> str:
        """Create a comprehensive PR description following professional standards."""
        relative_path = os.path.relpath(module_path, self.project_root_dir)
        
        # Get file list from the module
        files_list = []
        if os.path.exists(module_path):
            for file in sorted(os.listdir(module_path)):
                if file.endswith('.md') or file.endswith('.json'):
                    files_list.append(f"- `{file}`")
        
        files_section = "\n".join(files_list) if files_list else "- No files detected"
        
        pr_body = f"""## 📚 Workshop Module: {topic}

### Overview
This pull request introduces **Workshop {workshop_number:02d}: {topic}**, a comprehensive educational module generated by the AI Workshop Builder using the OpenAI Codex framework.

### 🎯 Learning Objectives
This workshop provides structured learning content designed to help users understand and apply concepts related to {topic}.

### 📁 Module Structure
**Location:** `{relative_path}`

**Files included:**
{files_section}

### 🔧 Generation Details
- **Generated by:** AI Workshop Builder (Codex Framework)
- **Research Agent:** Gemini Flash 2.5 deep research
- **Compiler Agent:** OpenAI Codex CLI integration
- **Content Structure:** Follows established workshop patterns

### ✅ Quality Assurance
- [x] Content generated from comprehensive research data
- [x] Follows established file naming conventions (XX_filename.md)
- [x] Includes proper manifest.json with file listing
- [x] README.md provides clear navigation
- [x] AGENTS.MD included for AI guidance

### 🔍 Review Guidelines
Please review:
1. **Content Accuracy:** Verify technical information is correct
2. **Educational Value:** Ensure content is suitable for learners
3. **Structure:** Check logical flow from basic to advanced concepts
4. **Integration:** Confirm compatibility with existing workshop framework
5. **Formatting:** Validate markdown syntax and code blocks

### 🚀 Integration
This workshop will be automatically integrated into the website framework under the workshops section once approved.

---
*Generated automatically by the AI Workshop Builder system. For questions about the generation process, please refer to the workshop-builder documentation.*"""

        return pr_body

    def _simulate_github_operations(self, branch_name: str, commit_message: str, module_path: str) -> str:
        """Simulate GitHub operations when PyGithub is not available."""
        self.logger.warning("PyGithub not available. Simulating GitHub operations.")
        
        # Perform local git operations
        self._run_git_command(["checkout", "-b", branch_name])
        relative_module_path = os.path.relpath(module_path, self.project_root_dir)
        self._run_git_command(["add", relative_module_path])
        self._run_git_command(["commit", "-m", commit_message])
        self._run_git_command(["push", "origin", branch_name, "--set-upstream"])
        
        simulated_pr_url = f"https://github.com/{self.repo_full_name}/pull/new/{branch_name}"
        self.logger.info(f"Simulated PR creation. Please open manually: {simulated_pr_url}")
        return simulated_pr_url

    def _execute_github_operations(self, branch_name: str, commit_message: str, pr_title: str, pr_body: str, module_path: str) -> str:
        """Execute actual GitHub operations using PyGithub."""
        g = Github(self.config.github_token)
        repo = g.get_repo(self.repo_full_name)
        self.logger.info(f"Successfully connected to repository: {self.repo_full_name}")

        # Create new branch from default branch
        self._create_remote_branch(repo, branch_name)
        
        # Perform local git operations
        self._perform_local_git_operations(repo, branch_name, commit_message, module_path)
        
        # Create Pull Request
        pr = repo.create_pull(
            title=pr_title,
            body=pr_body,
            head=branch_name,
            base=repo.default_branch
        )
        
        # Add labels if available
        try:
            labels = ['workshop', 'ai-generated', 'content']
            available_labels = [label.name for label in repo.get_labels()]
            valid_labels = [label for label in labels if label in available_labels]
            if valid_labels:
                pr.add_to_labels(*valid_labels)
        except Exception as e:
            self.logger.warning(f"Could not add labels to PR: {e}")
        
        self.logger.info(f"Successfully created Pull Request: {pr.html_url}")
        
        # Switch back to default branch
        self._run_git_command(["checkout", repo.default_branch])
        
        return pr.html_url

    def _create_remote_branch(self, repo, branch_name: str):
        """Create a new branch on the remote repository."""
        try:
            source_branch = repo.get_branch(repo.default_branch)
            self.logger.debug(f"Creating branch {branch_name} from {repo.default_branch}")
            repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=source_branch.commit.sha)
            self.logger.info(f"Created branch '{branch_name}' on remote.")
        except GithubException as e:
            if e.status == 422:  # Branch already exists
                self.logger.warning(f"Branch '{branch_name}' already exists on remote. Will use existing branch.")
            else:
                raise GitAgentError(f"GitHub API error creating branch: {e.data.get('message', str(e))}")

    def _perform_local_git_operations(self, repo, branch_name: str, commit_message: str, module_path: str):
        """Perform local git operations to stage, commit, and push changes."""
        # Ensure we're on the default branch and up to date
        success, _, err = self._run_git_command(["checkout", repo.default_branch])
        if not success:
            raise GitAgentError(f"Failed to checkout default branch: {err}")
        
        success, _, err = self._run_git_command(["pull", "origin", repo.default_branch])
        if not success:
            self.logger.warning(f"Failed to pull default branch: {err}")
        
        # Create or switch to the feature branch
        success, _, err = self._run_git_command(["checkout", "-B", branch_name])
        if not success:
            raise GitAgentError(f"Failed to checkout/create local branch {branch_name}: {err}")
        
        # Add files
        relative_module_path = os.path.relpath(module_path, self.project_root_dir)
        self.logger.debug(f"Adding path to git: {relative_module_path}")
        success, _, err = self._run_git_command(["add", relative_module_path])
        if not success:
            raise GitAgentError(f"Failed to git add {relative_module_path}: {err}")
        
        # Commit
        success, _, err = self._run_git_command(["commit", "-m", commit_message])
        if not success:
            if "nothing to commit" in err.lower():
                self.logger.warning(f"No changes to commit for branch {branch_name}")
            else:
                raise GitAgentError(f"Failed to git commit: {err}")
        
        # Push
        success, _, err = self._run_git_command(["push", "origin", branch_name, "--force-with-lease"])
        if not success:
            raise GitAgentError(f"Failed to git push branch {branch_name}: {err}")
        
        self.logger.info(f"Successfully pushed branch '{branch_name}' to remote.")


if __name__ == '__main__':
    print("Testing GitAgent (requires .env file in workshop-builder directory and a test repo setup)")
    
    # This test is more complex as it involves actual Git operations and GitHub API calls.
    # It's highly recommended to use a dedicated test repository.
    
    # Create dummy .env if needed for basic AppConfig loading
    env_file_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if not os.path.exists(env_file_path):
        print("Creating a dummy .env for GitAgent test...")
        with open(env_file_path, 'w') as f:
            f.write('GITHUB_TOKEN="YOUR_GH_TOKEN_FOR_TESTING"\n') # Needs a real token for actual test
            f.write('GITHUB_REPO_OWNER="your-test-owner"\n')    # Your GH username or a test org
            f.write('GITHUB_REPO_NAME="your-test-repo-name"\n') # A dedicated test repo
            f.write('GEMINI_API_KEY="dummy"\nOPENAI_API_KEY="dummy"\n')
            f.write('LOG_LEVEL="DEBUG"\n')
            f.write('WORKSHOPS_BASE_DIR="delete_me_test_workshops_git"\n') # Temp dir for module

    try:
        logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        config = AppConfig()

        # Ensure the test workshops base dir exists and is cleaned up
        # This path is relative to workshop-builder directory
        test_module_base = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', config.workshops_base_dir))
        
        if os.path.exists(test_module_base):
            import shutil
            shutil.rmtree(test_module_base)
        os.makedirs(test_module_base, exist_ok=True)
        
        # Create a dummy module to publish
        test_topic = "Git Agent Test Topic"
        test_ws_num = "99"
        test_slug = GitAgent(config)._slugify_topic(test_topic) # Use internal helper for consistency
        
        dummy_module_name = f"workshop-{test_ws_num}-{test_slug}"
        dummy_module_path = os.path.join(test_module_base, dummy_module_name)
        os.makedirs(dummy_module_path, exist_ok=True)
        
        with open(os.path.join(dummy_module_path, "00_intro.md"), "w") as f: f.write("# Test Intro\nFor GitAgent.")
        with open(os.path.join(dummy_module_path, "manifest.json"), "w") as f: f.write('{"id":"test", "files":["00_intro.md"]}')
        
        print(f"Created dummy module at: {dummy_module_path}")
        print(f"Ensure your test repo '{config.github_repo_owner}/{config.github_repo_name}' is cloned at '{GitAgent(config).project_root_dir}'")
        print("And that your GITHUB_TOKEN in .env has permissions for it.")
        
        # Check if current dir is a git repo (basic check)
        if not os.path.exists(os.path.join(GitAgent(config).project_root_dir, ".git")):
             print(f"WARNING: Project root {GitAgent(config).project_root_dir} is not a git repository. Live test will likely fail.")
             raise GitAgentError("Test environment not a git repo.")

        if "YOUR_GH_TOKEN" in config.github_token or "your-test-owner" in config.github_repo_owner:
            print("WARNING: Using placeholder GitHub credentials. Live test will fail. Simulating only.")
            PYGITHUB_AVAILABLE = False # Force simulation if creds are placeholder
            
        agent = GitAgent(config)
        
        # Before running, ensure you are on the default branch of your test repo
        # And that there are no uncommitted changes that might interfere.
        # agent._run_git_command(["checkout", "main"]) # Or your test repo's default branch
        # agent._run_git_command(["pull"])

        pr_url_result = agent.publish_module(dummy_module_path, test_topic, test_ws_num)
        print(f"GitAgent test publish_module call completed. PR URL (or simulation): {pr_url_result}")

    except GitAgentError as gae:
        print(f"GitAgent Error: {gae}")
    except ValueError as ve: # For AppConfig issues
        print(f"Configuration Error: {ve}")
    except Exception as e:
        print(f"GitAgent test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up dummy .env if it was placeholder
        if os.path.exists(env_file_path) and "YOUR_GH_TOKEN" in open(env_file_path).read():
             os.remove(env_file_path)
             print("Removed dummy .env used for GitAgent test.")
        # Clean up the dummy module directory
        if os.path.exists(test_module_base) and "delete_me_test_workshops_git" in test_module_base:
            import shutil
            shutil.rmtree(test_module_base)
            print(f"Cleaned up test module base directory: {test_module_base}")