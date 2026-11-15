// Optional browser check. Start the local server on port 8127 and provide Playwright.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:8127/dashboard.html?new=1");
    await page.locator(".pip-x").click();
    for (const id of ["sunlit", "shadow"]) {
      await page.locator(`[data-inspect="${id}"]`).first().tap();
      await page.locator("#scan-start").tap();
      await page.waitForFunction(id => ExpeditionUI.state.deployed.includes(id), id);
      await page.waitForFunction(id => ExpeditionUI.state.observations.includes(id), id);
      await page.locator(".pip-x").tap();
    }
    await page.locator('[data-inspect="communications"]').first().tap();
    assert.equal(await page.locator("#pip-send").isVisible(), false, "Reporting requires field-screen review");
    await page.locator(".pip-x").tap();
    await page.locator('[data-inspect="field-screen"]').tap();
    await page.locator("#pip-send").tap();
    await page.waitForFunction(() => document.querySelector("#scan-progress").value > 0);
    await page.locator("#pip-continue").tap();
    assert.equal(await page.evaluate(() => ExpeditionUI.state.screenDeployed), false, "Interrupted screen placement is retriable");
    await page.locator('[data-inspect="field-screen"]').tap();
    await page.locator("#pip-send").tap();
    await page.waitForFunction(() => ExpeditionUI.state.screenDeployed);
    assert.equal(await page.locator(".sample-visual").count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator("#pip-send").tap();
    assert.equal(await page.evaluate(() => ExpeditionUI.state.reviewed), true);

    // Visit the deployed physical display using a saved player pose.
    await page.evaluate(() => {
      const key = "moonbase.expedition.mission1.v2";
      const saved = JSON.parse(sessionStorage.getItem(key));
      saved.pose = { x: 3, z: 1.7, yaw: 0, pitch: -0.3, third: false };
      sessionStorage.setItem(key, JSON.stringify(saved));
    });
    await page.goto("http://127.0.0.1:8127/3d-test.html#resume");
    await page.waitForFunction(() => document.body.dataset.phase === "walk");
    assert.deepEqual(await page.evaluate(() => ExpeditionUI.state.deployed), ["sunlit", "shadow"]);
    await page.locator("#use").tap();
    await page.locator("#evidence-review").waitFor({ state: "visible" });
    await page.locator(".pip-x").tap();
    await page.goto("http://127.0.0.1:8127/dashboard.html");
    await page.locator('[data-inspect="communications"]').first().tap();
    await page.locator("#pip-send").tap();
    await page.waitForFunction(() => document.querySelector("#pip-title").textContent === "Earth received our finding!");
    await page.locator("#pip-continue").tap();
    await page.locator("#saved-journal").waitFor({ state: "visible" });
    assert.deepEqual(errors, []);
    console.log("Passed: ground scanner placement, mobile screen review, interrupted deployment, 3D handoff, and reporting.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
