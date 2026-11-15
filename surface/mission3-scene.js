import * as THREE from "three";

if (typeof Mission3 === "undefined") {
  const loading = document.getElementById("loading");
  if (loading) loading.textContent = "Missing shared/mission3.js. Create it first, then reload.";
  throw new Error("Mission3 module is not loaded.");
}

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const mount = $("scene");

// --- Scene, Camera, Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080d);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
mount.append(renderer.domElement);

// --- Lighting ---
scene.add(new THREE.HemisphereLight(0xb8c9df, 0x161920, 0.4));
const sunlight = new THREE.DirectionalLight(0xffedcf, 3.0);
sunlight.position.set(-24, 14, -10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -22;
sunlight.shadow.camera.right = 22;
sunlight.shadow.camera.top = 22;
sunlight.shadow.camera.bottom = -22;
sunlight.shadow.camera.far = 90;
sunlight.shadow.bias = -0.0002;
sunlight.shadow.normalBias = 0.035;
scene.add(sunlight);

// Astronaut helmet headlamp illuminates the basalt cave walls where you look
const headlamp = new THREE.SpotLight(0xeef6ff, 16, 20, Math.PI / 4.2, 0.55, 1.3);
scene.add(headlamp);
scene.add(headlamp.target);

// --- Terrain Height: Flat outpost + sunken skylight pit + flat underground cave floor ---
const PIT_X = 8;
const RAMP_START_Z = 2.0;
const CAVE_MOUTH_Z = 6.8;
const CAVE_END_Z = 16.2;
const CAVE_FLOOR_Y = -3.2;

function groundHeight(x, z) {
  // Subtle lunar surface ripples
  let y = 0.03 * Math.sin(x * 0.9) * Math.cos(z * 0.8);

  // Corridor around x = 8 from z = 2 to z = 16.8
  const dx = Math.abs(x - PIT_X);
  if (z >= RAMP_START_Z - 1.2 && z <= CAVE_END_Z + 1.5 && dx < 4.4) {
    // Smooth width profile: 1 in center (dx <= 2.6), blends up to 0 at dx = 4.4
    const edgeT = clamp(1 - (dx - 2.6) / 1.8, 0, 1);
    const widthFactor = edgeT * edgeT * (3 - 2 * edgeT);

    // Ramp goes from 0 at z = 2.0 down to -3.2 at z = 6.8, then stays flat underground
    const rampT = clamp((z - RAMP_START_Z) / (CAVE_MOUTH_Z - RAMP_START_Z), 0, 1);
    const rampSmooth = rampT * rampT * (3 - 2 * rampT);

    // Taper smoothly back at the far end behind the sealed cave wall
    const backT = z > CAVE_END_Z ? clamp(1 - (z - CAVE_END_Z) / 1.5, 0, 1) : 1;

    y = y * (1 - widthFactor) + CAVE_FLOOR_Y * rampSmooth * widthFactor * backT;
  }

  // Distant horizon ridge
  const range = Math.hypot(x, z);
  const ridge = Math.exp(-((range - 36) ** 2) / 55);
  return y + ridge * (2.4 + 0.8 * Math.sin(x * 0.3) + 0.6 * Math.cos(z * 0.5));
}

const regolithMat = new THREE.MeshStandardMaterial({ color: 0x767a7e, roughness: 1, vertexColors: true });
const land = new THREE.PlaneGeometry(140, 140, 180, 180);
land.rotateX(-Math.PI / 2);
const pos = land.attributes.position;
const shades = [];
for (let i = 0; i < pos.count; i++) {
  const vx = pos.getX(i) * (0.5 + 0.5 * (pos.getX(i) / 70) ** 2);
  const vz = pos.getZ(i) * (0.5 + 0.5 * (pos.getZ(i) / 70) ** 2);
  const vy = groundHeight(vx, vz);
  pos.setXYZ(i, vx, vy, vz);
  const darkFactor = vy < -0.5 ? 0.38 : 0.82 + 0.14 * Math.random();
  shades.push(darkFactor, darkFactor, darkFactor);
}
land.setAttribute("color", new THREE.Float32BufferAttribute(shades, 3));
land.computeVertexNormals();
const ground = new THREE.Mesh(land, regolithMat);
ground.receiveShadow = true;
ground.castShadow = true;
scene.add(ground);

// --- Starfield & Earth ---
const starCoords = new Float32Array(240 * 3);
for (let i = 0; i < 240; i++) {
  starCoords[i * 3] = (Math.random() - 0.5) * 100;
  starCoords[i * 3 + 1] = 10 + Math.random() * 45;
  starCoords[i * 3 + 2] = (Math.random() - 0.5) * 100;
}
const starsGeo = new THREE.BufferGeometry();
starsGeo.setAttribute("position", new THREE.BufferAttribute(starCoords, 3));
scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xb8c8df, size: 0.12 })));

