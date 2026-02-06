---
title: How to Implement a Soft Keyboard State Detection Hook
description: Using useSyncExternalStore to build a keyboard state detection Hook with a "pre-announce" mechanism, solving timing issues when the mobile keyboard appears.
date: 2026-02-05
locale: en
tags: [React, iOS, Android, Hook]
---

In mobile web development, handling the soft keyboard is unavoidable. Whether you're dealing with input positioning, page scrolling, or fixed element misalignment, the first step is always **accurately detecting the keyboard state**.

This article introduces how to implement a production-grade soft keyboard state detection Hook. It not only detects whether the keyboard is visible, but also supports a "pre-announce" mechanism—allowing you to respond before the keyboard actually appears.

---

## Why Build Your Own?

Browsers don't provide a direct "keyboard appeared" event. We can only infer it through indirect means:

- **iOS**: When the keyboard appears, `window.innerHeight` stays the same, but `visualViewport.height` shrinks
- **Android**: When the keyboard appears, it triggers `window.resize` and `window.innerHeight` decreases
- **Desktop**: No soft keyboard, so we can only use focus events to determine input state

The bigger problem is timing. The traditional approach is:

```
User taps → Keyboard appears → Detect resize → Update state → Respond
```

But by the time you "detect" it, the browser may have already auto-scrolled the page, causing jank and misalignment. If we could "pre-announce" that the keyboard is about to appear at the moment of the tap and respond immediately, the experience would be much better:

```
User taps → Pre-announce keyboard → Respond immediately → Keyboard appears (browser doesn't need to intervene)
```

This is the core value of the Hook we're building.

---

## Design Goals

1. **Global singleton**: All components share the same keyboard state, avoiding duplicate listeners
2. **Pre-announce support**: Expose a `keyboardWillPopUp()` method that allows external code to trigger state updates
3. **Cross-platform compatibility**: Automatically select the best detection strategy (visualViewport / resize / focus)
4. **Performance-friendly**: Use `useSyncExternalStore` to avoid unnecessary re-renders

---

## Core Implementation Approach

### Why useSyncExternalStore?

The traditional `useState` + `useEffect` approach has several issues:

```tsx
// Problems with traditional approach
function useKeyboard() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      // Detect keyboard state
      setIsVisible(/* ... */);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isVisible;
}
```

1. Each component call creates its own state and event listener
2. No way to trigger state updates from outside (pre-announce mechanism impossible)
3. Possible state tearing in concurrent mode

`useSyncExternalStore` is a Hook introduced in React 18, specifically designed for subscribing to external data sources. It takes two parameters:

- `subscribe`: Register a listener function, returns an unsubscribe function
- `getSnapshot`: Get the current state snapshot

The key insight: The `callback` parameter received by `subscribe`, when called, triggers React to re-execute `getSnapshot`. **By storing this callback, we can trigger state updates from outside**.

### Implementing the Pre-announce Mechanism

```ts
// Module-scope variables
let willPopup = { signal: false, timestamp: 0 };
let keyboardDetectCallback = () => {};

// External code calls this to "pre-announce" keyboard appearance
export function keyboardWillPopUp() {
  willPopup.signal = true;
  willPopup.timestamp = Date.now();
  keyboardDetectCallback(); // Trigger useSyncExternalStore to re-call getSnapshot
}

// Store the callback in subscribe
const subscribe = (callback) => {
  keyboardDetectCallback = callback; // ← This line gives external code the power to trigger updates
  // ... Set up event listeners
  return () => { /* cleanup */ };
};
```

In `getSnapshot`, check `willPopup.signal`:

```ts
const getSnapshot = () => {
  // ... Detect actual keyboard state

  // Even without receiving a resize event, if pre-announce signal is true, consider keyboard visible
  const isKeyboardVisible = realKeyboardVisibility || willPopup.signal;

  // Clear signal after returning state
  willPopup.signal = false;

  return { isKeyboardVisible, /* ... */ };
};
```

This way, when a user taps an input field, you can call `keyboardWillPopUp()` before `focus`, allowing components that depend on keyboard state (like bottom spacers) to respond immediately, without waiting for the resize event.

---

## Multi-Platform Detection Strategies

Different platforms require different detection methods:

| Platform | Detection Method | Reason |
|----------|------------------|--------|
| **iOS** | `visualViewport.resize` | iOS keyboard doesn't change `window.innerHeight`, only visual viewport |
| **Android** | `window.resize` | Android keyboard triggers layout viewport change |
| **Desktop** | `focusin` / `focusout` | No soft keyboard, can only use focus events |

```ts
enum METHOD {
  VisualViewport = 1, // iOS
  Resize = 2,         // Android
  FocusEvent = 3,     // Desktop
}

function init() {
  if (deviceType === 'ios' && window.visualViewport) {
    currentMethod = METHOD.VisualViewport;
  } else if (deviceType === 'android' && navigator.maxTouchPoints > 1) {
    currentMethod = METHOD.Resize;
  } else {
    currentMethod = METHOD.FocusEvent;
  }
}
```

### Keyboard Height Calculation

