# Advanced Editing Features

## Learning Objectives

- Master multi-cursor editing for ultra-fast code manipulation
- Use Emmet for rapid HTML/CSS generation
- Leverage IntelliSense and code actions effectively
- Implement refactoring techniques
- Utilize advanced selection and text transformation
- Automate repetitive editing tasks

## Multi-Cursor Power

### Creating Multiple Cursors

**Methods:**
```
Alt+Click                → Add cursor at click position
Ctrl+Alt+↑/↓             → Add cursor above/below
Ctrl+D                   → Select next occurrence
Ctrl+Shift+L             → Select all occurrences
Alt+Shift+I              → Insert cursor at end of each selected line
Alt+Shift+Drag           → Column selection
```

### Practical Multi-Cursor Examples

**Example 1: Add semicolons to multiple lines**
```javascript
// Before:
const name = "John"
const age = 30
const city = "NYC"

// Steps:
// 1. Select all three lines
// 2. Alt+Shift+I (cursor at end of each line)
// 3. Type ;

// After:
const name = "John";
const age = 30;
const city = "NYC";
```

**Example 2: Convert array to object properties**
```javascript
// Before:
['name', 'email', 'phone', 'address']

// Steps:
// 1. Select 'name'
// 2. Ctrl+D three times (selects all words)
// 3. Ctrl+→ to move cursors after words
// 4. Type : "",

// After:
[name: "", email: "", phone: "", address: ""]
```

**Example 3: Wrap multiple lines in quotes**
```javascript
// Before:
apple
banana
cherry

// Steps:
// 1. Alt+Shift+I (cursor at end of each line)
// 2. Type "
// 3. Home key (move to start)
// 4. Type "

// After:
"apple"
"banana"
"cherry"
```

### Column Selection

**Box/rectangle selection:**
```
Alt+Shift+Drag (Windows/Linux)
Option+Shift+Drag (Mac)

Or: Ctrl+Alt+↑/↓
```

**Use case:**
```python
# Before:
def func1():
def func2():
def func3():

# Add 'pass' to all:
# 1. Column select after ':'
# 2. Type ' pass'

# After:
def func1(): pass
def func2(): pass
def func3(): pass
```

## Emmet

### HTML Emmet

**Shortcuts:**
```html
<!-- Type: div.container>ul>li*3>a -->
<!-- Press Tab -->

<div class="container">
  <ul>
    <li><a href=""></a></li>
    <li><a href=""></a></li>
    <li><a href=""></a></li>
  </ul>
</div>
```

**Common Patterns:**
```
!                    → HTML boilerplate
div.class#id         → <div class="class" id="id"></div>
ul>li*5              → List with 5 items
table>tr*3>td*4      → 3x4 table
.item$*3             → <div class="item1/2/3"></div>
lorem                → Lorem ipsum text
```

### CSS Emmet

```css
/* Type: m10 → margin: 10px; */
/* Type: p10-20 → padding: 10px 20px; */
/* Type: dF → display: flex; */
/* Type: jcC → justify-content: center; */
/* Type: fz16 → font-size: 16px; */
```

### Custom Emmet

**settings.json:**
```json
{
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "emmet.triggerExpansionOnTab": true,
  "emmet.showSuggestionsAsSnippets": true
}
```

## IntelliSense Mastery

### Trigger IntelliSense

```
Ctrl+Space           → Trigger suggestions
Ctrl+Shift+Space     → Trigger parameter hints
Ctrl+.               → Quick fix / code actions
```

### IntelliSense Features

**1. Auto-completion:**
```typescript
// Type: "arr" → Suggests: Array, ArrayBuffer, etc.
// Type: "cons" → Suggests: console, const, constructor
```

**2. Parameter info:**
```javascript
function greet(name: string, age: number) { }

greet(   // Ctrl+Shift+Space shows parameters
```

**3. Quick info:**
```typescript
// Hover over any symbol → Shows type, documentation
```

### Code Actions

**Trigger:** `Ctrl+.` on any code

**Examples:**
```typescript
// Lightbulb appears when code actions available

// 1. Import missing module
// 2. Implement interface
// 3. Add missing function
// 4. Convert to arrow function
// 5. Extract to function/variable
```

