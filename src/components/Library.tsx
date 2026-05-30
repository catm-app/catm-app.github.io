import { useMemo, useState } from "react";
import type { SessionMeta } from "../storage/sessionStore";

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface LibraryProps {
  sessions: SessionMeta[];
  activeId: string | null;
  recordingId: string | null;
  modified: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

/**
 * The recordings list + search. Shared between the desktop/PWA Rail and the
 * side-panel HistoryDrawer so there's a single list implementation. The
 * "Recent N" count label is rendered by the parent (Rail or drawer header).
 */
export function Library({
  sessions,
  activeId,
  recordingId,
  modified,
  onOpen,
  onDelete,
  onExport,
}: LibraryProps): React.JSX.Element {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(q) || s.sourceText.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  return (
    <>
      {sessions.length === 0 ? (
        <div className="hist-empty" data-testid="library-empty">
          Past recordings will live here.
        </div>
      ) : (
        <ul className="hist" style={{ listStyle: "none" }}>
          {filtered.length === 0 ? (
            <li className="hist-empty">No readings match "{query}".</li>
          ) : (
            filtered.map((s) => {
              const isActive = s.id === activeId;
              const isRecording = s.id === recordingId;
              return (
                <li
                  key={s.id}
                  className={isActive ? "row-wrap active" : "row-wrap"}
                  data-testid="library-row"
                >
                  <button
                    type="button"
                    className="row"
                    onClick={() => onOpen(s.id)}
                    data-testid="library-play"
                  >
                    <span className="t">{s.title}</span>
                    <span className="m">
                      <span>{formatDuration(s.durationSec)}</span>
                      <span className="voice-tag">{s.voice}</span>
                      {isActive && modified ? <span className="unsaved">● unsaved</span> : null}
                    </span>
                  </button>
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() => onExport(s.id)}
                      disabled={isRecording}
                      aria-label={`Export ${s.title}`}
                      title={isRecording ? "Export disabled while generating" : "Export (.zip)"}
                      data-testid="library-export"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <title>Download</title>
                        <path d="M12 3v12" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="5" y1="21" x2="19" y2="21" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="del"
                      onClick={() => onDelete(s.id)}
                      aria-label={`Delete ${s.title}`}
                      data-testid="library-delete"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <title>Delete</title>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}

      {sessions.length > 0 ? (
        <input
          type="search"
          className="rail-search"
          placeholder="Search readings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search readings"
        />
      ) : null}
    </>
  );
}