const earth = new THREE.Mesh(new THREE.CircleGeometry(1.05, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
earth.position.set(-12, 13, -28);
earth.lookAt(0, 1, 0);
earth.visible = false;
scene.add(earth);
new THREE.TextureLoader().load("./launch/assets/earth-blue-marble.jpg", tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  earth.material.map = tex;
  earth.material.needsUpdate = true;
  earth.visible = true;
}, undefined, () => {});

// --- Outpost Structures ---
const habitatMat = new THREE.MeshStandardMaterial({ color: 0xc6c9c9, roughness: 0.58, metalness: 0.12 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x747f89, roughness: 0.42, metalness: 0.68 });
const panelMat = new THREE.MeshStandardMaterial({ color: 0x173957, roughness: 0.32, metalness: 0.48 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x263946, roughness: 0.7 });

const solids = [];

const habitat = new THREE.Group();
const hBase = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.35, 28), metalMat);
hBase.position.y = 0.175;
const hDome = new THREE.Mesh(new THREE.SphereGeometry(1.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), habitatMat);
hDome.position.y = 0.35;
habitat.add(hBase, hDome);
habitat.scale.setScalar(1.65);
habitat.position.set(-5.5, groundHeight(-5.5, -1), -1);
scene.add(habitat);
solids.push(new THREE.Box3().setFromObject(habitat));

function addPanel(x, z) {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.8), panelMat);
  deck.position.y = 1.1;
  deck.castShadow = true;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 8), metalMat);
  leg.position.y = 0.55;
  g.add(deck, leg);
  g.position.set(x, groundHeight(x, z), z);
  scene.add(g);
  solids.push(new THREE.Box3().setFromObject(g));
}
addPanel(-3.5, -7);
addPanel(3.5, -7);

// --- True Underground Lava Tube (clean upper basalt arch + solid surface roof crust) ---
const basaltMat = new THREE.MeshStandardMaterial({
  color: 0x333840,
  roughness: 0.94,
  flatShading: true,
  side: THREE.DoubleSide
});

// Upper half-cylinder arch: theta -PI/2..PI/2 rotated -PI/2 around X gives a clean upright vault along Z!
const tunnelLen = CAVE_END_Z - CAVE_MOUTH_Z + 0.6;
const tunnelGeo = new THREE.CylinderGeometry(2.85, 2.85, tunnelLen, 20, 14, true, -Math.PI / 2, Math.PI);
tunnelGeo.rotateX(-Math.PI / 2);

const tPos = tunnelGeo.attributes.position;
for (let i = 0; i < tPos.count; i++) {
  const vx = tPos.getX(i);
  const vy = tPos.getY(i);
  const vz = tPos.getZ(i);
  // Natural rough lava-tube texture without closing the doorway
  const wobble = 0.14 * Math.sin(vx * 2.2 + vz * 1.1) + 0.1 * Math.cos(vy * 2.4 - vz * 0.9);
  tPos.setXYZ(i, vx + wobble * 0.6, vy + (vy > 0.2 ? wobble * 0.4 : 0), vz);
}
tunnelGeo.computeVertexNormals();

