# Community Forum UI Components

## Toast Notification System

### Overview

A comprehensive toast notification system providing modern, user-friendly notifications with visual polish, animations, and smart error handling. Replaces generic `alert()` calls with non-blocking notifications featuring type-specific styling, action buttons, and accessibility features.

### Quick Start

```typescript
import { toast } from '$lib/stores/toast';

// Basic notifications
toast.success('Operation completed!');
toast.error('Something went wrong!');
toast.warning('Please be careful!');
toast.info('FYI: Important information');

// With retry button
toast.error('Failed to save', 7000, {
  label: 'Retry',
  callback: saveChanges
});

// Success helpers
toast.saved();           // "Changes saved!" (3s)
toast.messageSent();     // "Message sent successfully!" (3s)
toast.profileUpdated();  // "Profile updated successfully!" (3s)
toast.deleted();         // "Deleted successfully!" (3s)
toast.copied();          // "Copied to clipboard!" (2s)
```

---

## System Architecture

### Component Hierarchy

```
Application Layer (Components, Routes, Pages)
    ↓ import { toast }
Toast Store (Svelte)
    ↓ subscribe
Toast Component (Svelte)
    ↓ renders in
Browser DOM (fixed position top-right)
```

### Data Flow

#### Adding a Toast

```
Component/Page
    ↓ toast.error('Failed', 7000, { label: 'Retry', callback: fn })
Toast Store
    ├─ Generate unique ID
    ├─ Create Toast object
    ├─ Check queue size (remove oldest if > 3)
    ├─ Add to toasts array
    ├─ Set timeout for auto-dismiss
    └─ Update Svelte store (triggers reactivity)
    ↓
Toast Component
    ├─ Render new toast
    ├─ Play sound (if enabled)
    ├─ Trigger haptic (if mobile)
    └─ Start animations
```

#### Dismissing a Toast

```
User Action (click X or action button)
    ↓
Toast Component handleDismiss(id) or handleAction(id, callback)
    ↓
Toast Store
    ├─ Clear timeout
    ├─ Remove from timeouts Map
    ├─ Filter out from toasts array
    ├─ Update Svelte store
    └─ Execute callback (if action button)
    ↓
Toast Component React to store update
    └─ Exit animation and remove from DOM
```

#### Auto-Dismiss Flow

```
Toast Added (duration = 5000ms)
    ↓
setTimeout(5000)
    ↓
Timeout Callback → toast.remove(id)
    ↓
Toast Store
    ├─ Remove from toasts array
    ├─ Delete from timeouts Map
    └─ Update store
    ↓
Toast Component
    └─ Fade out and remove
```

### State Management

#### Toast Store State

```typescript
interface ToastStore {
  toasts: Toast[]  // Array of visible toasts
}

interface Toast {
  id: string               // Unique identifier
  message: string          // Display message
  variant: Variant         // 'success' | 'error' | 'warning' | 'info'
  duration?: number        // Auto-dismiss time (ms), 0 = never
  dismissible?: boolean    // Show X button
  action?: {
    label: string          // Button text
    callback: () => void   // Click handler
  }
}
```

#### Internal State

```typescript
const { subscribe, update } = writable<ToastStore>({ toasts: [] })

let idCounter = 0                           // Unique ID generation
const timeouts = new Map<string, Timeout>() // Timeout tracking

const MAX_TOASTS = 3                        // Queue limit
```

### Toast Lifecycle

```
1. Creation
   ├─ Generate ID: `toast-${Date.now()}-${idCounter++}`
   ├─ Create Toast object
   ├─ Validate queue size (remove oldest if full)
   └─ Add to store

2. Active
   ├─ Display in UI
   ├─ Progress bar animating
   ├─ Timeout counting down
   └─ User can interact (dismiss, click action)

3. Dismissal
   ├─ Trigger: Timeout, manual click, or action click
   ├─ Clear timeout
   ├─ Execute callback (if action)
   ├─ Remove from store
   └─ Exit animation

4. Cleanup
   ├─ Remove from DOM
   ├─ Delete timeout reference
   └─ Free memory
```

### Animation Timeline

```
0ms       300ms      5000ms    5300ms
│         │          │         │
├─────────┤          │         │
│ Slide-in│          │         │
│ (in)    │          │         │
├─────────┤          │         │
          │          ├─────────┤
          │          │ Slide-out│
          │          │ (out)    │
          │          │          │
          ├──────────┴──────────┴─────→ Removed
          │    Visible + Progress
          └─ 300ms cubic-bezier(0.16, 1, 0.3, 1)
```

