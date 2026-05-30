import { useEffect } from "react";
import type { SessionMeta } from "../storage/sessionStore";
import { Library } from "./Library";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  sessions: SessionMeta[];
  activeId: string | null;
  recordingId: string | null;
  modified: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

/**
 * Side-panel history: a left slide-in drawer over a dimmed scrim. Picking a
 * reading opens it and dismisses the drawer (close-on-select); the scrim, the
 * close button, and Esc also dismiss. Reuses <Library> for the list itself.
 */
export function HistoryDrawer({
  open,
  onClose,
  sessions,
  activeId,
  recordingId,
  modified,
  onOpen,
  onDelete,
  onExport,
}: HistoryDrawerProps): React.JSX.Element {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={open ? "hist-drawer-root open" : "hist-drawer-root"} aria-hidden={!open}>
      <button
        type="button"
        className="hist-scrim"
        onClick={onClose}
        tabIndex={-1}
        aria-label="Close history"
      />
      <aside
        className="hist-drawer"
        aria-label="History"
        role="dialog"
        aria-modal="true"
        // Keep tab order and focus out of the off-screen drawer when closed.
        inert={!open}
      >
        <div className="hist-drawer-head">
          <span className="lbl">
            Recent <b>{sessions.length}</b>
          </span>
          <button
            type="button"
            className="panel-iconbtn"
            onClick={onClose}
            title="Close history"
            aria-label="Close history"
            data-testid="history-close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <Library
          sessions={sessions}
          activeId={activeId}
          recordingId={recordingId}
          modified={modified}
          onOpen={(id) => {
            onOpen(id);
            onClose();
          }}
          onDelete={onDelete}
          onExport={onExport}
        />
      </aside>
    </div>
  );
}