const tunnelVault = new THREE.Mesh(tunnelGeo, basaltMat);
tunnelVault.position.set(PIT_X, CAVE_FLOOR_Y - 0.1, (CAVE_MOUTH_Z + CAVE_END_Z) / 2);
tunnelVault.receiveShadow = true;
tunnelVault.castShadow = true;
scene.add(tunnelVault);

// Intact lunar crust cap bridging OVER the underground lava tube at surface height (y = 0)
const crustMat = new THREE.MeshStandardMaterial({ color: 0x62666b, roughness: 0.98, flatShading: true });
const crustCap = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.35, 11.4), crustMat);
crustCap.position.set(PIT_X, -0.05, 12.5);
crustCap.receiveShadow = true;
crustCap.castShadow = true;
scene.add(crustCap);

// Thick basalt overhang brow right at the cave mouth (z = 6.8)
const brow = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.55, 0.9), basaltMat);
brow.position.set(PIT_X, -0.35, CAVE_MOUTH_Z + 0.25);
brow.castShadow = true;
scene.add(brow);

// Sealed basalt back wall at the deep end of the tunnel
const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 0.8), basaltMat);
backWall.position.set(PIT_X, CAVE_FLOOR_Y + 1.6, CAVE_END_Z + 0.2);
backWall.receiveShadow = true;
scene.add(backWall);

// Solid rim boulders framing the pit opening — ALL added to `solids` so you cannot clip through them!
function addSolidRock(x, y, z, radius) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), basaltMat);
  rock.position.set(x, y, z);
  rock.rotation.set(x * 0.4, z * 0.6, 0.2);
  rock.scale.set(1.15, 0.85, 1.1);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  solids.push(new THREE.Box3().setFromObject(rock));
}

const rimRocks = [
  [4.3, 0.2, 2.8, 0.85], [4.1, 0.2, 4.6, 0.95], [4.2, 0.2, 6.4, 1.0],
  [11.7, 0.2, 2.8, 0.85], [11.9, 0.2, 4.6, 0.95], [11.8, 0.2, 6.4, 1.0],
  [5.4, 0.2, 7.6, 0.8], [10.6, 0.2, 7.6, 0.8]
];
for (const [rx, ry, rz, r] of rimRocks) addSolidRock(rx, ry, rz, r);

// --- Floating Labels ---
function addLabel(text, x, y, z, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 88;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#101820";
  ctx.fillRect(0, 0, 512, 88);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 10, 88);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text.toUpperCase(), 256, 55);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false }));
  sprite.scale.set(0.24, 0.042, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}

// --- Stations: Communications + Pit Skylight + 3 Cave Chambers ---
const stations = [];

const comms = new THREE.Group();
const cBox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), metalMat);
cBox.position.y = 0.525;
const cScreen = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.38, 0.05),
  new THREE.MeshStandardMaterial({ color: 0x14222b, emissive: 0x8ae5f1, emissiveIntensity: 0.45 })
);
cScreen.position.set(0, 0.8, 0.285);
comms.add(cBox, cScreen);
comms.position.set(0, groundHeight(0, -4), -4);
scene.add(comms);
solids.push(new THREE.Box3().setFromObject(comms));
addLabel("Surface Comms", 0, groundHeight(0, -4) + 1.6, -4, "#8ae5f1");
stations.push({ id: "communications", name: "Surface communications", x: 0, z: -4 });

const dishMast = new THREE.Group();
dishMast.position.set(1.2, groundHeight(1.2, -4.3), -4.3);
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.7, 10), metalMat);
pole.position.y = 0.85;
const bowl = new THREE.Mesh(
  new THREE.SphereGeometry(0.65, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xc6c9c9, side: THREE.DoubleSide })
);
bowl.position.y = 1.75;
bowl.scale.y = 0.32;
bowl.rotation.x = -0.65;
dishMast.add(pole, bowl);
scene.add(dishMast);
solids.push(new THREE.Box3().setFromObject(dishMast));

