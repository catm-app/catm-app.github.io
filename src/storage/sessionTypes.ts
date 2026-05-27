// Pure type definitions for the session store. Lives in its own module so
// the demo and other type-only consumers can import these without pulling
// in the storage runtime (idb, fflate, OPFS access).

import type { VoiceId } from "../worker/kokoro.worker";

export interface SessionMeta {
  id: string;
  title: string;
  sourceText: string;
  createdAt: number;
  durationSec: number;
  lastPositionSec: number;
  finishedAt: number | null;
  voice: VoiceId;
  modelId: string;
  titleEdited?: boolean;
  chunkDurations?: number[];
  chunkTexts?: string[];
}

export interface StorageBreakdown {
  sessionsBytes: number;
  voiceBytes: number;
  quotaBytes: number;
  headroomBytes: number;
  persisted: boolean;
}
