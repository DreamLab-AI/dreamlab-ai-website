# 6.b: Security Implications of AI-Assisted Development

> **June 2026:** AI coding agents introduce both new security safeguards (sandboxing, automated review) and new attack surfaces (AI-generated vulnerabilities, supply chain risks, prompt injection). A responsible security posture requires understanding both sides.

## The Security Landscape

Every AI coding agent operates with significant access to your development environment: it reads source files, executes shell commands, installs dependencies, and creates commits. This access is what makes these tools powerful — and what makes security considerations non-negotiable. The goal is not to restrict the agent to the point of uselessness, but to create layered defences that catch the categories of mistake that agents are most likely to make.

## Sandboxing: How Agents Isolate Execution

Both leading terminal agents implement sandboxing to limit the blast radius of autonomous execution. Understanding these mechanisms helps you make informed decisions about when to grant more autonomy and when to require manual approval.

### Claude Code Sandboxing

Claude Code runs on your local machine with access to your filesystem and shell. In its default interactive mode, it presents proposed changes and commands for your approval before execution. Security is primarily enforced through:

- **Approval prompts.** Every file modification and shell command is shown to you before execution. You approve or reject each action individually.
- **CLAUDE.md constraints.** You can explicitly forbid actions: "Never modify files in `src/generated/`", "Never run `rm -rf`", "Never install new npm dependencies without asking."
- **Hooks for automated checks.** Pre-commit hooks can run security scans, lint checks, or test suites before any commit is created.

### Codex CLI Sandboxing

The Codex CLI implements more aggressive sandboxing, particularly in its higher-autonomy modes:

- **Suggest mode (default).** Shows proposed changes for manual approval. No automatic execution.
- **Auto-edit mode.** Applies file changes automatically but does not execute shell commands without approval.
- **Full-auto mode.** Executes autonomously, but within a hardened sandbox:
  - **Network disabled** — The agent cannot make outbound network requests, preventing data exfiltration and unauthorised dependency installation
  - **Directory-scoped** — File access is restricted to the project directory
  - **macOS:** Uses Apple's Seatbelt (`sandbox-exec`) for kernel-level enforcement
  - **Linux:** Runs inside a Docker container with restricted capabilities

### Sandboxing Comparison

| Aspect | Claude Code | Codex CLI (Full Auto) |
|--------|-------------|----------------------|
| **File access** | Full (with approval) | Directory-scoped |
| **Network access** | Full (with approval) | Disabled |
| **Command execution** | With approval | Sandboxed |
| **Isolation mechanism** | Interactive approval | OS-level sandbox |
| **Override** | User approves each action | Configuration-based |

### Recommendations

- **Use interactive/suggest mode for sensitive code.** Authentication, payment processing, data handling, and infrastructure code should always require manual approval of every change.
- **Use full-auto/auto-edit for well-tested, low-risk tasks.** Adding JSDoc comments, formatting code, generating boilerplate, and running linters are safe candidates for higher autonomy.
- **Never weaken Codex CLI's network sandbox without a specific, documented reason.** The default of network-disabled full-auto mode is a strong security baseline.

## AI-Generated Vulnerabilities

AI agents can produce code containing security vulnerabilities. Research consistently shows that AI-generated code has a non-trivial rate of security flaws — not because the models are malicious, but because they optimise for the most likely correct output, and the most common code patterns are not always the most secure.

### Common Vulnerability Categories

**SQL Injection.** The agent may construct database queries using string concatenation rather than parameterised queries, especially in languages or frameworks where both approaches are syntactically valid.

```python
# Vulnerable — agent may produce this for simple database tasks
def get_user(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return db.execute(query)

# Secure — what your CLAUDE.md should mandate
def get_user(username):
    query = "SELECT * FROM users WHERE username = %s"
    return db.execute(query, (username,))
```

**Cross-Site Scripting (XSS).** When generating web frontend code, agents may render user input without proper sanitisation, particularly in frameworks that do not escape by default.

