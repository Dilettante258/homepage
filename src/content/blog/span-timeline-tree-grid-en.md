---
title: "Span Timeline Tree Grid Implementation Review: Key Pain Points and Design Decisions"
description: "A practical review of how the Span timeline tree grid was implemented, including data modeling, tree rendering, layout, highlight navigation, style priority handling, and reusable abstraction."
date: 2026-02-23
locale: en
tags: [Component Design, CSS, Engineering Practice]
---

This article documents the implementation approach and key trade-offs behind the `Span Timeline Table`.

Live demo: <https://kairi.cc/en/gallery/span-timeline-display>  
Note: this article focuses on implementation details. If you want to see interactions first (timeline, connectors, highlight navigation, sticky columns), open the demo page first and read this article alongside it.

Target capabilities:

- Collapsible call tree on the left
- Timeline + metadata columns on the right
- Union highlight (tags / keywords / errors)
- Match navigation and positioning
- Reuse across scenarios (same base component)

Related production-facing documentation: <https://www.volcengine.com/docs/6431/81116?lang=zh>

## Boundaries and Constraints

Compared with a regular table, this component combines three capability sets:

1. Tree structure (expand/collapse + hierarchy connectors)
2. Grid layout (multi-column + scrolling + sticky columns)
3. Time expression (duration bars + alignment + error states)

The areas most likely to get out of control:

- Cross-impact between filtering / expansion / navigation states
- Too many non-semantic DOM nodes introduced only for styling

## Why Not Use an Off-the-Shelf Component Directly?

Using Arco Design as a concrete reference, its baseline capabilities are solid:

- `Table` supports tree data (`data.children`)
- `Tree` supports connectors (`showLine`)

But for a combined scenario like “tree + timeline + metadata columns + highlight navigation”, composition cost is still high.

| Dimension | Arco Table (tree data) | Arco Tree (`showLine`) | This approach (`TreeGridBase`) |
| --- | --- | --- | --- |
| Tree expansion | Supported | Supported | Supported |
| Connectors | Not built-in as a primary model | Supported | Supported (customizable) |
| Multi-column grid layout | Strong | Weak | Strong |
| Table styling system (header / row / cell) | Supported | Not supported (manual composition needed) | Unified style protocol |
| Column alignment control (left/center/right) | Supported | Not supported (manual implementation needed) | Built into column model |
| Timeline column (proportional positioning) | Custom render required | Possible but cumbersome (extra column layout + proportional positioning needed) | Native design target |
| Sticky columns + horizontal scrolling | Supported, but costly when combined with tree/timeline customization | Not applicable | Unified implementation for this scenario |
| Click states (active / last-clicked) | No unified semantic model (business layer must maintain) | No unified semantic model (business layer must maintain) | Unified state protocol (e.g. `data-watching` / `data-last-clicked`) |
| Click callbacks and cross-column linkage | Row events are available, but tree-timeline linkage needs extra wrapping | Node events are available, but grid linkage needs extra wrapping | Unified callback entry in base layer |
| Union highlight (tags / keywords / errors) | Requires extra business-layer implementation | Requires extra business-layer implementation | Built into one rendering protocol |
| Match navigation (visible items only) | Needs extra DOM protocol | Needs extra DOM protocol | Unified with tree state |
| Type reuse (generics + `idField`) | Feasible, but often scattered per page | Feasible, but mostly node-level | Centralized as base capability |

Arco capability in short:

```tsx
// Table: tree data
<Table columns={columns} data={data} />

// Tree: connectors
<Tree treeData={treeData} showLine />
```

Conclusion: in this scenario, off-the-shelf APIs are too coarse-grained, and the style system differs significantly from the target UI.  
Continuing with patch-style customization would increase maintenance cost over time, so a dedicated reusable base was a better choice.  
That is why `TreeGridBase<T>` was introduced: business modules only define columns and data mapping, while complex interactions are handled centrally in the base.

These capabilities also map to real production use cases; see the Volcengine documentation: <https://www.volcengine.com/docs/6431/81116?lang=zh>.

## Data Modeling: Generic Constraints for Reuse and Efficiency

Instead of assuming a fixed `id` field, the tree node shape is modeled generically:

```ts
type BaseTree<T> = T & {
  children: BaseTree<T>[];
};
```

The component consumes generic nodes and exposes `idField: keyof T` to specify which field acts as the unique identifier for a given data source.

Examples:

- `idField = "span_id"`
- `idField = "trace_id"`
- `idField = "id"`

The point is not only configurability; generic constraints stabilize component behavior:

1. Unified tree boundary (`children` required), ensuring core rendering logic remains valid.
2. `idField: keyof T` adapts to different primary-key naming conventions.
3. TypeScript generic inference keeps column definitions, node field access, and type checks aligned with less duplication.
4. The same tree-grid logic can be reused across business models with a smaller change surface.

## Tree Rendering: Use `details/summary` as the Expansion Base

Expansion does not rely on a custom `expandedMap`; it is built on native `details/summary`.

Reasons:

- Semantic structure is natural
- Keyboard accessibility and behavior consistency are better
- Directly compatible with `::details-content` animation

Result: lower expansion-system complexity and cleaner business-state management.

