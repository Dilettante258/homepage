/** @jsxImportSource solid-js */
import { createSignal, createMemo, createEffect } from "solid-js";

const gradients = [
  ["#7EF3D1", "#9BB7FF"],
  ["#FF7EB6", "#FFD166"],
  ["#6DD3FF", "#C1A3FF"],
  ["#64E8DE", "#8A64FF"],
];

const ColorPlayground = () => {
  const [angle, setAngle] = createSignal(120);
  const [idx, setIdx] = createSignal(0);
  const gradient = createMemo(() => gradients[idx() % gradients.length]);

  const style = createMemo(() => ({
    background: `linear-gradient(${angle()}deg, ${gradient()[0]}, ${gradient()[1]})`,
    transition: "background 200ms ease",
  }));
  //   createEffect();

  return (
    <div class="playground">
      <div class="preview" style={style()} />
      <div class="controls">
        <label>
          <span>Angle</span>
          <input
            type="range"
            min="0"
            max="360"
            value={angle()}
            onInput={(e) => setAngle(Number(e.currentTarget.value))}
          />
          <strong>{angle()}°</strong>
        </label>
        <div class="swatches">
          {gradients.map((pair, i) => (
            <button
              type="button"
              class={i === idx() ? "active" : ""}
              style={{
                background: `linear-gradient(120deg, ${pair[0]}, ${pair[1]})`,
              }}
              onClick={() => setIdx(i)}
              aria-label={`Gradient ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPlayground;
