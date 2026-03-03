---
title: "Compile-Time Magic: A Custom Webpack Loader for Inlining Function Call Results as Static Strings"
description: "This article explains how a custom Webpack/Rspack loader folds getDocsLink calls into URL literals at build time, preventing large JSON maps from entering the initial bundle and achieving zero runtime overhead with better tree shaking."
date: 2026-03-03
locale: en
tags: [Node.js, Frontend Engineering]
---

## Problem Background: The Multi-Platform Docs Link Dilemma

Our product is deployed in both domestic and overseas environments, and the related documentation is split across different domains. The app contains many links to these docs, but the URL differs by platform for the same document, while only the hash anchor stays consistent.

**Issues with the original approach:**

Initially, we manually maintained a `getDocsLink` function that dynamically assembled the final URL from a document ID:

```ts
// getDocsLink.ts
import docsMap from "./docs-map.json"; // huge file with thousands of mappings

export function getDocsLink(
  id: string,
  hash: string,
  lang: "zh" | "en" = "zh",
) {
  const entry = docsMap[id];
  const baseUrl = typeof entry === "string" ? entry : entry?.[lang];
  return hash ? `${baseUrl}#${hash}` : baseUrl;
}
```

**Usage example:**

```tsx
<a href={getDocsLink("quickstart", "install")}>Quick Start</a>
```

But this approach introduced serious performance issues:

- **Large JSON payload**: the mapping table contains thousands of records, and all system-maintained mappings are included
- **No effective tree shaking**: once the function is imported, the entire JSON is forced into the bundle
- **Heavy first-screen cost**: if first-screen components use this function, load performance is directly affected

**Key idea:** Re-examining this problem, since the return value of `getDocsLink('quickstart', 'install')` is fully known at **compile time**, why not inline it as a string literal during build?

Ideally, after build, the code should be "folded" into:

```html
<a href="https://docs.example.com/quickstart#install">Quick Start</a>
```

---

## Solution Design: Compile-Time Constant Folding

The core idea comes from **constant folding** in compiler optimization:

```
Source code:  const url = getDocsLink('quickstart', 'install');
                ↓ transformed at build time
Output code:  const url = "https://docs.example.com/zh/quickstart#install";
```

**Key benefits:**

- Zero runtime overhead: no mapping table load, no function call
- Self-explanatory output: built code directly shows the final URL
- Automatic tree shaking: the original function becomes unused and is removed by the bundler

---

## Implementation Details: docs-link-inline-loader

### 1. Overall Architecture

This is a typical **source-transform loader** that runs during Webpack/Rspack module processing:

```
Input: source code string
  ↓
Process: scan → parse args → lookup map → replace
  ↓
Output: transformed source code string
```

### 2. Core Implementation

**Phase 1: fast pruning**

```typescript
// Skip immediately if the file does not import ... getDocsLink
const hasImport = lines.some(
  (line) => isImportLine(line) && line.includes(functionName),
);
if (!hasImport) return input;
```

**Phase 2: source scanning and replacement**

Use string scanning instead of an AST approach (trade-off between performance and complexity):

```typescript
while (cursor < input.length) {
  const callStart = input.indexOf(functionName, cursor);
  // ... boundary checks (avoid matching mygetDocsLink, etc.)

  // Extract args: getDocsLink('id', 'hash') → ['id', 'hash']
  const argsContent = input.slice(openParenIndex + 1, closeParenIndex);
  const parsed = parseLiteralArgsWithJson(argsContent);

  // Lookup and replace with URL literal
  const url = resolveUrl(mapping, docId, lang);
  output += JSON.stringify(applyHash(url, hash));
}
```

**Phase 3: argument parsing trick**

Use `JSON.parse` to parse simplified JavaScript literals:

```typescript
function parseLiteralArgsWithJson(argsContent: string) {
  // "'id123', 'hash'" → '["id123", "hash"]' → JSON.parse
  const jsonText = `[${argsContent.trim()}]`.replace(/'/g, '"');
  return JSON.parse(jsonText);
}
```

**Phase 4: watch mode support**

Register the mapping file via `addDependency` for hot rebuilds:

```typescript
this.addDependency(absMappingPath); // docs-map.json changes → auto recompile
```

### 3. Robustness Design

| Scenario                | Strategy                        | Behavior                                |
| :---------------------- | :------------------------------ | :-------------------------------------- |
| Missing doc ID          | `onMissing: 'fallback'`         | Replace with `""` or keep original call |
| Non-literal argument    | `onNonConstant: 'warn'`         | Emit warning and skip this call         |
| Wrong argument count    | Same as `onNonConstant`         | Prevent runtime errors                  |
| Language arg validation | Strict check for `'zh' \| 'en'` | Ensure URL correctness                  |

---

## Effect Validation: Before vs After

**Source code before bundling:**

```typescript
import { getDocsLink } from "./getDocsLink";

export const CASES = {
  staticHash: getDocsLink("id123", "url-hash22312313"),
  staticPreSharp: getDocsLink("id123", "#url-hash"),
  staticLangEn: getDocsLink("id123", "h", "en"),
  dynamicId: getDocsLink(dynamicId, "h"),
  missingId: getDocsLink("missing-id", "h"),
};
```

**After loader transformation:**

```typescript
import { getDocsLink } from "./getDocsLink"; // removed by tree shaking

export const CASES = {
  staticHash: "https://example.com/zh/doc?id=123#url-hash22312313",
  staticPreSharp: "https://example.com/zh/doc?id=123#url-hash",
  staticLangEn: "https://example.com/en/doc?id=123#h",
  dynamicId: "",
  missingId: "",
};
```

**Build artifact comparison:**

![](https://h-r2.kairi.cc/github/docs-link-inline-loader.webp)

---

## Engineering Considerations

### Why choose string scanning over AST?

| Approach            | Pros                                           | Cons                                               | Choice               |
| :------------------ | :--------------------------------------------- | :------------------------------------------------- | :------------------- |
| **String scanning** | Zero dependencies, fast, simple implementation | Cannot handle complex expressions, more edge cases | **PoC phase** ✅     |
| Babel AST           | Precise, can handle arbitrary expressions      | Requires `@babel/core`, affects build speed        | Future iteration     |
| SWC                 | Very fast, Rust-based                          | Higher learning cost, requires writing Rust plugin | Large-scale adoption |

Given current constraints (literal arguments only), business scenarios are already covered 100%. With `onNonConstant: 'error'`, non-compliant calls can be surfaced during CI.

### Import cleanup strategy

The loader only handles **call-site replacement** and does not remove import statements:

```typescript
// After transformation: getDocsLink becomes an unused symbol
import { getDocsLink } from "./getDocsLink"; // dead code

const url = "https://..."; // direct literal usage
```

During production build, Webpack/Rspack tree shaking automatically removes unused imports, so the loader does not need to do this itself.

---

## Usage

```typescript
// rspack.config.ts
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "docs-link-inline-loader",
          options: {
            mappingPath: path.resolve(__dirname, "docs-map.json"),
            functionName: "getDocsLink",
            lang: "zh",
            onMissing: "fallback",
            onNonConstant: "warn",
            fallback: "",
          },
        },
      },
    ],
  },
};
```

## Summary and Outlook

With a custom loader, we convert **runtime data lookup** into **build-time code generation**, solving multi-platform docs link resolution with zero runtime overhead.

---

_Full implementation: [docs-link-inline-loader](https://github.com/Dilettante258/docs-link-inline-loader)_
