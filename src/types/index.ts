export type AIProvider = 'gemini' | 'anthropic' | 'ollama'

export interface Settings {
  provider: AIProvider
  claudeApiKey: string
  geminiApiKey: string
  geminiModel?: string
  ollamaBaseUrl: string
  ollamaModel: string
  wanikaniApiKey: string
  wanikaniPopupMode?: 'simple' | 'advanced'
  // Legacy boolean (true = underline); migrated to kanjiLevelStyle on read.
  wanikaniLevelColors?: boolean
  kanjiLevelStyle?: 'off' | 'highlight' | 'underline'
  levelDistributionMode?: 'jlpt' | 'wanikani'
  showFurigana?: boolean
  ttsVolume?: number
theme: 'light' | 'dark'
}

export type LevelType = 'wanikani' | 'jlpt'

export interface StoryLevel {
  type: LevelType
  value: number
}

export type StoryType = 'conversation' | 'novel' | 'diary' | 'poem' | 'news'

export interface Segment {
  text: string
  reading?: string
  isInteractive: boolean
}

export interface VocabItem {
  word: string
  reading: string
  meaning: string
}

export interface Story {
  id: string
  createdAt: string
  title: string
  titleReading: string
  level: StoryLevel
  storyType: StoryType
  theme: string
  segments: Segment[]
  vocabulary: VocabItem[]
  englishSummary: string
  illustration?: string
}

export interface WaniKaniSubjectData {
  level: number
  slug: string
  characters?: string
  meanings: Array<{ meaning: string; primary: boolean }>
  auxiliary_meanings?: Array<{ meaning: string; type: string }>
  readings?: Array<{ reading: string; primary: boolean; type?: string }>
  parts_of_speech?: string[]
  component_subject_ids?: number[]
  amalgamation_subject_ids?: number[]
  visually_similar_subject_ids?: number[]
  meaning_mnemonic?: string
  meaning_hint?: string
  reading_mnemonic?: string
  reading_hint?: string
  context_sentences?: Array<{ en: string; ja: string }>
  pronunciation_audios?: Array<{
    url: string
    content_type: string
    metadata: {
      gender: string
      voice_actor_name: string
      voice_description: string
      pronunciation: string
    }
  }>
  object: 'kanji' | 'vocabulary' | 'radical'
}

export interface WaniKaniSubject {
  id: number
  object: string
  data: WaniKaniSubjectData
}

export interface WaniKaniUser {
  username: string
  level: number
}

export type WkWordSets = { vocab: Map<string, number>; kanji: Map<string, number> }

export interface WaniKaniLookupResult {
  subject: WaniKaniSubject | null
  relatedSubjects: Record<number, WaniKaniSubject>
  loading: boolean
  error: string | null
}

export interface GenerateParams {
  theme: string
  storyType: StoryType
  level: StoryLevel
  length: number
  provider: AIProvider
  apiKey: string
  geminiModel?: string
  ollamaBaseUrl: string
  ollamaModel: string
}
