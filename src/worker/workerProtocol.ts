// Pure state machine for the worker message protocol. No browser APIs, no
// ORT — dependencies are injected so vitest (node env) can drive it.

import type { VoiceId } from "./types";

// The voice type is a parameter so each tier can supply its own union (Kokoro
// has `VoiceId`, Qwen has `QwenVoiceId`). Defaults to Kokoro so existing
// imports keep their narrowing without modification.
export type InMsg<V extends string = VoiceId> =
  | { type: "warmup" }
  | { type: "synth"; id: number; text: string; voice?: V }
  | { type: "synth-start"; txnId: number; voice?: V }
  | { type: "synth-text"; txnId: number; text: string }
  | { type: "synth-end"; txnId: number }
  | { type: "synth-cancel"; txnId: number };

export type LoadedDevice = "webgpu" | "wasm";

export interface DeviceInfo {
  device: LoadedDevice;
  // Best-effort adapter description. Empty strings when not available
  // (e.g. WASM path or browser hides the info for privacy).
  adapterName: string;
  adapterVendor: string;
  features: string[]; // e.g. ["shader-f16", "timestamp-query"]
  // Session init wall-clock time, measured once.
  sessionInitMs: number;
}

export type OutMsg =
  | { type: "ready"; device: LoadedDevice; info: DeviceInfo }
  | { type: "error"; id?: number; txnId?: number; message: string }
  | { type: "synth-result"; id: number; pcm: Float32Array; sampleRate: number }
  | { type: "fragment-init"; txnId: number; bytes: Uint8Array }
  | {
      type: "fragment-media";
      txnId: number;
      index: number;
      bytes: Uint8Array;
      durationSec: number;
    }
  | { type: "synth-end-ok"; txnId: number; wallMs: number; audioSec: number }
  | { type: "synth-cancelled"; txnId: number }
  | { type: "chunk-encoded"; txnId: number; text: string; durationSec: number; samples: number }
  | {
      type: "progress";
      status: string;
      file?: string | undefined;
      loaded?: number | undefined;
      total?: number | undefined;
    };

export interface Encoder {
  start(): void;
  pushChunk(pcm: Float32Array): Promise<void>;
  finish(): Promise<void>;
}

export interface WorkerDeps<V extends string = VoiceId> {
  load: () => Promise<DeviceInfo>;
  synthesizePcm: (text: string, voice: V) => Promise<Float32Array>;
  streamSentences: (
    text: string,
    voice: V,
    onSentence: (s: { text: string; pcm: Float32Array }) => Promise<void>,
    isCancelled: () => boolean,
  ) => Promise<void>;
  createEncoder: (
    sampleRate: number,
    onInit: (bytes: Uint8Array) => void,
    onSegment: (index: number, bytes: Uint8Array, durationSec: number) => void,
  ) => Encoder;
  post: (msg: OutMsg, transfer?: Transferable[]) => void;
  sampleRate: number;
  defaultVoice: V;
}

export interface ActiveStream<V extends string = VoiceId> {
  txnId: number;
  voice: V;
  encoder: Encoder;
  startMs: number;
  audioSec: number;
}

export interface Handlers<V extends string = VoiceId> {
  onMessage(msg: InMsg<V>): void;
  // Exposed for tests: lets a test await all currently queued work without
  // poking workQueue directly.
  drain(): Promise<void>;
}

