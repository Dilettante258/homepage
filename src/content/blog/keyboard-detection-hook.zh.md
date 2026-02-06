---
title: 如何实现一个软键盘弹起状态检测 Hook
description: 使用 useSyncExternalStore 实现一个支持"预告"机制的软键盘状态检测 Hook，解决移动端键盘弹起时的时序问题。
date: 2026-02-05
locale: zh
tags: [React, iOS, Android, Hook]
slug: keyboard-detection-hook
---

在移动端 Web 开发中，软键盘弹起是一个绑不开的话题。无论是处理输入框定位、页面滚动还是 fixed 元素错位，第一步都需要**准确检测键盘状态**。

本文将介绍如何实现一个生产级的软键盘状态检测 Hook，它不仅能检测键盘是否弹起，还支持"预告"机制——让你在键盘真正弹起之前就能做出响应。

---

## 为什么需要自己实现？

浏览器没有提供直接的"键盘弹起"事件。我们只能通过一些间接手段来推断：

- **iOS**：键盘弹起时 `window.innerHeight` 不变，但 `visualViewport.height` 会缩小
- **Android**：键盘弹起时会触发 `window.resize`，`window.innerHeight` 变小
- **桌面端**：没有软键盘，只能通过焦点事件判断是否在输入状态

更麻烦的是时序问题。传统方案是：

```
用户点击 → 键盘弹起 → 监听到 resize → 更新状态 → 做出响应
```

但当你"监听到"的时候，浏览器可能已经自动滚动了页面，导致各种抖动和错位。如果能在用户点击的瞬间就"预告"键盘将要弹起，提前做出响应，体验会好很多：

```
用户点击 → 预告键盘 → 立即响应 → 键盘弹起（浏览器无需干预）
```

这就是本文要实现的 Hook 的核心价值。

---

## 设计目标

1. **全局单例**：所有组件共享同一份键盘状态，避免重复监听
2. **支持预告**：暴露 `keyboardWillPopUp()` 方法，允许外部主动触发状态更新
3. **多平台兼容**：自动选择最佳检测策略（visualViewport / resize / focus）
4. **性能友好**：使用 `useSyncExternalStore` 避免不必要的 re-render

---

## 核心实现思路

### 为什么用 useSyncExternalStore？

传统的 `useState` + `useEffect` 方案有几个问题：

```tsx
// 传统方案的问题
function useKeyboard() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      // 检测键盘状态
      setIsVisible(/* ... */);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isVisible;
}
```

1. 每个组件调用都会创建独立的 state 和事件监听
2. 无法从外部触发状态更新（预告机制无从实现）
3. 并发模式下可能出现状态撕裂（tearing）

`useSyncExternalStore` 是 React 18 引入的 Hook，专门用于订阅外部数据源。它接收两个参数：

- `subscribe`：注册监听函数，返回取消订阅的函数
- `getSnapshot`：获取当前状态快照

关键在于：`subscribe` 接收的 `callback` 参数，调用它会触发 React 重新执行 `getSnapshot`。**把这个 callback 存起来，就能从外部主动触发状态更新**。

### 预告机制的实现

```ts
// 模块作用域变量
let willPopup = { signal: false, timestamp: 0 };
let keyboardDetectCallback = () => {};

// 外部调用此函数"预告"键盘即将弹起
export function keyboardWillPopUp() {
  willPopup.signal = true;
  willPopup.timestamp = Date.now();
  keyboardDetectCallback(); // 触发 useSyncExternalStore 重新调用 getSnapshot
}

// subscribe 里把 callback 存起来
const subscribe = (callback) => {
  keyboardDetectCallback = callback; // ← 这一行让外部有了触发更新的能力
  // ... 挂载事件监听
  return () => { /* cleanup */ };
};
```

在 `getSnapshot` 里检查 `willPopup.signal`：

```ts
const getSnapshot = () => {
  // ... 检测真实的键盘状态

  // 即使还没收到 resize 事件，预告信号为 true 也认为键盘可见
  const isKeyboardVisible = realKeyboardVisibility || willPopup.signal;

  // 返回状态后清除信号
  willPopup.signal = false;

  return { isKeyboardVisible, /* ... */ };
};
```

这样，当用户点击输入框时，可以在 `focus` 之前调用 `keyboardWillPopUp()`，让依赖键盘状态的组件（如底部垫片）立即响应，不用等到 resize 事件到来。

---

## 多平台检测策略

不同平台需要不同的检测方式：

| 平台 | 检测方式 | 原因 |
|------|----------|------|
| **iOS** | `visualViewport.resize` | iOS 键盘弹起不改变 `window.innerHeight`，只改变 visual viewport |
| **Android** | `window.resize` | Android 键盘弹起会触发 layout viewport 变化 |
| **桌面端** | `focusin` / `focusout` | 没有软键盘，只能通过焦点判断 |

