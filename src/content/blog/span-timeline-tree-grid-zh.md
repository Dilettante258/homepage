---
title: Span 时间线树表格实现复盘：关键卡点与设计要点
description: 梳理 Span 时间线树表格在数据建模、树渲染、布局、高亮导航、样式优先级与复用抽象上的关键卡点与落地方案。
date: 2026-02-23
locale: zh
tags: [组件设计, CSS, 工程实践]
---

本文记录 `Span Timeline Table` 的实现方案与关键取舍。

在线演示页面：<https://kairi.cc/zh/gallery/span-timeline-display>
说明：本文偏实现细节复盘；如果想先看交互效果（时间线、连线、高亮导航、锁列），建议先打开 Demo 页面再对照本文阅读。

目标能力：

- 左侧可折叠调用树
- 右侧时间线与元数据列
- 标签/关键词/异常联合高亮
- 命中项导航定位
- 组件级复用（同一基础组件支撑多个场景）

线上产品相关说明可参考：<https://www.volcengine.com/docs/6431/81116?lang=zh>

## 组件边界与约束

与传统普通表格相比，该组件需要这几个能力：

1. 树结构（展开/折叠、层级连线）
2. 表格布局（多列、滚动、锁定列）
3. 时序表达（耗时条、起止对齐、异常态）

工程上最容易失控的地方：

- 筛选/展开/导航状态互相干扰
- 为视觉效果引入过多无效 DOM

## 为什么不直接用成熟组件

这里以 Arco Design 为例做对比。它本身能力很完整：

- `Table` 支持树形数据（`data.children`）
- `Tree` 支持连接线（`showLine`）

但在“树 + 时间线 + 多列元数据 + 高亮导航”这个组合场景里，仍存在能力拼接成本。

| 维度 | Arco Table（树形数据） | Arco Tree（showLine） | 本文方案（TreeGridBase） |
| --- | --- | --- | --- |
| 树形展开 | 支持 | 支持 | 支持 |
| 连接线 | 不支持 | 支持 | 支持（可定制样式） |
| 多列表格布局 | 强 | 弱 | 强 |
| 表格样式体系（表头/行/单元格） | 支持 | 不支持（需手动拼） | 统一样式协议 |
| 列对齐控制（按列 left/center/right） | 支持 | 不支持（需手动实现） | 列模型内置对齐配置 |
| 时间线列（比例定位） | 需自定义 render | 可做但实现麻烦（需额外拼接列布局与比例定位） | 原生设计目标之一 |
| 锁列 + 横向滚动 | 支持，但与树/时间线组合时定制成本高 | 不适用 | 按场景统一实现 |
| 点击状态（当前项/最后点击项） | 无统一内建语义（需业务层维护） | 无统一内建语义（需业务层维护） | 统一状态协议（如 `data-watching` / `data-last-clicked`） |
| 点击回调与联动 | 支持行事件，但树-时间线联动需额外封装 | 支持节点事件，但表格联动需额外封装 | 基座统一回调入口，跨列联动一致 |
| 高亮并集（标签/关键词/异常） | 需业务层二次实现 | 需业务层二次实现 | 内建在同一渲染语义中 |
| 命中导航（仅可见项） | 需额外 DOM 协议 | 需额外 DOM 协议 | 与树状态统一处理 |
| 类型复用（泛型 + `idField`） | 可做，但通常按页面分散实现 | 可做，但偏节点层 | 作为基座能力统一沉淀 |

Arco 的示例能力可以概括为：

```tsx
// Table: 树形数据
<Table columns={columns} data={data} />

// Tree: 连接线
<Tree treeData={treeData} showLine />
```

结论是：在这个场景下，成熟组件暴露的 API 粒度不够，且样式体系与目标 UI 差异较大。  
如果继续在现成组件上打补丁，维护成本会持续上升，不如独立实现一套可复用基座。  
因此选择沉淀 `TreeGridBase<T>`：业务层只做列定义和数据映射，复杂交互在基座内统一处理。

这套能力也对应了线上产品中的实际使用场景，可参考火山引擎文档说明：<https://www.volcengine.com/docs/6431/81116?lang=zh>。

## 数据建模：利用范型约束保障可复用性与开发效率

实现里不再假设固定 `id` 字段，而是把树节点抽象成范型：

```ts
type BaseTree<T> = T & {
  children: BaseTree<T>[];
};
```

组件侧通过范型约束接收节点，并额外提供 `idField: keyof T`，用于声明“当前数据源哪一个字段是唯一标识”。

例如不同数据源可分别传入：

- `idField = "span_id"`
- `idField = "trace_id"`
- `idField = "id"`

这样做的重点不只是“字段可配置”，而是通过范型约束把组件能力稳定下来：

1. 通过范型约束统一树结构边界（必须有 `children`），保证核心渲染逻辑可用。
2. 通过 `idField: keyof T` 适配不同主键字段，避免组件绑定单一后端字段名。
3. 依赖 TypeScript 的范型推导，让列定义、节点字段访问和类型检查自动联动，减少重复声明和手动对齐成本。
4. 同一套树表格逻辑可以稳定复用到不同业务模型，迭代时改动面更小。

