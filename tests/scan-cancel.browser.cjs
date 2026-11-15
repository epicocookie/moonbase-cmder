// Optional browser regression. Start the local server on port 8127 first.
// Requires an available Playwright installation. PLAYWRIGHT_MODULE may point to it.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:8127/dashboard.html?new=1");
    await page.locator(".pip-x").click();

    // Cancellation must work on the first click while dialogue is still revealing.
    await page.locator('[data-inspect="shadow"]').first().click();
    await page.locator("#pip-continue").click();
    await page.locator("#pip-radio").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => ExpeditionUI.state.observations.length), 0);

    await page.locator('[data-inspect="shadow"]').first().click();
    for (let step = 0; step < 4; step++) await page.locator("#scan-preview").press("ArrowLeft");
    for (let step = 0; step < 3; step++) await page.locator("#scan-preview").press("ArrowDown");
    await page.locator("#scan-start").click();
    await page.waitForFunction(() => document.querySelector("#scan-progress").value > 0);
    await page.locator("#pip-continue").click();
    await page.locator("#pip-radio").waitFor({ state: "hidden" });
    // Wait beyond a full scan to catch an uncanceled completion callback.
    await page.waitForTimeout(3200);
    assert.equal(await page.evaluate(() => ExpeditionUI.state.observations.length), 0);

    // The same sample must still be playable after cancellation.
    await page.locator('[data-inspect="shadow"]').first().click();
    for (let step = 0; step < 4; step++) await page.locator("#scan-preview").press("ArrowLeft");
    for (let step = 0; step < 3; step++) await page.locator("#scan-preview").press("ArrowDown");
    await page.locator("#scan-start").click();
    await page.waitForFunction(() => ExpeditionUI.state.observations.includes("shadow"));
    assert.deepEqual(errors, []);
    console.log("Passed: immediate scan cancellation, canceled progress, and successful retry.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
