import type { Story } from "../types";

export const isCJK = (c: string) => {
  const cp = c.codePointAt(0)!;
  return cp >= 0x4e00 && cp <= 0x9fff;
};

export type LevelMode = "wanikani" | "jlpt";

// How known kanji are marked by level in story text: not at all, a translucent
// background highlight, or a colored underline.
export type KanjiLevelStyle = "off" | "highlight" | "underline";

// Resolves the active level-distribution mode. JLPT data is always available
// (bundled kanji lists, built on demand), so it is the default; WaniKani is used
// only when explicitly selected and currently knowable (API key or built cache).
export function effectiveLevelMode(
  saved: LevelMode | undefined,
  wkKnowable: boolean,
): LevelMode {
  if (saved === "wanikani" && wkKnowable) return "wanikani";
  return "jlpt";
}

// Easy → hard difficulty ramp. WaniKani uses six level groups (1-10 … 51-60);
// JLPT reuses the first five steps for N5 → N1.
const WK_BUCKET_COLORS = [
  "#22c55e", // 1-10  green
  "#84cc16", // 11-20 lime
  "#eab308", // 21-30 yellow
  "#f97316", // 31-40 orange
  "#ef4444", // 41-50 red
  "#db2777", // 51-60 magenta
];

const JLPT_BUCKET_COLORS = [
  "#22c55e", // N5 green
  "#84cc16", // N4 lime
  "#eab308", // N3 yellow
  "#f97316", // N2 orange
  "#ef4444", // N1 red
];

// WaniKani has 60 levels grouped into tens: 1-10, 11-20, ... 51-60.
export const bucketOf = (level: number): number =>
  Math.min(5, Math.max(0, Math.floor((level - 1) / 10)));

// JLPT levels map to buckets easy → hard: N5 → 0, N4 → 1, … N1 → 4.
export const bucketOfJLPT = (level: number): number =>
  Math.min(4, Math.max(0, 5 - level));

export const bucketOfMode = (mode: LevelMode) =>
  mode === "jlpt" ? bucketOfJLPT : bucketOf;

// Color for a kanji's level in the active scheme — same bucket palette as the
// level-distribution bar, so underlines and the bar stay in sync.
export function levelColor(mode: LevelMode, level: number): string {
  const colors = mode === "jlpt" ? JLPT_BUCKET_COLORS : WK_BUCKET_COLORS;
  return colors[bucketOfMode(mode)(level)];
}

// Translucent variant of a kanji's level color, used as a background highlight.
// Palette colors are 6-digit hex, so appending two alpha digits (~25%) is safe.
export function levelHighlight(mode: LevelMode, level: number): string {
  return levelColor(mode, level) + "40";
}

// Bucket index / color for kanji whose level could not be resolved (looked up,
// but absent from the WaniKani data or JLPT lists). -1 never collides with the
// real bucket indices (0..5).
export const UNAVAILABLE_BUCKET = -1;
export const UNAVAILABLE_COLOR = "#9ca3af"; // grey, readable in both themes

export interface LevelBucket {
  index: number;
  label: string;
  color: string;
  count: number;
  percent: number;
}

export function levelDistribution(
  story: Story,
  kanjiLevels: Map<string, number> | null | undefined,
  mode: LevelMode,
): LevelBucket[] {
  // A null map means no lookup happened yet (no WK key/cache, or JLPT not loaded)
  // — don't render. A non-null map means lookup ran, so kanji missing from it are
  // genuinely unavailable in this scheme.
  if (!kanjiLevels) return [];

  const kanji = [
    ...new Set(story.segments.flatMap((s) => [...s.text].filter(isCJK))),
  ];

  const bucketCount = mode === "jlpt" ? 5 : 6;
  const bucketOfLevel = bucketOfMode(mode);
  const colors = mode === "jlpt" ? JLPT_BUCKET_COLORS : WK_BUCKET_COLORS;

  const counts = new Array(bucketCount).fill(0);
  let unavailable = 0;
  let total = 0;
  for (const c of kanji) {
    const level = kanjiLevels.get(c);
    if (level == null) {
      unavailable++; // resolved but no level in this scheme
    } else {
      counts[bucketOfLevel(level)]++;
    }
    total++;
  }
  if (total === 0) return [];

  const buckets = counts
    .map((count, index) => ({
      index,
      label:
        mode === "jlpt"
          ? `N${5 - index}`
          : `Lv ${index * 10 + 1}–${index * 10 + 10}`,
      color: colors[index],
      count,
      percent: (count / total) * 100,
    }))
    .filter((b) => b.count > 0);

  if (unavailable > 0) {
    buckets.push({
      index: UNAVAILABLE_BUCKET,
      label: "N/A",
      color: UNAVAILABLE_COLOR,
      count: unavailable,
      percent: (unavailable / total) * 100,
    });
  }

  return buckets;
}
