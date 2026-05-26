// Worker-safe encoding utilities. No DOM-only APIs (e.g. OfflineAudioContext)
// because this file is imported from kokoro.worker.ts.
import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  Mp4OutputFormat,
  Output,
  StreamTarget,
  type StreamTargetChunk,
} from "mediabunny";

export const ENCODE_SAMPLE_RATE = 48_000;
export const AAC_FRAME_SIZE = 1024;
export const AAC_BITRATE = 64_000;

const ENCODING_CONFIG = { codec: "aac" as const, bitrate: AAC_BITRATE };

/**
 * 2× linear upsampler. Kokoro emits 24000 Hz; Chrome's WebCodecs AAC encoder
 * only accepts 44100 or 48000 Hz. For 24000 → 48000 the ratio is exactly 2,
 * and linear interpolation introduces no aliasing (the source is band-limited
 * below 12 kHz, well under the new Nyquist).
 */
export function linearUpsample2x(input: Float32Array): Float32Array {
  const n = input.length;
  if (n === 0) return new Float32Array(0);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n - 1; i++) {
    const a = input[i] as number;
    const b = input[i + 1] as number;
    out[i * 2] = a;
    out[i * 2 + 1] = (a + b) * 0.5;
  }
  const last = input[n - 1] as number;
  out[(n - 1) * 2] = last;
  out[(n - 1) * 2 + 1] = last;
  return out;
}

function toEncodeRate(pcm: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === ENCODE_SAMPLE_RATE) return pcm;
  if (inputSampleRate * 2 === ENCODE_SAMPLE_RATE) return linearUpsample2x(pcm);
  throw new Error(`unsupported input rate ${inputSampleRate}`);
}

/** One-shot encode used by the voice-preview path on the main thread. */
export async function encodePcmToCompleteMp4(
  pcmIn: Float32Array,
  inputSampleRate: number,
): Promise<{ bytes: Uint8Array; durationSec: number }> {
  const pcm = toEncodeRate(pcmIn, inputSampleRate);

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "fragmented" }),
    target,
  });
  const source = new AudioSampleSource(ENCODING_CONFIG);
  output.addAudioTrack(source);
  await output.start();
  const sample = new AudioSample({
    data: pcm,
    format: "f32-planar",
    sampleRate: ENCODE_SAMPLE_RATE,
    numberOfChannels: 1,
    timestamp: 0,
  });
  await source.add(sample);
  sample.close();
  await output.finalize();
  if (!target.buffer) throw new Error("mediabunny BufferTarget produced no buffer");
  return {
    bytes: new Uint8Array(target.buffer),
    durationSec: pcm.length / ENCODE_SAMPLE_RATE,
  };
}

/**
 * Stateful fragmenter: feed PCM chunks at the source sample rate, get init +
 * media fragments out via callbacks. One instance per synthesis session.
 *
 * Encoding (including timestamp management) is delegated to mediabunny's
 * AudioSampleSource. We only feed it raw PCM with monotonic timestamps and
 * box-parse the resulting fMP4 byte stream into init + per-fragment slices.
 */
export class ProgressiveEncoder {
  private output: Output | null = null;
  private source: AudioSampleSource | null = null;
  private inputSampleRate: number;

  private buffer = new Uint8Array(0);
  private writtenEnd = 0;
  private parsedOffset = 0;
  private initEmitted = false;
  private pendingMoofStart: number | null = null;
  private fragmentIndex = 0;
  private samplesEncoded = 0;
  private closed = false;

  constructor(
    inputSampleRate: number,
    private readonly onInit: (bytes: Uint8Array) => void,
    private readonly onFragment: (index: number, bytes: Uint8Array, durationSec: number) => void,
  ) {
    this.inputSampleRate = inputSampleRate;
    if (inputSampleRate !== ENCODE_SAMPLE_RATE && inputSampleRate * 2 !== ENCODE_SAMPLE_RATE) {
      throw new Error(`unsupported input rate ${inputSampleRate}`);
    }
  }

