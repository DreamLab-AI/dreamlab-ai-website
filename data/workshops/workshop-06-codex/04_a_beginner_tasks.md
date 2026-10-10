# 4.a: Beginner Tasks — Quick Wins with AI Coding Agents

> **June 2026:** These tasks are ideal for developers new to AI coding agents. They demonstrate core capabilities — code explanation, quick fixes, boilerplate generation, and simple refactoring — using both Claude Code and OpenAI Codex CLI. Each task typically completes in under a minute.

## Quick Fixes and Typos

The simplest and most immediately satisfying use of AI coding agents: finding and fixing errors in code or documentation. These tasks require minimal context and demonstrate the basic interaction pattern.

### Example: Fix a Typo in Documentation

**Claude Code:**
```bash
cd ~/projects/my-app
claude "Find and fix any spelling or grammar errors in README.md"
```

**Codex CLI:**
```bash
cd ~/projects/my-app
codex --approval-mode auto-edit "Fix all spelling mistakes in README.md"
```

The agent reads the file, identifies errors, and proposes corrections. In Claude Code, you approve each change interactively. In Codex CLI with `auto-edit`, changes are applied automatically.

### Example: Fix a Simple Bug

**Scenario:** A Python function crashes because it tries to concatenate a string with an integer.

**Claude Code:**
```bash
claude "In src/utils/formatter.py, the format_summary function crashes with a TypeError
when record_id is an integer. Fix it by converting record_id to a string."
```

**Codex CLI:**
```bash
codex "Fix the TypeError in src/utils/formatter.py where record_id needs to be
converted to a string before concatenation"
```

**Expected agent action:**
1. Read `src/utils/formatter.py`
2. Locate the problematic concatenation
3. Add `str()` conversion around `record_id`
4. Present the diff for review

```python
# Before (broken)
summary = "Record ID: " + record_id + " - " + record_value

# After (fixed)
summary = "Record ID: " + str(record_id) + " - " + record_value
```

### Example: Fix an Import Error

**Claude Code:**
```bash
claude "The app crashes on startup with 'ModuleNotFoundError: No module named utils'.
Check the imports in src/main.py and fix the module path."
```

The agent will read the file, check the project structure, and correct the import path — for example, changing `from utils import helper` to `from src.utils import helper` based on the actual directory layout.

## Code Explanation

AI coding agents excel at explaining unfamiliar code. This is valuable when onboarding onto a new project, reviewing someone else's work, or encountering a complex function you wrote six months ago and no longer remember.

### Example: Explain a Regular Expression

**Claude Code:**
```bash
claude "Explain this regex in plain English: ^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
```

**Expected output:**
> This regular expression validates a password string. It requires:
> - At least one uppercase letter (`(?=.*[A-Z])`)
> - At least one lowercase letter (`(?=.*[a-z])`)
> - At least one digit (`(?=.*\d)`)
> - At least one special character from `@$!%*?&` (`(?=.*[@$!%*?&])`)
> - A minimum length of 8 characters
> - Only the specified characters are allowed (no spaces or other symbols)

### Example: Explain a Function

**Claude Code:**
```bash
claude "Read src/lib/auth.ts and explain the verifyToken function. What does it do,
what are the edge cases, and what happens when the token is expired?"
```

**Codex CLI:**
```bash
codex "Explain the verifyToken function in src/lib/auth.ts — purpose, parameters,
return values, and error handling"
```

The agent reads the function in context (including imports, types, and related functions), then provides a structured explanation covering purpose, parameters, return values, and edge cases.

### Example: Explain an Entire Module

**Claude Code:**
```bash
claude "Read all files in src/services/billing/ and give me a high-level summary of
how the billing system works. What are the main entry points, how do they interact,
and what external services do they depend on?"
```

This is where terminal agents outperform chat tools — they can read all the files in a directory, understand the relationships between them, and provide a coherent architectural summary.

## Boilerplate Generation

AI coding agents are exceptionally efficient at generating repetitive, pattern-based code. This includes API routes, React components, database models, configuration files, and test scaffolding.

### Example: Generate a REST API Endpoint

**Claude Code:**
```bash
claude "Create a new Express route at /api/v1/health that returns JSON with status,
version from package.json, and current timestamp. Add it to src/routes/index.ts."
```

**Expected output:**

