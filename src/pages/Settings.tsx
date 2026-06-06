import { useState, useMemo, useEffect } from "react";
import { Button, Form, InputGroup, Alert, ProgressBar } from "react-bootstrap";
import {
  getSettings,
  saveSettings,
  clearAllData,
  clearStories,
  clearWKCache,
  getStorageSizes,
  getWKCacheBuiltAt,
  setWKCacheBuiltAt,
  getWKCacheCount,
  getWKCacheSize,
} from "../lib/storage";
import { buildWKSubjectCache } from "../lib/wanikani";
import type { AIProvider } from "../types";

function ApiKeyField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Form.Group>
      <Form.Label className="small fw-medium">{label}</Form.Label>
      <InputGroup>
        <Form.Control
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          style={{ fontFamily: "monospace" }}
        />
        <Button
          variant="outline-secondary"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        >
          {visible ? (
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </Button>
      </InputGroup>
      <Form.Text className="text-secondary">{hint}</Form.Text>
    </Form.Group>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: React.ReactNode;
}) {
  return (
    <Form.Group>
      <Form.Label className="small fw-medium">{label}</Form.Label>
      <Form.Control
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        style={{ fontFamily: "monospace" }}
      />
      <Form.Text className="text-secondary">{hint}</Form.Text>
    </Form.Group>
  );
}

const PROVIDERS: { id: AIProvider; label: string; badge?: string }[] = [
  { id: "gemini", label: "Gemini", badge: "Free" },
  { id: "ollama", label: "Ollama", badge: "Local" },
  { id: "anthropic", label: "Claude", badge: "Paid" },
];

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  Free: {
    background: "rgba(16,185,129,0.15)",
    color: "#34d399",
    border: "1px solid rgba(16,185,129,0.3)",
  },
  Local: {
    background: "rgba(14,165,233,0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(14,165,233,0.3)",
  },
  Paid: {
    background: "rgba(245,158,11,0.15)",
    color: "#fbbf24",
    border: "1px solid rgba(245,158,11,0.3)",
  },
};

