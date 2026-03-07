# Chapter 6: AI-Powered Workflows with Roo Code

This chapter brings together the [Git](https://git-scm.com/)/[GitHub](https://github.com/) foundation and your [VS Code](https://code.visualstudio.com/) setup with the power of Artificial Intelligence. We'll focus on using the [Roo Code extension](./02_d_roo_code_config.md), connected to your [Google Gemini API key](./02_c_gcp_api_key.md), to create an "AI-powered coding assistant" integrated directly into your editor.

The workshop described this as the point where "suddenly what you've got is the world's strongest AI... connected through a Vibe coding agent into GitHub. Then you've got absolutely everything you need to build projects."

## 6.1 What is Roo Code? (Recap)

As outlined in the original `workshop.md` and discussed:

[Roo Code](https://marketplace.visualstudio.com/items?itemName=RooAI.roo-code) is a VS Code extension that acts as an AI co-pilot. It allows you to:

*   **Generate Code:** Ask it to write functions, classes, or boilerplate based on descriptions.
*   **Explain Code:** Select code and ask for a plain English explanation.
*   **Refactor Code:** Get suggestions to improve or restructure existing code.
*   **Debug:** Ask for help identifying and fixing bugs.
*   **Answer Questions:** Get quick programming-related answers without leaving VS Code.
*   **Generate Documentation:** Create docstrings, comments, or even entire Markdown documents.

It uses your configured API key to communicate with powerful AI models like Google Gemini. The workshop emphasized its utility: "This is like connecting the AI directly to your file system but with checks and balances."

## 6.2 How to Use Roo Code: The "Vibe Coding" Approach

"Vibe coding" was a central theme in the workshop – an iterative, exploratory, and often conversational way of working with the AI.

1.  **Open the Roo Code Sidebar:**
    *   Click the Roo Code icon (the kangaroo) in the VS Code Activity Bar.

2.  **Interact via Chat:**
    *   Type questions or instructions into the Roo Code chat panel.
    *   **Be Specific (but also Conversational):** Instead of "write code," try "write a Python function that takes a list of numbers and returns their sum." Or, as the workshop demonstrated for project layout: "Lay out a project in this git directory for eye tracking in Python with a readme and all of the best directories."
    *   **Iterate:** If the first response isn't perfect, refine your question, ask follow-up questions, or provide more context. "If it gets confusing, you just ask it what the fuck's going on and it will tell you... Just keep asking it... until eventually you sort of break through."

3.  **Leverage Editor Context:**
    *   **Selection:** Select a piece of code in your editor *before* asking a question or giving an instruction. Roo Code will use the selected code as context (e.g., "Explain this selected code," "Refactor this function to be more efficient," "Suggest color‑blind‑safe palette variations for this palette.json").
    *   **Active File/Project:** Roo Code can consider the content of your currently active file and even other files in your project (especially if you've enabled "Read" in Auto-Approve settings). This allows for deep contextual understanding. "You can put all of your project documents into your directory here... and say just look through this lot and make me a document out of it."

4.  **Apply Suggestions & Manage Output:**
    *   Roo Code might offer code snippets, patches, or entire file structures.
    *   You can copy these, or Roo Code might directly write/modify files if "Write" is enabled in Auto-Approve.
    *   **Crucially, use Git:** "You can't work with AI unless you're using this [version control] because it will smash up everything that it made before all the time... So you need to be doing source control." Commit your changes frequently so you can roll back if the AI generates something undesirable.

5.  **Control Roo Code Modes:**
    *   Remember the **Ask**, **Code**, and **Architect** modes at the bottom of the Roo Code panel. Switch between them based on your needs. For generating project structures or writing code, ensure you're in **Code** mode.

6.  **Manage Rate Limiting & Costs:**
    *   If you configured the 30-second rate limit, Roo Code will pause between operations. "Your rate limiter should have kicked in at 30 seconds. This is how it remains free."
    *   If you need faster responses for intensive work and are willing to use your Google Cloud free credits (or pay), you can create another Roo Code profile *without* the rate limit enabled and switch to it.
    *   Keep an eye on the cost ticker in Roo Code if you're on an un-rate-limited profile: "You see the little cost ticker there? That's real cost... if you wanted to put it into unconstrained mode, you can keep an eye on your cost up there."

## 6.3 Prompt Ideas for Creative Technologists

The `workshop.md` and transcript offered several ideas:

*   **Project Scaffolding:** "Lay out a project in this git directory for an eye tracker in Python with a readme and all of the best directories."
*   **Documentation:** "Refactor this README into a beginner‑friendly tutorial."
*   **Creative Asset Generation/Modification:** "Suggest color‑blind‑safe palette variations for palette.json." (Roo Code might embed suggestions as a Git patch).
*   **Complex Document Creation:** "Make a directory called horizon-bid and populate it with a project structure for an academic bid... including Mermaid, Gantt charts, and costing plan templates."
*   **Diagrams as Code:** "Create me a complex and delightful Gantt chart for bootstrapping a creative technology agency called Dreamloop" (using Mermaid syntax, which can then be rendered).
    ```mermaid
    gantt
        dateFormat  YYYY-MM-DD
        title Dreamloop Agency Bootstrap
        section Foundation
        Research & Planning       :a1, 2024-01-01, 30d
        Legal & Financial Setup   :a2, after a1, 14d
        section Branding & Online Presence
        Brand Identity Development :b1, after a1, 21d
        Website & Portfolio Dev   :b2, after b1, 45d
        section Operations
        Service Definition        :c1, after a2, 14d
        Tooling & Workflow Setup  :c2, after c1, 30d
    ```
*   **Understanding Existing Code:** "Describe this project" (after cloning a complex repository like ComfyUI).

The key is experimentation. "Think of something off the cuff... Honestly, you don't know what ballpark you're in until you've tried it. This is wildly jagged frontier vibe code madness. It will do anything you ask."

## 6.4 The Power of AI with Local File Access

A significant advantage of using Roo Code in VS Code over web-based AI chat interfaces is its ability to read from and write to your local file system (with your permission via Auto-Approve settings).

*   **Contextual Understanding:** It can read multiple files in your project to understand the broader context, leading to more relevant and accurate suggestions.
*   **Bulk Operations:** It can generate entire directory structures, fill them with template files, or refactor code across multiple files. "You can get it to lay out whole directory structures and fill them with text files and do an enormous amount of bulk work in a way that you just can't do with the other interfaces."
*   **Persistent Memory (within session):** The AI's "understanding" of your project grows as you interact with it within a session.

This local integration, combined with robust version control via Git, creates a highly dynamic and powerful development environment. "The whole of the AI is connected to the whole of the documents, the whole of the time on your own system in a private way, connected to the version management system, connected to the rest of the team."

The workshop concluded that this setup provides "the ultimate version of AI tool working." The learning curve involves "three months of frustrated, repeatedly asking it what the fuck's going on" but ultimately leads to a profound new way of working.

## 6.5 Context Windows, Cost Management &amp; Tool Comparison

Working effectively with AI coding assistants like Roo Code involves more than just writing good prompts; it requires a strategic approach to managing context, understanding costs, and choosing the right tools for the job. These applied best practices will help you maximise the benefits while minimising potential pitfalls like runaway spend or model confusion.

### Understanding Context Windows and Token Costs (Insights 1, 9)

AI models operate within a "context window"—a limit on the amount of information (text, code, etc.) they can consider at any one time. This context is measured in "tokens," which roughly correspond to words or parts of words. As your conversation with the AI grows, so does the context.

**Key Practices:**

*   **Monitor Actively:** Keep an eye on Roo Code's live "context bar" and, if applicable, the cost counter. This gives you real-time feedback on how much information the AI is processing and the associated expense.
*   **Cost Mechanics:** Remember that token cost is roughly a product of the context size and the number of calls made to the AI. Many small, focused calls with a lean context are often more cost-effective and can lead to clearer, more accurate responses than a few calls with an enormous, sprawling context.
*   **Strategic Reset/Summarise (Insight 8):** When the context window is about one-third full, or if you notice the AI's logic starting to degrade (e.g., it forgets previous instructions or generates less relevant output), it's time for a manual reset. You can either start a fresh session or ask the AI to summarise the current conversation, using that summary as the starting point for a new, leaner context.

### The Two-Profile Strategy for Cost Control (Insight 2)

A practical way to manage costs, especially when using models with per-token pricing, is the "two-profile" strategy within Roo Code:

&gt; **Note: The Rate-Limited vs. Unlimited Profile Trick**
&gt;
&gt; Configure two distinct profiles in Roo Code:
&gt; 1.  **"Rate-Limited Daily Driver":** Set this profile to use a cost-effective model (like a free-tier option if available, or a less expensive model) and enable a significant rate limit (e.g., 30-60 seconds between calls). This is your go-to for routine tasks, explanations, and general assistance, helping you stay within free-tier limits or keep costs very low.
&gt; 2.  **"Unlimited Creative Burst":** Configure this profile with your most capable model (e.g., Gemini 2.5 Pro) and *no rate limit* (or a very short one). Reserve this profile for intensive tasks like generating large codebases, complex refactoring, or deep ideation sessions where you need the AI's full power without interruption. Actively monitor the cost ticker when using this profile.
&gt;
&gt; By switching between these profiles, you can balance capability with cost-effectiveness.

### Tooling Choices: Roo Code vs. Cursor (Insight 3)

While various AI coding tools exist, understanding their differences in transparency and control is crucial. Here's a comparison between Roo Code (as used in this workshop, typically with a user-provided API key and direct model access) and a tool like Cursor:

| Feature             | Roo Code (with direct model access)                                  | Cursor (typical behaviour)                                       |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Context Display** | Explicit context bar, showing token count.                           | Often opaque; context size not always clear.                     |
| **Cost Tracking**   | Direct cost display (if API provides it &amp; profile is un-rate-limited). | Hidden; costs are part of a subscription or abstracted.          |
| **Prompting**       | Plain-text prompts, direct interaction with the chosen model.        | May involve hidden pre-prompts or system-level instructions.     |
| **RAG**             | No hidden Retrieval Augmented Generation (RAG) by default. User controls what context is provided. | Often includes built-in RAG, automatically pulling from project files, which can be helpful but also opaque. |
| **Transparency**    | High: User knows what model is used, what context is sent, and (often) the cost. | Lower: Internal workings, model choices, and exact context can be less visible. |
| **Control**         | High: User directly manages API keys, model selection, and context.  | Moderate: More "managed" experience, less direct control over underlying AI. |

Choosing the right tool depends on your needs. Roo Code, when configured directly, offers greater transparency and control, which is beneficial for learning the nuances of AI interaction and managing spend. Tools like Cursor might offer a more streamlined, "it just works" experience but with less insight into the underlying mechanics.

### Effective Prompting with the Tree-plus-Docs Pattern (Insight 4)

To minimise AI "hallucinations" (generating incorrect or irrelevant information), avoid duplicate directory creation, and ensure the AI works with the most current information, use the "Tree-plus-Docs" pattern for your prompts, especially when asking for file modifications or project-level changes:

1.  **Provide the Directory Tree:** Use a command like `tree -L 2` (or a similar representation) to show the AI the current structure of the relevant part of your project.
2.  **Include Key Document Snippets:** Paste in the most relevant sections of any files the AI needs to understand or modify. Don't assume it remembers everything from previous turns.
3.  **Be Specific about the Action:** Clearly state what you want the AI to do with this information.

This focused approach provides a narrow, deterministic context for each significant request.

### The Core Interaction Loop: Tree → Prompt → Reset (Insights 1, 8, 10)

A sustainable workflow for complex tasks often involves a loop:

```mermaid
sequenceDiagram
    participant User
    participant AI (Roo Code)
    User-&gt;&gt;AI: Provide Project Tree + Key Docs Snippets
    User-&gt;&gt;AI: Specific Prompt/Task (e.g., "Add feature X to file Y.md")
    AI--&gt;&gt;User: Generates Code/Text/Response
    User-&gt;&gt;User: Review &amp; Integrate Changes (Commit with Git!)
    User-&gt;&gt;User: Monitor Context Size / Cost
    alt Context Full or Logic Degrades
        User-&gt;&gt;AI: "Summarise our conversation" OR Start Fresh Session
        User-&gt;&gt;User: Reset/Update Context
    end
    User-&gt;&gt;AI: (Repeat with new prompt or refined task)
```

This iterative cycle, combined with vigilant context management and version control, forms the backbone of effective AI-assisted development. If the AI seems lost or is producing unhelpful output, a good "debug" pattern (Insight 10) is to ask it: "Tell me about this project," providing the current file tree and key document snippets. The AI's summary can help you understand its current "mental model" of your project, allowing you to correct misunderstandings or provide better context for the next iteration.
---

Next: [Chapter 7: Reference Cheat Sheet](./07_cheat_sheet.md)