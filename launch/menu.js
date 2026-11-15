(() => {
  const intro = document.getElementById("intro");
  const missions = document.getElementById("missions");
  const completedMission = new URLSearchParams(location.search).get("completed");
  const banner = document.getElementById("mission-result");
  document.getElementById("review-journal").addEventListener("click", () => {
    const panel = document.getElementById(banner.dataset.target || "saved-journal");
    panel.open = true;
    panel.scrollIntoView({ block: "start" });
    panel.querySelector("summary").focus({ preventScroll: true });
  });
  function setLink(id, href, label) {
    document.getElementById(id).href = href;
    document.getElementById(id + "-label").textContent = label;
  }
  function showScreen() {
    const selecting = location.hash === "#missions";
    intro.hidden = selecting;
    missions.hidden = !selecting;
    document.title = "Moonbase Commander | " + (selecting ? "Mission selection" : "Welcome, Commander");
    if (!selecting) return;

    // Mission 1: scan expedition with a saved discovery journal.
    const run = surfaceRun.load();
    const journal = surfaceRun.getJournal();
    const ended = run?.state.reported || (!run && Boolean(journal));
    const active = run && !ended;
    document.getElementById("mission-status").textContent = ended ? "FIRST DISCOVERY COMPLETE" : active ? "EXPEDITION IN PROGRESS" : "READY TO EXPLORE";
    setLink("play-3d", active ? "./3d-test.html#resume" : "./3d-test.html?new=1", ended ? "Replay in 3D" : active ? "Continue in 3D" : "Start mission in 3D");
    setLink("play-2d", ended ? "./dashboard.html?new=1" : "./dashboard.html", ended ? "Replay in 2D" : active ? "Continue in 2D" : "Open 2D dashboard");
    document.getElementById("restart-options").hidden = !active;
    const journalState = run?.state.reported ? run.state : journal?.state;
    const journalPanel = document.getElementById("saved-journal");
    journalPanel.hidden = !journalState;
    if (journalState) {
      ExpeditionUI.renderJournal(document.getElementById("journal-content"), journalState);
      document.getElementById("journal-save-note").textContent = journal ? "Your journal is saved in this browser, ready for your next visit." : "Your journal is available in this tab. Browser journal saving is unavailable.";
      journalPanel.open = ended && completedMission !== "2";
    }

    // Mission 2: shift challenge with its own active run and last outcome.
    const run2 = mission2Run.load();
    const last2 = run2?.state.outcome ? run2.state : mission2Run.getJournal()?.state;
    const active2 = run2 && !run2.state.outcome;
    const result2 = last2 && Mission2.debrief(last2);
    document.getElementById("mission-two-status").textContent = active2 ? `SHIFT ${run2.state.shift + 1} OF 3 IN PROGRESS` :
      result2 ? (result2.success ? "LAST RUN · MISSION SUCCESS" : "LAST RUN · TRY A NEW PLAN") : "READY TO DEPLOY";
    setLink("play-3d-2", active2 ? "./3d-mission2.html#resume" : "./3d-mission2.html?new=1", active2 ? "Continue in 3D" : result2 ? "Replay in 3D" : "Start mission in 3D");
    setLink("play-2d-2", active2 ? "./dashboard-mission2.html" : "./dashboard-mission2.html?new=1", active2 ? "Continue in 2D" : result2 ? "Replay in 2D" : "Open 2D dashboard");
    document.getElementById("restart-two-options").hidden = !active2;
    const debriefPanel = document.getElementById("saved-debrief");
    debriefPanel.hidden = !last2;
    if (last2) {
      ExpeditionUI.renderDebrief(document.getElementById("debrief-content"), last2);
      debriefPanel.open = completedMission === "2";
    }

    // The banner celebrates whichever mission just ended; otherwise Mission 1's keepsake.
    const showTwo = completedMission === "2" && result2;
    banner.hidden = !(showTwo || ended);
    banner.dataset.target = showTwo ? "saved-debrief" : "saved-journal";
    if (showTwo) {
      document.getElementById("result-title").textContent = result2.success ? "Your outpost made it through the shadows!" : "Mission 2 debrief: " + result2.title.toLowerCase();
      document.getElementById("result-message").textContent = `Pip: ${result2.consequence} ${result2.change}`;
      document.getElementById("review-journal").textContent = "Open your debrief ↓";
    } else if (ended) {
      document.getElementById("result-title").textContent = "Your first lunar discovery!";
      document.getElementById("result-message").textContent = "Pip: We gathered two readings and sent a promising finding home. I wonder what we'll discover next!";
      document.getElementById("review-journal").textContent = "Open your journal ↓";
    }
    if (new URLSearchParams(location.search).has("completed")) {
      history.replaceState(null, "", location.pathname + "#missions");
      document.getElementById("result-title").setAttribute("tabindex", "-1");
      document.getElementById("result-title").focus({ preventScroll: true });
    }
  }
  addEventListener("hashchange", () => {
    showScreen();
    document.getElementById(location.hash === "#missions" ? "selection-title" : "intro-title").focus();
    scrollTo(0, 0);
  });
  addEventListener("pageshow", () => {
    showScreen();
    if (completedMission && !banner.hidden) document.getElementById("result-title").focus({ preventScroll: true });
  });
  showScreen();
})();