  async start(): Promise<void> {
    const writable = new WritableStream<StreamTargetChunk>({
      write: (chunk) => {
        this.onBytes(chunk.data, chunk.position);
        this.drainBoxes();
      },
    });
    this.output = new Output({
      format: new Mp4OutputFormat({ fastStart: "fragmented", minimumFragmentDuration: 2.0 }),
      target: new StreamTarget(writable),
    });
    this.source = new AudioSampleSource(ENCODING_CONFIG);
    this.output.addAudioTrack(this.source);
    await this.output.start();
  }

  async pushChunk(pcm: Float32Array): Promise<void> {
    if (!this.source) throw new Error("encoder not started");
    const upsampled = toEncodeRate(pcm, this.inputSampleRate);
    if (upsampled.length === 0) return;
    const sample = new AudioSample({
      data: upsampled,
      format: "f32-planar",
      sampleRate: ENCODE_SAMPLE_RATE,
      numberOfChannels: 1,
      timestamp: this.samplesEncoded / ENCODE_SAMPLE_RATE,
    });
    this.samplesEncoded += upsampled.length;
    await this.source.add(sample);
    sample.close();
  }

  async finish(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.output?.finalize();
    this.drainBoxes();
  }

  private onBytes(data: Uint8Array, position: number): void {
    const end = position + data.length;
    if (end > this.buffer.length) {
      const next = new Uint8Array(end);
      next.set(this.buffer, 0);
      this.buffer = next;
    }
    this.buffer.set(data, position);
    if (end > this.writtenEnd) this.writtenEnd = end;
  }

  private drainBoxes(): void {
    while (this.parsedOffset + 8 <= this.writtenEnd) {
      const boxStart = this.parsedOffset;
      const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
      const size = view.getUint32(boxStart);
      const type = readBoxType(this.buffer, boxStart + 4);
      let step: number;
      if (size === 1) {
        if (boxStart + 16 > this.writtenEnd) return;
        const hi = view.getUint32(boxStart + 8);
        const lo = view.getUint32(boxStart + 12);
        step = hi * 2 ** 32 + lo;
      } else if (size === 0) {
        return;
      } else {
        step = size;
      }
      if (boxStart + step > this.writtenEnd) return;
      const boxEnd = boxStart + step;

      if (!this.initEmitted) {
        // Init segment is everything up to (but not including) the first moof.
        if (type === "moof") {
          const initBytes = this.buffer.slice(0, boxStart);
          this.initEmitted = true;
          this.onInit(initBytes);
          this.pendingMoofStart = boxStart;
        } else {
          // ftyp, moov, free, etc. — keep accumulating into init.
        }
      } else if (type === "moof") {
        this.pendingMoofStart = boxStart;
      } else if (type === "mdat" && this.pendingMoofStart !== null) {
        const fragStart = this.pendingMoofStart;
        const fragBytes = this.buffer.slice(fragStart, boxEnd);
        const sampleCount = readMoofSampleCount(this.buffer, fragStart, boxEnd);
        const durationSec = (sampleCount * AAC_FRAME_SIZE) / ENCODE_SAMPLE_RATE;
        const index = this.fragmentIndex++;
        this.pendingMoofStart = null;
        this.onFragment(index, fragBytes, durationSec);
      }
      this.parsedOffset = boxEnd;
    }
  }
}

function readBoxType(buf: Uint8Array, offset: number): string {
  return String.fromCharCode(
    buf[offset] as number,
    buf[offset + 1] as number,
    buf[offset + 2] as number,
    buf[offset + 3] as number,
  );
}

function readMoofSampleCount(buf: Uint8Array, moofStart: number, moofEnd: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = moofStart + 8; // skip moof header
  while (p + 8 <= moofEnd) {
    const sz = view.getUint32(p);
    const ty = readBoxType(buf, p + 4);
    if (ty === "traf") {
      let q = p + 8;
      const trafEnd = p + sz;
      while (q + 8 <= trafEnd) {
        const sz2 = view.getUint32(q);
        const ty2 = readBoxType(buf, q + 4);
        if (ty2 === "trun") {
          // full box: 1 byte version + 3 bytes flags, then sample_count (4)
          return view.getUint32(q + 12);
        }
        if (sz2 < 8) return 0;
        q += sz2;
      }
    }
    if (sz < 8) return 0;
    p += sz;
  }
  return 0;
}
