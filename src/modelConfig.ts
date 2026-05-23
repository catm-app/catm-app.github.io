// Single source of truth for user-facing model metadata. Copy lives here so the
// onboarding card, model popover, and confirm dialogs can't drift apart.

export interface ModelTier {
  family: string;
  paramCount: string;
  sizeMb: number;
  blurb: string;
}

export const BASIC_TIER: ModelTier = {
  family: "Kokoro",
  paramCount: "82M",
  // model.onnx (fp32) on HF is 325,532,232 bytes ≈ 310 MiB.
  sizeMb: 310,
  blurb: "pleasant, lightweight",
};

// Pro tier metadata stays for the manager's "coming soon" card. The
// underlying Qwen3-TTS pipeline is parked until the browser WebGPU EP
// regression that broke code_predictor is sorted.
export const PRO_TIER: ModelTier = {
  family: "Qwen3-TTS",
  paramCount: "0.6B",
  sizeMb: 5800,
  blurb: "9 named voices, larger download",
};

// Alias retained because existing imports still reference LOW_TIER.
export const LOW_TIER = BASIC_TIER;

export function formatMb(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} gb`;
  return `${Math.round(mb)} mb`;
}