Keyboard height is calculated from the viewport height difference:

```ts
keyboardHeight = maxViewportHeight - currentViewportHeight
```

One detail: `maxViewportHeight` needs to be recorded at app startup (viewport height when keyboard is hidden). When the keyboard appears, subtract the current viewport height to get the keyboard height.

To avoid recalculating every time, I added a `trusted` flag: when two consecutive calculations produce the same keyboard height, the parameters are considered stable and can be reused.

```ts
let deviceInfo = {
  maxViewportHeight: 0,
  keyboardHeight: 0,
  trusted: false, // Mark as stable after two identical values
};
```

---

## Debounce Handling

Pre-announce signals and real resize events may fire in rapid succession. To prevent state flickering, we need debouncing:

```ts
const getSnapshot = () => {
  // ...

  // Ignore snapshots within 30ms of pre-announce signal
  const shouldIgnore =
    Math.abs(Date.now() - willPopup.timestamp) < 30 &&
    keyboardStatus.isKeyboardVisible;

  if (shouldUpdate && !shouldIgnore) {
    keyboardStatus = { /* update state */ };
  }

  return keyboardStatus;
};
```

The event listener itself is also debounced by 300ms to avoid frequent triggers:

```ts
const debounceCallback = debounce(callback, 300);
window.visualViewport.addEventListener('resize', debounceCallback, options);
```

---

## Global Sharing with Context

To share the same state across all components, wrap with Context:

```tsx
const KeyboardDetectionContext = createContext<KeyboardDetectionResult>(keyboardStatus);

export function KeyboardDetectionProvider({ children }) {
  useEffect(init, []); // Initialize detection method

  const value = useSyncExternalStore(subscribe, getSnapshot);

  return (
    <KeyboardDetectionContext.Provider value={value}>
      {children}
    </KeyboardDetectionContext.Provider>
  );
}

export function useKeyboardStatus() {
  return useContext(KeyboardDetectionContext);
}
```

Wrap your app's root component with the Provider:

```tsx
function App() {
  return (
    <KeyboardDetectionProvider>
      <YourApp />
    </KeyboardDetectionProvider>
  );
}
```

---

## Complete Code

```ts
import noop from 'lodash/noop';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import {
  useEffect,
  useSyncExternalStore,
  createContext,
  useContext,
} from 'react';

// ==================== Type Definitions ====================

export interface KeyboardDetectionResult {
  isKeyboardVisible: boolean;
  viewportHeight: number;
  maxViewportHeight: number;
  keyboardHeight: number;
}

enum METHOD {
  VisualViewport = 1,
  Resize = 2,
  FocusEvent = 3,
}

// ==================== Module State ====================

let currentMethod: METHOD = METHOD.FocusEvent;
let willPopup = { signal: false, timestamp: 0 };

let keyboardStatus: KeyboardDetectionResult = {
  isKeyboardVisible: false,
  keyboardHeight: 0,
  viewportHeight: 0,
  maxViewportHeight: 0,
};

let keyboardDetectCallback: () => void = noop;

let deviceInfo = {
  maxViewportHeight: 0,
  keyboardHeight: 0,
  trusted: false,
};

// ==================== Device Detection ====================

function getDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

const deviceType = getDeviceType();

// ==================== Public API ====================

/** Pre-announce that keyboard is about to appear */
export function keyboardWillPopUp() {
  willPopup.signal = true;
  willPopup.timestamp = Date.now();
  keyboardDetectCallback();
}

/** Get current keyboard info (for scroll calculations) */
export function getKeyboardInfo() {
  return {
    keyboardHeight: deviceInfo.trusted ? deviceInfo.keyboardHeight : 340,
    viewportHeight: deviceInfo.maxViewportHeight,
  };
}

// ==================== Internal Logic ====================

function init() {
  if (deviceType === 'ios' && window.visualViewport) {
    currentMethod = METHOD.VisualViewport;
  } else if (deviceType === 'android' && navigator.maxTouchPoints > 1) {
    currentMethod = METHOD.Resize;
  } else {
    currentMethod = METHOD.FocusEvent;
  }
}

function deviceInfoInit(currentViewportHeight: number) {
  if (deviceInfo.trusted) return;

  const maxViewportHeight = Math.max(
    currentViewportHeight,
    deviceInfo.maxViewportHeight
  );
  const keyboardHeight =
    currentMethod === METHOD.FocusEvent
      ? 340
      : Math.max(
          deviceInfo.keyboardHeight,
          maxViewportHeight - currentViewportHeight
        );

  const newDeviceInfo = { maxViewportHeight, keyboardHeight, trusted: false };

  if (isEqual(deviceInfo, newDeviceInfo) && keyboardHeight !== 0) {
    deviceInfo.trusted = true;
  } else {
    deviceInfo = newDeviceInfo;
  }
}

// ==================== useSyncExternalStore ====================

const subscribe: Parameters<typeof useSyncExternalStore>[0] = (callback) => {
  const abort = new AbortController();
  const options: AddEventListenerOptions = {
    passive: true,
    capture: true,
    signal: abort.signal,
  };

  keyboardDetectCallback = callback;
  const debounceCallback = debounce(callback, 300);

  if (currentMethod === METHOD.VisualViewport) {
    window.visualViewport!.addEventListener('resize', debounceCallback, options);
  } else if (currentMethod === METHOD.Resize) {
    window.addEventListener('resize', debounceCallback, options);
  } else {
    document.body.addEventListener('focusin', debounceCallback, options);
    document.body.addEventListener('focusout', debounceCallback, options);
  }

  return () => abort.abort();
};

const getSnapshot = (): KeyboardDetectionResult => {
  const viewportHeight =
    currentMethod === METHOD.VisualViewport
      ? window.visualViewport!.height
      : window.innerHeight;

  deviceInfoInit(viewportHeight);

  // Calculate actual keyboard visibility
  let realKeyboardVisibility = false;

  if (currentMethod === METHOD.FocusEvent) {
    const activeEl = document.activeElement;
    realKeyboardVisibility = !!(
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable)
    );
  } else {
    // Consider keyboard visible if viewport height difference > 150px
    realKeyboardVisibility = deviceInfo.maxViewportHeight - viewportHeight > 150;
  }

  const shouldUpdate =
    realKeyboardVisibility !== keyboardStatus.isKeyboardVisible ||
    viewportHeight !== keyboardStatus.viewportHeight ||
    willPopup.signal;

  // Debounce: don't override within 30ms of pre-announce
  const shouldIgnore =
    Math.abs(Date.now() - willPopup.timestamp) < 30 &&
    keyboardStatus.isKeyboardVisible;

  if (shouldUpdate && !shouldIgnore) {
    keyboardStatus = {
      isKeyboardVisible: realKeyboardVisibility || willPopup.signal,
      viewportHeight,
      keyboardHeight: deviceInfo.keyboardHeight,
      maxViewportHeight: deviceInfo.maxViewportHeight,
    };
    willPopup.signal = false;
  }

  return keyboardStatus;
};

// ==================== React Context ====================

const KeyboardDetectionContext =
  createContext<KeyboardDetectionResult>(keyboardStatus);

export function KeyboardDetectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(init, []);

  const value = useSyncExternalStore<KeyboardDetectionResult>(
    subscribe,
    getSnapshot
  );

  return (
    <KeyboardDetectionContext.Provider value={value}>
      {children}
    </KeyboardDetectionContext.Provider>
  );
}

export function useKeyboardStatus(): KeyboardDetectionResult {
  return useContext(KeyboardDetectionContext);
}
```

