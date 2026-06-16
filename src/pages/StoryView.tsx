import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button, Row, Col } from "react-bootstrap";
import {
  getStories,
  getSettings,
  saveSettings,
  getWKCacheBuiltAt,
  getKanjiLevelStyle,
  exportStory,
} from "../lib/storage";
import type { WkWordSets } from "../types";
import { lookupSubjectsBatch, lookupCachedSubjectsBatch } from "../lib/wanikani";
import { getJLPTKanjiLevels } from "../lib/jlpt";
import { effectiveLevelMode, type LevelMode, type KanjiLevelStyle } from "../lib/wkLevels";
import { useWaniKaniLookup } from "../hooks/useWaniKaniLookup";
import React from "react";

import FuriganaText from "../components/FuriganaText";
import WaniKaniPopup from "../components/WaniKaniPopup";
import WkLevelBar from "../components/WkLevelBar";

const TYPE_ICONS: Record<string, string> = {
  conversation: "💬",
  novel: "📖",
  diary: "📝",
  poem: "🌸",
  news: "📰",
};

function splitIntoLines(
  segments: ReturnType<typeof getStories>[number]["segments"],
) {
  const lines: (typeof segments)[] = [];
  let current: typeof segments = [];

  for (const seg of segments) {
    current.push(seg);
    if (
      seg.text === "。" ||
      seg.text === "？" ||
      seg.text === "！" ||
      seg.text === "\n"
    ) {
      lines.push(current);
      current = [];
    }
  }
  if (current.length > 0) lines.push(current);

  return lines;
}

function getLineTexts(lines: ReturnType<typeof splitIntoLines>) {
  return lines.map((line) => line.map((seg) => seg.text).join(""));
}