### Performance Considerations

#### Memory Management

- **Queue Limit**: Enforced maximum of 3 toasts to prevent UI clutter
- **Timeout Cleanup**: Store timeouts in Map for proper cleanup
- **Automatic Removal**: Oldest toast removed when limit exceeded

#### Rendering Optimization

- **Reactive Subscriptions**: Svelte's `$:` only updates when data changes
- **Key-based Rendering**: Use `each` with ID keys to render only new/changed toasts
- **GPU Acceleration**: CSS animations for smooth performance

#### CSS Architecture

```
Toast Container
  • position: fixed
  • top: 1rem
  • right: 1rem
  • z-index: 50
  • display: flex
  • flex-direction: column
  • gap: 0.75rem

Toast Item
  • backdrop-filter: blur(12px)
  • border: 2px solid
  • border-radius: 0.5rem
  • padding: 1rem
  • box-shadow: 0 10px 25px rgba(0,0,0,0.1)
  • animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)

Progress Bar
  • position: absolute
  • bottom: 0
  • height: 4px
  • animation: progress linear forwards
```

---

## API Reference

### Basic Methods

| Method | Description | Duration | Example |
|--------|-------------|----------|---------|
| `toast.success(msg, duration?)` | Green success notification | 5s default | `toast.success('Done!')` |
| `toast.error(msg, duration?, action?)` | Red error notification | 7s default | `toast.error('Failed!')` |
| `toast.warning(msg, duration?, action?)` | Yellow warning notification | 6s default | `toast.warning('Careful!')` |
| `toast.info(msg, duration?)` | Blue info notification | 5s default | `toast.info('FYI...')` |

### Success Helpers

| Method | Message | Duration |
|--------|---------|----------|
| `toast.messageSent()` | "Message sent successfully!" | 3s |
| `toast.profileUpdated()` | "Profile updated successfully!" | 3s |
| `toast.saved()` | "Changes saved!" | 3s |
| `toast.deleted()` | "Deleted successfully!" | 3s |
| `toast.copied()` | "Copied to clipboard!" | 2s |

### Error Helpers

| Method | Message | Action Button |
|--------|---------|---------------|
| `toast.networkError(retry?)` | "Connection lost. Please check your internet." | Retry (optional) |
| `toast.authError()` | "Session expired. Please log in again." | Log In |
| `toast.rateLimitError(seconds?)` | "Too many requests. Please wait X seconds..." | None |
| `toast.serverError(retry?)` | "Server error occurred. Please try again." | Retry (optional) |
| `toast.permissionError()` | "You do not have permission to perform this action." | None |
| `toast.validationError(msg)` | Custom validation message | None |

### Programmatic Control

| Method | Description |
|--------|-------------|
| `toast.remove(id)` | Remove specific toast by ID |
| `toast.clear()` | Remove all toasts and clear timeouts |

```typescript
// Get ID for later removal
const toastId = toast.info('Processing...');
toast.remove(toastId);  // Remove specific toast

// Clear all
toast.clear();
```

### TypeScript Types

```typescript
interface Toast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info' | 'warning';
  duration?: number;      // ms, 0 = no auto-dismiss
  dismissible?: boolean;  // show X button
  action?: {
    label: string;
    callback: () => void | Promise<void>;
  };
}

interface ToastStore {
  toasts: Toast[];
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { toast } from '$lib/stores/toast';

// Simple notifications
toast.success('Operation completed successfully!');
toast.error('Something went wrong!');
toast.info('Here is some information.');
toast.warning('Please be careful!');
```

### Custom Duration

```typescript
// Auto-dismiss after 3 seconds
toast.success('Quick message!', 3000);

// Never auto-dismiss (duration = 0)
toast.error('Critical error - please review', 0);
```

### With Action Buttons

```typescript
// Error with retry button
toast.error('Failed to save changes.', 7000, {
  label: 'Retry',
  callback: async () => {
    await saveChanges();
  }
});

// Warning with undo action
toast.warning('Message deleted', 5000, {
  label: 'Undo',
  callback: () => {
    restoreMessage();
  }
});
```

### Error-Specific Helpers

#### Network Errors

```typescript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    // ... handle response
  } catch (error) {
    toast.networkError(fetchData); // Shows "Connection lost" with Retry button
  }
}
```

#### Authentication Errors

