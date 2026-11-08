# Chapter 8: Hands-On Exercises

> Five practical exercises that build on everything you have learned. Each exercise includes clear objectives, step-by-step instructions, and success criteria so you know when you have completed it.

## Before You Begin

You need:
- Claude Code installed and authenticated (see [Chapter 1](./01_getting_started.md))
- A terminal or IDE with Claude Code available
- A project directory to work in (your own project, or a clone of any open-source repository)

Each exercise takes 15 to 30 minutes. Work through them in order — each builds on skills from the previous ones.

---

## Exercise 1: Explore a Sample Project

**Objective:** Use Claude Code to understand an unfamiliar codebase without reading a single file manually.

### Setup

Clone any open-source project you have not worked with before. If you need a suggestion:

```bash
git clone https://github.com/expressjs/express.git
cd express
```

Or use your own company's codebase — Claude Code works with any language or framework.

### Instructions

1. **Start Claude Code** in the project directory:

   ```bash
   claude
   ```

2. **Ask Claude to explain the project:**

   ```
   > Explain this project. What does it do, how is it organised, and
     what are the key files I should look at first?
   ```

3. **Ask a follow-up about architecture:**

   ```
   > How does the routing system work? Walk me through what happens
     when a request comes in.
   ```

4. **Ask about dependencies and testing:**

   ```
   > What are this project's dependencies? How do I run the tests?
     What testing framework does it use?
   ```

### Success Criteria

- You can explain the project's purpose in one sentence
- You can name the three most important files
- You know how to build and test the project
- You achieved all this without opening a single file manually

---

## Exercise 2: Create a CLAUDE.md for Your Own Project

**Objective:** Write a CLAUDE.md configuration file that teaches Claude Code about your project's conventions, build commands, and architecture.

### Setup

Navigate to a project you work on regularly. This exercise works best with a real project you know well.

### Instructions

1. **Start Claude Code** in your project:

   ```bash
   cd ~/your-project
   claude
   ```

2. **Ask Claude to generate a starting CLAUDE.md:**

   ```
   > Analyse this project and generate a CLAUDE.md file. Include:
     - Project overview (what it does, main technologies)
     - Build, test, and lint commands
     - Project structure (key directories and what they contain)
     - Code conventions you can infer from the existing code
     - Any environment variables needed
   ```

3. **Review the generated CLAUDE.md** and refine it with your own knowledge:

   ```
   > The CLAUDE.md is a good start, but I want to add some rules:
     - We always use functional components in React, never class components
     - All API endpoints must have Zod validation schemas
     - Error messages should be user-friendly, not technical
     - Database migrations must be reversible
     Add these to the CLAUDE.md under a "Code Conventions" section.
   ```

4. **Test it** by asking Claude to do something that should follow your rules:

   ```
   > Create a new API endpoint at /api/bookmarks that supports
     GET (list all) and POST (create one). Follow the conventions
     in the CLAUDE.md.
   ```

5. **Verify** that Claude followed the conventions you specified.

### Success Criteria

Your CLAUDE.md should include: a project overview, build/test/lint commands, project structure, at least five conventions, and environment variable documentation. Claude should demonstrably follow these rules when generating code.

---

## Exercise 3: Set Up an MCP Server

**Objective:** Connect Claude Code to an external tool via the Model Context Protocol and use it in a conversation.

### Option A: GitHub MCP Server (Recommended)

**1. Create a GitHub personal access token:**

