/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import type { Locale } from "../../i18n/strings";
import {
  normalizeSampleTrace,
  type TimelineSpanNode,
} from "../span-timeline/sample-trace";
import TreeGridBase, {
  type TreeGridColumn,
} from "./TreeGridBase";
import baseStyles from "./TreeGridBase.module.css";
import DurationBarCell from "./DurationBarCell";
import styles from "./SpanTimeline.module.css";

type GlobalVar = Record<string, unknown>;

type SpanTimelineProps = {
  locale: Locale;
  globalVar?: GlobalVar;
  innerWidth?: number | string;
  stickyCols?: string[];
  showHighlighter?: boolean;
  serviceColWidth?: number;
  hostColWidth?: number;
  startColWidth?: number;
  maxHeight?: number;
  styleVars?: JSX.CSSProperties;
};

const formatDuration = (microseconds: number): string => {
  if (microseconds >= 1_000_000) {
    return `${(microseconds / 1_000_000).toFixed(2)}s`;
  }
  return `${(microseconds / 1_000).toFixed(2)}ms`;
};

const SpanTimeline = (props: SpanTimelineProps) => {
  const { nodes, startUs, totalUs } = normalizeSampleTrace();
  const locale = props.locale;
  const globalVar = props.globalVar ?? {};
  const serviceColWidth = props.serviceColWidth ?? 180;
  const hostColWidth = props.hostColWidth ?? 220;
  const startColWidth = props.startColWidth ?? 280;
  const maxHeight = props.maxHeight ?? 620;
  const stickyCols = props.stickyCols ?? [];

  const spanTitle =
    typeof globalVar.spanTitle === "string" ? globalVar.spanTitle : "Span";
  const startTitle =
    typeof globalVar.startTitle === "string"
      ? globalVar.startTitle
      : locale === "zh"
        ? "起始时间"
        : "Start Time";
  const serviceTitle = locale === "zh" ? "服务名" : "Service";
  const hostTitle = locale === "zh" ? "主机" : "Host";

  const startTimeFormatter = new Intl.DateTimeFormat(
    locale === "zh" ? "zh-CN" : "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  );

  const formatStartTime = (microseconds: number): string => {
    const parts = startTimeFormatter.formatToParts(
      new Date(Math.floor(microseconds / 1_000)),
    );
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
  };

  const columns: TreeGridColumn<TimelineSpanNode>[] = [
    {
      key: "span",
      title: spanTitle,
      isTree: true,
      className: styles.spanCol,
      render: ({ node, isMatch, isActiveMatch, isLastClicked }) => (
        <div class={styles.treeInner}>
          <span class={baseStyles.rowConnector}>
            <span
              class={`${baseStyles.nameText} ${styles.nameText}`}
              data-mark={isMatch ? "true" : "false"}
              data-watching={isActiveMatch ? "true" : "false"}
              data-last-clicked={isLastClicked ? "true" : "false"}
            >
              {node.name}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "timeline",
      title: (
        <>
          <span>0</span>
          <span>{formatDuration(totalUs)}</span>
        </>
      ),
      width: 290,
      className: styles.timeCol,
      headerClassName: styles.timeHead,
      render: ({ node }) => {
        return (
          <DurationBarCell
            startUs={node.start - startUs}
            durationUs={node.duration}
            totalUs={totalUs}
            label={formatDuration(node.duration)}
            error={node.error}
          />
        );
      },
    },
    {
      key: "service",
      title: serviceTitle,
      width: serviceColWidth,
      className: styles.metaCol,
      render: ({ node }) => (
        <span title={node.serviceName}>{node.serviceName}</span>
      ),
    },
    {
      key: "host",
      title: hostTitle,
      width: hostColWidth,
      className: styles.metaCol,
      render: ({ node }) => <span title={node.hostname}>{node.hostname}</span>,
    },
    {
      key: "start",
      title: startTitle,
      width: startColWidth,
      className: styles.metaCol,
      render: ({ node }) => <time>{formatStartTime(node.start)}</time>,
    },
  ];

  return (
    <TreeGridBase
      locale={locale}
      nodes={nodes}
      columns={columns}
      innerWidth={props.innerWidth}
      stickyCols={stickyCols}
      showHighlighter={props.showHighlighter}
      maxHeight={maxHeight}
      styleVars={props.styleVars}
    />
  );
};

export default SpanTimeline;
