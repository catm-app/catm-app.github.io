// Design tokens lifted directly from catm's src/app.css so the demo
// visually matches the real app.

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

// Fonts are loaded eagerly at module load. Without this the headless Chrome
// in the renderer would silently fall back to DejaVu Sans / Mono and the
// video would not match catm's visual identity.
const { fontFamily: INTER_FAMILY } = loadInter();
const { fontFamily: JBM_FAMILY } = loadJetBrainsMono();

export const FPS = 30;

export const SCENES = {
  hook: 150, // 5s
  promise: 150, // 5s
  privacy: 300, // 10s
  progressive: 360, // 12s
  how: 240, // 8s
  cta: 180, // 6s
} as const;

export const TRANSITION_FRAMES = 12; // 0.4s

// Total frames in the composition.
// Sum of sequences minus overlap from transitions.
const SEQ_TOTAL = Object.values(SCENES).reduce((a, b) => a + b, 0);
const NUM_TRANSITIONS = Object.keys(SCENES).length - 1;
export const TOTAL_FRAMES = SEQ_TOTAL - NUM_TRANSITIONS * TRANSITION_FRAMES;

export const COLORS = {
  bg: "#fafbfc",
  bgSurface: "#ffffff",
  bgSoft: "#f4f5f7",
  border: "#e6e8ec",
  borderStrong: "#d4d7de",
  ink0: "#0d0e12",
  ink1: "#2a2d35",
  ink2: "#585d6b",
  ink3: "#8c92a3",
  ink4: "#b4b8c4",
  accent: "#5b6cff",
  accentMid: "#7480ff",
  accentEnd: "#8a98ff",
  accentSoft: "#eef0ff",
  accentInk: "#3b48cc",
  good: "#16a06f",
  goodSoft: "rgba(22, 160, 111, 0.10)",
  warn: "#b6552b",
  danger: "#c44a4a",
  dangerSoft: "#fde8e8",
} as const;

export const GRADIENT = `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentEnd})`;

export const FONT = {
  sans: `${INTER_FAMILY}, ui-sans-serif, system-ui, -apple-system, sans-serif`,
  mono: `${JBM_FAMILY}, ui-monospace, "SF Mono", Menlo, monospace`,
} as const;

export const SHADOW = {
  sm: "0 1px 2px rgba(13, 14, 18, 0.06)",
  md: "0 1px 2px rgba(13, 14, 18, 0.04), 0 8px 28px rgba(13, 14, 18, 0.06)",
  lg: "0 1px 2px rgba(13, 14, 18, 0.04), 0 24px 60px rgba(13, 14, 18, 0.10)",
  brand: "0 6px 24px rgba(91, 108, 255, 0.35)",
} as const;