Go to [github.com/settings/tokens](https://github.com/settings/tokens) and create a fine-grained token with:
- Repository access: select one or more of your repositories
- Permissions: Issues (read/write), Pull requests (read)

**2. Create the `.mcp.json` file** in your project root:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

**3. Add `.mcp.json` to `.gitignore`** (it contains your token):

```bash
echo ".mcp.json" >> .gitignore
```

**4. Start Claude Code and test it:**

```
> Show me all open issues in this repository.
> Create a new issue titled "Set up automated testing" with a description
  that outlines what testing framework to use and what to test first.
```

### Option B: Filesystem MCP Server (No Token Required)

**1. Create `.mcp.json`:**

```json
{
  "mcpServers": {
    "shared-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/tmp/shared-docs"
      ]
    }
  }
}
```

**2. Create the shared directory with some content:**

```bash
mkdir -p /tmp/shared-docs
echo "# Project Requirements" > /tmp/shared-docs/requirements.md
echo "# Meeting Notes" > /tmp/shared-docs/meeting-notes.md
```

**3. Start Claude Code and test it:**

```
> Read the requirements document from the shared docs and summarise the features.
```

### Success Criteria

- `.mcp.json` is created and correctly configured
- Claude Code connects to the MCP server on startup
- You can ask Claude to perform operations via the MCP server
- The MCP server responds with real data

---

## Exercise 4: Create a Linting Hook

**Objective:** Set up a PostToolUse hook that automatically formats files after Claude edits them.

### Instructions

1. **Identify your project's formatter:**

   | Language | Formatter Command |
   |----------|------------------|
   | JavaScript/TypeScript | `npx prettier --write` |
   | Python | `ruff format` or `black` |
   | Rust | `rustfmt` |
   | Go | `gofmt -w` |

2. **Create the hook configuration.** Create or edit `.claude/settings.json` in your project:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Edit",
           "command": "npx prettier --write $CLAUDE_FILE_PATH"
         },
         {
           "matcher": "Write",
           "command": "npx prettier --write $CLAUDE_FILE_PATH"
         },
         {
           "matcher": "Edit",
           "command": "echo \"$(date '+%Y-%m-%d %H:%M:%S') Edited: $CLAUDE_FILE_PATH\" >> .claude/edit-log.txt"
         }
       ]
     }
   }
   ```

   Replace `npx prettier --write` with your project's formatter.

3. **Test the hook.** Start Claude Code and ask it to edit a file:

   ```
   > Add a new function to src/utils.ts that converts a date to
     a human-readable relative time string (e.g., "3 hours ago").
   ```

4. **Verify the hook ran.** After Claude makes the edit, the file should be automatically formatted. Check `.claude/edit-log.txt` to see the log entry.

### Success Criteria

- `.claude/settings.json` exists with valid hook configuration
- Files are automatically formatted after Claude edits them
- The edit log captures each file modification with a timestamp

---

## Exercise 5: Build a Web Page from a Description

**Objective:** Use Claude Code to generate a complete web page from a natural language description, using all the skills from this workshop.

### Instructions

1. **Create a CLAUDE.md** (if you do not have one) with your preferences:

   ```markdown
   # Web Page Project

   ## Tech Stack
   - HTML5, CSS3, vanilla JavaScript
   - No frameworks or build tools
   - Responsive design (mobile-first)
   - Accessible (WCAG 2.1 AA)

   ## Conventions
   - Semantic HTML elements
   - CSS custom properties for colours
   - No inline styles
   - All images must have alt text
   ```

2. **Give Claude a detailed description:**

   ```
   > Create a landing page for a fictional coffee shop called "The Roasted Bean".
     The page should include:
     - A hero section with the shop name, a tagline, and a call-to-action button
     - A menu section with 6 coffee drinks (name, description, price)
     - An about section explaining the shop's story
     - A contact section with address, phone number, and opening hours
     - A footer with social media links
     Make it visually appealing with a warm colour palette (browns, creams, dark greens).
     It should be fully responsive and work on mobile.
     Create index.html, styles.css, and script.js files.
   ```

3. **Review the output.** Claude creates the files. Open `index.html` in your browser.

4. **Iterate on the design:**

   ```
   > The hero section needs more visual impact. Add a gradient overlay
     and make the tagline larger. Also, the menu section should use a
     card layout — two columns on desktop, one on mobile.
   ```

5. **Add interactivity:**

   ```
   > Add a smooth scroll effect for the navigation links. Also add a
     "back to top" button that appears when the user scrolls down past
     the hero section.
   ```

6. **Run a review:**

   ```
   > /review
   ```

### Success Criteria

- Three files created: `index.html`, `styles.css`, `script.js`
- The page renders correctly in a browser
- The page is responsive (works on mobile and desktop)
- Semantic HTML is used throughout
- The CLAUDE.md conventions were followed

---

## Stretch Goals

If you completed all five exercises and want more:

1. **Combine exercises 3 and 4:** Set up a GitHub MCP server and a hook that runs `npm test` after every edit. If tests fail, Claude sees the failure immediately.

2. **Multi-agent review:** Ask Claude to review the web page from Exercise 5 using subagents — one for accessibility, one for performance, one for security.

3. **Automate with /loop:** Use `/loop 5m /review` while you make manual changes to the coffee shop page. Claude reviews your changes every five minutes.

4. **Build a CLAUDE.md library:** Create CLAUDE.md files for three different projects you work on. Compare them — what is common across all three? Extract the common parts into `~/.claude/CLAUDE.md` (global).

---

**Next:** [Chapter 9: Resources & Community](./09_resources.md)

---

*DreamLab AI Self-Guided Workshop | June 2026*
