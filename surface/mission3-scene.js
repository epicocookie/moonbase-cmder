import * as THREE from "three";
import { createHabitat, createSolarPanel, createPip, createGroundScanner, createFieldDisplay } from "./models.js";
import { runTutorial } from "./tutorial.js";
import { createMission3Controller } from "./mission3-ui.js";
import { createOutpostFlag } from "./flag.js";

if (typeof Mission3 === "undefined") {
  const loading = document.getElementById("loading");
  if (loading) loading.textContent = "The cave briefing could not load. Reload or return to mission selection.";
  throw new Error("Mission3 module is not loaded.");
}

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const mount = $("scene");
const controller = createMission3Controller();

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

// The refined habitat and panels are the same models used by Missions 1 and 2.
const solids = [];
const habitat = createHabitat();
habitat.position.set(-5.5, groundHeight(-5.5, -1), -1);
scene.add(habitat); solids.push(new THREE.Box3().setFromObject(habitat));
for (const x of [-3.5, 3.5]) {
  const panel = createSolarPanel();
  panel.position.set(x, groundHeight(x, -7), -7);
  panel.rotation.z = x < 0 ? -0.12 : 0.12;
  scene.add(panel); solids.push(new THREE.Box3().setFromObject(panel));
}
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

const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x747f89, roughness: 0.42, metalness: 0.68 });
// --- Stations: Communications + Pit Skylight + 3 Cave Chambers ---
const stations = [];

const comms = new THREE.Group();
const cBox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), metalMaterial);
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
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.7, 10), metalMaterial);
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
  const equipment = createGroundScanner(site.id === "entrance" ? "sunlit" : "shadow");
  equipment.scanner.position.set(site.x, groundHeight(site.x, site.z), site.z);
  for (const leg of equipment.legs) leg.mesh.rotation.x = leg.x;
  scene.add(equipment.scanner);
  solids.push(new THREE.Box3().setFromObject(equipment.scanner));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 8, 40),
    new THREE.MeshBasicMaterial({ color: site.id === "entrance" ? 0xffc267 : 0x8ae5f1 }));
  ring.rotation.x = Math.PI / 2; ring.position.set(site.x, groundHeight(site.x, site.z) + 0.06, site.z);
  scene.add(ring);
  const light = new THREE.PointLight(0xa9dfeb, 2.8, 6);
  light.position.set(site.x, groundHeight(site.x, site.z) + 1.3, site.z + 0.4); scene.add(light);
  stationMeshes.set(site.id, { ...equipment, ring, light });
  stations.push(site);
  addLabel(site.name, site.x, groundHeight(site.x, site.z) + 1.55, site.z, "#8ae5f1");
}
// Simple guide lights make the descent and return route readable in the shadows.
for (const z of [3.5, 5.5, 7.3, 10.2, 13.3, 15.4]) {
  for (const x of [6.05, 9.95]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.35, 8),
      new THREE.MeshBasicMaterial({ color: z < 7 ? 0xffc267 : 0x7de8f4 }));
    post.position.set(x, groundHeight(x, z) + 0.18, z); scene.add(post);
  }
}
const { pip, pipHead, pipEyes } = createPip();
pip.position.set(1.6, groundHeight(1.6, 6), 6);
scene.add(pip); solids.push(new THREE.Box3().setFromObject(pip));
stations.push({ id: "pip", name: "Pip", x: 1.6, z: 6 });
addLabel("Pip / cave guide", 1.6, pip.position.y + 1.6, 6, "#ffc267");
const display = createFieldDisplay();
display.hardware.position.set(2.5, groundHeight(2.5, -4), -4); display.hinge.rotation.x = -0.5;
scene.add(display.hardware); solids.push(new THREE.Box3().setFromObject(display.hardware));
stations.push({ id: "field-screen", name: "Cave field screen", x: 2.5, z: -4 });
addLabel("Cave field readings", 2.5, groundHeight(2.5, -4) + 1.6, -4, "#8ae5f1");
const flag = createOutpostFlag(scene, groundHeight, renderer, controller.flagPlanted);
stations.push(flag.station); solids.push(flag.collider);

const marker = new THREE.Group();
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8),
  new THREE.MeshBasicMaterial({ color: 0xffc267, transparent: true, opacity: 0.45, depthWrite: false }));
beacon.position.set(-0.85, 0.85, 0);
const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xffc267 }));
diamond.position.set(-0.85, 1.85, 0); marker.add(beacon, diamond); scene.add(marker);

