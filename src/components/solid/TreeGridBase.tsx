/** @jsxImportSource solid-js */
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  type JSX,
} from "solid-js";
import type { Locale } from "../../i18n/strings";
import styles from "./TreeGridBase.module.css";

export type TreeGridNodeBase<T extends TreeGridNodeBase<T> = any> = {
  id: string;
  name: string;
  error: boolean;
  componentTag: string;
  open?: boolean;
  children: T[];
};

export type TreeGridColumn<T extends TreeGridNodeBase<T>> = {
  key: string;
  title: JSX.Element | string;
  width?: number;
  isTree?: boolean;
  sticky?: "left" | "right";
  className?: string;
  headerClassName?: string;
  render?: (context: {
    node: T;
    depth: number;
    locale: Locale;
    isMatch: boolean;
    isActiveMatch: boolean;
    isLastClicked: boolean;
  }) => JSX.Element;
};

type TreeGridBaseProps<T extends TreeGridNodeBase<T>> = {
  locale: Locale;
  nodes: T[];
  columns: TreeGridColumn<T>[];
  innerWidth?: number | string;
  maxHeight?: number;
  stickyCols?: string[];
  showHighlighter?: boolean;
  styleVars?: JSX.CSSProperties;
};

type FlatNode<T> = {
  node: T;
  depth: number;
};

const flattenNodes = <T extends TreeGridNodeBase<T>>(
  nodes: T[],
  depth = 0,
): FlatNode<T>[] => {
  const list: FlatNode<T>[] = [];
  for (const node of nodes) {
    list.push({ node, depth });
    if (node.children.length > 0) {
      list.push(...flattenNodes(node.children, depth + 1));
    }
  }
  return list;
};

const toCssLength = (value: number | string): string =>
  typeof value === "number" ? `${value}px` : value;

