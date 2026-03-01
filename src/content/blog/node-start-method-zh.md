---
title: 这一招让 Node 后端服务启动速度提升 75%！三种 ts 启动方式对比
description: 在这篇文章中，我们深入探讨了三种常见的 Node 后端服务启动方式：tsx、tsc 和 esbuild，并通过实际测试展示了它们在冷启动时间、吞吐量和资源占用方面的差异。特别是在冷启动场景下，esbuild 通过提前打包大大提升了启动速度，最高可提高 75%。无论你是开发人员还是系统架构师，本文将帮助你选择最适合自己项目的启动方式，从而在优化开发体验和生产环境性能之间找到最佳平衡。
date: 2026-02-28
locale: zh
tags: [Node.js, 前端工程]
---

一个Node 后端项目的启动方式可以分类为三种：

1.  由源代码直接启动，如`tsx src/server.ts`
2.  由tsc简单转译，如`tsc` 编译后 `node dist/server.js`
3.  使用一些bundler进行打包，将其打包为单个文件，如`esbuild --bundle` 后 `node bundle.mjs`

很多人其实并不知道这几种方法之间的区别，今天我想通过具体的测试来区分每种方法的不同。

测试目的

把测试拆成两个维度：

- **启动阶段性能**
- **服务运行阶段性能**

因为，我们可以测试三类数据：

1.  冷启动会差多少？
2.  稳态吞吐/延迟会差多少？
3.  资源占用是否存在显著差异？

## 测试方法

### 环境

- macOS arm64
- Apple M5 / 10 cores
- 24GB RAM
- Node v22.22.0
- Express 5.1（TypeScript）

三种模式使用同一份 `src/server.ts`，业务逻辑完全一致，包含基础路由和“mock业务形态”路由：

- 基础路由（baseline）（参考了一个比较Express4/5版本速度差异的测试方法）
  - GET /ping：返回 "pong"，用于测最小路径开销
  - GET /middlewares：挂 50 层 no-op middleware 后返回 { ok: true }
  - GET /json：返回预生成的约 50KB JSON（固定内容，避免每次动态生成噪声）
  - GET /payload：返回预生成的 100KB 文本

- 业务形态路由（realistic）
  - GET /route1/info
  - GET /route2/stats
  - GET /route3/catalog
  - GET /route4/summary（聚合 route1\~3 的服务输出）
  - GET /orm/users（走 Drizzle ORM 查询路径）

ORM 使用 `drizzle-orm/sqlite-proxy` + 内存数据模拟，不依赖外部数据库，尽量隔离网络与 DB 抖动对对比的干扰。

### 压测与采样口径

- 压测命令：`ab -k -n 200000 -c 100`
- 每个场景重复 5 次，取均值
- 冷启动定义：从进程 `spawn` 到 `/ping` 首个 `200`
- 资源采样：压测期间每秒采样 `RSS` 和 `CPU%`

## 总体结果

### 1）冷启动

| mode    | cold(ms) |
| ------- | -------- |
| esbuild | 104      |
| tsc     | 308      |
| tsx     | 399      |

