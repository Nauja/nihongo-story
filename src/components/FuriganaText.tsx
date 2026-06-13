import { useCallback } from 'react'
import type { Segment, WkWordSets } from '../types'
import { bucketOf } from '../lib/wkLevels'

interface Props {
  segments?: Segment[]
  text?: string
  showFurigana?: boolean
  wkWordSets?: WkWordSets | null
  userLevel?: number | null
  onWordClick?: (text: string) => void
  selectedWord?: string
  selectedBucket?: number | null
}

const DIM_OPACITY = 0.3

function getWKColor(itemLevel: number, userLevel: number | null | undefined, fallback: string): string {
  if (userLevel == null) return fallback
  if (itemLevel < userLevel) return 'rgba(34, 197, 94, 0.65)'
  if (itemLevel === userLevel) return 'rgba(234, 179, 8, 0.65)'
  return 'rgba(239, 68, 68, 0.65)'
}

export default function FuriganaText({ segments, text, showFurigana = false, wkWordSets, userLevel, onWordClick, selectedWord, selectedBucket }: Props) {
  const resolvedSegments: Segment[] = segments ?? [...(text ?? '')].map(char => ({ text: char, isInteractive: true }))

  const handleClick = useCallback(
    (e: React.MouseEvent, text: string) => {
      e.stopPropagation()
      onWordClick?.(text)
    },
    [onWordClick],
  )

  // When a level bucket is selected, dim every character that is not a known
  // kanji belonging to that bucket.
  const isDimmed = (char: string) => {
    if (selectedBucket == null) return false
    const level = wkWordSets?.kanji.get(char)
    return level === undefined || bucketOf(level) !== selectedBucket
  }
  const dimStyle = (char: string) => (isDimmed(char) ? { opacity: DIM_OPACITY } : undefined)

  // Render a segment's characters. When `perKanji` is true, each known kanji
  // becomes its own click target; otherwise characters are only colored.
  const renderChars = (seg: Segment, perKanji: boolean) =>
    [...seg.text].map((char, j) => {
      const level = wkWordSets?.kanji.get(char)
      const isKnownKanji = level !== undefined
      const underline =
        isKnownKanji && userLevel != null
          ? {
              textDecoration: 'underline',
              textDecorationColor: getWKColor(level, userLevel, 'rgba(232, 0, 170, 0.45)'),
              textUnderlineOffset: '4px',
            }
          : undefined
      const dim = dimStyle(char)
      if (perKanji && isKnownKanji) {
        const isSelected = char === selectedWord
        return (
          <span
            key={j}
            style={{
              ...underline,
              ...dim,
              cursor: 'pointer',
              background: isSelected ? 'var(--bs-warning-bg-subtle)' : undefined,
              borderRadius: isSelected ? 2 : undefined,
            }}
            onClick={(e) => handleClick(e, char)}
          >
            {char}
          </span>
        )
      }
      if (underline || dim) return <span key={j} style={{ ...underline, ...dim }}>{char}</span>
      return char
    })

  return (
    <span className="font-japanese" style={{ lineHeight: 'inherit' }}>
      {resolvedSegments.map((seg, i) => {
        if (seg.isInteractive) {
          const hasVocab = wkWordSets?.vocab.has(seg.text) ?? false
          const anyKnownKanji = [...seg.text].some(c => wkWordSets?.kanji.has(c) ?? false)
          // Whole-segment click only for known vocabulary; otherwise per-kanji.
          const wholeClickable = hasVocab
          const perKanji = !hasVocab && anyKnownKanji
          const isSelected = wholeClickable && seg.text === selectedWord

          const wrapperStyle = {
            cursor: wholeClickable ? ('pointer' as const) : ('default' as const),
            background: isSelected ? 'var(--bs-warning-bg-subtle)' : undefined,
            borderRadius: isSelected ? 2 : undefined,
          }
          const wrapperOnClick = wholeClickable ? (e: React.MouseEvent) => handleClick(e, seg.text) : undefined

          if (seg.reading) {
            const segMatches = [...seg.text].some((c) => !isDimmed(c))
            const rtOpacity = showFurigana ? (segMatches ? 1 : DIM_OPACITY) : 0
            return (
              <ruby key={i} style={wrapperStyle} onClick={wrapperOnClick}>
                {renderChars(seg, perKanji)}
                <rt
                  style={{ fontSize: '0.55em', opacity: rtOpacity, userSelect: showFurigana ? 'auto' : 'none' }}
                >
                  {seg.reading}
                </rt>
              </ruby>
            )
          }

          return (
            <span key={i} style={wrapperStyle} onClick={wrapperOnClick}>
              {renderChars(seg, perKanji)}
            </span>
          )
        }

        return (
          <span key={i} style={selectedBucket != null ? { opacity: DIM_OPACITY } : undefined}>
            {seg.text}
          </span>
        )
      })}
    </span>
  )
}
