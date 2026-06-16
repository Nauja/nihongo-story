import { useCallback } from 'react'
import type { Segment, WkWordSets } from '../types'
import { bucketOfMode, levelColor, levelHighlight, isCJK, UNAVAILABLE_BUCKET, type LevelMode, type KanjiLevelStyle } from '../lib/wkLevels'

interface Props {
  segments?: Segment[]
  text?: string
  showFurigana?: boolean
  wkWordSets?: WkWordSets | null
  levelStyle?: KanjiLevelStyle
  onWordClick?: (text: string) => void
  selectedWord?: string
  selectedBucket?: number | null
  levelMode?: LevelMode
  dimLevels?: Map<string, number> | null
}

const DIM_OPACITY = 0.3

export default function FuriganaText({ segments, text, showFurigana = false, wkWordSets, levelStyle = 'off', onWordClick, selectedWord, selectedBucket, levelMode = 'wanikani', dimLevels }: Props) {
  const resolvedSegments: Segment[] = segments ?? [...(text ?? '')].map(char => ({ text: char, isInteractive: true }))

  const handleClick = useCallback(
    (e: React.MouseEvent, text: string) => {
      e.stopPropagation()
      onWordClick?.(text)
    },
    [onWordClick],
  )

  // When a level bucket is selected, dim every character that is not a known
  // kanji belonging to that bucket (in the active level scheme).
  const bucketOfLevel = bucketOfMode(levelMode)
  const isDimmed = (char: string) => {
    if (selectedBucket == null) return false
    if (!isCJK(char)) return true // non-kanji always dim while a bucket is active
    const level = dimLevels?.get(char)
    const bucket = level === undefined ? UNAVAILABLE_BUCKET : bucketOfLevel(level)
    return bucket !== selectedBucket
  }
  const dimStyle = (char: string) => (isDimmed(char) ? { opacity: DIM_OPACITY } : undefined)

  // Render a segment's characters. When `perKanji` is true, each known kanji
  // becomes its own click target; otherwise characters are only colored.
  const renderChars = (seg: Segment, perKanji: boolean) =>
    [...seg.text].map((char, j) => {
      const isKnownKanji = wkWordSets?.kanji.has(char) ?? false
      const activeLevel = dimLevels?.get(char)
      const levelStyleObj =
        levelStyle !== 'off' && activeLevel !== undefined
          ? levelStyle === 'underline'
            ? {
                textDecoration: 'underline',
                textDecorationColor: levelColor(levelMode, activeLevel),
                textUnderlineOffset: '4px',
              }
            : {
                background: levelHighlight(levelMode, activeLevel),
                borderRadius: 2,
              }
          : undefined
      const dim = dimStyle(char)
      if (perKanji && isKnownKanji) {
        const isSelected = char === selectedWord
        return (
          <span
            key={j}
            style={{
              ...levelStyleObj,
              ...dim,
              cursor: 'pointer',
              // Selection background wins over a level highlight.
              ...(isSelected ? { background: 'var(--bs-warning-bg-subtle)', borderRadius: 2 } : undefined),
            }}
            onClick={(e) => handleClick(e, char)}
          >
            {char}
          </span>
        )
      }
      if (levelStyleObj || dim) return <span key={j} style={{ ...levelStyleObj, ...dim }}>{char}</span>
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
