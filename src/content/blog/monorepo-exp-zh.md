---
title: 我的 Monorepo 实践经验：从基础概念到最佳实践
description: 涵盖了 Monorepo 的关键概念、库包策略、如何管理跨包依赖、共享配置的最佳做法，以及使用 Turborepo 提高构建效率的技巧。同时，探讨了如何配置 npmrc 和 pnpm-workspace 来优化包管理，帮助团队实现更高效、可持续的前端工程化。
date: 2026-03-01
locale: zh
tags: [Node.js, 前端工程]
---

本文将系统地整理我在 Monorepo 和前端工程化方面的一些实践经验，先简单介绍几个概念。

**Monorepo（单一代码仓库）**：Monorepo 是将多个应用和共享库放在同一个仓库中进行管理。与多仓库模式相比，Monorepo 更加高效，尤其在代码共享、依赖升级和跨项目协作方面。

**工程化**：通过规范、工具链和流程，把“能跑”提升到“可维护、可协作、可持续交付”。它覆盖的不只是开发，还包括构建、测试、发布、质量保障等完整生命周期。

## Monorepo 里最关键的抽象：应用包与库包

### 应用包（App）

应用包是最终会被部署的项目，通常放在 `apps/*`，例如 Web、Admin、Docs、BFF 等。

### 库包（Package）

库包用于复用能力，通常放在 `packages/*`，本身一般不直接部署，而是被应用包消费。

在 Monorepo 里，库包常见有三种策略：

1. 可发布包（Publishable Package）
2. 预构建包（Compiled Package）
3. 源码引用包（Source Package）

选择哪种策略取决于具体场景，没有绝对的优劣之分。

## 三种库包策略介绍

### 1) 可发布包：面向仓库外复用

如果这个包是要提供给外部团队或开源用户使用，那么应该采用可发布包的方式。

优点：

- 对外分发标准清晰，边界明确
- 可独立版本化，兼容性管理更规范

代价：

- `package.json` 字段配置更复杂（`name`、`exports`、`types`、`files`、`publishConfig` 等）
- 可能需要考虑 CJS/ESM 的导出兼容与消费方式（如 `import`/`require`、不同 bundler 解析差异）
- 需要维护发版流程、版本语义和变更记录
- 在仓库内频繁迭代时，版本与锁文件更新会增加心智负担

### 2) 预构建包：面向仓库内复用、兼顾稳定与性能

预构建包首先会构建出 dist 文件，应用包再消费这些构建结果。

优点：

- 应用包构建更加稳定，模块之间的边界更加清晰
- 减少重复转译，尤其在大仓库中

代价：

- 需要维护 `build` 步骤与产物一致性
- 调试链路比直接使用源码更长

一个典型配置：

```json
{
  "name": "@workspace/utils",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc"
  }
}
```

在工作区里引用通常用：

```json
{
  "dependencies": {
    "@workspace/utils": "workspace:*"
  }
}
```

### 3) 源码引用包：开发体验优先

源码引用包直接导出 src/\*.ts(x)，由应用包的构建工具（如 Vite、Webpack等）完成转译。

优点：

- 配置简单，改完即生效，开发体验好
- 少一层“先打包再消费”的步骤

代价：

- 应用包需要承担类型检查和转译的成本
- 对 TypeScript 配置一致性要求更高

示例：

```json
{
  "name": "@workspace/utils",
  "exports": {
    "./tool": "./src/tool.ts"
  }
}
```

这种模式通常不需要 `build` 脚本，但建议保留独立的类型检查脚本（例如 `typecheck`）。

很多团队最终会混用这三种策略：

- UI 组件用预构建或源码引用
- 配置类包（eslint、tsconfig）走源码引用
- SDK 或公共能力包走可发布流程

## 如何初始化一个靠谱的 Monorepo