![](https://h-r2.kairi.cc/coldStart-chart.webp)

冷启动的差异非常明显，`esbuild` 在冷启动上的表现优于 `tsc` 和 `tsx`，差距达到 75%。

### 2）平均吞吐（9 场景）

| mode    | avg req/s |
| ------- | --------- |
| tsc     | 22114     |
| esbuild | 21959     |
| tsx     | 21928     |

吞吐量差异小于 1%，可见三者在稳态性能上几乎一致。

![](<https://h-r2.kairi.cc/engulfing(bar-chart-pattern).webp>)

### 3）P95 延迟

三种方式的 P95 延迟几乎完全相同，均为 5-6ms。

![](https://h-r2.kairi.cc/scenario-chart.webp)

### 4）RSS 内存

三者的内存使用几乎一致，均约为 62MB。

![](https://h-r2.kairi.cc/cpu+rss-chart.webp)

> 测试数据报告：![链接](https://kairi.cc/node-start-report.md)

---

## 关键问题 1：为什么冷启动差这么多？

冷启动时间的差异可以拆解为以下几个部分：

1.  **模块图加载与文件 IO**

    a. **解析 `import` 图**
    - **静态分析**：Node.js 会分析你的 JavaScript 文件中的 `import` 语句，确定需要加载的模块。这是一个静态分析过程，Node.js 会在执行之前构建模块的依赖关系图（`import` 图）。这有助于了解哪些模块需要加载，并准备好这些模块的依赖。

    b. **读取文件**
    - **加载文件**：当 Node.js 发现一个 `import` 语句，它会根据静态分析结果读取相应的文件内容。如果该模块是一个 JavaScript 文件（`.js` 或 `.mjs`），Node.js 会读取文件的内容并将其解析为 JavaScript 代码。
    - **查找模块**：Node.js 会查找模块文件的位置，如果模块没有缓存，它会从磁盘读取相应文件。

    c. **构建模块缓存**
    - **模块缓存**：Node.js 会缓存已加载的模块，这样在多次加载同一个模块时，Node.js 不需要重新执行该模块的代码。这样可以提高性能，避免重复加载和执行相同的模块。
    - **导出模块**：在加载并执行完模块后，Node.js 会将模块的导出结果（`module.exports` 或 `export`）存入缓存中，以便后续调用。

在不同的启动方式下，加载的模块数量和方式有所不同：

- `tsc`：编译多个 JS 文件。
- `tsx`：编译多个 TS 文件。
- `esbuild`：生成单一的打包文件。

`esbuild` 通过打包将多个模块合并为一个文件，减少了模块解析和文件 I/O 的开销，因此冷启动时间显著较短。

2.  **运行时转译成本（仅适用于 tsx）**

`tsx` 使用 [esbuild](https://esbuild.github.io/) 编译 TypeScript 和 ESM，还会生成 source map 并内联到代码中。每次启动时，`tsx` 需要额外进行源代码映射，导致启动速度较慢。而 `tsc` 编译的是纯 JavaScript，Node.js 不需要做任何 TypeScript 转换，启动速度较快。

### 冷启动的结论

边缘计算、Serverless、短生命周期容器、CLI 工具，这种场景下，冷启动的速度至关重要，那使用esbuild等打包工具提前bundler而带来的冷启动优势是实打实的。

如果是常驻 API 服务，冷启动只发生一次，意义有限。

但是天下毕竟没有免费的午餐。使用第三方bundle工具提前bundle是不是也有一些坏处呢？是的。

第一点，不支持一些 TypeScript 特性。如esbuild不支持保留如`eval()`语法，还有就是不支持[某些`tsconfig.json`属性](https://esbuild.github.io/content-types/#tsconfig-json)，如[`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig#emitDecoratorMetadata)。

第二点，调试难度加大。`esbuild` 生成的代码通常会做大量的代码压缩、优化和打包，这使得调试变得比较困难。因为调试时的代码结构与原始源代码有很大的差异。如线上报错，开发人员可能需要额外的源映射（source maps）和调试工具来简化调试过程。

第三点，就是启动时，会有更大的cpu运行开销，请看下一节。

## 关键问题 2：为什么 CPU 峰值差异大？

CPU 峰值均值：

| mode    | peak CPU% |
| ------- | --------- |
| tsx     | 5.84      |
| tsc     | 9.13      |
| esbuild | 11.89     |

这看起来 esbuild 更“耗 CPU”。但吞吐几乎一样。这说明什么？

一个可能解释是：在使用 `esbuild` 打包后的代码中，代码结构变得更加紧凑，启动时可能会大量导入很多原来零散的js模块等，某些常见的函数或代码路径可能会执行得更加频繁。

由于 JIT 编译机制，V8 可能会更快地识别出这些频繁执行的代码，并对其进行优化。这个优化过程又叫热点编译。

> **V8 JIT（即时编译）**
>
> - **V8** 是 Chrome 和 Node.js 中使用的 JavaScript 引擎，它使用 **JIT（即时编译，Just-In-Time Compilation）** 技术将 JavaScript 代码在运行时编译成机器代码，来提高执行效率。
> - JIT 编译的目的是将频繁执行的代码（即“热点代码”）优化成更高效的机器代码，从而提升性能。
>
> **热点编译（Hotspot Compilation）** ：
>
> - 当你执行一段 JavaScript 代码时，V8 会在开始时使用 **解释执行**（即不进行优化的方式）来快速运行代码。
> - 如果某段代码被执行得非常频繁（即“热点代码”），V8 会将它标记为热点代码，并对其进行优化。
> - 这时，V8 会在后台将热点代码编译为更高效的机器码，称为 **热点编译**。这通常会提高执行速度，但也可能带来一些额外的 CPU 开销。

在 V8 进行热点编译时，它需要使用 CPU 来分析和优化这些热点代码。这通常会导致短时间内 CPU 使用率升高，表现为 CPU 使用率的“抬高”。

另外很重要的一点，可以看到上面的统计图表中，重要的一点是，**吞吐量几乎一致**，这意味着无论是 `tsx`、`tsc` 还是 `esbuild`，在处理请求时的效率差异都很小。如果 `esbuild` 确实比其他模式更高效，它的吞吐量应该显著超过其他模式。然而，实际数据表明，差距微乎其微，这表明 **CPU 峰值差异** 主要来源于 **短期的计算开销**，而非整体的运行效率差异。

最终性能，尤其是吞吐量，在底层上受 **V8 引擎优化和 I/O 处理** 等因素的影响更大，在运行层面上应该受到业务逻辑、IO、JSON 序列化、数据库等因素决定。

## 小结

现在可以回答问题Node 后端服务启动方式的问题了：

在开发环境，生产环境（常驻 API 服务），还是推荐 tsx。性能差别不大，带来了更好的体验。

在如云函数等，冷启动敏感场景，推荐用如 esbuild来提前bundle，本文中的案例，esbuild的冷启动时长比普通tsx快了75%！
