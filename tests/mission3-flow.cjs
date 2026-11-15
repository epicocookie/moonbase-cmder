const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const Mission3 = require("../shared/mission3.js");
const orders = [
  ["chamber1", "chamber2", "chamber3"], ["chamber1", "chamber3", "chamber2"],
  ["chamber2", "chamber1", "chamber3"], ["chamber2", "chamber3", "chamber1"],
  ["chamber3", "chamber1", "chamber2"], ["chamber3", "chamber2", "chamber1"]
];
for (const order of orders) {
  let state = Mission3.create();
  assert.equal(Mission3.scan(state, order[0]), state);
  assert.equal(Mission3.submit(state), state);
  state = Mission3.locateCave(state);
  assert.equal(state.energy, 8, "Sunlight charges at the surface entrance");
  assert.equal(Mission3.locateCave(state), state);
  assert.equal(Mission3.scan(state, "__proto__"), state);
  for (const [index, id] of order.entries()) {
    const previous = JSON.stringify(state);
    const next = Mission3.scan(state, id);
    assert.equal(JSON.stringify(state), previous);
    assert.equal(next.energy, 6 - index * 2, "Underground scans spend energy without solar charging");
    assert.equal(next.oxygen, 3 - index);
    assert.equal(Mission3.scan(next, id), next);
    state = next;
    assert.deepEqual(Mission3.restore(state), state);
    if (index < 2) assert.equal(Mission3.submit(state), state);
  }
  state = Mission3.submit(state);
  assert.deepEqual([state.energy, state.oxygen, state.shift, state.reported, state.failed], [1, 1, 4, true, false]);
  assert.equal(Mission3.submit(state), state);
  assert.equal(Mission3.scan(state, "chamber1"), state);
  assert.deepEqual(Mission3.restore(state), state);
}
const legacy = { ...Mission3.create(), caveLocated: true, energy: 4 };
assert.equal(Mission3.restore(legacy).energy, 8, "Older pre-scan saves migrate to the surface charge");
const tampered = { ...Mission3.scan(Mission3.locateCave(Mission3.create()), "chamber1"), energy: 9 };
assert.equal(Mission3.restore(tampered).energy, 6);
for (const bad of [null, {}, { ...Mission3.create(), scans: ["unknown"] },
  { ...Mission3.create(), scans: ["chamber1", "chamber1"] },
  { ...Mission3.create(), scans: ["chamber1"], shift: 1 },
  { ...Mission3.create(), reported: true }, { ...Mission3.create(), shift: 4 },
  { ...Mission3.create(), energy: NaN }, { ...Mission3.create(), failed: true }]) assert.equal(Mission3.restore(bad), null);
function store(blocked = false) {
  const values = new Map();
  const api = { getItem(key) { if (blocked) throw Error("blocked"); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error("blocked"); values.set(key, value); } };
  const context = vm.createContext({ Mission3, sessionStorage: api, localStorage: api });
  vm.runInContext(fs.readFileSync(require("node:path").join(__dirname, "../shared/surface-run.js"), "utf8"), context);
  return vm.runInContext("mission3Run", context);
}
for (const blocked of [false, true]) {
  const run = store(blocked);
  run.begin();
  let state = Mission3.locateCave(Mission3.create());
  for (const id of Mission3.CAVE_SITES) state = Mission3.scan(state, id);
  state = Mission3.submit(state);
  run.update(state); run.saveJournal(state); run.checkpoint({ x: 9.15, z: 14.8, yaw: 0, pitch: 0 });
  assert.equal(run.load().state.reported, true);
  assert.equal(run.getJournal().state.reported, true);
  assert.equal(run.sessionSaved, !blocked);
  run.begin();
  assert.equal(run.load().state.caveLocated, false);
  assert.equal(run.getJournal().state.reported, true);
}
console.log("Passed: all cave scan orders, surface solar charge, report gating, legacy/tampered saves, replay, and blocked storage.");