const stationMeshes = new Map();
for (const site of Object.values(Mission3.sites)) {
  const isEntrance = site.id === "entrance";
  const color = isEntrance ? 0xffc267 : 0x7de8f4;
  const g = new THREE.Group();
  const y = groundHeight(site.x, site.z);
  g.position.set(site.x, y, site.z);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.035, 8, 32),
    new THREE.MeshBasicMaterial({ color })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;

  const core = new THREE.Mesh(
    isEntrance ? new THREE.ConeGeometry(0.24, 0.65, 6) : new THREE.CylinderGeometry(0.18, 0.24, 0.72, 10),
    new THREE.MeshStandardMaterial({ color: 0x263946, emissive: color, emissiveIntensity: 0.45 })
  );
  core.position.y = 0.42;

  const light = new THREE.PointLight(color, isEntrance ? 2.0 : 3.5, 7);
  light.position.y = 1.1;

  g.add(ring, core, light);
  scene.add(g);
  stationMeshes.set(site.id, { ring, core, light });
  addLabel(site.name, site.x, y + 1.55, site.z, isEntrance ? "#ffc267" : "#8ae5f1");
  stations.push({ id: site.id, name: site.name, x: site.x, z: site.z });
}

// Waypoint Beacon
const marker = new THREE.Group();
const beam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8),
  new THREE.MeshBasicMaterial({ color: 0xffc267, transparent: true, opacity: 0.65, depthWrite: false })
);
beam.position.y = 1.1;
const diamond = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.16),
  new THREE.MeshBasicMaterial({ color: 0xffc267 })
);
diamond.position.y = 2.3;
marker.add(beam, diamond);
scene.add(marker);

// --- Astronaut Suit ---
const suit = new THREE.Group();
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe3dfd3 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xd59842, metalness: 0.52, roughness: 0.28 });
function suitPart(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  suit.add(m);
  return m;
}
suitPart(new THREE.CapsuleGeometry(0.23, 0.27), whiteMat, 0, 0.83, 0);
suitPart(new THREE.BoxGeometry(0.38, 0.45, 0.19), trimMat, 0, 0.84, 0.22);
suitPart(new THREE.SphereGeometry(0.24), whiteMat, 0, 1.32, 0);
suitPart(new THREE.SphereGeometry(0.22), goldMat, 0, 1.32, -0.06).scale.set(0.96, 0.78, 1);

const startPos = new THREE.Vector3(0, groundHeight(0, 2.5), 2.5);
suit.position.copy(startPos);
suit.visible = false;
scene.add(suit);

// --- Game State & Safe UI Rendering ---
let state = Mission3.create();
let phase = "briefing";
let third = false;
let yaw = 0;
let pitch = -0.08;
let nearby = null;
const keys = new Set();
let pointer = null;
let lastX = 0;
let lastY = 0;

const modal = $("m3-modal");

function showModal({ eyebrow, title, body, reading = "", fact = "", sourceTitle = "", source = "", finished = false }) {
  $("m3-modal-eyebrow").textContent = eyebrow;
  $("m3-modal-title").textContent = title;
  $("m3-modal-body").textContent = body;

  $("m3-modal-reading").hidden = !reading;
  if (reading) $("m3-modal-reading").textContent = `SIMULATED SCAN · ${reading}`;

  $("m3-modal-fact").hidden = !fact;
  if (fact) $("m3-modal-fact").textContent = fact;

  const sourceEl = $("m3-modal-source");
  sourceEl.hidden = !source;
  if (source) {
    sourceEl.href = source;
    sourceEl.textContent = `${sourceTitle || "Explore the real science at NASA"} ↗`;
  }

  $("m3-modal-restart").hidden = !finished;
  $("m3-modal-close").textContent = finished ? "Close" : "Continue exploring";

  keys.clear();
  pointer = null;
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
  if (!modal.open) modal.showModal();
}

