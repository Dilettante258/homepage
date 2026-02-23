/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import styles from "./DurationBarCell.module.css";

type DurationBarCellProps = {
  startUs?: number;
  durationUs: number;
  totalUs: number;
  label: string;
  error?: boolean;
  className?: string;
  fromRightThreshold?: number;
};

const DurationBarCell = (props: DurationBarCellProps) => {
  const totalUs = props.totalUs > 0 ? props.totalUs : 1;
  const startUs = props.startUs ?? 0;
  const fromRight =
    startUs / totalUs > (props.fromRightThreshold ?? 0.8);

  const vars: JSX.CSSProperties = {
    "--row-start-us": String(startUs),
    "--row-duration-us": String(props.durationUs),
    "--row-total-us": String(totalUs),
  };

  return (
    <div
      class={`${styles.cell} ${props.className ?? ""}`}
      style={vars}
      data-error={props.error ? "true" : "false"}
    >
      <span class={styles.bar}></span>
      <span
        classList={{
          [styles.text]: true,
          [styles.textFromRight]: fromRight,
        }}
      >
        {props.label}
      </span>
    </div>
  );
};

export default DurationBarCell;
