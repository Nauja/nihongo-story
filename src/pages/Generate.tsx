import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Alert, Button, Form } from "react-bootstrap";
import { getSettings, saveStory } from "../lib/storage";
import { generateStory } from "../lib/generation";
import type { StoryType, LevelType } from "../types";

const STORY_TYPES: {
  value: StoryType;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { value: "conversation", label: "会話", icon: "💬", desc: "Dialogue" },
  { value: "novel", label: "物語", icon: "📖", desc: "Story" },
  { value: "diary", label: "日記", icon: "📝", desc: "Diary" },
  { value: "poem", label: "詩", icon: "🌸", desc: "Poem" },
  { value: "news", label: "ニュース", icon: "📰", desc: "News" },
];

const JLPT_LEVELS = [5, 4, 3, 2, 1];

const LENGTH_PRESETS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: "Very Short", desc: "3–5 sentences" },
  { value: 2, label: "Short", desc: "6–8 sentences" },
  { value: 3, label: "Medium", desc: "10–15 sentences" },
  { value: 4, label: "Long", desc: "18–25 sentences" },
  { value: 5, label: "Very Long", desc: "30–40 sentences" },
];

export default function Generate() {
  const navigate = useNavigate();
  const settings = getSettings();

  const [theme, setTheme] = useState("");
  const [storyType, setStoryType] = useState<StoryType>("novel");
  const [levelType, setLevelType] = useState<LevelType>("jlpt");
  const [levelValue, setLevelValue] = useState(5);
  const [storyLength, setStoryLength] = useState(3);
  const [loading, setLoading] = useState<"idle" | "story">("idle");
  const [error, setError] = useState<string | null>(null);

  const hasKey =
    settings.provider === "ollama"
      ? Boolean(settings.ollamaModel)
      : settings.provider === "gemini"
        ? Boolean(settings.geminiApiKey)
        : Boolean(settings.claudeApiKey);
  const isLoading = loading !== "idle";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasKey) return;

    setLoading("story");
    setError(null);

    try {
      const apiKey =
        settings.provider === "gemini"
          ? settings.geminiApiKey
          : settings.claudeApiKey;
      const genParams = {
        theme: theme.trim(),
        storyType,
        level: { type: levelType, value: levelValue },
        length: storyLength,
        provider: settings.provider,
        apiKey,
        geminiModel: settings.geminiModel,
        ollamaBaseUrl: settings.ollamaBaseUrl,
        ollamaModel: settings.ollamaModel,
      };
      const story = await generateStory(genParams);
      saveStory(story);

      navigate(`/story/${story.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Generation failed. Please try again.",
      );
    } finally {
      setLoading("idle");
    }
  }

  return (
    <div style={{ maxWidth: 576 }} className="mx-auto">
      <h1 className="fs-4 fw-bold font-japanese mb-1">新しい話を生成</h1>
      <p className="text-secondary small mb-4">
        Generate a new Japanese learning story
      </p>

      {!hasKey && (
        <Alert variant="warning" className="mb-4">
          <Alert.Heading className="fs-6 mb-1">
            {settings.provider === "ollama"
              ? "Ollama model required"
              : "API key required"}
          </Alert.Heading>
          <p className="mb-0 small">
            Configure your AI provider in{" "}
            <Link to="/settings" className="alert-link">
              Settings
            </Link>{" "}
            to generate stories.
          </p>
        </Alert>
      )}

      <Form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
        {/* Theme */}
        <Form.Group>
          <Form.Label className="small fw-medium">
            Theme / Prompt{" "}
            <span className="text-secondary fw-normal">(optional)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. A cat who wants to become a chef, a rainy day in Tokyo… or leave blank for a random story"
            rows={3}
            style={{ resize: "none" }}
          />
        </Form.Group>

        {/* Story type */}
        <Form.Group>
          <Form.Label className="small fw-medium">Story Type</Form.Label>
          <div
            className="d-grid gap-2"
            style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
          >
            {STORY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setStoryType(t.value)}
                className={`d-flex flex-column align-items-center gap-1 py-3 px-2 rounded-3 border text-center ${
                  storyType === t.value
                    ? "border-primary text-primary"
                    : "border-secondary text-secondary"
                }`}
                style={{
                  background:
                    storyType === t.value
                      ? "rgba(79,70,229,0.15)"
                      : "var(--btn-surface)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{t.icon}</span>
                <span className="small font-japanese fw-medium">{t.label}</span>
                <span
                  style={{ fontSize: "0.65rem" }}
                  className="text-secondary"
                >
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </Form.Group>

        {/* Level */}
        <Form.Group>
          <Form.Label className="small fw-medium">Target Level</Form.Label>
          <div className="d-flex gap-2 mb-3">
            {(["jlpt", "wanikani"] as LevelType[]).map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => {
                  setLevelType(lt);
                  setLevelValue(lt === "jlpt" ? 5 : 1);
                }}
                className={`px-3 py-2 rounded-2 border small fw-medium ${
                  levelType === lt
                    ? "border-primary text-primary"
                    : "border-secondary text-secondary"
                }`}
                style={{
                  background:
                    levelType === lt
                      ? "rgba(79,70,229,0.15)"
                      : "var(--surface-1)",
                  transition: "all 0.15s",
                }}
              >
                {lt === "jlpt" ? "JLPT" : "WaniKani"}
              </button>
            ))}
          </div>

          {levelType === "jlpt" ? (
            <div className="d-flex gap-2">
              {JLPT_LEVELS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLevelValue(n)}
                  className={`flex-fill py-2 rounded-3 border fw-bold small ${
                    levelValue === n
                      ? "border-primary text-primary"
                      : "border-secondary text-secondary"
                  }`}
                  style={{
                    background:
                      levelValue === n
                        ? "rgba(79,70,229,0.15)"
                        : "var(--btn-surface)",
                    transition: "all 0.15s",
                  }}
                >
                  N{n}
                </button>
              ))}
            </div>
          ) : (
            <div
              className="rounded-3 p-3"
              style={{
                background: "var(--btn-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <small className="text-secondary">WaniKani Level</small>
                <span className="text-primary fw-bold fs-5">{levelValue}</span>
              </div>
              <Form.Range
                min={1}
                max={60}
                value={levelValue}
                onChange={(e) => setLevelValue(Number(e.target.value))}
              />
              <div
                className="d-flex justify-content-between text-secondary"
                style={{ fontSize: "0.7rem" }}
              >
                <span>1</span>
                <span>60</span>
              </div>
              <p className="small text-secondary mt-1 mb-2">
                {levelValue <= 10 && "Beginner — basic kanji and vocabulary"}
                {levelValue > 10 &&
                  levelValue <= 30 &&
                  "Intermediate — common kanji"}
                {levelValue > 30 &&
                  levelValue <= 50 &&
                  "Advanced — complex vocabulary"}
                {levelValue > 50 &&
                  "Expert — rare kanji and literary vocabulary"}
              </p>
              <div className="d-flex gap-1 flex-wrap">
                {[1, 10, 20, 30, 40, 50, 60].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLevelValue(v)}
                    className="px-2 rounded small"
                    style={{
                      background:
                        levelValue === v
                          ? "rgba(79,70,229,0.3)"
                          : "var(--btn-surface)",
                      color: levelValue === v ? "#a5b4fc" : "#94a3b8",
                      border: "none",
                      padding: "1px 8px",
                      fontSize: "0.7rem",
                      transition: "all 0.15s",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Form.Group>

        {/* Story length */}
        <Form.Group>
          <Form.Label className="small fw-medium">Story Length</Form.Label>
          <div
            className="rounded-3 p-3"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <small className="text-secondary">Length</small>
              <span className="text-primary fw-bold">
                {LENGTH_PRESETS[storyLength - 1].label}
              </span>
            </div>
            <Form.Range
              min={1}
              max={5}
              value={storyLength}
              onChange={(e) => setStoryLength(Number(e.target.value))}
            />
            <div
              className="d-flex justify-content-between text-secondary mb-2"
              style={{ fontSize: "0.7rem" }}
            >
              <span>Very Short</span>
              <span>Very Long</span>
            </div>
            <p className="small text-secondary mb-2">
              {LENGTH_PRESETS[storyLength - 1].desc}
            </p>
            <div className="d-flex gap-1 flex-wrap">
              {LENGTH_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setStoryLength(p.value)}
                  className="px-2 rounded small"
                  style={{
                    background:
                      storyLength === p.value
                        ? "rgba(79,70,229,0.3)"
                        : "var(--btn-surface)",
                    color: storyLength === p.value ? "#a5b4fc" : "#94a3b8",
                    border: "none",
                    padding: "1px 8px",
                    fontSize: "0.7rem",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Form.Group>

        {error && <Alert variant="danger">{error}</Alert>}

        <Button
          type="submit"
          variant="primary"
          disabled={!hasKey || isLoading}
          className="w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
        >
          {isLoading ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              />
              Generating story…
            </>
          ) : (
            <>
              <span>✨</span>
              Generate Story
            </>
          )}
        </Button>
        {isLoading && (
          <p className="text-center small text-secondary">
            {`${
              {
                gemini: "Gemini",
                anthropic: "Claude",
                ollama: settings.ollamaModel || "Ollama",
              }[settings.provider]
            } is crafting your story… this may take 10–30 seconds.`}
          </p>
        )}
        <p
          className="text-center text-secondary"
          style={{ fontSize: "0.72rem" }}
        >
          AI-generated stories may contain mistakes. Always verify with a
          reliable source.
        </p>
      </Form>
    </div>
  );
}
