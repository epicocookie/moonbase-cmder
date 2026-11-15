// Shared expedition rules and authored science content. No DOM or storage here.
const Mission1 = (() => {
  const report = "Our scans suggest possible water ice in the shaded area. More measurements would help us check.";
  const sites = {
    shadow: {
      id: "shadow", name: "Shaded crater", x: 8, z: 3, icon: "☾",
      reading: "Ice-like light pattern detected",
      response: "An ice-like pattern! Let's compare it with the sunlit sample before we send our finding home.",
      found: "An ice-like pattern! That's exciting, but one reading is only a clue. Let's find out how the sunlit sample compares.",
      tip: "Scan the dark patch inside the crater.",
      fact: "Near the Moon's poles, some crater floors never receive direct sunlight. Their deep cold can preserve water ice.",
      source: "https://science.nasa.gov/moon/moon-water-and-ices/"
    },
    sunlit: {
      id: "sunlit", name: "Sunlit reference", x: 5, z: 6, icon: "☀",
      reading: "Rock-like light pattern detected",
      response: "This sample has a different light pattern. Comparing the two readings helps us check our idea about ice.",
      found: "This sample has a rock-like pattern. Now we have a reference! Let's see whether the shaded sample looks the same.",
      tip: "Scan the bright ground beside the crater to collect a comparison.",
      fact: "Scientists can identify water ice from the way it absorbs certain kinds of light. Instruments help us see patterns our eyes can't.",
      source: "https://www.jpl.nasa.gov/news/ice-confirmed-at-the-moons-poles/"
    }
  };
  // Pip's dialogue for this mission. The shared controller reads it; nothing here touches the page.
  const copy = {
    steps: ["Investigate", "Compare", "Review & send"],
    welcome: [
      ["Something caught my eye…", "I'm Pip! Before you landed, my scanner spotted an unusual light pattern near that dark crater. I saved it for us to investigate together.", "What could it be?"],
      ["Let's follow the evidence", "It might be a clue to ice. First, scan the shaded patch and the sunlit rock nearby. Comparing them will help us decide what to tell Earth.", "How do I scan?"],
      ["Your scanner is ready", "Find a sample, line up the target, and start your scan. Watch its light pattern appear. You can explore either site first, and ask me for a hint anytime.", "Let's explore"]
    ],
    hintDone: "Your finding has reached Earth! You can read your journal or try another expedition.",
    hintReport: "We have both readings! Follow the blue Communications sign and send our possible-ice finding to Earth.",
    hintSite: site => `Follow the amber marker to the ${site.name.toLowerCase()}. ${site.tip}`,
    bothFound: "Two places, two different patterns! Let's bring both readings to Communications and look at the evidence together.",
    scanTitle: "Let's take a closer look",
    scanIntro: "Line up the sample in your scanner. We'll collect its light pattern and see what it tells us.",
    scanning: "Target locked. I'm collecting the sample's light pattern. Let's see what appears!",
    reviewTitle: "What do our clues suggest?",
    reviewReady: "The shaded sample has an ice-like pattern. The sunlit sample looks more like rock. Together, they suggest possible ice. More measurements would help us check.",
    reviewWaiting: "Earth will want to see both readings. Let's scan the shaded patch and the sunlit reference before we send our finding.",
    habitat: "This habitat gives our crew a place to rest and study their findings. Our solar panels keep the instruments running while we explore. What would you pack for a stay on the Moon?",
    sending: "Our two readings and your careful conclusion are on their way to Earth. Let's listen for a reply.",
    celebration: "Mission Control says: Great observing, team! You've found a promising place to investigate. Pip: You checked the clues before deciding. That's how discoveries begin.",
    journalOffline: "Here's your finding to keep exploring. Browser saving is unavailable, so read your journal here before leaving.",
    journalOpen: "Every observation is a step into the unknown. Here's what you've found so far."
  };
  function create() { return { observations: [], reported: false, reviewed: false, welcomeSeen: false }; }
  function restore(value) {
    if (!value || !Array.isArray(value.observations) || value.observations.length > 2 ||
        !value.observations.every(id => Object.hasOwn(sites, id)) ||
        new Set(value.observations).size !== value.observations.length ||
        typeof value.reported !== "boolean" || (value.reported && value.observations.length !== 2)) return null;
    return { observations: [...value.observations], reported: value.reported, reviewed: value.reported || (value.observations.length === 2 && value.reviewed === true), welcomeSeen: value.welcomeSeen === true };
  }
  function observe(state, id) {
    if (!Object.hasOwn(sites, id) || state.reported || state.observations.includes(id)) return state;
    return { ...state, observations: [...state.observations, id] };
  }
  function review(state) {
    return state.observations.length === 2 ? { ...state, reviewed: true } : state;
  }
  function submit(state) {
    return state.observations.length === 2 && state.reviewed ? { ...state, reported: true } : state;
  }
  function next(state) {
    return Object.values(sites).find(site => !state.observations.includes(site.id)) ||
      { id: "communications", name: "Communications", x: 0, z: -4 };
  }
  function objective(state) {
    if (state.reported) return "Your finding is home. Open your discovery journal!";
    if (state.observations.length === 2) return "Both scans collected! Review your evidence at Communications.";
    return `${state.observations.length ? "Compare your finding" : "Your first discovery awaits"}: scan the ${next(state).name.toLowerCase()}.`;
  }
  const finished = state => state.reported;
  return { id: 1, sites, report, copy, finished, create, restore, observe, review, submit, next, objective };
})();
if (typeof module !== "undefined") module.exports = Mission1;
