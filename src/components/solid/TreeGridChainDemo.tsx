/** @jsxImportSource solid-js */
import type { Locale } from "../../i18n/strings";
import TreeGridBase, {
  type TreeGridColumn,
  type TreeGridNodeBase,
} from "./TreeGridBase";
import DurationBarCell from "./DurationBarCell";
import {
  chainMetricDemoData,
  type ChainMetricRawNode,
} from "./chain-tree-demo-data";
import styles from "./TreeGridChainDemo.module.css";

type ChainNode = TreeGridNodeBase<ChainNode> & {
  spanCount: number;
  spanCountPercentage: number;
  traceCount: number;
  traceCountPercentage: number;
  errorTraceCount: number;
  errorTraceCountPercentage: number;
  costUs: number;
  maxChildrenCount: number;
  networkCostUs: number;
  localPureCostUs: number;
  actionText: string;
};

const getTag = (apiName: string): string => {
  if (apiName.includes(".")) {
    const [prefix] = apiName.split(".");
    return prefix || "unknown";
  }
  if (apiName.includes("_")) {
    const [prefix] = apiName.split("_");
    return prefix || "unknown";
  }
  return apiName || "unknown";
};

type TreeGridChainDemoProps = {
  locale: Locale;
  innerWidth?: number | string;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;

const formatDurationUs = (microseconds: number): string => {
  if (!microseconds) return "0us";
  if (microseconds >= 1_000_000) return `${(microseconds / 1_000_000).toFixed(2)}s`;
  if (microseconds >= 1_000) return `${(microseconds / 1_000).toFixed(2)}ms`;
  return `${microseconds.toFixed(2)}us`;
};

const toChainNode = (
  raw: ChainMetricRawNode,
  viewText: string,
  path: number[],
): ChainNode => ({
  id: `${raw.node_id}#${path.join("-")}`,
  name: raw.display_name,
  error: raw.error_trace_count > 0,
  componentTag: getTag(raw.api_name),
  open: true,
  spanCount: raw.span_count,
  spanCountPercentage: raw.span_count_percentage,
  traceCount: raw.trace_count,
  traceCountPercentage: raw.trace_count_percentage,
  errorTraceCount: raw.error_trace_count,
  errorTraceCountPercentage: raw.error_trace_count_percentage,
  costUs: raw.cost_in_us,
  maxChildrenCount: Number(raw.max_children_count) || 0,
  networkCostUs: raw.network_cost_in_us,
  localPureCostUs: raw.local_pure_cost_in_us,
  actionText: viewText,
  children: raw.children.map((child, index) =>
    toChainNode(child, viewText, [...path, index])),
});

const collectMaxCost = (nodes: ChainNode[]): number => {
  let max = 0;
  const walk = (list: ChainNode[]) => {
    for (const node of list) {
      if (node.costUs > max) max = node.costUs;
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return max;
};

const TreeGridChainDemo = (props: TreeGridChainDemoProps) => {
  const locale = props.locale;
  const viewText = locale === "zh" ? "查看Span" : "View Span";
  const nodes = [toChainNode(chainMetricDemoData, viewText, [0])];
  const maxCostUs = collectMaxCost(nodes);
  const headerWithHint = (label: string) => (
    <span class={styles.headWithHint}>
      <span>{label}</span>
      <span class={styles.hintIcon}>?</span>
    </span>
  );

  const columns: TreeGridColumn<ChainNode>[] = [
    {
      key: "chain",
      title: locale === "zh" ? "链路" : "Chain",
      isTree: true,
    },
    {
      key: "span-per-request",
      title:
        locale === "zh" ? headerWithHint("Span数/请求倍数") : headerWithHint("Span / Request"),
      width: 220,
      className: styles.metricCol,
      render: ({ node }) =>
        `${node.spanCount} / ${formatPercent(node.spanCountPercentage)}`,
    },
    {
      key: "request-ratio",
      title:
        locale === "zh"
          ? headerWithHint("请求数/请求比例")
          : headerWithHint("Request Count / Ratio"),
      width: 220,
      className: styles.metricCol,
      render: ({ node }) =>
        `${node.traceCount} / ${formatPercent(node.traceCountPercentage)}`,
    },
    {
      key: "error-ratio",
      title:
        locale === "zh"
          ? headerWithHint("错误请求数/错误请求比例")
          : headerWithHint("Error Count / Error Ratio"),
      width: 220,
      className: styles.metricCol,
      render: ({ node }) =>
        `${node.errorTraceCount} / ${formatPercent(node.errorTraceCountPercentage)}`,
    },
    {
      key: "cost",
      title: locale === "zh" ? headerWithHint("耗时") : headerWithHint("Cost"),
      width: 340,
      className: styles.costCol,
      render: ({ node }) => (
        <DurationBarCell
          startUs={0}
          durationUs={node.costUs}
          totalUs={maxCostUs}
          label={formatDurationUs(node.costUs)}
          error={node.error}
          className={styles.costCell}
        />
      ),
    },
    {
      key: "max-children",
      title:
        locale === "zh"
          ? headerWithHint("最大子树节点数")
          : headerWithHint("Max Subtree Nodes"),
      width: 170,
      className: styles.metricCol,
      render: ({ node }) => `${node.maxChildrenCount}`,
    },
    {
      key: "avg-network",
      title:
        locale === "zh"
          ? headerWithHint("平均网络调用耗时")
          : headerWithHint("Avg Network Cost"),
      width: 180,
      className: styles.metricCol,
      render: ({ node }) => formatDurationUs(node.networkCostUs),
    },
    {
      key: "avg-local-pure",
      title:
        locale === "zh"
          ? headerWithHint("平均本地净耗时")
          : headerWithHint("Avg Local Pure Cost"),
      width: 180,
      className: styles.metricCol,
      render: ({ node }) => formatDurationUs(node.localPureCostUs),
    },
    {
      key: "mark",
      title: locale === "zh" ? "标记" : "Mark",
      width: 96,
      className: styles.markCol,
      render: () => "",
    },
    {
      key: "action",
      title: locale === "zh" ? "操作" : "Action",
      width: 140,
      className: styles.actionCol,
      render: ({ node }) => (
        <button type="button" class={styles.actionBtn}>
          {node.actionText}
        </button>
      ),
    },
  ];

  return (
    <TreeGridBase
      locale={locale}
      nodes={nodes}
      columns={columns}
      innerWidth={props.innerWidth ?? 2460}
      stickyCols={["action"]}
      showHighlighter={false}
      maxHeight={620}
    />
  );
};

export default TreeGridChainDemo;