export default function TreeGridBase<T extends TreeGridNodeBase<T>>(
  props: TreeGridBaseProps<T>,
) {
  const [selectedTags, setSelectedTags] = createSignal<Set<string>>(new Set());
  const [keyword, setKeyword] = createSignal("");
  const [errorOnly, setErrorOnly] = createSignal(false);
  const [activeMatchIndex, setActiveMatchIndex] = createSignal(0);
  const [visibleMatchIds, setVisibleMatchIds] = createSignal<string[]>([]);
  const [lastClickedRowId, setLastClickedRowId] = createSignal("");

  let bodyRef: HTMLDivElement | undefined;
  let viewportRef: HTMLDivElement | undefined;

  const maxHeight = () => props.maxHeight ?? 620;
  const stickyCols = () => new Set(props.stickyCols ?? []);
  const showHighlighter = () => props.showHighlighter ?? true;

  const resolvedColumns = createMemo(() => {
    const cols = props.columns.map((column, index) => {
      if (column.sticky) return column;
      if (!stickyCols().has(column.key)) return column;
      return {
        ...column,
        sticky: index === 0 ? ("left" as const) : ("right" as const),
      };
    });

    return cols.map((column, index) => ({
      ...column,
      isTree: column.isTree ?? index === 0,
    }));
  });

  const fixedWidthTotal = createMemo(() =>
    resolvedColumns().reduce((total, column) => {
      if (column.isTree) return total;
      return total + (column.width ?? 0);
    }, 0),
  );

  const resolvedInnerWidth = createMemo(() => {
    const value = props.innerWidth;
    if (value === undefined) return `${Math.max(1, fixedWidthTotal() + 1)}px`;
    return toCssLength(value);
  });

  const flatNodes = createMemo(() => flattenNodes(props.nodes));

  const tagStats = createMemo(() => {
    const map = new Map<string, number>();
    for (const { node } of flatNodes()) {
      const tag = node.componentTag || "unknown";
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  });

  const errorCount = createMemo(
    () => flatNodes().filter(({ node }) => node.error).length,
  );

  const normalizedKeyword = createMemo(() => keyword().trim().toLowerCase());
  const hasAnyFilter = createMemo(
    () =>
      selectedTags().size > 0 || normalizedKeyword().length > 0 || errorOnly(),
  );

  const matchedIdSet = createMemo(() => {
    const set = new Set<string>();
    if (!hasAnyFilter()) return set;

    const tags = selectedTags();
    const kw = normalizedKeyword();
    const enableTag = tags.size > 0;
    const enableKw = kw.length > 0;
    const enableError = errorOnly();

    for (const { node } of flatNodes()) {
      const tagMatch = enableTag && tags.has(node.componentTag || "unknown");
      const keywordMatch = enableKw && node.name.toLowerCase().includes(kw);
      const errorMatch = enableError && node.error;

      if (tagMatch || keywordMatch || errorMatch) {
        set.add(node.id);
      }
    }

    return set;
  });

  const activeMatchId = createMemo(() => {
    const ids = visibleMatchIds();
    if (ids.length === 0) return "";
    const index = activeMatchIndex();
    return ids[Math.max(0, Math.min(index, ids.length - 1))] ?? "";
  });

  const stickyOffsets = createMemo(() => {
    const left = new Map<string, number>();
    const right = new Map<string, number>();

    let leftOffset = 0;
    for (const column of resolvedColumns()) {
      if (column.sticky === "left") {
        left.set(column.key, leftOffset);
        leftOffset += column.width ?? 0;
      }
    }

    let rightOffset = 0;
    for (let i = resolvedColumns().length - 1; i >= 0; i -= 1) {
      const column = resolvedColumns()[i];
      if (column.sticky === "right") {
        right.set(column.key, rightOffset);
        rightOffset += column.width ?? 0;
      }
    }

    return { left, right };
  });

  const recomputeVisibleMatches = () => {
    if (!bodyRef) return;
    const elements = Array.from(
      bodyRef.querySelectorAll<HTMLElement>("[data-row-id][data-match='true']"),
    ).filter((element) => element.getClientRects().length > 0);

    const ids = elements
      .map((element) => element.dataset.rowId ?? "")
      .filter(Boolean);

    setVisibleMatchIds(ids);

    if (ids.length === 0) {
      setActiveMatchIndex(0);
      return;
    }

    if (activeMatchIndex() >= ids.length) {
      setActiveMatchIndex(0);
    }
  };

  const scheduleRecompute = () => {
    requestAnimationFrame(recomputeVisibleMatches);
  };

  const scrollToMatch = (index: number) => {
    const ids = visibleMatchIds();
    if (!ids.length || !bodyRef) return;

    const safeIndex = ((index % ids.length) + ids.length) % ids.length;
    setActiveMatchIndex(safeIndex);

    requestAnimationFrame(() => {
      const id = ids[safeIndex];
      const target = bodyRef?.querySelector<HTMLElement>(
        `[data-row-id="${CSS.escape(id)}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((previous) => {
      const next = new Set(previous);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  createEffect(() => {
    matchedIdSet();
    setActiveMatchIndex(0);
    scheduleRecompute();
  });

  onMount(() => {
    scheduleRecompute();
  });

  const styleVars = createMemo<JSX.CSSProperties>(() => ({
    "--treegrid-inner-width": resolvedInnerWidth(),
    "--treegrid-max-height": `${maxHeight()}px`,
    ...(props.styleVars ?? {}),
  }));

  const matchText = createMemo(() => {
    const total = visibleMatchIds().length;
    if (total === 0) return "0/0";
    return `${activeMatchIndex() + 1}/${total}`;
  });

  const renderNode = (node: T, depth: number): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isMatch = createMemo(
      () => hasAnyFilter() && matchedIdSet().has(node.id),
    );
    const isActive = createMemo(() => activeMatchId() === node.id && isMatch());
    const isLastClicked = createMemo(() => lastClickedRowId() === node.id);

    return (
      <details
        class={styles.node}
        open={hasChildren ? node.open !== false : undefined}
        onToggle={scheduleRecompute}
      >
        <summary
          class={styles.summary}
          classList={{
            [styles.leafSummary]: !hasChildren,
          }}
          data-row-id={node.id}
          data-component-tag={node.componentTag || "unknown"}
          data-error={node.error ? "true" : "false"}
          data-match={isMatch() ? "true" : "false"}
          data-active-match={isActive() ? "true" : "false"}
          data-last-clicked={isLastClicked() ? "true" : "false"}
          onClick={() => setLastClickedRowId(node.id)}
        >
          <div class={styles.row}>
            <For each={resolvedColumns()}>
              {(column) => {
                const cellStyle: JSX.CSSProperties = {};

                if (!column.isTree) {
                  const width = column.width ?? 0;
                  cellStyle["--cell-width"] = `${width}px`;
                }

                if (column.sticky === "left") {
                  cellStyle["--sticky-left"] = `${stickyOffsets().left.get(column.key) ?? 0}px`;
                }
                if (column.sticky === "right") {
                  cellStyle["--sticky-right"] = `${stickyOffsets().right.get(column.key) ?? 0}px`;
                }

                const content = () =>
                  column.render?.({
                    node,
                    depth,
                    locale: props.locale,
                    isMatch: isMatch(),
                    isActiveMatch: isActive(),
                    isLastClicked: isLastClicked(),
                  }) ?? (
                    <div class={styles.treeCellInner}>
                      <span class={styles.rowConnector}>
                        <span class={styles.nameText}>{node.name}</span>
                      </span>
                    </div>
                  );

                return (
                  <div
                    class={`${styles.cell} ${column.isTree ? styles.cellTree : styles.cellFixed} ${column.className ?? ""}`}
                    classList={{
                      [styles.treeCell]: !!column.isTree,
                      [styles.stickyLeft]: column.sticky === "left",
                      [styles.stickyRight]: column.sticky === "right",
                    }}
                    style={cellStyle}
                  >
                    {content()}
                  </div>
                );
              }}
            </For>
          </div>
        </summary>

        <Show when={hasChildren}>
          <div class={styles.children}>
            <For each={node.children}>{(child) => renderNode(child, depth + 1)}</For>
          </div>
        </Show>
      </details>
    );
  };

  return (
    <section class={styles.treeGrid} style={styleVars()}>
      <Show when={showHighlighter()}>
        <div class={styles.toolbar}>
          <div class={styles.tagRow}>
            <span class={styles.tagLabel}>
              {props.locale === "zh" ? "组件标签" : "Components"}
            </span>
            <For each={tagStats()}>
              {(item) => {
                const active = () => selectedTags().has(item.tag);
                return (
                  <button
                    type="button"
                    class={styles.matchTag}
                    data-selected={active() ? "true" : "false"}
                    onClick={() => toggleTag(item.tag)}
                  >
                    <span>{item.tag}</span>
                    <span class={styles.matchBadge}>{item.count}</span>
                  </button>
                );
              }}
            </For>
          </div>

          <div class={styles.filterRow}>
            <div class={styles.keywordWrap}>
              <input
                class={styles.keywordInput}
                value={keyword()}
                onInput={(event) => setKeyword(event.currentTarget.value)}
                placeholder={
                  props.locale === "zh"
                    ? "请按关键字搜索 Span"
                    : "Search spans by keyword"
                }
              />
            </div>

            <label class={styles.errorToggle}>
              <input
                type="checkbox"
                checked={errorOnly()}
                onChange={(event) => setErrorOnly(event.currentTarget.checked)}
              />
              <span>
                {props.locale === "zh" ? "查看异常Span" : "Error Spans"}
              </span>
              <span class={styles.matchBadge}>{errorCount()}</span>
            </label>

            <div class={styles.navWrap}>
              <span>
                {props.locale === "zh" ? "已查找Span" : "Matched Spans"}:{" "}
                {matchText()}
              </span>
              <div class={styles.navButtons}>
                <button
                  type="button"
                  class={styles.navBtn}
                  disabled={visibleMatchIds().length === 0}
                  onClick={() => scrollToMatch(activeMatchIndex() - 1)}
                  aria-label={props.locale === "zh" ? "上一个" : "Previous"}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class={styles.navBtn}
                  disabled={visibleMatchIds().length === 0}
                  onClick={() => scrollToMatch(activeMatchIndex() + 1)}
                  aria-label={props.locale === "zh" ? "下一个" : "Next"}
                >
                  ↓
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <div class={styles.viewport} ref={viewportRef}>
        <header class={styles.headerRow}>
          <For each={resolvedColumns()}>
            {(column) => {
              const headerStyle: JSX.CSSProperties = {};
              if (!column.isTree) {
                headerStyle["--cell-width"] = `${column.width ?? 0}px`;
              }
              if (column.sticky === "left") {
                headerStyle["--sticky-left"] =
                  `${stickyOffsets().left.get(column.key) ?? 0}px`;
              }
              if (column.sticky === "right") {
                headerStyle["--sticky-right"] =
                  `${stickyOffsets().right.get(column.key) ?? 0}px`;
              }

              return (
                <div
                  class={`${styles.headerCell} ${column.isTree ? styles.cellTree : styles.cellFixed} ${column.headerClassName ?? ""}`}
                  classList={{
                    [styles.stickyLeft]: column.sticky === "left",
                    [styles.stickyRight]: column.sticky === "right",
                  }}
                  style={headerStyle}
                >
                  {column.title}
                </div>
              );
            }}
          </For>
        </header>

        <div class={styles.body} ref={bodyRef}>
          <For each={props.nodes}>{(node) => renderNode(node, 0)}</For>
        </div>
      </div>
    </section>
  );
}
