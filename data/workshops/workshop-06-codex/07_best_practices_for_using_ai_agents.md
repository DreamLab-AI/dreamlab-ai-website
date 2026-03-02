# Chapter 7: Best Practices for Using AI Agents

The workshop with OpenAI experts provided valuable insights into best practices for effectively using AI coding agents like Codex. These go beyond simple prompting and touch upon how to structure your code, environment, and mindset for optimal collaboration with AI.

## 1. Make Your Codebase Discoverable

The easier it is for an AI agent to understand your codebase, the better it can assist you. This mirrors good practices for human onboarding.

*   **Clear Structure and Naming:**
    > "make your codebase discoverable it's like the equivalent of maintaining good engineering practices for uh new hires that you make and letting them understand your codebase faster right" - Josh, OpenAI
    Use logical directory structures, clear file names, and descriptive variable/function names.
*   **Scoped Prompts:** Help the agent by pointing it to the right area.
    > "a lot of my prompts start with like I'm working in this subdirectory um here's what I like to accomplish right can you please um do it for me um and so giving that guidance at scoping uh helps" - Josh, OpenAI
*   **Intentional Naming for AI (Advanced):** Consider how names might be tokenized or searched by an AI.
    > "the code name the internal code name for our project is wham like wh um and we chose it... whenever we prompt we can be very efficient we can just say in wham right and then wham code that is like you know for our web uh codebase or our server codebase... is like really efficient for the agent to find... as you start to think ahead like oh I'm going to have an agent it's going to be using terminal to GP uh then you know you can start like naming things intentionally" - Alexander, OpenAI
    While human readability is paramount, unique, easily searchable project or module names can be beneficial.

## 2. Language Choice and Typing

Static typing and modern language features can significantly help AI agents.

*   **Use Types:**
    > "You're still using JavaScript like no wonder like you just like you know you use at least TypeScript like give it some types." - Alexander, OpenAI
    TypeScript (over plain JavaScript), Python with type hints, and other statically-typed languages provide more context for the AI, leading to more accurate suggestions and error detection.

## 3. Modularity and Testability

Well-structured, modular code is easier for both humans and AI to work with.

*   **Modular Design:**
    > "just make your code modular right the more modular and testable it is the better but you don't even have to write the test it's like an agent can write the tests but you kind of need to design the architecture to be modular" - Alexander, OpenAI
    Break down complex systems into smaller, independent modules with clear interfaces.
*   **Good Architecture Matters More Than Ever:**
    > "architecture like good architecture is like even more important than ever and like I guess the fun thing is like for now that's a thing that humans are really good at so like you know kind of good you know important for the software engineers to do their job" - Alexander, OpenAI
    A poorly architected monolith can hinder AI effectiveness just as it hinders human developers.

## 4. Leverage `AGENTS.MD`

As detailed in [Chapter 3.b](./03_b_the_crucial_role_of_agents_md.md), `AGENTS.MD` is crucial.

*   **Start Simple, Iterate:**
    > "I would start simple and not try to overdo it and like a simple agent MD will get you a long way rather than no agents MD... it's more of like you learn over time" - Josh, OpenAI
*   **Automate `AGENTS.MD` Generation (Future):**
    > "what we would really like to do is autogenerate this at some point for you based on the PRs you create and the feedback you give but um you know we figured we ship faster uh rather than later" - Josh, OpenAI
    For now, maintain it manually, but expect tools to help in the future. The workshop even mentioned using `codex-1` to help write `AGENTS.MD` files by traversing the directory tree.

## 5. Linters and Formatters

These tools provide immediate feedback and ensure consistency, which benefits AI agents.

*   **In-the-Loop Verifiers:**
    > "pro users install llin llin llin llin llin llin llin llin llin llin llinters and formatterers so that basically these are in the loop verifiers that the agent can kind of use right" - Swyx (workshop host)
    Tools like ESLint, Prettier, Black, Flake8, etc., help the agent produce code that conforms to project standards.
*   **Commit Hooks:**
    > "for agents it's actually really good to have commit hooks" - Josh, OpenAI
    Automated checks at commit time can catch issues early.

## 6. Adopt an Abundance Mindset (Especially with Cloud Agent)

Don't be afraid to delegate and run multiple tasks in parallel.

*   **Quick Delegation:**
    > "the way we see people who like love codeex the most using it is they don't they think for like maybe 30 seconds max about their prompt it's just like oh I have this idea like boom... and you just send it off." - Alexander, OpenAI
    This is particularly true for the Cloud Agent, which can handle multiple long-running tasks.
*   **Use Your Phone (Experiment):**
    > "one thing that's quite fun is like use it on your phone because somehow just like being on your phone just like flips the way people think about things... try it like it's actually like super fun and satisfying" - Alexander, OpenAI
    This encourages a different mode of interaction – quick delegation of tasks you think of on the go.

## 7. Understand the Agent's "Experience Level"

Think of the AI agent as a highly intelligent but new team member.

*   **Base Model as a Grad:**
    > "if you start with like a base reasoning model actually you basically have this like really precocious like incredibly intelligent incredibly knowledgeable... college grad" - Alexander, OpenAI
*   **Fine-tuning as Job Experience:**
    > "a lot of what we've done with with codeex one is basically give it its first few years of job experience uh and like that's effectively what the training is right" - Alexander, OpenAI
*   **`AGENTS.MD` as Onboarding:**
    > "every time you kick off a task it's kind of like their first day at your company right and so agents.md is basically a method for you to kind of compress that like test time exploration that it has to do so it can like know more" - Alexander, OpenAI

## 8. Iterative Deployment and Feedback

The tools are constantly evolving.

*   **Provide Feedback:**
    > "we're really curious to see um because this is like such a new form factor... especially would love feedback from folks on how they would like to see their environment customized" - Josh, OpenAI
    Your feedback helps shape future development.
*   **Experiment:**
    > "I would just love for people to take advantage especially now like we're very intentionally just providing like very generous rate limits so people can try it like we just want you to try it and figure out what sticks what works what doesn't how do you prompt it and then we want to learn from that and use that to lean in" - Alexander, OpenAI

By adopting these practices, you can create a more synergistic relationship with AI coding agents, leading to increased productivity and higher quality software.

---

Next: [Chapter 8: Conclusion](./08_conclusion.md)