---
title: 从零写一个 Span 时间线树表格（Solid + Astro）
description: 按真实开发顺序记录：先搭树，再补列，再做耗时条、高亮导航和 details 动画，最后抽出可复用的 TreeGridBase。
date: 2026-02-23
locale: zh
tags: [SolidJS, Astro, 组件设计, CSS]
---

这篇不是“重构总结”，是我从零把组件搭起来的过程记录。

最开始我手里只有一张目标图：左边是可折叠链路树，右边是耗时与元数据列，还要能高亮和定位命中项。  
当时并没有 TreeGridBase，也没有现成可复用的壳子，都是先跑起来再慢慢收敛。

---

## 第一步：先把数据形状定死

我先做的不是 UI，而是把渲染最小字段固定下来。  
因为后面无论怎么改样式、改交互，数据入口稳定了，组件就不会一直返工。

我最后定下来的节点结构是：

- `id`：稳定主键（优先后端 `span_id`）
- `name`
- `start` / `duration`
- `error`
- `componentTag`
- `serviceName` / `hostname`
- `children`

`sample-trace.ts` 里还做了两个实用处理：

1. 没 `span_id` 时，用路径兜底生成 id。
2. `componentTag` 优先用 `call_service_type`，没有就从 `operation_name` 推断（如 `http_call -> http`，`mysql.query -> mysql`）。

这一步完成后，我就不再让组件直接消费原始后端字段了。

---

## 第二步：只做“树能展开”这一件事

我先做了一个最朴素版本：

- 每个节点一个 `details`
- 行内容放在 `summary`
- 子节点递归渲染

这里我没有自己维护 `expandedMap`，直接用原生 `details/summary`，原因很简单：

- 语义和交互天然有了
- 键盘可达性天然有了
- 后面可以直接接 `::details-content` 动画

第一版只看两件事：

1. 树层级是不是对的
2. 折叠/展开有没有明显卡顿

能过这两点，我才开始加列。

---

## 第三步：把“树”扩成“树表格”

这个阶段我踩了一个很典型的坑：右侧列会被挤没。

后来我把布局策略固定成三条：

1. 最左树列 `flex: 1`，吃剩余空间。
2. 其他列固定宽度。
3. 内层表格总宽可配置（`innerWidth`），超过容器就横向滚动，不再挤压。

这套策略稳定之后，字段多少都只是“滚不滚”的问题，不会再出现“列消失”。

---

## 第四步：耗时条单独抽出来

一开始耗时条直接写在列 render 里，后来链路树 demo 也要复用，很快就发现复制粘贴不划算。

所以我做了 `DurationBarCell`，把时间条变成纯参数组件：

- `startUs`
- `durationUs`
- `totalUs`
- `label`

定位全部交给 CSS 变量：

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

后面我又补了一个细节：当起点超过总时长 80% 时，文字改成右对齐，避免末尾溢出。

---

## 第五步：把连线、徽标都收敛到伪元素

我目标是“少加节点，多用 CSS 结构化实现”。

### 层级竖线

用 `.node` 背景线，不额外插 DOM：

```css
.node {
  background: linear-gradient(var(--border-color), var(--border-color))
    12px 0 / 1px 100% no-repeat;
  padding-left: 24px;
}
```

### 横向虚线

用 `rowConnector::after`：

```css
.rowConnector::after {
  background: 50% / auto 0.8px repeat-x
    repeating-linear-gradient(...);
}
```

### 成功/失败点

用 `rowConnector::before`，再通过 `data-error` 改色。

这样做完以后，结构节点基本就只剩业务必要节点，不会出现“为了画线塞一堆空 div”。

---

## 第六步：高亮控制器（这块是最容易乱的）

需求是三个条件并集：

- 组件标签（多选）
- 关键词（只匹配 span 名）
- 是否异常

匹配规则是：

```ts
match = tagMatch || keywordMatch || errorMatch
```

真正容易写错的是“命中计数和导航口径”。我最后定的是：

- 只统计当前可见命中（受折叠影响）
- 不自动展开树
- DOM 顺序上下循环跳转

所以每行都挂上：

- `data-row-id`
- `data-match`

然后直接查 DOM 再过滤可见项：

```ts
querySelectorAll("[data-row-id][data-match='true']")
  .filter((el) => el.getClientRects().length > 0)
```

导航就 `scrollIntoView({ behavior: "smooth" })`。

---

## 第七步：把状态写到 dataset，减少样式打架

我不想在 JS 里堆复杂 class 组合，最后改成 dataset 驱动：

- `data-mark`：是否命中
- `data-watching`：是否当前导航项
- `data-last-clicked`：是否用户最后点选项

然后用属性选择器处理样式优先级：

```css
.nameText[data-mark="true"] { --bgC: #fbdda7; }
summary[data-error="true"] .nameText[data-mark="true"] { --bgC: #ffa9a7; }
.nameText[data-watching="true"] { border-color: var(--bdC); }
```

这一步做完后，样式问题明显变少，调试也更直观。

---

## 第八步：加 details 动画（全局化）

这块我参考了 Chrome 官方关于 `::details-content` 的文章：  
<https://developer.chrome.com/blog/styling-details?hl=zh-cn#animating_the_details-content_pseudo>

我把动画放在全局 `BaseLayout`，这样整个站点的 details 都受益：

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

不支持 `interpolate-size` 时再走回退方案。

---

## 最后才做的事情：抽成可复用基座

等上面功能都稳定后，我才把公共逻辑收进 `TreeGridBase<T>`：

- 列模型
- 滚动容器
- sticky 头/列
- 高亮控制器
- 命中导航

然后 `SpanTimeline`、`TreeGridChainDemo` 只做“列定义 + 数据映射”。

所以严格说，这不是先设计一个完美架构再填代码，而是：

1. 先从零跑通一版
2. 把稳定能力抽出来
3. 让第二个场景验证抽象是不是靠谱

---

## 现在回看，最值的是这三点

1. 先定数据最小模型，再做 UI。
2. 状态尽量落 dataset，让 CSS 表达优先级。
3. 别太早抽象，先跑通再抽，抽象更稳。

---

## 参考

- 掘金（文章节奏参考）：<https://juejin.cn/post/7251501860321411130>
- Chrome Developers（details 动画方案）：<https://developer.chrome.com/blog/styling-details?hl=zh-cn#animating_the_details-content_pseudo>
