# Research — model selection for catm

*Last reviewed: 2026-05-22.*

This document covers the two model selection decisions for catm:

- **Part 1** — the *paragraph batcher*: accepts raw text, returns paragraph-sized batches of sentences for TTS input.
- **Part 2** — the *TTS model* per tier (Basic / Pro): accepts a batch of text, returns audio.

Both must execute in the browser, ideally on the same ONNX Runtime Web plus WebGPU stack, under permissive licenses. The product surfaces two tiers — **Basic** (Kokoro 82M, ~310 MB) and **Pro** (Qwen3-TTS 1.7B, ~3.3 GB at FP16) — chosen so the upgrade reason is unambiguous: faithfulness and naturalness, at roughly 10× the download.

---

## Headline recommendations

| Component | Pick | Confidence | Notes |
|---|---|---|---|
| Paragraph batcher | **`sat-3l-sm`** (wtpsplit) | **High** | Shared across tiers; segmentation is independent of voice quality |
| Basic TTS | **Kokoro 82M v1.0** | **High** | TTS Arena V2 ELO 1500 (45% win rate against the leaderboard). Highest-ranked open-weight model under 100M parameters. Browser plus WebGPU operation verified |
| Pro TTS | **Qwen3-TTS 1.7B** (`xkos/Qwen3-TTS-12Hz-1.7B-ONNX`) | **Medium** | Strongest published WER on the open-weight field (1.54% on Seed-TTS test-en per independent re-evaluation in the OmniVoice paper; 1.24% per Qwen self-report). Apache 2.0. FP16 ONNX export published as a component graph (speaker_encoder, speech_tokenizer_encoder, speech_tokenizer_decoder, code_predictor, code_predictor_kv, codec_embedding, 16× per-codebook embed tables). 9 built-in speakers (2 native English: Ryan, Aiden). Browser pipeline is engineering we own (same shape as Kokoro), not an external blocker |

PRD changes implied: the prior three-tier scheme (Low / Medium / High) is collapsed to **two tiers (Basic / Pro)**. A middle tier was hard to justify: Chatterbox-Turbo at ~200 MB undercut Kokoro's ~310 MB, and OmniVoice at ~800 MB – 1.1 GB sat awkwardly close to Pro. Two tiers give the user a clear choice — *Kokoro for everyone, Qwen for users who want the upgrade* — without a middle option that doesn't pay its own complexity cost. See §"Correction (2026-05-22): three tiers → two tiers" for the reasoning shift.

---

# Part 1 — paragraph batcher

**Objective.** Select a model that accepts raw text and returns batches of sentences with paragraph-level structure, each batch within a target token or character count, suitable as TTS input one batch per HLS segment.

## Recommendation

**`sat-3l-sm` from the wtpsplit / Segment-any-Text family.** Purpose-built for sentence and paragraph segmentation, distributed as ONNX, footprint a fraction of Kokoro's, predicts paragraph boundaries natively (both sentence-end and newline probabilities).

Since wtpsplit 2.2.0 (February 2026), the library supports **length-constrained segmentation with Viterbi (optimal) or greedy algorithms and configurable priors** (`uniform`, `gaussian`, `lognormal`, `clipped_polynomial`). Batching toward a target token count is a built-in operation; no separate JavaScript bin-packing implementation is required. The chunker pipeline reduces to a single call.

An LLM is not required for chunking. An LLM solves a more general problem at higher resource cost; a purpose-built segmenter is deterministic, smaller, faster to execute, and more testable.

If `sat-3l-sm` exceeds the evaluation resource budget, the fallback is `sat-1l-sm`. If higher segmentation quality is required, the upgrade is `sat-12l-sm` — identical API, identical runtime.

## Option A — wtpsplit / Segment-any-Text (SaT)

