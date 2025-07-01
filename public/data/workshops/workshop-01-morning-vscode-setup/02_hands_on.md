# Chapter 2: Hands-On Setup - Building Your Command Centre

## Your 90-Minute Transformation Begins Now

This chapter will take you from zero to a fully configured AI command centre. Follow each step carefully—screenshots and clear instructions guide you through every click.

## 2.1 Installing VS Code

### Step 1: Download VS Code

1. **Navigate to**: https://code.visualstudio.com/
2. **Click**: The big blue "Download" button
3. **Select**: Your operating system (Windows/Mac/Linux)
4. **Run**: The installer when download completes

### Step 2: First Launch

When VS Code opens for the first time:

1. **Welcome Screen**: You'll see a welcome tab
2. **Theme Selection**: Choose your preferred colour theme
3. **Skip Sync**: We'll set this up properly later

```mermaid
graph LR
    A[Download] --> B[Install]
    B --> C[Launch]
    C --> D[Configure]
    
    style D fill:#4fc3f7,stroke:#01579b,stroke-width:3px
```

## 2.2 Essential Extensions Installation

### The Power-Up Process

Think of this as installing essential apps on a new phone. Each extension adds specific superpowers.

### Step 1: Open Extensions Panel

- **Method 1**: Click the Extensions icon in the left sidebar (looks like 4 squares)
- **Method 2**: Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)

### Step 2: Install Core Extensions

Search for and install these essential extensions:

#### 1. **Continue - AI Assistant** (Free Tier Available)
```
Search: Continue
Publisher: Continue
Purpose: Connect to multiple AI models
Install: Click "Install"
```

#### 2. **Markdown All in One**
```
Search: Markdown All in One
Publisher: Yu Zhang
Purpose: Enhanced document editing
Install: Click "Install"
```

#### 3. **Mermaid Markdown Syntax Highlighting**
```
Search: Mermaid
Publisher: Brian Hung
Purpose: Create diagrams from text
Install: Click "Install"
```

#### 4. **GitLens**
```
Search: GitLens
Publisher: GitKraken
Purpose: Supercharged version control
Install: Click "Install"
```

#### 5. **Live Preview**
```
Search: Live Preview
Publisher: Microsoft
Purpose: See changes in real-time
Install: Click "Install"
```

### Step 3: Verify Installation

After installing, you should see:
- New icons in your sidebar
- Extension welcome pages (can close these)
- "Installed" checkmarks in Extensions panel

## 2.3 Container Setup (Your Perfect Workspace)

### Understanding Containers

Before we set up, remember: A container is like a perfect workspace that:
- Comes with all tools pre-installed
- Works the same on every computer
- Can't mess up your main system

### Step 1: Install Docker Desktop

1. **Navigate to**: https://www.docker.com/products/docker-desktop
2. **Download**: For your operating system
3. **Install**: Run the installer
4. **Start Docker**: Launch Docker Desktop
5. **Wait**: For "Docker Desktop is running" message

### Step 2: Install Dev Containers Extension

Back in VS Code:
1. **Open**: Extensions panel (`Ctrl+Shift+X`)
2. **Search**: "Dev Containers"
3. **Publisher**: Microsoft
4. **Install**: Click "Install"

### Step 3: Create Your First Container

1. **Open Command Palette**: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. **Type**: "Dev Containers: New"
3. **Select**: "Dev Containers: New Dev Container..."
4. **Choose**: "Python 3" (works for any document type)
5. **Select**: "3.11-bullseye" or latest version
6. **Wait**: 2-3 minutes for first-time setup

You'll know it's working when:
- Bottom-left shows "Dev Container: Python 3"
- Terminal shows a Linux prompt
- Everything feels snappier

## 2.4 AI Integration Setup

### Connecting Your AI Brain

Now for the exciting part—connecting AI directly to your workspace.

### Step 1: Configure Continue

1. **Click**: Continue icon in sidebar (looks like `>>`)
2. **First Run**: Click "Get Started"
3. **Select Model Provider**: We'll start with free options

### Step 2: Free AI Options

#### Option A: Groq (Recommended for Speed)
1. **Visit**: https://console.groq.com/
2. **Sign Up**: Create free account
3. **Get API Key**: Dashboard → API Keys → Create
4. **Copy Key**: Keep this safe!

In Continue:
1. **Click**: Settings (gear icon)
2. **Add Provider**: 
   ```json
   {
     "provider": "groq",
     "apiKey": "YOUR_API_KEY_HERE",
     "model": "llama-3.1-70b"
   }
   ```

