# 2.a: Accessing the Codex Cloud Agent

The Codex cloud agent is integrated into the ChatGPT platform and is progressively being rolled out to users. Accessing it involves a few key steps.

## Prerequisites

*   **ChatGPT Access:** Access to the Codex cloud agent is typically available for ChatGPT Pro, Team, and Enterprise users. OpenAI has mentioned plans for broader availability, including Plus and Edu users, in the future.
*   **GitHub Account:** A GitHub account is necessary for enabling Codex to interact with your repositories.

## Step-by-Step Setup

1.  **Locate Codex in ChatGPT:**
    *   Log in to ChatGPT.
    *   Find the "Codex (beta)" icon in the left navigation sidebar. Clicking this opens the agent dashboard.
    *   As noted in the workshop, this is the primary interface for the cloud agent.

2.  **Multi-Factor Authentication (MFA):**
    *   For security, a one-time MFA setup is required.
    *   You will be prompted to scan a QR code with an authenticator app (e.g., Google Authenticator, Authy).
    *   Verify with the generated code from your authenticator app.

3.  **Connect GitHub:**
    *   Authorize Codex to access your GitHub repositories via OAuth.
    *   This connection allows Codex to read from and write to your specified repositories.
    *   You can restrict access to particular organisations or personal projects.

4.  **Select Repository and Branch:**
    *   Choose the specific project (repository) and branch that Codex will work on.
    *   The agent then clones this branch into its isolated sandbox environment in the cloud.

5.  **Configure Environment (Optional):**
    *   Users can customise the execution environment by adding environment variables, secrets, or setup scripts. This is similar to configuring a Continuous Integration (CI) job.
    *   While common tools like linters and formatters are often pre-installed, specific versions can be overridden if needed.
    *   The workshop discussion highlighted the importance of this environment:
        > "what you can do today right is as a human um set up an environment set up scripts that get run these scripts typically will be installing dependencies i expect that to be maybe 95% of the use case there uh and just really get all the right binaries in place for your agent to use" - Josh, OpenAI

Once these steps are completed, you can begin assigning tasks to the Codex cloud agent through natural language prompts directly within the ChatGPT interface.

---

Next: [2.b: Setting Up the Codex CLI](./02_b_setting_up_the_codex_cli.md)