# Prerequisites - AI-Powered QA Automation

## Required Knowledge

### Programming Fundamentals (Essential)
- Basic JavaScript/TypeScript syntax and concepts
- Understanding of functions, classes, and async/await
- Familiarity with ES6+ features (arrow functions, destructuring)
- Basic understanding of React (for component testing examples)

### Development Tools
- Command line basics (cd, ls, running commands)
- npm/yarn package management
- Git fundamentals (clone, commit, push)
- Code editor usage (VS Code recommended)

### Optional But Helpful
- Previous experience with any testing framework
- Understanding of HTTP requests and APIs
- Familiarity with CI/CD concepts
- Basic understanding of browser DevTools

---

## Required Setup

### Essential Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or higher
   npm --version   # Should be 9.0.0 or higher
   ```
   Install from: [nodejs.org](https://nodejs.org/)

2. **Git**
   ```bash
   git --version  # Should be 2.30.0 or higher
   ```
   Install from: [git-scm.com](https://git-scm.com/)

3. **VS Code (Recommended)**
   - Install from: [code.visualstudio.com](https://code.visualstudio.com/)
   - Recommended extensions:
     - Vitest (ZixuanChen.vitest-explorer)
     - Playwright Test for VSCode (ms-playwright.playwright)
     - Error Lens (usernamehw.errorlens)
     - JavaScript and TypeScript Nightly

4. **Modern Web Browser**
   - Chrome, Firefox, or Edge (latest version)
   - Playwright will install its own browser binaries

### Testing Frameworks (Installed During Workshop)

These will be installed together as part of workshop exercises:

```bash
# We'll install these during hands-on exercises
npm install -D vitest @vitest/ui
npm install -D @playwright/test
npm install -D @testing-library/react @testing-library/jest-dom
```

**No need to install beforehand!**

---

## Recommended Preparation

### Before the Workshop

1. **Have a Project Ready** (15 minutes)
   - Simple React application (or we'll create one with Vite)
   - A few functions/components you want to test
   - Or use our starter template (provided in workshop)

2. **Review JavaScript Basics** (30 minutes if rusty)
   - [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
   - Focus on: functions, promises, async/await

3. **Familiarize with Testing Concepts** (20 minutes)
   - Read: [What is Software Testing?](https://www.guru99.com/software-testing-introduction-importance.html)
   - Watch: [Testing Basics](https://www.youtube.com/watch?v=r9HdJ8P6GQI) (10 min video)

4. **AI Account Setup** (Optional)
   - Claude account at [claude.ai](https://claude.ai)
   - Or ChatGPT account at [chat.openai.com](https://chat.openai.com)
   - We'll use these for AI-assisted test generation

---

## Technical Requirements

### Hardware
- **CPU:** Dual-core processor (2+ cores)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 5GB free space (for Node.js, dependencies, browsers)
- **Display:** 1920x1080 or higher recommended

### Software
- **Operating System:** Windows 10+, macOS 10.15+, or Linux
- **Browser:** Modern browser with developer tools
- **Terminal:** Command Prompt, PowerShell, Terminal, or iTerm2

### Network
- **Internet Connection:** Stable broadband (10+ Mbps)
- **Firewall:** Must allow npm package downloads
- **Proxy:** If behind corporate proxy, ensure npm is configured

---

## Pre-Workshop Checklist

Complete this **24 hours before** the workshop:

### Software Installation
- [ ] Node.js 18+ installed and verified (`node --version`)
- [ ] npm package manager working (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] VS Code or preferred editor installed
- [ ] Modern web browser available

### Knowledge Review
- [ ] Comfortable with JavaScript/TypeScript basics
- [ ] Can run npm commands in terminal
- [ ] Understand what a function/component is
- [ ] Know how to import/export modules

### Optional but Recommended
- [ ] Claude or ChatGPT account created
- [ ] Test project ready or willing to create during workshop
- [ ] Reviewed basic testing concepts

---

## Workshop Environment Setup

During the first 15 minutes of the workshop, we'll set up:

```bash
# Create test project
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install

# Install testing dependencies
npm install -D vitest @vitest/ui
npm install -D @playwright/test
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event

# Install Playwright browsers
npx playwright install
```

**Note:** Playwright browser installation requires ~500MB download.

---

## Troubleshooting Common Setup Issues

### Node.js/npm Issues

**Problem:** `node: command not found`

**Solution:**
1. Download and install from [nodejs.org](https://nodejs.org/)
2. Restart terminal/computer
3. Verify installation: `node --version`

**Problem:** Permission errors when installing packages

**Solution (macOS/Linux):**
```bash
# Use npx instead of global install
npx vitest

# Or fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

**Solution (Windows):**
- Run terminal as Administrator
- Or use `--location=user` flag: `npm install -g --location=user vitest`

### Playwright Installation Issues

**Problem:** Playwright browser download fails

**Solution:**
```bash
# Manual browser installation
npx playwright install --force chromium

# Or set specific browser only
npx playwright install chromium
```

**Problem:** Missing system dependencies (Linux)

**Solution:**
```bash
# Ubuntu/Debian
sudo npx playwright install-deps

# Or install manually
sudo apt-get install libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0
```

### VS Code Extension Issues

**Problem:** Vitest extension not working

**Solution:**
1. Open VS Code Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Reload Window"
3. Ensure `vitest.config.ts` exists in project root

---

## Getting Help

### During Setup

1. **Workshop Discord**
   - Channel: `#workshop-05-help`
   - Pre-workshop setup support available

2. **Office Hours**
   - Monday-Friday, 9 AM - 5 PM
   - Schedule 15-minute slot for installation help

3. **Day-Of Support**
   - Arrive 15 minutes early
   - Teaching assistants available for setup

### Documentation Links

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [npm Troubleshooting](https://docs.npmjs.com/troubleshooting)

---

## What You'll Need During Workshop

### Files to Have Open
- Code editor (VS Code)
- Terminal window
- Web browser
- Workshop slides (provided)

### Accounts to Be Logged Into
- Claude or ChatGPT (for AI test generation)
- GitHub (optional, for CI/CD section)

### Mental Preparation
- Be ready to write code along with instructor
- Ask questions when concepts are unclear
- Prepare to share screen for debugging help

---

## Sample Pre-Workshop Exercise

Test your environment by running this simple program:

```javascript
// test-setup.js
function add(a, b) {
  return a + b;
}

console.log("Node.js is working!");
console.log("2 + 2 =", add(2, 2));
console.log("Environment ready for workshop!");
```

Run it:
```bash
node test-setup.js
```

Expected output:
```
Node.js is working!
2 + 2 = 4
Environment ready for workshop!
```

If you see this output, you're ready to go! ✅

---

## Ready to Test?

Once you've completed the pre-workshop checklist, you're prepared for the morning QA Automation session. We'll transform you from manual tester to automation expert in 3 hours!

**See you at the workshop!** 🧪
