# 4.b: Intermediate Tasks

These examples involve more complex interactions and demonstrate the problem-solving abilities of AI coding agents, including debugging, refactoring, and test generation.

## Bug Fixing with Stack Traces

Providing a stack trace allows AI coding agents to pinpoint and often fix bugs. These tools have demonstrated the ability to address issues in libraries like Astropy, Matplotlib, and Django.

**Walkthrough (Codex CLI or Claude Code):**

1.  **Scenario:** A Python application (`data_processor.py`) throws an error, producing a stack trace indicating a `TypeError` when trying to concatenate a string with an integer.
2.  **Open your project:** Navigate to the application's repository in your terminal.
3.  **Provide Prompt:**
    ```
    My application is crashing in `data_processor.py`. Find and fix the bug based on the following stack trace. Also, add a unit test using the `unittest` module to cover this specific case and prevent regressions.

    Stack Trace:
    Traceback (most recent call last):
      File "data_processor.py", line 25, in process_record
        summary = "Record ID: " + record_id + " Value: " + record_value # record_id is int, record_value is str
    TypeError: can only concatenate str (not "int") to str
    ```
4.  **Agent Action:**
    *   Analyses the trace and identifies the problematic line in `data_processor.py`.
    *   Proposes a fix, likely by converting `record_id` to a string: `summary = "Record ID: " + str(record_id) + " Value: " + record_value`.
    *   Generates a relevant test case, for example:
        ```python
        import unittest
        from data_processor import process_record # Assuming process_record is importable

        class TestDataProcessor(unittest.TestCase):
            def test_process_record_string_concatenation(self):
                # Assuming process_record takes a dict and returns the summary string
                test_data = {'id': 123, 'value': 'SampleData'}
                expected_summary = "Record ID: 123 Value: SampleData" 
                # This needs to match how process_record actually works
                # For this example, let's assume process_record is modified to be testable:
                # def process_record(record_data):
                #     record_id = record_data['id']
                #     record_value = record_data['value']
                #     summary = "Record ID: " + str(record_id) + " Value: " + record_value
                #     return summary
                self.assertEqual(process_record(test_data), expected_summary)

        if __name__ == '__main__':
            unittest.main()
        ```
        *AI Note: The exact test structure depends on how `process_record` is defined and what it returns. The agent would aim to create a functional test.*
5.  **Review and Iterate:** Review the proposed code changes (diff for `data_processor.py` and the new test file/additions). Check the agent's reasoning. If necessary, provide feedback for refinement (e.g., "Ensure the test uses a mock object for external dependencies if `process_record` has them"). Then, approve the PR.

## Component Refactoring

AI coding agents can assist in modernising code, applying design principles, or converting between coding styles.

**Walkthrough (Codex CLI or Claude Code — JavaScript Modernisation):**

1.  **Provide Legacy JavaScript Function:**
    ```javascript
    // Old function in file: legacy_utils.js
    function calculatePrice(items, discount) {
      var total = 0;
      for (var i = 0; i < items.length; i++) {
        if (items[i] && typeof items[i].price === 'number') { // Added a check for robustness
            total += items[i].price;
        }
      }
      if (discount && typeof discount === 'number' && discount > 0 && discount < 1) { // Added discount validation
        total = total - (total * discount);
      }
      return total;
    }
    ```
2.  **First Prompt (Modernisation):**
    ```
    Refactor the `calculatePrice` function in `legacy_utils.js` to modern ES6+ standards. Use `const`/`let`, arrow functions where appropriate, a `for...of` loop for iterating `items`, and ensure robust calculation of the discounted total. Add basic validation for item prices and the discount value.
    ```
3.  **Agent Provides Refactored Version (Example):**
    ```javascript
    // refactored_utils.js
    const calculatePrice = (items, discount) => {
      let total = 0;
      if (!Array.isArray(items)) {
        console.error("Items must be an array.");
        return 0; // Or throw an error
      }
      for (const item of items) {
        if (item && typeof item.price === 'number' && !isNaN(item.price)) {
          total += item.price;
        }
      }
      if (discount && typeof discount === 'number' && discount > 0 && discount < 1) {
        total *= (1 - discount);
      } else if (discount) {
        console.warn("Invalid discount value. Discount not applied.");
      }
      return total;
    };
    ```
4.  **Second Prompt (Review for Errors/Edge Cases - demonstrating multi-prompt approach):**
    ```
    Review the ES6 version of `calculatePrice` you just provided.
    - Are there any potential logical errors or unhandled edge cases (e.g., empty `items` array, items without a `price` property, negative prices, discount exactly 0 or 1)?
    - How would it handle non-numeric prices if the check wasn't there?
    - Suggest how to make it even more robust, perhaps by returning an error object or throwing an exception for invalid inputs.
    ```
5.  **Agent Provides Feedback:** The agent would analyse its previous output and provide suggestions, which can then be used for further refinement or a new refactoring request.

## Adding Unit Tests

AI coding agents can generate unit tests for existing code or newly implemented features. This is a powerful way to improve code quality and maintainability.

**Walkthrough (CLI - Jest Tests for TypeScript Utility):**

1.  **Identify File:** You have a utility file, for example, `src/utils/dateFormatter.ts`, containing several exported functions for date manipulation.
2.  **Prompt the agent:**
    ```bash
    codex "Write unit tests using Jest for all exported functions in `src/utils/dateFormatter.ts`. Ensure both success cases (valid inputs) and failure/edge cases (e.g., invalid date strings, null inputs, leap years if relevant) are covered. Mock any external dependencies like `Date.now()` if used, to ensure deterministic tests. Place the tests in `src/utils/__tests__/dateFormatter.test.ts`."
    ```
    With Claude Code, you would provide a similar prompt within an interactive session, and it would create the test file directly.
3.  **Agent Action:**
    *   Analyses `src/utils/dateFormatter.ts` to identify exported functions and their signatures.
    *   Generates a test file (e.g., `src/utils/__tests__/dateFormatter.test.ts`) with Jest `describe` and `it` blocks.
    *   Writes test cases for various scenarios.
    *   Claude Code or Codex CLI (full-auto) may run these tests within their sandboxed environment and iterate until they pass, especially if guided by `CLAUDE.md` or `AGENTS.MD` test commands.
    *   Otherwise, you would typically run `npm test` or `yarn test` locally to execute the generated tests and refine them if needed.

These intermediate tasks show how AI coding agents can become a more active partner in the development process, helping not just to write new code but also to improve and validate existing codebases.

---

Next: [4.c: Advanced Scenarios](./04_c_advanced_scenarios.md)