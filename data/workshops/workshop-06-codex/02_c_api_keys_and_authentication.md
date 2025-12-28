# 2.c: API Keys and Authentication

Secure and correct authentication is fundamental for using any OpenAI service, including the Codex tools that rely on API access (primarily the CLI, as the Cloud Agent handles authentication through your ChatGPT session).

## Obtaining OpenAI API Keys

*   **OpenAI Platform:** API keys are generated and managed through your organisation's settings on the [OpenAI platform](https://platform.openai.com).
*   You will typically find an "API keys" section in your account settings where you can create new secret keys.

## Secure Handling of API Keys

API keys are confidential and should be treated with the same level of security as passwords.
**Crucial Security Practices:**

*   **Never Share Publicly:** Do not share your API keys in public forums, version control systems (like Git), or client-side code (e.g., JavaScript running in a browser, mobile app code).
*   **Environment Variables:** The standard and recommended practice is to load API keys from environment variables on your local machine or server-side. This keeps them out of your codebase. (See [Setting Up the Codex CLI](./02_b_setting_up_the_codex_cli.md) for how to do this).
*   **Secure Key Management:** For applications deployed to production, use a secure key management service provided by your cloud provider (e.g., AWS Secrets Manager, Google Secret Manager, Azure Key Vault).
*   **Restrict Key Permissions (If Possible):** While not always granularly available for all API key types, if your provider allows, restrict the permissions associated with an API key to only what is necessary for its intended use.
*   **Rotate Keys Regularly:** Periodically generate new API keys and decommission old ones, especially if you suspect a key might have been compromised.

## Authentication Method (for Direct API Calls)

While the Codex CLI handles authentication for you once the API key is set up, if you were to make direct API calls to OpenAI (e.g., when building custom tools), the OpenAI API uses **Bearer Authentication**.

The API key is provided in the `Authorization` header of HTTP requests:

```
Authorization: Bearer YOUR_OPENAI_API_KEY
```

Replace `YOUR_OPENAI_API_KEY` with your actual secret key.

## Organisation and Project IDs (for API Requests)

For users belonging to multiple organisations or projects within the OpenAI platform, you can specify which organisation/project API usage should be attributed to. This is done by including specific headers in your API requests:

*   `OpenAI-Organization: YOUR_ORG_ID`
*   `OpenAI-Project: YOUR_PROJECT_ID`

**Where to find these IDs:**

*   **Organisation IDs (`YOUR_ORG_ID`):** Found in your organisation settings on the OpenAI platform.
*   **Project IDs (`YOUR_PROJECT_ID`):** Found on the general settings page for a selected project on the OpenAI platform.

Using these headers ensures that API usage is correctly tracked and billed to the intended entity. The Codex CLI might handle some of this automatically based on your default settings or if configured, but it's good to be aware of if you're managing multiple contexts.

By following these setup and authentication procedures, you can securely access and begin utilising the powerful features offered by OpenAI's models, whether through the Codex tools or direct API integration.

---

Next: [Chapter 3: Mastering Codex](./03_mastering_codex.md)