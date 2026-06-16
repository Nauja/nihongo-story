import type { WaniKaniSubject, WaniKaniUser } from '../types'
import {
  getWKCacheEntry,
  getWKCacheEntries,
  setWKCacheEntry,
  setWKCacheEntries,
  clearWKSubjectsStore,
  getWKUser,
  setWKUser,
} from './storage'

const BASE_URL = 'https://api.wanikani.com/v2'

export async function getWaniKaniUser(apiKey: string): Promise<WaniKaniUser | null> {
  if (!apiKey) return null

  const cached = getWKUser()
  if (cached) return cached

  const res = await fetch(`${BASE_URL}/user`, {
    headers: { Authorization: `Token token=${apiKey}` },
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid WaniKani API key')
    throw new Error(`WaniKani API error: ${res.status}`)
  }

  const data = (await res.json()) as { data: { username: string; level: number } }
  const user: WaniKaniUser = { username: data.data.username, level: data.data.level }
  setWKUser(user)
  return user
}

export async function lookupSubject(
  word: string,
  apiKey: string,
): Promise<WaniKaniSubject | null> {
  if (!apiKey) return null

  const cached = await getWKCacheEntry(word)
  if (cached !== undefined) return cached as WaniKaniSubject | null

  const params = new URLSearchParams({ types: 'kanji,vocabulary', slugs: word })
  const res = await fetch(`${BASE_URL}/subjects?${params}`, {
    headers: { Authorization: `Token token=${apiKey}` },
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid WaniKani API key')
    throw new Error(`WaniKani API error: ${res.status}`)
  }

  const data = (await res.json()) as { data: WaniKaniSubject[] }
  const subject = data.data.find(s => s.object === 'kanji') ?? data.data[0] ?? null
  await setWKCacheEntry(word, subject)
  return subject
}

export async function lookupSubjectsBatch(
  words: string[],
  apiKey: string,
): Promise<Record<string, WaniKaniSubject | null>> {
  if (!apiKey || words.length === 0) return {}

  const values = await getWKCacheEntries(words)
  const result: Record<string, WaniKaniSubject | null> = {}
  const uncached: string[] = []

  words.forEach((word, i) => {
    if (values[i] !== undefined) {
      result[word] = values[i] as WaniKaniSubject | null
    } else {
      uncached.push(word)
    }
  })

  if (uncached.length > 0) {
    const slugsPart = uncached.map(encodeURIComponent).join(',')
    const res = await fetch(
      `${BASE_URL}/subjects?types=kanji,vocabulary&slugs=${slugsPart}`,
      { headers: { Authorization: `Token token=${apiKey}` } },
    )

    if (!res.ok) throw new Error(`WaniKani API error: ${res.status}`)

    const data = (await res.json()) as { data: WaniKaniSubject[] }
    const foundMap: Record<string, WaniKaniSubject> = {}
    for (const subject of data.data) {
      if (subject.data.characters) {
        const existing = foundMap[subject.data.characters]
        if (!existing || subject.object === 'kanji') {
          foundMap[subject.data.characters] = subject
        }
      }
    }

    const entries: [string, WaniKaniSubject | null][] = uncached.map((word) => {
      const found = foundMap[word] ?? null
      result[word] = found
      return [word, found]
    })
    await setWKCacheEntries(entries)
  }

  return result
}

// Reads WaniKani subjects for the given words from the built cache only — no API
// key and no network. Used when the WK distribution is "knowable" from a built
// cache but no API key is set.
export async function lookupCachedSubjectsBatch(
  words: string[],
): Promise<Record<string, WaniKaniSubject | null>> {
  if (words.length === 0) return {}

  const values = await getWKCacheEntries(words)
  const result: Record<string, WaniKaniSubject | null> = {}
  words.forEach((word, i) => {
    result[word] = (values[i] ?? null) as WaniKaniSubject | null
  })
  return result
}

export async function buildWKSubjectCache(
  apiKey: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  await clearWKSubjectsStore()

  let url: string | null = `${BASE_URL}/subjects?types=kanji,vocabulary&per_page=500`
  let total = 0
  let loaded = 0
  const writtenAsKanji = new Set<string>()

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Token token=${apiKey}` },
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid WaniKani API key')
      throw new Error(`WaniKani API error: ${res.status}`)
    }

    const data = (await res.json()) as {
      total_count: number
      pages: { next_url: string | null }
      data: WaniKaniSubject[]
    }

    if (total === 0) total = data.total_count

    const pageEntries: [string, unknown][] = []
    for (const subject of data.data) {
      if (subject.data.characters) {
        if (subject.object === 'kanji') {
          writtenAsKanji.add(subject.data.characters)
          pageEntries.push([subject.data.characters, subject])
        } else if (!writtenAsKanji.has(subject.data.characters)) {
          pageEntries.push([subject.data.characters, subject])
        }
      }
      pageEntries.push([`_id_${subject.id}`, subject])
    }
    await setWKCacheEntries(pageEntries)

    loaded += data.data.length
    onProgress(loaded, total)
    url = data.pages.next_url
  }
}

export async function lookupSubjectsByIds(
  ids: number[],
  apiKey: string,
): Promise<WaniKaniSubject[]> {
  if (!apiKey || ids.length === 0) return []

  const idKeys = ids.map((id) => `_id_${id}`)
  const values = await getWKCacheEntries(idKeys)
  const missing = ids.filter((_, i) => values[i] === undefined)

  if (missing.length > 0) {
    const params = new URLSearchParams({ ids: missing.join(',') })
    const res = await fetch(`${BASE_URL}/subjects?${params}`, {
      headers: { Authorization: `Token token=${apiKey}` },
    })

    if (!res.ok) throw new Error(`WaniKani API error: ${res.status}`)

    const data = (await res.json()) as { data: WaniKaniSubject[] }
    const entries: [string, WaniKaniSubject][] = data.data.map((s) => [`_id_${s.id}`, s])
    await setWKCacheEntries(entries)

    const updated = await getWKCacheEntries(idKeys)
    return updated
      .map((v) => v as WaniKaniSubject | undefined)
      .filter((s): s is WaniKaniSubject => s != null)
  }

  return values
    .map((v) => v as WaniKaniSubject | undefined)
    .filter((s): s is WaniKaniSubject => s != null)
}