```typescript
if (response.status === 401) {
  toast.authError(); // "Session expired. Please log in again"
}
```

#### Rate Limiting

```typescript
if (response.status === 429) {
  toast.rateLimitError(30); // "Too many requests. Please wait 30 seconds"
}
```

#### Server Errors

```typescript
try {
  await apiCall();
} catch (error) {
  toast.serverError(apiCall); // "Server error occurred" with Retry
}
```

#### Permission Errors

```typescript
if (!hasPermission) {
  toast.permissionError(); // "You do not have permission to perform this action"
}
```

#### Validation Errors

```typescript
if (!isValidEmail(email)) {
  toast.validationError('Please enter a valid email address');
}
```

### Form Validation Pattern

```typescript
function validateForm() {
  if (!email) {
    toast.validationError('Email is required');
    return false;
  }
  if (!email.includes('@')) {
    toast.validationError('Please enter a valid email address');
    return false;
  }
  return true;
}
```

### Async Operation with Retry

```typescript
async function saveChanges() {
  try {
    await save();
    toast.saved();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('network')) {
      toast.networkError(saveChanges);
    } else {
      toast.error('Failed to save. Please try again.', 7000, {
        label: 'Retry',
        callback: saveChanges
      });
    }
  }
}
```

### Delete with Undo

```typescript
async function deleteMessage() {
  const backup = currentMessage;

  try {
    await performDelete();

    toast.warning('Message deleted', 5000, {
      label: 'Undo',
      callback: async () => {
        await restoreMessage(backup);
        toast.success('Message restored');
      }
    });
  } catch (error) {
    toast.error('Failed to delete message', 7000);
  }
}
```

### Copy to Clipboard

```typescript
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.copied(); // Quick 2-second notification
  } catch (error) {
    toast.error('Failed to copy to clipboard');
  }
}
```

### HTTP Response Code Handling

```typescript
async function apiCall() {
  const response = await fetch('/api/endpoint');

  switch (response.status) {
    case 200:
      toast.success('Operation completed successfully!');
      break;

    case 401:
      toast.authError();
      break;

    case 403:
      toast.permissionError();
      break;

    case 429:
      const retryAfter = parseInt(response.headers.get('Retry-After') || '30');
      toast.rateLimitError(retryAfter);
      break;

    case 500:
    case 502:
    case 503:
      toast.serverError(apiCall);
      break;

    default:
      if (!response.ok) {
        toast.error('Request failed. Please try again.', 7000, {
          label: 'Retry',
          callback: apiCall
        });
      }
  }
}
```

### Complete Form Submission Example

```typescript
async function handleSubmit() {
  // Validation with specific messages
  if (!formData.email) {
    toast.validationError('Email is required');
    return;
  }

  if (!formData.email.includes('@')) {
    toast.validationError('Please enter a valid email address');
    return;
  }

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    // Handle specific HTTP codes
    if (response.status === 401) {
      toast.authError();
      return;
    }

    if (response.status === 429) {
      toast.rateLimitError(60);
      return;
    }

    if (!response.ok) {
      toast.error('Submission failed. Please try again.', 7000, {
        label: 'Retry',
        callback: handleSubmit
      });
      return;
    }

    // Success with short duration
    toast.success('Submitted successfully!', 3000);

  } catch (error) {
    // Network error with retry
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      toast.networkError(handleSubmit);
    } else {
      toast.serverError(handleSubmit);
    }
  }
}
```

---

## Features

### Visual Features

- **4 Types**: Success (green ✓), Error (red ✕), Warning (yellow ⚠), Info (blue ℹ)
- **SVG Icons**: Type-specific icons for visual consistency
- **Frosted Glass Effect**: Backdrop blur (12px) for modern appearance
- **Progress Bar**: Visual countdown showing time remaining
- **Smooth Animations**: Slide-in from top-right with cubic-bezier easing
- **Stacking**: Maximum 3 visible toasts, older ones auto-removed
- **Responsive**: Full-width on mobile, top-right on desktop

### Interaction Features

- **Auto-dismiss**: Configurable timer (default 5s)
- **Manual Dismiss**: X button on dismissible toasts
- **Action Buttons**: Optional action buttons (Retry, Undo, etc.)
- **Haptic Feedback**: Vibration on mobile devices (50ms)
- **Sound Effects**: Optional audio cues (user-configurable, disabled by default)

### Accessibility Features

