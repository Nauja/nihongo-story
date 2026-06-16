import type { Settings, Story, WaniKaniUser } from '../types'

const KEYS = {
  settings: 'jap_settings',
  stories: 'jap_stories',
  wkUser: 'jap_wk_user',
  wkCacheBuiltAt: 'jap_wk_cache_built_at',
  jlptCacheBuiltAt: 'jap_jlpt_cache_built_at',
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

// ── IndexedDB — JLPT kanji cache (character → JLPT level) ─────────────────────

const JLPT_DB_NAME = 'jap_jlpt_db'
const JLPT_STORE = 'kanji'
let jlptDbPromise: Promise<IDBDatabase> | null = null

function openJLPTDB(): Promise<IDBDatabase> {
  if (!jlptDbPromise) {
    jlptDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(JLPT_DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(JLPT_STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return jlptDbPromise
}

export async function getJLPTCacheEntries(keys: string[]): Promise<unknown[]> {
  if (keys.length === 0) return []
  const db = await openJLPTDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JLPT_STORE, 'readonly')
    const store = tx.objectStore(JLPT_STORE)
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

export async function setJLPTCacheEntries(entries: [string, unknown][]): Promise<void> {
  if (entries.length === 0) return
  const db = await openJLPTDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JLPT_STORE, 'readwrite')
    const store = tx.objectStore(JLPT_STORE)
    for (const [key, value] of entries) store.put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearJLPTStore(): Promise<void> {
  const db = await openJLPTDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JLPT_STORE, 'readwrite')
    tx.objectStore(JLPT_STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getJLPTCacheCount(): Promise<number> {
  const db = await openJLPTDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(JLPT_STORE, 'readonly').objectStore(JLPT_STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getJLPTCacheSize(): Promise<number> {
  const db = await openJLPTDB()
  const values = await new Promise<unknown[]>((resolve, reject) => {
    const req = db.transaction(JLPT_STORE, 'readonly').objectStore(JLPT_STORE).getAll()
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
    kanjiLevelStyle: 'underline',
    showFurigana: true,
theme: 'light',
  })
}

export function saveSettings(settings: Settings): void {
  set(KEYS.settings, settings)
}

// Resolves how kanji are marked by level, migrating the legacy
// `wanikaniLevelColors` boolean (false → off, otherwise → underline).
export function getKanjiLevelStyle(): 'off' | 'highlight' | 'underline' {
  const s = getSettings()
  return s.kanjiLevelStyle ?? (s.wanikaniLevelColors === false ? 'off' : 'underline')
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

export function getJLPTCacheBuiltAt(): Date | null {
  const raw = localStorage.getItem(KEYS.jlptCacheBuiltAt)
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function setJLPTCacheBuiltAt(): void {
  localStorage.setItem(KEYS.jlptCacheBuiltAt, new Date().toISOString())
}

// ── Export / Import ───────────────────────────────────────────────────────────

export function exportStories(): void {
  const stories = getStories()
  const payload = JSON.stringify({ version: 1, stories }, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nihongo-stories-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportStory(story: Story): void {
  const payload = JSON.stringify({ version: 1, stories: [story] }, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const slug = story.title.replace(/[^\w぀-鿿]+/g, '-').replace(/^-|-$/g, '')
  a.download = `nihongo-story-${slug}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importStories(file: File): Promise<{ imported: number; skipped: number }> {
  const text = await file.text()
  const data = JSON.parse(text)
  const incoming: Story[] = Array.isArray(data) ? data : data?.stories
  if (!Array.isArray(incoming)) throw new Error('Invalid format')
  const existing = getStories()
  const existingIds = new Set(existing.map((s) => s.id))
  const toAdd = incoming.filter((s) => !existingIds.has(s.id))
  set(KEYS.stories, [...toAdd, ...existing])
  return { imported: toAdd.length, skipped: incoming.length - toAdd.length }
}

// ── Config Export / Import ────────────────────────────────────────────────────

const _CFG_KEY  = 'nihongo-story-config-v1'
const _CFG_SALT = 'nihongo-story-salt-v1'

async function _deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const material = await crypto.subtle.importKey('raw', enc.encode(_CFG_KEY), { name: 'PBKDF2' }, false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(_CFG_SALT), iterations: 100_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function _encrypt(value: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(value))
  const buf = new Uint8Array(12 + cipher.byteLength)
  buf.set(iv)
  buf.set(new Uint8Array(cipher), 12)
  return btoa(String.fromCharCode(...buf))
}

async function _decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const buf = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12))
  return new TextDecoder().decode(plain)
}

export async function exportConfig(): Promise<void> {
  const s = getSettings()
  const key = await _deriveKey()
  const out: Record<string, unknown> = {
    version: 1,
    provider: s.provider,
    geminiModel: s.geminiModel,
    ollamaBaseUrl: s.ollamaBaseUrl,
    ollamaModel: s.ollamaModel,
    wanikaniPopupMode: s.wanikaniPopupMode,
    wanikaniLevelColors: s.wanikaniLevelColors,
    kanjiLevelStyle: s.kanjiLevelStyle,
    showFurigana: s.showFurigana,
    ttsVolume: s.ttsVolume,
    theme: s.theme,
  }
  if (s.claudeApiKey)   out.claudeApiKey   = await _encrypt(s.claudeApiKey, key)
  if (s.geminiApiKey)   out.geminiApiKey   = await _encrypt(s.geminiApiKey, key)
  if (s.wanikaniApiKey) out.wanikaniApiKey = await _encrypt(s.wanikaniApiKey, key)

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nihongo-config-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importConfig(file: File): Promise<void> {
  const data = JSON.parse(await file.text())
  if (data?.version !== 1 || !data.theme) throw new Error('Invalid config file')

  const key = await _deriveKey()
  const s = getSettings()

  if (data.provider)                          s.provider           = data.provider
  if (data.theme)                             s.theme              = data.theme
  if (data.geminiModel)                       s.geminiModel        = data.geminiModel
  if (data.ollamaBaseUrl)                     s.ollamaBaseUrl      = data.ollamaBaseUrl
  if (data.ollamaModel)                       s.ollamaModel        = data.ollamaModel
  if (data.wanikaniPopupMode)                 s.wanikaniPopupMode  = data.wanikaniPopupMode
  if (data.wanikaniLevelColors !== undefined) s.wanikaniLevelColors = data.wanikaniLevelColors
  if (data.kanjiLevelStyle !== undefined)     s.kanjiLevelStyle    = data.kanjiLevelStyle
  if (data.showFurigana !== undefined)        s.showFurigana       = data.showFurigana
  if (data.ttsVolume !== undefined)           s.ttsVolume          = data.ttsVolume

  if (data.claudeApiKey)   s.claudeApiKey   = await _decrypt(data.claudeApiKey, key)
  if (data.geminiApiKey)   s.geminiApiKey   = await _decrypt(data.geminiApiKey, key)
  if (data.wanikaniApiKey) s.wanikaniApiKey = await _decrypt(data.wanikaniApiKey, key)

  saveSettings(s)
  document.documentElement.setAttribute('data-bs-theme', s.theme)
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

export async function clearJLPTCache(): Promise<void> {
  await clearJLPTStore()
  localStorage.removeItem(KEYS.jlptCacheBuiltAt)
}

export async function clearAllData(): Promise<void> {
  await clearWKSubjectsStore()
  await clearJLPTStore()
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
