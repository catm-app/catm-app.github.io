// Composes the real catm components with our frame-driven DemoReaderView,
// using the same `.shell` / `.shell-panel` class structure as App.tsx. Two
// flavours via the `mode` prop:
//   "tab"   → wide desktop popout layout (rail + main side-by-side)
//   "panel" → narrow extension side panel: command bar (New + History) + the
//             reader, with history in a left slide-in drawer (no rail)
import { BrandMark } from "../../../src/components/BrandMark";
import { Library } from "../../../src/components/Library";
import { Rail } from "../../../src/components/Rail";
import type { SessionMeta } from "../../../src/storage/sessionTypes";
import type { AppStatus, PerfState } from "../../../src/types";
import type { VoiceId } from "../../../src/worker/kokoro.worker";
import { MOCK_PERF, MOCK_STORAGE } from "../data";
import { DemoReaderView } from "./DemoReaderView";

interface DemoAppProps {
  mode: "tab" | "panel";
  sessions: SessionMeta[];
  activeId: string | null;
  title: string;
  sourceText: string;
  voice: VoiceId;
  speed: number;
  status: AppStatus;
  currentTime: number;
  durationSec: number;
  chunkDurations: number[];
  chunkTexts: string[];
  playing: boolean;
  showDock?: boolean;
  voicePreviewing?: VoiceId | null;
  voiceOpen?: boolean;
  perf?: PerfState;
  /**
   * 0..1 — frame-driven slide of the side-panel history drawer (panel mode
   * only). Remotion renders discrete frames, so CSS transitions don't play;
   * we drive transform/opacity directly from this. 0 = closed, 1 = open.
   */
  drawerProgress?: number;
}

const noop = () => undefined;

export function DemoApp(props: DemoAppProps): React.JSX.Element {
  const {
    mode,
    sessions,
    activeId,
    title,
    sourceText,
    voice,
    speed,
    status,
    currentTime,
    durationSec,
    chunkDurations,
    chunkTexts,
    playing,
    showDock = true,
    voicePreviewing,
    voiceOpen,
    perf = MOCK_PERF,
    drawerProgress = 0,
  } = props;

  const isPanel = mode === "panel";
  const dp = Math.max(0, Math.min(1, drawerProgress));

  return (
    <div
      className={isPanel ? "shell shell-panel" : "shell"}
      // Scope the absolutely-positioned drawer to the panel bounds.
      style={isPanel ? { position: "relative" } : undefined}
    >
      <header className="panel-brandbar">
        <BrandMark size={24} />
        <span className="panel-brandbar-name">
          <b>catm</b>
          <span>come and talk to me</span>
        </span>
        {isPanel ? (
          <>
            <span
              className={`panel-device${
                status.kind === "ready" && status.device === "webgpu" ? " on-gpu" : ""
              }`}
              title="Synthesis runs on the GPU"
            >
              WebGPU
            </span>
            <button
              type="button"
              className="panel-iconbtn primary"
              title="New reading"
              aria-label="New reading"
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              className={`panel-iconbtn${dp > 0.5 ? " on" : ""}`}
              title="History"
              aria-label="History"
              aria-expanded={dp > 0.5}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3v5h5" />
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                <path d="M12 7v5l3 2" />
              </svg>
            </button>
            <button type="button" className="popout-btn" title="Open in tab">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 3h4v4" />
                <path d="M13 3l-6 6" />
                <path d="M11 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3" />
              </svg>
            </button>
          </>
        ) : null}
      </header>

      {isPanel ? null : (
        <Rail
          sessions={sessions}
          activeId={activeId}
          recordingId={null}
          modified={false}
          storage={MOCK_STORAGE}
          perf={perf}
          onNewDocument={noop}
          onOpen={noop}
          onDelete={noop}
          onExport={noop}
          onReset={noop}
        />
      )}

      <main className="main">
        <DemoReaderView
          status={status}
          title={title}
          sourceText={sourceText}
          voice={voice}
          speed={speed}
          currentTime={currentTime}
          durationSec={durationSec}
          chunkDurations={chunkDurations}
          chunkTexts={chunkTexts}
          showDock={showDock}
          playing={playing}
          voicePreviewing={voicePreviewing}
          voiceOpen={voiceOpen}
        />
      </main>

      {isPanel ? (
        // Frame-driven mirror of <HistoryDrawer>: scoped to the panel
        // (position:absolute over the shell), clipped so the off-screen
        // drawer doesn't spill into the article, and driven by `dp` instead
        // of the CSS `.open` transition.
        <div
          className="hist-drawer-root"
          style={{ position: "absolute", overflow: "hidden", pointerEvents: "none" }}
        >
          <div className="hist-scrim" style={{ opacity: dp, transition: "none" }} />
          <aside
            className="hist-drawer"
            style={{ transform: `translateX(${(dp - 1) * 100}%)`, transition: "none" }}
          >
            <div className="hist-drawer-head">
              <span className="lbl">
                Recent <b>{sessions.length}</b>
              </span>
              <span className="panel-iconbtn" aria-hidden="true">
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
              </span>
            </div>
            <Library
              sessions={sessions}
              activeId={activeId}
              recordingId={null}
              modified={false}
              onOpen={noop}
              onDelete={noop}
              onExport={noop}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