- **ARIA Live Region**: `aria-live="polite"` for announcements
- **Semantic Roles**: Proper `role="alert"` and `aria-atomic="true"`
- **Keyboard Navigation**: Tab through action buttons, Enter/Space to activate
- **Screen Reader Support**: Announces toast type, message, and actions
- **High Contrast**: Colors work in light and dark themes
- **Reduced Motion**: Respects user's motion preferences

### Sound Effects Configuration

Users can enable/disable sound effects via localStorage:

```typescript
// Enable sounds
localStorage.setItem('toastSoundEnabled', 'true');

// Disable sounds (default)
localStorage.setItem('toastSoundEnabled', 'false');
```

Different toast types play different frequencies:
- Success: C5 (523.25 Hz)
- Error: E4 (329.63 Hz)
- Warning: A4 (440 Hz)
- Info: G4 (392 Hz)

---

## Implementation Details

### Component Files

**Location**: `/src/lib/components/ui/Toast.svelte`

**Features**:
- Frosted glass backdrop blur effect
- Animated progress bar showing time remaining
- Haptic feedback on mobile (vibration)
- Optional sound effects (disabled by default)
- ARIA live regions for accessibility
- Smooth animations with cubic-bezier easing
- Maximum 3 visible toasts with auto-removal
- Mobile-responsive design (full-width on small screens)

### Store File

**Location**: `/src/lib/stores/toast.ts`

**Methods**:
- Core: `success()`, `error()`, `warning()`, `info()`
- Error Helpers: `networkError()`, `authError()`, `rateLimitError()`, `serverError()`, `permissionError()`, `validationError()`
- Success Helpers: `messageSent()`, `profileUpdated()`, `saved()`, `deleted()`, `copied()`
- Control: `remove()`, `clear()`

**State Management**:
- Queue management (MAX_TOASTS = 3)
- Timeout tracking and cleanup
- Auto-dismiss functionality
- Action button callback execution

### Layout Integration

The Toast component must be included in your app layout:

```svelte
<!-- +layout.svelte -->
<script>
  import Toast from '$lib/components/ui/Toast.svelte';
</script>

<Toast />
<slot />
```

---

## Migration Guide

### Why Migrate from alert()?

#### Problems with alert()
- ❌ Blocks the entire UI (modal and synchronous)
- ❌ No customization (appearance, duration, actions)
- ❌ Poor user experience (interrupts workflow)
- ❌ Not mobile-friendly
- ❌ No accessibility features
- ❌ Can't show multiple alerts simultaneously
- ❌ No retry mechanisms

#### Benefits of Toast Notifications
- ✅ Non-blocking and asynchronous
- ✅ Visually polished with animations
- ✅ Automatic dismissal with timers
- ✅ Action buttons (Retry, Undo, etc.)
- ✅ Mobile-optimized with haptic feedback
- ✅ Accessible (ARIA live regions)
- ✅ Stacks multiple notifications
- ✅ Type-specific styling and icons
- ✅ Progress bars
- ✅ Frosted glass effect

### Migration Steps

#### Step 1: Import the toast store

```typescript
import { toast } from '$lib/stores/toast';
```

#### Step 2: Replace alert() calls

**Before**:
```typescript
try {
  await someOperation();
} catch (error) {
  alert('Operation failed!');
}
```

**After**:
```typescript
try {
  await someOperation();
} catch (error) {
  toast.error('Operation failed. Please try again.', 7000, {
    label: 'Retry',
    callback: someOperation
  });
}
```

#### Step 3: Add Error Type Detection

Instead of generic errors, detect the error type:

```typescript
try {
  await fetch('/api/data');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    toast.networkError(fetchData);
  } else if (errorMessage.includes('auth') || errorMessage.includes('401')) {
    toast.authError();
  } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    toast.rateLimitError(30);
  } else {
    toast.error('An error occurred. Please try again.', 7000, {
      label: 'Retry',
      callback: fetchData
    });
  }
}
```

### Migration Patterns

#### Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Success message | `alert('Saved!')` | `toast.saved()` |
| Generic error | `alert('Error!')` | `toast.error('Error occurred', 7000)` |
| Warning | `alert('Warning!')` | `toast.warning('Please verify')` |
| Confirmation | `confirm('Delete?')` | Use `ConfirmDialog` component |
| Network error | `alert('Failed')` | `toast.networkError(retry)` |

### Rollout Strategy

1. **Phase 1**: Replace all `alert()` calls with toast
2. **Phase 2**: Add retry mechanisms to errors
3. **Phase 3**: Implement undo for destructive actions
4. **Phase 4**: Add sound/haptic preferences to settings
5. **Phase 5**: Optimize durations based on user feedback