## Refactoring

### Built-in Refactorings

**Extract to Function:**
```javascript
// Before:
function processUser() {
  const fullName = user.firstName + " " + user.lastName;
  console.log(fullName);
}

// 1. Select: user.firstName + " " + user.lastName
// 2. Ctrl+Shift+R → "Extract to function"
// 3. Name: getFullName

// After:
function getFullName(user) {
  return user.firstName + " " + user.lastName;
}

function processUser() {
  const fullName = getFullName(user);
  console.log(fullName);
}
```

**Rename Symbol:** `F2`
```typescript
// Renames ALL occurrences across ALL files
const userName = "John";
console.log(userName);

// F2 on userName → Rename to: currentUser
// Updates everywhere automatically
```

**Extract to Constant:**
```javascript
// Before:
if (age > 18) { }
if (age > 18) { }

// 1. Select "18"
// 2. Ctrl+Shift+R → "Extract to constant"

// After:
const MINIMUM_AGE = 18;
if (age > MINIMUM_AGE) { }
if (age > MINIMUM_AGE) { }
```

### Language-Specific Refactoring

**TypeScript:**
```
- Convert to template string
- Add/remove braces
- Convert import
- Infer function return type
- Generate 'get' and 'set' accessors
```

**Python:**
```
- Extract method
- Extract variable
- Sort imports
- Remove unused imports
```

## Advanced Selection

### Smart Selection (Expand/Shrink)

```
Shift+Alt+→          → Expand selection
Shift+Alt+←          → Shrink selection
```

**Example:**
```javascript
console.log(user.profile.email);

// Start cursor on 'email'
// Shift+Alt+→ once: selects 'email'
// Again: 'user.profile.email'
// Again: '(user.profile.email)'
// Again: 'console.log(user.profile.email)'
```

### Select All Occurrences

```
Ctrl+F2              → Select all occurrences of current word
```

**Use case:**
```javascript
// Rename variable instantly
const userName = "John";
const greeting = `Hello ${userName}`;
console.log(userName);

// 1. Cursor on userName
// 2. Ctrl+F2
// 3. Type new name: currentUser
// All occurrences renamed!
```

### Line Selection

```
Ctrl+L               → Select current line
Ctrl+Shift+L         → Select all lines with current selection
```

## Text Transformation

### Case Transformation

```
Transform to Uppercase    → Ctrl+K Ctrl+U
Transform to Lowercase    → Ctrl+K Ctrl+L
Transform to Title Case   → Install "Change Case" extension
```

### Join Lines

```
Ctrl+J               → Join selected lines
```

**Example:**
```javascript
// Before:
const name =
  "John";

// Select both lines, Ctrl+J

// After:
const name = "John";
```

### Sort Lines

```
Ctrl+Shift+P → "Sort Lines Ascending"
Ctrl+Shift+P → "Sort Lines Descending"
```

**Example:**
```
zebra
apple
banana

→ Sort Ascending →

apple
banana
zebra
```

### Trim Trailing Whitespace

```json
{
  "files.trimTrailingWhitespace": true  // Auto-trim on save
}
```

**Or manually:**
```
Ctrl+Shift+P → "Trim Trailing Whitespace"
```

## Code Folding

### Fold/Unfold

```
Ctrl+Shift+[         → Fold region
Ctrl+Shift+]         → Unfold region
Ctrl+K Ctrl+0        → Fold all
Ctrl+K Ctrl+J        → Unfold all
Ctrl+K Ctrl+[1-7]    → Fold level 1-7
```

### Fold Regions

**Custom folding:**
```javascript
// #region Database Functions
function connect() { }
function query() { }
function disconnect() { }
// #endregion

// Folded shows: "Database Functions..."
```

**Language-specific:**
```python
# region Data Processing
def process(): pass
# endregion
```

## Format Document

### Auto-Format

```
Shift+Alt+F          → Format entire document
Ctrl+K Ctrl+F        → Format selection
```

**Format on Save:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

### Organize Imports

```
Shift+Alt+O          → Organize imports (remove unused, sort)
```

**Auto-organize on save:**
```json
{
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit"
  }
}
```

## Advanced Find & Replace

