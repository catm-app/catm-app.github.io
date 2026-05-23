import { useEffect } from "react";
import { BASIC_TIER, PRO_TIER, formatMb } from "../modelConfig";

// Basic is the only tier that's actually downloadable today. Pro is marked
// "coming soon" — the upstream Qwen3-TTS pipeline failed under the browser's
// WebGPU EP and is parked until that's resolved.

export type TierState =
  | { kind: "ready" }
  | { kind: "downloading"; loadedMb: number; totalMb: number; fraction: number }
  | { kind: "absent" }
  | { kind: "error"; message: string };

interface ModelManagerProps {
  basicState: TierState;
  synthInProgress?: boolean;
  onClose: () => void;
  onRemoveBasic: () => void;
}

export function ModelManager({
  basicState,
  synthInProgress,
  onClose,
  onRemoveBasic,
}: ModelManagerProps): React.JSX.Element {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button type="button" className="scrim" onClick={onClose} aria-label="Close model panel" />
      <aside
        className="pop pop-model pop-model-manager"
        aria-label="Voice models"
        style={{ left: 16, bottom: 64, width: 360 }}
      >
        <div className="pop-head">
          <h4>Voice models</h4>
          <button type="button" className="x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <BasicCard state={basicState} synthInProgress={synthInProgress} onRemove={onRemoveBasic} />

        <ProComingSoonCard />

        <p className="help">
          Voice models run on this device. <b>Remove</b> frees the disk space. Pro voices ship when
          the larger model loads reliably in the browser — not yet.
        </p>
      </aside>
    </>
  );
}

function BasicCard({
  state,
  synthInProgress,
  onRemove,
}: {
  state: TierState;
  synthInProgress?: boolean;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <div className="tier-card" data-testid="tier-card-basic">
      <div className="tier-head">
        <span className="label">Basic</span>
        <span className="family">
          · {BASIC_TIER.family} {BASIC_TIER.paramCount}
        </span>
        <span className="size">{formatMb(BASIC_TIER.sizeMb)}</span>
      </div>
      <div className="tier-meta">Pleasant, lightweight. Runs on any device.</div>
      <StatusRow state={state} sizeMb={BASIC_TIER.sizeMb} />
      {state.kind === "downloading" ? (
        <div className="progress">
          <i style={{ width: `${Math.min(100, Math.round(state.fraction * 100))}%` }} />
        </div>
      ) : null}
      {state.kind === "ready" ? (
        <div className="tier-actions">
          <button
            type="button"
            className="btn danger"
            onClick={onRemove}
            disabled={synthInProgress}
            aria-label="Remove Basic from device"
            data-testid="tier-remove-basic"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProComingSoonCard(): React.JSX.Element {
  return (
    <div className="tier-card" data-testid="tier-card-pro" aria-disabled="true">
      <div className="tier-head">
        <span className="label" style={{ opacity: 0.6 }}>
          Pro
        </span>
        <span className="badge-pro">Pro</span>
        <span className="family" style={{ opacity: 0.6 }}>
          · {PRO_TIER.family} {PRO_TIER.paramCount}
        </span>
        <span className="size" style={{ opacity: 0.6 }}>
          {formatMb(PRO_TIER.sizeMb)}
        </span>
      </div>
      <div className="tier-meta">Closer to human, 9 named voices.</div>
      <div className="tier-status">
        <span className="state idle">Coming soon</span>
      </div>
    </div>
  );
}

function StatusRow({ state, sizeMb }: { state: TierState; sizeMb: number }): React.JSX.Element {
  if (state.kind === "ready") {
    return (
      <div className="tier-status">
        <span className="state ready">On device</span>
        <span className="frac">{formatMb(sizeMb)}</span>
      </div>
    );
  }
  if (state.kind === "downloading") {
    const pct = Math.round(state.fraction * 100);
    return (
      <div className="tier-status">
        <span className="state downloading">Downloading</span>
        <span className="frac">
          {state.loadedMb.toFixed(1)} / {state.totalMb.toFixed(1)} MB · {pct}%
        </span>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="tier-status">
        <span className="state error">Failed</span>
        <span className="frac">{state.message}</span>
      </div>
    );
  }
  return (
    <div className="tier-status">
      <span className="state idle">Not on device</span>
      <span className="frac">{formatMb(sizeMb)} to download</span>
    </div>
  );
}
