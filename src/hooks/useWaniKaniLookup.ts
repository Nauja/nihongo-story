import { useState, useCallback, useRef } from 'react'
import type { WaniKaniSubject } from '../types'
import { lookupSubject, lookupSubjectsByIds } from '../lib/wanikani'

interface LookupState {
  subject: WaniKaniSubject | null
  relatedSubjects: Record<number, WaniKaniSubject>
  loading: boolean
  error: string | null
  word: string | null
}

export function useWaniKaniLookup(apiKey: string) {
  const [state, setState] = useState<LookupState>({
    subject: null,
    relatedSubjects: {},
    loading: false,
    error: null,
    word: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const lookup = useCallback(
    async (word: string) => {
      if (!apiKey) {
        setState({ subject: null, relatedSubjects: {}, loading: false, error: 'no_key', word })
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({ subject: null, relatedSubjects: {}, loading: true, error: null, word })

      try {
        const subject = await lookupSubject(word, apiKey)
        if (controller.signal.aborted) return

        setState({ subject, relatedSubjects: {}, loading: false, error: null, word })

        if (subject) {
          const relatedIds = [
            ...(subject.data.component_subject_ids ?? []),
            ...(subject.data.visually_similar_subject_ids ?? []),
            ...(subject.data.amalgamation_subject_ids ?? []),
          ]

          if (relatedIds.length > 0) {
            const related = await lookupSubjectsByIds(relatedIds, apiKey)
            if (!controller.signal.aborted) {
              const relatedSubjects: Record<number, WaniKaniSubject> = {}
              for (const s of related) relatedSubjects[s.id] = s
              setState((prev) => ({ ...prev, relatedSubjects }))
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setState({
            subject: null,
            relatedSubjects: {},
            loading: false,
            error: err instanceof Error ? err.message : 'Lookup failed',
            word,
          })
        }
      }
    },
    [apiKey],
  )

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setState({ subject: null, relatedSubjects: {}, loading: false, error: null, word: null })
  }, [])

  return { ...state, lookup, clear }
}
