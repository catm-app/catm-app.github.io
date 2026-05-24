import { type Page, expect, test } from "@playwright/test";

async function clearStorage(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(async () => {
    indexedDB.deleteDatabase("catm");
    localStorage.setItem("catm:onboarded", "1");
    try {
      const root = await navigator.storage.getDirectory();
      for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) {
        await root.removeEntry(name, { recursive: true });
      }
    } catch {
      /* best effort */
    }
  });
  await page.reload();
}

interface SessionDisk {
  playlist: string;
  segmentFiles: string[];
}

async function readSessionDisk(page: Page, sessionId: string): Promise<SessionDisk> {
  return page.evaluate(async (id: string) => {
    const root = await navigator.storage.getDirectory();
    const sessions = await root.getDirectoryHandle("sessions");
    const dir = await sessions.getDirectoryHandle(id);
    const playlistHandle = await dir.getFileHandle("playlist.m3u8");
    const playlistFile = await playlistHandle.getFile();
    const playlist = await playlistFile.text();
    const segmentFiles: string[] = [];
    const iter = dir as unknown as {
      values(): AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
    };
    for await (const entry of iter.values()) {
      if (entry.kind === "file" && /^seg-\d+\.m4s$/.test(entry.name)) {
        segmentFiles.push(entry.name);
      }
    }
    segmentFiles.sort((a, b) => {
      const ai = Number(a.match(/^seg-(\d+)\.m4s$/)?.[1] ?? 0);
      const bi = Number(b.match(/^seg-(\d+)\.m4s$/)?.[1] ?? 0);
      return ai - bi;
    });
    return { playlist, segmentFiles };
  }, sessionId);
}

async function activeSessionId(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const req = indexedDB.open("catm");
    const dbase = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = dbase.transaction("sessions", "readonly");
    const store = tx.objectStore("sessions");
    const all = await new Promise<unknown[]>((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    dbase.close();
    if (all.length !== 1) throw new Error(`expected 1 session, got ${all.length}`);
    return (all[0] as { id: string }).id;
  });
}

test("playlist.m3u8 is sealed with ENDLIST and lists every segment on disk", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page
    .getByLabel("Text")
    .fill(
      [
        "The first sentence kicks off the run.",
        "The second one keeps the synthesiser busy.",
        "A third sentence with a few more words to encode.",
        "Sentence number four adds another segment to the pile.",
        "And the fifth sentence wraps up the test corpus cleanly.",
      ].join(" "),
    );
  await page.getByTestId("speak").click();

  await expect(page.getByText(/^(Generate|Save & read)/)).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(500);

  const sessionId = await activeSessionId(page);
  const disk = await readSessionDisk(page, sessionId);

  expect(disk.playlist, "playlist missing #EXT-X-ENDLIST").toMatch(/#EXT-X-ENDLIST\b/);

  const extinfCount = (disk.playlist.match(/^#EXTINF:/gm) ?? []).length;
  const refs = (disk.playlist.match(/^seg-\d+\.m4s$/gm) ?? []).sort();
  const filesSorted = [...disk.segmentFiles].sort();

  expect(refs).toEqual(filesSorted);
  expect(extinfCount).toBe(refs.length);
  expect(refs.length).toBeGreaterThan(0);

  const endlistAt = disk.playlist.indexOf("#EXT-X-ENDLIST");
  const lastSegAt = disk.playlist.lastIndexOf(filesSorted[filesSorted.length - 1] ?? "");
  expect(endlistAt).toBeGreaterThan(lastSegAt);
});