function updateHUD() {
  $("scan-count").textContent = `${state.scans.length} / 3 cave scans`;
  const shiftIdx = Math.min(state.shift, Mission3.SHIFTS.length - 1);
  const shiftType = Mission3.SHIFTS[shiftIdx];
  $("shift-badge").textContent = Mission3.isFinished(state)
    ? `MISSION ENDED · SHIFT ${state.shift} / ${Mission3.SHIFTS.length}`
    : `SHIFT ${state.shift + 1} / ${Mission3.SHIFTS.length} · ${shiftType === "sunlight" ? "SUNLIGHT (+4 ENERGY)" : "SHADOW (+0 ENERGY)"}`;

  $("m3-energy-text").textContent = `${state.energy} / ${Mission3.MAX_ENERGY}`;
  $("m3-energy-bar").style.width = `${(100 * state.energy) / Mission3.MAX_ENERGY}%`;

  $("m3-oxygen-text").textContent = `${state.oxygen} / ${Mission3.MAX_OXYGEN}`;
  $("m3-oxygen-bar").style.width = `${(100 * state.oxygen) / Mission3.MAX_OXYGEN}%`;

  $("objective").textContent = Mission3.objective(state);

  for (const [id, mesh] of stationMeshes) {
    const done = id === "entrance" ? state.caveLocated : state.scans.includes(id);
    mesh.ring.material.color.setHex(done ? 0x7be3b5 : id === "entrance" ? 0xffc267 : 0x7de8f4);
    mesh.light.intensity = done ? 1.0 : 3.2;
  }

  updateNavigation();
  checkStation();
}

function updateNavigation() {
  const next = Mission3.next(state);
  marker.visible = !Mission3.isFinished(state);
  marker.position.set(next.x, groundHeight(next.x, next.z), next.z);
  const dx = next.x - suit.position.x;
  const dz = next.z - suit.position.z;
  $("waypoint-name").textContent = `${next.name} · ${Math.round(Math.hypot(dx, dz))} m`;
  $("waypoint-arrow").style.transform = `rotate(${Math.atan2(dx, -dz) + yaw}rad)`;
}

function checkStation() {
  nearby = stations
    .filter(st => Math.hypot(st.x - suit.position.x, st.z - suit.position.z) <= 2.1)
    .sort((a, b) => Math.hypot(a.x - suit.position.x, a.z - suit.position.z) - Math.hypot(b.x - suit.position.x, b.z - suit.position.z))[0] || null;

  $("use").hidden = !nearby || phase !== "walk";
  if (!nearby) return;

  if (nearby.id === "entrance") {
    $("use").textContent = state.caveLocated ? "Pit skylight scanned · E" : "Run seismic cave test (-1 energy) · E";
  } else if (nearby.id === "communications") {
    $("use").textContent = state.reported
      ? "Report already sent · E"
      : state.scans.length === 3
        ? "Send report to Earth (-1 energy) · E"
        : "Surface Comms (need 3 scans) · E";
  } else {
    const scanned = state.scans.includes(nearby.id);
    $("use").textContent = scanned
      ? `View ${nearby.name} log · E`
      : `Structural scan (-2 energy) · E`;
  }
}

