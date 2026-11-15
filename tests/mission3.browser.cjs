// Optional browser check. Start the server on port 8127 and provide Playwright.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    // Inspect shared movement inside the test response, keeping production code private.
    await page.route("**/surface/tutorial.js", async route => {
      const response = await route.fetch();
      const source = (await response.text()).replace("  function draw(now) {", `
        window.caveState = () => ({ state:controller.state, position:suit.position.toArray(),
          camera:camera.position.toArray(), airborne, third,
          ceiling:ceilingHeight(suit.position.x,suit.position.z) });
        window.caveDrive = (x,z) => {
          let steps=0;
          while(Math.hypot(x-suit.position.x,z-suit.position.z)>.15 && steps++<600) {
            const before=suit.position.clone();
            yaw=Math.atan2(-(x-suit.position.x),-(z-suit.position.z));
            keys.add('KeyW'); walk(.035,.035);
            if(before.distanceTo(suit.position)<.001) break;
          }
          keys.clear(); aimCamera(); checkStation();
          return Math.hypot(x-suit.position.x,z-suit.position.z);
        };
        function draw(now) {`);
      await route.fulfill({ response, body: source });
    });
    async function drive(x, z) {
      const remaining = await page.evaluate(({ x, z }) => caveDrive(x, z), { x, z });
      assert.ok(remaining < .25, `Cave route blocked before (${x}, ${z})`);
    }
    async function scan() {
      await page.locator("#use").click();
      await page.locator("#m3-modal-confirm").click();
      await page.locator("#m3-modal-reading").waitFor({ state: "visible" });
      await page.locator("#m3-modal-close").click();
    }
    await page.goto("http://127.0.0.1:8127/index.html#missions");
    await page.locator("#play-3d-3").click();
    await page.waitForFunction(() => !document.querySelector("#deploy").disabled);
    await page.locator("#deploy").click();
    await page.locator("#m3-modal-close").click();
    await drive(3, 0); await drive(8, 0);
    await page.locator("#use").click();
    await page.locator("#m3-modal-confirm").click();
    await page.waitForFunction(() => document.querySelector("#m3-progress").value > .15);
    await page.locator("#m3-modal-close").click();
    assert.equal(await page.evaluate(() => caveState().state.energy), 5);
    assert.equal(await page.evaluate(() => caveState().state.caveLocated), false);
    await scan();
    await drive(9.15, 1); await drive(9.15, 8.8);
    await scan();
    assert.equal(await page.evaluate(() => caveState().state.energy), 6);
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.phase === "station");
    await page.locator("#m3-modal-close").click();
    assert.equal(await page.evaluate(() => caveState().state.scans.length), 1);
    assert.ok(await page.evaluate(() => caveState().position[1] < -3));
    await page.locator("#use").click();
    assert.equal(await page.locator("#m3-modal-confirm").isVisible(), false);
    await page.locator("#m3-modal-close").click();
    await page.locator("#scene canvas").focus();
    await page.keyboard.press("v");
    await page.keyboard.press("Shift");
    await page.waitForFunction(() => document.pointerLockElement !== null);
    await page.keyboard.press("q");
    await page.waitForFunction(() => !document.pointerLockElement);
    await page.keyboard.press("Space");
    await page.waitForFunction(() => caveState().airborne);
    const safe = await page.evaluate(() => new Promise(resolve => {
      let safe = true;
      const timer = setInterval(() => {
        const value = caveState();
        safe = safe && value.position[1] + 1.6 <= value.ceiling + .01;
        if (!value.airborne) { clearInterval(timer); resolve(safe); }
      }, 30);
    }));
    assert.equal(safe, true, "Jump must stay below the cave roof");
    await drive(9.15, 11.8); await scan();
    await drive(9.15, 14.8); await scan();
    assert.equal(await page.evaluate(() => caveState().state.oxygen), 1);
    await drive(9.15, 0); await drive(0, -2.6);
    await page.locator("#use").click(); await page.locator("#m3-modal-confirm").click();
    assert.equal(await page.evaluate(() => caveState().state.reported), true);
    await page.locator("#m3-modal-close").click();
    await page.locator("#saved-cave").waitFor({ state: "visible" });
    assert.match(await page.locator("#result-title").textContent(), /cave findings reached Earth/i);
    await page.locator("#play-3d-3").click();
    await page.waitForFunction(() => !document.querySelector("#deploy").disabled);
    await page.locator("#deploy").click(); await page.locator("#m3-modal-close").click();
    assert.equal(await page.evaluate(() => caveState().state.scans.length), 0);
    assert.deepEqual(errors, []);
    console.log("Passed: launcher, traversable cave route, scan cancellation, resume, duplicate scans, mouse controls, roof collision, report, and replay.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
