# Chapter 3: Practical Exercises - Flex Your New Powers

## 30 Minutes to Transform Your Workflow

These exercises progress from basic to advanced, demonstrating the immediate power of your new AI command centre. Complete them in order for maximum learning.

## Exercise 1: AI-Enhanced Document Creation (5 minutes)

### Objective
Experience the difference between traditional and AI-enhanced writing.

### Steps

1. **Create a new file**: `meeting-notes.md`

2. **Type this starter**:
   ```markdown
   # Team Meeting - [Today's Date]
   
   ## Attendees
   - Me
   
   ## Agenda
   Meeting about project planning
   ```

3. **Select** "Meeting about project planning"

4. **Press** `Ctrl+I` (or `Cmd+I`)

5. **Type prompt**: "Expand this into a detailed meeting agenda with 5 specific discussion points, time allocations, and action items"

6. **Watch** AI transform your basic notes into professional documentation

### Expected Result
A fully structured meeting agenda that would typically take 15-20 minutes to create manually.

### Reflection
- How much time would this normally take you?
- What other documents could benefit from this approach?

## Exercise 2: Mermaid Diagram Magic (5 minutes)

### Objective
Create professional diagrams from simple descriptions.

### Steps

1. **Create file**: `project-workflow.md`

2. **Type**:
   ```markdown
   # Project Workflow
   
   ## Current Process
   We receive requests, review them, assign to team members, 
   complete work, review, and deliver to client.
   ```

3. **Place cursor** after the description

4. **Press** `Ctrl+I` and prompt: "Create a Mermaid flowchart diagram of this workflow process"

5. **AI generates** something like:
   ```mermaid
   graph TD
       A[Receive Request] --> B[Review Request]
       B --> C{Assign to Team}
       C --> D[Complete Work]
       D --> E[Internal Review]
       E --> F{Approved?}
       F -->|Yes| G[Deliver to Client]
       F -->|No| D
   ```

6. **Preview**: Right-click file → "Open Preview"

### Success Criteria
- Diagram renders correctly
- Flow makes logical sense
- You understand how to modify it

## Exercise 3: Multi-Model Comparison (7 minutes)

### Objective
Understand different AI models' strengths.

### Setup
If you only have one AI model configured, that's fine—compare different prompting styles instead.

### Steps

1. **Create**: `ai-comparison.md`

2. **Add test content**:
   ```markdown
   # AI Model Comparison
   
   ## Test Prompt
   Explain quantum computing to a business executive
   ```

3. **Test with different approaches**:

   **Approach 1 - Direct**:
   - Select the prompt
   - `Ctrl+I`: "Answer this"
   
   **Approach 2 - Structured**:
   - Select the prompt  
   - `Ctrl+I`: "Answer with: 1) One sentence summary 2) Business impact 3) Real example 4) Next steps"
   
   **Approach 3 - Creative**:
   - Select the prompt
   - `Ctrl+I`: "Explain using a restaurant analogy"

4. **Compare** the outputs for:
   - Clarity
   - Usefulness
   - Creativity
   - Length

### Key Learning
Different prompting styles yield dramatically different results. Structure often beats complexity.

## Exercise 4: Batch Document Processing (8 minutes)

### Objective
Process multiple documents efficiently—a superpower unavailable in web AI tools.

### Steps

1. **Create folder**: `reports/`

2. **Create 3 files** with minimal content:
   - `q1-summary.md`: "Q1: Revenue was good"
   - `q2-summary.md`: "Q2: Challenges with supply chain"
   - `q3-summary.md`: "Q3: Strong recovery"

3. **Open each file** in tabs

4. **For each file**, select content and `Ctrl+I`:
   "Expand this into a professional quarterly business summary with sections for: Executive Summary, Key Metrics, Challenges, Opportunities, and Next Steps. Use realistic but generic numbers."

5. **Create** `annual-report.md`

6. **Prompt AI**: "Based on the quarterly reports in this project, create an executive summary for the annual report"

### Power Demonstrated
- Batch processing multiple files
- AI understanding project context
- Creating derivative documents

## Exercise 5: Custom Workflow Automation (5 minutes)

### Objective
Build your first automated workflow.

### Scenario
Automate your daily standup notes.

### Steps

1. **Create template**: `templates/daily-standup.md`
   ```markdown
   # Daily Standup - {{DATE}}
   
   ## Yesterday
   - 
   
   ## Today
   - 
   
   ## Blockers
   - None
   ```

2. **Create shortcut**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Search: "Preferences: Configure User Snippets"
   - Select "markdown"
   - Add:
   ```json
   {
     "Daily Standup": {
       "prefix": "standup",
       "body": [
         "# Daily Standup - ${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE}",
         "",
         "## Yesterday",
         "- $1",
         "",
         "## Today", 
         "- $2",
         "",
         "## Blockers",
         "- ${3:None}"
       ]
     }
   }
   ```

3. **Test it**:
   - New file: `standup-test.md`
   - Type: `standup` and press Tab
   - Fill in the placeholders

4. **Enhance with AI**:
   - Select your filled standup
   - `Ctrl+I`: "Make this more detailed and professional"

### Achievement
You've created a reusable automation that saves 5-10 minutes daily.

## Challenge Exercise: Your Real Project (Optional)

### The Test
Apply these skills to your actual work.

### Steps

1. **Open** a real document you're working on

2. **Identify** a section that needs improvement

3. **Use AI** to:
   - Expand sparse notes
   - Create visual diagrams
   - Generate alternatives
   - Check for completeness

4. **Compare** before and after

5. **Calculate** time saved

## Exercise Reflection Checklist

After completing exercises, you should be able to:

- [ ] Create documents 5-10x faster
- [ ] Generate professional diagrams from text
- [ ] Process multiple files efficiently
- [ ] Build simple automations
- [ ] Feel confident with AI prompting

## Common Patterns You've Learned

### The Enhancement Pattern
```
Basic content → Select → AI Prompt → Professional output
```

### The Visualization Pattern
```
Text description → Mermaid prompt → Instant diagram
```

### The Batch Pattern
```
Multiple files → Similar prompts → Consistent outputs
```

### The Template Pattern
```
Snippet → Quick entry → AI enhancement → Saved time
```

## Pro Tips from the Exercises

1. **Specific prompts** beat vague requests
2. **Structure** in prompts yields structure in output
3. **Context** from your project improves AI responses
4. **Templates + AI** = Massive time savings
5. **Multiple attempts** often yield better results

## What's Your Superpower?

By completing these exercises, you've discovered that VS Code + AI enables:

- **Speed**: 10x faster document creation
- **Quality**: Professional outputs every time
- **Consistency**: Standardized formats automatically
- **Creativity**: Instant visualizations and alternatives
- **Scale**: Process many documents at once

## Ready for Real Work?

These exercises barely scratch the surface. In the next section, you'll apply these skills to a complete project from your actual work.

Remember: The goal isn't to use AI for everything—it's to use AI where it multiplies your unique expertise and creativity.

---

Next: [Chapter 4: Real Project Application](./04_project.md)

[Back to Hands-On](./02_hands_on.md) | [Back to Module Overview](README.md)