```jsx
// Vulnerable — agent may produce this when asked to "render user content"
function UserComment({ comment }) {
  return <div dangerouslySetInnerHTML={{ __html: comment.body }} />;
}

// Secure — sanitise before rendering
import DOMPurify from 'dompurify';
function UserComment({ comment }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.body) }} />;
}
```

**Insecure Authentication.** Agents may implement authentication flows that are functional but insecure: storing passwords in plaintext, using weak hashing algorithms (MD5, SHA-1), omitting rate limiting on login endpoints, or implementing JWT validation that does not check token expiry.

**Insecure Direct Object References (IDOR).** The agent may create an endpoint like `GET /api/users/:id` that returns any user's data without verifying that the requesting user has permission to access it.

**Dependency Vulnerabilities.** Agents suggest libraries based on training data. They may recommend versions with known CVEs, unmaintained packages, or libraries that have been deprecated in favour of more secure alternatives.

**Hardcoded Secrets.** Under time pressure or with insufficiently specific prompts, agents may hardcode API keys, database credentials, or tokens directly in source files.

```typescript
// The agent may produce this in a quick implementation
const stripe = new Stripe('sk_live_EXAMPLE_KEY_DO_NOT_USE');

// What should be produced instead
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

### CLAUDE.md Security Directives

Encode security requirements directly in your project configuration:

```markdown
## Security Requirements
- Always use parameterised queries for database access — never string concatenation
- Sanitise all user input before rendering in HTML (use DOMPurify)
- Never hardcode API keys, secrets, or credentials — use environment variables
- All authentication endpoints must include rate limiting
- All API endpoints must verify user authorisation, not just authentication
- Use bcrypt (cost factor 12+) for password hashing — never MD5 or SHA-1
- All new endpoints must include input validation using Zod schemas
- Never use eval(), Function(), or dynamic code execution with user input
```

## Supply Chain Security

AI agents regularly suggest installing npm packages, pip packages, or other dependencies. Not all suggestions are safe.

### Risks

- **Typosquatting.** The agent may suggest a package name that is one character off from the legitimate package (e.g., `loadash` instead of `lodash`). Attackers publish malicious packages with common misspellings.
- **Unmaintained packages.** The agent may suggest packages that were popular at the time of its training data but have since been abandoned, leaving known vulnerabilities unpatched.
- **Excessive dependency trees.** The agent may suggest a package that does something trivial (e.g., `is-odd`) that pulls in a deep dependency tree, expanding your attack surface.
- **Licence incompatibility.** The agent may suggest packages with licences (GPL, AGPL) that are incompatible with your project's licensing requirements.

### Mitigation

- **Review every new dependency.** Check the package on npm/PyPI: when was it last updated? How many weekly downloads? Who maintains it?
- **Use lockfiles.** `package-lock.json`, `yarn.lock`, and `pip freeze` ensure reproducible builds and prevent silent version changes.
- **Run vulnerability scanners.** `npm audit`, `pip-audit`, Snyk, or Dependabot catch known CVEs in your dependency tree.
- **Add dependency rules to CLAUDE.md.** "Do not add new npm dependencies without asking" prevents the agent from pulling in packages without your review.

## Secrets Management

Secrets — API keys, database credentials, tokens, certificates — are the highest-value target in any codebase. AI coding agents interact with your codebase in ways that can expose secrets if you are not careful.

### Risk Scenarios

- **Secrets in CLAUDE.md or AGENTS.MD.** These files are committed to Git. Any secret placed in them is visible to everyone with repository access.
- **Secrets in generated code.** As shown above, agents may hardcode credentials directly in source files.
- **Secrets in conversation history.** If you paste a secret into a prompt, it enters the agent's context and may be sent to the model provider's API.
- **Secrets in commit messages.** The agent may include environment variable values or connection strings in commit messages or PR descriptions.

### Best Practices

1. **Use `.env` files (gitignored) for local secrets.** Reference them via `process.env.SECRET_NAME` in code.
2. **Never put secrets in CLAUDE.md or AGENTS.MD.** These are committed to Git. Use environment variable references instead: `"The database URL is in the DATABASE_URL environment variable."`
3. **Add secret patterns to `.gitignore`.** Ensure `.env`, `*.pem`, `credentials.json`, and similar files are never committed.
4. **Use pre-commit hooks to catch secrets.** Tools like `git-secrets`, `detect-secrets`, or `trufflehog` scan commits for high-entropy strings and known secret patterns.
5. **Rotate keys immediately if exposed.** If a secret appears in a commit, treat it as compromised even if you force-push to remove it. The key has been transmitted to the model provider and may exist in Git reflog.

## Secure Code Review for AI-Generated Output

AI-generated code deserves the same review rigour as human-written code — and in some areas, more. The agent's output is always confident, never uncertain, and occasionally wrong. Your review process must compensate for this.

### Review Checklist for Security-Sensitive Code

- [ ] **Input validation:** Is all user input validated before processing? Are Zod/Joi schemas or equivalent used at API boundaries?
- [ ] **Output encoding:** Is user-generated content sanitised before rendering in HTML, SQL, shell commands, or logs?
- [ ] **Authentication:** Are all protected endpoints checking authentication? Is the authentication mechanism sound (bcrypt, JWT with proper validation)?
- [ ] **Authorisation:** Does the code verify that the authenticated user has permission to perform the requested action on the requested resource?
- [ ] **Error handling:** Do error responses avoid leaking internal details (stack traces, database schemas, file paths)?
- [ ] **Dependencies:** Are all new packages from legitimate sources, actively maintained, and free of known vulnerabilities?
- [ ] **Secrets:** Are there any hardcoded credentials, API keys, or tokens in the generated code?
- [ ] **Logging:** Does the code avoid logging sensitive data (passwords, tokens, personal information)?

### Automated Security Scanning

Integrate security scanning tools into your development workflow. These catch vulnerabilities that manual review might miss:

| Tool Category | Examples | What It Catches |
|---------------|----------|-----------------|
| **SAST** (Static Analysis) | Semgrep, SonarQube, ESLint security plugins | Code-level vulnerabilities: injection, XSS, insecure patterns |
| **DAST** (Dynamic Analysis) | OWASP ZAP, Burp Suite | Runtime vulnerabilities in deployed applications |
| **Dependency scanning** | npm audit, Snyk, Dependabot | Known CVEs in third-party libraries |
| **Secret detection** | git-secrets, detect-secrets, trufflehog | Credentials and tokens in committed code |
| **Container scanning** | Trivy, Grype | Vulnerabilities in Docker images |

Configure Claude Code hooks to run SAST tools automatically:

```json
{
  "hooks": {
    "PreCommit": [
      {
        "command": "npx eslint --config eslint-security.config.js ${files}",
        "description": "Run security-focused ESLint rules before commit"
      }
    ]
  }
}
```

## The Shared Responsibility Model

Security in AI-assisted development operates on a shared responsibility model, similar to cloud computing:

| Responsibility | Provider (Anthropic, OpenAI) | Developer/Team |
|---------------|------------------------------|----------------|
| **Model safety training** | Yes | No |
| **Refusing malicious requests** | Yes | No |
| **Sandboxing infrastructure** | Yes (Codex CLI) / Partial (Claude Code) | Configure and maintain |
| **Code correctness** | Best effort | **Final accountability** |
| **Security review** | Not their role | **Your responsibility** |
| **Secrets management** | Not their role | **Your responsibility** |
| **Dependency vetting** | Not their role | **Your responsibility** |
| **Production deployment** | Not their role | **Your responsibility** |

The bottom line: AI providers build safeguards into their tools, and those safeguards are meaningful. But the developer who deploys the code is responsible for its security. "The AI wrote it" is not an acceptable response to a security incident.

---

**Next:** [6.c: Ethical and Legal Considerations](./06_c_ethical_and_legal_considerations.md)

---

*Last Updated: June 2026 | Security practices for Claude Code, Codex CLI, and AI-assisted development*