```typescript
// src/routes/health.ts
import { Router, Request, Response } from 'express';
import { version } from '../../package.json';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version,
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

The agent will also update `src/routes/index.ts` to import and mount the new route.

### Example: Generate a React Component

**Claude Code:**
```bash
claude "Create a UserAvatar component in src/components/UserAvatar.tsx. It should accept
name (string) and imageUrl (optional string) props. If no image, show initials in a
coloured circle. Use Tailwind CSS for styling."
```

**Expected output:**

```tsx
interface UserAvatarProps {
  name: string;
  imageUrl?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({ name, imageUrl }: UserAvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
      {getInitials(name)}
    </div>
  );
}
```

### Example: Generate a Database Model

**Codex CLI:**
```bash
codex "Generate a Prisma schema model for a BlogPost with id (uuid), title, slug (unique),
content, published (boolean, default false), authorId (relation to User), and timestamps.
Add it to prisma/schema.prisma."
```

**Expected output appended to schema:**

```prisma
model BlogPost {
  id        String   @id @default(uuid())
  title     String
  slug      String   @unique
  content   String
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Simple Refactoring

Basic refactoring tasks — renaming, extracting functions, converting between styles — are well within the comfort zone of every AI coding agent.

### Example: Rename a Variable Across a Module

**Claude Code:**
```bash
claude "In src/services/userService.ts, rename the variable 'usr' to 'user' everywhere.
Make sure all references in the file are updated consistently."
```

### Example: Extract a Function

**Claude Code:**
```bash
claude "In src/components/Dashboard.tsx, the useEffect on line 45-75 contains complex
data transformation logic. Extract it into a separate function called
transformDashboardData and move it to src/lib/dashboard-utils.ts."
```

The agent will:
1. Read the file and identify the code block
2. Extract the logic into a new function with proper type signatures
3. Create the new file with the extracted function
4. Update the original component to import and call the new function
5. Verify that the refactoring preserves the original behaviour

### Example: Convert Callback to Async/Await

**Codex CLI:**
```bash
codex "Convert all callback-style functions in src/services/fileService.ts to use
async/await. Maintain the same error handling behaviour."
```

**Before:**
```typescript
function readConfig(path: string, callback: (err: Error | null, data?: Config) => void) {
  fs.readFile(path, 'utf8', (err, raw) => {
    if (err) return callback(err);
    try {
      const data = JSON.parse(raw) as Config;
      callback(null, data);
    } catch (parseErr) {
      callback(parseErr as Error);
    }
  });
}
```

**After:**
```typescript
async function readConfig(path: string): Promise<Config> {
  const raw = await fs.promises.readFile(path, 'utf8');
  return JSON.parse(raw) as Config;
}
```

## Documentation Generation

Generating documentation from existing code is one of the highest-ROI uses of AI coding agents for beginner tasks.

### Example: Generate JSDoc Comments

**Claude Code:**
```bash
claude "Add JSDoc comments to all exported functions in src/lib/utils.ts. Include
parameter descriptions, return types, and a brief example for each."
```

**Expected output (for one function):**

```typescript
/**
 * Formats a date relative to now (e.g., "2 hours ago", "yesterday").
 *
 * @param date - The date to format, as a Date object or ISO string
 * @param locale - Optional BCP 47 locale tag (defaults to 'en-GB')
 * @returns A human-readable relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 3600000)); // "1 hour ago"
 * formatRelativeTime('2026-06-22T10:00:00Z');          // "yesterday"
 * ```
 */
export function formatRelativeTime(date: Date | string, locale = 'en-GB'): string {
  // ...
}
```

### Example: Generate a README Section

**Codex CLI:**
```bash
codex "Read the package.json and src/ directory structure, then generate an 'Installation'
and 'Usage' section for the README.md. Include npm install, environment variable setup,
and how to start the dev server."
```

## Tips for Beginner Tasks

1. **Be specific about file paths.** "Fix the bug in `src/utils/parser.ts`" is far better than "fix the parser bug." The agent can find files on its own, but explicit paths save time and reduce ambiguity.

2. **Start with low-risk tasks.** Documentation, test generation, and code explanation are ideal starting points — they do not modify production logic.

3. **Review every change.** Even for simple tasks, read the diff before accepting. This builds the review habit that becomes essential for more complex work.

4. **Use `/fast` mode (Claude Code) or `--model o4-mini` (Codex CLI) for simple tasks.** Routine work does not need the most powerful model. Cheaper, faster models handle beginner tasks just as well.

5. **Iterate rather than re-prompt.** If the first result is close but not perfect, ask for a correction ("also add a null check for the name parameter") rather than starting over.

6. **Check the agent's reasoning.** For code explanation tasks, verify the explanation against the actual code. The agent's explanation is a useful starting point, not an authoritative source.

---

**Next:** [4.b: Intermediate Tasks](./04_b_intermediate_tasks.md)

---

*Last Updated: June 2026 | Beginner exercises for Claude Code and OpenAI Codex CLI*
