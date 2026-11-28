# Task Automation and Build Systems

## Learning Objectives

- Create and configure tasks for common workflows
- Integrate build systems (npm, make, cargo, etc.)
- Set up problem matchers for error detection
- Automate testing, linting, and deployment
- Chain tasks for complex workflows

## Tasks Overview

VS Code tasks automate repetitive commands:

```
Instead of: Ctrl+` → npm run build → npm test
Use: Ctrl+Shift+B (one keypress)
```

## Creating Tasks

### Quick Task

**Run ad-hoc command:**
```
1. Ctrl+Shift+P → "Tasks: Run Task"
2. "Configure Task"
3. Select template or "Create tasks.json"
```

### tasks.json Structure

**Location:** `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Project",
      "type": "shell",
      "command": "npm run build",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": ["$tsc"]
    }
  ]
}
```

**Key Properties:**
- `label`: Task name
- `type`: `shell` or `process`
- `command`: Command to run
- `group`: Task category (build, test, none)
- `problemMatcher`: Parse errors from output

## Common Task Configurations

### Node.js / npm

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: install",
      "type": "shell",
      "command": "npm install",
      "problemMatcher": []
    },
    {
      "label": "npm: build",
      "type": "npm",
      "script": "build",
      "group": "build",
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "npm: test",
      "type": "npm",
      "script": "test",
      "group": "test",
      "isBackground": false
    },
    {
      "label": "npm: dev",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^.*$",
          "file": 1,
          "location": 2,
          "message": 3
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Starting",
          "endsPattern": "ready"
        }
      }
    }
  ]
}
```

### Python

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Python: Run Current File",
      "type": "shell",
      "command": "${command:python.interpreterPath}",
      "args": ["${file}"],
      "problemMatcher": []
    },
    {
      "label": "pytest",
      "type": "shell",
      "command": "pytest",
      "args": ["-v", "tests/"],
      "group": "test",
      "problemMatcher": {
        "pattern": {
          "regexp": "^(.+):(\\d+):\\s+(.+)$",
          "file": 1,
          "line": 2,
          "message": 3
        }
      }
    },
    {
      "label": "Black Format",
      "type": "shell",
      "command": "black",
      "args": ["."],
      "problemMatcher": []
    }
  ]
}
```

### Rust (Cargo)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "cargo build",
      "type": "cargo",
      "command": "build",
      "problemMatcher": ["$rustc"],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "cargo test",
      "type": "cargo",
      "command": "test",
      "problemMatcher": ["$rustc"],
      "group": "test"
    },
    {
      "label": "cargo run",
      "type": "cargo",
      "command": "run",
      "problemMatcher": ["$rustc"]
    }
  ]
}
```

### Docker

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "docker-build",
      "type": "docker-build",
      "dockerBuild": {
        "tag": "myapp:latest",
        "dockerfile": "${workspaceFolder}/Dockerfile",
        "context": "${workspaceFolder}"
      }
    },
    {
      "label": "docker-run",
      "type": "docker-run",
      "dependsOn": ["docker-build"],
      "dockerRun": {
        "image": "myapp:latest",
        "ports": [
          {
            "containerPort": 3000,
            "hostPort": 3000
          }
        ]
      }
    }
  ]
}
```

## Problem Matchers

Parse errors from command output:

### Built-in Matchers

```json
{
  "problemMatcher": "$tsc"    // TypeScript
  "problemMatcher": "$eslint-compact"  // ESLint
  "problemMatcher": "$gcc"     // GCC
  "problemMatcher": "$rustc"   // Rust
}
```

### Custom Problem Matcher

```json
{
  "problemMatcher": {
    "owner": "mycompiler",
    "fileLocation": ["relative", "${workspaceFolder}"],
    "pattern": {
      "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
      "file": 1,
      "line": 2,
      "column": 3,
      "severity": 4,
      "message": 5
    }
  }
}
```

**Example output to match:**
```
src/app.ts:23:5: error: Type 'string' is not assignable to type 'number'
```

## Task Dependencies

### Sequential Tasks

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Clean",
      "type": "shell",
      "command": "rm -rf dist"
    },
    {
      "label": "Build",
      "type": "shell",
      "command": "npm run build",
      "dependsOn": ["Clean"]
    },
    {
      "label": "Deploy",
      "type": "shell",
      "command": "./deploy.sh",
      "dependsOn": ["Build"]
    }
  ]
}
```

### Parallel Tasks

```json
{
  "label": "Build All",
  "dependsOn": ["Build Frontend", "Build Backend"],
  "dependsOrder": "parallel"
}
```

