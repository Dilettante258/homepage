/** @jsxImportSource solid-js */
import { For, Show, onMount, type JSX } from "solid-js";
import type { Locale } from "../../i18n/strings";
import {
  normalizeSampleTrace,
  type TimelineSpanNode,
} from "../span-timeline/sample-trace";
import styles from "./SpanTimeline.module.css";

type GlobalVar = Record<string, unknown>;

const classNames = {
  spanRow: styles.spanRow,
  spanCol: styles.spanCol,
  rowConnector: styles.rowConnector,
  nameText: styles.nameText,
  link: styles.link,
  pill: styles.pill,
  timeCol: styles.timeCol,
  timelineSpan: styles.timelineSpan,
  durationText: styles.durationText,
  durationFromRight: styles.fromRight,
  serviceCol: styles.serviceCol,
  hostCol: styles.hostCol,
  startCol: styles.startCol,
} as const;

type SpanTimelineClassNames = typeof classNames;

type HeaderRenderContext = {
  locale: Locale;
  totalUs: number;
  formatDuration: (microseconds: number) => string;
  globalVar: GlobalVar;
  classes: SpanTimelineClassNames;
};

type RowRenderContext = {
  node: TimelineSpanNode;
  locale: Locale;
  rowVars: string;
  isNearEnd: boolean;
  formatDuration: (microseconds: number) => string;
  formatStartTime: (microseconds: number) => string;
  globalVar: GlobalVar;
  classes: SpanTimelineClassNames;
};

type HeaderRender = (context: HeaderRenderContext) => JSX.Element;
type RowRender = (context: RowRenderContext) => JSX.Element;

type SpanTimelineProps = {
  locale: Locale;
  globalVar?: GlobalVar;
  headerRender?: HeaderRender;
  rowRender?: RowRender;
  innerWidth?: number | string;
  spanColMinWidth?: number;
  colW?: number;
  serviceColWidth?: number;
  hostColWidth?: number;
  startColWidth?: number;
  maxHeight?: number;
};

const formatDuration = (microseconds: number): string => {
  if (microseconds >= 1_000_000) {
    return `${(microseconds / 1_000_000).toFixed(2)}s`;
  }
  return `${(microseconds / 1_000).toFixed(2)}ms`;
};

const DefaultHeaderRenderer: HeaderRender = ({
  locale,
  totalUs,
  formatDuration,
  globalVar,
}) => {
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

  return (
    <>
      <div>
        <span>{spanTitle}</span>
      </div>
      <div>
        <span>0</span>
        <span>{formatDuration(totalUs)}</span>
      </div>
      <div>{serviceTitle}</div>
      <div>{hostTitle}</div>
      <div title={startTitle}>{startTitle}</div>
    </>
  );
};

const DefaultRowRenderer: RowRender = ({
  node,
  rowVars,
  isNearEnd,
  formatDuration,
  formatStartTime,
  classes,
}) => {
  return (
    <div class={classes.spanRow}>
      <div class={classes.spanCol}>
        <span class={classes.rowConnector}>
          <span
            classList={{
              [classes.nameText]: true,
              [classes.pill]: node.pill,
              [classes.link]: node.link,
            }}
          >
            {node.name}
          </span>
        </span>
      </div>

      <div class={classes.timeCol} style={rowVars}>
        <span class={classes.timelineSpan}></span>
        <span
          classList={{
            [classes.durationText]: true,
            [classes.durationFromRight]: isNearEnd,
          }}
        >
          {formatDuration(node.duration)}
        </span>
      </div>

      <div class={classes.serviceCol} title={node.serviceName}>
        {node.serviceName}
      </div>
      <div class={classes.hostCol} title={node.hostname}>
        {node.hostname}
      </div>
      <time class={classes.startCol}>{formatStartTime(node.start)}</time>
    </div>
  );
};

type RowProps = {
  node: TimelineSpanNode;
  locale: Locale;
  timelineStartUs: number;
  timelineTotalUs: number;
  formatStartTime: (microseconds: number) => string;
  formatDuration: (microseconds: number) => string;
  globalVar: GlobalVar;
  rowRender: RowRender;
};

