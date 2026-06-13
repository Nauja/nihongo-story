import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";
import { getStories, deleteStory, getSettings, getWKUser } from "../lib/storage";
import { lookupSubjectsBatch } from "../lib/wanikani";
import { isCJK } from "../lib/wkLevels";
import type { WkWordSets } from "../types";
import StoryCard from "../components/StoryCard";

export default function Library() {
  const [stories, setStories] = useState(() => getStories());
  const [wkWordSets, setWkWordSets] = useState<WkWordSets | null>(null);
  const [wkUserLevel] = useState<number | null>(() => getWKUser()?.level ?? null);
  const { wanikaniApiKey } = getSettings();
  const [wanikaniLevelColors, setWanikaniLevelColors] = useState(
    () => getSettings().wanikaniLevelColors ?? true,
  );

  useEffect(() => {
    const sync = () => setWanikaniLevelColors(getSettings().wanikaniLevelColors ?? true);
    window.addEventListener('nihongo-settings-changed', sync);
    return () => window.removeEventListener('nihongo-settings-changed', sync);
  }, []);

  useEffect(() => {
    if (!wanikaniApiKey) return;
    const chars = [
      ...new Set(
        stories.flatMap((s) => [
          ...[...s.title].filter(isCJK),
          ...s.segments.flatMap((seg) => [...seg.text].filter(isCJK)),
        ]),
      ),
    ];
    if (chars.length === 0) return;
    lookupSubjectsBatch(chars, wanikaniApiKey).then((results) => {
      const vocab = new Map<string, number>();
      const kanji = new Map<string, number>();
      for (const [char, subject] of Object.entries(results)) {
        if (!subject) continue;
        if (subject.object === "vocabulary") vocab.set(char, subject.data.level);
        else if (subject.object === "kanji") kanji.set(char, subject.data.level);
      }
      setWkWordSets({ vocab, kanji });
    }).catch(() => {});
  }, [wanikaniApiKey, stories]);

  function handleDelete(id: string) {
    deleteStory(id);
    setStories(getStories());
  }

  if (stories.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center">
        <div className="font-japanese mb-4" style={{ fontSize: "4.5rem" }}>
          話
        </div>
        <h1 className="fs-4 fw-bold mb-2">図書館</h1>
        <p className="text-secondary mb-4" style={{ maxWidth: 320 }}>
          Your story library is empty. Generate your first Japanese story to get
          started.
        </p>
        <Button
          as={Link as any}
          to="/generate"
          variant="primary"
          className="d-inline-flex align-items-center gap-2"
        >
          <span>✨</span> Generate a Story
        </Button>
        <p
          className="text-secondary mt-4 mb-0"
          style={{ maxWidth: 380, fontSize: "0.82rem", lineHeight: 1.6 }}
        >
          After finishing WaniKani, finding reading material matched to your
          exact level is hard. Tools like Yomitan don't surface WaniKani's
          mnemonics, and WaniKani Kanji Highlighter — a browser extension —
          won't work on mobile without Kiwi. This app was built to solve all
          three: generate stories adapted to your WaniKani level, with WaniKani
          info always at hand — no extensions needed.
        </p>
        <div
          className="row row-cols-3 justify-content-center g-3 mt-4"
          style={{ maxWidth: 480, width: "100%" }}
        >
          {[
            {
              title: "Infinite",
              desc: "Stories, Conversations, and more generated on any theme and any length",
            },
            {
              title: "Levels",
              desc: "Tailored to your WaniKani level so you can train the kanji & vocab you learnt",
            },
            {
              title: "Audio",
              desc: "Generate audio via the Web Speech API and train your listening comprehension",
            },
            {
              title: "Standalone",
              desc: "Builtin furigana toggle and WaniKani info lookup — no extensions",
            },
            {
              title: "Privacy",
              desc: "Stories and API keys saved in your browser only — never shared, no account or server needed",
            },
          ].map(({ title, desc }) => (
            <div className="col" key={title}>
              <div
                className="h-100 p-3 rounded-3 text-center"
                style={{
                  background: "var(--btn-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div className="fw-semibold small mb-1">{title}</div>
                <div
                  className="text-secondary"
                  style={{ fontSize: "0.72rem", lineHeight: 1.4 }}
                >
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="fs-4 fw-bold font-japanese mb-0">図書館</h1>
          <small className="text-secondary">{stories.length} stories</small>
        </div>
        <Button
          as={Link as any}
          to="/generate"
          variant="primary"
          size="sm"
          className="d-inline-flex align-items-center gap-2"
        >
          <span>✨</span>
          <span className="d-none d-sm-inline">Generate</span>
        </Button>
      </div>

      <div className="d-flex flex-column gap-3">
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onDelete={handleDelete}
            wkWordSets={wkWordSets}
            userLevel={(wanikaniLevelColors ?? true) ? wkUserLevel : null}
          />
        ))}
      </div>
    </div>
  );
}