## Keyboard Shortcuts

**Default Build Task:**
```
Ctrl+Shift+B (Cmd+Shift+B)
```

**Run Any Task:**
```
Ctrl+Shift+P → "Tasks: Run Task"
```

**Custom Shortcuts:**
```json
// keybindings.json
[
  {
    "key": "ctrl+shift+t",
    "command": "workbench.action.tasks.test"
  },
  {
    "key": "ctrl+shift+r",
    "command": "workbench.action.tasks.runTask",
    "args": "npm: dev"
  }
]
```

## Practical Examples

### Full-Stack Development

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Backend",
      "type": "npm",
      "script": "dev",
      "path": "backend/",
      "isBackground": true,
      "problemMatcher": {
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Starting",
          "endsPattern": "ready"
        }
      }
    },
    {
      "label": "Start Frontend",
      "type": "npm",
      "script": "dev",
      "path": "frontend/",
      "isBackground": true
    },
    {
      "label": "Start All",
      "dependsOn": ["Start Backend", "Start Frontend"],
      "dependsOrder": "parallel",
      "problemMatcher": []
    }
  ]
}
```

**Usage:** Ctrl+Shift+P → "Run Task" → "Start All"

### CI/CD Simulation

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Install Dependencies",
      "type": "shell",
      "command": "npm ci"
    },
    {
      "label": "Lint",
      "type": "shell",
      "command": "npm run lint",
      "dependsOn": ["Install Dependencies"],
      "problemMatcher": ["$eslint-compact"]
    },
    {
      "label": "Test",
      "type": "shell",
      "command": "npm test",
      "dependsOn": ["Install Dependencies"]
    },
    {
      "label": "Build",
      "type": "shell",
      "command": "npm run build",
      "dependsOn": ["Lint", "Test"]
    },
    {
      "label": "CI Pipeline",
      "dependsOn": ["Build"],
      "dependsOrder": "sequence"
    }
  ]
}
```

## Pro Tips

### Tip 1: Input Variables

```json
{
  "label": "Deploy to Environment",
  "type": "shell",
  "command": "./deploy.sh ${input:environment}",
  "inputs": [
    {
      "id": "environment",
      "type": "pickString",
      "description": "Select environment:",
      "options": ["dev", "staging", "production"],
      "default": "dev"
    }
  ]
}
```

### Tip 2: Presentation Options

```json
{
  "presentation": {
    "reveal": "always",     // always, never, silent
    "panel": "shared",      // shared, dedicated, new
    "focus": false,         // Focus terminal?
    "clear": true,          // Clear before running
    "showReuseMessage": false
  }
}
```

### Tip 3: Environment Variables

```json
{
  "label": "Run with Env",
  "type": "shell",
  "command": "node app.js",
  "options": {
    "env": {
      "NODE_ENV": "development",
      "API_KEY": "${env:API_KEY}"
    }
  }
}
```

### Tip 4: Pre-launch Tasks

**Combine with debugging:**
```json
// launch.json
{
  "name": "Launch",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/app.js",
  "preLaunchTask": "npm: build"
}
```

### Tip 5: Terminal Split

```json
{
  "presentation": {
    "panel": "dedicated",
    "group": "myGroup"
  }
}
```

All tasks with same group share terminal split.

## Common Pitfalls

### Pitfall 1: Wrong Working Directory

**Problem:** Commands fail because CWD is wrong
**Solution:**
```json
{
  "options": {
    "cwd": "${workspaceFolder}/backend"
  }
}
```

### Pitfall 2: Background Tasks Never Finish

**Problem:** Task runs forever
**Solution:** Configure background pattern
```json
{
  "isBackground": true,
  "problemMatcher": {
    "background": {
      "beginsPattern": "Starting",
      "endsPattern": "ready"
    }
  }
}
```

### Pitfall 3: Problem Matcher Doesn't Work

**Problem:** Errors not showing in Problems panel
**Solution:** Test regexp pattern
```
Use regex tester with sample output
Verify file paths are correct
```

## Assessment

**Create a Complete Workflow:**

1. Task: Clean dist folder
2. Task: Run linter
3. Task: Run tests
4. Task: Build project
5. Task: Chain all with proper dependencies
6. Add keyboard shortcut

## Resources

- [Tasks Documentation](https://code.visualstudio.com/docs/editor/tasks)
- [Task Schema Reference](https://code.visualstudio.com/docs/editor/tasks-appendix)

---

**Time**: 2-3 hours
**Difficulty**: Intermediate