function updateVisuals() {
  const state = controller.state;
  for (const [id, equipment] of stationMeshes) {
    const done = id === "entrance" ? state.caveLocated : state.scans.includes(id);
    equipment.ring.material.color.setHex(done ? 0x8ce3ac : 0x8ae5f1);
    const context = equipment.statusCanvas.getContext("2d");
    context.fillStyle = "#0a202b"; context.fillRect(0, 0, 256, 112);
    context.fillStyle = "#a7e8ee"; context.font = "bold 22px monospace";
    context.fillText(id === "entrance" ? "SEISMIC" : id === "chamber2" ? "THERMAL" : "STRUCTURAL", 10, 35);
    context.fillStyle = "#d6e5e7"; context.fillText(done ? "READING SAVED" : "READY", 10, 78);
    equipment.statusTexture.needsUpdate = true;
  }
  const context = display.canvas.getContext("2d");
  context.fillStyle = "#071822"; context.fillRect(0, 0, 1024, 640);
  context.fillStyle = "#a0eee3"; context.font = "bold 38px sans-serif"; context.fillText("CAVE FIELD READINGS", 42, 65);
  context.fillStyle = "#b5d8dc"; context.font = "27px sans-serif";
  context.fillText(`${state.scans.length} / 3 structural scans received`, 42, 118);
  Mission3.CAVE_SITES.forEach((id, index) => {
    const y = 160 + index * 100;
    context.fillStyle = "#153846"; context.fillRect(32, y, 960, 85);
    context.fillStyle = state.scans.includes(id) ? "#b0eac6" : "#9ab6c0";
    context.font = "bold 27px sans-serif"; context.fillText(Mission3.sites[id].name, 52, y + 34);
    context.font = "24px sans-serif"; context.fillText(state.scans.includes(id) ? Mission3.sites[id].reading : "Awaiting scanner", 52, y + 65);
  });
  context.font = "26px sans-serif"; context.fillStyle = "#e4f4ed";
  context.fillText(`Energy ${state.energy} / 9     Oxygen ${state.oxygen} / 3`, 42, 532);
  context.font = "21px sans-serif"; context.fillStyle = "#8eaeb7";
  context.fillText("SIMULATED TRAINING READINGS / FICTIONAL CAVE", 42, 593);
  display.texture.needsUpdate = true;
  sunlight.intensity = state.shift ? 0.9 : 3;
  renderer.shadowMap.needsUpdate = true;
}
let scanEffect = null;
document.addEventListener("expeditionchange", updateVisuals);
document.addEventListener("expeditionscan", ({ detail }) => {
  scanEffect = detail.active ? detail : null;
  for (const [id, equipment] of stationMeshes) equipment.beam.visible = equipment.sweep.visible = detail.active && detail.id === id;
});
function animateEquipment(time, reduced) {
  headlamp.position.copy(camera.position);
  headlamp.target.position.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 6);
  if (scanEffect) {
    const equipment = stationMeshes.get(scanEffect.id);
    equipment.sweep.position.y = reduced ? 0.2 : 0.15 + 0.5 * (1 - scanEffect.progress);
  }
  const flagMoving = flag.update(time, reduced);
  pipHead.rotation.z = reduced ? 0 : Math.sin(time * 2) * 0.02;
  for (const eye of pipEyes) eye.scale.y = !reduced && Math.sin(time * 1.6) > 0.98 ? 0.2 : 1;
  return flagMoving;
}
function canTraverse(x, z) {
  if (x < -14 || x > 14 || z < -12 || z > 15.6) return false;
  const distance = Math.abs(x - PIT_X);
  if (z >= 2.6 && distance < 4.5 && distance > 2.25) return false;
  if (z >= CAVE_MOUTH_Z && distance >= 2.25 && distance <= 4.6) return false;
  return ceilingHeight(x, z) - groundHeight(x, z) >= 1.65;
}
function ceilingHeight(x, z) {
  if (z < CAVE_MOUTH_Z - 0.3 || Math.abs(x - PIT_X) > 2.4) return Infinity;
  return CAVE_FLOOR_Y - 0.25 + Math.sqrt(Math.max(0, 2.85 ** 2 - (x - PIT_X) ** 2));
}
updateVisuals();
runTutorial({ THREE, scene, camera, renderer, groundHeight, stations, solids, marker, pipHead,
  animateEquipment, controller, startPosition: { x: 0, z: 2.5 }, canTraverse, ceilingHeight,
  cameraObstacles: solids.concat([crustCap, brow, backWall].map(mesh => new THREE.Box3().setFromObject(mesh))),
  interactionRange: 2.1 });
