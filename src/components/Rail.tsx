import type { SessionMeta, StorageBreakdown } from "../storage/sessionStore";
import type { PerfState } from "../types";
import { BrandMark } from "./BrandMark";
import { Library } from "./Library";
import { PerfWidget } from "./PerfWidget";

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} gb`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} mb`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} kb`;
  return `${bytes} b`;
}

interface RailProps {
  sessions: SessionMeta[];
  activeId: string | null;
  recordingId: string | null;
  modified: boolean;
  storage: StorageBreakdown | null;
  perf: PerfState;
  onNewDocument: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onReset: () => void;
}

export function Rail({
  sessions,
  activeId,
  recordingId,
  modified,
  storage,
  perf,
  onNewDocument,
  onOpen,
  onDelete,
  onExport,
  onReset,
}: RailProps): React.JSX.Element {
  const storageTotal = storage
    ? storage.voiceBytes + storage.sessionsBytes + storage.headroomBytes
    : 1;
  const voicePct = storage ? (storage.voiceBytes / storageTotal) * 100 : 0;
  const sessionsPct = storage ? (storage.sessionsBytes / storageTotal) * 100 : 0;

  return (
    <aside className="rail" aria-label="Sidebar">
      <div className="brand">
        <BrandMark size={28} />
        <span className="name" title="come and talk to me">
          <b>catm</b>
          <span>come and talk to me</span>
        </span>
      </div>

      <button
        type="button"
        className="newdoc"
        onClick={onNewDocument}
        data-testid="new-document"
        title="New reading"
      >
        <span className="k" aria-hidden="true">
          +
        </span>
        New reading
      </button>

      <div className="lbl">
        Recent <b>{sessions.length}</b>
      </div>

      <Library
        sessions={sessions}
        activeId={activeId}
        recordingId={recordingId}
        modified={modified}
        onOpen={onOpen}
        onDelete={onDelete}
        onExport={onExport}
      />

      <PerfWidget perf={perf} />

      <section className="foot-section" aria-label="Storage">
        <h5 className="foot-lbl">
          Storage
          <span>{storage ? fmtBytes(storage.voiceBytes + storage.sessionsBytes) : "—"}</span>
        </h5>
        <div className="foot-bar" aria-hidden="true">
          <span className="seg-v" style={{ width: `${voicePct}%` }} />
          <span className="seg-s" style={{ width: `${sessionsPct}%` }} />
        </div>
        <div className="foot-line">
          <span>
            <i className="dot-v" /> Voice
          </span>
          <b>{storage ? fmtBytes(storage.voiceBytes) : "—"}</b>
        </div>
        <div className="foot-line">
          <span>
            <i className="dot-s" /> Recordings · {sessions.length}
          </span>
          <b>{storage ? fmtBytes(storage.sessionsBytes) : "—"}</b>
        </div>
        <div className="foot-line">
          <span>
            <i className="dot-f" /> Free
          </span>
          <b>{storage ? fmtBytes(storage.headroomBytes) : "—"}</b>
        </div>
        {storage?.persisted ? <span className="foot-badge">persistent</span> : null}
        <button type="button" className="ghost-danger" onClick={onReset} data-testid="reset">
          Delete everything
        </button>
      </section>
    </aside>
  );
}
