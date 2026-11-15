// Optional browser regression. Start the local server on port 8127 first.
// Supply Playwright through the usual module lookup or PLAYWRIGHT_MODULE.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    // Expose movement only inside the test response, without a production debug API.
    await page.route("**/surface/tutorial.js", async route => {
      const response = await route.fetch();
      const source = (await response.text()).replace("  function draw(now) {", `
        window.testMotion = () => ({ height: suit.position.y - groundHeight(suit.position.x, suit.position.z),
          airborne, third, shiftLocked, velocity: verticalVelocity });
        function draw(now) {`);
      await route.fulfill({ response, body: source });
    });
    for (const file of ["3d-test.html", "3d-mission2.html"]) {
      await page.goto(`http://127.0.0.1:8127/${file}?new=1`);
      await page.waitForFunction(() => !document.querySelector("#deploy").disabled);
      await page.locator("#deploy").click();
      await page.locator("#skip").click();
      await page.locator(".pip-x").click();
      const canvas = page.locator("#scene canvas");
      assert.equal(await page.locator("#view").count(), 0);
      await canvas.focus();
      await page.keyboard.press("v");
      assert.equal(await page.evaluate(() => testMotion().third), true);
      await page.keyboard.press("Shift");
      await page.waitForFunction(() => document.pointerLockElement !== null);
      await page.keyboard.press("q");
      await page.waitForFunction(() => !document.pointerLockElement);
      assert.equal(await page.evaluate(() => testMotion().shiftLocked), false);
      await page.locator("#shift-lock").click();
      await page.waitForFunction(() => document.pointerLockElement !== null);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.pointerLockElement);
      assert.equal(await page.locator("#shift-lock").getAttribute("aria-pressed"), "false");
      await canvas.click({ position: { x: 500, y: 400 } });
      assert.equal(await page.evaluate(() => document.pointerLockElement), null);
      await page.keyboard.press("Space");
      await page.waitForFunction(() => testMotion().airborne);
      const peak = await page.evaluate(() => new Promise(resolve => {
        let peak = 0;
        const timer = setInterval(() => {
          const motion = testMotion();
          peak = Math.max(peak, motion.height);
          if (!motion.airborne) { clearInterval(timer); resolve(peak); }
        }, 30);
      }));
      assert.ok(peak > 1.1 && peak < 1.6, `Unexpected jump peak ${peak}`);
      assert.equal(await page.evaluate(() => testMotion().height), 0);
      await page.keyboard.press("Space");
      await page.locator("#return-pip").click();
      assert.equal(await page.evaluate(() => testMotion().airborne), false);
      await canvas.evaluate(element => { element.requestPointerLock = () => Promise.reject(new Error("denied")); });
      await canvas.focus();
      await page.keyboard.press("Shift");
      await page.waitForFunction(() => document.querySelector("#mouse-status").textContent.includes("unavailable"));
      assert.equal(await page.locator("#shift-lock").getAttribute("aria-pressed"), "false");
    }
    assert.deepEqual(errors, []);
    console.log("Passed: both POVs, mouse capture, Q/Esc release, free-cursor clicks, jump/landing/reset, and denied capture in both 3D missions.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