```ts
enum METHOD {
  VisualViewport = 1, // iOS
  Resize = 2,         // Android
  FocusEvent = 3,     // 桌面端
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

### 键盘高度计算

键盘高度通过视口高度差计算：

```ts
keyboardHeight = maxViewportHeight - currentViewportHeight
```

这里有个细节：`maxViewportHeight` 需要在应用启动时记录（键盘收起时的视口高度），之后键盘弹起时用当前视口高度相减即可得到键盘高度。

为了避免每次都重新计算，我加了一个 `trusted` 标记：当连续两次计算出的键盘高度相同时，认为参数已稳定，后续直接复用。

```ts
let deviceInfo = {
  maxViewportHeight: 0,
  keyboardHeight: 0,
  trusted: false, // 连续两次相同则标记为稳定
};
```

---

## 防抖处理

预告信号和真实的 resize 事件可能在极短时间内连续触发。为了防止状态跳变，需要做防抖：

```ts
const getSnapshot = () => {
  // ...

  // 预告信号发出后 30ms 内的 snapshot 不覆盖预告状态
  const shouldIgnore =
    Math.abs(Date.now() - willPopup.timestamp) < 30 &&
    keyboardStatus.isKeyboardVisible;

  if (shouldUpdate && !shouldIgnore) {
    keyboardStatus = { /* 更新状态 */ };
  }

  return keyboardStatus;
};
```

同时，事件监听本身也做了 300ms 的防抖，避免频繁触发：

```ts
const debounceCallback = debounce(callback, 300);
window.visualViewport.addEventListener('resize', debounceCallback, options);
```

---

## Context 全局共享

为了让所有组件共享同一份状态，使用 Context 包装：

```tsx
const KeyboardDetectionContext = createContext<KeyboardDetectionResult>(keyboardStatus);

export function KeyboardDetectionProvider({ children }) {
  useEffect(init, []); // 初始化检测方式

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

在应用根组件包裹 Provider：

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

## 完整代码

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

// ==================== 类型定义 ====================

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

// ==================== 模块状态 ====================

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

// ==================== 设备检测 ====================

function getDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

const deviceType = getDeviceType();

// ==================== 公开 API ====================

/** 预告键盘即将弹起 */
export function keyboardWillPopUp() {
  willPopup.signal = true;
  willPopup.timestamp = Date.now();
  keyboardDetectCallback();
}

/** 获取当前键盘信息（用于滚动计算） */
export function getKeyboardInfo() {
  return {
    keyboardHeight: deviceInfo.trusted ? deviceInfo.keyboardHeight : 340,
    viewportHeight: deviceInfo.maxViewportHeight,
  };
}

// ==================== 内部逻辑 ====================

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

  // 计算真实的键盘可见性
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
    // 视口高度差超过 150px 认为键盘已弹起
    realKeyboardVisibility = deviceInfo.maxViewportHeight - viewportHeight > 150;
  }

  const shouldUpdate =
    realKeyboardVisibility !== keyboardStatus.isKeyboardVisible ||
    viewportHeight !== keyboardStatus.viewportHeight ||
    willPopup.signal;

  // 防抖：预告信号发出后 30ms 内不覆盖
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

## 使用示例

### 基础用法

```tsx
import { useKeyboardStatus, KeyboardDetectionProvider } from './useKeyboardDetection';

function KeyboardAwareComponent() {
  const { isKeyboardVisible, keyboardHeight } = useKeyboardStatus();

  return (
    <div style={{ paddingBottom: isKeyboardVisible ? keyboardHeight : 0 }}>
      {isKeyboardVisible ? '键盘已弹起' : '键盘已收起'}
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

### 配合预告机制

```tsx
import { keyboardWillPopUp, getKeyboardInfo } from './useKeyboardDetection';

function handleInputFocus(event: React.TouchEvent, inputRef: HTMLInputElement) {
  event.preventDefault();
  inputRef.focus({ preventScroll: true });

  // 预告键盘即将弹起，让垫片组件立即变高
  keyboardWillPopUp();

  // 等待布局更新后再滚动
  setTimeout(() => {
    const { keyboardHeight, viewportHeight } = getKeyboardInfo();
    const targetScrollTop = inputRef.offsetTop - (viewportHeight - keyboardHeight - 150);
    window.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
  }, 100);
}
```

---

## 注意事项

1. **iOS 15.5 以下不支持 `preventScroll`**：需要做兜底处理，在滚动完成后检查并修正 `document.documentElement.scrollTop`

2. **键盘高度估算**：在真实数据到来之前，使用 340px 作为估算值（iPhone 键盘高度通常在 300~360px 之间）

3. **visualViewport 偏移残留**：极端情况下键盘收起后 `visualViewport.offsetTop` 可能不归零，需要额外处理

4. **SSR 兼容**：如果使用 SSR，需要在 `getSnapshot` 中处理 `window` 不存在的情况，或提供 `getServerSnapshot` 参数

---

## 总结

这个 Hook 的核心设计思想是：**把键盘状态从"只能被动检测"变成"可以主动预告"**。

通过 `useSyncExternalStore` 的 `subscribe` + `callback` 模式，我们在模块作用域暴露了触发状态更新的能力。这让上层代码可以在用户手势的同步链路中，先"预告"键盘将要弹起，再让键盘相关的 UI 组件提前响应——从而避免了传统方案中"监听到时已经晚了"的时序问题。

这种模式不仅适用于键盘检测，任何需要"外部触发 + 内部响应"的场景都可以借鉴。