## Layout Strategy: Avoid Misalignment When Columns Grow

The tree-grid layout is stabilized with three rules:

1. Tree column uses `flex: 1` to consume remaining width.
2. Other columns have fixed widths.
3. Internal total width (`innerWidth`) is configurable; overflow uses horizontal scrolling.

Result: adding fields mostly changes scroll range, not structural alignment.

## Timeline Cell: Extract as an Independent Component

Timeline bar logic is extracted from column templates into `DurationBarCell`, with minimal parameters:

- `startUs`
- `durationUs`
- `totalUs`
- `label`

Positioning is driven by CSS variables:

```css
.cell {
  --left: calc(var(--row-start-us) / var(--row-total-us) * 100%);
  --width: calc(var(--row-duration-us) / var(--row-total-us) * 100%);
}

.bar {
  left: var(--left);
  width: max(var(--width), 0.5px);
}
```

Additional rule: when start offset exceeds 80% of total width, label alignment switches rightward to avoid tail overlap.

## Hierarchy Connectors: Prefer Pseudo-Elements to Reduce DOM Weight

Connectors and status dots are drawn in CSS without extra structural nodes:

- Vertical hierarchy line: `.node` background gradient
- Horizontal dashed connector: `rowConnector::after`
- Success/error dot: `rowConnector::before` + `data-error`

Example:

```css
.node {
  background: linear-gradient(var(--border-color), var(--border-color))
    12px 0 / 1px 100% no-repeat;
  padding-left: 24px;
}
```

Result: DOM remains business-oriented and style iteration cost is lower.

Solid/dashed line preview:

<div style="font-size: 12px; color: #64748b; margin-top: 8px;">Solid line</div>
<div style="width: 240px; height: 0; border-top: 1px solid #94a3b8; margin: 6px 0 10px;"></div>

<div style="font-size: 12px; color: #64748b;">Dashed line</div>
<div style="width: 240px; height: 0; border-top: 1px dashed #94a3b8; margin: 6px 0 10px;"></div>

<div style="font-size: 12px; color: #64748b;">Dashed line (repeating-linear-gradient, controllable segment/gap)</div>
<div style="width: 240px; height: 1px; background: repeating-linear-gradient(to right, #94a3b8 0 6px, transparent 6px 10px); margin: 6px 0 12px;"></div>

In the tree grid, horizontal connectors follow the same idea, attached to `::after` and aligned via positioning variables.

## Highlight and Navigation: Unified “Visible Match” Semantics

Matching uses union logic:

```ts
match = tagMatch || keywordMatch || errorMatch;
```

Navigation rules:

1. Count visible matches only (affected by collapse state).
2. Do not auto-expand tree on filter.
3. Traverse in DOM order with cyclic navigation.

Per-row attributes:

- `data-row-id`
- `data-match`

Filter visible rows:

```ts
querySelectorAll("[data-row-id][data-match='true']")
  .filter((el) => el.getClientRects().length > 0);
```

Positioning uses `scrollIntoView({ behavior: "smooth" })`.

## Style Priority: Move from Class Stacking to Dataset Protocol

States are written to DOM attributes instead of stacking class combinations:

- `data-mark`: matched
- `data-watching`: current navigation item
- `data-last-clicked`: last clicked item

Attribute selectors handle priority:

```css
.nameText[data-mark="true"] { --bgC: #fbdda7; }
summary[data-error="true"] .nameText[data-mark="true"] { --bgC: #ffa9a7; }
.nameText[data-watching="true"] { border-color: var(--bdC); }
```

Result: highlight/error/current states compose predictably.

## Animation Strategy: Reuse `::details-content` Globally

Collapse animation uses `::details-content` with `interpolate-size` for height transitions:

```css
details::details-content {
  transition: height 0.5s ease, content-visibility 0.5s ease allow-discrete;
  height: 0;
  overflow: clip;
}

@supports (interpolate-size: allow-keywords) {
  :root { interpolate-size: allow-keywords; }
  details[open]::details-content { height: auto; }
}
```

This is placed in the global layout layer and reused across all `details` scenarios in the site.

## Abstraction Strategy: Stabilize Capabilities First, Then Extract

After behavior became stable, shared logic was extracted into `TreeGridBase<T>`, including:

- Column model
- Scroll container
- Sticky header/columns
- Highlight controller
- Match navigation

Business components (`SpanTimeline`, `TreeGridChainDemo`) keep only:

- Column definitions
- Data mapping

## Reusable Conclusions from This Implementation

1. For tree + table + timeline components, stabilize the data input layer first.
2. Prefer native semantics for expansion; reduce custom state-machine complexity.
3. Define match-navigation semantics around user-visible scope.
4. Dataset-based state expression works better for complex style priority scenarios.
5. Extract abstractions after validation; this usually yields better stability and reuse.

## References

1. Juejin (article rhythm reference)  
   <https://juejin.cn/post/7251501860321411130>
2. Chrome Developers (`details` animation approach)  
   <https://developer.chrome.com/blog/styling-details?hl=zh-cn#animating_the_details-content_pseudo>
3. Volcengine docs (related production documentation)  
   <https://www.volcengine.com/docs/6431/81116?lang=zh>
