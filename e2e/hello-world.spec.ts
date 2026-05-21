import { expect, test } from "@playwright/test";

async function clearStorage(
  page: import("@playwright/test").Page,
  opts: { onboarded?: boolean } = { onboarded: true },
): Promise<void> {
  await page.goto("/");
  await page.evaluate(async (onboarded: boolean) => {
    indexedDB.deleteDatabase("catm");
    if (onboarded) localStorage.setItem("catm:onboarded", "1");
    else localStorage.removeItem("catm:onboarded");
    try {
      const root = await navigator.storage.getDirectory();
      for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) {
        await root.removeEntry(name, { recursive: true });
      }
    } catch {
      /* best effort */
    }
  }, opts.onboarded ?? true);
  await page.reload();
}

test("synth saves session, sidebar persists across reload, delete clears", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page);

  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page.getByLabel("Text").fill("Hello world. Storage milestone.");
  await page.getByTestId("speak").click();

  const audio = page.getByTestId("audio");
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).src), { timeout: 90_000 })
    .toMatch(/^blob:/);
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).duration), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);

  await expect(page.getByTestId("library-row")).toHaveCount(1);

  await page.reload();
  await expect(page.getByText(/Ready · paste|words ·/i)).toBeVisible({ timeout: 3 * 60 * 1000 });
  await expect(page.getByTestId("library-row")).toHaveCount(1);

  await page.getByTestId("library-play").first().click();
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).src), { timeout: 5_000 })
    .toMatch(/^blob:/);
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).duration), {
      timeout: 10_000,
    })
    .toBeGreaterThan(0);

  // Audio should NOT autoplay after loading from library.
  const playing = await audio.evaluate((el) => !(el as HTMLAudioElement).paused);
  expect(playing).toBe(false);

  await page.getByTestId("library-delete").first().click();
  await expect(page.getByTestId("library-empty")).toBeVisible();
});

test("editing an open document re-synthesises in place (no duplicate row)", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page.getByLabel("Text").fill("First version.");
  await page.getByTestId("speak").click();

  const audio = page.getByTestId("audio");
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).src), { timeout: 90_000 })
    .toMatch(/^blob:/);

  await expect(page.getByTestId("library-row")).toHaveCount(1);

  // Modify the text — modified indicator should appear, Read becomes "Save & read".
  await page.getByLabel("Text").fill("Second version.");
  await expect(page.getByText("Save & read")).toBeVisible();

  await page.getByTestId("speak").click();
  await expect(page.getByText("Save & read")).toBeHidden({ timeout: 90_000 });

  // Still only one row — the existing session was updated in place.
  await expect(page.getByTestId("library-row")).toHaveCount(1);
});

test("gear opens settings; back returns to editor", async ({ page }) => {
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page.getByTestId("gear").click();
  await expect(page.getByRole("heading", { name: /^Voice$/i })).toBeVisible();

  await page.getByTestId("settings-back").click();
  await expect(page.getByLabel("Text")).toBeVisible();
});

test("onboarding: first-launch hero → download → ready stamp", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page, { onboarded: false });

  // First-launch hero is visible; worker hasn't started yet.
  await expect(page.getByRole("heading", { name: /Read.*Out/i })).toBeVisible();
  await expect(page.getByTestId("start-download")).toBeVisible();

  await page.getByTestId("start-download").click();

  // Eventually reaches ready and shows the "Ready ★" stamp.
  await expect(page.getByTestId("ready-stamp")).toBeVisible({ timeout: 3 * 60 * 1000 });
  await expect(page.getByText(/Ready · paste/i)).toBeVisible();

  // Onboarded flag persists — reload, the stamp is gone and we land straight in the editor.
  await page.reload();
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("ready-stamp")).toBeHidden();
});

