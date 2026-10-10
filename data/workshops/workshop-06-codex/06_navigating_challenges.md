# Chapter 6: Navigating Challenges and Considerations

> **June 2026:** AI coding agents are powerful, but they are not infallible. Understanding their limitations, security implications, and ethical dimensions is essential for responsible and effective adoption. This chapter provides an honest assessment of where these tools fall short and how to mitigate the risks.

## Why This Chapter Matters

The previous chapters have focused on what AI coding agents can do and how to use them well. This chapter addresses what they cannot do, where they introduce risk, and what ethical and legal questions remain unresolved. Skipping this material is tempting — the tools are genuinely impressive, and the productivity gains are real — but ignoring limitations leads to over-reliance, and ignoring security and ethical considerations leads to costly mistakes.

The developers and teams that get the most value from AI coding tools are those who understand the boundaries. They know when to trust the agent's output and when to scrutinise it. They configure sandboxing and review workflows that catch the mistakes the agent misses. They make deliberate choices about data privacy, intellectual property, and the changing role of human developers.

This chapter is not a catalogue of reasons to avoid AI coding tools. It is a practical guide to using them with open eyes.

## What You Will Learn

By the end of this chapter, you will be able to:

- **Identify the practical limitations** of current AI coding agents — context window constraints, domain-specific blindness, hallucination patterns, and consistency challenges
- **Implement security best practices** for AI-assisted development — sandboxing, code review, vulnerability scanning, secrets management, and the shared responsibility model
- **Navigate the ethical and legal landscape** — copyright and intellectual property questions, training data provenance, bias in AI-generated code, workforce implications, and transparency requirements
- **Apply a "trust but verify" framework** to every piece of agent-generated code

## Chapter Structure

### [6.a: Limitations of AI Agents](./06_a_limitations_of_codex.md)

An honest assessment of what current AI coding agents cannot do reliably. This section covers:

- **Context window constraints** — Even with 200K-token windows (Claude) and growing capacity across models, extremely large codebases and long sessions can exceed limits. Models manage context intelligently, but they are not infinitely capable.
- **Domain-specific blindness** — Agents excel at tasks well-represented in training data but struggle with highly specialised business logic, proprietary frameworks, or novel algorithmic problems.
- **Hallucination and confabulation** — Agents can generate plausible but incorrect code, particularly for edge cases, concurrency patterns, and security-sensitive logic. They present incorrect solutions with confidence.
- **Consistency challenges** — The same prompt can produce different outputs across runs, varying in style, structure, and approach. Configuration files (CLAUDE.md, AGENTS.MD) mitigate but do not eliminate this.
- **Knowledge cutoff** — Training data has a boundary. Agents may suggest deprecated APIs, outdated library versions, or superseded security practices.
- **Task complexity ceiling** — Very long, highly interleaved tasks can hit practical limits in execution time, coherence, and result quality.

Understanding these limitations is not discouraging — it is empowering. It tells you where to focus your review effort and where to invest in guardrails.

### [6.b: Security Implications](./06_b_security_implications.md)

AI-assisted development introduces both new safeguards and new attack surfaces. This section covers:

- **Sandboxing** — How Claude Code and Codex CLI isolate agent execution to prevent unintended system access, with tool-specific details on macOS Seatbelt, Docker, and network restrictions
- **AI-generated vulnerabilities** — The risk that agents produce code containing XSS, SQL injection, IDOR, authentication flaws, or memory safety issues — and how to catch them
- **Supply chain risks** — Agents may suggest outdated or vulnerable dependencies, or use libraries the team has not vetted
- **Secrets exposure** — Patterns that prevent API keys, credentials, and tokens from leaking into committed code or agent-accessible configuration files
- **Secure use practices** — Human review, automated security scanning (SAST/DAST), the principle of least privilege, and using CLAUDE.md to enforce security standards
- **The shared responsibility model** — Providers build safeguards; developers remain the ultimate gatekeepers for production code quality and security

### [6.c: Ethical and Legal Considerations](./06_c_ethical_and_legal_considerations.md)

The legal and ethical landscape around AI-generated code is evolving rapidly and remains unsettled in several important areas. This section covers:

- **Copyright and intellectual property** — Who owns AI-generated code? How does training data provenance affect licensing? What are the risks of inadvertent open-source licence violations?
- **Bias in AI code generation** — Provider bias (favouring specific cloud platforms or libraries), social bias (reflecting historical underrepresentation in training data), and the tools emerging to detect and mitigate these biases
- **Workforce implications** — How AI coding tools are changing developer roles, the need for reskilling, and the ethical dimensions of workforce transition
- **Transparency and data use** — Questions about training data composition, user prompt retention, and privacy policies across providers
- **Practical guidance** — Due diligence steps for teams adopting AI coding tools in commercial settings

## The "Trust but Verify" Framework

A recurring theme across all three sections is the need for systematic verification of AI-generated code. This is not a failure of the tools — it is the appropriate working model for any system that produces probabilistic output. The framework is straightforward:

1. **Trust the agent to produce a reasonable first draft** — It will, the vast majority of the time.
2. **Verify business logic** — The agent does not understand your domain as deeply as you do.
3. **Verify security** — Run automated scans and manual review on security-sensitive code.
4. **Verify edge cases** — The happy path is usually correct; boundary conditions require scrutiny.
5. **Verify dependencies** — Check that suggested libraries are current, maintained, and approved for your project.

This framework applies equally to Claude Code, Codex CLI, Cursor, Copilot, and any other AI coding tool.

## Risk Calibration by Task Type

Not every task requires the same level of scrutiny. Calibrate your verification effort to the risk profile of the work:

| Task Type | Risk Level | Verification Approach |
|-----------|-----------|----------------------|
| Documentation and comments | Low | Quick read-through, check factual accuracy |
| Formatting and style changes | Low | Run linter, spot-check |
| Boilerplate and scaffolding | Low-Medium | Verify structure, check conventions |
| Business logic implementation | High | Line-by-line review, verify against requirements |
| Authentication and authorisation | Critical | Security-focused review, penetration testing |
| Data handling and privacy | Critical | Compliance review, data flow analysis |
| Infrastructure and deployment | High | Review in staging, verify rollback capability |
| Dependency changes | Medium-High | Audit new packages, run vulnerability scan |

The common mistake is applying uniform scrutiny to everything — which either wastes time on low-risk changes or, more dangerously, normalises superficial review that then gets applied to high-risk code as well. Match your effort to the stakes.

## Before You Begin

The three sections of this chapter are designed to be read in order. Section 6.a (Limitations) establishes the baseline understanding of where agents fail. Section 6.b (Security) builds on that to address the security implications of those failure modes. Section 6.c (Ethics and Legal) broadens the lens to the organisational and societal dimensions. Together, they provide the complete picture needed for responsible adoption.

---

**Next:** [6.a: Limitations of AI Agents](./06_a_limitations_of_codex.md)

---

*Last Updated: June 2026 | Limitations, security, and ethics of AI coding agents*
