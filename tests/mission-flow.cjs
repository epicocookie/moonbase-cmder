// Run with node tests/mission-flow.cjs. No browser, framework, or packages needed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const Mission1 = require("../shared/mission1.js");
const Mission2 = require("../shared/mission2.js");
const key = "moonbase.expedition.mission1.v2";
const journalKey = "moonbase.journal.mission1.v1";
const oldKey = "moonbase.surface.mission1.v1";
const storageAPI = map => ({ getItem: name => map.get(name) ?? null, setItem: (name, value) => map.set(name, value) });
function page(session, local) {
  const context = vm.createContext({ Mission1, sessionStorage: storageAPI(session), localStorage: storageAPI(local) });
  vm.runInContext(fs.readFileSync(path.join(root, "shared/surface-run.js"), "utf8"), context);
  return vm.runInContext("surfaceRun", context);
}

for (const order of [["shadow", "sunlit"], ["sunlit", "shadow"]]) {
  const session = new Map([[oldKey, '{"actions":["report"]}']]);
  const local = new Map();
  let current = page(session, local);
  let state = current.begin().state;
  assert.equal(state.reported, false);
  assert.equal(Mission1.submit(state).reported, false, "An empty report must not succeed");
  state = Mission1.observe(state, order[0]);
  current.update(state);
  assert.equal(Mission1.submit(state).reported, false, "One reading is insufficient");
  const first = state;
  state = Mission1.observe(state, order[0]);
  assert.equal(state, first, "Repeated inspections must not duplicate progress");
  assert.equal(Mission1.next(state).id, order[1]);
  const pose = { x: 4, z: 5, yaw: 0.4, pitch: 0, third: true, shiftLocked: false };
  current.checkpoint(pose);
  // A new page represents switching between the 2D and 3D views.
  current = page(session, local);
  const saved = current.load();
  assert.deepEqual(saved.state.observations, [order[0]]);
  assert.equal(saved.pose.x, 4);
  assert.equal(saved.pose.third, true);
  state = Mission1.observe(saved.state, order[1]);
  assert.equal(Mission1.next(state).id, "communications");
  assert.equal(Mission1.submit(state).reported, false, "Review is required before reporting");
  state = Mission1.review(state);
  current.update(state);
  current = page(session, local);
  assert.equal(current.load().state.reviewed, true, "Review survives a view switch");
  state = Mission1.submit(state);
  current.update(state);
  current.saveJournal(state);
  assert.equal(current.load().state.reported, true);
  assert.equal(current.getJournal().state.reported, true);
  assert.equal(current.sessionSaved, true);
  assert.equal(current.journalSaved, true);
  assert.equal(Mission1.observe(state, "shadow"), state);
  current.begin();
  assert.equal(current.load().state.observations.length, 0, "Replay starts a fresh expedition");
  assert.equal(current.getJournal().state.reported, true, "Replay must keep the last keepsake");
  current = page(new Map(), local);
  assert.equal(current.load(), null, "Closing a tab starts a new active run");
  assert.equal(current.getJournal().state.reported, true, "The keepsake survives a closed tab");
  assert.equal(session.get(oldKey), '{"actions":["report"]}', "Leave old survival saves untouched");
  assert.ok(local.has(journalKey));
}
for (const invalid of [null, {}, { observations: ["unknown"], reported: false },
  { observations: ["shadow", "shadow"], reported: false }, { observations: [], reported: true },
  { observations: ["shadow"], reported: "true" }]) assert.equal(Mission1.restore(invalid), null);