const TimelineRow = (props: RowProps) => {
  const hasChildren = props.node.children.length > 0;
  const isOpen = hasChildren ? props.node.open !== false : undefined;
  const isNearEnd =
    props.node.start - props.timelineStartUs > props.timelineTotalUs * 0.8;
  const rowVars = `--rowStart:${props.node.start};--rowTotalTime:${props.node.duration};`;

  return (
    <details
      class={styles.spanNode}
      classList={{ [styles.isLeaf]: !hasChildren }}
      open={isOpen}
    >
      <summary
        class={styles.spanSummary}
        data-error={props.node.error ? "true" : "false"}
      >
        {props.rowRender({
          node: props.node,
          locale: props.locale,
          rowVars,
          isNearEnd,
          formatDuration: props.formatDuration,
          formatStartTime: props.formatStartTime,
          globalVar: props.globalVar,
          classes: classNames,
        })}
      </summary>

      <Show when={hasChildren}>
        <div class={styles.children}>
          <For each={props.node.children}>
            {(child) => (
              <TimelineRow
                node={child}
                locale={props.locale}
                timelineStartUs={props.timelineStartUs}
                timelineTotalUs={props.timelineTotalUs}
                formatStartTime={props.formatStartTime}
                formatDuration={props.formatDuration}
                globalVar={props.globalVar}
                rowRender={props.rowRender}
              />
            )}
          </For>
        </div>
      </Show>
    </details>
  );
};

const SpanTimeline = (props: SpanTimelineProps) => {
  const { nodes, startUs, totalUs } = normalizeSampleTrace();
  const locale = props.locale;
  const globalVar = props.globalVar ?? {};
  const innerWidth = props.innerWidth;
  const spanColMinWidth = props.spanColMinWidth ?? 80;
  const colW = props.colW ?? 360;
  const serviceColWidth = props.serviceColWidth ?? 180;
  const hostColWidth = props.hostColWidth ?? 220;
  const startColWidth = props.startColWidth ?? 280;
  const minInnerWidth =
    spanColMinWidth + colW + serviceColWidth + hostColWidth + startColWidth;
  const resolvedInnerWidth =
    innerWidth === undefined
      ? `${minInnerWidth}px`
      : typeof innerWidth === "number"
        ? `${innerWidth}px`
        : innerWidth;
  const maxHeight = props.maxHeight ?? 620;
  const HeaderRenderer = props.headerRender ?? DefaultHeaderRenderer;
  const RowRenderer = props.rowRender ?? DefaultRowRenderer;
  let viewportRef: HTMLDivElement | undefined;

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

  const timelineStyle: JSX.CSSProperties = {
    "--span-col-min-width": `${spanColMinWidth}px`,
    "--start-col-width": `${startColWidth}px`,
    "--colW": `${colW}px`,
    "--service-col-width": `${serviceColWidth}px`,
    "--host-col-width": `${hostColWidth}px`,
    "--timeline-inner-width": resolvedInnerWidth,
    "--timeline-start-us": String(startUs),
    "--timeline-total-us": String(totalUs),
    "--timeline-max-height": `${maxHeight}px`,
  };

  onMount(() => {
    viewportRef?.scrollTo({ left: 0, top: 0, behavior: "auto" });
  });

  return (
    <section class={styles.spanTimeline} style={timelineStyle}>
      <div class={styles.timelineViewport} ref={viewportRef}>
        <header class={styles.headRow}>
          <HeaderRenderer
            locale={locale}
            totalUs={totalUs}
            formatDuration={formatDuration}
            globalVar={globalVar}
            classes={classNames}
          />
        </header>

        <div class={`${styles.body} ${styles.spanTree}`}>
          <For each={nodes}>
            {(node) => (
              <TimelineRow
                node={node}
                locale={locale}
                timelineStartUs={startUs}
                timelineTotalUs={totalUs}
                formatStartTime={formatStartTime}
                formatDuration={formatDuration}
                globalVar={globalVar}
                rowRender={RowRenderer}
              />
            )}
          </For>
        </div>
      </div>
    </section>
  );
};

export default SpanTimeline;
