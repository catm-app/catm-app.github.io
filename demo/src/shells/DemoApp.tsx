// Composes the real Rail component with our frame-driven DemoReaderView,
// using the same `.shell` / `.shell-panel` class structure as the real
// App.tsx. Two flavours via the `mode` prop:
//   "tab"   → wide desktop popout layout (rail + main side-by-side)
//   "panel" → narrow extension side panel (brandbar + main + rail stacked)
import { BrandMark } from "../../../src/components/BrandMark";
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
}

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
  } = props;

  const isPanel = mode === "panel";

  return (
    <div className={isPanel ? "shell shell-panel" : "shell"}>
      <header className="panel-brandbar">
        <BrandMark size={24} />
        <span className="panel-brandbar-name">
          <b>catm</b>
          <span>come and talk to me</span>
        </span>
        {isPanel ? (
          <span
            className={`panel-device${
              status.kind === "ready" && status.device === "webgpu" ? " on-gpu" : ""
            }`}
            title="Synthesis runs on the GPU"
          >
            WebGPU
          </span>
        ) : null}
        {isPanel ? (
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
        ) : null}
      </header>
      <Rail
        sessions={sessions}
        activeId={activeId}
        recordingId={null}
        modified={false}
        storage={MOCK_STORAGE}
        perf={perf}
        onNewDocument={() => undefined}
        onOpen={() => undefined}
        onDelete={() => undefined}
        onExport={() => undefined}
        onReset={() => undefined}
      />
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
    </div>
  );
}