最好的学习方法就是模仿。可以参考 [Turborepo Getting Started 页面](https://turborepo.dev/docs/getting-started/examples)。提供的示例

例如，[Kitchen Sink](https://github.com/vercel/turborepo/tree/main/examples/kitchen-sink)中的 @repo/ui 采用了预构建包的方式。如果你想使用预构建包，可以重点查看 apps/admin 是如何消费它的。示例中还展示了 eslint-config 和 tsconfig 这类公共配置包的使用。不同包通过继承 base 配置，既能保证代码风格一致，也能针对不同项目做细化适配（比如规则微调或插件加载）。

如果你更倾向于使用源码引用包，可以参考[Vite + React 示例](https://github.com/vercel/turborepo/tree/main/examples/with-vite-react)。这个例子里的 `@repo/ui` 采用的就是源码引用包。

另外，Turborepo 还有一个面向 AI 的 `best-practices/RULE.md`，也可以读一读：[链接](https://raw.githubusercontent.com/vercel/turborepo/9b66431e8e0a17d20e677098ca721d3ba19dad81/skills/turborepo/references/best-practices/RULE.md)。

因为 Turborepo 本身就是 Monorepo 的任务编排工具，所以它的文档和示例质量都很高，值得反复参考。

## 共享 tsconfig.json：把配置做成一个包

在 monorepo 中创建一个共享的 tsconfig 配置包（比如放在 packages/typescript-config 里）是一个常见的做法：把一些通用的 TypeScript 配置写在基础配置（`base.json`）里，然后让各个项目（比如 Next.js 应用、库项目等）通过 `extends` 引用这个基础配置。这样整个仓库能有一致的 TS 设置。

`packages/typescript-config` 可以声明一个 `package.json`：

```json
{
  "name": "@repo/typescript-config"
}
```

## 关于 tsconfig references

在 Monorepo 中，很多人都会接触到 TypeScript 的 [`references`](https://www.typescriptlang.org/docs/handbook/project-references.html) 配置。Turborepo 官方建议，大多数情况下不需要使用 TypeScript 项目引用。

参考：[
You likely don’t need TypeScript Project References
](https://turborepo.dev/docs/guides/tools/typescript#you-likely-dont-need-typescript-project-references)

它会引入额外的配置和缓存层，这可能会在使用 Turborepo 时带来问题，且很少能带来实际的好处。

具体来说：

- 额外的配置：使用 TypeScript 项目引用时，你需要在不同的项目之间配置相应的 tsconfig.json 文件，这增加了配置的复杂度。

- 额外的缓存层：TypeScript 项目引用为每个项目生成独立的构建输出，需要将缓存目录配置到`.gitignore`中，`turbo.json`中。

但在某些特定场景下，如 Hono RPC 的前后端类型联动时，项目引用非常必要。
参考：

- [Hono RPC 文档](https://hono.dev/docs/guides/rpc#typescript-project-references)
- [实战文章](https://catalins.tech/hono-rpc-in-monorepos/)

如果你使用了源码引用包，建议统一关键编译选项（如 `module` 与 `moduleResolution`），避免跨包解析不一致。

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

`references` 示例：

```json
{
  "references": [{ "path": "../packages/utils/tsconfig.json" }]
}
```

## 关于 package imports（子路径导入）

在编写子包代码时，可以在 `tsconfig` 中使用 `compilerOptions.paths` 来创建别名。然而，这个别名只在当前 TypeScript 配置上下文中有效，不会被其他包自动读取。

如果你使用 TypeScript 5.4+，推荐使用 Node.js 的子路径导入（`imports`）来替代 TypeScript 的路径别名，在 `package.json` 内编写：

```json
{
  "imports": {
    "#*": "./src/*"
  }
}
```

那源码中可以这样引用自己的文件：

```tsx
import { MY_STRING } from "#utils.ts"; // Uses .ts extension
export const Button = () => {
  return <button>{MY_STRING}</button>;
};
```

通过这种方式，可以在模块内部使用子路径导入，不会受 TypeScript 配置的限制。这里的`imports` 主要解决包内部如何引用，`exports` 主要解决包对外暴露什么。也就是说，跨包消费还是走包名和 `exports`，而不是把 `imports` 当成跨包 alias。

这种模式下要注意导入路径和产物格式保持一致（例如编译包需要使用 `.js` 后缀）。

## 关于跨包“跳转到定义”的实现

在 Monorepo 项目中，多个包通常是彼此依赖的。如果你希望在 IDE（如 VSCode）中通过“跳转到定义”功能，在不同包之间轻松导航（例如，从 `ui` 包跳转到 `utils` 包中的代码），需要进行一些配置，以确保不同包之间的 TypeScript 类型信息能够正确链接和识别。

对于预构建包，当包已经编译后，跳转到定义的功能通常不会直接跳转到源代码。例如，点击一个 `A.js` 的导出，编辑器将跳转到 `dist` 文件夹中的生成代码，而不是源代码。为了确保跳转功能正常工作，需要在 TypeScript 配置文件中启用 `declaration` 和 `declarationMap` 选项。这样生成的 `.d.ts`（类型声明文件）和 `.d.ts.map`（源映射文件）就能帮助编辑器找到原始的 TypeScript 源代码。

配置示例：

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

我个人对这个问题还有另一种替代方法，可以通过配置 `allowImportingTsExtensions` 和 `rewriteRelativeImportExtensions` 来解决，同时改成源码引用包。启用这两个选项后，编辑器会识别并允许在代码中显式地使用 `.ts` 扩展名进行模块导入，这样跳转功能会直接指向原始的 TypeScript 源代码。代码里原有的`import ’./A.js'` 也可以改成`import ’./A.ts'`了。

相关配置如下：

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true
  }
}
```

#### 配置项解释：

- **`allowImportingTsExtensions`**：此配置项允许你在导入模块时显式使用 `.ts` 扩展名。默认情况下，TypeScript 会自动忽略文件扩展名，但启用此选项后，你可以在 `import` 语句中明确指定 `.ts` 扩展名。

- **`rewriteRelativeImportExtensions`**：此配置项使得 TypeScript 在生成 JavaScript 代码时，会自动将相对路径导入的 `.ts` 或 `.tsx` 扩展名重写为 `.js` 扩展名。这样，在 TypeScript 代码中使用 `.ts` 扩展名导入文件时，最终生成的 JavaScript 代码会使用 `.js` 扩展名，从而确保路径的兼容性。

通过这些配置，开发者可以更方便地在不同包之间进行跳转，提升开发效率。

## 用Turborepo 管理Package Graph 和 Task Graph

在一个大型项目中，或者跨语言项目中，可能会有很多命令。不同的包可能有自己的build命令，dev命令，lint命令，test命令，类型检查命令等等。这些包之间，可能还有依赖关系。一个命令以另一个命令完成为前提，而Turborepo可以很好的完成，这一节我们展示如何用 Turborepo 进行管理。

> **Package Graph（包图）**
>
> Turborepo 自动从你的 Monorepo 结构和各个子包的 package.json 里找出来的依赖关系图。比如你有一个 `apps/web` 应用，它依赖两个库 `packages/ui` 和 `packages/utils`，Turborepo 就会把这些关联“连成线”，构成一个图，形成所有包之间的依赖网络。这个图是 Task Graph 的基础。
>
> **Task Graph（任务图）**
>
> 任务图是 Turborepo 通过你的 turbo.json 配置和上面那个 Package Graph 从你的任务定义里构建出来的一个 有向无环图。节点（node）是任务（比如 build、lint、test），边（edge）表示任务之间的依赖关系——也就是 “这个任务要等另一个任务跑完才能运行”。

如果一个任务（比如 build）在 turbo.json 里写了 dependsOn: ["^build"]，这就表示“在当前包的 build 任务之前，先跑掉所有它依赖的包的 build 任务”。这种依赖关系会被表示成一条从依赖任务指向当前任务的边。

例如,执行`apps/web` 应用的`build`命令之前，会先运行 `packages/ui` 和 `packages/utils`的`build`命令。Turborepo 还有自己的缓存策略，通过指定任务的`inputs`与`outputs`，它可以观察文件是否改动，如果没有改动，就可以直接跳过这个步骤。同时，这两个任务还可以最大程度地并行化执行，提升构建效率。

此外，任务还有分类，如持续任务，可以将任务声明为`"persistent": true`。一些持续任务可能还需要另一个任务始终同时运行，如后端服务器，亦或者是路由库的`router-cli`，通过`with`字段可以设置自动启动。一些任务即使非TS语言仓库，也支持加入到Turborepo的任务流中。

Turborepo还支持使用`tui`在一个终端内同时查看所有日志并与任务进行交互。

![](https://h-r2.kairi.cc/turborepo-tui.webp)

Turborepo 能够提高构建与任务运行的效率，通过并行执行、缓存命中等优化手段加速你的 Monorepo 工作流。更多相关内容，请参考[Crafting your repository - Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)。

## Catalog 目录协议

在 Monorepo 中，使用相同的依赖项版本非常常见。通过 `pnpm-workspace.yaml` 中的 Catalog 协议，我们可以减少依赖的重复并保持一致性：

- 维护唯一版本 - 我们通常希望在工作空间中共同的依赖项版本一致。 Catalog 让工作区内共同依赖项的版本更容易维护。 重复的依赖关系可能会在运行时冲突并导致错误。 当使用打包器时，不同版本的重复依赖项也会增大项目体积。
- 易于更新 — 升级或者更新依赖项版本时，只需编辑 `pnpm-workspace.yaml` 中的目录，而不需要更改所有用到该依赖项的 package.json 文件。
- 减少合并冲突 — 由于在升级依赖项时不需要编辑 `package.json` 文件，所以这些依赖项版本更新时就不会发生 git 冲突。

如果你使用的pnpm，可以参考这个[文档](https://pnpm.io/zh/catalogs),如果是bun，则可以参考这个[文档](https://bun.com/blog/bun-v1.3#catalogs-synchronize-dependency-versions)。

以 pnpm 管理的 workspace 为例，它是这么使用的：

在 `pnpm-workspace.yaml` 中定义:

```yaml
packages:
  - packages/*

# 定义目录和依赖版本号
catalog:
  react: ^18.3.1
  redux: ^5.0.1
```

```json
{
  "name": "@example/app",
  "dependencies": {
    "react": "catalog:",
    "redux": "catalog:"
  }
}
```

## Enginue 和包管理器配置

在 Monorepo 中使用合适的包管理器配置是至关重要的。尤其是在使用 pnpm 时，可以指定运行的 Node 版本以及 pnpm 的版本，确保包管理器和 Node.js 的版本一致，避免版本不兼容的问题。

```json
{
  "engines": {
    "node": ">=10",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.3.0"
}
```

在本地开发时， 如果其版本与 `engines` 字段中指定的版本不匹配，`pnpm` 将始终失败并报错。

与之相对应的，还有一个`pnpm-workspace.yaml`的配置字段`nodeVersion`，当同时设置了 `engine-strict=true` 时，npm 会在安装包时检查你的 Node.js 版本是否大于或等于设置的版本范围（应当填精确的语义化版本号），如果不符合，安装会被拒绝。例如，当开发公共包时，设置这个选项可以保证不安装不支持特定node版本的依赖。参见[链接](https://pnpm.io/settings#nodeversion)

```yaml
nodeVersion: 22.22.0
engineStrict: true
```

还有一个就是如果你使用了nvm配置，有时候项目根部会有一个`.nvmrc`文件来指定版本，这样在该目录下唤起Node时，会自动启动相应版本的Node。
例如可以设置`useNodeVersion: 16.16.0`。pnpm 将自动安装指定的 Node.js 版本，并使用它来运行pnpm run命令pnpm node。参见[链接](https://pnpm.io/settings#usenodeversion)

## Monorepo 的 hoist

Hoisting（提升）是指在安装依赖时，某些依赖会被提升到 `node_modules` 的顶层（根目录）。这种行为确保了在整个项目中可以共享某些常用的依赖包，而不是每个子包都单独安装一份。这有助于避免重复安装相同版本的依赖，减少磁盘空间的占用。

在 npm 和 yarn 中，依赖项的 hoisting 行为通常是自动的。当你安装依赖时，它们会根据包的依赖关系被扁平化，并被提升到 `node_modules` 根目录中。在 pnpm 中，依赖不会像在 npm 或 yarn 中那样自动扁平化,而是根据每个包的依赖结构创建嵌套的 `node_modules` 目录。

![](https://h-r2.kairi.cc/pnpm-overflow.webp)

默认情况下，pnpm 创建一个半严格的 node_modules，所有依赖项都会被提升到 `node_modules/.pnpm/node_modules`。这使得 `node_modules` 中的所有包都可以访问未列出的依赖项，而 `node_modules` 之外的模块不行。通过这种布局，大多数的包都可以正常工作。

但是也会有一些不能正常工作例外，但你可以通过配置来控制。这种情况下，可能需要设置[publicHoistPattern](https://pnpm.io/zh/settings#publichoistpattern)属性。命中的模块，会安装到根模块目录`node_modules`中。例如，之前版本的pnpm的默认配置`['types', 'eslint', '@prettier/plugin-*', 'prettier-plugin-']`，项目如果依赖了 `eslint` 或 `babel`，可以看到根模块目录中如下所示。一般来说，我们不需要关心这个，如果需要配置，依赖的文档会讲这些。

```
> tree node_modules -L 1
node_modules
  ├── @babel
  ├── @eslint
  ├── @types
  ├── @typescript-eslint
  ├── eslint
  ├── eslint-config-ali
  ├── eslint-import-resolver-node
  ├── eslint-module-utils
  ├── eslint-plugin-import
  ├── eslint-plugin-jsx-plus
```

关于 hoist 的更多知识，可以参考这个文章：[A diagram to show how pnpm works](https://www.nazha.co/posts/what-pnpm-reslove)

## 一些值得设置的 npmrc 配置或者 pnpm-workspace 设置

在 `npmrc` 和 `pnpm-workspace` 中设置适当的配置项，能有效提高项目管理效率。

### npmrc

- `registry`：指定 npm 使用的默认注册表 URL。

- `save-exact`：确保依赖项以精确版本安装，而不是使用版本范围，例如^1.2.3。

### pnpm

- `prefer-frozen-lockfile`：强制使用锁定文件中的依赖版本。如果设置为 `true`，即使 `package.json` 中的依赖有更新，也会优先使用锁定文件（pnpm-lock.yaml）中的版本，避免自动升级。

- `overrides`：强制指定某些依赖包的版本，无论这些包在其他依赖包中是否有版本冲突。例如，假设你有两个依赖包 `A` 和 `B`，它们依赖于同一个包 `C`，但它们的版本不同。通过 overrides，你可以强制这两个包都使用 C 的同一版本。

---

参考资料

1. [TypeScript 5.4: Auto-import support for subpath imports](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/#auto-import-support-for-subpath-imports)
2. [Turborepo TypeScript 指南](https://turborepo.dev/en/docs/guides/tools/typescript#use-nodejs-subpath-imports-instead-of-typescript-compiler-paths)
3. [设置（pnpm-workspace.yaml）](https://pnpm.io/zh/settings)
4. [A diagram to show how pnpm works](https://www.nazha.co/posts/what-pnpm-reslove) 5.[Crafting your repository - Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)