assert.equal(Mission1.observe(Mission1.create(), "__proto__").observations.length, 0);
const corrupt = page(new Map([[key, '{"state":{"observations":["invalid"],"reported":false}}']]), new Map());
assert.equal(corrupt.load(), null);
assert.equal(corrupt.begin().state.reported, false);
const blockedContext = vm.createContext({ Mission1,
  sessionStorage: { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } },
  localStorage: { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } }
});
vm.runInContext(fs.readFileSync(path.join(root, "shared/surface-run.js"), "utf8"), blockedContext);
const blocked = vm.runInContext("surfaceRun", blockedContext);
let state = blocked.begin().state;
state = Mission1.submit(Mission1.review(Mission1.observe(Mission1.observe(state, "shadow"), "sunlit")));
blocked.update(state); blocked.saveJournal(state);
assert.equal(blocked.load().state.reported, true);
assert.equal(blocked.getJournal().state.reported, true);
assert.equal(blocked.sessionSaved, false);
assert.equal(blocked.journalSaved, false);

// Keep a focused regression check for the original standalone survival game.
function classicRun(actions) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      textContent: "", innerHTML: "", style: {}, className: "", hidden: true,
      addEventListener() {}, append() {}, prepend() {}
    });
    return elements.get(id);
  }
  const context = vm.createContext({ Mission2, document: {
    getElementById: element, querySelectorAll: () => [], createElement: () => element(Symbol()), createTextNode: value => value
  } });
  vm.runInContext(fs.readFileSync(path.join(root, "shared/game.js"), "utf8"), context);
  for (const action of actions) vm.runInContext(`takeAction(${JSON.stringify(action)})`, context);
  return { state: JSON.parse(vm.runInContext("JSON.stringify(mission)", context)), result: element("result").className };
}
assert.equal(classicRun(["report", "save", "save"]).result, "result win");
assert.equal(classicRun(["report", "hold", "hold"]).result, "result lose");
assert.equal(classicRun(["hold", "hold", "hold"]).result, "result lose", "Classic needs the report");
assert.deepEqual(classicRun(["report", "save", "save"]).state, { shift: 3, battery: 1, oxygen: 1, reports: 1, finished: true });

// Mission 2: the three worked runs from the team guide, page 4 (battery / oxygen after each shift).
function trace(commands) {
  let state = Mission2.create();
  const steps = commands.map(id => {
    const preview = Mission2.preview(state, id);
    const before = JSON.stringify(state);
    const next = Mission2.resolve(state, id);
    assert.equal(JSON.stringify(state), before, "Previewing and resolving must not change the old state");
    assert.deepEqual(next.history.at(-1), preview, "Preview and confirmation use the same calculation");
    state = next;
    return [state.battery, state.oxygen];
  });
  return { steps, state };
}
let m2 = trace(["report", "save", "save"]);
assert.deepEqual(m2.steps, [[3, 3], [2, 2], [1, 1]]);
assert.equal(m2.state.outcome, "success");
assert.equal(Mission2.debrief(m2.state).success, true);
m2 = trace(["report", "hold", "hold"]);
assert.deepEqual(m2.steps, [[3, 3], [1, 3], [0, 3]]);
assert.equal(m2.state.outcome, "power");
assert.match(Mission2.debrief(m2.state).consequence, /shift 3/);
m2 = trace(["hold", "hold", "hold"]);
assert.deepEqual(m2.steps, [[5, 3], [3, 3], [1, 3]]);
assert.equal(m2.state.outcome, "science");
assert.equal(trace(["save", "report", "save"]).state.outcome, "success", "Other plans can also win");
assert.equal(trace(["save", "save", "save"]).state.outcome, "oxygen");
assert.equal(trace(["hold", "hold", "report"]).state.outcome, "power", "A shadow report can drain the battery");
assert.match(Mission2.debrief(trace(["hold", "hold", "report"]).state).change, /sunlight/);
for (const result of [trace(["report", "save", "save"]), trace(["hold", "hold", "report"])]) {
  const { title, plan, consequence, change } = Mission2.debrief(result.state);
  assert.ok(title && plan && consequence && change, "Every debrief names the choice, consequence and a change");
}
// Rules: one report per run, no commands after the end, unknown commands ignored.
let m2state = Mission2.resolve(Mission2.create(), "report");
assert.equal(Mission2.preview(m2state, "report"), null);
assert.equal(Mission2.resolve(m2state, "report"), m2state);
assert.equal(Mission2.resolve(m2state, "__proto__"), m2state);
assert.equal(Mission2.resolve(m2.state, "hold"), m2.state, "A finished run takes no commands");
assert.equal(Mission2.preview(Mission2.create(), "report").battery, 3, "Solar charge is added before the cost");
// Saves are replayed from commands, so tampered numbers are ignored and bad histories rejected.
for (const invalid of [null, {}, { history: "report" }, { history: [{ command: "launch" }] },
  { history: [{ command: "report" }, { command: "report" }] }, { history: [{}, {}, {}, {}] },
  { history: [{ command: "save" }, { command: "save" }, { command: "save" }, { command: "save" }] }]) assert.equal(Mission2.restore(invalid), null);
