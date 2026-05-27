export type View = "reader";

export type AppStatus =
  | { kind: "loading" } // worker booting / preparing — model not yet downloading
  | { kind: "downloading"; loadedMb: number; totalMb: number; fraction: number }
  | { kind: "ready"; device: "webgpu" | "wasm" }
  | { kind: "synthesising" }
  | { kind: "error"; message: string };

import type { VoiceId } from "./worker/kokoro.worker";
import type { DeviceInfo } from "./worker/workerProtocol";

export interface DocState {
  id: string | null; // null = unsaved new document
  sourceText: string;
  savedText: string;
  hasAudio: boolean; // when true, ReaderView attaches hls.js to this session's id
  audioVoice: VoiceId | null; // voice the saved audio was recorded with
}

export interface PerfState {
  device: DeviceInfo | null;
  synthSamplesPerSec: number[]; // 60 samples of PCM samples/sec
  // Rolling memory readings (MB) from performance.measureUserAgentSpecificMemory().
  // NaN entries mean "not yet sampled" or "API unavailable" for that slot.
  memoryMb: number[];
  // Set once isolation is known. null means "not yet known"; false means
  // the API is unavailable (no COI / unsupported browser).
  memoryApiAvailable: boolean | null;
  lastSynth: { wallMs: number; audioSec: number } | null;
}