---

## Duration Guidelines

| Type | Recommended | Notes |
|------|-------------|-------|
| Success | 2-3s | Quick confirmation |
| Info | 5s | Standard information |
| Warning | 5-6s | Needs attention |
| Error | 7-10s | Needs user action |
| Critical | 0 | Never auto-dismiss |

---

## Message Writing Guidelines

### Best Practices

- ✅ **Be specific**: "Failed to save profile" not "Error"
- ✅ **Be actionable**: "Check your internet connection"
- ✅ **Be concise**: One sentence maximum
- ✅ **Use proper grammar and punctuation**
- ✅ **Use clear language**: Avoid technical jargon

### Anti-patterns

- ❌ Generic messages: "Error occurred"
- ❌ Technical jargon: "NetworkError: ECONNREFUSED"
- ❌ Stack traces in UI
- ❌ ALL CAPS
- ❌ Multiple sentences

---

## When NOT to Use Toasts

- ❌ **Confirmations** → Use `ConfirmDialog` component
- ❌ **Critical errors** → Use `Modal` component
- ❌ **Form validation errors** → Use inline validation
- ❌ **Loading states** → Use `Loading` component
- ❌ **Complex information** → Use `Modal` or dedicated page

---

## Best Practices

### Do's

- ✅ Use specific error helpers when available
- ✅ Provide retry callbacks for transient failures
- ✅ Use appropriate durations (shorter for success, longer for errors)
- ✅ Include actionable information in messages
- ✅ Use success helpers for common operations
- ✅ Limit to maximum 3 toasts
- ✅ Test on mobile devices

### Don'ts

- ❌ Show too many toasts at once (max 3 enforced)
- ❌ Use generic "Error" messages - be specific
- ❌ Set very long durations (>30s) for auto-dismiss
- ❌ Use toasts for critical errors requiring immediate action
- ❌ Forget to provide retry mechanisms for recoverable errors
- ❌ Spam multiple toasts
- ❌ Forget to test keyboard navigation

---

## Testing

### Manual Testing Checklist

- [ ] Visual appearance in light/dark themes
- [ ] Slide-in animation works smoothly
- [ ] Progress bar animates correctly
- [ ] Auto-dismiss works at correct duration
- [ ] Manual dismiss (X button) works
- [ ] Action buttons work and dismiss toast
- [ ] Multiple toasts stack properly (max 3)
- [ ] Mobile responsive (full width on small screens)
- [ ] Haptic feedback works on mobile
- [ ] Sound effects work (if enabled)
- [ ] Accessible via screen reader
- [ ] Keyboard navigation for action buttons

### Unit Testing Example

```typescript
import { toast } from '$lib/stores/toast';
import { get } from 'svelte/store';

describe('Toast Store', () => {
  beforeEach(() => {
    toast.clear();
  });

  it('should add a success toast', () => {
    toast.success('Test message');
    const toasts = get(toast).toasts;

    expect(toasts).toHaveLength(1);
    expect(toasts[0].variant).toBe('success');
    expect(toasts[0].message).toBe('Test message');
  });

  it('should remove toast after duration', async () => {
    toast.success('Test message', 1000);

    await new Promise(resolve => setTimeout(resolve, 1100));

    const toasts = get(toast).toasts;
    expect(toasts).toHaveLength(0);
  });

  it('should limit to 3 toasts', () => {
    toast.info('Message 1');
    toast.info('Message 2');
    toast.info('Message 3');
    toast.info('Message 4');

    const toasts = get(toast).toasts;
    expect(toasts).toHaveLength(3);
    expect(toasts[0].message).toBe('Message 2');
  });

  it('should call action callback', async () => {
    const callback = vi.fn();

    toast.error('Test', 5000, {
      label: 'Retry',
      callback
    });

    const toasts = get(toast).toasts;
    await toasts[0].action?.callback();

    expect(callback).toHaveBeenCalled();
  });
});
```

---

## Troubleshooting

### Toast not appearing

1. Check that Toast component is in layout:
```svelte
<!-- +layout.svelte -->
<Toast />
```

2. Verify import is correct:
```typescript
import { toast } from '$lib/stores/toast';
```

### Multiple toasts not stacking

The system enforces a maximum of 3 visible toasts. Older toasts are automatically removed when the limit is reached.

### Toast disappearing too quickly