### Regex Find & Replace

**Example: Convert to template literals**
```javascript
// Find (regex):
console\.log\("(.+)" \+ (.+) \+ "(.+)"\)

// Replace:
console.log(`$1${$2}$3`)

// Before:
console.log("User: " + userName + " logged in")

// After:
console.log(`User: ${userName} logged in`)
```

### Multi-File Find & Replace

```
Ctrl+Shift+H         → Find & Replace in files

Options:
- Match case (Alt+C)
- Whole word (Alt+W)
- Regex (Alt+R)
- Files to include
- Files to exclude
```

**Example:**
```
Find: oldFunctionName
Replace: newFunctionName
Files to include: **/*.ts
Click "Replace All" → Updates across entire project
```

## Productivity Tricks

### Duplicate Line

```
Shift+Alt+↓          → Duplicate line down
Shift+Alt+↑          → Duplicate line up
```

### Move Line

```
Alt+↑                → Move line up
Alt+↓                → Move line down
```

### Delete Line

```
Ctrl+Shift+K         → Delete line
```

### Insert Line

```
Ctrl+Enter           → Insert line below
Ctrl+Shift+Enter     → Insert line above
```

### Comment Toggle

```
Ctrl+/               → Toggle line comment
Shift+Alt+A          → Toggle block comment
```

### Bracket Matching

```
Ctrl+Shift+\         → Jump to matching bracket
```

## Pro Tips

### Tip 1: Record Macros (Experimental)

**Install "Macros" extension:**
```
1. Record action sequence
2. Assign keyboard shortcut
3. Replay anytime
```

### Tip 2: Snippets for Common Patterns

**Create snippet:**
```json
// User snippets
{
  "Try-Catch": {
    "prefix": "tryc",
    "body": [
      "try {",
      "  $1",
      "} catch (error) {",
      "  console.error('$2:', error);",
      "  $3",
      "}"
    ]
  }
}
```

### Tip 3: Zen Mode for Focus

```
Ctrl+K Z             → Toggle Zen Mode
```

Fullscreen, no distractions, just code.

### Tip 4: Sticky Scroll

```json
{
  "editor.stickyScroll.enabled": true
}
```

Shows current function/class at top while scrolling.

### Tip 5: Linked Editing

```json
{
  "editor.linkedEditing": true
}
```

Edit HTML opening tag → closing tag updates automatically!

## Common Pitfalls

### Pitfall 1: Accidental Multi-Cursor

**Problem:** Cursors everywhere, don't know how to escape
**Solution:** `Esc` key clears all cursors

### Pitfall 2: Emmet Not Working

**Problem:** Tab doesn't expand Emmet
**Solution:**
```json
{
  "emmet.triggerExpansionOnTab": true
}
```

### Pitfall 3: Wrong Formatter

**Problem:** Format on save uses wrong formatter
**Solution:** Set per language
```json
{
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Pitfall 4: Find & Replace Too Broad

**Problem:** Replaced wrong occurrences
**Solution:**
1. Use "Match whole word" (Alt+W)
2. Preview before "Replace All"
3. Use "Files to include" filter

## Assessment

**Master Advanced Editing:**

1. **Multi-Cursor Challenge:**
   - Convert array to object in 30 seconds
   - Add quotes to 20 words simultaneously

2. **Emmet Challenge:**
   - Create complex HTML structure with one line
   - Generate CSS properties with shortcuts

3. **Refactoring Challenge:**
   - Extract 5 functions from monolithic code
   - Rename variables across 10 files

4. **Find & Replace Challenge:**
   - Convert 50 console.log to template literals
   - Regex replace across project

**Success Criteria:**
- [ ] Comfortable with multi-cursor
- [ ] Emmet muscle memory
- [ ] Refactoring workflows mastered
- [ ] 5x faster editing

## Resources

- [Basic Editing](https://code.visualstudio.com/docs/editor/codebasics)
- [Emmet Documentation](https://docs.emmet.io/)
- [Refactoring](https://code.visualstudio.com/docs/editor/refactoring)

---

**Time**: 3-4 hours
**Difficulty**: Intermediate to Advanced
**Completion**: Congratulations! You've mastered VS Code!