export default function StoryView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showFurigana, setShowFurigana] = useState(
    () => getSettings().showFurigana ?? true,
  );
  const { wanikaniApiKey } = getSettings();
  const [levelStyle, setLevelStyle] = useState<KanjiLevelStyle>(
    () => getKanjiLevelStyle(),
  );
  const [defaultPopupMode, setDefaultPopupMode] = useState<
    "simple" | "advanced"
  >(() => getSettings().wanikaniPopupMode ?? "advanced");
  const [popupMode, setPopupMode] = useState<"simple" | "advanced">(
    () => getSettings().wanikaniPopupMode ?? "advanced",
  );
  const [activePanel, setActivePanel] = useState<{
    lineIndex: number;
    word: string;
  } | null>(null);
  const activePanelRef = useRef<{ lineIndex: number; word: string } | null>(
    null,
  );
  activePanelRef.current = activePanel;
  const [activeVocabWord, setActiveVocabWord] = useState<string | null>(null);
  const activeVocabWordRef = useRef<string | null>(null);
  activeVocabWordRef.current = activeVocabWord;
  const [activeVocabItem, setActiveVocabItem] = useState<string | null>(null);
  const activeVocabItemRef = useRef<string | null>(null);
  activeVocabItemRef.current = activeVocabItem;
  const [searchInput, setSearchInput] = useState("");
  const [searchWord, setSearchWord] = useState<string | null>(null);
  const playGenRef = useRef(0);
  const { subject, relatedSubjects, loading, error, lookup, clear } =
    useWaniKaniLookup(wanikaniApiKey);

  const [audioState, setAudioState] = useState<"idle" | "playing" | "paused">(
    "idle",
  );
  const [currentLine, setCurrentLine] = useState(-1);
  const [volume, setVolume] = useState(() => getSettings().ttsVolume ?? 1);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const currentLineRef = useRef(-1);
  currentLineRef.current = currentLine;
  const [wkWordSets, setWkWordSets] = useState<WkWordSets | null>(null);
  const [jlptLevels, setJlptLevels] = useState<Map<string, number> | null>(
    null,
  );
  const [levelMode, setLevelMode] = useState<LevelMode>(() =>
    effectiveLevelMode(
      getSettings().levelDistributionMode,
      !!getSettings().wanikaniApiKey || getWKCacheBuiltAt() != null,
    ),
  );
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [japaneseVoice, setJapaneseVoice] =
    useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setShowFurigana((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    saveSettings({ ...getSettings(), showFurigana });
  }, [showFurigana]);

  useEffect(() => {
    const sync = () => {
      const s = getSettings();
      setShowFurigana(s.showFurigana ?? true);
      setLevelStyle(getKanjiLevelStyle());
      setDefaultPopupMode(s.wanikaniPopupMode ?? "advanced");
      setLevelMode(
        effectiveLevelMode(
          s.levelDistributionMode,
          !!s.wanikaniApiKey || getWKCacheBuiltAt() != null,
        ),
      );
    };
    window.addEventListener("nihongo-settings-changed", sync);
    return () => window.removeEventListener("nihongo-settings-changed", sync);
  }, []);

  // Reset the selected level bucket when the scheme changes — WaniKani and JLPT
  // use different bucket indices.
  useEffect(() => {
    setSelectedBucket(null);
  }, [levelMode]);

  // Load JLPT levels for this story's kanji. getJLPTKanjiLevels builds the cache
  // from the bundled txt files on first use, so this is always available.
  useEffect(() => {
    const story = getStories().find((s) => s.id === id);
    if (!story) return;
    const isCJK = (c: string) => {
      const cp = c.codePointAt(0)!;
      return cp >= 0x4e00 && cp <= 0x9fff;
    };
    const chars = [
      ...new Set(story.segments.flatMap((s) => [...s.text].filter(isCJK))),
    ];
    if (chars.length === 0) {
      setJlptLevels(new Map());
      return;
    }
    getJLPTKanjiLevels(chars)
      .then(setJlptLevels)
      .catch(() => setJlptLevels(new Map()));
  }, [id]);

  useEffect(() => {
    saveSettings({ ...getSettings(), wanikaniPopupMode: popupMode });
  }, [popupMode]);

  useEffect(() => {
    saveSettings({ ...getSettings(), ttsVolume: volume });
  }, [volume]);

  useEffect(() => {
    const load = () => {
      const v =
        speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja")) ??
        null;
      setJapaneseVoice(v);
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(
    () => () => {
      speechSynthesis.cancel();
    },
    [],
  );

  const handleWordClick = useCallback(
    (lineIndex: number, word: string) => {
      if (activePanel?.lineIndex === lineIndex && activePanel?.word === word) {
        setActivePanel(null);
        clear();
      } else {
        setActiveVocabWord(null);
        setActiveVocabItem(null);
        setSearchWord(null);
        setActivePanel({ lineIndex, word });
        setPopupMode(defaultPopupMode ?? "advanced");
        lookup(word);
      }
    },
    [activePanel, lookup, clear, defaultPopupMode],
  );

  const handleVocabClick = useCallback(
    (itemWord: string, clicked: string) => {
      if (
        activeVocabItemRef.current === itemWord &&
        activeVocabWordRef.current === clicked
      ) {
        setActiveVocabItem(null);
        setActiveVocabWord(null);
        clear();
      } else {
        setActiveVocabItem(itemWord);
        setActiveVocabWord(clicked);
        setActivePanel(null);
        setSearchWord(null);
        setPopupMode(defaultPopupMode ?? "advanced");
        lookup(clicked);
      }
    },
    [lookup, clear, defaultPopupMode],
  );

  const handleSearch = useCallback(() => {
    const word = searchInput.trim();
    if (!word) return;
    setActivePanel(null);
    setActiveVocabWord(null);
    setActiveVocabItem(null);
    setSearchWord(word);
    setPopupMode(defaultPopupMode ?? "advanced");
    lookup(word);
  }, [searchInput, lookup, defaultPopupMode]);

  useEffect(() => {
    // WaniKani levels are "knowable" from a live API key or a built cache.
    if (!wanikaniApiKey && getWKCacheBuiltAt() == null) return;
    const story = getStories().find((s) => s.id === id);
    if (!story) return;
    const segWords = [
      ...new Set(
        story.segments.filter((s) => s.isInteractive).map((s) => s.text),
      ),
    ];
    const isCJK = (c: string) => {
      const cp = c.codePointAt(0)!;
      return cp >= 0x4e00 && cp <= 0x9fff;
    };
    const kanjiCharsFromSegs = [
      ...new Set(segWords.flatMap((w) => [...w].filter(isCJK))),
    ];
    const allWords = [...new Set([...segWords, ...kanjiCharsFromSegs])];
    if (allWords.length === 0) return;
    const source = wanikaniApiKey
      ? lookupSubjectsBatch(allWords, wanikaniApiKey)
      : lookupCachedSubjectsBatch(allWords);
    source
      .then((results) => {
        const vocab = new Map<string, number>();
        const kanji = new Map<string, number>();
        for (const [word, subject] of Object.entries(results)) {
          if (subject === null) continue;
          if (subject.object === "vocabulary")
            vocab.set(word, subject.data.level);
          else if (subject.object === "kanji")
            kanji.set(word, subject.data.level);
        }
        setWkWordSets({ vocab, kanji });
      })
      .catch(() => setWkWordSets({ vocab: new Map(), kanji: new Map() }));
  }, [wanikaniApiKey, id]);

  const story = getStories().find((s) => s.id === id);

  if (!story) {
    return (
      <div className="text-center py-5">
        <p className="text-secondary mb-3">Story not found.</p>
        <Link to="/" className="text-primary">
          ← Back to library
        </Link>
      </div>
    );
  }

  const lines = splitIntoLines(story.segments);
  const lineTexts = getLineTexts(lines);

  // Kanji → level map for the active distribution scheme; drives both the level
  // bar and the bucket-dimming.
  const activeKanjiLevels =
    levelMode === "jlpt" ? jlptLevels : wkWordSets?.kanji ?? null;

  function playFromLine(start: number) {
    const gen = ++playGenRef.current;
    speechSynthesis.cancel();
    setAudioState("playing");
    const speak = (i: number) => {
      if (playGenRef.current !== gen) return;
      if (i >= lineTexts.length) {
        setAudioState("idle");
        setCurrentLine(-1);
        return;
      }
      const utt = new SpeechSynthesisUtterance(lineTexts[i]);
      utt.lang = "ja-JP";
      if (japaneseVoice) utt.voice = japaneseVoice;
      utt.rate = 0.9;
      utt.volume = volumeRef.current;
      utt.onstart = () => {
        if (playGenRef.current === gen) setCurrentLine(i);
      };
      utt.onend = () => speak(i + 1);
      utt.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return;
        if (playGenRef.current !== gen) return;
        setAudioState("idle");
        setCurrentLine(-1);
      };
      speechSynthesis.speak(utt);
    };
    speak(start);
  }

  function handlePlay() {
    if (audioState === "paused") {
      speechSynthesis.resume();
      setAudioState("playing");
    } else playFromLine(0);
  }

  function handlePause() {
    speechSynthesis.pause();
    setAudioState("paused");
  }
  function handleStop() {
    ++playGenRef.current;
    speechSynthesis.cancel();
    setAudioState("idle");
    setCurrentLine(-1);
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate(-1)}
          className="p-2 flex-shrink-0"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Button>
        <div className="flex-grow-1 overflow-hidden">
          <h1 className="fs-5 fw-bold font-japanese text-truncate mb-0">
            {story.title}
          </h1>
          {story.titleReading && (
            <small className="text-secondary font-japanese">
              {story.titleReading}
            </small>
          )}
        </div>
        <span style={{ fontSize: "1.5rem" }} className="flex-shrink-0">
          {TYPE_ICONS[story.storyType] ?? "📄"}
        </span>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => exportStory(story)}
          className="p-2 flex-shrink-0"
          title="Export story"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3"
            />
          </svg>
        </Button>
      </div>

      {/* Controls */}
      <div
        className="mb-4 p-3 rounded-3"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          {japaneseVoice === null && speechSynthesis.getVoices().length > 0 ? (
            <small className="text-secondary">
              No Japanese voice available
            </small>
          ) : (
            <>
              <div className="d-flex align-items-center gap-2">
                <small className="text-secondary me-1">Text to Speech</small>
                <button
                  onClick={audioState === "playing" ? handlePause : handlePlay}
                  className="btn btn-sm btn-outline-secondary p-1"
                  style={{ lineHeight: 1, width: 30, height: 30 }}
                  title={audioState === "playing" ? "Pause" : "Play"}
                >
                  {audioState === "playing" ? (
                    <svg
                      width="14"
                      height="14"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                    </svg>
                  )}
                </button>
                {audioState !== "idle" && (
                  <button
                    onClick={handleStop}
                    className="btn btn-sm btn-outline-secondary p-1"
                    style={{ lineHeight: 1, width: 30, height: 30 }}
                    title="Stop"
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z" />
                    </svg>
                  </button>
                )}
                <div className="d-flex align-items-center gap-1 ms-2">
                  <svg
                    width="14"
                    height="14"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    className="text-secondary"
                  >
                    {volume === 0 ? (
                      <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 1.597a.5.5 0 0 1 0 .707L12.207 7.5l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.207l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 7.5 9.146 5.854a.5.5 0 0 1 .708-.708L11.5 6.793l1.646-1.647a.5.5 0 0 1 .708 0z" />
                    ) : volume < 0.5 ? (
                      <path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12V4zm3.025 4a4.486 4.486 0 0 1-1.318 3.182L9.99 9.96a3.486 3.486 0 0 0 0-3.92l.717-.222A4.486 4.486 0 0 1 12.025 8z" />
                    ) : (
                      <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707zM10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.611 3.89l.707.706zM8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z" />
                    )}
                  </svg>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      volumeRef.current = v;
                      if (audioState === "playing") {
                        playFromLine(
                          currentLineRef.current >= 0
                            ? currentLineRef.current
                            : 0,
                        );
                      }
                    }}
                    style={{
                      width: 70,
                      accentColor: "var(--bs-primary)",
                      cursor: "pointer",
                    }}
                    title={`Volume: ${Math.round(volume * 100)}%`}
                  />
                </div>
              </div>
              <div
                className="mt-2"
                style={{
                  cursor: "pointer",
                  height: 6,
                  borderRadius: 3,
                  background: "var(--border-subtle)",
                  position: "relative",
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const targetLine = Math.max(
                    0,
                    Math.min(
                      lineTexts.length - 1,
                      Math.floor(ratio * lineTexts.length),
                    ),
                  );
                  playFromLine(targetLine);
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background: "var(--bs-primary)",
                    width: `${currentLine >= 0 ? ((currentLine + 1) / lineTexts.length) * 100 : 0}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lookup search */}
      <div className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div className="position-relative">
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              className="text-secondary position-absolute"
              style={{
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"
              />
            </svg>
            <input
              type="search"
              className="form-control"
              placeholder="lookup a kanji or word"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value === "") {
                  setSearchWord(null);
                  clear();
                }
              }}
              style={{
                paddingLeft: 38,
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          </div>
        </form>
        {searchWord && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <WaniKaniPopup
              word={searchWord}
              subject={subject}
              relatedSubjects={relatedSubjects}
              loading={loading}
              error={error}
              noKey={!wanikaniApiKey}
              simpleMode={popupMode === "simple"}
              onToggleMode={() =>
                setPopupMode((prev) =>
                  prev === "simple" ? "advanced" : "simple",
                )
              }
              onLookup={(w) => {
                setSearchWord(w);
                lookup(w);
              }}
              onClose={() => {
                setSearchWord(null);
                clear();
              }}
            />
          </div>
        )}
      </div>

      {/* Illustration */}
      {story.illustration && (
        <img
          src={story.illustration}
          alt="Story illustration"
          className="rounded-4 mb-4 w-100"
          style={{
            maxHeight: 320,
            objectFit: "cover",
            border: "1px solid var(--border-subtle)",
          }}
        />
      )}

      {/* Story text */}
      <article
        className="rounded-4 p-4 mb-4"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-subtle)",
        }}
        onClick={() => {
          setActivePanel(null);
          setActiveVocabWord(null);
          setActiveVocabItem(null);
          setSearchWord(null);
          clear();
        }}
      >
        <div
          className="font-japanese"
          style={{ fontSize: "1.15rem", lineHeight: 2.8 }}
        >
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              <span
                style={
                  i === currentLine
                    ? {
                        background: "var(--bs-warning-bg-subtle)",
                        borderRadius: 4,
                        padding: "0 2px",
                      }
                    : undefined
                }
              >
                <FuriganaText
                  segments={line}
                  showFurigana={showFurigana}
                  wkWordSets={wkWordSets}
                  levelStyle={levelStyle}
                  selectedBucket={selectedBucket}
                  levelMode={levelMode}
                  dimLevels={activeKanjiLevels}
                  onWordClick={(word) => handleWordClick(i, word)}
                  selectedWord={
                    activePanel?.lineIndex === i ? activePanel.word : undefined
                  }
                />
              </span>
              {i < lines.length - 1 && <br />}
              {activePanel?.lineIndex === i && (
                <div
                  style={{ display: "block" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <WaniKaniPopup
                    word={activePanel.word}
                    subject={subject}
                    relatedSubjects={relatedSubjects}
                    loading={loading}
                    error={error}
                    noKey={!wanikaniApiKey}
                    simpleMode={popupMode === "simple"}
                    onToggleMode={() =>
                      setPopupMode((prev) =>
                        prev === "simple" ? "advanced" : "simple",
                      )
                    }
                    onLookup={(w) => {
                      setActivePanel((p) => (p ? { ...p, word: w } : p));
                      lookup(w);
                    }}
                    onClose={() => {
                      setActivePanel(null);
                      clear();
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </article>

      {/* Kanji level distribution */}
      <WkLevelBar
        story={story}
        kanjiLevels={activeKanjiLevels}
        mode={levelMode}
        className="mb-4"
        selectedBucket={selectedBucket}
        onSelectBucket={(i) =>
          setSelectedBucket((prev) => (prev === i ? null : i))
        }
      />

      {/* English summary */}
      {story.englishSummary && (
        <div
          className="rounded-3 p-3 mb-4"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p
            className="small text-secondary text-uppercase fw-medium mb-1"
            style={{ letterSpacing: "0.05em" }}
          >
            Summary
          </p>
          <p className="text-body small mb-0" style={{ lineHeight: 1.6 }}>
            {story.englishSummary}
          </p>
        </div>
      )}

      {/* Vocabulary */}
      {story.vocabulary.length > 0 && (
        <div>
          <h2 className="fs-6 fw-bold font-japanese mb-3 text-secondary">
            語彙リスト{" "}
            <span className="fw-normal text-secondary">Vocabulary</span>
          </h2>
          <Row xs={1} sm={2} className="g-2">
            {story.vocabulary.map((item, i) => (
              <Col key={i}>
                <div
                  className="d-flex align-items-center gap-3 p-3 rounded-3"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="d-flex align-items-baseline gap-2">
                      <span className="fw-bold">
                        <FuriganaText
                          segments={[
                            {
                              text: item.word,
                              reading: item.reading,
                              isInteractive: true,
                            },
                          ]}
                          wkWordSets={wkWordSets}
                          levelStyle={levelStyle}
                          selectedBucket={selectedBucket}
                          levelMode={levelMode}
                          dimLevels={activeKanjiLevels}
                          selectedWord={
                            activeVocabItem === item.word
                              ? (activeVocabWord ?? undefined)
                              : undefined
                          }
                          onWordClick={(w) => handleVocabClick(item.word, w)}
                        />
                      </span>
                      <small
                        className="font-japanese"
                        style={{ color: "var(--furigana-color-surface)" }}
                      >
                        {item.reading}
                      </small>
                    </div>
                    <p className="small text-secondary text-truncate mb-0">
                      {item.meaning}
                    </p>
                  </div>
                </div>
                {activeVocabItem === item.word && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <WaniKaniPopup
                      word={activeVocabWord ?? item.word}
                      subject={subject}
                      relatedSubjects={relatedSubjects}
                      loading={loading}
                      error={error}
                      noKey={!wanikaniApiKey}
                      simpleMode={popupMode === "simple"}
                      onToggleMode={() =>
                        setPopupMode((prev) =>
                          prev === "simple" ? "advanced" : "simple",
                        )
                      }
                      onLookup={(w) => {
                        setActiveVocabWord(w);
                        lookup(w);
                      }}
                      onClose={() => {
                        setActiveVocabItem(null);
                        setActiveVocabWord(null);
                        clear();
                      }}
                    />
                  </div>
                )}
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Meta */}
      <div
        className="mt-4 pt-3 d-flex align-items-center gap-3 small text-secondary"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <span>
          {story.level.type === "jlpt"
            ? `JLPT N${story.level.value}`
            : `WaniKani ${story.level.value}`}
        </span>
        <span>·</span>
        <span className="fst-italic">"{story.theme}"</span>
        <span>·</span>
        <span>{new Date(story.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
