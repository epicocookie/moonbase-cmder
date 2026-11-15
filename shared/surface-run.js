// One active run per mission per tab; one finished keepsake per mission per browser.
function createRun(rules, key, journalKey) {
  let run = null, journal = null, sessionSaved = false, journalSaved = false;
  function load() {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw === null) return run;
      const saved = JSON.parse(raw);
      const state = rules.restore(saved?.state);
      run = state ? { state, pose: saved.pose || null } : null;
      sessionSaved = Boolean(state);
    } catch { /* Keep this page's in-memory run when storage is blocked. */ }
    return run;
  }
  function save() {
    sessionSaved = false;
    try { sessionStorage.setItem(key, JSON.stringify(run)); sessionSaved = true; } catch { /* In-memory play remains available. */ }
  }
  function begin() { run = { state: rules.create(), pose: null }; save(); return run; }
  function update(state) {
    const restored = rules.restore(state);
    if (!restored) return;
    if (!run) begin();
    run.state = restored;
    save();
  }
  function getJournal() {
    try {
      const saved = JSON.parse(localStorage.getItem(journalKey));
      const state = rules.restore(saved?.state);
      if (state && rules.finished(state)) { journal = { state }; journalSaved = true; }
    } catch { /* The current entry is still readable without storage. */ }
    return journal;
  }
  function saveJournal(state) {
    const restored = rules.restore(state);
    if (!restored || !rules.finished(restored)) return;
    journal = { state: restored };
    journalSaved = false;
    try { localStorage.setItem(journalKey, JSON.stringify(journal)); journalSaved = true; } catch { /* Do not interrupt the celebration. */ }
  }
  return { load, begin, update, getJournal, saveJournal,
    get sessionSaved() { return sessionSaved; }, get journalSaved() { return journalSaved; },
    checkpoint(pose) { if (run) { run.pose = pose; save(); } } };
}
const surfaceRun = createRun(Mission1, "moonbase.expedition.mission1.v2", "moonbase.journal.mission1.v1");
const mission2Run = typeof Mission2 === "undefined" ? null :
  createRun(Mission2, "moonbase.expedition.mission2.v1", "moonbase.outcome.mission2.v1");
