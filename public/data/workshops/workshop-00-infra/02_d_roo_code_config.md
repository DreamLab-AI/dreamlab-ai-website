# Chapter 2d: Configuring Roo Code in VS Code

With your Google Cloud API key ready, the next step is to configure the [Roo Code](https://marketplace.visualstudio.com/items?itemName=RooAI.roo-code) extension in VS Code. This setup enables AI-powered assistance directly within your editor.

## 2d.1 Accessing Roo Code Settings

1. **Open Roo Code in VS Code:**
   - Click the Roo Code icon (typically a kangaroo) in the VS Code Activity Bar to open the Roo Code panel.

2. **Locate the Settings:**
   - Within the Roo Code panel, find and click the settings icon (usually a cogwheel ⚙️).

## 2d.2 Configuring a Profile for Google Gemini

Roo Code uses profiles to manage different AI configurations. Follow these steps to configure your profile:

1. **Profile Name (Optional):**
   - Name your profile clearly, e.g., "Gemini Pro Rate Limited."

2. **Select API Provider:**
   - Choose "Google Gemini" from the available providers.

3. **Enter Your API Key:**
   - Paste the Google Cloud API key obtained in [Chapter 2c](./02_c_gcp_api_key.md).

4. **Select AI Model:**
   - Choose the most capable Gemini model available with a sufficient free to use tier (e.g., "Gemini 2.0 Flash Experimental" or "Gemini 2.0 Flash").

5. **Set Rate Limit (Recommended):**
   - Set the rate limit to 15 seconds to minimise costs and remain within free usage limits (Gemini 2.0 Flash has higher rate limits than previous versions).
   - You can find the rate limits online. This is super important in order not to incur significant costs. [Check this frequently](https://ai.google.dev/gemini-api/docs/rate-limits).

6. **Save Configuration:**
   - Click "Save" or "Apply" to store your settings.

## 2d.3 Understanding Roo Code Modes

Roo Code offers different operational modes:

- **Ask Mode:** Provides explanations and answers without modifying files.
- **Code Mode:** Generates or modifies code and project files directly.
- **Architect Mode:** Useful for documentation and planning tasks.

For most coding tasks, use **Code Mode**.

## 2d.4 Auto-Approve Settings

Adjust Roo Code's permissions to allow file operations:

- Ensure "Read" and "Write" permissions are enabled if you want Roo Code to read context and write files directly.

## Testing Your Setup

Verify your configuration by typing a simple prompt into Roo Code, such as "Explain Git in simple terms." A successful response indicates correct setup. If errors occur, double-check your API key, Gemini API activation, and model selection.

Your VS Code environment is now enhanced with powerful AI capabilities.

---

Next: [Chapter 3: The Core Git Workflow](./03_core_workflow.md)
