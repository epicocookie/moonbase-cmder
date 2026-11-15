// Shared Mission 3 rules and lunar cave science content. No DOM or storage here.
const Mission3 = (() => {
  const MAX_ENERGY = 9;
  const MAX_OXYGEN = 3;
  const SHIFTS = ["sunlight", "shadow", "shadow", "shadow"];
  const SURFACE_COST = 1;
  const CAVE_SCAN_COST = 2; // Deep cave exploration costs 2 energy instead of 1.

  const report =
    "Subsurface lava tube mapped with 3 structural scans. Thick basalt overhead shields against radiation and micrometeorites, while shaded overhangs hold steady ~17 °C temperatures.";

  const sites = {
    entrance: {
      id: "entrance",
      name: "Pit skylight & seismic test",
      x: 8,
      z: 1.5,
      icon: "🕳",
      reading: "Seismic echo confirms hollow lava tube below",
      response: "Surface vibrations scattered back from a void ahead! Walk down the crater ramp into the lava-tube entrance.",
      fact: "In NASA-supported GEODES tests, scientists sent seismic vibrations into volcanic ground (like a CT scan) to detect hidden lava tubes below.",
      sourceTitle: "NASA Science — Hammering Out a Way to Find Shelter on the Moon and Mars",
      source: "https://science.nasa.gov/blogs/science-news/2025/09/26/hammering-out-shelter-on-moon-and-mars/"
    },
    chamber1: {
      id: "chamber1",
      name: "Lava-tube overhang",
      x: 8,
      z: 8.8,
      icon: "🪨",
      reading: "Cooled basalt ceiling arch verified",
      response: "We're inside the ancient lava tube! Thick volcanic rock overhead blocks radiation and micrometeorites.",
      fact: "Lunar lava tubes formed when molten basaltic lava flowed beneath a cooled crust, leaving a hollow tunnel when the lava drained away.",
      sourceTitle: "NASA Science — Lunar Volcanism",
      source: "https://science.nasa.gov/moon/lunar-volcanism/"
    },
    chamber2: {
      id: "chamber2",
      name: "Thermal pocket",
      x: 8,
      z: 11.8,
      icon: "🌡",
      reading: "Steady ~17 °C (63 °F) cave temperature",
      response: "Temperatures here stay mild even as lunar shadow falls outside. One more structural scan deeper in.",
      fact: "LRO Diviner data showed permanently shadowed pit overhangs stay near 63 °F (17 °C), compared to 260 °F (127 °C) days and −280 °F (−173 °C) nights on the surface.",
      sourceTitle: "NASA — LRO Finds Lunar Pits Harbor Comfortable Temperatures",
      source: "https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/"
    },
    chamber3: {
      id: "chamber3",
      name: "Deep radar chamber",
      x: 8,
      z: 14.8,
      icon: "📡",
      reading: "Subsurface conduit extends >60 m (200 ft)",
      response: "All 3 structural scans complete! Radio signals are blocked by the rock roof—walk back up to Surface Comms to transmit.",
      fact: "Re-analyzing LRO Mini-RF radar data from the Mare Tranquillitatis pit revealed an underground cave extending more than 200 feet from the pit base.",
      sourceTitle: "NASA Science — New Evidence Adds to Findings Hinting at Network of Caves on Moon",
      source: "https://science.nasa.gov/solar-system/moon/new-evidence-adds-to-findings-hinting-at-network-of-caves-on-moon/"
    }
  };

  const CAVE_SITES = ["chamber1", "chamber2", "chamber3"];

  function create() {
    return {
      shift: 0,
      energy: 5,
      oxygen: 3,
      caveLocated: false,
      scans: [],
      reported: false,
      failed: false,
      failReason: ""
    };
  }

  function restore(value) {
    if (!value || typeof value !== "object") return null;
    const validScans =
      Array.isArray(value.scans) &&
      value.scans.length <= CAVE_SITES.length &&
      value.scans.every(id => CAVE_SITES.includes(id)) &&
      new Set(value.scans).size === value.scans.length;

    if (
      !validScans ||
      !Number.isInteger(value.shift) || value.shift < 0 || value.shift > SHIFTS.length ||
      !Number.isInteger(value.energy) || value.energy < 0 || value.energy > MAX_ENERGY ||
      !Number.isInteger(value.oxygen) || value.oxygen < 0 || value.oxygen > MAX_OXYGEN ||
      typeof value.caveLocated !== "boolean" ||
      typeof value.reported !== "boolean" ||
      typeof value.failed !== "boolean" ||
      (value.reported && (!value.caveLocated || value.scans.length !== CAVE_SITES.length))
    ) {
      return null;
    }

    return {
      shift: value.shift,
      energy: value.energy,
      oxygen: value.oxygen,
      caveLocated: value.caveLocated,
      scans: [...value.scans],
      reported: value.reported,
      failed: value.failed,
      failReason: typeof value.failReason === "string" ? value.failReason.slice(0, 160) : ""
    };
  }

  function isFinished(state) {
    return state.reported || state.failed;
  }

  function getSolarEnergy(shiftIdx) {
    return SHIFTS[shiftIdx] === "sunlight" ? 4 : 0;
  }

  function applyOutcome(nextState) {
    if (nextState.energy <= 0) {
      return { ...nextState, energy: 0, failed: true, failReason: "Suit battery depleted inside the lunar cave." };
    }
    if (nextState.oxygen <= 0) {
      return { ...nextState, oxygen: 0, failed: true, failReason: "Oxygen reserves ran out before returning to the surface." };
    }
    if (nextState.shift >= SHIFTS.length && !nextState.reported) {
      return { ...nextState, failed: true, failReason: "All 4 shifts ended before the surface report was sent." };
    }
    return nextState;
  }

  function locateCave(state) {
    if (isFinished(state) || state.caveLocated) return state;
    return applyOutcome({
      ...state,
      energy: Math.max(0, state.energy - SURFACE_COST),
      caveLocated: true
    });
  }

  function scan(state, siteId) {
    if (
      isFinished(state) ||
      !state.caveLocated ||
      !CAVE_SITES.includes(siteId) ||
      state.scans.includes(siteId) ||
      state.shift >= SHIFTS.length
    ) {
      return state;
    }

    const solar = getSolarEnergy(state.shift);
    const nextEnergy = Math.min(MAX_ENERGY, state.energy + solar) - CAVE_SCAN_COST;
    const oxygenDelta = SHIFTS[state.shift] === "shadow" ? -1 : 0;
    const nextOxygen = Math.max(0, Math.min(MAX_OXYGEN, state.oxygen + oxygenDelta));

    return applyOutcome({
      ...state,
      shift: state.shift + 1,
      energy: Math.max(0, nextEnergy),
      oxygen: nextOxygen,
      scans: [...state.scans, siteId]
    });
  }

  function submit(state) {
    if (
      isFinished(state) ||
      !state.caveLocated ||
      state.scans.length !== CAVE_SITES.length ||
      state.shift >= SHIFTS.length
    ) {
      return state;
    }

    const solar = getSolarEnergy(state.shift);
    const nextEnergy = Math.min(MAX_ENERGY, state.energy + solar) - SURFACE_COST;

    return applyOutcome({
      ...state,
      shift: state.shift + 1,
      energy: Math.max(0, nextEnergy),
      reported: nextEnergy > 0
    });
  }

  function next(state) {
    if (!state.caveLocated) return sites.entrance;
    const nextId = CAVE_SITES.find(id => !state.scans.includes(id));
    if (nextId) return sites[nextId];
    return { id: "communications", name: "Surface communications", x: 0, z: -4 };
  }

  function objective(state) {
    if (state.failed) return `Mission failed: ${state.failReason}`;
    if (state.reported) return "Report transmitted from the surface! Cave mission complete.";
    if (!state.caveLocated) return "Locate the cave skylight on the surface (costs 1 energy).";
    if (state.scans.length < CAVE_SITES.length) {
      return `Collect structural scan ${state.scans.length + 1} of 3 at ${next(state).name} (costs 2 energy).`;
    }
    return "All 3 cave scans done! Return to surface communications to send 1 report (costs 1 energy).";
  }

  return {
    MAX_ENERGY,
    MAX_OXYGEN,
    SHIFTS,
    SURFACE_COST,
    CAVE_SCAN_COST,
    CAVE_SITES,
    sites,
    report,
    create,
    restore,
    isFinished,
    locateCave,
    scan,
    submit,
    next,
    objective
  };
})();

if (typeof module !== "undefined") module.exports = Mission3;