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

test("playback advances smoothly during live synth (no multi-second stall)", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page.addInitScript(() => {
    const apply = () => {
      const el = document.querySelector('[data-testid="audio"]') as HTMLAudioElement | null;
      if (el) {
        el.muted = true;
        return true;
      }
      return false;
    };
    if (apply()) return;
    const obs = new MutationObserver(() => {
      if (apply()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  });

  await page
    .getByLabel("Text")
    .fill(
      [
        "First sentence of the playback smoothness check.",
        "Second sentence keeps things going.",
        "Third sentence covers the segment boundary.",
        "Fourth sentence rounds out the test.",
        "Fifth sentence finishes the corpus.",
      ].join(" "),
    );
  await page.getByTestId("speak").click();

  const audio = page.getByTestId("audio");
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).currentTime), {
      timeout: 30_000,
      intervals: [200, 200, 400],
    })
    .toBeGreaterThan(0.3);

  const samples: { t: number; ct: number }[] = [];
  const start = Date.now();
  while (Date.now() - start < 6_000) {
    const ct = await audio.evaluate((el) => (el as HTMLAudioElement).currentTime);
    samples.push({ t: Date.now() - start, ct });
    await page.waitForTimeout(150);
  }

  const lastCt = samples[samples.length - 1]?.ct ?? 0;
  let longestStall = 0;
  let stallStart: { t: number; ct: number } | null = null;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (!a || !b) continue;
    if (b.ct >= lastCt - 0.05) break;
    if (b.ct - a.ct < 0.02) {
      stallStart ??= a;
      const stallLen = b.t - stallStart.t;
      if (stallLen > longestStall) longestStall = stallLen;
    } else {
      stallStart = null;
    }
  }

  expect(longestStall, `stall ${longestStall}ms; samples=${JSON.stringify(samples)}`).toBeLessThan(
    600,
  );
});
