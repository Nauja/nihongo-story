import type { Story } from "../types";

export const isCJK = (c: string) => {
  const cp = c.codePointAt(0)!;
  return cp >= 0x4e00 && cp <= 0x9fff;
};

export interface WkBucket {
  index: number; // 0..5
  min: number; // 1, 11, 21, ...
  max: number; // 10, 20, 30, ...
  count: number;
  percent: number;
}

// WaniKani has 60 levels grouped into tens: 1-10, 11-20, ... 51-60.
export const bucketOf = (level: number): number =>
  Math.min(5, Math.max(0, Math.floor((level - 1) / 10)));

export function wkLevelDistribution(
  story: Story,
  kanjiLevels?: Map<string, number> | null,
): WkBucket[] {
  if (!kanjiLevels || kanjiLevels.size === 0) return [];

  const kanji = [
    ...new Set(story.segments.flatMap((s) => [...s.text].filter(isCJK))),
  ];

  const counts = [0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const c of kanji) {
    const level = kanjiLevels.get(c);
    if (level == null) continue; // exclude kanji with no WaniKani level
    counts[bucketOf(level)]++;
    total++;
  }
  if (total === 0) return [];

  return counts
    .map((count, index) => ({
      index,
      min: index * 10 + 1,
      max: index * 10 + 10,
      count,
      percent: (count / total) * 100,
    }))
    .filter((b) => b.count > 0);
}
