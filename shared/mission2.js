// Mission 2 rules and Pip's dialogue. No DOM or storage here.
// The classic page uses the same calculation, so every view agrees on the numbers.
const Mission2 = (() => {
  const shifts = ["sunlight", "shadow", "shadow"];
  const maxBattery = 9, maxOxygen = 3, solarCharge = 4;
  const commands = {
    hold: { id: "hold", name: "Hold steady", icon: "⏸", cost: 2, oxygen: 1, station: "habitat", effect: "Keep ordinary operations running" },
    save: { id: "save", name: "Save power", icon: "⌁", cost: 1, oxygen: -1, station: "habitat", effect: "Stretch the battery during shadow" },
    report: { id: "report", name: "Send report", icon: "↗", cost: 4, oxygen: 1, station: "communications", effect: "Transmit once per run" }
  };
  const stations = {
    habitat: { id: "habitat", name: "Habitat", x: -0.9, z: 4.6 },
    communications: { id: "communications", name: "Communications", x: 0, z: -4 }
  };
  const solar = shift => shifts[shift] === "sunlight" ? solarCharge : 0;
  function create() { return { shift: 0, battery: 3, oxygen: 3, reported: false, history: [], outcome: null, welcomeSeen: false }; }
  function available(state, id) {
    return Object.hasOwn(commands, id) && !state.outcome && state.shift < shifts.length && !(id === "report" && state.reported);
  }
  // Preview and confirmation both call this, so a preview always matches the result.
  function preview(state, id) {
    if (!available(state, id)) return null;
    const command = commands[id];
    const charge = solar(state.shift);
    const battery = Math.min(maxBattery, state.battery + charge) - command.cost;
    const oxygen = Math.min(maxOxygen, state.oxygen + command.oxygen);
    const reported = state.reported || id === "report";
    const outcome = battery <= 0 ? "power" : oxygen <= 0 ? "oxygen" :
      state.shift + 1 === shifts.length ? (reported ? "success" : "science") : null;
    return { command: id, shift: state.shift, solar: charge, cost: command.cost, oxygenChange: command.oxygen,
      battery: Math.max(0, battery), oxygen: Math.max(0, oxygen), reported, outcome };
  }
  function resolve(state, id) {
    const result = preview(state, id);
    if (!result) return state;
    return { ...state, shift: state.shift + 1, battery: result.battery, oxygen: result.oxygen,
      reported: result.reported, outcome: result.outcome, history: [...state.history, result] };
  }
  // Saved runs are replayed from their commands, so a tampered save cannot invent numbers.
  function restore(value) {
    if (!value || !Array.isArray(value.history) || value.history.length > shifts.length) return null;
    let state = create();
    for (const entry of value.history) {
      if (!available(state, entry?.command)) return null;
      state = resolve(state, entry.command);
    }
    return { ...state, welcomeSeen: value.welcomeSeen === true };
  }
  const finished = state => Boolean(state.outcome);
  // The amber marker points to the command station; Communications stays signposted.
  const next = () => stations.habitat;
  function objective(state) {
    if (state.outcome === "success") return "Mission complete! Read your debrief.";
    if (state.outcome) return "The mission has ended. Read your debrief and try a new plan.";
    const light = shifts[state.shift] === "sunlight" ? "Sunlight: +4 solar energy" : "Shadow: no solar charging";
    return `Shift ${state.shift + 1} of 3 · ${light}. Choose a command at the Habitat${state.reported ? "" : " or Communications"}.`;
  }
  function debrief(state) {
    if (!state.outcome) return null;
    const last = state.history.at(-1);
    const plan = state.history.map(entry => commands[entry.command].name).join(" → ");
    const when = `shift ${last.shift + 1} (${shifts[last.shift]})`;
    const reportedInShadow = state.history.some(entry => entry.command === "report" && entry.solar === 0);
    const results = {
      success: ["Mission success!", `Your crew finished all three shifts with ${state.battery} battery and ${state.oxygen} oxygen safety, and your report reached Earth.`,
        "Replay and look for a different winning plan. Could the report go out on another shift?"],
      power: ["Power ran out", `After ${commands[last.command].name.toLowerCase()} on ${when}, the battery reached 0.`,
        reportedInShadow ? "The report costs 4 energy. Try sending it in sunlight, when the panels add 4." : "Try Save power during a shadow shift. It uses 1 energy instead of 2."],
      oxygen: ["Life support ran low", `After ${commands[last.command].name.toLowerCase()} on ${when}, oxygen safety reached 0.`,
        "Saving power lowers oxygen safety. Try Hold steady or the report once to restore 1."],
      science: ["No report reached Earth", "Your crew survived all three shifts, but the science report was never sent.",
        "Send the report while the sun charges your battery. Sunlight adds 4 energy."]
    };
    const [title, consequence, change] = results[state.outcome];
    return { title, plan, consequence, change, success: state.outcome === "success" };
  }
  const copy = {
    steps: ["Shift 1 · Sun", "Shift 2 · Shadow", "Shift 3 · Shadow"],
    welcome: [
      ["Three shifts to go", "Hi again! The sun is up for shift 1, then the outpost slides into two shadow shifts with no solar power at all.", "What do we need to do?"],
      ["Power through the shadows", "Keep the battery and oxygen safety above zero for all three shifts, and send one science report to Earth.", "Where do I choose?"],
      ["Your command stations", "The Habitat runs Hold steady or Save power. Communications sends the report. Walking, looking and previewing are free. Nothing changes until you confirm.", "Let's plan"]
    ],
    stationTitle: { habitat: "Habitat command", communications: "Communications" },
    station: (state, id) => id === "communications" && state.reported ? "Our report already reached Earth. Use the Habitat to command the remaining shifts." :
      id === "communications" ? "Sending the report uses 4 energy, including habitat power. Choose it to see what would happen." :
      "Pick a command to preview its effect. Closing this panel spends no shift.",
    hint: state => state.outcome ? "Your debrief is ready. Read what happened, then try a new plan." :
      state.shift === 0 && !state.reported ? "Sunlight adds 4 energy this shift. The report is our most expensive command. When will we have the most energy to spare?" :
      state.shift === 2 && !state.reported ? "This is the last shift and Earth hasn't heard from us. Check whether the battery can cover the report's 4 energy." :
      "No sunlight now. Hold steady costs 2 energy and restores oxygen. Save power costs 1 but lowers oxygen safety by 1. Preview before you confirm.",
    sending: "Transmitting our science report to Earth…",
    shiftDone: entry => `${commands[entry.command].name}: solar +${entry.solar}, energy −${entry.cost}, oxygen ${entry.oxygenChange > 0 ? "+" : "−"}1. Battery ${entry.battery} / 9, oxygen safety ${entry.oxygen} / 3.`,
    recorder: "Here's every command so far, with its effect on the outpost."
  };
  return { id: 2, shifts, maxBattery, maxOxygen, commands, stations, copy, create, available, preview, resolve, restore, finished, next, objective, debrief };
})();
if (typeof module !== "undefined") module.exports = Mission2;
