// Frame-driven mirror of the real ReaderView. Same DOM structure and class
// names — driven by props instead of an audio element + worker. The only
// material difference is the highlight: we split the source text into
// before/active/after spans instead of using the CSS Custom Highlight API,
// because Remotion's headless Chrome doesn't paint Highlight ranges
// reliably.

import { VoiceChip } from "../../../src/components/VoiceChip";
import type { AppStatus } from "../../../src/types";
import type { VoiceId } from "../../../src/worker/kokoro.worker";

const WORDS_PER_MIN = 150;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateMinutes(words: number, speed: number): number {
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / (WORDS_PER_MIN * speed)));
}

function fmtTime(t: number): string {
  const safe = Number.isFinite(t) && t > 0 ? t : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface DemoReaderViewProps {
  status: AppStatus;
  title: string;
  sourceText: string;
  voice: VoiceId;
  speed: number;
  /** Frame-driven playback position in seconds. */
  currentTime: number;
  /** Total session duration in seconds. */
  durationSec: number;
  /** Per-chunk duration; runs cumulatively to map currentTime → chunk index. */
  chunkDurations: number[];
  /** Per-chunk source-text slices. Must mirror chunkDurations 1:1. */
  chunkTexts: string[];
  /** Show the dock at all? In the side-panel scene we always want it visible. */
  showDock: boolean;
  /** Playback state — drives the play/pause icon in the dock. */
  playing: boolean;
  /** Voice currently highlighted in the popover (visual-only, for stills). */
  voicePreviewing?: VoiceId | null;
  /** Force the VoiceChip popover open — for the voices scene. */
  voiceOpen?: boolean;
}

export function DemoReaderView(props: DemoReaderViewProps): React.JSX.Element {
  const {
    status,
    title,
    sourceText,
    voice,
    speed,
    currentTime,
    durationSec,
    chunkDurations,
    chunkTexts,
    showDock,
    playing,
    voicePreviewing,
    voiceOpen,
  } = props;

  const words = countWords(sourceText);
  const estMin = estimateMinutes(words, speed);
  const recordLabel = `Generate · ${estMin} min`;

  // Locate the active chunk in the source text.
  let cumulative = 0;
  let activeIdx = -1;
  for (let i = 0; i < chunkDurations.length; i++) {
    cumulative += chunkDurations[i] ?? 0;
    if (currentTime < cumulative) {
      activeIdx = i;
      break;
    }
  }
  if (activeIdx === -1 && chunkDurations.length > 0) activeIdx = chunkDurations.length - 1;

  // Split sourceText into before / active / after, using the first match
  // of the active chunk text. Falls back to no-highlight if not found.
  let before = sourceText;
  let active = "";
  let after = "";
  if (activeIdx >= 0) {
    const chunk = chunkTexts[activeIdx] ?? "";
    const idx = chunk ? sourceText.indexOf(chunk) : -1;
    if (idx >= 0) {
      before = sourceText.slice(0, idx);
      active = sourceText.slice(idx, idx + chunk.length);
      after = sourceText.slice(idx + chunk.length);
    }
  }

  const playedPct = durationSec > 0 ? Math.min(100, (currentTime / durationSec) * 100) : 0;
  // Prepared (buffered) leads the playhead by a fixed margin to evoke the
  // progressive HLS feel.
  const preparedPct = Math.min(100, playedPct + 12);

  return (
    <>
      <header className="topbar">
        <div className="crumbs">
          <b>{title}</b>
          <span className="topbar-meta">saved May 22</span>
        </div>
        <div className="right">
          {status.kind === "ready" ? <span className="chip-sm good">Ready</span> : null}
          {status.kind === "synthesising" ? (
            <span className="chip-sm synth">Recording…</span>
          ) : null}
        </div>
      </header>

      <div className="stage">
        <div className="composer">
          <div
            className="editable-text"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: visual-only mirror
            tabIndex={-1}
            style={{ outline: "none" }}
          >
            {before}
            {active ? (
              <span
                style={{
                  background: "rgba(91, 108, 255, 0.18)",
                  borderRadius: 3,
                  boxShadow: "0 0 0 1px rgba(91, 108, 255, 0.25) inset",
                  // Soften the box edges where the highlight wraps lines.
                  padding: "1px 2px",
                  margin: "0 -2px",
                }}
              >
                {active}
              </span>
            ) : null}
            {after}
          </div>

          <div className="toolbar">
            <VoiceChip
              voice={voice}
              previewVoice={voicePreviewing ?? null}
              status={status}
              onChangeVoice={() => undefined}
              onPreviewVoice={() => undefined}
              forceOpen={voiceOpen}
            />
            <span className="spacer" />
            <button type="button" className="send" disabled>
              <svg width="14" height="12" viewBox="0 0 16 14" aria-hidden="true" fill="currentColor">
                <rect x="1" y="5" width="2" height="4" rx="1" />
                <rect x="5" y="2" width="2" height="10" rx="1" />
                <rect x="9" y="4" width="2" height="6" rx="1" />
                <rect x="13" y="6" width="2" height="2" rx="1" />
              </svg>
              {recordLabel}
            </button>
          </div>
        </div>

        {showDock ? (
          <div className="dock">
            <span className="stamp">ready</span>
            <div className="player-fake">
              <button type="button" className="play-btn" aria-label={playing ? "Pause" : "Play"}>
                {playing ? (
                  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                    <rect x="0" y="0" width="3" height="12" fill="currentColor" />
                    <rect x="7" y="0" width="3" height="12" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
                    <polygon points="1,0 11,6 1,12" fill="currentColor" />
                  </svg>
                )}
              </button>
              <div className="scrub">
                <div className="prepared" style={{ width: `${preparedPct}%` }} />
                <div className="played" style={{ width: `${playedPct}%` }} />
              </div>
              <span className="time">
                {fmtTime(currentTime)} / {fmtTime(durationSec)}
              </span>
              <button type="button" className="speed-btn">
                {speed}×
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

