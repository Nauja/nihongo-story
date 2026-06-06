import { useCallback } from 'react'
import type { Segment, WkWordSets } from '../types'

interface Props {
  segments?: Segment[]
  text?: string
  showFurigana?: boolean
  wkWordSets?: WkWordSets | null
  userLevel?: number | null
  onWordClick?: (text: string) => void
  selectedWord?: string
}

function getWKColor(itemLevel: number, userLevel: number | null | undefined, fallback: string): string {
  if (userLevel == null) return fallback
  if (itemLevel < userLevel) return 'rgba(34, 197, 94, 0.65)'
  if (itemLevel === userLevel) return 'rgba(234, 179, 8, 0.65)'
  return 'rgba(239, 68, 68, 0.65)'
}

export default function FuriganaText({ segments, text, showFurigana = false, wkWordSets, userLevel, onWordClick, selectedWord }: Props) {
  const resolvedSegments: Segment[] = segments ?? [...(text ?? '')].map(char => ({ text: char, isInteractive: true }))

  const handleClick = useCallback(
    (e: React.MouseEvent, text: string) => {
      e.stopPropagation()
      onWordClick?.(text)
    },
    [onWordClick],
  )

  return (
    <span className="font-japanese" style={{ lineHeight: 'inherit' }}>
      {resolvedSegments.map((seg, i) => {
        if (seg.isInteractive && seg.reading) {
          const hasVocab = wkWordSets != null && wkWordSets.vocab.has(seg.text)

          const hasKanji = wkWordSets != null && [...seg.text].some(c => wkWordSets!.kanji.has(c))
          const active = hasVocab || hasKanji
          const isSelected = seg.text === selectedWord
          return (
            <ruby
              key={i}
              style={{
                cursor: active ? 'pointer' : 'default',
                background: isSelected ? 'var(--bs-warning-bg-subtle)' : undefined,
                borderRadius: isSelected ? 2 : undefined,
              }}
              onClick={active ? (e) => handleClick(e, seg.text) : undefined}
            >
              {[...seg.text].map((char, j) => {
                const level = wkWordSets?.kanji.get(char)
                if (level === undefined || userLevel == null) return char
                const color = getWKColor(level, userLevel, 'rgba(232, 0, 170, 0.45)')
                return <span key={j} style={{ textDecoration: 'underline', textDecorationColor: color, textUnderlineOffset: '4px' }}>{char}</span>
              })}
              <rt
                style={{ fontSize: '0.55em', opacity: showFurigana ? 1 : 0, userSelect: showFurigana ? 'auto' : 'none' }}
              >
                {seg.reading}
              </rt>
            </ruby>
          )
        }

        if (seg.isInteractive) {
          const hasVocab = wkWordSets != null && wkWordSets.vocab.has(seg.text)

          const hasKanji = wkWordSets != null && [...seg.text].some(c => wkWordSets!.kanji.has(c))
          const active = hasVocab || hasKanji
          const isSelected = seg.text === selectedWord
          return (
            <span
              key={i}
              style={{
                cursor: active ? 'pointer' : 'default',
                background: isSelected ? 'var(--bs-warning-bg-subtle)' : undefined,
                borderRadius: isSelected ? 2 : undefined,
              }}
              onClick={active ? (e) => handleClick(e, seg.text) : undefined}
            >
              {[...seg.text].map((char, j) => {
                const level = wkWordSets?.kanji.get(char)
                if (level === undefined || userLevel == null) return char
                const color = getWKColor(level, userLevel, 'rgba(232, 0, 170, 0.45)')
                return <span key={j} style={{ textDecoration: 'underline', textDecorationColor: color, textUnderlineOffset: '4px' }}>{char}</span>
              })}
            </span>
          )
        }

        return <span key={i}>{seg.text}</span>
      })}
    </span>
  )
}