---

## Usage Examples

### Basic Usage

```tsx
import { useKeyboardStatus, KeyboardDetectionProvider } from './useKeyboardDetection';

function KeyboardAwareComponent() {
  const { isKeyboardVisible, keyboardHeight } = useKeyboardStatus();

  return (
    <div style={{ paddingBottom: isKeyboardVisible ? keyboardHeight : 0 }}>
      {isKeyboardVisible ? 'Keyboard is visible' : 'Keyboard is hidden'}
    </div>
  );
}

function App() {
  return (
    <KeyboardDetectionProvider>
      <KeyboardAwareComponent />
    </KeyboardDetectionProvider>
  );
}
```

### With Pre-announce Mechanism

```tsx
import { keyboardWillPopUp, getKeyboardInfo } from './useKeyboardDetection';

function handleInputFocus(event: React.TouchEvent, inputRef: HTMLInputElement) {
  event.preventDefault();
  inputRef.focus({ preventScroll: true });

  // Pre-announce keyboard appearance, spacer component responds immediately
  keyboardWillPopUp();

  // Wait for layout update before scrolling
  setTimeout(() => {
    const { keyboardHeight, viewportHeight } = getKeyboardInfo();
    const targetScrollTop = inputRef.offsetTop - (viewportHeight - keyboardHeight - 150);
    window.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
  }, 100);
}
```

---

## Important Notes

1. **iOS below 15.5 doesn't support `preventScroll`**: Need fallback handling—check and correct `document.documentElement.scrollTop` after scrolling completes

2. **Keyboard height estimation**: Before real data arrives, use 340px as an estimate (iPhone keyboard height is typically 300~360px)

3. **visualViewport offset persistence**: In edge cases, `visualViewport.offsetTop` may not reset to zero after keyboard dismissal, requiring additional handling

4. **SSR compatibility**: If using SSR, handle the case where `window` doesn't exist in `getSnapshot`, or provide a `getServerSnapshot` parameter

---

## Summary

The core design philosophy of this Hook is: **Transform keyboard state from "can only be passively detected" to "can be actively pre-announced"**.

Through the `subscribe` + `callback` pattern of `useSyncExternalStore`, we expose the ability to trigger state updates at the module scope. This allows upstream code to "pre-announce" that the keyboard is about to appear within the synchronous chain of the user gesture, then let keyboard-related UI components respond in advance—thereby avoiding the timing problem of "it's already too late by the time we detect it" in traditional approaches.

This pattern isn't limited to keyboard detection—any scenario requiring "external trigger + internal response" can benefit from this approach.