export function createHandlers<V extends string = VoiceId>(deps: WorkerDeps<V>): Handlers<V> {
  let stream: ActiveStream<V> | null = null;
  // Cancelled txnIds — subsequent chunk/end messages drop silently.
  const cancelledTxnIds = new Set<number>();
  // Errored txnIds — once a chunk has failed for this txnId we drop later
  // chunk/end messages silently to avoid a cascade of "no active synth
  // stream" errors clobbering the real failure in the UI.
  const erroredTxnIds = new Set<number>();
  // Serialise async handling: Chrome dispatches the next message while a
  // previous handler is awaiting, which would let a chunk's `await` resume
  // after a later `synth-end` tore down the encoder.
  let workQueue: Promise<unknown> = Promise.resolve();

  function onMessage(msg: InMsg<V>): void {
    // Cancel must be processed out-of-band — queueing it would defeat the
    // purpose (it'd sit behind every already-posted chunk).
    if (msg.type === "synth-cancel") {
      handleCancel(msg.txnId);
      return;
    }
    workQueue = workQueue.then(() => handle(msg));
  }

  function handleCancel(txnId: number): void {
    cancelledTxnIds.add(txnId);
    if (stream && stream.txnId === txnId) stream = null;
    deps.post({ type: "synth-cancelled", txnId });
  }

  async function handle(msg: InMsg<V>): Promise<void> {
    try {
      if (msg.type === "warmup") {
        const info = await deps.load();
        deps.post({ type: "ready", device: info.device, info });
        return;
      }
      if (msg.type === "synth") {
        const voice = msg.voice ?? deps.defaultVoice;
        const pcm = await deps.synthesizePcm(msg.text, voice);
        deps.post({ type: "synth-result", id: msg.id, pcm, sampleRate: deps.sampleRate }, [
          pcm.buffer,
        ]);
        return;
      }
      if (msg.type === "synth-start") {
        await deps.load();
        const txnId = msg.txnId;
        cancelledTxnIds.delete(txnId);
        erroredTxnIds.delete(txnId);
        const voice = msg.voice ?? deps.defaultVoice;
        const encoder = deps.createEncoder(
          deps.sampleRate,
          (bytes) => deps.post({ type: "fragment-init", txnId, bytes }, [bytes.buffer]),
          (index, bytes, durationSec) =>
            deps.post({ type: "fragment-media", txnId, index, bytes, durationSec }, [bytes.buffer]),
        );
        encoder.start();
        stream = { txnId, voice, encoder, startMs: performance.now(), audioSec: 0 };
        return;
      }
      if (msg.type === "synth-text") {
        if (cancelledTxnIds.has(msg.txnId)) return;
        if (erroredTxnIds.has(msg.txnId)) return;
        if (!stream || stream.txnId !== msg.txnId) throw new Error("no active synth stream");
        const active = stream;
        await deps.streamSentences(
          msg.text,
          stream.voice,
          async ({ text: sentenceText, pcm }) => {
            if (cancelledTxnIds.has(msg.txnId)) return;
            await active.encoder.pushChunk(pcm);
            const durationSec = pcm.length / deps.sampleRate;
            active.audioSec += durationSec;
            deps.post({
              type: "chunk-encoded",
              txnId: msg.txnId,
              text: sentenceText,
              durationSec,
              samples: pcm.length,
            });
          },
          () => cancelledTxnIds.has(msg.txnId),
        );
        return;
      }
      if (msg.type === "synth-end") {
        if (cancelledTxnIds.has(msg.txnId)) {
          cancelledTxnIds.delete(msg.txnId);
          return;
        }
        if (erroredTxnIds.has(msg.txnId)) {
          erroredTxnIds.delete(msg.txnId);
          return;
        }
        if (!stream || stream.txnId !== msg.txnId) throw new Error("no active synth stream");
        await stream.encoder.finish();
        const wallMs = performance.now() - stream.startMs;
        deps.post({
          type: "synth-end-ok",
          txnId: msg.txnId,
          wallMs,
          audioSec: stream.audioSec,
        });
        stream = null;
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Log into the worker console so devtools shows the real stack — the
      // posted error message gets stringified into the UI but the underlying
      // ORT/tensor traceback only lives on the worker side.
      console.error(`[worker] ${msg.type} failed:`, err);
      const errMsg: OutMsg = { type: "error", message };
      if ("id" in msg && typeof msg.id === "number") errMsg.id = msg.id;
      if ("txnId" in msg && typeof msg.txnId === "number") errMsg.txnId = msg.txnId;
      deps.post(errMsg);
      if ("txnId" in msg) {
        // Mark this txn as errored so any queued chunk/end messages drop
        // silently rather than re-raising "no active synth stream" and
        // clobbering the first error in the UI.
        if (typeof msg.txnId === "number") erroredTxnIds.add(msg.txnId);
        stream = null;
      }
    }
  }

  async function drain(): Promise<void> {
    await workQueue;
  }

  return { onMessage, drain };
}
