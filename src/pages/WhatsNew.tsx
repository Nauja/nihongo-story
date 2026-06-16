import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import { getReleases, RELEASES_URL, type GitHubRelease } from "../lib/github";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReleaseCard({ release }: { release: GitHubRelease }) {
  const title = release.name || release.tag_name;
  return (
    <article
      className="p-4 mb-3"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "0.375rem",
      }}
    >
      <header className="d-flex align-items-start justify-content-between gap-3 mb-2 flex-wrap">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <a
            href={release.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="fs-5 fw-bold text-reset text-decoration-none"
          >
            {title}
          </a>
          {release.prerelease && (
            <span className="badge bg-warning text-dark">Pre-release</span>
          )}
        </div>
        <small className="text-secondary flex-shrink-0 mt-1">
          {formatDate(release.published_at)}
        </small>
      </header>
      {release.body ? (
        <div className="markdown-body small">
          <ReactMarkdown
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {release.body}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-secondary small mb-0 fst-italic">
          No description provided.
        </p>
      )}
    </article>
  );
}

export default function WhatsNew() {
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    getReleases()
      .then((data) => {
        if (!active) return;
        setReleases(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <header className="mb-4">
        <h1 className="fs-3 fw-bold font-japanese mb-1">更新情報</h1>
        <p className="text-secondary mb-0">What's New</p>
      </header>

      {status === "loading" && (
        <div className="d-flex align-items-center gap-2 text-secondary py-4">
          <Spinner animation="border" size="sm" />
          <span>Loading releases…</span>
        </div>
      )}

      {status === "error" && (
        <div
          className="p-4"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.375rem",
          }}
        >
          <p className="mb-2">Couldn't load the latest releases.</p>
          <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
            View releases on GitHub
          </a>
        </div>
      )}

      {status === "ready" && releases.length === 0 && (
        <p className="text-secondary py-4">No releases yet.</p>
      )}

      {status === "ready" &&
        releases.map((release) => (
          <ReleaseCard key={release.id} release={release} />
        ))}
    </div>
  );
}