test("Settings → Editor round trip does not autoplay the audio", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page.getByLabel("Text").fill("Round trip.");
  await page.getByTestId("speak").click();

  const audio = page.getByTestId("audio");
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).src), { timeout: 90_000 })
    .toMatch(/^blob:/);

  // Pause after autoplay completes the post-synth one-shot.
  await audio.evaluate((el) => (el as HTMLAudioElement).pause());

  await page.getByTestId("gear").click();
  await expect(page.getByRole("heading", { name: /^Voice$/i })).toBeVisible();
  await page.getByTestId("settings-back").click();

  // Should be paused — coming back from Settings must not trigger autoplay.
  await expect
    .poll(async () => audio.evaluate((el) => (el as HTMLAudioElement).paused), { timeout: 2_000 })
    .toBe(true);
});

test("library row shows the voice the session was recorded with", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  // Switch to am_michael before recording.
  await page.getByTestId("gear").click();
  await page.getByTestId("voice-am_michael").locator(".voice-pick-btn").click();
  await page.getByTestId("settings-back").click();

  await page.getByLabel("Text").fill("Voice tag test.");
  await page.getByTestId("speak").click();
  await expect
    .poll(async () => page.getByTestId("audio").evaluate((el) => (el as HTMLAudioElement).src), {
      timeout: 90_000,
    })
    .toMatch(/^blob:/);

  // The library row should carry the voice tag.
  await expect(page.locator('[data-testid="library-row"] .voice-tag').first()).toHaveText(
    "am_michael",
  );

  // Switching default voice to af_heart marks the open session as modified.
  await page.getByTestId("gear").click();
  await page.getByTestId("voice-af_heart").locator(".voice-pick-btn").click();
  await page.getByTestId("settings-back").click();
  await expect(page.getByText("Save & read")).toBeVisible();
});

test("voice picker selects and persists across reload", async ({ page }) => {
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page.getByTestId("gear").click();
  // af_heart is selected by default.
  await expect(page.getByTestId("voice-af_heart")).toHaveClass(/on/);

  // Pick a different voice.
  await page.getByTestId("voice-am_michael").locator(".voice-pick-btn").click();
  await expect(page.getByTestId("voice-am_michael")).toHaveClass(/on/);
  await expect(page.getByTestId("voice-af_heart")).not.toHaveClass(/on/);

  // Reload — selection persists.
  await page.reload();
  await page.getByTestId("gear").click();
  await expect(page.getByTestId("voice-am_michael")).toHaveClass(/on/);
});

test("delete model from settings returns to first-launch onboarding", async ({ page }) => {
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  await page.getByTestId("gear").click();
  await page.getByTestId("delete-model").click();
  await expect(page.getByTestId("confirm-delete-model")).toBeVisible();
  await page.getByTestId("confirm-confirm").click();

  // Confirmed deletion drops the onboarded flag and resets to first-launch.
  await expect(page.getByTestId("start-download")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Read.*Out/i })).toBeVisible();
});

test("switching to a different session while modified shows discard dialog", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await clearStorage(page);
  await expect(page.getByText(/Ready · paste/i)).toBeVisible({ timeout: 3 * 60 * 1000 });

  // Create session A
  await page.getByLabel("Text").fill("Session A.");
  await page.getByTestId("speak").click();
  await expect
    .poll(async () => page.getByTestId("audio").evaluate((el) => (el as HTMLAudioElement).src), {
      timeout: 90_000,
    })
    .toMatch(/^blob:/);

  // Start a new document via + button, then make session B
  await page.getByTestId("new-document").click();
  await page.getByLabel("Text").fill("Session B.");
  await page.getByTestId("speak").click();
  await expect(page.getByTestId("library-row")).toHaveCount(2);

  // Modify B
  await page.getByLabel("Text").fill("Session B with edits.");

  // Click the inactive (other) row. Expect discard dialog.
  const inactive = page.locator('[data-testid="library-row"]:not(.active)').first();
  await inactive.getByTestId("library-play").click();

  await expect(page.getByTestId("discard-dialog")).toBeVisible();
  await page.getByTestId("discard-cancel").click();
  await expect(page.getByTestId("discard-dialog")).toBeHidden();
});
