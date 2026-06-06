import { Link } from "react-router-dom";
import { Badge, Button } from "react-bootstrap";
import type { Story, WkWordSets } from "../types";
import FuriganaText from "./FuriganaText";

const JLPT_BADGE_VARIANTS: Record<number, string> = {
  5: "success",
  4: "info",
  3: "primary",
  2: "warning",
  1: "danger",
};

function LevelBadge({ level }: { level: Story["level"] }) {
  if (level.type === "jlpt") {
    const variant = JLPT_BADGE_VARIANTS[level.value] ?? "secondary";
    return (
      <Badge bg={variant} style={{ fontWeight: 500 }}>
        JLPT N{level.value}
      </Badge>
    );
  }
  return <Badge className="badge-indigo">WK{level.value}</Badge>;
}

const TYPE_ICONS: Record<string, string> = {
  conversation: "💬",
  novel: "📖",
  diary: "📝",
  poem: "🌸",
  news: "📰",
};

interface Props {
  story: Story;
  onDelete: (id: string) => void;
  wkWordSets?: WkWordSets | null;
  userLevel?: number | null;
}

export default function StoryCard({ story, onDelete, wkWordSets, userLevel }: Props) {
  const date = new Date(story.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article
      className="story-card position-relative overflow-hidden"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "0.375rem",
      }}
    >
      <Link
        to={`/story/${story.id}`}
        className="text-decoration-none text-reset d-block p-4"
      >
        <header className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div className="min-w-0 flex-grow-1">
            <h2 className="fs-5 fw-bold font-japanese text-truncate mb-0" style={{ paddingBottom: '10px' }}>
              <FuriganaText text={story.title} wkWordSets={wkWordSets} userLevel={userLevel} />
            </h2>
            {story.titleReading && (
              <small className="text-secondary font-japanese">
                {story.titleReading}
              </small>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0 mt-1">
            <span style={{ fontSize: "1.15rem" }}>
              {TYPE_ICONS[story.storyType] ?? "📄"}
            </span>
            <LevelBadge level={story.level} />
          </div>
        </header>

        <section>
          <p className="small text-secondary line-clamp-2 mb-3">
            {story.englishSummary}
          </p>
        </section>

        <footer className="d-flex align-items-center justify-content-between">
          <small className="text-secondary text-truncate me-2 fst-italic">
            "{story.theme}"
          </small>
          <small className="text-secondary flex-shrink-0">{date}</small>
        </footer>
      </Link>

      <Button
        variant="danger"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          if (confirm("Delete this story?")) onDelete(story.id);
        }}
        className="position-absolute top-0 end-0 m-2 opacity-0 story-card-delete p-1"
        title="Delete story"
        style={{ lineHeight: 1 }}
      >
        <svg
          width="14"
          height="14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </Button>
    </article>
  );
}
