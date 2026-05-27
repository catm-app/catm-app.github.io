// Mock fixtures matching catm's runtime types. Imported only as types from
// ../../src/* so the demo bundle never pulls in idb / fflate / worker code.
import type { PerfState } from "../../src/types";
import type { SessionMeta, StorageBreakdown } from "../../src/storage/sessionTypes";

// Realistic article text used by the "side panel reading" scene. Three
// short paragraphs so the highlight can travel through several chunks
// without scrolling becoming a wall.
export const SAMPLE_TEXT = `The deep ocean is the largest and most mysterious habitat on Earth. Below the sunlit surface waters, a vast world of perpetual darkness, crushing pressure, and near-freezing temperatures stretches down for thousands of metres. For most of human history, we knew almost nothing about it.

What we have learned is that the deep sea is not empty. It hosts towering coral gardens, hydrothermal vents that bloom with chemosynthetic life, and animals that glow with their own light. Many of these species exist nowhere else.

Sound carries further than light underwater, so whales use it to call each other across entire ocean basins. Their songs can travel for hundreds of kilometres before fading into the static of the sea.`;

// Pre-tokenised chunks the side-panel scene highlights in sequence. These
// mirror what the worker would emit from kokoro-js's TextSplitterStream
// for the SAMPLE_TEXT above — one sentence per chunk.
export const SAMPLE_CHUNKS: string[] = [
  "The deep ocean is the largest and most mysterious habitat on Earth.",
  "Below the sunlit surface waters, a vast world of perpetual darkness, crushing pressure, and near-freezing temperatures stretches down for thousands of metres.",
  "For most of human history, we knew almost nothing about it.",
  "What we have learned is that the deep sea is not empty.",
  "It hosts towering coral gardens, hydrothermal vents that bloom with chemosynthetic life, and animals that glow with their own light.",
  "Many of these species exist nowhere else.",
  "Sound carries further than light underwater, so whales use it to call each other across entire ocean basins.",
  "Their songs can travel for hundreds of kilometres before fading into the static of the sea.",
];

// Per-chunk durations in seconds (~150 wpm).
export const SAMPLE_CHUNK_DURATIONS: number[] = [4.2, 7.8, 3.4, 3.6, 7.5, 2.6, 6.4, 5.2];

const NOW = Date.UTC(2026, 4, 22, 14, 0);
const DAY = 86_400_000;

export const MOCK_SESSIONS: SessionMeta[] = [
  {
    id: "s-current",
    title: "The deep ocean is the largest and most mysterio…",
    sourceText: SAMPLE_TEXT,
    createdAt: NOW,
    durationSec: 40,
    lastPositionSec: 0,
    finishedAt: null,
    voice: "af_heart",
    modelId: "kokoro-82m-low",
    chunkDurations: SAMPLE_CHUNK_DURATIONS,
    chunkTexts: SAMPLE_CHUNKS,
  },
  {
    id: "s-meditations",
    title: "Meditations · Book IV",
    sourceText: "",
    createdAt: NOW - DAY,
    durationSec: 22 * 60,
    lastPositionSec: 0,
    finishedAt: NOW - DAY + 22 * 60_000,
    voice: "am_michael",
    modelId: "kokoro-82m-low",
  },
  {
    id: "s-rfc-9110",
    title: "RFC 9110 — HTTP Semantics §15",
    sourceText: "",
    createdAt: NOW - 3 * DAY,
    durationSec: 9 * 60 + 12,
    lastPositionSec: 0,
    finishedAt: NOW - 3 * DAY + 552_000,
    voice: "af_bella",
    modelId: "kokoro-82m-low",
  },
  {
    id: "s-tolstoy",
    title: "What Men Live By — Tolstoy",
    sourceText: "",
    createdAt: NOW - 6 * DAY,
    durationSec: 38 * 60 + 4,
    lastPositionSec: 14 * 60,
    finishedAt: null,
    voice: "af_heart",
    modelId: "kokoro-82m-low",
  },
];

export const MOCK_STORAGE: StorageBreakdown = {
  // Numbers tuned to look plausible: 320 MB voice, 18 MB sessions, ~1.2 GB headroom.
  voiceBytes: 320 * 1024 * 1024,
  sessionsBytes: 18 * 1024 * 1024,
  quotaBytes: 1.5 * 1024 * 1024 * 1024,
  headroomBytes: (1.5 * 1024 - 320 - 18) * 1024 * 1024,
  persisted: true,
};

export const MOCK_PERF: PerfState = {
  device: {
    device: "webgpu",
    adapterName: "Apple M3 Pro",
    adapterVendor: "Apple",
    features: ["shader-f16", "timestamp-query"],
    sessionInitMs: 612,
  },
  // 60-point sparkline that hovers around realtime-equivalent throughput.
  synthSamplesPerSec: Array.from({ length: 60 }, (_, i) => {
    const base = 240_000;
    const wave = Math.sin(i / 7) * 30_000;
    const noise = (i * 9301 + 49297) % 233_280;
    return Math.max(0, base + wave + (noise / 233_280) * 20_000);
  }),
  memoryMb: Array.from({ length: 60 }, (_, i) => 220 + Math.sin(i / 9) * 18),
  memoryApiAvailable: true,
  lastSynth: { wallMs: 8400, audioSec: 39.7 },
};

// Article rendered in the "select text" scene (a fake third-party page).
// Lifted from the SAMPLE_TEXT first paragraph so the selection feels real.
export const ARTICLE_TITLE = "The deep sea has been hiding from us";
export const ARTICLE_LEAD =
  "The deep ocean is the largest and most mysterious habitat on Earth. Below the sunlit surface waters, a vast world of perpetual darkness, crushing pressure, and near-freezing temperatures stretches down for thousands of metres.";