function interact() {
  if (!nearby || phase !== "walk" || modal.open) return;

  if (Mission3.isFinished(state)) {
    showModal({
      eyebrow: state.reported ? "MISSION 03 / SUCCESS" : "MISSION 03 / FAILED",
      title: state.reported ? "Report transmitted!" : "Expedition ended",
      body: Mission3.objective(state),
      finished: true
    });
    return;
  }

  if (nearby.id === "entrance") {
    const site = Mission3.sites.entrance;
    if (!state.caveLocated) {
      state = Mission3.locateCave(state);
      updateHUD();
    }
    showModal({
      eyebrow: "MISSION 03 / SEISMIC RECON",
      title: site.name,
      body: site.response,
      reading: site.reading,
      fact: site.fact,
      sourceTitle: site.sourceTitle,
      source: site.source,
      finished: Mission3.isFinished(state)
    });
    return;
  }

  if (nearby.id === "communications") {
    if (!state.caveLocated || state.scans.length < 3) {
      showModal({
        eyebrow: "MISSION 03 / SURFACE COMMS",
        title: "Not ready to transmit",
        body: "Radio signals can't escape from inside the deep lava tube, and Mission Control needs all 3 structural scans first."
      });
      return;
    }
    state = Mission3.submit(state);
    updateHUD();
    showModal({
      eyebrow: state.reported ? "MISSION 03 / COMPLETE" : "MISSION 03 / FAILED",
      title: state.reported ? "Report received on Earth!" : "Transmission failed",
      body: state.reported ? Mission3.report : state.failReason,
      reading: state.reported ? `Final Energy: ${state.energy}/9 · Final Oxygen: ${state.oxygen}/3` : "",
      finished: true
    });
    return;
  }

  const site = Mission3.sites[nearby.id];
  if (!site) return;

  if (!state.caveLocated) {
    showModal({
      eyebrow: "MISSION 03 / SAFETY CHECK",
      title: "Locate the cave entrance first",
      body: "Follow the amber beacon to the pit skylight on the surface before collecting deep cave scans."
    });
    return;
  }

  if (!state.scans.includes(site.id)) {
    state = Mission3.scan(state, site.id);
    updateHUD();
  }

  showModal({
    eyebrow: Mission3.isFinished(state) ? "MISSION 03 / FAILED" : `MISSION 03 / SCAN ${state.scans.length} OF 3`,
    title: site.name,
    body: state.failed ? state.failReason : site.response,
    reading: site.reading,
    fact: site.fact,
    sourceTitle: site.sourceTitle,
    source: site.source,
    finished: Mission3.isFinished(state)
  });
}

function restartMission() {
  state = Mission3.create();
  suit.position.copy(startPos);
  yaw = 0;
  pitch = -0.08;
  if (modal.open) modal.close();
  aimCamera();
  updateHUD();
}

// --- Movement, Camera & Headlamp ---
const eye = new THREE.Vector3();
const dir = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function aimCamera() {
  dir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  eye.copy(suit.position);
  eye.y += 1.32;
  suit.visible = third;

  headlamp.position.copy(eye);
  headlamp.target.position.copy(eye).addScaledVector(dir, 6);

  if (third) {
    camera.position.copy(eye).addScaledVector(dir, -2.2);
    camera.position.y = Math.max(camera.position.y + 0.45, groundHeight(camera.position.x, camera.position.z) + 0.35);
    // Keep third-person camera safely below the cave ceiling when inside the lava tube
    if (camera.position.z >= CAVE_MOUTH_Z - 0.3 && Math.abs(camera.position.x - PIT_X) < 3.4) {
      camera.position.y = Math.min(camera.position.y, -0.7);
    }
    camera.lookAt(lookTarget.copy(eye).addScaledVector(dir, 2.2));
  } else {
    camera.position.copy(eye);
    camera.lookAt(lookTarget.copy(eye).add(dir));
  }
}

function canStand(x, z) {
  if (x < -14 || x > 14 || z < -12 || z > 15.6) return false;

  // Keep player inside the pit ramp & lava-tube walls once past z = 2.6 near x = 8
  const inPitCorridor = z >= 2.6 && Math.abs(x - PIT_X) < 4.5;
  if (inPitCorridor && Math.abs(x - PIT_X) > 2.25) return false;

  // Block walking onto the crust roof over the underground cave from outside
  if (z >= CAVE_MOUTH_Z && Math.abs(x - PIT_X) >= 2.25 && Math.abs(x - PIT_X) <= 4.6) return false;

  return !solids.some(box =>
    x > box.min.x - 0.28 && x < box.max.x + 0.28 && z > box.min.z - 0.28 && z < box.max.z + 0.28
  );
}

