import React, { useState, useRef } from "react";
import { Badge } from "react-bootstrap";
import type { WaniKaniSubject } from "../types";

interface Props {
  word: string;
  subject: WaniKaniSubject | null;
  relatedSubjects: Record<number, WaniKaniSubject>;
  loading: boolean;
  error: string | null;
  noKey?: boolean;
  simpleMode?: boolean;
  onToggleMode?: () => void;
  onClose?: () => void;
  onLookup?: (word: string) => void;
}

const WK_PATH: Record<string, string> = {
  radical: "radicals",
  kanji: "kanji",
  vocabulary: "vocabulary",
  kana_vocabulary: "vocabulary",
};

function subjectUrl(subject: WaniKaniSubject): string {
  const seg = WK_PATH[subject.object] ?? subject.object;
  // Radicals use the slug (e.g. "Landslide"), kanji/vocab use the character
  const id = subject.object === "radical" ? subject.data.slug : (subject.data.characters ?? subject.data.slug);
  return `https://www.wanikani.com/${seg}/${id}`;
}

const WK_LEVEL_COLOR = (level: number): string => {
  if (level <= 10) return "#db2777";
  if (level <= 20) return "#9333ea";
  if (level <= 30) return "#2563eb";
  if (level <= 40) return "#16a34a";
  if (level <= 50) return "#d97706";
  return "#be123c";
};

function parseMnemonic(text: string): string {
  return text
    .replace(
      /<radical>(.*?)<\/radical>/g,
      '<span class="wk-mnemonic-radical">$1</span>',
    )
    .replace(
      /<kanji>(.*?)<\/kanji>/g,
      '<span class="wk-mnemonic-kanji">$1</span>',
    )
    .replace(
      /<reading>(.*?)<\/reading>/g,
      '<span class="wk-mnemonic-reading">$1</span>',
    )
    .replace(/<ja>(.*?)<\/ja>/g, '<span class="font-japanese">$1</span>')
    .replace(/<[^>]+>/g, "");
}

