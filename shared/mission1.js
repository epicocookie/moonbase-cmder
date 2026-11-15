// Shared expedition rules and authored science content. No DOM or storage here.
const Mission1 = (() => {
  const report = "Our scans suggest possible water ice in the shaded area. More measurements would help us check.";
  const sites = {
    shadow: {
      id: "shadow", name: "Shaded crater", x: 8, z: 3, icon: "☾",
      reading: "Ice-like light pattern detected",
      response: "An ice-like pattern! Let's compare it with the sunlit sample before we send our finding home.",
      found: "An ice-like pattern! That's exciting, but one reading is only a clue. Let's find out how the sunlit sample compares.",
      tip: "Place a ground scanner over the dark sample inside the crater.",
      fact: "Near the Moon's poles, some crater floors never receive direct sunlight. Their deep cold can preserve water ice.",
      source: "https://science.nasa.gov/moon/moon-water-and-ices/"
    },
    sunlit: {
      id: "sunlit", name: "Sunlit reference", x: 5, z: 6, icon: "☀",
      reading: "Rock-like light pattern detected",
      response: "This sample has a different light pattern. Comparing the two readings helps us check our idea about ice.",
      found: "This sample has a rock-like pattern. Now we have a reference! Let's see whether the shaded sample looks the same.",
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
      ["Something caught my eye…", "I'm Pip! Before you landed, my scanner spotted an unusual light pattern near that dark crater. I saved it for us to investigate together.", "What could it be?"],
      ["Let's follow the evidence", "It might be a clue to ice. First, scan the shaded patch and the sunlit rock nearby. Comparing them will help us decide what to tell Earth.", "How do I scan?"],
      ["Your scanner is ready", "Carry a scanner to either sample and place it over the marked spot. Its legs unfold and it scans for you. Then we can set up our portable screen to compare the findings.", "Let's explore"]
    ],
    hintDone: "Your finding has reached Earth! You can read your journal or try another expedition.",
    hintScreen: "We have both readings! Set our portable screen on the marked ground near Communications. Review the findings there before we send them home.",
    hintReport: "Our evidence is reviewed! Walk to Communications and send your finding to Earth.",
    hintSite: site => `Follow the amber marker to the ${site.name.toLowerCase()}. ${site.tip}`,
    bothFound: "Both scanners have sent their readings to our kit! Let's place the portable screen on the marked ground and compare what they found.",
    scanTitle: "Let's take a closer look",
    scanIntro: "Place a scanner over this sample. It will unfold its legs, settle onto the ground, and collect the light pattern for us.",
    scanning: "The scanner is standing on its own! Watch its beam sweep across the sample while the reading comes through.",
    reviewTitle: "What do our clues suggest?",
    reviewReady: "The shaded sample has an ice-like pattern. The sunlit sample looks more like rock. Together, they suggest possible ice. More measurements would help us check.",
    reviewWaiting: "We need both readings and a review on our field screen first. Pip will guide you to the next step.",
    habitat: "This habitat gives our crew a place to rest and study their findings. Our solar panels keep the instruments running while we explore. What would you pack for a stay on the Moon?",
    sending: "Our two readings and your careful conclusion are on their way to Earth. Let's listen for a reply.",
    celebration: "Mission Control says: Great observing, team! You've found a promising place to investigate. Pip: You checked the clues before deciding. That's how discoveries begin.",
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
    if (state.reported) return "Your finding is home. Open your discovery journal!";
    if (state.reviewed) return "Evidence reviewed! Send your finding from Communications.";
    if (state.observations.length === 2) return state.screenDeployed ? "Open your field screen and review both readings." : "Place your portable field screen near Communications.";
    return `${state.observations.length ? "Compare your finding" : "Your first discovery awaits"}: ${state.deployed.includes(next(state).id) ? "resume the scanner at" : "place a scanner at"} the ${next(state).name.toLowerCase()}.`;
  }
  const finished = state => state.reported;
  return { id: 1, sites, fieldScreen, report, copy, finished, create, restore, deploy, deployScreen, observe, review, submit, next, objective };
})();
if (typeof module !== "undefined") module.exports = Mission1;
