import { useMemo, useState } from "react";

const entries = [
  { title: "Micro-interactions", desc: "Hover tilt + springy shadow" },
  { title: "Data hooks", desc: "Use React Query or SWR for cache" },
  { title: "Edge ready", desc: "Keep components pure & streamable" },
];

const TiltCard = () => {
  const [active, setActive] = useState(0);

  const card = useMemo(() => entries[active], [active]);

  return (
    <div className="tilt-wrapper">
      <div className="tabs">
        {entries.map((entry, i) => (
          <button
            key={entry.title}
            className={i === active ? "on" : ""}
            onClick={() => setActive(i)}
            type="button"
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="tilt-card">
        <div className="tilt-glow" />
        <h4>{card.title}</h4>
        <p>{card.desc}</p>
      </div>
    </div>
  );
};

export default TiltCard;
