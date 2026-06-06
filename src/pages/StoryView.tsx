import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button, Row, Col } from "react-bootstrap";
import {
  getStories,
  getSettings,
  saveSettings,
  getWKUser,
} from "../lib/storage";
import type { WkWordSets } from "../types";
import { lookupSubjectsBatch } from "../lib/wanikani";
import { useWaniKaniLookup } from "../hooks/useWaniKaniLookup";
import React from "react";

import FuriganaText from "../components/FuriganaText";
import WaniKaniPopup from "../components/WaniKaniPopup";

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
  const [wanikaniLevelColors, setWanikaniLevelColors] = useState(
    () => getSettings().wanikaniLevelColors ?? true,
  );
  const [wkUserLevel] = useState<number | null>(
    () => getWKUser()?.level ?? null,
  );
  const [defaultPopupMode, setDefaultPopupMode] = useState<"simple" | "advanced">(
    () => getSettings().wanikaniPopupMode ?? "advanced",
  );
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
  const playGenRef = useRef(0);
  const { subject, relatedSubjects, loading, error, lookup, clear } =
    useWaniKaniLookup(wanikaniApiKey);

  const [audioState, setAudioState] = useState<"idle" | "playing" | "paused">(
    "idle",
  );
  const [currentLine, setCurrentLine] = useState(-1);
  const [wkWordSets, setWkWordSets] = useState<WkWordSets | null>(null);
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
    saveSettings({ ...getSettings(), wanikaniLevelColors });
  }, [wanikaniLevelColors]);

  useEffect(() => {
    const sync = () => {
      const s = getSettings();
      setShowFurigana(s.showFurigana ?? true);
      setWanikaniLevelColors(s.wanikaniLevelColors ?? true);
      setDefaultPopupMode(s.wanikaniPopupMode ?? "advanced");
    };
    window.addEventListener("nihongo-settings-changed", sync);
    return () => window.removeEventListener("nihongo-settings-changed", sync);
  }, []);

  useEffect(() => {
    saveSettings({ ...getSettings(), wanikaniPopupMode: popupMode });
  }, [popupMode]);

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
        setActivePanel({ lineIndex, word });
        setPopupMode(defaultPopupMode ?? "advanced");
        lookup(word);
      }
    },
    [activePanel, lookup, clear, defaultPopupMode],
  );

  const handleVocabClick = useCallback(
    (word: string) => {
      if (activeVocabWordRef.current === word) {
        setActiveVocabWord(null);
        clear();
      } else {
        setActiveVocabWord(word);
        setActivePanel(null);
        setPopupMode(defaultPopupMode ?? "advanced");
        lookup(word);
      }
    },
    [lookup, clear, defaultPopupMode],
  );

  useEffect(() => {
    if (!wanikaniApiKey) return;
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
    lookupSubjectsBatch(allWords, wanikaniApiKey)
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
                  userLevel={(wanikaniLevelColors ?? true) ? wkUserLevel : null}
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
                          userLevel={
                            (wanikaniLevelColors ?? true) ? wkUserLevel : null
                          }
                          selectedWord={
                            activeVocabWord === item.word
                              ? item.word
                              : undefined
                          }
                          onWordClick={handleVocabClick}
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
                {activeVocabWord === item.word && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <WaniKaniPopup
                      word={activeVocabWord}
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
                      onClose={() => {
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