function walk(dt) {
  const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
  const side = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  if (!forward && !side) return;

  const step = (3.4 * dt) / (Math.hypot(forward, side) || 1);
  const dx = (side * Math.cos(yaw) - forward * Math.sin(yaw)) * step;
  const dz = (-forward * Math.cos(yaw) - side * Math.sin(yaw)) * step;

  const p = suit.position;
  const oldX = p.x, oldZ = p.z;
  if (canStand(p.x + dx, p.z)) p.x += dx;
  if (canStand(p.x, p.z + dz)) p.z += dz;
  p.y = groundHeight(p.x, p.z);
  if (p.x !== oldX || p.z !== oldZ) suit.rotation.y = Math.atan2(oldX - p.x, oldZ - p.z);

  aimCamera();
  updateNavigation();
  checkStation();
}

// --- Events ---
$("deploy").onclick = () => {
  phase = document.body.dataset.phase = "walk";
  $("briefing").hidden = true;
  $("live").hidden = false;
  aimCamera();
  updateHUD();
};

$("use").onclick = interact;
$("m3-restart").onclick = restartMission;
$("m3-modal-restart").onclick = restartMission;
$("m3-modal-close").onclick = () => modal.close();

$("view").onclick = () => {
  if (phase !== "walk") return;
  third = !third;
  $("view").textContent = `${third ? "Third" : "First"} person · V`;
  aimCamera();
};

$("toggle-pad").onclick = () => {
  const visible = document.body.classList.toggle("show-movement-pad");
  $("toggle-pad").setAttribute("aria-pressed", String(visible));
};

addEventListener("keydown", e => {
  if (phase !== "walk" || modal.open) return;
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) keys.add(e.code);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
    e.preventDefault();
    yaw -= (e.code === "ArrowRight" ? 35 : e.code === "ArrowLeft" ? -35 : 0) * 0.003;
    pitch = clamp(pitch - (e.code === "ArrowDown" ? 25 : e.code === "ArrowUp" ? -25 : 0) * 0.003, -1.0, 0.9);
    aimCamera();
  }
  if (!e.repeat && e.code === "KeyV") $("view").click();
  if (!e.repeat && e.code === "KeyE") interact();
});
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); pointer = null; });

const canvas = renderer.domElement;
canvas.onpointerdown = e => {
  if (phase !== "walk" || modal.open || e.button !== 0) return;
  pointer = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(pointer);
};
canvas.onpointermove = e => {
  if (phase !== "walk" || modal.open || pointer !== e.pointerId) return;
  yaw -= (e.clientX - lastX) * 0.0035;
  pitch = clamp(pitch - (e.clientY - lastY) * 0.0035, -1.0, 0.9);
  lastX = e.clientX;
  lastY = e.clientY;
  aimCamera();
};
canvas.onlostpointercapture = () => { pointer = null; };

for (const btn of $("pad").querySelectorAll("button")) {
  btn.onpointerdown = e => {
    if (phase !== "walk") return;
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    keys.add(btn.dataset.key);
  };
  btn.onlostpointercapture = () => keys.delete(btn.dataset.key);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener("resize", resize);

// Initial briefing camera overlooking the outpost & pit entrance
camera.position.set(1.5, 5.5, -5.5);
camera.lookAt(7.5, -1.0, 6.5);
$("loading").hidden = true;
$("deploy").disabled = false;

let prevTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - prevTime) / 1000));
  prevTime = now;
  if (phase === "walk" && !modal.open) walk(dt);
  diamond.rotation.y = now * 0.002;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);