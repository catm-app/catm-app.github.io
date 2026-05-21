import type { SessionMeta } from "../storage/sessionStore";

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface LibrarySidebarProps {
  sessions: SessionMeta[];
  activeId: string | null;
  modified: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LibrarySidebar({
  sessions,
  activeId,
  modified,
  onOpen,
  onDelete,
}: LibrarySidebarProps): React.JSX.Element {
  const totalMb = Math.round((sessions.reduce((a, s) => a + s.durationSec, 0) * 48) / 1024);
  return (
    <section className="sidebar-card" aria-label="Library">
      <h4>
        Library{" "}
        <span className="sub">
          <b>{sessions.length}</b> {sessions.length === 1 ? "session" : "sessions"} · {totalMb} mb
        </span>
      </h4>
      {sessions.length === 0 ? (
        <div className="lib-empty">
          <svg
            className="illu"
            width="72"
            height="72"
            viewBox="0 0 120 120"
            fill="none"
            aria-hidden="true"
            role="presentation"
          >
            <title>Empty library</title>
            <rect
              x="22"
              y="32"
              width="60"
              height="74"
              fill="none"
              stroke="#6580ad"
              strokeWidth="2.5"
            />
            <rect
              x="28"
              y="26"
              width="60"
              height="74"
              fill="#ede2c7"
              stroke="#2a2530"
              strokeWidth="3"
            />
            <line x1="36" y1="40" x2="78" y2="40" stroke="#2a2530" strokeWidth="1.5" opacity=".5" />
            <line x1="36" y1="48" x2="80" y2="48" stroke="#2a2530" strokeWidth="1.5" opacity=".5" />
            <line x1="36" y1="56" x2="70" y2="56" stroke="#2a2530" strokeWidth="1.5" opacity=".5" />
            <line x1="36" y1="64" x2="78" y2="64" stroke="#2a2530" strokeWidth="1.5" opacity=".5" />
            <path
              d="M95 36 q6 6 0 14"
              fill="none"
              stroke="#bf7488"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M101 30 q9 10 0 24"
              fill="none"
              stroke="#bf7488"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity=".6"
            />
          </svg>
          <div className="kicker" data-testid="library-empty">
            ▸ nothing here yet
          </div>
          <div className="copy">Past reads will live here.</div>
        </div>
      ) : (
        <ul className="lib-list">
          {sessions.map((s) => {
            const isActive = s.id === activeId;
            return (
              <li
                key={s.id}
                className={isActive ? "lib-row active" : "lib-row"}
                data-testid="library-row"
              >
                <button
                  type="button"
                  className="body"
                  onClick={() => onOpen(s.id)}
                  data-testid="library-play"
                >
                  <div className="t">{s.title}</div>
                  <div className="m">
                    <span>{formatDate(s.createdAt)}</span>
                    <span>{formatDuration(s.durationSec)}</span>
                    <span className="voice-tag">{s.voice}</span>
                    {isActive && modified ? <span className="unsaved">● unsaved</span> : null}
                  </div>
                </button>
                <button
                  type="button"
                  className="del"
                  onClick={() => onDelete(s.id)}
                  aria-label={`Delete ${s.title}`}
                  data-testid="library-delete"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
