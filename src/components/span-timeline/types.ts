import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { Locale } from "../../i18n/strings";
import type { TimelineSpanNode } from "./sample-trace";

export type GlobalVar = Record<string, unknown>;

export type HeaderRenderContext = {
  locale: Locale;
  totalUs: number;
  formatDuration: (microseconds: number) => string;
  globalVar: GlobalVar;
};

export type RowRenderContext = {
  node: TimelineSpanNode;
  locale: Locale;
  rowVars: string;
  isNearEnd: boolean;
  formatDuration: (microseconds: number) => string;
  formatStartTime: (microseconds: number) => string;
  globalVar: GlobalVar;
};

export type HeaderRenderProps = HeaderRenderContext;

export type RowRenderProps = RowRenderContext;

export type HeaderRender = AstroComponentFactory;

export type RowRender = AstroComponentFactory;
