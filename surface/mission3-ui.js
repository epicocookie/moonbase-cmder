// Mission 3 adapts cave-specific rules to the shared movement and model scene.
export function createMission3Controller() {
  const $ = id => document.getElementById(id);
  const fresh = new URLSearchParams(location.search).has("new");
  let state = (fresh ? mission3Run.begin() : mission3Run.load() || mission3Run.begin()).state;
  if (fresh) history.replaceState(null, "", location.pathname);
  const modal = $("m3-modal");
  let previousFocus = null, confirmAction = null, animation = null;
  let flagPlanted = false, flagPlanting = false;
  try { flagPlanted = sessionStorage.getItem("moonbase.surface.flag.v1") === "planted"; } catch {}
  function signal(name, detail = {}) { document.dispatchEvent(new CustomEvent(name, { detail })); }
  document.addEventListener("expeditionflagplanted", () => {
    flagPlanted = true; flagPlanting = false;
    try { sessionStorage.setItem("moonbase.surface.flag.v1", "planted"); } catch {}
    signal("expeditionflagchange", { planted: true });
  });
  function cancelScan() {
    animation = null;
    signal("expeditionscan", { active: false });
  }
  function showModal({ title, body, site = null, confirm = null, finished = false, details = "" }) {
    cancelScan();
    $("m3-modal-eyebrow").textContent = "PIP / YOUR GUIDE";
    $("m3-modal-title").textContent = title;
    $("m3-modal-body").textContent = body;
    $("m3-modal-reading").hidden = !site;
    $("m3-science").hidden = !site;
    $("m3-science").open = false;
    $("m3-extra").hidden = !details;
    $("m3-extra").open = false;
    $("m3-extra-text").textContent = details;
    $("m3-modal-fact").hidden = !site;
    $("m3-modal-source").hidden = !site;
    if (site) {
      $("m3-modal-reading").textContent = site.reading;
      $("m3-modal-fact").textContent = site.fact;
      $("m3-modal-source").href = site.source;
      $("m3-modal-source").textContent = "See the NASA story ↗";
    }
    $("m3-progress").hidden = true;
    $("m3-modal-restart").hidden = !finished;
    $("m3-modal-confirm").hidden = !confirm;
    $("m3-modal-confirm").disabled = false;
    $("m3-modal-confirm").textContent = confirm?.label || "Confirm";
    confirmAction = confirm?.action || null;
    $("m3-modal-close").textContent = finished ? "Choose a mission" : "Keep exploring";
    if (!modal.open) {
      previousFocus = document.activeElement;
      signal("expeditiondialog", { open: true });
      modal.showModal();
    }
  }
  modal.addEventListener("close", () => {
    cancelScan();
    signal("expeditionpip", { speaking: false });
    signal("expeditiondialog", { open: false });
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });
  $("m3-modal-confirm").onclick = () => confirmAction?.();
  $("m3-modal-close").onclick = () => {
    if (Mission3.isFinished(state) && (mission3Run.sessionSaved || mission3Run.journalSaved)) location.assign("./index.html?completed=3#missions");
    else modal.close();
  };
  $("m3-modal-restart").onclick = $("m3-restart").onclick = () => location.assign(location.pathname + "?new=1");
  function render() {
    $("scan-count").textContent = `${state.scans.length} / 3 clues found`;
    $("shift-badge").textContent = Mission3.isFinished(state) ? "DONE!" : !state.caveLocated ? "FIND THE CAVE" : state.scans.length < 3 ? "EXPLORE THE CAVE" : "HEAD BACK TO BASE";
    $("m3-energy-text").textContent = `${state.energy} / 9`;
    $("m3-energy-bar").style.width = `${100 * state.energy / 9}%`;
    $("m3-oxygen-text").textContent = `${state.oxygen} / 3`;
    $("m3-oxygen-bar").style.width = `${100 * state.oxygen / 3}%`;
    $("objective").textContent = Mission3.objective(state);
    signal("expeditionchange", { state });
  }
  function update(next) {
    state = next;
    mission3Run.update(state);
    if (Mission3.isFinished(state)) mission3Run.saveJournal(state);
    render();
  }
  function celebration() {
    showModal({ title: state.reported ? "Earth got your message!" : "Let's try again",
      body: state.reported ? "You explored a Moon cave and sent home three clues. Great teamwork!" : "Pip is ready to help you start again.",
      finished: true });
  }
  function completeScan(site) {
    update(site.id === "entrance" ? Mission3.locateCave(state) : Mission3.scan(state, site.id));
    if (state.failed) { celebration(); return; }
    showModal({ title: site.name, body: state.scans.length === 3 ? "Three clues! Follow the lights back to base. Then we can send them home." : site.id === "entrance" ? site.response : `Clue ${state.scans.length} saved! Follow the marker to the ${Mission3.next(state).name.toLowerCase()}.`, site });
  }
  let previous = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = Math.min(100, now - previous);
    previous = now;
    if (!animation || document.hidden || !modal.open) return;
    animation.elapsed += dt;
    const progress = Math.min(1, animation.elapsed / 3000);
    $("m3-progress").value = progress;
    signal("expeditionscan", { active: true, id: animation.site.id, progress });
    if (progress === 1) { const site = animation.site; animation = null; completeScan(site); }
  }, 30);
  function inspect(id) {
    if (id === "flag") {
      showModal({ title: flagPlanted ? "Your outpost flag" : "Plant an American flag", body: flagPlanted ? "The support bar holds the flag open beside our outpost." : flagPlanting ? "The pole is settling into place." : "The ground here is clear. You can leave a flag beside the habitat.",
        confirm: flagPlanted || flagPlanting ? null : { label: "Plant flag", action: () => {
          flagPlanting = true; modal.close(); signal("expeditionplantflag");
        } } });
      return;
    }
    if (id === "pip") { hint(); return; }
    if (Mission3.isFinished(state)) { celebration(); return; }
    if (id === "habitat") { showModal({ title: "Pip's cave briefing", body: "Follow the lights, scan three spots, then come back to base. I'll help you along the way." }); return; }
    if (id === "communications" || id === "field-screen") {
      if (state.scans.length !== 3) {
        showModal({ title: "Field readings", body: `We have ${state.scans.length} clues. Find all three, then bring them here.` });
        return;
      }
      showModal({ title: "Our cave clues", body: Mission3.report,
        confirm: { label: "Send to Earth", action: () => {
          if (state.reported) return;
          update(Mission3.submit(state)); celebration();
        } } });
      return;
    }
    const site = Object.hasOwn(Mission3.sites, id) ? Mission3.sites[id] : null;
    if (!site) return;
    const done = id === "entrance" ? state.caveLocated : state.scans.includes(id);
    if (done) { showModal({ title: site.name, body: site.response, site }); return; }
    if (id !== "entrance" && !state.caveLocated) {
      showModal({ title: "Check the entrance first", body: "Let's check the cave entrance first. Follow the amber marker." }); return;
    }
    const cost = id === "entrance" ? "+4 sunlight charge, −1 energy. This leaves 8/9 energy before entering the cave." : `−2 energy${state.shift ? " and −1 oxygen" : ""}. After this scan: ${state.energy - 2}/9 energy, ${state.oxygen - (state.shift ? 1 : 0)}/3 oxygen.`;
    showModal({ title: site.name, body: id === "entrance" ? "Let's check for a cave. The sunlight will charge your battery here." : "Let the scanner check this spot. It uses 2 battery.", details: cost, confirm: {
      label: id === "entrance" ? "Check the entrance" : "Start scan",
      action: () => {
        if (animation) return;
        $("m3-modal-confirm").disabled = true;
        $("m3-modal-close").textContent = "Cancel scan";
        $("m3-progress").hidden = false; $("m3-progress").value = 0;
        animation = { site, elapsed: 0 };
        signal("expeditionscan", { active: true, id, progress: 0 });
      }
    } });
  }
  function welcome() {
    if (state.caveLocated) { hint(); return; }
    showModal({ title: "Let's explore a Moon cave!", body: matchMedia("(pointer: coarse)").matches ? "Use the arrows to walk and drag to look. Follow the amber marker. I'll help you!" : "Use WASD to walk and drag to look. Follow the amber marker. I'll help you!" });
  }
  function hint() {
    showModal({ title: "A hint from Pip", body: Mission3.objective(state) });
  }
  $("m3-hint").onclick = hint;
  addEventListener("pagehide", () => { cancelScan(); modal.close(); });
  render();
  return { get state() { return state; }, get finished() { return Mission3.isFinished(state); },
    get flagPlanted() { return flagPlanted; }, run: mission3Run, next: () => Mission3.next(state),
    needsScan: () => false, isSite: () => false, inspect, welcome, hint, celebration };
}