Adjust duration:
```typescript
toast.error('Important message', 10000); // 10 seconds
toast.error('Critical message', 0); // Never auto-dismiss
```

### Action button not working

Ensure callback is async-safe:
```typescript
toast.error('Failed', 7000, {
  label: 'Retry',
  callback: async () => {
    await retryOperation();
  }
});
```

### Sound not playing

Sounds are disabled by default. Enable in localStorage:
```typescript
localStorage.setItem('toastSoundEnabled', 'true');
```

---

## Browser Compatibility

### Supported Features

- ✅ All modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Backdrop blur (with fallback to solid color)
- ✅ CSS animations
- ✅ Vibration API (mobile)
- ✅ Web Audio API (sound)

### Graceful Degradation

- Backdrop blur falls back to solid color
- Sound fails silently if not supported
- Haptic does nothing on unsupported devices

---

## Configuration Options

### User Preferences (localStorage)

```typescript
// Enable sound effects
localStorage.setItem('toastSoundEnabled', 'true');

// Disable sound effects (default)
localStorage.setItem('toastSoundEnabled', 'false');
```

### Future Preferences (Potential)

- Toast position (top-right, top-left, bottom-right, bottom-left)
- Max visible toasts (1-5)
- Default duration per type
- Sound volume
- Enable/disable haptic feedback

---

## Future Enhancements

### Potential Features

1. **Toast Groups**
   - Group related toasts
   - Collapse/expand groups
   - Summary view

2. **Toast Queue**
   - Online: Show immediately
   - Offline: Queue for later
   - Replay when online

3. **Toast History**
   - View dismissed toasts
   - Re-trigger actions
   - Search/filter

4. **Custom Positions**
   - Top-right (default)
   - Top-left
   - Bottom-right
   - Bottom-left

5. **Custom Icons**
   - Per-toast custom icons
   - Icon library integration
   - Animated icons

6. **Advanced Actions**
   - Multiple action buttons
   - Dropdown menus
   - Inline forms

7. **Themes**
   - Custom color schemes
   - Preset themes
   - Per-toast styling

8. **Analytics**
   - Track toast interactions
   - Measure effectiveness
   - A/B testing

---

## Integration Points

### Currently Used

- `/src/lib/components/ui/Toast.svelte` - Main component (in layout)
- `/src/routes/dm/[pubkey]/+page.svelte` - DM sending with retry

### Recommended Integration

All components with error handling or user feedback:
- Message sending/editing/deleting
- Profile updates
- Channel operations
- Event creation/management
- Authentication flows
- File uploads
- Settings changes

---

## Performance Metrics

### Optimizations Implemented

1. **Timeout Management**: Store timeouts in Map for cleanup
2. **Maximum Queue Size**: Limit to 3 visible toasts
3. **Animation Performance**: CSS animations (GPU-accelerated)
4. **Conditional Features**: Sound only when enabled, haptic only on supported devices

### Success Metrics

- Reduced user frustration with blocking alerts
- Faster error recovery with retry mechanisms
- Better error understanding with specific messages
- Improved mobile experience with haptic feedback

---

## Support & Resources

### Documentation Files

The original documentation was consolidated from these source files:
- `toast-architecture.md` - System design and data flow
- `toast-implementation-summary.md` - Implementation details
- `toast-usage-examples.md` - Comprehensive usage guide
- `toast-migration-guide.md` - Migration from alert()
- `toast-quick-reference.md` - Quick API reference

### Source Code

- **Component**: `/src/lib/components/ui/Toast.svelte`
- **Store**: `/src/lib/stores/toast.ts`
- **Examples**: `/src/examples/toast-examples.ts`
- **Demo**: `/src/lib/components/ui/ToastDemo.svelte`

---

## Summary

The enhanced toast notification system provides a modern, accessible, and user-friendly way to display notifications. With comprehensive documentation, examples, and helper methods, developers can easily integrate toasts throughout the application to replace blocking alerts and improve the overall user experience.

### Key Benefits

1. **Non-blocking** - Users can continue working while notifications appear
2. **Actionable** - Retry and undo buttons provide immediate solutions
3. **Accessible** - ARIA attributes and keyboard navigation
4. **Beautiful** - Frosted glass, smooth animations, progress bars
5. **Developer-friendly** - Pre-built helpers for common scenarios
6. **Mobile-optimized** - Responsive design, haptic feedback
7. **Consistent** - Uniform error handling across the app
8. **Maintainable** - Well-documented with comprehensive examples
