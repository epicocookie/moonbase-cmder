// Shared expedition rules and authored science content. No DOM or storage here.
const Mission1 = (() => {
  const report = "Our clues suggest there may be ice in the shade. We need more tests to be sure.";
  const sites = {
    shadow: {
      id: "shadow", name: "Shaded crater", x: 8, z: 3, icon: "☾",
      reading: "Ice-like light pattern detected",
      response: "An ice-like pattern! Let's compare it with the sunlit sample before we send our finding home.",
      found: "A clue to ice! Now let's check the sunny sample.",
      tip: "Place a ground scanner over the dark sample inside the crater.",
      fact: "Near the Moon's poles, some crater floors never receive direct sunlight. Their deep cold can preserve water ice.",
      source: "https://science.nasa.gov/moon/moon-water-and-ices/"
    },
    sunlit: {
      id: "sunlit", name: "Sunlit reference", x: 5, z: 6, icon: "☀",
      reading: "Rock-like light pattern detected",
      response: "This sample has a different light pattern. Comparing the two readings helps us check our idea about ice.",
      found: "This looks more like rock. Let's check the shaded sample too.",
      tip: "Place a ground scanner over the bright sample beside the crater.",
      fact: "Scientists can identify water ice from the way it absorbs certain kinds of light. Instruments help us see patterns our eyes can't.",
      source: "https://www.jpl.nasa.gov/news/ice-confirmed-at-the-moons-poles/"
    }
  };
  const fieldScreen = { id: "field-screen", name: "Field screen", x: 3, z: 0 };
  // Pip's dialogue for this mission. The shared controller reads it; nothing here touches the page.
  const copy = {
    steps: ["Place & scan", "Compare", "Field screen", "Send"],
    welcome: [
      ["Hi, I'm Pip!", "I spotted a clue near the dark crater. Let's see what it could be!", "How do we check?"],
      ["Let's find two clues", "Follow the marker. Put a scanner at each sample, then use our screen to compare them.", "Let's go!"]
    ],
    hintDone: "Your finding has reached Earth! You can read your journal or try another expedition.",
    hintScreen: "Both clues are ready! Follow the marker and set down our screen.",
    hintReport: "Ready! Go to the base radio and send your clues home.",
    hintSite: site => `Follow the amber marker to the ${site.name.toLowerCase()}. ${site.tip}`,
    bothFound: "Two clues! Let's put down our screen and look at them together.",
    scanTitle: "Let's take a closer look",
    scanIntro: "Put the scanner here. It will check the sample for us.",
    scanning: "Scanner ready! Watch it check the sample.",
    reviewTitle: "What do our clues suggest?",
    reviewReady: "The shaded sample has a clue to ice. The sunny sample looks more like rock. What a find!",
    reviewWaiting: "Find both clues and check our screen first. Ask me if you need help.",
    habitat: "This habitat gives our crew a place to rest and study their findings. Our solar panels keep the instruments running while we explore. What would you pack for a stay on the Moon?",
    sending: "Your clues are on their way to Earth!",
    celebration: "Earth got your message! You found a clue to ice. Great teamwork!",
    journalOffline: "Here's your finding to keep exploring. Browser saving is unavailable, so read your journal here before leaving.",
    journalOpen: "Every observation is a step into the unknown. Here's what you've found so far."
  };
  function create() { return { observations: [], deployed: [], screenDeployed: false, reported: false, reviewed: false, welcomeSeen: false }; }
  function restore(value) {
    if (!value || !Array.isArray(value.observations) || value.observations.length > 2 ||
        !value.observations.every(id => Object.hasOwn(sites, id)) ||
        new Set(value.observations).size !== value.observations.length ||
        typeof value.reported !== "boolean" || (value.reported && value.observations.length !== 2)) return null;
    const deployed = value.deployed === undefined ? [...value.observations] : value.deployed;
    if (!Array.isArray(deployed) || deployed.length > 2 ||
        !deployed.every(id => Object.hasOwn(sites, id)) || new Set(deployed).size !== deployed.length ||
        !value.observations.every(id => deployed.includes(id))) return null;
    const reviewed = value.reported || (value.observations.length === 2 && value.reviewed === true);
    const screenDeployed = reviewed || (value.observations.length === 2 && value.screenDeployed === true);
    return { observations: [...value.observations], deployed: [...deployed], screenDeployed,
      reported: value.reported, reviewed, welcomeSeen: value.welcomeSeen === true };
  }
  function deploy(state, id) {
    if (!Object.hasOwn(sites, id) || state.reported || state.deployed.includes(id)) return state;
    return { ...state, deployed: [...state.deployed, id] };
  }
  function deployScreen(state) {
    return state.observations.length === 2 ? { ...state, screenDeployed: true } : state;
  }
  function observe(state, id) {
    if (!Object.hasOwn(sites, id) || state.reported || state.observations.includes(id)) return state;
    return { ...deploy(state, id), observations: [...state.observations, id] };
  }
  function review(state) {
    return state.observations.length === 2 && state.screenDeployed ? { ...state, reviewed: true } : state;
  }
  function submit(state) {
    return state.observations.length === 2 && state.screenDeployed && state.reviewed ? { ...state, reported: true } : state;
  }
  function next(state) {
    return Object.values(sites).find(site => !state.observations.includes(site.id)) ||
      (!state.reviewed ? fieldScreen : { id: "communications", name: "Communications", x: 0, z: -4 });
  }
  function objective(state) {
    if (state.reported) return "Earth got your clues! Open your journal.";
    if (state.reviewed) return "Ready! Send your clues from the base radio.";
    if (state.observations.length === 2) return state.screenDeployed ? "Open your screen. Look at both clues." : "Follow the marker. Put down your screen.";
    return `${state.observations.length ? "Compare your finding" : "Your first discovery awaits"}: ${state.deployed.includes(next(state).id) ? "resume the scanner at" : "place a scanner at"} the ${next(state).name.toLowerCase()}.`;
  }
  const finished = state => state.reported;
  return { id: 1, sites, fieldScreen, report, copy, finished, create, restore, deploy, deployScreen, observe, review, submit, next, objective };
})();
if (typeof module !== "undefined") module.exports = Mission1;
