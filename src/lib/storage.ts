import type { Settings, Story, WaniKaniUser } from '../types'

const KEYS = {
  settings: 'jap_settings',
  stories: 'jap_stories',
  wkUser: 'jap_wk_user',
  wkCacheBuiltAt: 'jap_wk_cache_built_at',
} as const

// ── localStorage helpers ──────────────────────────────────────────────────────

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── IndexedDB — WaniKani subject cache ────────────────────────────────────────

const DB_NAME = 'jap_wk_db'
const STORE = 'subjects'
let dbPromise: Promise<IDBDatabase> | null = null

function openWKDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

export async function getWKCacheEntry(key: string): Promise<unknown> {
  const db = await openWKDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getWKCacheEntries(keys: string[]): Promise<unknown[]> {
  if (keys.length === 0) return []
  const db = await openWKDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const results: unknown[] = new Array(keys.length)
    let pending = keys.length
    keys.forEach((key, i) => {
      const req = store.get(key)
      req.onsuccess = () => {
        results[i] = req.result
        if (--pending === 0) resolve(results)
      }
      req.onerror = () => reject(req.error)
    })
  })
}

export async function setWKCacheEntry(key: string, value: unknown): Promise<void> {
  const db = await openWKDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function setWKCacheEntries(entries: [string, unknown][]): Promise<void> {
  if (entries.length === 0) return
  const db = await openWKDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const [key, value] of entries) store.put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearWKSubjectsStore(): Promise<void> {
  const db = await openWKDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getWKCacheCount(): Promise<number> {
  const db = await openWKDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getWKCacheSize(): Promise<number> {
  const db = await openWKDB()
  const values = await new Promise<unknown[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return new Blob([JSON.stringify(values)]).size
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSettings(): Settings {
  return get<Settings>(KEYS.settings, {
    provider: 'gemini',
    claudeApiKey: '',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'qwen2.5:7b',
    wanikaniApiKey: '',
    wanikaniPopupMode: 'advanced',
    wanikaniLevelColors: true,
    showFurigana: true,
theme: 'light',
  })
}

export function saveSettings(settings: Settings): void {
  set(KEYS.settings, settings)
}

// ── Stories ───────────────────────────────────────────────────────────────────

export function getStories(): Story[] {
  return get<Story[]>(KEYS.stories, [])
}

export function saveStory(story: Story): void {
  const stories = getStories()
  const idx = stories.findIndex((s) => s.id === story.id)
  if (idx >= 0) {
    stories[idx] = story
  } else {
    stories.unshift(story)
  }
  set(KEYS.stories, stories)
}

export function deleteStory(id: string): void {
  const stories = getStories().filter((s) => s.id !== id)
  set(KEYS.stories, stories)
}

// ── WaniKani user (localStorage — tiny) ──────────────────────────────────────

export function getWKUser(): WaniKaniUser | null {
  return get<WaniKaniUser | null>(KEYS.wkUser, null)
}

export function setWKUser(user: WaniKaniUser | null): void {
  set(KEYS.wkUser, user)
}

export function getWKCacheBuiltAt(): Date | null {
  const raw = localStorage.getItem(KEYS.wkCacheBuiltAt)
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function setWKCacheBuiltAt(): void {
  localStorage.setItem(KEYS.wkCacheBuiltAt, new Date().toISOString())
}

// ── Clear helpers ─────────────────────────────────────────────────────────────

export function clearStories(): void {
  localStorage.removeItem(KEYS.stories)
}

export async function clearWKCache(): Promise<void> {
  await clearWKSubjectsStore()
  localStorage.removeItem(KEYS.wkUser)
  localStorage.removeItem(KEYS.wkCacheBuiltAt)
}

export async function clearAllData(): Promise<void> {
  await clearWKSubjectsStore()
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}

// ── Storage size (localStorage only; IDB reported via getWKCacheCount) ────────

function getKeyBytes(key: string): number {
  const item = localStorage.getItem(key)
  return item ? new Blob([item]).size : 0
}

export function getStorageSizes(): { stories: number; total: number } {
  const stories = getKeyBytes(KEYS.stories)
  const total = Object.values(KEYS).reduce((sum, k) => sum + getKeyBytes(k), 0)
  return { stories, total }
}