function SubjectTile({
  subject,
  theme,
  onLookup,
}: {
  subject: WaniKaniSubject;
  theme: "radical" | "kanji" | "vocabulary";
  onLookup?: (word: string) => void;
}) {
  const char = subject.data.characters ?? subject.data.slug;
  const primaryMeaning =
    subject.data.meanings.find((m) => m.primary)?.meaning ??
    subject.data.meanings[0]?.meaning ??
    "";
  const primaryReading =
    subject.data.readings?.find((r) => r.primary)?.reading ??
    subject.data.readings?.[0]?.reading;

  const borderStyle =
    theme === "radical"
      ? {
          borderColor: "var(--subject-radical-border)",
          background: "var(--subject-radical-bg)",
        }
      : theme === "kanji"
        ? {
            borderColor: "var(--subject-kanji-border)",
            background: "var(--subject-kanji-bg)",
          }
        : {
            borderColor: "var(--subject-vocab-border)",
            background: "var(--subject-vocab-bg)",
          };

  const inner = (
    <>
      <div className="font-japanese fw-bold">{char}</div>
      {primaryReading && (
        <div
          className="font-japanese text-secondary"
          style={{ fontSize: "0.65rem", lineHeight: 1.2 }}
        >
          {primaryReading}
        </div>
      )}
      <div
        className="text-truncate"
        style={{ fontSize: "0.65rem", color: "var(--popup-text-dim)" }}
      >
        {primaryMeaning}
      </div>
    </>
  );

  // Kanji/vocab tiles navigate in-app; radicals (and slug-only tiles) link out.
  const canLookup =
    onLookup != null && theme !== "radical" && subject.data.characters != null;

  if (canLookup) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLookup!(subject.data.characters!);
        }}
        className="border rounded-2 p-1 text-center overflow-hidden d-block w-100 text-decoration-none"
        style={borderStyle}
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={subjectUrl(subject)}
      target="_blank"
      rel="noopener noreferrer"
      className="border rounded-2 p-1 text-center overflow-hidden d-block text-decoration-none"
      style={borderStyle}
    >
      {inner}
    </a>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--popup-section-border)",
        paddingTop: "0.4rem",
        marginTop: "0.4rem",
      }}
    >
      <h3
        className="text-uppercase fw-bold text-secondary mb-1"
        style={{ fontSize: "0.6rem", letterSpacing: "0.08em" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function MnemonicBlock({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mt-1">
      <p
        className="mb-0"
        style={{ fontSize: "0.75rem", color: "var(--popup-text-dim)", lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: parseMnemonic(text) }}
      />
      {hint && (
        <p
          className="mb-0 mt-1 fst-italic ps-2"
          style={{
            fontSize: "0.75rem",
            color: "var(--popup-text-muted)",
            lineHeight: 1.5,
            borderLeft: "2px solid var(--popup-hint-border)",
          }}
          dangerouslySetInnerHTML={{ __html: parseMnemonic(hint) }}
        />
      )}
    </div>
  );
}

function WaniKaniPopup({
  word,
  subject,
  relatedSubjects,
  loading,
  error,
  noKey,
  simpleMode,
  onToggleMode,
  onClose,
  onLookup,
}: Props) {
  const data = subject?.data;

  const onyomi = data?.readings?.filter((r) => r.type === "onyomi") ?? [];
  const kunyomi = data?.readings?.filter((r) => r.type === "kunyomi") ?? [];
  const nanori = data?.readings?.filter((r) => r.type === "nanori") ?? [];
  const allReadings = data?.readings ?? [];

  const altMeanings = (data?.auxiliary_meanings ?? [])
    .filter((m) => m.type === "whitelist")
    .map((m) => m.meaning);

  const components = (data?.component_subject_ids ?? [])
    .map((id) => relatedSubjects[id])
    .filter((s): s is WaniKaniSubject => s != null);

  const similarKanji = (data?.visually_similar_subject_ids ?? [])
    .map((id) => relatedSubjects[id])
    .filter((s): s is WaniKaniSubject => s != null);

  const vocabList = (data?.amalgamation_subject_ids ?? [])
    .map((id) => relatedSubjects[id])
    .filter((s): s is WaniKaniSubject => s != null)
    .slice(0, 8);

  const isKanji = subject?.object === "kanji";
  const isVocab = subject?.object === "vocabulary";

  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggleAudio(url: string) {
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const el = new Audio(url);
      audioRef.current = el;
      el.onended = () => setPlayingUrl(null);
      el.play();
      setPlayingUrl(url);
    }
  }

  const wkPathSegment: Record<string, string> = {
    radical: "radicals",
    kanji: "kanji",
    vocabulary: "vocabulary",
    kana_vocabulary: "vocabulary",
  };
  const wkUrl =
    subject && data
      ? `https://www.wanikani.com/${wkPathSegment[subject.object] ?? subject.object}/${data.characters ?? data.slug}`
      : null;

  const primaryMeaning =
    data?.meanings.find((m) => m.primary)?.meaning ??
    data?.meanings[0]?.meaning;

  return (
    <div
      style={{
        width: "100%",
        marginTop: "0.5rem",
        marginBottom: "0.25rem",
        background: "var(--popup-bg)",
        border: "1px solid var(--popup-border)",
        borderRadius: "0.5rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
      className="p-2 small"
    >
      {/* Header */}
      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="font-japanese fw-bold fs-6" style={{ lineHeight: 1 }}>
          {word}
        </span>
        {data && (
          <>
            <Badge style={{ background: WK_LEVEL_COLOR(data.level) }}>
              L{data.level}
            </Badge>
            <span
              className="text-secondary text-capitalize"
              style={{ fontSize: "0.65rem" }}
            >
              {subject?.object}
            </span>
            {wkUrl && (
              <a
                href={wkUrl}
                target="_blank"
                rel="noreferrer"
                className="text-secondary"
                style={{ fontSize: "0.75rem", lineHeight: 1 }}
                onClick={(e) => e.stopPropagation()}
                title="Open on WaniKani"
              >
                <i className="bi bi-box-arrow-up-right" />
              </a>
            )}
          </>
        )}
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="ms-auto btn-close"
            style={{ fontSize: "0.5rem" }}
            aria-label="Close"
          />
        )}
      </div>

      {noKey && (
        <p className="text-secondary small mb-0">
          Add a WaniKani API key in{" "}
          <span className="text-primary">Settings</span> to see details.
        </p>
      )}

      {loading && (
        <div className="d-flex align-items-center gap-2 text-secondary small">
          <span className="spinner-border spinner-border-sm" role="status" />
          Looking up…
        </div>
      )}

      {error && !loading && (
        <p className="text-secondary small mb-0">
          {error === "no_key"
            ? "No WaniKani key set."
            : "Not found in WaniKani."}
        </p>
      )}

      {!subject && !loading && !error && !noKey && (
        <p className="text-secondary small mb-0">Not found in WaniKani.</p>
      )}

      {subject && data && !loading && (
        <>
          {/* Compact primary info row */}
          <div
            className="d-flex align-items-baseline flex-wrap"
            style={{
              gap: "0 0.75rem",
              borderTop: "1px solid var(--popup-section-border)",
              paddingTop: "0.35rem",
              marginTop: "0.35rem",
            }}
          >
            {primaryMeaning && (
              <span
                className="fw-semibold"
                style={{ color: "var(--popup-text)", fontSize: "0.85rem" }}
              >
                {primaryMeaning}
              </span>
            )}
            {altMeanings.length > 0 && (
              <span className="text-secondary" style={{ fontSize: "0.7rem" }}>
                ({altMeanings.join(", ")})
              </span>
            )}
            {isVocab && allReadings.length > 0 && (
              <span
                className="font-japanese text-secondary"
                style={{ fontSize: "0.85rem" }}
              >
                {allReadings.map((r) => r.reading).join("、")}
              </span>
            )}
            {isKanji && (
              <span style={{ fontSize: "0.8rem" }}>
                <span
                  className="text-secondary"
                  style={{ fontSize: "0.65rem" }}
                >
                  On{" "}
                </span>
                <span
                  className="font-japanese"
                  style={{ color: "var(--popup-text-dim)" }}
                >
                  {onyomi.length > 0
                    ? onyomi.map((r) => r.reading).join("、")
                    : "—"}
                </span>
                <span
                  className="text-secondary ms-2"
                  style={{ fontSize: "0.65rem" }}
                >
                  Kun{" "}
                </span>
                <span
                  className="font-japanese"
                  style={{ color: "var(--popup-text-dim)" }}
                >
                  {kunyomi.length > 0
                    ? kunyomi.map((r) => r.reading).join("、")
                    : "—"}
                </span>
                {nanori.length > 0 && (
                  <>
                    <span
                      className="text-secondary ms-2"
                      style={{ fontSize: "0.65rem" }}
                    >
                      Nanori{" "}
                    </span>
                    <span
                      className="font-japanese"
                      style={{ color: "var(--popup-text-dim)" }}
                    >
                      {nanori.map((r) => r.reading).join("、")}
                    </span>
                  </>
                )}
              </span>
            )}
            {isVocab &&
              data.parts_of_speech &&
              data.parts_of_speech.length > 0 && (
                <span className="text-secondary" style={{ fontSize: "0.7rem" }}>
                  {data.parts_of_speech.join(", ")}
                </span>
              )}
          </div>

          {/* Audio pronunciations (vocab, always visible) */}
          {isVocab && data.pronunciation_audios && data.pronunciation_audios.length > 0 && (
            <div
              className="d-flex flex-wrap gap-2"
              style={{
                borderTop: "1px solid var(--popup-section-border)",
                paddingTop: "0.35rem",
                marginTop: "0.35rem",
              }}
            >
              {data.pronunciation_audios.map((audio) => (
                <button
                  key={audio.url}
                  onClick={(e) => { e.stopPropagation(); toggleAudio(audio.url); }}
                  className="d-flex align-items-center gap-1 border-0 rounded-2 px-2 py-1"
                  style={{
                    background: playingUrl === audio.url ? "var(--subject-vocab-bg)" : "var(--popup-section-border)",
                    fontSize: "0.7rem",
                    color: "var(--popup-text-dim)",
                    cursor: "pointer",
                  }}
                  title={`${audio.metadata.voice_actor_name} (${audio.metadata.voice_description})`}
                >
                  <i className={`bi ${playingUrl === audio.url ? "bi-stop-fill" : "bi-play-fill"}`} />
                  <span>{audio.metadata.voice_actor_name}</span>
                  <span className="text-secondary" style={{ fontSize: "0.6rem" }}>
                    {audio.metadata.gender === "female" ? "♀" : "♂"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Advanced: mnemonics + related subjects */}
          {!simpleMode && (
            <>
              {isKanji && components.length > 0 && (
                <Section title="Radical Combination">
                  <div className="d-flex flex-wrap gap-2">
                    {components.map((s) => (
                      <SubjectTile key={s.id} subject={s} theme="radical" />
                    ))}
                  </div>
                </Section>
              )}

              {data.meaning_mnemonic && (
                <Section title="Meaning Mnemonic">
                  <MnemonicBlock
                    text={data.meaning_mnemonic}
                    hint={data.meaning_hint}
                  />
                </Section>
              )}

              {data.reading_mnemonic && (
                <Section title="Reading Mnemonic">
                  <MnemonicBlock
                    text={data.reading_mnemonic}
                    hint={data.reading_hint}
                  />
                </Section>
              )}

              {isVocab && components.length > 0 && (
                <Section title="Kanji Composition">
                  <div
                    className="d-grid gap-1"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
                    }}
                  >
                    {components.map((s) => (
                      <SubjectTile key={s.id} subject={s} theme="kanji" onLookup={onLookup} />
                    ))}
                  </div>
                </Section>
              )}

              {isVocab && data.context_sentences && data.context_sentences.length > 0 && (
                <Section title="Context Sentences">
                  {data.context_sentences.map((s, i) => (
                    <div
                      key={i}
                      style={
                        i > 0
                          ? { borderTop: "1px solid var(--popup-section-border)", paddingTop: "0.4rem", marginTop: "0.4rem" }
                          : { marginTop: "0.25rem" }
                      }
                    >
                      <p
                        className="mb-0 font-japanese"
                        lang="ja"
                        style={{ fontSize: "0.8rem", color: "var(--popup-text)", lineHeight: 1.6 }}
                      >
                        {s.ja}
                      </p>
                      <p
                        className="mb-0"
                        style={{ fontSize: "0.7rem", color: "var(--popup-text-dim)", lineHeight: 1.5 }}
                      >
                        {s.en}
                      </p>
                    </div>
                  ))}
                </Section>
              )}

              {isKanji && similarKanji.length > 0 && (
                <Section title="Visually Similar">
                  <div
                    className="d-grid gap-1"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(52px, 1fr))",
                    }}
                  >
                    {similarKanji.map((s) => (
                      <SubjectTile key={s.id} subject={s} theme="kanji" onLookup={onLookup} />
                    ))}
                  </div>
                </Section>
              )}

              {isKanji && vocabList.length > 0 && (
                <Section title="Found In Vocabulary">
                  <div
                    className="d-grid gap-1"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(70px, 1fr))",
                    }}
                  >
                    {vocabList.map((s) => (
                      <SubjectTile key={s.id} subject={s} theme="vocabulary" onLookup={onLookup} />
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </>
      )}
      {onToggleMode && (
        <div className="d-flex justify-content-end mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMode(); }}
            className="btn btn-link p-0 text-secondary"
            style={{ fontSize: "0.65rem" }}
            title={simpleMode ? "Show advanced details" : "Show simple view"}
          >
            {simpleMode ? "Details ›" : "‹ Simple"}
          </button>
        </div>
      )}
    </div>
  );
}

export default WaniKaniPopup;