export default function Settings() {
  const [settings, setSettings] = useState(getSettings);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteStories, setConfirmDeleteStories] = useState(false);
  const [confirmDeleteCache, setConfirmDeleteCache] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [cacheBuiltAt, setCacheBuiltAt] = useState<Date | null>(
    getWKCacheBuiltAt,
  );
  const [buildingCache, setBuildingCache] = useState(false);
  const [buildProgress, setBuildProgress] = useState<{
    loaded: number;
    total: number;
  }>({ loaded: 0, total: 0 });
  const [buildError, setBuildError] = useState<string | null>(null);
  const [wkCacheCount, setWkCacheCount] = useState(0);
  const [wkCacheSize, setWkCacheSize] = useState(0);

  const sizes = useMemo(() => getStorageSizes(), [cacheVersion]);

  useEffect(() => {
    Promise.all([getWKCacheCount(), getWKCacheSize()]).then(([count, size]) => {
      setWkCacheCount(count);
      setWkCacheSize(size);
    });
  }, [cacheVersion]);

  function formatBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatRelativeTime(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  async function handleBuildCache() {
    if (!settings.wanikaniApiKey || buildingCache) return;
    setBuildingCache(true);
    setBuildError(null);
    setBuildProgress({ loaded: 0, total: 0 });
    try {
      await buildWKSubjectCache(settings.wanikaniApiKey, (loaded, total) => {
        setBuildProgress({ loaded, total });
      });
      setWKCacheBuiltAt();
      const now = new Date();
      setCacheBuiltAt(now);
      setCacheVersion((v) => v + 1);
      getWKCacheCount().then(setWkCacheCount);
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : "Cache build failed");
    } finally {
      setBuildingCache(false);
    }
  }

  function handleThemeChange(t: "light" | "dark") {
    document.documentElement.setAttribute("data-bs-theme", t);
    setSettings((s) => {
      const updated = { ...s, theme: t };
      saveSettings(updated);
      return updated;
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ maxWidth: 576 }} className="mx-auto">
      <h1 className="fs-4 fw-bold font-japanese mb-1">設定</h1>
      <p className="text-secondary small mb-4">
        Configure your AI provider and API keys
      </p>

      <Form onSubmit={handleSave} className="d-flex flex-column gap-4">
        {/* AI Provider section */}
        <div className="section-card p-4 d-flex flex-column gap-4">
          <h2
            className="small fw-semibold text-secondary text-uppercase mb-0"
            style={{ letterSpacing: "0.08em" }}
          >
            AI Provider
          </h2>

          {/* Provider tabs */}
          <div className="d-flex gap-2">
            {PROVIDERS.map(({ id, label, badge }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, provider: id }))}
                className={`flex-fill py-2 px-2 rounded-3 border small fw-medium d-flex flex-column align-items-center gap-1 ${
                  settings.provider === id
                    ? "border-primary text-primary"
                    : "border-secondary text-secondary"
                }`}
                style={{
                  background:
                    settings.provider === id
                      ? "rgba(79,70,229,0.15)"
                      : "var(--btn-surface)",
                  transition: "all 0.15s",
                }}
              >
                <span>{label}</span>
                {badge && (
                  <span
                    className="rounded-pill px-2"
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      ...BADGE_STYLES[badge],
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Gemini fields */}
          {settings.provider === "gemini" && (
            <>
              <Alert variant="success" className="small py-2 mb-0">
                Gemini Flash is free — 15 requests/min, 1 million tokens/day.
                Get a free API key at{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="alert-link"
                >
                  aistudio.google.com
                </a>
                .
              </Alert>
              <ApiKeyField
                label="Gemini API Key"
                value={settings.geminiApiKey}
                onChange={(v) =>
                  setSettings((s) => ({ ...s, geminiApiKey: v }))
                }
                placeholder="AIza..."
                hint="Required for story generation."
              />
            </>
          )}

          {/* Ollama fields */}
          {settings.provider === "ollama" && (
            <>
              <Alert variant="info" className="small py-2 mb-0">
                Ollama runs models locally — no internet required after setup,
                no API fees. Install from{" "}
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="alert-link"
                >
                  ollama.com
                </a>{" "}
                then run: <code>ollama pull qwen2.5:7b</code>
              </Alert>
              <TextField
                label="Ollama Base URL"
                value={settings.ollamaBaseUrl}
                onChange={(v) =>
                  setSettings((s) => ({ ...s, ollamaBaseUrl: v }))
                }
                placeholder="http://localhost:11434"
                hint="Default is http://localhost:11434 when running locally."
              />
              <TextField
                label="Model Name"
                value={settings.ollamaModel}
                onChange={(v) => setSettings((s) => ({ ...s, ollamaModel: v }))}
                placeholder="qwen2.5:7b"
                hint={
                  <>
                    Recommended for Japanese: <code>qwen2.5:7b</code> (fast) or{" "}
                    <code>qwen2.5:14b</code> (better quality).
                  </>
                }
              />
            </>
          )}

          {/* Claude fields */}
          {settings.provider === "anthropic" && (
            <>
              <Alert variant="warning" className="small py-2 mb-0">
                Claude requires an Anthropic account with credits. Sonnet 4.6 is
                used (~$0.003 per story). Get your key at{" "}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="alert-link"
                >
                  console.anthropic.com
                </a>
                .
              </Alert>
              <ApiKeyField
                label="Claude API Key"
                value={settings.claudeApiKey}
                onChange={(v) =>
                  setSettings((s) => ({ ...s, claudeApiKey: v }))
                }
                placeholder="sk-ant-api03-..."
                hint="Required for story generation."
              />
            </>
          )}
        </div>

        {/* WaniKani section */}
        <div className="section-card p-4 d-flex flex-column gap-4">
          <h2
            className="small fw-semibold text-secondary text-uppercase mb-0"
            style={{ letterSpacing: "0.08em" }}
          >
            WaniKani (Optional)
          </h2>
          <ApiKeyField
            label="WaniKani API Key"
            value={settings.wanikaniApiKey}
            onChange={(v) => setSettings((s) => ({ ...s, wanikaniApiKey: v }))}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            hint={
              <>
                Enables vocabulary popups on hover in story view. Find it in
                your{" "}
                <a
                  href="https://www.wanikani.com/settings/personal_access_tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary"
                >
                  WaniKani settings
                </a>
                .
              </>
            }
          />
          <div className="d-flex flex-column gap-2">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <span className="small text-secondary">
                {cacheBuiltAt
                  ? `Cache built ${formatRelativeTime(cacheBuiltAt)}`
                  : "Vocabulary cache"}
              </span>
              <Button
                variant={cacheBuiltAt ? "outline-secondary" : "outline-primary"}
                size="sm"
                disabled={!settings.wanikaniApiKey || buildingCache}
                onClick={handleBuildCache}
                type="button"
              >
                {buildingCache
                  ? "Building…"
                  : cacheBuiltAt
                    ? "Refresh Cache"
                    : "Build Cache"}
              </Button>
            </div>
            {buildingCache && buildProgress.total > 0 && (
              <ProgressBar
                now={(buildProgress.loaded / buildProgress.total) * 100}
                animated
                striped
                label={`${buildProgress.loaded} / ${buildProgress.total}`}
                style={{ height: "0.5rem" }}
              />
            )}
            {!cacheBuiltAt && !buildingCache && (
              <Form.Text className="text-secondary">
                Pre-loads all WaniKani kanji and vocabulary (~9 000 subjects)
                into local storage. Build it once and vocabulary popups will
                appear instantly without making an API call per word.
              </Form.Text>
            )}
            {buildError && (
              <p className="small text-danger mb-0">{buildError}</p>
            )}
          </div>
        </div>

        {/* Appearance section */}
        <div className="section-card p-4 d-flex flex-column gap-4">
          <h2
            className="small fw-semibold text-secondary text-uppercase mb-0"
            style={{ letterSpacing: "0.08em" }}
          >
            Appearance
          </h2>
          <div className="d-flex align-items-center gap-3">
            <span className="small text-secondary">Theme</span>
            <div className="d-flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleThemeChange(t)}
                  className={`btn btn-sm ${settings.theme === t ? "btn-primary" : "btn-outline-secondary"}`}
                >
                  {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="rounded-3 p-3 small text-secondary"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p className="fw-medium text-body mb-1">Privacy note</p>
          <p className="mb-0">
            API keys are stored only in your browser's local storage and are
            sent only to the respective service (Google, Anthropic, or your
            local Ollama instance) when generating a story.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
        >
          {saved ? (
            <>
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Saved!
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </Form>

      {/* Danger Zone */}
      <div
        className="p-4 d-flex flex-column gap-3 mt-4 rounded-3"
        style={{
          border: "1px solid rgba(239,68,68,0.4)",
          background: "rgba(239,68,68,0.05)",
        }}
      >
        <h2
          className="small fw-semibold text-secondary text-uppercase mb-0"
          style={{ letterSpacing: "0.08em" }}
        >
          Danger Zone
        </h2>

        {!confirmDeleteStories ? (
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <p className="small fw-medium text-body mb-0">Clear stories</p>
              <p className="small text-secondary mb-0">
                Delete all generated stories. {formatBytes(sizes.stories)} used.
              </p>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              className="flex-shrink-0"
              disabled={sizes.stories === 0}
              onClick={() => setConfirmDeleteStories(true)}
            >
              Clear Stories
            </Button>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            <p className="small text-danger mb-0 fw-medium">
              ⚠ This will permanently delete all generated stories. This cannot
              be undone.
            </p>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setConfirmDeleteStories(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  clearStories();
                  setCacheVersion((v) => v + 1);
                  setConfirmDeleteStories(false);
                }}
              >
                Yes, clear stories
              </Button>
            </div>
          </div>
        )}
        <hr className="my-0" style={{ borderColor: "rgba(239,68,68,0.2)" }} />

        {(settings.wanikaniApiKey || wkCacheCount > 0) && (
          <>
            {!confirmDeleteCache ? (
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <p className="small fw-medium text-body mb-0">
                    Clear WaniKani cache
                  </p>
                  <p className="small text-secondary mb-0">
                    {wkCacheCount > 0
                      ? `${wkCacheCount.toLocaleString()} subjects cached · ${formatBytes(wkCacheSize)}`
                      : "No subjects cached"}
                  </p>
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="flex-shrink-0"
                  disabled={wkCacheCount === 0 && !cacheBuiltAt}
                  onClick={() => setConfirmDeleteCache(true)}
                >
                  Clear Cache
                </Button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                <p className="small text-danger mb-0 fw-medium">
                  ⚠ This will clear the WaniKani lookup cache. Your API key
                  will not be affected.
                </p>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setConfirmDeleteCache(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      clearWKCache().then(() => {
                        setCacheVersion((v) => v + 1);
                        setCacheBuiltAt(null);
                        setWkCacheCount(0);
                        setWkCacheSize(0);
                        setConfirmDeleteCache(false);
                      });
                    }}
                  >
                    Yes, clear cache
                  </Button>
                </div>
              </div>
            )}
            <hr className="my-0" style={{ borderColor: "rgba(239,68,68,0.2)" }} />
          </>
        )}

        {!confirmDelete ? (
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <p className="small fw-medium text-body mb-0">Clear all data</p>
              <p className="small text-secondary mb-0">
                Delete all generated stories and saved preferences.{" "}
                {formatBytes(sizes.total)} used.
              </p>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setConfirmDelete(true)}
            >
              Clear All Data
            </Button>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            <p className="small text-danger mb-0 fw-medium">
              ⚠ This will permanently delete all stories and user preferences.
              This cannot be undone.
            </p>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  clearAllData().then(() => window.location.reload());
                }}
              >
                Yes, delete everything
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
