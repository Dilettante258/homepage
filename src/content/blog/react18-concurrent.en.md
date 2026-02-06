---
title: Understanding React 18 Concurrent Rendering
description: A deep dive into React 18's concurrent rendering mechanism, including time slicing, priority scheduling, the Tearing problem, and the principles and source code analysis of useSyncExternalStore.
date: 2025-07-17
locale: en
tags: [React]
slug: react18-concurrent
---

> Target audience: Readers with some understanding and experience of React internals and frontend development. Some concepts and knowledge are assumed to be already known and will not be explained in detail.

Before React 18, React used synchronous rendering by default. Rendering of updates was completed in a single, uninterrupted, synchronous transaction. With synchronous rendering, once an update begins rendering, nothing can interrupt it until the user sees the result.

React 18 introduces concurrent rendering, whose key feature is **interruptible rendering**. React may start rendering an update, pause in the middle, then continue later. It may even abandon an in-progress render entirely. React guarantees that the UI remains consistent even if a render is interrupted. To do this, it waits until the entire tree has been evaluated before performing DOM mutations. With this capability, React can prepare new screens in the background without blocking the main thread. This means even while the UI is performing a large rendering task, it can still respond immediately to user input, creating a fluid user experience.

<https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react>

> The concurrent update mechanism is essentially time slicing, where high-priority tasks can interrupt low-priority ones. During rendering, because the continuous rendering process is split into individual sliced rendering segments, there are opportunities to respond to user actions between segments. Which task runs in a given time slice is determined by the task's **priority**. When a high-priority update arrives, it interrupts the old update, executes the high-priority update first, and then continues with the low-priority update after completion.

