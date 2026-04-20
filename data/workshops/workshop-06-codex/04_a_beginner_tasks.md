# 4.a: Beginner Tasks

These tasks are ideal for users new to Codex, showcasing its ability to handle straightforward requests efficiently. They demonstrate core functionalities like text manipulation, code understanding, and basic generation.

## Quick Fixes and Typos

Codex can efficiently correct simple errors in code or documentation. This was even humorously suggested as an onboarding task during the workshop:
> "Listen it would be funny if I had a typo as I type this prompt out and uh just make it a little bit meta." - T&I (workshop host, referring to a typo fix task)

**Walkthrough (Cloud Agent):**

1.  **Connect Repository:** Connect the relevant GitHub repository to the Codex cloud agent in ChatGPT.
2.  **Provide Prompt:**
    ```
    In the README.md file, there's a typo in the installation section. The command `pip instll mypackage` should be `pip install mypackage`. Please fix this and propose a PR.
    ```
3.  **Codex Action:** Codex will locate the `README.md` file, make the correction.
4.  **Review and PR:** It will present a diff of the change. Review it, and if correct, instruct Codex to open a pull request.

**Walkthrough (CLI):**

1.  **Navigate to Directory:** Open your terminal and navigate to the project directory containing the file with the typo.
2.  **Provide Prompt:**
    ```bash
    codex "In docs/setup.md, find the sentence 'Refer to the instalation guide' and change 'instalation' to 'installation'. Apply the change directly." --approval-mode auto-edit
    ```
    *AI Note: Assuming `auto-edit` is a valid CLI approval mode or similar for direct application. Refer to actual CLI documentation for exact commands.*
3.  **Codex Action & Review:** Codex will attempt to find and replace the text. You would then verify the change locally.

## Code Explanation

Codex can help users understand unfamiliar code segments, from complex regular expressions to entire functions.

**Walkthrough (CLI - Explaining Regex):**

1.  **Command:**
    ```bash
    codex "Explain what this regex does: ^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).{8,}$"
    ```
2.  **Codex Output:** Codex will output a human-readable explanation of the regex components (e.g., "requires at least one uppercase letter, one lowercase letter, one digit, and be at least 8 characters long") and its overall function (password validation).

**Walkthrough (Cloud Agent - Explaining a Function):**

1.  **Connect Repository & Select File:** Connect your repository and ensure Codex has access to the relevant file (e.g., `utils/parser.py`).
2.  **Provide Prompt:**
    ```
    Explain the purpose and logic of the `process_user_data` function in `utils/parser.py`. What are its inputs and expected outputs? Describe its control flow.
    ```
3.  **Codex Action:** Codex will analyze the function and provide a textual explanation, potentially including:
    *   A summary of its purpose.
    *   Details on parameters and return values.
    *   A step-by-step breakdown of its logic.

## Boilerplate Generation

Codex can generate initial code structures for common tasks, saving setup time and reducing repetitive coding.

**Walkthrough (Cloud Agent or CLI - Python Flask Route):**

1.  **Prompt:**
    ```
    Generate a Python Flask route for a simple API endpoint `/api/v1/status` that returns a JSON object `{'status': 'ok', 'version': '1.0.0'}`. Include necessary imports.
    ```
2.  **Codex Output (Example):**
    ```python
    from flask import Flask, jsonify

    app = Flask(__name__)

    @app.route('/api/v1/status', methods=['GET'])
    def get_status():
        response = {
            'status': 'ok',
            'version': '1.0.0'
        }
        return jsonify(response)

    if __name__ == '__main__':
        app.run(debug=True)
    ```
    *   **Cloud Agent:** Might create a new file (e.g., `app.py`) in the connected repository or suggest adding it to an existing one.
    *   **CLI:** Would typically print this code to the console, which you can then copy into a file. You could also direct it to write to a new file: `codex "Generate a Python Flask..." > app.py`.

These beginner tasks demonstrate how Codex can be a valuable assistant for everyday coding activities, handling small corrections, providing clarity on existing code, and jumpstarting new development with boilerplate.

---

Next: [4.b: Intermediate Tasks](./04_b_intermediate_tasks.md)