## 树渲染：采用 `details/summary` 作为展开基座

展开行为不使用自定义 `expandedMap`，而是直接采用原生 `details/summary`。

原因：

- 语义结构天然成立
- 键盘可达与交互行为一致性更好
- 可直接衔接 `::details-content` 动画方案

结果：展开系统复杂度下降，状态管理聚焦业务侧。

## 布局策略：避免“树一加列就挤压错位”

树表格布局固定为三条规则：

1. 树列 `flex: 1` 吃剩余空间。
2. 其他列固定宽度。
3. 内层总宽 `innerWidth` 可配置，超出后横向滚动。

结果：新增字段只影响滚动范围，不再引起右侧列消失或错位。

## 时间线单元：抽离为独立组件

将时间条逻辑从列模板中抽离为 `DurationBarCell`，只暴露最小参数：

- `startUs`
- `durationUs`
- `totalUs`
- `label`

定位用 CSS 变量完成：

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

附加策略：当起点超过总宽 80% 时，标签改右对齐，避免尾部文本重叠。

## 层级连线：优先伪元素，降低 DOM 体积

连线与状态点不新增结构节点，统一由样式层绘制：

- 层级竖线：`.node` 背景渐变
- 横向虚线：`rowConnector::after`
- 成功/失败点：`rowConnector::before` + `data-error`

示例：

```css
.node {
  background: linear-gradient(var(--border-color), var(--border-color))
    12px 0 / 1px 100% no-repeat;
  padding-left: 24px;
}
```

结果：DOM 结构保持业务导向，后续样式迭代成本更低。

虚线/实线示例效果：

<div style="font-size: 12px; color: #64748b; margin-top: 8px;">实线（solid）</div>
<div style="width: 240px; height: 0; border-top: 1px solid #94a3b8; margin: 6px 0 10px;"></div>

<div style="font-size: 12px; color: #64748b;">虚线（dashed）</div>
<div style="width: 240px; height: 0; border-top: 1px dashed #94a3b8; margin: 6px 0 10px;"></div>

<div style="font-size: 12px; color: #64748b;">虚线（repeating-linear-gradient，可控段长/间隔）</div>
<div style="width: 240px; height: 1px; background: repeating-linear-gradient(to right, #94a3b8 0 6px, transparent 6px 10px); margin: 6px 0 12px;"></div>

在树表格里，横向连接线本质就是这个思路，只是挂在 `::after` 上并结合定位变量做对齐。

## 高亮与导航：统一“可见命中”口径

匹配规则为并集：

```ts
match = tagMatch || keywordMatch || errorMatch;
```

导航规则统一为：

1. 只统计当前可见命中（受折叠影响）。
2. 不因筛选自动展开树。
3. 按 DOM 顺序循环跳转。

实现上，每行写入：

- `data-row-id`
- `data-match`

查询时过滤不可见项：

```ts
querySelectorAll("[data-row-id][data-match='true']")
  .filter((el) => el.getClientRects().length > 0);
```

定位采用 `scrollIntoView({ behavior: "smooth" })`。

## 样式优先级：从 class 组合转为 dataset 协议

状态写回 DOM 属性，而不是叠加多层 class：

- `data-mark`：命中态
- `data-watching`：当前导航项
- `data-last-clicked`：最后点击项

配合属性选择器管理优先级：

```css
.nameText[data-mark="true"] { --bgC: #fbdda7; }
summary[data-error="true"] .nameText[data-mark="true"] { --bgC: #ffa9a7; }
.nameText[data-watching="true"] { border-color: var(--bdC); }
```

结果：高亮、异常、当前项三类状态可组合且可预测。

## 动画策略：全局复用 `::details-content`

折叠动画采用 `::details-content`，并使用 `interpolate-size` 做高度过渡：

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

该方案放入全局布局层，可复用于站内所有 `details` 场景。

## 抽象方式：先稳定能力，再沉淀基座

在功能稳定后，统一抽象为 `TreeGridBase<T>`，承接：

- 列模型
- 滚动容器
- sticky 头/列
- 高亮控制器
- 命中导航

业务组件（如 `SpanTimeline`、`TreeGridChainDemo`）仅保留：

- 列定义
- 数据映射


## 本次实现的可复用结论

1. 树 + 表格 + 时间线的组合组件，优先先收敛数据输入层。
2. 展开行为优先原生语义，减少状态机复杂度。
3. 命中导航口径应与用户可见范围一致。
4. 状态表达使用 dataset，更适合复杂样式优先级场景。
5. 抽象放在验证之后，稳定性与复用性更高。

## 参考资料

1. 掘金（文章节奏参考）  
   <https://juejin.cn/post/7251501860321411130>
2. Chrome Developers（`details` 动画方案）  
   <https://developer.chrome.com/blog/styling-details?hl=zh-cn#animating_the_details-content_pseudo>
3. 火山引擎文档（线上产品相关说明）  
   <https://www.volcengine.com/docs/6431/81116?lang=zh>