assert.equal(Mission2.restore({ history: [{ command: "hold", battery: 9 }], battery: 9 }).battery, 5);

// Mission 2 storage: own run key, view handoff, replay keeps the Mission 1 journal and the last outcome.
const key2 = "moonbase.expedition.mission2.v1";
const outcomeKey2 = "moonbase.outcome.mission2.v1";
function page2(session, local) {
  const context = vm.createContext({ Mission1, Mission2, sessionStorage: storageAPI(session), localStorage: storageAPI(local) });
  vm.runInContext(fs.readFileSync(path.join(root, "shared/surface-run.js"), "utf8"), context);
  return { one: vm.runInContext("surfaceRun", context), two: vm.runInContext("mission2Run", context) };
}
{
  const session = new Map(), local = new Map();
  let views = page2(session, local);
  let one = views.one.begin().state;
  one = Mission1.submit(Mission1.review(Mission1.observe(Mission1.observe(one, "shadow"), "sunlit")));
  views.one.update(one); views.one.saveJournal(one);
  let two = Mission2.resolve(views.two.begin().state, "report");
  views.two.update(two);
  views.two.checkpoint({ x: -1, z: 3, yaw: 0.2, pitch: 0, third: false, shiftLocked: false });
  views = page2(session, local);
  const resumed = views.two.load();
  assert.deepEqual([resumed.state.shift, resumed.state.battery, resumed.state.oxygen, resumed.state.reported], [1, 3, 3, true], "Switching views keeps the shift");
  assert.equal(resumed.pose.x, -1);
  assert.equal(views.one.load().state.reported, true, "Mission 2 must not touch the Mission 1 run");
  two = Mission2.resolve(Mission2.resolve(resumed.state, "save"), "save");
  views.two.update(two); views.two.saveJournal(two);
  assert.equal(views.two.getJournal().state.outcome, "success");
  views.two.begin();
  assert.equal(views.two.load().state.shift, 0, "Replay starts Mission 2 fresh");
  assert.equal(views.two.getJournal().state.outcome, "success", "Replay keeps the last Mission 2 outcome");
  assert.equal(views.one.getJournal().state.reported, true, "Replay must preserve the Mission 1 journal");
  assert.ok(session.has(key2) && local.has(outcomeKey2) && local.has(journalKey));
  views.two.saveJournal(Mission2.resolve(Mission2.create(), "hold"));
  assert.equal(views.two.getJournal().state.outcome, "success", "An unfinished run is not saved as an outcome");
  const corrupt2 = page2(new Map([[key2, '{"state":{"history":[{"command":"report"},{"command":"report"}]}}']]), new Map()).two;
  assert.equal(corrupt2.load(), null, "A corrupt save starts a fresh playable run");
  assert.equal(corrupt2.begin().state.shift, 0);
}

assert.equal(Mission1.restore({ observations: ["shadow", "sunlit"], reported: true }).reviewed, true);
assert.equal(Mission1.restore({ observations: ["shadow"], reported: false }).reviewed, false);
assert.equal(Mission1.review(Mission1.create()).reviewed, false);
assert.equal(Mission1.restore({ observations: [], reported: false, reviewed: true }).reviewed, false);

console.log("Passed: both scan orders, review gating, legacy saves, shared progress/pose, replay, persistent journal, invalid/blocked storage, classic win/loss, and Mission 2 worked runs, preview, storage and replay.");
