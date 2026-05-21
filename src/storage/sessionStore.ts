import { type DBSchema, type IDBPDatabase, openDB } from "idb";
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
}

const DEFAULT_VOICE: VoiceId = "af_heart";
const DEFAULT_MODEL = "kokoro-82m-low";

interface CatmDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionMeta;
    indexes: { "by-createdAt": number };
  };
}

const DB_NAME = "catm";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<CatmDB>> | null = null;

function db(): Promise<IDBPDatabase<CatmDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CatmDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const store = database.createObjectStore("sessions", { keyPath: "id" });
          store.createIndex("by-createdAt", "createdAt");
        }
        if (oldVersion < 2) {
          // Backfill voice/modelId on existing rows.
          const store = tx.objectStore("sessions");
          void (async () => {
            let cursor = await store.openCursor();
            while (cursor) {
              const row = cursor.value as Partial<SessionMeta>;
              if (!row.voice) row.voice = DEFAULT_VOICE;
              if (!row.modelId) row.modelId = DEFAULT_MODEL;
              await cursor.update(row as SessionMeta);
              cursor = await cursor.continue();
            }
          })();
        }
      },
    });
  }
  return dbPromise;
}

async function sessionsRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle("sessions", { create: true });
}

async function sessionDir(id: string): Promise<FileSystemDirectoryHandle> {
  const root = await sessionsRoot();
  return root.getDirectoryHandle(id, { create: true });
}

function deriveTitle(sourceText: string): string {
  const collapsed = sourceText.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 60) return collapsed;
  return `${collapsed.slice(0, 57)}…`;
}

export interface CreateInput {
  sourceText: string;
  audio: Blob;
  durationSec: number;
  voice: VoiceId;
}

export async function createSession(input: CreateInput): Promise<SessionMeta> {
  const id = crypto.randomUUID();
  const dir = await sessionDir(id);
  const file = await dir.getFileHandle("audio.wav", { create: true });
  const writable = await file.createWritable();
  await writable.write(input.audio);
  await writable.close();

  const meta: SessionMeta = {
    id,
    title: deriveTitle(input.sourceText) || "Untitled",
    sourceText: input.sourceText,
    createdAt: Date.now(),
    durationSec: input.durationSec,
    lastPositionSec: 0,
    finishedAt: null,
    voice: input.voice,
    modelId: DEFAULT_MODEL,
  };
  const database = await db();
  await database.put("sessions", meta);
  return meta;
}

export interface UpdateInput {
  sourceText: string;
  audio: Blob;
  durationSec: number;
  voice: VoiceId;
}

export async function updateSession(id: string, input: UpdateInput): Promise<SessionMeta> {
  const database = await db();
  const existing = await database.get("sessions", id);
  if (!existing) throw new Error(`session ${id} not found`);

  const dir = await sessionDir(id);
  const file = await dir.getFileHandle("audio.wav", { create: true });
  const writable = await file.createWritable();
  await writable.write(input.audio);
  await writable.close();

  const next: SessionMeta = {
    ...existing,
    title: deriveTitle(input.sourceText) || existing.title,
    sourceText: input.sourceText,
    durationSec: input.durationSec,
    lastPositionSec: 0,
    finishedAt: null,
    voice: input.voice,
  };
  await database.put("sessions", next);
  return next;
}

export async function listSessions(): Promise<SessionMeta[]> {
  const database = await db();
  const rows = await database.getAllFromIndex("sessions", "by-createdAt");
  return rows.reverse();
}

export async function getAudioBlob(id: string): Promise<Blob> {
  const dir = await sessionDir(id);
  const file = await dir.getFileHandle("audio.wav");
  return file.getFile();
}

export async function deleteSession(id: string): Promise<void> {
  const root = await sessionsRoot();
  try {
    await root.removeEntry(id, { recursive: true });
  } catch {
    // OPFS entry may already be gone; metadata removal is the source of truth.
  }
  const database = await db();
  await database.delete("sessions", id);
}

export async function setPosition(id: string, seconds: number, finished: boolean): Promise<void> {
  const database = await db();
  const existing = await database.get("sessions", id);
  if (!existing) return;
  existing.lastPositionSec = seconds;
  if (finished) existing.finishedAt = Date.now();
  await database.put("sessions", existing);
}