#### Option B: Google Gemini (Good for Long Context)
1. **Visit**: https://makersuite.google.com/app/apikey
2. **Create Key**: Click "Create API Key"
3. **Copy Key**: Save securely

In Continue:
```json
{
  "provider": "gemini",
  "apiKey": "YOUR_API_KEY_HERE",
  "model": "gemini-1.5-flash"
}
```

### Step 3: Test Your AI

1. **Open**: Any text file (or create new)
2. **Type**: "Hello AI, can you help me?"
3. **Select**: Your text
4. **Press**: `Ctrl+I` (or `Cmd+I`)
5. **Watch**: AI responds directly in your editor!

## 2.5 Project Organisation

### Creating Your First AI-Enhanced Project

Let's set up a real project structure:

### Step 1: Create Project Folder

1. **File Menu**: File → Open Folder
2. **Create New Folder**: Name it "my-ai-workspace"
3. **Open**: Select the folder

### Step 2: Initialize Structure

Create these folders (right-click in Explorer panel):

```
my-ai-workspace/
├── documents/      # Your main work
├── research/       # Reference materials
├── templates/      # Reusable formats
├── outputs/        # AI-generated content
└── .vscode/        # Settings (auto-created)
```

### Step 3: Create Your First Document

1. **Right-click** `documents` folder
2. **New File**: `project-plan.md`
3. **Add Content**:
   ```markdown
   # My First AI-Enhanced Project
   
   ## Objective
   Learn to use VS Code as my AI command centre
   
   ## Today's Goals
   - [ ] Complete VS Code setup
   - [ ] Connect AI assistant
   - [ ] Create first AI-enhanced document
   - [ ] Test automation features
   ```

### Step 4: Enable AI Features

1. **Open** your new file
2. **Select** a line of text
3. **Right-click** → "Continue: Edit"
4. **Type**: "Add more detail to this section"
5. **Watch** AI enhance your content!

## 2.6 Customization for Your Profession

### Tailoring to Your Needs

Based on your profession, add specific extensions:

#### For Academics
- **LaTeX Workshop**: Full LaTeX support
- **Zotero Integration**: Reference management
- **Pandoc**: Document conversion

#### For Business Professionals
- **Excel Viewer**: Spreadsheet preview
- **Draw.io Integration**: Diagramming
- **TODO Highlight**: Task management

#### For Creative Professionals
- **Image Preview**: Visual assets
- **Color Highlight**: Design work
- **Lorem Ipsum**: Placeholder text

### Quick Settings Adjustment

1. **Open Settings**: `Ctrl+,` (or `Cmd+,`)
2. **Search** for these and adjust:
   - `editor.fontSize`: Set to comfortable size (14-16)
   - `editor.wordWrap`: Turn on for documents
   - `files.autoSave`: Set to "afterDelay"

## 2.7 Verification Checklist

### Confirm Everything Works

Run through this checklist:

- [ ] VS Code launches successfully
- [ ] Extensions panel shows installed extensions
- [ ] Docker Desktop is running (if using containers)
- [ ] Continue sidebar appears with AI ready
- [ ] Can create and edit files
- [ ] AI responds to prompts
- [ ] Project folder structure created

### Quick Tests

1. **Create Test File**: `test.md`
2. **Type**: "AI, write a haiku about productivity"
3. **Select & Press**: `Ctrl+I`
4. **Success**: If AI responds, you're ready!

## Common Issues & Solutions

### "Cannot connect to Docker"
- **Solution**: Ensure Docker Desktop is running
- **Alternative**: Work without containers initially

### "AI not responding"
- **Check**: API key is correctly entered
- **Verify**: Internet connection active
- **Try**: Different AI provider

### "Extensions not working"
- **Reload**: `Ctrl+Shift+P` → "Reload Window"
- **Update**: Check for VS Code updates

## Your Achievement Unlocked!

Congratulations! You now have:

✅ Professional AI command centre  
✅ Direct access to multiple AI models  
✅ Organized project structure  
✅ Tools that professional developers use  
✅ Complete control over your AI workflow  

## Next Steps

With your command centre ready, let's practice using these powerful tools. The next section contains hands-on exercises to cement your new skills.

### Pro Tips Before Moving On

1. **Keyboard Shortcuts**: Start memorizing `Ctrl+I` for AI
2. **Explore**: Click around, you can't break anything
3. **Experiment**: Try different AI prompts
4. **Save Often**: `Ctrl+S` is your friend

---

Next: [Chapter 3: Practical Exercises - Flex Your New Powers](./03_exercises.md)

[Back to Concepts](./01_concepts.md) | [Back to Module Overview](README.md)
