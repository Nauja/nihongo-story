import type { CSSProperties } from "react";
import type { Story } from "../types";
import { wkLevelDistribution } from "../lib/wkLevels";

// Easy → hard difficulty ramp across the six WaniKani level groups (1-10 … 51-60).
const BUCKET_COLORS = [
  "#22c55e", // 1-10  green
  "#84cc16", // 11-20 lime
  "#eab308", // 21-30 yellow
  "#f97316", // 31-40 orange
  "#ef4444", // 41-50 red
  "#db2777", // 51-60 magenta
];

interface Props {
  story: Story;
  kanjiLevels?: Map<string, number> | null;
  className?: string;
  style?: CSSProperties;
}

export default function WkLevelBar({ story, kanjiLevels, className, style }: Props) {
  const buckets = wkLevelDistribution(story, kanjiLevels);
  if (buckets.length === 0) return null;

  return (
    <div className={className} style={style}>
      <div
        className="d-flex overflow-hidden"
        style={{
          height: 8,
          borderRadius: 4,
          background: "var(--border-subtle)",
        }}
      >
        {buckets.map((b, i) => (
          <div
            key={b.index}
            title={`Lv ${b.min}–${b.max} · ${b.count} kanji · ${Math.round(b.percent)}%`}
            style={{
              width: `${b.percent}%`,
              background: BUCKET_COLORS[b.index],
              boxShadow:
                i < buckets.length - 1
                  ? "inset -1px 0 0 var(--surface-1)"
                  : undefined,
            }}
          />
        ))}
      </div>
      <div className="d-flex flex-wrap gap-2 mt-2 small text-secondary">
        {buckets.map((b) => (
          <span
            key={b.index}
            className="d-inline-flex align-items-center gap-1"
            title={`Lv ${b.min}–${b.max} · ${b.count} kanji · ${Math.round(b.percent)}%`}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: BUCKET_COLORS[b.index],
                display: "inline-block",
              }}
            />
            Lv {b.min}–{b.max}
          </span>
        ))}
      </div>
    </div>
  );
}
