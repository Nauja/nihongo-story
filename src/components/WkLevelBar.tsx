import type { CSSProperties } from "react";
import type { Story } from "../types";
import { levelDistribution, type LevelMode } from "../lib/wkLevels";

interface Props {
  story: Story;
  kanjiLevels?: Map<string, number> | null;
  mode: LevelMode;
  className?: string;
  style?: CSSProperties;
  selectedBucket?: number | null;
  onSelectBucket?: (index: number) => void;
}

export default function WkLevelBar({
  story,
  kanjiLevels,
  mode,
  className,
  style,
  selectedBucket,
  onSelectBucket,
}: Props) {
  const buckets = levelDistribution(story, kanjiLevels, mode);
  if (buckets.length === 0) return null;

  const dimmed = (index: number) =>
    selectedBucket != null && selectedBucket !== index;

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
            role="button"
            title={`${b.label} · ${b.count} kanji · ${Math.round(b.percent)}%`}
            onClick={() => onSelectBucket?.(b.index)}
            style={{
              width: `${b.percent}%`,
              background: b.color,
              boxShadow:
                i < buckets.length - 1
                  ? "inset -1px 0 0 var(--surface-1)"
                  : undefined,
              cursor: "pointer",
              opacity: dimmed(b.index) ? 0.3 : 1,
              transition: "opacity 0.15s",
            }}
          />
        ))}
      </div>
      <div className="d-flex flex-wrap gap-2 mt-2 small text-secondary">
        {buckets.map((b) => (
          <span
            key={b.index}
            role="button"
            className="d-inline-flex align-items-center gap-1"
            title={`${b.label} · ${b.count} kanji · ${Math.round(b.percent)}%`}
            onClick={() => onSelectBucket?.(b.index)}
            style={{
              cursor: "pointer",
              opacity: dimmed(b.index) ? 0.3 : 1,
              fontWeight: selectedBucket === b.index ? 600 : undefined,
              transition: "opacity 0.15s",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: b.color,
                display: "inline-block",
              }}
            />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
