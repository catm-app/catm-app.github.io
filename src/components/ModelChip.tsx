import { BASIC_TIER } from "../modelConfig";

// Pro is parked "coming soon" — the chip just labels the active model and
// opens the manager popover on click. No tier switching menu while Pro is
// disabled; when Pro ships this becomes a real picker again.

interface ModelChipProps {
  downloading?: { loadedMb: number; totalMb: number; fraction: number } | null;
  disabled?: boolean;
  onOpenManager: () => void;
}

export function ModelChip({
  downloading,
  disabled,
  onOpenManager,
}: ModelChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="pill model is-basic"
      disabled={disabled}
      onClick={onOpenManager}
      data-testid="model-chip"
      aria-label="Open model manager"
    >
      <span className={downloading ? "dot spinning" : "dot"} aria-hidden="true" />
      <span className="k">Model</span>
      <span className="v">Basic · {BASIC_TIER.family}</span>
      {downloading ? (
        <span className="frac-inline" data-testid="model-chip-frac">
          {downloading.loadedMb.toFixed(0)} / {downloading.totalMb.toFixed(0)} MB
        </span>
      ) : null}
    </button>
  );
}
