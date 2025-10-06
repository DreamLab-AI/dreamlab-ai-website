# Chapter 2c: Setting up a Google Cloud API Key for AI

To utilise AI-powered features in [Roo Code](./06_ai_workflows_roo_code.md) and similar tools, you will need an API key from a cloud provider. This chapter guides you through obtaining a free API key from [Google Cloud Platform (GCP)](https://cloud.google.com/) to access Google's Gemini AI models.

## 2c.1 Google Cloud Free Tier & Credits Overview

- **Free Credits:** New Google Cloud users typically receive substantial free credits (e.g., $300 for 90 days). These credits allow experimentation without immediate cost.
- **Payment Information:** Google requires credit card details to activate your account and credits. Be cautious, as exceeding free-tier limits or misconfiguring services can incur charges.
- **Rate Limiting:** Later, we will configure Roo Code with a rate limit to minimise the risk of incurring charges.

## 2c.2 Steps to Obtain Your Google Cloud API Key (approx. 10-20 mins)

Follow these steps carefully to obtain your API key:

1. **Sign in to Google Cloud Console:**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/).
   - Sign in with your Google account or create one if necessary.
   - Activate your free trial and provide payment details if prompted.

2. **Create or Select a Project:**
   - Google Cloud organises resources into "projects."
   - Create a new project or select an existing one from the project selector at the top of the page.
   - Provide a meaningful project name (e.g., "AI Experiments") and click "CREATE."

3. **Navigate to API Credentials:**
   - Open the main navigation menu (☰).
   - Select "APIs & Services" > "Credentials."

4. **Create an API Key:**
   - Click "+ CREATE CREDENTIALS" and select "API key."
   - Copy the generated API key immediately and store it securely.

5. **Enable the Gemini API:**
   - Navigate to "APIs & Services" > "Library."
   - Search for "Gemini API" and select it from the results.
   - Click "ENABLE" to activate the API.

6. **Restrict Your API Key (Recommended):**
   - Return to "Credentials" and edit your API key.
   - Under "API restrictions," select "Restrict key" and choose "Gemini API."
   - Optionally, set application restrictions for additional security.
   - Click "SAVE."

Your Google Cloud API key is now configured securely and ready for use with Roo Code in VS Code. Keep this key confidential.

---

Next: [Chapter 2d: Configuring Roo Code in VS Code](./02_d_roo_code_config.md)