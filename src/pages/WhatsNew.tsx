import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { releases, RELEASES_URL, type GitHubRelease } from "../lib/github";

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
            rehypePlugins={[rehypeRaw]}
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
              img: ({ node, ...props }) => (
                <img {...props} style={{ maxWidth: "100%", ...props.style }} />
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
  return (
    <div>
      <header className="mb-4">
        <h1 className="fs-3 fw-bold font-japanese mb-1">更新情報</h1>
        <p className="text-secondary mb-0">What's New</p>
      </header>

      {releases.length === 0 ? (
        <div
          className="p-4"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "0.375rem",
          }}
        >
          <p className="mb-2">No releases yet.</p>
          <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
            View releases on GitHub
          </a>
        </div>
      ) : (
        releases.map((release) => (
          <ReleaseCard key={release.id} release={release} />
        ))
      )}
    </div>
  );
}