Purpose-built sentence-segmentation model from [`segment-any-text/wtpsplit`](https://github.com/segment-any-text/wtpsplit). Successor to nnsplit, trained on 85 languages, ONNX as a primary distribution format.

Library is at **2.2.1** (April 2025), with the **length-constrained segmentation** feature introduced in 2.2.0 (February 2026). The underlying SaT architecture is unchanged from the [EMNLP 2024 paper](https://aclanthology.org/2024.emnlp-main.665/); subsequent improvements are in runtime and API surface.

### Variants

| Model | Layers | English F1 | Multilingual F1 | Fit |
|---|---|---|---|---|
| `sat-1l-sm` | 1 | 88.5 | 84.3 | Smallest, baseline |
| `sat-3l-sm` | 3 | 93.7 | 89.2 | **Recommended.** Optimal speed/quality trade-off |
| `sat-6l-sm` | 6 | 94.1 | 89.7 | Diminishing quality returns |
| `sat-12l-sm` | 12 | 94.0 | 90.4 | Highest quality, largest |

An INT8-quantised ONNX export of `sat-3l-sm` is published at [`ModelCloud/sat-3l-sm-int8-onnx`](https://huggingface.co/ModelCloud/sat-3l-sm-int8-onnx). Pre-evaluation disk estimate: 50–80 MB.

### Rationale

- **Native paragraph boundary prediction** — sentence-end and newline probabilities produced in a single inference pass.
- **Length-constrained segmentation built-in** — `min_length`, `max_length`, Viterbi or greedy, configurable priors.
- **ONNX-native**, identical runtime to the TTS model.
- **Deterministic, offline-only execution** — simpler to test and cache than an LLM.

## Option B — small LLM (transformers.js)

Sub-1B-parameter instruction-tuned LLM prompted for chunking. **Not recommended** for this role.

| Model | Params | q4 size | Notes |
|---|---|---|---|
| `onnx-community/Qwen3-0.6B-ONNX` | 600 M | ~300 MB + ~2 GB runtime | Current small Qwen entry |
| `onnx-community/Qwen3.5-0.8B-ONNX` | 800 M | larger | Larger variant |
| `HuggingFaceTB/SmolLM2-360M-Instruct` | 360 M | ~250 MB | Earlier generation but small |
| `HuggingFaceTB/SmolLM3-3B` | 3 B | ~1.5 GB | Exceeds budget |
| `google/gemma-3-1b-it` | 1 B | ~700 MB | Doubles overall footprint |

Rejection criteria: 4× or greater Kokoro's size, non-deterministic output, slower per-token execution, and segmentation is precisely the constrained classification task a 200 M-parameter classifier was designed for.

## Option C — WebLLM

Separate browser LLM runtime from MLC. Higher throughput than transformers.js but introduces **two ML runtimes in the bundle and two WebGPU contexts**. Excluded unless the architecture moves to LLM-based segmentation.

## Option D — CharBoundary (alea-institute, April 2025)

Random forest, **0.6 MB ONNX file**, approximately 1 GB runtime RAM, F1 0.773 (versus SaT's 0.937), trained on legal-domain text. Quality and domain mismatch outweigh the disk-size advantage. Worth evaluating only as a fallback.

## Open questions for evaluation (chunker)

1. `sat-3l-sm` INT8 ONNX file size — verify.
2. Cold-load first-call latency.
3. RAM consumption during inference on a 12,000-word chapter.
4. Viterbi versus greedy length-constrained algorithm comparison.
5. Paragraph boundary quality on representative English long-form input.

---

# Part 2 — TTS tier selection (Basic / Pro)

**Objective.** Select the two tier models catm exposes. Each must:

1. Execute in the browser via ONNX Runtime Web plus WebGPU (or WASM fallback).
2. Be distributed under a permissive license (Apache 2.0 or MIT preferred).
3. Achieve naturalness sufficient for 10+ minute reads (PRD Goal #1).
4. Fit within a per-tier resource budget — disk and RAM — disclosed to the user.

The two tiers differ on the upgrade reason only — *faithfulness and naturalness*. Pro downloads roughly 4× more weight to deliver materially better WER and prosody; Basic is the always-available default that ships pleasant-but-synthetic audio at ~310 MB. Anything in between (Chatterbox-Turbo 350M, OmniVoice 0.8B, CosyVoice 3 0.5B) either fails to differentiate on quality enough to justify a separate tier or sits awkwardly close to Pro on download size — see §"Correction (2026-05-22): three tiers → two tiers".

## Browser-deployable TTS landscape (May 2026)

Three shifts in the last 12 months:

- **Sub-100M-parameter models reached production-grade quality.** Kokoro at 82M established the threshold; [Supertonic 3](https://huggingface.co/Supertone/supertonic-3) (~99M) and [MOSS-TTS-Nano](https://huggingface.co/OpenMOSS-Team/MOSS-TTS-Nano-100M) (~100M) are the recent sub-100M entrants.
- **ONNX is now a baseline distribution format for new TTS releases.** Resemble AI publishes [`ResembleAI/chatterbox-turbo-ONNX`](https://huggingface.co/ResembleAI/chatterbox-turbo-ONNX) alongside the PyTorch artifact, with q4, q8, fp16, and q4f16 quantisation variants. CosyVoice 3, Voxtral, and Higgs Audio also publish ONNX exports.
- **WebGPU is universally available in target browsers.** Combined with [Transformers.js v4](https://huggingface.co/blog/transformersjs-v3)'s native WebGPU backend (February 2026), the execution substrate is stable.

Top trending TTS models on HuggingFace as of May 2026 (from the trending list):

| # | Model | Approx. params | License | Browser-ready? |
|---|---|---|---|---|
| 1 | `Supertone/supertonic-3` | 99 M | **OpenRAIL-M** | Yes — designed for on-device including browser |
| 2 | `ResembleAI/Dramabox` | ? | ? | Unclear |
| 3 | `Aratako/Irodori-TTS-500M-v3` | 0.5 B | ? | Japanese-focused |
| 5 | `k2-fsa/OmniVoice` | ? | ? | 2.19 M downloads — investigate |
| 6 | `hexgrad/Kokoro-82M` | 82 M | **Apache 2.0** | **Verified operational** (Xenova) |
| 9 | `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` | 2 B | Apache 2.0 | Marginal — requires aggressive quantisation |
| 10 | `openbmb/VoxCPM2` | ? | ? | Server-class as of this writing |
| 11 | `coqui/XTTS-v2` | — | Coqui PL | Earlier model, license restrictions |
| 12 | `ResembleAI/chatterbox` | 0.35 B | **MIT** | Yes — official ONNX |
| 13 | `mistralai/Voxtral-4B-TTS-2603` | 4 B | Apache 2.0 | Exceeds browser budget |
| 14 | `FunAudioLLM/Fun-CosyVoice3-0.5B-2512` | 0.5 B | Apache 2.0 | ONNX export exists; browser execution unverified |
| 15 | `OpenMOSS-Team/MOSS-TTS-Nano-100M` | 100 M | ? | Candidate for evaluation |

Also tracked: [Orpheus TTS](https://github.com/canopyai/Orpheus-TTS) (Apache 2.0). The README lists 150M, 400M, 1B, and 3B variants, but **only the 3B is published as of 2026-05-22** — see §"Correction (2026-05-22)".

## Audio quality benchmarks

This section grounds tier selection in measurable data. **Caveat: the dataset is incomplete.** Open-weight TTS benchmarking in 2026 is fragmented. Leaderboards measure different attributes, paper benchmarks are vendor-reported, and most published metrics are computed on test sets that do not match catm's workload (long-form English prose read aloud).

### Subjective leaderboards (human preference)

Two third-party leaderboards aggregate blind A/B votes between TTS models. Both use ELO ratings; direct comparisons are valid *within* a leaderboard but not across them.

**[TTS Arena V2 (HuggingFace)](https://tts-agi-tts-arena-v2.hf.space/leaderboard)** — most active community voting:

| Rank | Model | ELO | Win rate | License |
|---|---|---|---|---|
| 1 | CastleFlow v1.0 | 1574 | 60% | Closed |
| 3 | Inworld TTS MAX | 1571 | 61% | Closed |
| 5 | Hume Octave | 1561 | 64% | Closed |
| 8 | Eleven Turbo v2.5 | 1539 | 57% | Closed |
| **16** | **Kokoro v1.0** | **1500** | **45%** | **Apache 2.0** |
| 25 | CosyVoice 2.0 | 1358 | 28% | Apache 2.0 |

Kokoro v1.0 is the only sub-100M open-weight model in the top 26. It wins 45% of head-to-head matchups — a substantive figure against a leaderboard dominated by closed-source frontier systems. The next open-weight entry (CosyVoice 2.0) trails by 142 ELO points. **No 1-2B open-weight TTS (Qwen3-TTS, Chatterbox-Turbo, Orpheus 1B/3B, Supertonic 3, Higgs Audio) has been ranked yet.** Until they are, quality is inferred from other signals.

**[Artificial Analysis TTS Leaderboard](https://artificialanalysis.ai/text-to-speech/leaderboard)** — heavier emphasis on API-served models:

| Rank | Model | ELO | License |
|---|---|---|---|
| 1 | Realtime TTS 1.5 Max | 1206 | Closed |
| 2 | Gemini 3.1 Flash TTS | 1205 | Closed |
| 3 | StepAudio 2.5 TTS | 1188 | Closed |
| 4 | Eleven v3 | 1180 | Closed |
| — | Fish Audio S2 Pro | 1128 | Open weights (5B) |
| — | Magpie-Multilingual 357M | 1065 | Open |
| — | Voxtral TTS | 1058 | Apache 2.0 (4B) |
| — | **Kokoro 82M v1.0** | **1056** | **Apache 2.0** |

Two conclusions from these leaderboards together:

1. **Open-weight models trail closed frontier models by approximately 75–100 ELO** — non-trivial but not disqualifying. Top closed wins approximately 60% of head-to-heads; Kokoro wins approximately 45%.
2. **Kokoro is the highest-ranked sub-100M model on both leaderboards** that surface this weight class. For Basic tier this is direct evidence supporting the PRD's selection.

### Objective benchmarks (intelligibility and speaker similarity)

The two metrics most commonly reported in TTS literature:

- **WER (Word Error Rate)** — synthesise text, transcribe the audio with an ASR model, compare against the input. Lower indicates more accurate pronunciation.
- **SIM (Speaker Similarity)** — cosine similarity between speaker embeddings of generated audio and reference. Higher indicates closer voice cloning.

Both are imperfect proxies for perceived audio quality, but they are the metrics published papers report.

#### Seed-TTS Eval results (test-en, lower is better for WER)

| Model | WER en | SIM | Source |
|---|---|---|---|
| **Qwen3-TTS-12Hz-1.7B-Base** | **1.24%** | **0.789** | Qwen tech report — SOTA in their comparison |
| CosyVoice 3 1.5B (RL) | 1.45% | — | CosyVoice 3 paper |
| CosyVoice 3 0.5B (RL) | 1.68% | — | CosyVoice 3 paper |
| F5-TTS | 2.00% | — | comparison in CosyVoice 3 paper |
| Higgs Audio V2 (5.8B) | 2.44% | 0.677 | Higgs Audio V2 paper |
| VibeVoice | 3.04% | — | comparison in CosyVoice 3 paper |

For a TTS reader, **WER is the primary metric**. It measures whether the audio reproduces the input text — mispronunciations, dropped words, repetitions. A 1.24% WER corresponds to approximately 99% word-level accuracy; a 3% WER corresponds to approximately 3 word errors per 100.

Qwen3-TTS 1.7B has the strongest published WER on test-en across the open-weight field. **If browser deployment is feasible, the objective data supports it as the High-tier selection.**

#### Minimax-MLS Speaker Similarity (English)

| Model | English SIM | Source |
|---|---|---|
| VoxCPM2 (2B) | 85.4% | VoxCPM2 announcement |
| ElevenLabs (proprietary baseline) | 61.3% | VoxCPM2 announcement |
| Supertonic 3 (99M) | "competitive with VoxCPM2" — exact number not published | Supertonic announcement |

VoxCPM2 is out of browser scope (2B parameters at 48 kHz studio output) but provides a useful upper bound for open-weight speaker similarity. Supertonic 3 claims comparable similarity at approximately one-twentieth the size, though the specific value is not published — vendor claim only.

#### EmergentTTS-Eval (model-as-judge, prosodic/expressive challenges)

| Model | Win rate vs gpt-4o-mini-tts | Categories tested |
|---|---|---|
| Higgs Audio V2 | 75.7% | Emotions |
| Higgs Audio V2 | 55.7% | Questions |

This benchmark uses Gemini 2.5 Pro as a judge of audio expressiveness — informative for prosodic and expressive output but methodologically new. Orpheus is listed as a participant in the paper; specific scores were not recovered in this research.

### Gaps in the published numbers

Three known gaps:

1. **Long-form English reading is absent from standard benchmarks.** Seed-TTS test-en uses short utterances. MLS uses approximately 10-second clips. Catm's workload is a 12,000-word chapter. Cross-chunk seam quality and prosody consistency across long-form input are not covered in the published metrics.

2. **Cross-model WER is not normalised by hardware or runtime configuration.** Vendor-reported numbers reflect best-case configurations (full-precision PyTorch, A100 GPUs, optimal sampling parameters). Browser deployment at q4 or INT4 will produce higher error rates on the same content; the delta is an evaluation measurement.

3. **Vendor-reported versus third-party.** Most paper numbers are self-reported. Independent third-party benchmarks (TTS Arena, Artificial Analysis) cover only Kokoro at the relevant weight classes. For Chatterbox-Turbo, the 63.75% blind-preference figure originates in a [Resemble-commissioned Podonos study](https://www.resemble.ai/chatterbox-turbo/) — directionally informative but not third-party objective.

### Impact on tier selection

The objective data and the two-tier collapse yield two conclusions:

- **Basic tier (Kokoro)** — supported by the only third-party human-preference data available. Strongest evidence base. Retained.

- **Pro tier (Qwen3-TTS)** — strongest published WER on the open-weight field: **1.54% on Seed-TTS test-en** in the OmniVoice paper's independent re-evaluation (Qwen's own report claims 1.24%; the independent figure is the more credible reference). OmniVoice itself measures slightly better on LibriSpeech-PC (1.30% vs Qwen's 1.60%) but has no published ONNX export. Qwen3-TTS does — `xkos/Qwen3-TTS-12Hz-1.7B-ONNX` ships the FP16 component graph. Picking Qwen trades a substantial download (~3.3 GB at FP16, see §"Correction (2026-05-22): Pro size and the missing INT4 build") and an autoregressive KV-cache loop for a ready-to-integrate artifact.

The selection:

| Tier | Selection | Reason |
|---|---|---|
| Basic | Kokoro 82M | Only sub-100M open-weight model with verified browser execution today; leads TTS Arena V2 in its weight class |
| Pro | Qwen3-TTS 1.7B | Strongest published Seed-TTS test-en WER; Apache 2.0; FP16 ONNX components already published (~3.3 GB on disk) |

The middle tier the prior research recommended (Chatterbox-Turbo 350M *or* CosyVoice 3 0.5B *or* OmniVoice 0.8B) is dropped — see §"Why no middle tier" below.

Browser deployability is no longer treated as a tier-selection axis: catm already runs ONNX models in the browser via `onnxruntime-web` + WebGPU, and integrating a multi-component graph is engineering of the same shape we did for Kokoro. The remaining unknowns are resource cost and quality — both intrinsic to the model, both verified by an integration measurement rather than a yes/no gate.

### Evaluation recommendations

In addition to the per-tier evaluation measurements logged below, the benchmark gaps motivate the following:

1. **Conduct a listening test on a representative English long-form passage** — identical 1–2 paragraphs through the candidate models (Kokoro, Chatterbox-Turbo, CosyVoice 3, Qwen3-TTS FP16, Orpheus 3B). Score on naturalness, intelligibility, prosody, seam quality.
2. **Measure WER on actual output** — synthesise a reference passage, transcribe with [whisper-large-v3](https://huggingface.co/openai/whisper-large-v3), compute WER against the input. Vendor numbers may be optimistic; first-party measurements are authoritative.
3. **Score speaker consistency across chunks** — synthesise 20 consecutive paragraphs, evaluate voice drift.

A short evaluation cycle substitutes for indeterminate wait time on third-party leaderboards covering the 1–2B class.

## Basic tier — Kokoro 82M v1.0 [retain]

**Recommendation: retain the PRD selection.** Kokoro is the only model in this weight class with verified end-to-end browser plus WebGPU execution today, demonstrated in [Xenova's transformers.js example](https://huggingface.co/posts/Xenova/620657830533509). Apache 2.0. 10.4 M downloads.

### Variants on disk

Sizes verified against `onnx-community/Kokoro-82M-v1.0-ONNX/onnx/`:

| File | Size | transformers.js `dtype` |
|---|---|---|
| `model.onnx` (fp32) | 310.5 MB | `fp32` |
| `model_q4.onnx` | 291.1 MB | `q4` |
| `model_uint8.onnx` | 169.2 MB | (no dtype binding) |
| `model_fp16.onnx` | 155.7 MB | `fp16` |
| `model_q4f16.onnx` | 147.4 MB | `q4f16` |
| `model_uint8f16.onnx` | 108.9 MB | (no dtype binding) |
| `model_quantized.onnx` | **88.1 MB** ← shipping artifact | `q8` |
| `model_q8f16.onnx` | 82.0 MB | (no dtype binding) |

### WebGPU EP compatibility (measured 2026-05-22)

Tested on `onnxruntime-web@1.26.0` with `onnxruntime-web/webgpu` import + the official MS sd-turbo session-options block (`enableMemPattern: false`, `enableCpuMemArena: false`, `extra.session.{disable_prepacking, use_device_allocator_for_initializers, use_ort_model_bytes_directly, use_ort_model_bytes_for_initializers}`), headless Chromium with `--enable-unsafe-webgpu`, input "Quick test of the WebGPU path." (~17 tokens):

| File | Duration | maxAbs | RMS | Verdict |
|---|---|---|---|---|
| `model.onnx` (fp32) | 2.88 s | 0.45 | 0.066 | ✓ |
| `model_q4.onnx` | 2.88 s | 0.44 | 0.066 | ✓ |
| `model_quantized.onnx` (q8) | 2.86 s | 0.46 | 0.064 | ✓ |
| `model_uint8.onnx` | 2.90 s | 0.50 | 0.065 | ✓ |
| `model_fp16.onnx` | 2.90 s | **5.78** | 4.85 | ✗ saturated |
| `model_q4f16.onnx` | 2.88 s | **5.78** | 4.87 | ✗ saturated |
| `model_q8f16.onnx` | 24.75 s | **5.78** | 1.66 | ✗ length + saturated |
| `model_uint8f16.onnx` | 2.94 s | **5.78** | 4.82 | ✗ saturated |

Every variant with **fp16 activations** (the four `*f16` files) produces saturated output (`maxAbs = 5.7797160148620605` exactly — same bit pattern across all four). The same sd-turbo session-options block had **no effect**: byte-identical numbers with and without it. Variants with fp32 or int activations (`fp32`, `q4`, `q8`, `uint8`) all work and produce nearly identical waveforms (`maxAbs` 0.44-0.50).

Tokenizer-config handling (`unk_token: "$"`) was added but the input phonemes are all in-vocab, so it didn't change any output.

**Implication:** the four dtypes the Kokoro model card recommends to kokoro-js (`fp32 | fp16 | q8 | q4 | q4f16`) are not all usable on the WebGPU EP in this ORT version — `fp16` and `q4f16` are broken. Practical working subset on WebGPU is `fp32 | q4 | q8 | uint8`.

### Speed by variant (same input, WebGPU)

Wall-clock vs audio for "Quick test of the WebGPU path." (2.8 s of audio), measured 2026-05-22:

| File | Disk | wallMs | RT factor |
|---|---|---|---|
| `model.onnx` (fp32) | 310 MB | 798 | **3.5×** |
| `model_q4.onnx` | 291 MB | 839 | **3.3×** |
| `model_uint8.onnx` | 169 MB | 1790 | 1.6× |
| `model_quantized.onnx` (q8) | 88 MB | **4544** | 0.6× |

q8 trades disk size for inference speed: it's 5.5× slower than fp32 because ORT's WebGPU EP dequantizes int8 weights on the fly per matmul (no native int8 kernel). q4 doesn't pay this cost — same speed as fp32. uint8 is in between.

**We ship `model.onnx` (fp32)**: fastest inference (3.5× realtime), no quantization noise floor, ~500–700 MB peak memory during synthesis. Comfortable on an 8 GB M1 (the assumed hardware floor). `model_uint8.onnx` is the fallback if the 310 MB download becomes a problem for slow connections; `model_q4.onnx` is essentially the same speed as fp32 at 291 MB if quality regresses under fp32. The q8 file is a worse trade across the board on WebGPU.

The session-option cluster from the sd-turbo example (`disable_prepacking`, `enableMemPattern: false`, `enableCpuMemArena: false`, etc.) moves q8 wallMs by less than 1% — confirmed via A/B. Those options are memory-savings tuned for multi-GB diffusion models and don't apply to our scale.

### Rationale against substituting Supertonic 3 for Low

Supertonic 3 is the most recent entrant in this weight class and warrants side-by-side evaluation. Three reasons to retain Kokoro for v1:

1. **License.** Kokoro is Apache 2.0 (fully permissive). Supertonic 3 is **OpenRAIL-M** — a Responsible-AI license with use-case restrictions (prohibition on harassment, deception, etc.). Probably acceptable for catm but introduces a compliance surface the project does not require.
2. **Browser deployment maturity.** Kokoro has been operational in browsers via transformers.js for approximately 12 months. Supertonic 3 (published April 29, 2026) has browser examples in HuggingFace Spaces but no production-validated transformers.js integration.
3. **No significant quality gap on English long-form.** Supertonic 3's strength is 31-language coverage. For an English-only v1, the multilingual breadth has no value, and Kokoro's English quality is competitive in the published benchmarks.

If Kokoro's seam quality fails PRD Goal #1 in evaluation, **Supertonic 3 is the primary alternative** — same size class, ONNX-native, supports a fixed-voice configuration consistent with this product.

### Evaluation measurements (Low)

- INT8 inference latency on representative paragraphs
- Seam quality across chunk boundaries
- RAM during synthesis (expected approximately 600 MB; verify)
- Real-time factor on target hardware

## Why no middle tier

Earlier revisions of this document recommended a Medium tier — first CosyVoice 3 0.5B (the original PRD pick), then Chatterbox-Turbo 350M. When the High tier became Qwen3-TTS 1.7B (~3.3 GB at FP16, the smallest published precision) and OmniVoice 0.8B (~800 MB – 1.1 GB at INT4) surfaced as a serious candidate, the middle tier stopped making sense:

| Candidate | Download | Position relative to Basic / Pro |
|---|---|---|
| Chatterbox-Turbo 350M (q4f16) | ~200 MB | **Smaller than Basic** (Kokoro at ~310 MB fp32). A "Medium" that's a smaller download than Basic doesn't read as an upgrade. |
| CosyVoice 3 0.5B | unverified (no published ONNX size) | Likely similar to Chatterbox. Less ecosystem maturity. |
| OmniVoice 0.8B (q4 estimate) | ~800 MB – 1.1 GB | A potential middle slot if it existed in ONNX, but no published export — would require us to do the conversion. |

Each option fails on a different axis:

- **Chatterbox / CosyVoice** are technically sound but don't provide a meaningful upgrade reason. Both require reference-audio voice handling (no built-in voices), introducing UX complexity that Basic and Pro both avoid. The added quality over Kokoro is marginal in long-form English reading.
- **OmniVoice** has the strongest measured WER per parameter in the field (1.30% LibriSpeech-PC, 1.60% Seed-TTS test-en in the OmniVoice paper) but no published ONNX export, so adopting it would mean a model-conversion workstream in addition to integration. At ~1 GB it also sits close to Pro on download — splitting hairs between two heavyweight tiers gives the user choice paralysis instead of clarity.

The two-tier collapse trades model breadth for an unambiguous upgrade story: *Basic for everyone (~310 MB); Pro for users who want the upgrade (~3.3 GB)*. Both Chatterbox-Turbo and OmniVoice remain in §"Models considered and rejected" as future Pro-tier contingencies.

## Pro tier — Qwen3-TTS 1.7B [confirm]

**Recommendation: retain Qwen3-TTS** as the PRD selection. The earlier draft of this document recommended switching to "Orpheus 1B" on deployment-ergonomics grounds; that reasoning is retired (see §"Correction (2026-05-22)").

[`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice) is the source model. 2 B parameters total (the "1.7B" in the name reflects the active LLM component). Apache 2.0. 1.59 M downloads on the parent repo. Multilingual (10 languages); 9 built-in speakers, two of which are native English (`Ryan`, `Aiden`).

### ONNX distribution

Two community ports exist with byte-identical structure:

- [`xkos/Qwen3-TTS-12Hz-1.7B-ONNX`](https://huggingface.co/xkos/Qwen3-TTS-12Hz-1.7B-ONNX) — primary integration target
- [`Soundly/Qwen3-TTS-12Hz-1.7B-ONNX-INT4`](https://huggingface.co/Soundly/Qwen3-TTS-12Hz-1.7B-ONNX-INT4) — same files, misleading "INT4" name (see §"Correction (2026-05-22): Pro size and the missing INT4 build")

Distributed as a **component graph**, not a monolith. The `fp16/voice_clone/` subset (the one we ship — voice_design is excluded) contains:

- `fp16/shared/speaker_encoder.onnx` + `.onnx.data` — **48 MB** — reference-audio → speaker embedding
- `fp16/shared/speech_tokenizer_encoder.onnx` + `.onnx.data` — **110 MB** — audio → token encoder
- `fp16/shared/speech_tokenizer_decoder.onnx` + `.onnx.data` — **297 MB** — token → audio waveform decoder
- `fp16/voice_clone/code_predictor.onnx` + `.onnx.data` — **224 MB** — autoregressive next-token predictor (prefill)
- `fp16/voice_clone/code_predictor_kv.onnx` + `.onnx.data` — **224 MB** — KV-cache decode variant
- `fp16/voice_clone/codec_embedding.onnx` + `.onnx.data` — **25 MB**
- 16× `fp16/voice_clone/code_predictor_embed_g[0-15].onnx` + sidecars — **~270 MB total** — per-codebook embedding tables
- 28× `layers.[0-13].{input,post_attention}_layernorm.weight` — small layer-norm shards
- `tokenizer/tokenizer.json` and configs — ~12 MB

Both FP16 and FP32 directories are published; FP16 is published as the recommended variant. There is **no published INT4 build** — neither Soundly nor xkos publishes integer-quantised weights.

### Rationale for the selection

- **Strongest published WER in the open-weight field.** Seed-TTS Eval test-en: **1.24%** per Qwen's tech report; **1.54%** per the OmniVoice paper's independent re-evaluation. The independent figure is the more credible reference. Either way, ahead of CosyVoice 3 1.5B (1.45%), CosyVoice 3 0.5B (1.68%), F5-TTS (2.0%), Higgs Audio V2 (2.44%), VibeVoice (3.04%). For a long-form reader, WER is the metric that most directly affects perceived quality.
- **Component-graph distribution** matches our existing integration shape — multiple `InferenceSession` instances, explicit tensor wiring, autoregressive KV-cache loop. The same kind of work we did to replace `kokoro-js` with direct `onnxruntime-web` (commit `41f1c42`).
- **Built-in speakers** keep the voice picker conceptually compatible with Kokoro's `af_heart.bin` UX. No reference-audio file picker or recorded-clip handling is required — Basic and Pro both surface a flat list of named voices.
- **Apache 2.0**, no use-case restrictions.
- **Multilingual headroom** for v1.x without re-architecting.

### Browser footprint (measured against the xkos file tree, 2026-05-22)

- **`fp16/voice_clone/` total: ~2.8 GB**
- **`fp16/shared/` total: ~456 MB**
- **`tokenizer/` + configs: ~12 MB**
- **Combined Pro download: ~3.3 GB** at FP16 (the smallest published precision)
- Runtime RAM during synthesis: pre-evaluation estimate **~4–5 GB** (codec activations + LLM hidden states + growing KV cache + per-codebook embeddings resident on the GPU)

There is no smaller published precision. If FP16 proves unmanageable on consumer hardware, the next move is offline INT4 conversion (`onnxruntime.quantization` Q4 weights with FP16 activations, ~900 MB – 1.1 GB projected) — out of scope for first integration.

### Caveats

- **No public browser/JS reference implementation.** The onnxruntime-web wiring is engineering we own. Same risk profile as the Kokoro direct-ORT switch, with more components.
- **English voices are a minority** of the 9 built-in speakers. Acceptable for v1 (English-only product), but the multilingual surface area is wasted disk for our use case until v1.x.
- **Autoregressive LLM with KV cache.** Per-chunk TTFA will be higher than Kokoro, and chunk size interacts with KV cache memory. Chunking strategy from `src/textChunk.ts` may need retuning at this tier.

### Evaluation measurements (Pro)

- Verify each component loads in `onnxruntime-web` + WebGPU (look for fp16 activation saturation, the issue we hit on Kokoro's `*f16` variants — for Qwen this is the published precision, so a saturation failure is a hard block)
- TTFA on a cold model at representative chunk length (~300 chars)
- RAM during synthesis on the assumed 8 GB M1 floor — model load alone may exceed it
- Real-time factor — Qwen reports ~1× realtime on consumer GPUs in the tech report; verify in browser
- Audible quality delta over Basic — does it justify the ~10× download in listening tests
- If FP16 fails on consumer hardware, evaluate the INT4 self-conversion path

### Correction (2026-05-22): Pro size and the missing INT4 build

Earlier in this document the Pro download was projected at **~1.2–1.5 GB at INT4**, on the assumption that the [`Soundly/Qwen3-TTS-12Hz-1.7B-ONNX-INT4`](https://huggingface.co/Soundly/Qwen3-TTS-12Hz-1.7B-ONNX-INT4) repo's name reflected the actual contents. It does not. Both Soundly and the structurally-identical [`xkos/Qwen3-TTS-12Hz-1.7B-ONNX`](https://huggingface.co/xkos/Qwen3-TTS-12Hz-1.7B-ONNX) publish **FP16 and FP32** precision builds only. No INT4 weights exist in either repo. The "INT4" suffix on the Soundly fork is misleading.

The corrected Pro download at FP16 is **~3.3 GB** (measured: 2.8 GB voice_clone + 456 MB shared + 12 MB tokenizer). This is ~10× Basic, not the 4× the earlier draft claimed. The two-tier rationale still holds (no middle candidate justifies its own integration cost — see §"Why no middle tier"), but the upgrade ask on the user is materially larger than previously disclosed. If FP16 proves unmanageable, the next move is **offline INT4 conversion using `onnxruntime.quantization`** — out of scope for the first integration.

### Correction (2026-05-22): the dropped Orpheus 1B path

A prior revision of this section recommended **"Orpheus 1B"** as the High tier on the grounds that Orpheus was distributed as a 150M/400M/1B/3B family with a smoother Llama-3 quantisation path. Two facts retire that recommendation:

1. **The Orpheus 1B variant is not a published model.** [`huggingface.co/canopylabs`](https://huggingface.co/canopylabs) hosts only `orpheus-3b-0.1-pretrained` and `orpheus-3b-0.1-ft`. The GitHub README lists smaller sizes as a future release item, but as of 2026-05-22 only the 3B is shipped.
2. **The 3B is large.** The community ONNX export at [`onnx-community/orpheus-3b-0.1-ft-ONNX`](https://huggingface.co/onnx-community/orpheus-3b-0.1-ft-ONNX) measures **~2.18 GB at q4f16** and **~2.43 GB at q4** on disk — roughly 4× the per-quantisation estimates the earlier draft extrapolated from a 1B variant.

The Orpheus-vs-Qwen comparison was also weighted by deployment ergonomics ("does a transformers.js example exist") more heavily than was warranted. catm already runs `onnxruntime-web` + WebGPU directly; the presence of an external JS demo is a convenience, not a precondition. Re-weighting on intrinsic capability and resource cost favours Qwen3-TTS by the WER margin above. Orpheus 3B is retained as a contingency (see §"Models considered and rejected").

## Models considered and rejected

- **[Orpheus 3B](https://huggingface.co/onnx-community/orpheus-3b-0.1-ft-ONNX)** — Apache 2.0, Llama-3.2-3B-Instruct backbone, 8 built-in English voices, transformers.js `pipeline()` published. **~2.18 GB on disk at q4f16** (smallest working variant) — actually *smaller than* Qwen3-TTS at FP16 (~3.3 GB), now that the Qwen size is measured. No published Seed-TTS WER number; Qwen's 1.54% (independent) is the strongest in the field. The size argument that justified Qwen has flipped, but the quality argument hasn't — Qwen retains the recommendation on WER. **Promoted to a serious Pro-tier contingency** if either (a) Qwen integration fails on a measurement we can't recover from or (b) the ~3.3 GB download proves a hard barrier. The Orpheus 1B variant cited in earlier drafts of this document is not a published artifact.
- **[Sesame CSM-1B](https://huggingface.co/sesame/csm-1b)** — Apache 2.0, 1 B params, two-stage Llama-backbone + Mimi-decoder, 227 k downloads. Would be the ideal size for High. No ONNX export exists, official or community. Rejected because a model conversion is a separate workstream from a model integration; revisit if a community ONNX appears.
- **[Microsoft VibeVoice-1.5B](https://huggingface.co/microsoft/VibeVoice-1.5B)** — Trending #18, 198 k downloads. License and parameter accounting are inconsistent on the model card (named 1.5B, listed at 3B). No published WER. Not investigated further; revisit if the licensing clarifies and a WER number is published.
- **[Higgs Audio V2](https://github.com/boson-ai/higgs-audio)** — 3.6 B LLM plus 2.2 B audio FFN, approximately 5.8 B total. Exceeds browser budget under any quantisation.
- **[Voxtral 4B](https://huggingface.co/mistralai/Voxtral-4B-TTS-2603)** — 4 B, server-class.
- **[VoxCPM2](https://huggingface.co/openbmb/VoxCPM2)** — 12+ GB VRAM for fp32. Server-class.
- **[XTTS-v2](https://huggingface.co/coqui/XTTS-v2)** — Coqui Public License is non-commercial only. License incompatible with an MIT project.
- **[Fish s2-pro](https://huggingface.co/fishaudio/s2-pro)** — 5 B.
- **[MOSS-TTS-Nano-100M](https://huggingface.co/OpenMOSS-Team/MOSS-TTS-Nano-100M)** — 100 M, recently released, license and browser execution unclear; a candidate Low-tier fallback pending evaluation data.

## PRD changes implied

The PRD §"Tiered voice — a user-facing choice" table currently lists three tiers:

```
Low: Kokoro 82M, ~80 MB
Medium: CosyVoice3 0.5B, ~500 MB
High: Qwen3-TTS 0.6B, ~700 MB
```

The revised user-facing copy is two tiers:

```
Basic: Kokoro 82M,       ~310 MB,    Apache 2.0,  English
Pro:   Qwen3-TTS 1.7B,   ~3.3 GB FP16, Apache 2.0, English (multilingual headroom)
```

Both permissive, integration tractable. The size gradient is ~10× — substantial. The UI descriptors collapse from a three-step ladder ("Good, pleasant" / "Closer to human" / "Best, expressive") to a two-step one ("Pleasant, lightweight" / "Closer to human, large download"). The Pro disk figure is measured against the [`xkos/Qwen3-TTS-12Hz-1.7B-ONNX`](https://huggingface.co/xkos/Qwen3-TTS-12Hz-1.7B-ONNX) file tree (FP16 voice_clone subset).

Basic's figure changed from "~80 MB" in earlier drafts to ~310 MB: that reflects shipping `model.onnx` (fp32) on WebGPU per the measurements above and commit `08f2896` ("Be honest about model size"), not a research-side update.

---

## Correction (2026-05-22): three tiers → two tiers

The original PRD and earlier revisions of this document assumed a three-tier ladder (Low/Medium/High). Two findings retire the middle tier:

1. **The size gradient broke.** Chatterbox-Turbo 350M (the standing Medium pick) projects to ~200 MB at q4f16 — *smaller than Basic's ~310 MB*. A middle tier that downloads less than Basic doesn't read as an upgrade.
2. **No middle candidate pays its own complexity cost.** Chatterbox needs a reference-audio voice picker (UX work Basic and Pro both avoid). OmniVoice (the strongest sub-1B candidate by independent WER) has no published ONNX export. Both add a workstream without delivering a clearly differentiated quality story between Basic and Pro.

The dropped middle, in order of strength:

- **OmniVoice 0.8B** (`k2-fsa/OmniVoice`) — best WER per parameter in the field (1.30% LibriSpeech-PC, 1.60% Seed-TTS test-en, Apache 2.0, 2.19M downloads, NAR diffusion-LM with RTF 0.022–0.032). Rejected because no ONNX export exists; ~3.27 GB at native BF16, ~800 MB – 1.1 GB projected at INT4, which sits awkwardly close to Pro.
- **Chatterbox-Turbo 350M** (`ResembleAI/chatterbox-turbo-ONNX`) — MIT, official ONNX at q4f16 (~200 MB), built-in paralinguistic tags, sub-200ms TTFA. Rejected because (a) smaller than Basic, (b) reference-audio voice picker is new UX surface, (c) quality delta over Kokoro on long-form English is marginal.
- **CosyVoice 3 0.5B** (`FunAudioLLM/Fun-CosyVoice3-0.5B-2512`) — Apache 2.0, community ONNX, 1.68% Seed-TTS test-en WER. Rejected because it duplicates Chatterbox's position with less ecosystem maturity.

If a future iteration warrants three tiers — for example, if Pro's ~3.3 GB proves a hard barrier for a meaningful slice of users — OmniVoice is the first revisit candidate, contingent on an ONNX export appearing (or us converting it).

---

## Stack alignment summary (both parts)

| Component | Model | Runtime | Format | Acceleration |
|---|---|---|---|---|
| **Sentence + paragraph segmenter** | `sat-3l-sm` | ONNX Runtime Web | ONNX (INT8) | WebGPU → WASM |
| **TTS — Basic** | Kokoro 82M v1.0 | ONNX Runtime Web | ONNX (fp32) | WebGPU → WASM |
| **TTS — Pro** | Qwen3-TTS 1.7B | ONNX Runtime Web | ONNX (FP16) | WebGPU → WASM |
| **Audio encoder** | WebCodecs `AudioEncoder` | Native browser | fragmented MP4 | Native |
| **Playback** | hls.js + `<audio>` | Native browser | HLS + fMP4 | Native MSE |

One ML runtime end-to-end. One acceleration backend. Pro uses a decoder-LLM-plus-codec architecture (Qwen3 backbone + multi-codebook codec), distinct from Basic's StyleTTS2-derived non-autoregressive synthesis.

## Aggregate open questions for evaluation

1. SaT — ONNX file size at INT8, cold-load latency, RAM, paragraph quality, Viterbi versus greedy.
2. Kokoro (Basic) — INT8 latency, seam quality, RAM, real-time factor.
3. Qwen3-TTS 1.7B (Pro) — each component loadable in `onnxruntime-web` + WebGPU (especially the fp16 activation question, since fp16 is the published precision), TTFA, RAM at 300-char chunk, quality delta over Basic relative to the ~10× resource cost.
4. Cross-tier — does the chunking strategy applied to Kokoro generalise to Qwen3-TTS? (Expected yes; verify by measurement.)

---

## References

### Chunker

- [`segment-any-text/wtpsplit`](https://github.com/segment-any-text/wtpsplit) — the SaT toolkit
- [`segment-any-text/wtpsplit` releases](https://github.com/segment-any-text/wtpsplit/releases) — 2.2.0 added length-constrained segmentation
- [Segment Any Text paper (EMNLP 2024)](https://aclanthology.org/2024.emnlp-main.665/)
- [`segment-any-text/sat-3l-sm`](https://huggingface.co/segment-any-text/sat-3l-sm)
- [`ModelCloud/sat-3l-sm-int8-onnx`](https://huggingface.co/ModelCloud/sat-3l-sm-int8-onnx)
- [`superlinear-ai/wtpsplit-lite`](https://github.com/superlinear-ai/wtpsplit-lite)
- [Transformers.js v3 / v4 release notes](https://huggingface.co/blog/transformersjs-v3)
- [`alea-institute/charboundary-small-onnx`](https://huggingface.co/alea-institute/charboundary-small-onnx)

### TTS

- [`hexgrad/Kokoro-82M`](https://huggingface.co/hexgrad/Kokoro-82M) — canonical PyTorch weights
- [`onnx-community/Kokoro-82M-v1.0-ONNX`](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) — distribution ONNX export
- [Xenova on Kokoro v1.0 in the browser](https://huggingface.co/posts/Xenova/620657830533509)
- [`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice) — Pro-tier source model
- [`xkos/Qwen3-TTS-12Hz-1.7B-ONNX`](https://huggingface.co/xkos/Qwen3-TTS-12Hz-1.7B-ONNX) — Pro-tier integration target (FP16 component graph)
- [`Soundly/Qwen3-TTS-12Hz-1.7B-ONNX-INT4`](https://huggingface.co/Soundly/Qwen3-TTS-12Hz-1.7B-ONNX-INT4) — mirror of xkos with a misleading repo name (no actual INT4)
- [`k2-fsa/OmniVoice`](https://huggingface.co/k2-fsa/OmniVoice) — sub-1B Pro candidate, no ONNX export yet
- [OmniVoice paper (arXiv 2604.00688)](https://arxiv.org/html/2604.00688) — independent WER re-evaluation of Qwen3-TTS, CosyVoice3, F5-TTS
- [`onnx-community/orpheus-3b-0.1-ft-ONNX`](https://huggingface.co/onnx-community/orpheus-3b-0.1-ft-ONNX) — Pro-tier contingency
- [`canopyai/Orpheus-TTS`](https://github.com/canopyai/Orpheus-TTS) — Orpheus repository (only 3B variant is published despite earlier-listed family)
- [`sesame/csm-1b`](https://huggingface.co/sesame/csm-1b) — promising 1B candidate awaiting an ONNX export
- [`ResembleAI/chatterbox-turbo-ONNX`](https://huggingface.co/ResembleAI/chatterbox-turbo-ONNX) — dropped middle-tier candidate
- [`ResembleAI/chatterbox`](https://huggingface.co/ResembleAI/chatterbox) — parent repository
- [`Supertone/supertonic-3`](https://huggingface.co/Supertone/supertonic-3) — Basic-tier alternative
- [`FunAudioLLM/Fun-CosyVoice3-0.5B-2512`](https://huggingface.co/FunAudioLLM/Fun-CosyVoice3-0.5B-2512) — dropped middle-tier candidate
- [`OpenMOSS-Team/MOSS-TTS-Nano-100M`](https://huggingface.co/OpenMOSS-Team/MOSS-TTS-Nano-100M) — small-tier monitoring candidate
- [Higgs Audio V2 (Boson AI)](https://github.com/boson-ai/higgs-audio) — server-class
- [HF text-to-speech trending list](https://huggingface.co/models?pipeline_tag=text-to-speech&sort=trending)
- [State of Open Source on HF, Spring 2026](https://huggingface.co/blog/huggingface/state-of-os-hf-spring-2026)

### Benchmarks

- [TTS Arena V2 (HuggingFace) leaderboard](https://tts-agi-tts-arena-v2.hf.space/leaderboard) — blind A/B preference ELO
- [Artificial Analysis TTS Leaderboard](https://artificialanalysis.ai/text-to-speech/leaderboard) — API-served model rankings
- [Qwen3-TTS Technical Report](https://arxiv.org/html/2601.15621v1) — Seed-TTS WER results
- [CosyVoice 3 paper (arXiv 2505.17589)](https://arxiv.org/pdf/2505.17589) — test-en WER, baseline comparisons
- [Higgs Audio V2 model card](https://huggingface.co/bosonai/higgs-audio-v2-generation-3B-base) — SeedTTS-Eval, EmergentTTS-Eval
- [EmergentTTS-Eval (arXiv 2505.23009)](https://arxiv.org/html/2505.23009v1) — model-as-judge prosodic/expressive evaluation
- [TTSDS2 benchmark (arXiv 2506.19441)](https://arxiv.org/html/2506.19441) — human-quality TTS evaluation framework
- [VoxCPM2 announcement (Medium)](https://medium.com/@tentenco/voxcpm2-the-open-source-voice-model-that-beats-elevenlabs-on-similarity-but-the-full-benchmark-ffe408b50b87) — Minimax-MLS SIM numbers
- [Chatterbox-Turbo blind-preference study (Resemble)](https://www.resemble.ai/chatterbox-turbo/) — vendor-published, 63.75% vs ElevenLabs Turbo
- [openai/whisper-large-v3](https://huggingface.co/openai/whisper-large-v3) — ASR reference for our own WER measurement