Here is a simple comparison example (examples in this article generally use loop code like `while (performance.now() - now < 100)` to simulate component lag). Code: [Torn React - Juejin](https://juejin.cn/post/7423359941854412851#heading-1)

| **Synchronous** (lagging)                                                                                                                                                                                                                                                                                                                                                                                                                                          | **Concurrent Mode** (smooth)                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ![](https://h-r2.kairi.cc/react18-concurrent-01.awebp) Due to the heavy rendering cost of the component, user input shows a noticeable **lag**. | ![](https://h-r2.kairi.cc/react18-concurrent-02.awebp) The Heavy display below shows a value wrapped with `useDeferredValue`. You can clearly feel the experience is much smoother. |

This **interruptible rendering** feature can only be experienced when using specific APIs. Using the right image as an example:

```tsx
import { useState, useDeferredValue, memo } from 'react';

function Heavy({ value }: { value: string }) {
  const start = performance.now();
  while (performance.now() - start < 300) {}
  return <span>Heavy: {value}</span>;
}
const HeavyMemo = memo(Heavy);

export default function App() {
  const [value, setValue] = useState('');
  const deferredValue = useDeferredValue(value);

  return (
    <div>
      <input value={value} onChange={e => setValue(e.target.value)} /><br/>
      <HeavyMemo value={deferredValue} />
    </div>
  );
}
```

Without `useDeferredValue`, every time you type in the input, `HeavyMemo` receives new props and re-renders the entire component, making input feel very laggy.

`useDeferredValue` is a React hook for performance optimization. It marks a value as deferrable (how? We'll explain later in the article), letting React process more urgent tasks first, such as UI updates triggered by user interactions.

By calling `useDeferredValue` at the top level of the App component, we get a deferred version of `value`. In the code above, React prioritizes updating the input (which must be fast) over updating `HeavyMemo` (in other words, allowing it to update at a slower pace). This prevents `HeavyMemo` from blocking the rest of the UI. This doesn't speed up `HeavyMemo`'s re-render. Instead, it tells React to lower the priority of `HeavyMemo`'s re-render so it doesn't block keyboard input. The list will "lag behind" the input, then "catch up."

The deferred "background" render is interruptible. For example, if you type again in the input, React will abandon that operation and restart with the new value. React always uses the latest provided value. In contrast, with React's previous synchronous rendering, components rendered in an uninterruptible manner until completion, and the UI only updated after rendering finished. If a component took a long time, the effects of user interactions remained invisible until rendering completed, resulting in lag.

#### **`useDeferredValue`** vs Debounce and Throttle

Debouncing and throttling are common techniques for controlling function call frequency in JavaScript. In some cases, debouncing and throttling can be entirely replaced by `useDeferredValue`, or they can be used in combination.

`useDeferredValue` doesn't require choosing a fixed delay — the background render time is the delay. On powerful devices, re-rendering happens almost instantly and is barely noticeable; on weaker devices, it "lags behind" the input.

`useDeferredValue`'s deferred re-render is interruptible. If a user presses a key while React is re-rendering a large list, React will abandon that render, handle the key press, and then start re-rendering again — avoiding lag. Debouncing and throttling, on the other hand, are blocking; they merely postpone the moment when rendering blocks the key press. Lag will still occur because if a user presses a key during a synchronous render, they'll still feel the lag.

##### Use Cases

- **useDeferredValue**: Suitable for optimizing rendering in React applications, especially for non-critical updates like non-essential UI updates or async data loading. It lets the app process more important updates first, then handles deferred updates during idle time. (Network requests are not reduced!)
- **Debounce and Throttle**: Suitable for controlling function call frequency — search input suggestions, window resizing, scroll event listeners, mouse movement handling — reducing the number of function executions and lowering performance overhead. They can also be used for non-rendering optimizations like reducing network requests. **(Summary: the work to optimize doesn't occur during the rendering process)**

##### Will `useDeferredValue` Components Be Interrupted Forever?

No. This is known as the "task starvation problem."

> When high-priority tasks finish executing and a low-priority task is about to run, if another high-priority task is inserted, the high-priority task runs again. If high-priority tasks keep cutting in line, low-priority tasks never get to execute. We call this the **task starvation problem**. (Reference [\[11\]](https://bytedance.larkoffice.com/docx/TLxAdCnuYoH5vrxPTGkcyct6nJd#share-JDXydde4IoG5ITx4eV4cBnZAnKd))

Task priority is ultimately handled by the Scheduler, which uses an expirationTime mechanism to solve the **starvation problem**. Transition tasks correspond to NormalPriority, with a 5-second expiration time. This means if the task still hasn't had a chance to execute after 5 seconds, it will switch to synchronous rendering mode and render.

# Starting from the Tearing Problem

**Screen Tearing** is a phenomenon where a display shows two or more frames simultaneously on the same screen. We won't elaborate on the visual manifestations of screen tearing. In React, there's a similar phenomenon. Here's an image for reference (demo link: [codesandbox.io/p/sandbox/t…](https://link.juejin.cn/?target=https%3A%2F%2Fcodesandbox.io%2Fp%2Fsandbox%2Ftearing-demo-0ecn6y)):

![](https://h-r2.kairi.cc/react18-concurrent-03.awebp)

In theory, JavaScript itself is single-threaded and shouldn't have tearing issues.

This phenomenon only occurs in React's Concurrent mode. In the React 18 major release, React switched to Concurrent mode by default. React's "concurrent rendering" mode can pause the rendering process to allow other work to proceed. Between these pauses, updates can silently occur and change the data used for rendering, which can cause the UI to display two different values for the same data.

In most cases, concurrent rendering produces a consistent UI, but under specific conditions, an edge case exists that can cause problems. There are no tearing issues when using native React `setState` and `useReducer` hooks, but tearing can occur in some state library external state management (such as older versions of react-redux and jotai).

As shown below, suppose a value in the External Store changes and starts a reactive update: the first node renders as blue (the store's value at that time). Then something happens that changes the External Store's value to red, but any component rendered after that will get the current External Store value, so the second and third components render as red. At this point, "Tearing" has occurred.

![](https://h-r2.kairi.cc/react18-concurrent-04.awebp)

# useSyncExternalStore

The `useSyncExternalStore` hook exists specifically to combat the "Tearing" problem. The external cause of "Tearing" is that (external) state can be updated during rendering while React is completely unaware. Conversely, if your application's state is entirely within React itself, you won't encounter the "Tearing" problem — React guarantees this.

Hereafter, `useSyncExternalStore` will be abbreviated as "**uSES**."

> Components and custom Hooks that do not access external mutable data during rendering, and only pass information using React props, state, or context, should not have issues, because React natively handles these concurrently. - [Concurrent React for Library Maintainers - reactwg/react-18 Discussion](https://github.com/reactwg/react-18/discussions/70) 2021-7-8

According to React 18's Release docs: uSES is a new Hook that allows external stores to support _concurrent reads_ by _forcing synchronous mutations_. It eliminates the need for useEffect when implementing subscriptions to external data sources and is the recommended Hook API for third-party libraries implementing external stores.

- External stores refer to data sources beyond React's state, context, and reducer — such as global variables, the DOM, localStorage, etc.
- Synchronous mutations means React completes rendering (mutations) synchronously within a single render pass (where "render" refers to the process of generating a React node tree).
- Concurrent reads: "concurrent" here refers to the concurrent rendering mode, ensuring consistent data reads and preventing "Tearing." (Partially referenced from [\[7\]](https://bytedance.larkoffice.com/docx/TLxAdCnuYoH5vrxPTGkcyct6nJd#share-E3Sxdo33NoLtN4xbX3scZC2Qnih))

In other words, uSES allows components to safely and effectively read (subscribe to) external data sources under React 18's Concurrent mode, and to schedule updates when the data source changes.

This might still sound a bit vague — let's look at the comparison in the next section.

# State Library Comparison

Here again we reference an image from the blog [Torn React - Juejin](https://juejin.cn/post/7423359941854412851), with some necessary discussion copied. React 18's Concurrent Mode was a significant change for community state libraries, and several state management libraries underwent refactoring to adapt — for example, [redux@8](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Freduxjs%2Freact-redux%2Freleases%2Ftag%2Fv8.0.0-alpha.0).

One important note: in all the examples below, [startTransition](https://link.juejin.cn/?target=https%3A%2F%2Freact.dev%2Freference%2Freact%2FstartTransition) was used to ensure concurrent updates. All are counter examples where the `+1` button is clicked three times in succession. Source code: [react tearing in concurrent mode - github gist](https://gist.github.com/rikisamurai/dd07d58d637f9fa2ae225ecffae6ab59)

![](https://h-r2.kairi.cc/react18-concurrent-05.awebp)

| Usage       | useState | useReducer | useSyncExternalStore | zustand | jotai | Redux |
| ----------- | -------- | ---------- | -------------------- | ------- | ----- | ----- |
| Lag         | No       | No         | Yes                  | Yes     | No    | Yes   |
| Tearing     | No       | No         | No                   | No      | Yes   | No    |

**Lag**: Whether the UI can still respond to user interactions during re-render. For example, uSES or zustand will freeze when clicking again during a re-render (you can see the button stays in a pressed state).

**Tearing**: Whether the state update produces inconsistent results. For example, after clicking three times in succession with jotai, different value states appear simultaneously.

An implementation example at AIPA: [React 18 Concurrent Rendering State Management Test](https://react-concurrent.aipa.bytedance.net/) (Try it yourself — requires intranet access)

![](https://h-r2.kairi.cc/react18-concurrent-06.awebp)

### Why Do uSES and zustand Lag? What Does uSES Actually Do?

```tsx
import { startTransition } from 'react';

function Controller() {
  const increment = useStore((state) => state.increment);
  const concurrentAdd = () => startTransition(increment);
  return <button onClick={concurrentAdd}>+1</button>;
}
```

In the code, the state's increment operation is wrapped in `startTransition`, right? Shouldn't this state change be marked as a Transition, enabling concurrent rendering without lag?

Let's read the source code (from [\[7\]](https://bytedance.larkoffice.com/docx/TLxAdCnuYoH5vrxPTGkcyct6nJd#share-ZYQedSabCoLJ6VxJT0RcRWHknif), the author has kept only the core logic, removing development mode instrumentation, error handling, and other secondary content):

```ts
// Main implementation
function mountSyncExternalStore<T>(
  subscribe: (() => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  // Redeclare referenced global variables at the top of the function — very good practice
  const fiber = currentlyRenderingFiber;
  // Get different values depending on SSR vs CSR environment
  const nextSnapshot = getIsHydrating() ? getServerSnapshot() : getSnapshot();

  // Mount a hook to handle the ExternalStore
  const hook = mountWorkInProgressHook();

  hook.memoizedState = nextSnapshot;
  const inst: StoreInstance<T> = {
    value: nextSnapshot,
    // Store the getSnapshot method itself for later update-time checks
    // to see if getSnapshot has changed
    getSnapshot,
  };
  hook.queue = inst;

  // Mount an effect to subscribe to store changes
  mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]);

  // Schedule an effect to update the mutable instance fields.
  // We will update this whenever subscribe, getSnapshot, or value changes.
  // Because there's no clean-up function, and we track the deps correctly,
  // we can call pushEffect directly, without storing any additional state.
  // For the same reason, we don't need to set a static flag, either.
  pushEffect(
    HookHasEffect | HookPassive,
    updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot),
    undefined,
    null,
  );

  return nextSnapshot;
}

// Store change subscription implementation
function subscribeToStore<T>(fiber, inst: StoreInstance<T>, subscribe) {
  const handleStoreChange = () => {
    // The store changed. Check if the snapshot changed since the last time we
    // read from the store.
    if (checkIfSnapshotChanged(inst)) {
      // Force a re-render.
      forceStoreRerender(fiber);
    }
  };
  // Subscribe to the store and return a clean-up function.
  return subscribe(handleStoreChange);
}

// Check whether an update should be triggered
function checkIfSnapshotChanged<T>(inst: StoreInstance<T>): boolean {
  const latestGetSnapshot = inst.getSnapshot;
  const prevValue = inst.value;
  try {
    const nextValue = latestGetSnapshot();
    return !is(prevValue, nextValue); // `is` here is object-is, performing reference comparison only.
  } catch (error) {
    return true;
  }
}

// Update the store value
function updateStoreInstance<T>(
  fiber: Fiber,
  inst: StoreInstance<T>,
  nextSnapshot: T,
  getSnapshot: () => T,
) {
  // These are updated in the passive phase
  inst.value = nextSnapshot;
  inst.getSnapshot = getSnapshot;

  // Something may have been mutated in between render and commit. This could
  // have been in an event that fired before the passive effects, or it could
  // have been in a layout effect. In that case, we would have used the old
  // snapshot and getSnapshot values to bail out. We need to check one more time.
  if (checkIfSnapshotChanged(inst)) {
    // Force a re-render.
    forceStoreRerender(fiber);
  }
}

function forceStoreRerender(fiber) {
  const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
  if (root !== null) {
    // Pass SyncLane here to indicate this is a synchronous update
    scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
  }
}
```

The React documentation says (from [\[10\]](https://bytedance.larkoffice.com/docx/TLxAdCnuYoH5vrxPTGkcyct6nJd#share-IIYxde4TOoXtZfxZpEncHsrynhe)): If the store is mutated during a non-blocking Transition update, React will fall back to performing that update in a blocking manner. Specifically, for each Transition update, React will call `getSnapshot` again before applying changes to the DOM. If the returned value differs from the initial call, React will re-execute the update from scratch, this time applying it as a blocking update to ensure every component on screen reflects the same version of the store. This is essentially the explanation of the code above.

![](https://h-r2.kairi.cc/react18-concurrent-07.awebp)

Combined with the example above:

- When a component first subscribes to a store using uSES, it executes something similar to the `mountSyncExternalStore` function above. It gets the initial state — using `getServerSnapshot()` if in an SSR environment (when `getIsHydrating()` is true), or `getSnapshot()` for client-side rendering.
- Simultaneously, it creates an `inst` instance (line 16), storing the `value` (current Snapshot state) and the `getSnapshot` function itself, for subsequent comparison and update operations.
- After the first click of the `+1` button, `startTransition(increment)` initiates a Transition update (still non-blocking at this point).
- During the non-blocking Transition update, the component's update operation is deferred. But during this process, if the store mutates (e.g., through an external operation modifying the store's state), the `handleStoreChange` callback in `subscribeToStore` (line 43-44) is triggered.
- `handleStoreChange` calls `checkIfSnapshotChanged` (line 57) to check if the state has changed. It uses the latest `getSnapshot` function to get the new value and compares it with the previous `value` (stored in `inst.value`). The comparison uses object-is (the `is` function) for reference comparison. If a change is detected, it calls `forceStoreRerender` (line 89) to force a component re-render.
- In `forceStoreRerender` (line 89), it calls `enqueueConcurrentRenderForLane` to place the update in the update queue, specifying the update priority (**SyncLane means synchronous priority** — although the overall update is deferred during the non-blocking Transition update, the store mutation update needs to be handled promptly).
- Then it calls `scheduleUpdateOnFiber` (line 93) to schedule this update. React's update scheduling mechanism arranges these updates based on priority.
- Although the Transition update is overall non-blocking, if a store mutation occurs during it, that mutation update is marked as high priority (SyncLane), so it executes as soon as possible (usually right after urgent updates are processed).
- After the render phase completes, it enters the passive update phase. At this point, the `updateStoreInstance` added by `pushEffect` (line 34) executes as a passive effect.
- `updateStoreInstance` (line 69) updates the `inst` instance's `value` and `getSnapshot` properties. It first assigns the new state value `nextSnapshot` and the new `getSnapshot` function to `inst`. Then it calls `checkIfSnapshotChanged` (line 57) again to check for changes, because the store's state might have been modified between the render phase and the passive effect phase. If changes are found, it calls `forceStoreRerender` (line 89) again to ensure the component correctly responds to store changes.
- So in simple terms, the second and third clicks happen during rendering and cause store changes. After the first render completes, React calls `getSnapshot` again before applying changes to the DOM. If the returned value differs from the initial call, React re-executes the update from scratch, this time as a blocking update, ensuring every component on screen reflects the same version of the store.
- Finally, `scheduleUpdateOnFiber` enters the `scheduleUpdateOnFiber` method, detects that the update priority is **SyncLane**, (…other conditions and intermediate steps omitted), then **performSyncWorkOnRoot** performs a synchronous rendering update — at this point, rendering is synchronous and uninterruptible.

The React team is currently revisiting this and plans to natively support concurrent external stores using the `use` API. The goal is to allow reading external state during rendering without tearing, and to seamlessly work with all concurrent features React provides. <https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more#concurrent-stores>

**zustand** also uses useSyncExternalStore, so it lags just like useSyncExternalStore (you can use [use-zustand](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fzustandjs%2Fuse-zustand) to solve this, but Tearing will occur). **react-redux** adopted useSyncExternalStore in [8.0](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Freduxjs%2Freact-redux%2Freleases%2Ftag%2Fv8.0.0-alpha.0) for its refactoring, so it also experiences lag. Therefore, some state libraries implemented with useSyncExternalStore cannot benefit from Concurrent Mode.

### Why Does Jotai Cause Tearing?

> This section directly references [\[2\]](https://bytedance.larkoffice.com/docx/TLxAdCnuYoH5vrxPTGkcyct6nJd#share-OWVTdZTeUoLnmKx9V5Ocz16wn55)

From the examples above, we can see that simply using useState or useReducer in Concurrent Mode neither lags nor causes Tearing. Jotai's internal implementation uses useReducer, so why does it also cause Tearing? Because using useState or useReducer alone is fine, but Jotai uses **useReducer + useEffect** for synchronous updates, which can lead to Tearing.

> Reference: [jotai/src/react/useAtomValue.ts at main - pmndrs/jotai](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fpmndrs%2Fjotai%2Fblob%2Fmain%2Fsrc%2Freact%2FuseAtomValue.ts%23L143)
>
> react-redux 7 also uses useReducer + useEffect, so it similarly causes tearing issues in concurrent mode; however, in react-redux 8, it was replaced with useSyncExternalStore, so tearing is no longer an issue ([release](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Freduxjs%2Freact-redux%2Freleases%2Ftag%2Fv8.0.0-alpha.0), [PR](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Freduxjs%2Freact-redux%2Fpull%2F1808%2Ffiles%23diff-af3f9a50d6ee93cbd74ce49df9fbc050728add74c7355cc851a0d57d3286d260L70))

Jotai can fully enjoy the benefits of Concurrent Mode but may experience occasional Tearing.

> [Why useSyncExternalStore Is Not Used in Jotai - Daishi Kato's blog](https://link.juejin.cn?target=https%3A%2F%2Fblog.axlight.com%2Fposts%2Fwhy-use-sync-external-store-is-not-used-in-jotai%2F) Daishi believes the benefits of Suspense and Concurrent support in Jotai outweigh the drawbacks of temporary tearing.

The Tearing phenomenon is only temporary — the UI will eventually reach consistency.

# Comparing Synchronous and Concurrent

| Synchronous                                                                                                                                                                                                                                                                                                                                                                                | Concurrent                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![](https://h-r2.kairi.cc/react18-concurrent-08.awebp) | ![](https://h-r2.kairi.cc/react18-concurrent-09.awebp) |

As you can see, the synchronous mode behavior is essentially the same as uSES.

Concurrent rendering is a huge benefit because users can interact with the page without being blocked by React. With concurrent rendering, React can let clicks happen, making the page feel smooth and interactive to the user.

# How Is Concurrent Rendering Interruptible?

Let's revisit the introduction to **concurrent mode**:

When state updates occur, each update is assigned a priority. If a higher-priority task arrives during an update, it interrupts the current low-priority task, executes the high-priority task first, then resumes the low-priority task. Additionally, in each browser refresh frame, a certain fixed time is reserved for the browser to render the page. If the current update task takes too long, it is interrupted and continued in the next frame. (Reference [\[9\]](https://bytedance.larkoffice.com/docx/TLxAdCnuYoH5vrxPTGkcyct6nJd#share-WZqQdBBV1oW74NxKrWXcCu6NnRc))

![](https://h-r2.kairi.cc/react18-concurrent-10.awebp)

A good diagram:

![](https://h-r2.kairi.cc/react18-concurrent-11.awebp)

### React Work Loop (Right Side)

- performWorkUntilDeadline (execute scheduling)

- startTime = currentTime; (record scheduling start time): At the beginning of each work loop, record the current time (`startTime`) for subsequent time management.

- workLoop (work loop): The core loop that continuously retrieves the highest-priority task from the task queue and executes it.
  - taskQueue (task queue): Stores pending tasks, sorted by priority.

- currentTask != null (are there still tasks?): Check whether there are tasks to execute.
  - If the task queue is not empty, get the highest-priority task and execute it.
  - If the task queue is empty, close the message queue — all tasks have been executed.

- shouldYieldToHost (should we yield to the host?): Determine whether the current task execution time exceeds the scheduling time.
  - If time is exceeded, yield to the host environment, register a macro task, and wait for the next execution (of the workloop itself).
  - Otherwise, continue executing the next task.

### Browser Event Loop Macro Task Scheduling (Left Side)

> This section assumes the reader understands the browser's event loop.

- Execute macro task
  - JavaScript is a single-threaded, non-blocking scripting language. The JavaScript main thread and the rendering thread are mutually exclusive.

  - Macro task execution process:
    - Execute a macro task (if the execution stack is empty, get one from the task queue).
    - If a micro task is encountered during execution, add it to the micro task queue.
    - After the macro task completes, immediately execute all micro tasks in the current micro task queue (in sequence).

- After macro task execution completes, check for rendering, then the rendering thread takes over. If the macro task queue is empty, sleep until a macro task appears.

### Recommended Reading on Concurrent Principles:

[React Source Code Analysis: Priority Lane Model Part 1 - Juejin](https://juejin.cn/post/7008802041602506765)

[React Source Code Analysis: Priority Lane Model Part 2 - Juejin](https://juejin.cn/post/7009105181015015455)

[React Source Code Analysis: Scheduler - Juejin](https://juejin.cn/post/7007613737012035592)

[Introduction to React Concurrent Mode - ByteTech](https://bytetech.info/articles/7019128966426394638)

I personally believe these resources explain it better than I can.

# Personal Reflections

Here are a few personal thoughts:

1.  **React's workloop uses the MessageChannel API**: MessageChannel sends messages in the form of DOM Events, making it a macro task that executes at the beginning of the next event loop iteration. This allows the browser's event loop to continuously run React's workloop. Here's a minimalist implementation of an event loop using MessageChannel: [MessageChannel - Juejin](https://juejin.cn/post/6844903839162695688?from=search-suggest#heading-2) MDN reference: [MessageChannel - Web API | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/MessageChannel)

2.  For updates triggered by user actions that don't use the Transition API, they are essentially still synchronous updates. This is because discrete user action events (like clicks, text input) have a priority of `ImmediateSchedulerPriority` and execute immediately, entering synchronous rendering mode during scheduling. So when developing with React 18, we need to be mindful of this. Some libraries, like routing libraries, handle this for us — when we click `<Link />`, they execute non-blocking updates so we don't get temporarily frozen. [tanstack/react-router example](https://github.com/TanStack/router/blob/93c22c68bd1cf1af81b2c711a0dc95735022f3bd/packages/react-router/src/Transitioner.tsx#L36) For continuous interactions like scrolling and dragging, the corresponding expiration time is 2.5 seconds.
    1.  ![](https://h-r2.kairi.cc/react18-concurrent-12.awebp)

3.  React 18 brought many changes. You can find related discussions in this Discussion: [reactwg/react-18 - Discussions](https://github.com/reactwg/react-18/discussions) For example:
    1.  When useEffect is the result of a discrete action (click, input), it fires synchronously. [discussions/128](https://github.com/reactwg/react-18/discussions/128)

    2.  Automatic batching in React 18 [discussions/21](https://github.com/reactwg/react-18/discussions/21)

References:

1.  React v18.0 2022-3-19 <https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react>
2.  Torn React - Tearing 2024-10-9 <https://juejin.cn/post/7423359941854412851#heading-1>
3.  Screen Tearing Wiki <https://en.wikipedia.org/wiki/Screen_tearing>
4.  React Tearing Problem 2024-10-27 <https://juejin.cn/post/7430473240198545427>
5.  What is tearing? 2021-7-8 <https://github.com/reactwg/react-18/discussions/69>
6.  Concurrent React for Library Maintainers 2021-7-8 <https://github.com/reactwg/react-18/discussions/70>
7.  React 18's New API "useSyncExternalStore" 2023-1-16 <https://bytetech.info/articles/7189071164596027451>
8.  From Usage to Implementation: Embracing React 18 2022-5-9 <https://bytetech.info/articles/7095547016524070926>
9.  Introduction to React Concurrent Mode 2021-10-15 <https://bytetech.info/articles/7019128966426394638>
10. useSyncExternalStore - React <https://react.dev/reference/react/useSyncExternalStore#caveats>
11. React Source Code Analysis: Priority Lane Model Part 1 2021-9-17 <https://juejin.cn/post/7008802041602506765>
