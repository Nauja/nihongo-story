import {
  clearJLPTStore,
  setJLPTCacheEntries,
  getJLPTCacheEntries,
  getJLPTCacheBuiltAt,
  setJLPTCacheBuiltAt,
} from './storage'

// JLPT levels from easiest (N5) to hardest (N1). The kanji lists live in
// public/jlpt/n<level>-kanji.txt — one concatenated string of kanji per level,
// generated from the Anki decks by scripts/convert-anki-kanji.mjs.
export const JLPT_LEVELS = [5, 4, 3, 2, 1] as const

// Builds the JLPT kanji cache in IndexedDB by fetching the per-level text files
// and storing each kanji keyed by its character → JLPT level number.
export async function buildJLPTKanjiCache(
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  await clearJLPTStore()

  const total = JLPT_LEVELS.length
  let loaded = 0
  onProgress(loaded, total)

  for (const level of JLPT_LEVELS) {
    const res = await fetch(`${import.meta.env.BASE_URL}jlpt/n${level}-kanji.txt`)
    if (!res.ok) throw new Error(`Failed to load JLPT N${level} kanji (${res.status})`)

    const text = await res.text()
    const chars = [...text.trim()].filter((c) => c.trim().length > 0)
    await setJLPTCacheEntries(chars.map((c) => [c, level]))

    loaded += 1
    onProgress(loaded, total)
  }
}

// Ensures the JLPT cache exists, building it from the bundled txt files on first
// use. Concurrent first-time callers share a single build; a failed build resets
// the guard so the next call can retry.
let ensurePromise: Promise<void> | null = null

export function ensureJLPTCache(): Promise<void> {
  if (getJLPTCacheBuiltAt() != null) return Promise.resolve()
  if (!ensurePromise) {
    ensurePromise = buildJLPTKanjiCache(() => {})
      .then(() => {
        setJLPTCacheBuiltAt()
      })
      .catch((e) => {
        ensurePromise = null
        throw e
      })
  }
  return ensurePromise
}

// Returns a kanji → JLPT level map for the given characters. Uses the built
// cache when present, otherwise fetches the txt files and builds it on demand.
// Characters with no JLPT level are omitted.
export async function getJLPTKanjiLevels(
  chars: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (chars.length === 0) return map

  await ensureJLPTCache()

  const values = await getJLPTCacheEntries(chars)
  chars.forEach((char, i) => {
    const level = values[i]
    if (typeof level === 'number') map.set(char, level)
  })
  return map
}
