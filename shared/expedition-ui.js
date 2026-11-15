// One controller keeps the 2D and 3D views in step for whichever mission the page hosts.
// Mission 1 is the scan expedition; Mission 2 (body data-mission="2") is the shift challenge.
const ExpeditionUI = (() => {
  const $ = id => document.getElementById(id);
  function journalHTML(state) {
    return `<article class="discovery-journal">
      <p class="eyebrow">FIELD JOURNAL / MISSION 01</p>
      <h2>A clue in the cold.</h2><p class="journal-status">${state.reported ? "EXPEDITION COMPLETE · YOUR FIRST LUNAR FINDING" : "EXPEDITION IN PROGRESS"}</p>
      <figure><img src="launch/assets/mission-crater.jpg" alt="Reference mosaic of Shackleton Crater from LROC and ShadowCam" width="985" height="985" loading="lazy"><figcaption>Reference image: Shackleton Crater · NASA / KARI / ASU. Our expedition takes place in an imagined training outpost.</figcaption></figure>
      <div class="journal-findings">${Object.values(Mission1.sites).map(site => `<section><h3>${site.icon} ${site.name}</h3><p>${state.observations.includes(site.id) ? site.reading : "Waiting for your observation."}</p>${state.observations.includes(site.id) ? `<p class="science-fact">${site.fact}</p><a href="${site.source}" target="_blank" rel="noopener noreferrer">Explore the real science at NASA ↗</a>` : ""}</section>`).join("")}</div>
      <section class="journal-report"><h3>Your report to Earth</h3><p>${state.reported ? Mission1.report : "Collect both scans, then send your finding from Communications."}</p></section>
      <p class="training-note">Training scanner · simulated readings. These observations belong to our fictional expedition.</p>
    </article>`;
  }
  function debriefHTML(state) {
    const result = Mission2.debrief(state);
    return `<article class="discovery-journal">
      <p class="eyebrow">FLIGHT RECORDER / MISSION 02</p>
      <h2>Power through the shadows.</h2><p class="journal-status">${result ? result.title.toUpperCase() : "MISSION IN PROGRESS"}</p>
      <div class="journal-findings">${Mission2.shifts.map((type, index) => {
        const entry = state.history[index];
        return `<section><h3>${type === "sunlight" ? "☀" : "☾"} Shift ${index + 1} · ${type === "sunlight" ? "Sunlight" : "Shadow"}</h3><p>${entry ? Mission2.commands[entry.command].name : state.outcome ? "Not reached." : "Waiting for your command."}</p>${entry ? `<p class="science-fact">Solar +${entry.solar} · energy −${entry.cost} · battery ${entry.battery} / 9 · oxygen ${entry.oxygen} / 3</p>` : ""}</section>`;
      }).join("")}</div>
      ${result ? `<section class="journal-report"><h3>Debrief</h3><p><b>Your plan:</b> ${result.plan}</p><p><b>What happened:</b> ${result.consequence}</p><p><b>Try next time:</b> ${result.change}</p></section>` : ""}
      <p class="training-note">Simplified training units, not a real lunar power model.</p>
    </article>`;
  }
  function renderJournal(container, state) { container.innerHTML = journalHTML(state); }
  function renderDebrief(container, state) { container.innerHTML = debriefHTML(state); }
  if (!document.body.hasAttribute("data-expedition")) return { renderJournal, renderDebrief };

  const power = document.body.dataset.mission === "2";
  const Rules = power ? Mission2 : Mission1;
  const store = power ? mission2Run : surfaceRun;
  const copy = Rules.copy;
  const fresh = new URLSearchParams(location.search).has("new");
  let run = fresh ? store.begin() : store.load() || store.begin();
  if (fresh) history.replaceState(null, "", location.pathname);
  let state = run.state;
  const flagKey = "moonbase.surface.flag.v1";
  let flagPlanted = false, flagPlanting = false;
  try { flagPlanted = sessionStorage.getItem(flagKey) === "planted"; } catch { /* Planting remains available without storage. */ }
  document.addEventListener("expeditionflagplanted", () => {
    flagPlanted = true; flagPlanting = false;
    try { sessionStorage.setItem(flagKey, "planted"); } catch { /* Keep the flag for this page. */ }
    signal("expeditionflagchange", { planted: true });
  });
  const radio = document.createElement("dialog");
  radio.id = "pip-radio";
  radio.className = "pip-dialog";
  radio.setAttribute("aria-labelledby", "pip-title");
  radio.innerHTML = `<div class="pip-dialog-head"><span class="pip-avatar" aria-hidden="true"><i></i><i></i></span><div><small class="eyebrow">PIP / YOUR EXPLORATION BUDDY</small><h2 id="pip-title"></h2></div><button class="pip-x" aria-label="Close Pip radio" type="button">×</button></div>
    <p id="pip-message" aria-hidden="true"></p><p id="pip-accessible-message" class="sr-only" aria-live="polite"></p>
    <button type="button" id="pip-reveal" hidden>Show full text</button>
    <div id="scan-panel" hidden>
      <div id="scan-preview" role="img" aria-label="Live view from the ground scanner">
        <span class="scan-crosshair" aria-hidden="true"></span><span id="scan-target" aria-hidden="true"></span><span class="scan-sweep" aria-hidden="true"></span>
      </div>
      <p id="scan-instruction" role="status"></p><progress id="scan-progress" max="1" value="0" aria-label="Scan progress"></progress>
      <button type="button" id="scan-start">Start scan</button>
    </div>
    <div id="evidence-review" hidden></div><div id="uplink" hidden><span aria-hidden="true">◉ · · · ◉</span><progress id="uplink-progress" max="1" value="0" aria-label="Transmission progress"></progress></div><div id="pip-reading" class="scanner-reading" hidden></div><p id="pip-fact" class="science-fact" hidden></p><a id="pip-source" target="_blank" rel="noopener noreferrer" hidden>Explore the real science at NASA ↗</a>
    <div id="pip-panel" hidden></div><div id="pip-journal" hidden></div><div class="pip-dialog-actions"><button type="button" id="pip-send" class="primary" hidden></button><button type="button" id="pip-continue">Keep exploring</button></div>`;
  document.body.append(radio);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let previousFocus = null, fullMessage = "", revealed = 0, animation = null;
  let scanSite = null, scanning = false;
  let continueAction = () => radio.close(), confirmAction = null;
  function signal(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail })); }
  function setMessage(message) {
    fullMessage = message;
    revealed = reducedMotion.matches ? message.length : 0;
    $("pip-message").textContent = reducedMotion.matches ? message : "";
    $("pip-accessible-message").textContent = message;
    $("pip-reveal").hidden = reducedMotion.matches;
  }
  function revealText() {
    revealed = fullMessage.length;
    $("pip-message").textContent = fullMessage;
    $("pip-reveal").hidden = true;
  }
  $("pip-reveal").onclick = revealText;
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) revealText(); });
  // Pause dialogue and instrument progress while the tab is hidden.
  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(100, now - lastTick);
    lastTick = now;
    if (document.hidden || !radio.open) return;
    if (revealed < fullMessage.length) {
      revealed = Math.min(fullMessage.length, revealed + dt * 0.035);
      $("pip-message").textContent = fullMessage.slice(0, Math.floor(revealed));
      $("pip-reveal").hidden = revealed >= fullMessage.length;
    }
    if (animation) {
      animation.elapsed += dt;
      const progress = Math.min(1, animation.elapsed / animation.duration);
      animation.paint(progress);
      if (progress === 1) { const done = animation.done; animation = null; done(); }
    }
  }, 30);
  function cancelInstrument() {
    animation = null;
    scanning = false;
    scanSite = null;
    radio.classList.remove("is-scanning", "is-field-screen");
    signal("expeditionscan", { active: false });
    signal("expeditiondeploy", { active: false });
    signal("expeditiontransmit", { active: false });
  }
  function setConfirm(confirm) {
    confirmAction = confirm?.action || null;
    $("pip-send").hidden = !confirm;
    if (confirm) { $("pip-send").textContent = confirm.label; $("pip-send").disabled = false; }
  }
  $("pip-send").onclick = () => confirmAction?.();
  function showRadio(title, message, { site, journal = false, panel = null, confirm = null } = {}) {
    cancelInstrument();
    $("pip-title").textContent = title;
    setMessage(message);
    $("scan-panel").hidden = $("evidence-review").hidden = $("uplink").hidden = true;
    $("scan-preview").hidden = $("scan-start").hidden = false;
    continueAction = () => radio.close();
    signal("expeditionpip", { speaking: true });
    $("pip-reading").hidden = !site;
    $("pip-fact").hidden = !site;
    $("pip-source").hidden = !site;
    if (site) {
      $("pip-reading").textContent = "SIMULATED SCAN · " + site.reading;
      $("pip-fact").textContent = site.fact;
      $("pip-source").href = site.source;
    }
    $("pip-panel").hidden = !panel;
    $("pip-panel").innerHTML = panel || "";
    setConfirm(confirm);
    $("pip-journal").hidden = !journal;
    if (journal) (power ? renderDebrief : renderJournal)($("pip-journal"), state);
    $("pip-continue").textContent = journal ? "Close journal" : "Keep exploring";
    if (!radio.open) {
      previousFocus = document.activeElement;
      document.dispatchEvent(new CustomEvent("expeditiondialog", { detail: { open: true } }));
      radio.showModal();
    }
    radio.scrollTop = 0;
  }
  radio.querySelector(".pip-x").onclick = () => radio.close();
  $("pip-continue").onclick = () => {
    if (scanSite) { radio.close(); return; }
    if (revealed < fullMessage.length) { revealText(); return; }
    continueAction();
  };
  radio.addEventListener("close", () => {
    cancelInstrument();
    signal("expeditionpip", { speaking: false });
    document.dispatchEvent(new CustomEvent("expeditiondialog", { detail: { open: false } }));
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });
  function setText(id, text) { if ($(id)) $(id).textContent = text; }
  function render() {
    const ended = Rules.finished(state);
    const position = power ? state.shift : state.reviewed ? 3 : state.observations.length;
    document.querySelectorAll("[data-expedition-progress]").forEach(container => {
      container.innerHTML = copy.steps.map((label, index) => {
        const done = index < position || (ended && !power);
        const current = !ended && index === position;
        return `<span class="expedition-step ${done ? "done" : current ? "current" : ""}"${current ? ' aria-current="step"' : ""}><b>${done ? "✓" : "0" + (index + 1)}</b>${label}</span>`;
      }).join("");
    });
    setText("objective", Rules.objective(state));
    document.querySelectorAll("[data-inspect]").forEach(button => {
      button.classList.toggle("collected", !power && state.observations.includes(button.dataset.inspect));
      button.classList.toggle("next-stop", button.dataset.inspect === Rules.next(state).id && !ended);
    });
    if (power) renderPower();
    else {
      document.querySelectorAll('[data-inspect="field-screen"]').forEach(button => {
        button.disabled = state.observations.length < 2;
        button.textContent = state.screenDeployed ? "Open field screen" : "Place field screen";
      });
      const packed = Object.keys(Mission1.sites).length - state.deployed.length;
      setText("equipment-status", `${packed ? packed + " scanner" + (packed === 1 ? "" : "s") + " packed" : "Scanners placed"} · ${state.screenDeployed ? "screen deployed" : "screen packed"}`);
      setText("field-device-status", state.screenDeployed ? "Screen deployed · readings received" : "Portable screen packed in your kit");
      setText("observation-count", `${state.observations.length} / ${Object.keys(Mission1.sites).length} observations`);
      document.querySelectorAll("[data-observation]").forEach(container => {
        const site = Mission1.sites[container.dataset.observation];
        const collected = state.observations.includes(site.id);
        container.classList.toggle("collected", collected);
        container.querySelector("[data-reading]").textContent = collected ? site.reading : "Ready for your first scan";
        container.querySelector("[data-recorded]").textContent = collected ? "✓ Reading received from ground scanner" : state.deployed.includes(site.id) ? "Scanner placed · ready to resume" : "Scanner in your kit";
      });
    }
    document.dispatchEvent(new CustomEvent("expeditionchange", { detail: { state } }));
  }
  function renderPower() {
    const shift = Mission2.shifts[state.shift];
    setText("power-status", state.outcome ? "MISSION ENDED" : `SHIFT ${state.shift + 1} / 3 · ${shift === "sunlight" ? "☀ SUN" : "☾ SHADOW"} · ϟ ${state.battery} / 9 · ◉ ${state.oxygen} / 3`);
    setText("battery", state.battery);
    setText("oxygen", state.oxygen);
    if ($("battery-bar")) $("battery-bar").style.width = `${100 * state.battery / Mission2.maxBattery}%`;
    if ($("oxygen-bar")) $("oxygen-bar").style.width = `${100 * state.oxygen / Mission2.maxOxygen}%`;
    setText("shift-label", state.outcome ? "MISSION ENDED" : `SHIFT ${state.shift + 1} OF 3`);
    setText("report-status", `REPORT SENT: ${state.reported ? 1 : 0} / 1`);
    setText("forecast-note", state.outcome ? "The mission has ended. Read your debrief or try a new plan." :
      shift === "sunlight" ? "Solar panels add +4 energy this shift." : "No solar charging in shadow. Plan your energy carefully.");
    if ($("flight-log")) {
      $("flight-log").innerHTML = state.history.map(entry => `<p class="log-entry"><span class="log-time">S${entry.shift + 1}</span> ${copy.shiftDone(entry)}</p>`).reverse().join("") +
        '<p class="log-entry"><span class="log-time">00:00</span> Systems online. Awaiting your first command.</p>';
    }
  }
  function update(nextState) {
    state = nextState;
    store.update(state);
    render();
  }
  function welcome() {
    if (state.welcomeSeen) return;
    update({ ...state, welcomeSeen: true });
    const step = index => {
      const [title, message, label] = copy.welcome[index];
      showRadio(title, message);
      $("pip-continue").textContent = label;
      if (index + 1 < copy.welcome.length) continueAction = () => step(index + 1);
    };
    step(0);
  }
  function hint() {
    const site = Rules.next(state);
    const message = power ? copy.hint(state) : state.reported ? copy.hintDone :
      site.id === "field-screen" ? copy.hintScreen : site.id === "communications" ? copy.hintReport : copy.hintSite(site);
    showRadio("A little nudge from Pip", message);
    document.dispatchEvent(new CustomEvent("expeditionhint", { detail: { site } }));
  }

  // Mission 1: scan two sites, review the evidence, send the finding.
  function showFinding(site) {
    const both = state.observations.length === Object.keys(Mission1.sites).length;
    showRadio("A new piece of the mystery", both ? copy.bothFound : site.found, { site });
    $("pip-continue").textContent = both ? "Let's review our findings" : "Find the other sample";
  }
  function startDeployment(id, done) {
    radio.classList.add("is-scanning");
    scanning = true;
    $("scan-start").disabled = true;
    setConfirm(null);
    $("pip-continue").textContent = "Cancel placement";
    signal("expeditiondeploy", { active: true, id, progress: 0 });
    animation = { elapsed: 0, duration: 1800,
      paint(progress) {
        $("scan-progress").value = progress;
        signal("expeditiondeploy", { active: true, id, progress });
      },
      done
    };
  }
  function beginScan(site) {
    const deployed = state.deployed.includes(site.id);
    showRadio(deployed ? "Your scanner is waiting" : "Place your ground scanner", deployed ? "Your equipment is still here. Resume the scan to collect this sample's reading." : copy.scanIntro);
    scanSite = site;
    $("scan-preview").dataset.site = site.id;
    $("scan-panel").hidden = false;
    $("scan-progress").value = 0;
    $("scan-start").disabled = false;
    $("scan-start").textContent = deployed ? "Resume scan" : "Place scanner";
    $("scan-instruction").textContent = deployed ? "Scanner standing by." : "Marked sample ready. Set the scanner down here.";
    $("pip-continue").textContent = "Cancel placement";
    if (!deployed) signal("expeditiondeploy", { active: true, id: site.id, preview: true, progress: 0 });
    $("scan-start").focus();
  }
  function collect(site) {
    setMessage(copy.scanning);
    scanning = true;
    $("scan-start").disabled = true;
    $("scan-start").textContent = "Scanner collecting…";
    $("pip-continue").textContent = "Cancel scan";
    $("scan-instruction").textContent = "Equipment placed · collecting light pattern…";
    radio.classList.add("is-scanning");
    signal("expeditionscan", { active: true, id: site.id, progress: 0 });
    animation = { elapsed: 0, duration: 4000,
      paint(progress) {
        $("scan-progress").value = progress;
        signal("expeditionscan", { active: true, id: site.id, progress });
      },
      done() { update(Mission1.observe(state, site.id)); showFinding(site); }
    };
  }
  $("scan-start").onclick = () => {
    if (!scanSite || scanning) return;
    const site = scanSite;
    if (state.deployed.includes(site.id)) { collect(site); return; }
    setMessage("Setting the scanner down. Its legs are unfolding around the sample. Almost ready!");
    $("scan-instruction").textContent = "Unfolding legs · settling onto the ground…";
    radio.classList.add("is-scanning");
    startDeployment(site.id, () => {
      update(Mission1.deploy(state, site.id));
      signal("expeditiondeploy", { active: false });
      collect(site);
    });
  };
  function showFieldReadings() {
    showRadio("Your portable field screen", copy.reviewReady, {
      confirm: { label: state.reviewed ? "Return to the outpost" : "Evidence reviewed · prepare report", action: () => {
        update(Mission1.review(state));
        radio.close();
      } }
    });
    radio.classList.add("is-field-screen");
    $("evidence-review").hidden = false;
    $("evidence-review").innerHTML = `<div class="screen-link-status">GROUND SCANNERS CONNECTED · 2 READINGS</div>` +
      Object.values(Mission1.sites).map(site => `<article><div class="sample-visual sample-${site.id}" role="img" aria-label="Illustrative ${site.name.toLowerCase()} sample"></div><h3>${site.name}</h3><p>${site.reading}</p><div class="pattern-bars pattern-${site.id}" aria-hidden="true"></div></article>`).join("") +
      `<p class="training-note screen-note">Illustrative training patterns · simulated readings</p><p class="review-conclusion">${Mission1.report}</p>`;
  }
  function inspectScreen() {
    if (state.observations.length < 2) {
      showRadio("Our screen is packed and ready", "Place a scanner at each sample first. Once both readings arrive, we can unfold this screen and compare them.");
      return;
    }
    if (state.screenDeployed) { showFieldReadings(); return; }
    showRadio("Set up your field screen", "Both scanners have sent their findings! Set this portable display on the marked ground, open its stand, and take a closer look.", {
      confirm: { label: "Place screen on the ground", action: () => {
        scanSite = Mission1.fieldScreen;
        $("scan-panel").hidden = false;
        $("scan-preview").hidden = true;
        $("scan-start").hidden = true;
        $("scan-progress").value = 0;
        $("scan-instruction").textContent = "Opening kickstand · connecting both scanners…";
        setMessage("The stand is opening. Our two scanners are connecting to the screen!");
        startDeployment("field-screen", () => {
          update(Mission1.deployScreen(state));
          showFieldReadings();
        });
      } }
    });
    signal("expeditiondeploy", { active: true, id: "field-screen", preview: true, progress: 0 });
  }
  function celebration() {
    showRadio("Earth received our finding!", copy.celebration);
    $("pip-continue").textContent = "View discovery journal";
    continueAction = () => {
      if (store.sessionSaved || store.journalSaved) location.assign("./index.html?completed=1#missions");
      else showRadio("Your discovery journal", copy.journalOffline, { journal: true });
    };
  }
  function sendReport() {
    const total = Object.keys(Mission1.sites).length;
    if (state.observations.length !== total || !state.reviewed || state.reported) return;
    update(Mission1.submit(state));
    store.saveJournal(state);
    showRadio("Sending our finding home", copy.sending);
    $("uplink").hidden = false;
    $("uplink-progress").value = 0;
    $("pip-continue").textContent = "View acknowledgement";
    continueAction = celebration;
    animation = { elapsed: 0, duration: 3500,
      paint(progress) { $("uplink-progress").value = progress; signal("expeditiontransmit", { active: true, progress }); },
      done: celebration
    };
  }
  function inspectSite(id) {
    if (Object.hasOwn(Mission1.sites, id)) {
      const site = Mission1.sites[id];
      if (state.observations.includes(id)) showFinding(site);
      else beginScan(site);
    } else if (id === "field-screen") {
      inspectScreen();
    } else if (id === "communications") {
      if (state.reported) { celebration(); return; }
      showRadio(state.reviewed ? "Your report is ready" : "Check your field screen first", state.reviewed ? Mission1.report : copy.reviewWaiting,
        state.reviewed ? { confirm: { label: "Send reviewed finding", action: sendReport } } : {});
    } else if (id === "habitat") {
      showRadio("A home a long way from home", copy.habitat);
    }
  }

  // Mission 2: preview a command at its station, confirm it, then resolve the shift.
  let stationId = null, selected = null;
  function commandPanel() {
    const sunny = Mission2.shifts[state.shift] === "sunlight";
    const options = Object.values(Mission2.commands).filter(command => command.station === stationId);
    const result = selected && Mission2.preview(state, selected);
    const warning = result && { power: "Warning: the battery would reach 0 and the mission would end.",
      oxygen: "Warning: oxygen safety would reach 0 and the mission would end.",
      science: "Warning: this is the last shift and no report would reach Earth.",
      success: "This completes all three shifts with the report sent!" }[result.outcome];
    return `<p class="command-forecast"><span aria-hidden="true">${sunny ? "☀" : "☾"}</span> Shift ${state.shift + 1} of 3 · ${sunny ? "Sunlight: panels add +4" : "Shadow: no solar charging"} · Battery ${state.battery} / 9 · Oxygen ${state.oxygen} / 3</p>
      <div class="command-options">${options.map(command => {
        const ready = Mission2.available(state, command.id);
        return `<button type="button" class="command-option" data-command="${command.id}" aria-pressed="${selected === command.id}"${ready ? "" : " disabled"}><span aria-hidden="true">${command.icon}</span><b>${command.name}</b><small>${ready ? command.effect : "Already sent"}</small><em>−${command.cost} energy · oxygen ${command.oxygen > 0 ? "+1" : "−1"}</em></button>`;
      }).join("")}</div>
      ${result ? `<div class="command-preview${result.outcome && result.outcome !== "success" ? " risk" : ""}" role="status"><p><b>Preview</b> Battery ${state.battery} + ${result.solar} solar − ${result.cost} = <strong>${result.battery} / 9</strong> · Oxygen ${state.oxygen} → <strong>${result.oxygen} / 3</strong></p>${warning ? `<p>${warning}</p>` : ""}</div>` : ""}`;
  }
  function openStation(id) {
    stationId = id;
    selected = null;
    showRadio(copy.stationTitle[id], copy.station(state, id), { panel: commandPanel() });
    $("pip-continue").textContent = "Close · no shift spent";
  }
  $("pip-panel").addEventListener("click", event => {
    const button = event.target.closest("[data-command]");
    if (!power || !button || button.disabled) return;
    selected = button.dataset.command;
    $("pip-panel").innerHTML = commandPanel();
    $("pip-panel").querySelector(`[data-command="${selected}"]`)?.focus();
    setConfirm({ label: `Confirm · ${Mission2.commands[selected].name}`, action: confirmCommand });
  });
  function confirmCommand() {
    if (!selected || !Mission2.available(state, selected)) return;
    const id = selected;
    selected = null;
    update(Mission2.resolve(state, id));
    const entry = state.history.at(-1);
    if (Rules.finished(state)) store.saveJournal(state);
    if (id !== "report") { shiftResult(entry); return; }
    showRadio("Sending our report", copy.sending);
    $("uplink").hidden = false;
    $("uplink-progress").value = 0;
    $("pip-continue").textContent = "Show the result";
    continueAction = () => shiftResult(entry);
    animation = { elapsed: 0, duration: 2500,
      paint(progress) { $("uplink-progress").value = progress; signal("expeditiontransmit", { active: true, progress }); },
      done: () => shiftResult(entry)
    };
  }
  function shiftResult(entry) {
    if (Rules.finished(state)) { debrief(); return; }
    showRadio(`Shift ${entry.shift + 1} complete`, `${copy.shiftDone(entry)} Next up: shift ${state.shift + 1}, ${Mission2.shifts[state.shift]}.`);
    $("pip-continue").textContent = "Keep commanding";
  }
  function debrief() {
    const result = Mission2.debrief(state);
    showRadio(result.title, result.consequence, { journal: true, confirm: { label: "Try a new plan ↻", action: () => location.assign(location.pathname + "?new=1") } });
    $("pip-continue").textContent = "Back to missions";
    continueAction = () => {
      if (store.sessionSaved || store.journalSaved) location.assign("./index.html?completed=2#missions");
      else radio.close();
    };
  }

  function inspect(id, options = {}) {
    if (id === "flag") {
      if (flagPlanted) showRadio("A flag beside the outpost", "You planted this flag! Its horizontal support holds the fabric open here on the Moon.");
      else if (flagPlanting) showRadio("The flag is settling into place", "Our pole is almost anchored. Look at the marked spot beside the habitat.");
      else showRadio("Leave a flag at the outpost", "This spot is clear. Shall we anchor the pole and set up an American flag beside our habitat?", {
        confirm: { label: "Plant American flag", action: () => {
          if (flagPlanting || flagPlanted) return;
          flagPlanting = true;
          radio.close();
          signal("expeditionplantflag", {});
        } }
      });
    } else if (id === "pip") hint();
    else if (!power) inspectSite(id, options);
    else if (Rules.finished(state)) debrief();
    else if (Object.hasOwn(Mission2.stations, id)) openStation(id);
  }
  const finale = power ? debrief : celebration;
  addEventListener("pagehide", () => { cancelInstrument(); radio.close(); });
  document.querySelectorAll("[data-inspect]").forEach(button => button.addEventListener("click", () => inspect(button.dataset.inspect)));
  document.querySelectorAll("[data-hint]").forEach(button => button.addEventListener("click", hint));
  document.querySelectorAll("[data-open-journal]").forEach(button => button.addEventListener("click", () =>
    showRadio(power ? "Flight recorder" : "Your discovery journal", power ? copy.recorder : copy.journalOpen, { journal: true })));
  render();
  if (document.body.dataset.expedition === "2d") { if (Rules.finished(state)) finale(); else welcome(); }
  addEventListener("pageshow", event => {
    if (event.persisted) { state = store.load()?.state || state; render(); }
  });
  return { get flagPlanted() { return flagPlanted; }, get state() { return state; }, get finished() { return Rules.finished(state); },
    next: () => Rules.next(state), isSite: id => !power && Object.hasOwn(Mission1.sites, id),
    needsScan: id => !power && Object.hasOwn(Mission1.sites, id) && !state.observations.includes(id),
    run: store, welcome, inspect, hint, celebration: finale, renderJournal, renderDebrief };
})();
