import * as THREE from "three";
import { runTutorial } from "./tutorial.js";
import { createOutpostFlag } from "./flag.js";
import { habitatMaterial, metal, panelMaterial, panelLine, trim, amber, glass, detail, coldRim,
  createHabitat, createSolarPanel, createPip, createGroundScanner, createFieldDisplay } from "./models.js";

const mount = document.querySelector("#scene");

// Scene holds the moonbase and uses near-black space as its background.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080d);

// Camera frames the habitat and panels from above, looking toward the base.
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 150);
camera.position.set(12, 10, 16);
camera.lookAt(0, 0.7, 0);

// Renderer draws antialiased WebGL output and adjusts for high-DPI screens.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
mount.append(renderer.domElement);

// Materials define the muted regolith, pale structure, and blue solar cells.
const regolith = new THREE.MeshStandardMaterial({ color: 0x777a7c, roughness: 1 });


// Hemisphere fill softens shadows; directional light acts as sunlight.
scene.add(new THREE.HemisphereLight(0xb8c9df, 0x25272b, 0.55));
const sunlight = new THREE.DirectionalLight(0xffedcf, 3.2);
sunlight.position.set(-24, 5, 18);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -18;
sunlight.shadow.camera.right = 18;
sunlight.shadow.camera.top = 18;
sunlight.shadow.camera.bottom = -18;
sunlight.shadow.camera.far = 90;
sunlight.shadow.bias = -0.0002;
sunlight.shadow.normalBias = 0.035;
scene.add(sunlight);

// Shape a subdivided plane into shallow impact bowls and raised rims.
const land = new THREE.PlaneGeometry(144, 144, 160, 160);
land.rotateX(-Math.PI / 2);
const sites = [[-7,-5,2],[-8,3,1.7],[3,-10,2.3],[8,3,1.9],[2,9,1.6],[-13,-14,4],[13,12,3],[-2,-18,3]];
function groundHeight(x, z) {
  let y = -0.15 + 0.035 * Math.sin(x * 1.3) * Math.cos(z);
  for (const [cx, cz, radius] of sites) {
    const d = Math.hypot(x - cx, z - cz) / radius;
    if (d < 1.5) y += radius * (0.14 * Math.exp(-32 * (d - 1) ** 2) - 0.29 * Math.max(0, 1 - d * d));
  }
  const range = Math.hypot(x, z);
  const ridge = Math.exp(-((range - 35) ** 2) / 55);
  return y + ridge * (2.6 + 1.1 * Math.sin(x * 0.29) + 0.7 * Math.cos(z * 0.54));
}
const vertices = land.attributes.position;
const shades = [];
// Concentrate vertices near the outpost; the distant ridges need fewer triangles.
function terrainCoordinate(v) {
  return v * (0.55 + 0.45 * (v / 72) ** 2);
}
for (let i = 0; i < vertices.count; i++) {
  const x = terrainCoordinate(vertices.getX(i)), z = terrainCoordinate(vertices.getZ(i));
  vertices.setXYZ(i, x, groundHeight(x, z), z);
  const shade = 0.78 + 0.18 * Math.random();
  shades.push(shade, shade, shade);
}
land.setAttribute("color", new THREE.Float32BufferAttribute(shades, 3));
land.computeVertexNormals();
regolith.vertexColors = true;
const ground = new THREE.Mesh(land, regolith);
ground.receiveShadow = true;
ground.castShadow = true;
scene.add(ground);
// A small, credited Blue Marble gives the first walk a glimpse of home.
const earth = new THREE.Mesh(new THREE.CircleGeometry(1.05, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
earth.position.set(-12, 13, -28);
earth.lookAt(camera.position);
earth.visible = false;
scene.add(earth);
new THREE.TextureLoader().load("./launch/assets/earth-blue-marble.jpg", texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  earth.material.map = texture;
  earth.material.needsUpdate = true;
  earth.visible = true;
  dispatchEvent(new Event("surfaceassetready"));
}, undefined, () => { /* The expedition remains playable if this image is unavailable. */ });
const habitat = createHabitat();
habitat.position.set(-3.4, -0.14, 2);
scene.add(habitat);
// Small rocks are decorative and kept away from the instrument approach paths.
const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), regolith, 90);
const rockTransform = new THREE.Object3D();
for (let i = 0; i < 90; i++) {
  const angle = i * 2.39996;
  const radius = 10 + (i % 13) * 1.5;
  const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
  const size = 0.08 + (i % 6) * 0.045;
  rockTransform.position.set(x, groundHeight(x, z) + size * 0.25, z);
  rockTransform.rotation.set(i * 0.7, angle, i * 0.31);
  rockTransform.scale.set(size * 1.4, size * 0.7, size);
  rockTransform.updateMatrix(); rocks.setMatrixAt(i, rockTransform.matrix);
}
rocks.receiveShadow = true;
scene.add(rocks);

// Two framed, gridded panel arrays sit on simple metal support legs.
for (const x of [-3.2, 3.2]) {
  const panel = createSolarPanel();
  panel.position.set(x, -0.15, -4.5);
  panel.rotation.z = x < 0 ? -0.12 : 0.12;
  scene.add(panel);
}

// Small point cloud gives the dark background a sparse star field.
const starPositions = new Float32Array(240 * 3);
for (let i = 0; i < 240; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 100;
  starPositions[i * 3 + 1] = 10 + Math.random() * 45;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
}
const starsGeometry = new THREE.BufferGeometry();
starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xb8c8df, size: 0.12, sizeAttenuation: true })));


// Signs stay attached to the equipment in both camera views.
const obstacles = [habitat];
const stations = [];
function makeConsole(id, name, x, z, color) {
  const terminal = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), metal);
  housing.position.y = 0.525;
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.38, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x14222b, emissive: color, emissiveIntensity: 0.42 }));
  screen.position.set(0, 0.8, 0.285);
  terminal.add(housing, screen);
  terminal.position.set(x, groundHeight(x, z), z);
  scene.add(terminal);
  obstacles.push(terminal);

  addLabel(name, x, groundHeight(x, z) + 1.5, z, color);
  const lamp = new THREE.PointLight(color, 1.8, 5);
  lamp.position.set(x, groundHeight(x, z) + 1.1, z + 0.55);
  scene.add(lamp);
  stations.push({ id, name, x, z });
}
function addLabel(name, x, y, z, color) {
  const label = document.createElement("canvas");
  label.width = 512; label.height = 88;
  const ctx = label.getContext("2d");
  ctx.fillStyle = "#101820"; ctx.fillRect(0, 0, 512, 88);
  ctx.fillStyle = color; ctx.fillRect(0, 0, 10, 88);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center"; ctx.fillText(name.toUpperCase(), 256, 57);
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, sizeAttenuation: false }));
  sign.scale.set(0.23, 0.04, 1); sign.position.set(x, y, z);
  scene.add(sign);
}
makeConsole("communications", "Communications", 0, -4, "#8ae5f1");
makeConsole("habitat", "Habitat", -0.9, 4.6, "#a6cdb9");
// Illustrative sample surfaces emphasize grain versus a pale, branching pattern.
// These training colors help identification; the scanner supplies the evidence.
function sampleTexture(shaded) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  context.fillStyle = shaded ? "#415f76" : "#9d896c";
  context.fillRect(0, 0, 256, 256);
  let seed = 41;
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 2200; i++) {
    const light = random() > 0.55;
    context.fillStyle = shaded ? (light ? "#9fbdce60" : "#203c5340") : (light ? "#e5c99b90" : "#493c2f90");
    const size = 1 + random() * 4;
    context.fillRect(random() * 256, random() * 256, size, size);
  }
  context.lineCap = "round";
  for (let vein = 0; vein < 12; vein++) {
    let x = random() * 256, y = random() * 256;
    context.beginPath();
    context.moveTo(x, y);
    for (let segment = 0; segment < 5; segment++) {
      x += random() * 65 - 32;
      y += random() * 50 - 18;
      context.lineTo(x, y);
    }
    context.strokeStyle = shaded ? "#bce9ed90" : "#54453490";
    context.lineWidth = shaded ? 9 : 3;
    context.stroke();
    if (shaded) {
      context.strokeStyle = "#efffff";
      context.lineWidth = 3;
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
const sampleMaterials = {
  shadow: new THREE.MeshStandardMaterial({
    map: sampleTexture(true), color: 0xd4edf4, roughness: 0.32,
    metalness: 0.08, emissive: 0x40566a, emissiveIntensity: 0.16, flatShading: true
  }),
  sunlit: new THREE.MeshStandardMaterial({
    map: sampleTexture(false), color: 0xffe2b3, roughness: 1,
    metalness: 0, flatShading: true
  })
};
const instruments = new Map();
// Mission 2 uses the Habitat and Communications consoles instead of scan instruments.
const powerMission = document.body.dataset.mission === "2";
for (const site of powerMission ? [] : Object.values(Mission1.sites)) {
  const instrument = new THREE.Group();
  instrument.position.set(site.x, groundHeight(site.x, site.z), site.z);
  const sample = detail(instrument, new THREE.DodecahedronGeometry(0.36, site.id === "shadow" ? 1 : 0), sampleMaterials[site.id], 0, 0.2, 0.12);
  sample.scale.set(1.12, 0.65, 1);
  sample.rotation.y = site.id === "shadow" ? 0.35 : -0.4;
  // An instrument work light keeps the sample legible inside the crater shadow.
  const sampleLight = new THREE.PointLight(0xf1f7ff, 1.1, 2, 2);
  sampleLight.position.set(0.15, 0.65, 0.48);
  instrument.add(sampleLight);
  const rimMaterial = site.id === "shadow" ? coldRim : amber;
  const rim = detail(instrument, new THREE.TorusGeometry(0.48, 0.025, 8, 40), rimMaterial, 0, 0.07, 0);
  rim.rotation.x = Math.PI / 2;
  const equipment = createGroundScanner(site.id);
  const { scanner } = equipment;
  instrument.add(scanner);
  instruments.set(site.id, equipment);
  scanner.visible = ExpeditionUI.state.deployed.includes(site.id);
  const preview = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.45, 1.35, 1.45)), new THREE.LineBasicMaterial({ color: 0x8ae5f1, transparent: true, opacity: 0.6 }));
  preview.position.y = 0.65; preview.visible = false; instrument.add(preview);
  instruments.get(site.id).preview = preview;
  scene.add(instrument); obstacles.push(instrument);
  stations.push({ id: site.id, name: site.name, x: site.x, z: site.z });
  addLabel(site.name, site.x, groundHeight(site.x, site.z) + 1.5, site.z, "#b5d6f2");
}
// A portable display folds onto a low kickstand at the marked ground station.
let fieldDisplay = null;
if (!powerMission) {
  const screenStation = Mission1.fieldScreen;
  const device = new THREE.Group();
  device.position.set(screenStation.x, groundHeight(screenStation.x, screenStation.z), screenStation.z);
  const pad = detail(device, new THREE.TorusGeometry(0.9, 0.018, 6, 48), coldRim, 0, 0.04, 0);
  pad.rotation.x = Math.PI / 2;
  const { hardware, hinge, canvas, texture } = createFieldDisplay();
  device.add(hardware);
  const preview = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.65, 1.1, 0.2)), new THREE.LineBasicMaterial({ color: 0x8ae5f1, transparent: true, opacity: 0.6 }));
  preview.position.y = 0.6; device.add(preview); preview.visible = false;
  scene.add(device); obstacles.push(device);
  stations.push(screenStation);
  addLabel("Field screen", screenStation.x, device.position.y + 1.5, screenStation.z, "#8ae5f1");
  fieldDisplay = { hardware, hinge, preview, canvas, texture };
}
function drawFieldScreen(state) {
  if (!fieldDisplay) return;
  const context = fieldDisplay.canvas.getContext("2d");
  context.fillStyle = "#071822"; context.fillRect(0, 0, 1024, 640);
  context.strokeStyle = "#355660"; context.lineWidth = 2;
  context.strokeRect(20, 20, 984, 600);
  context.fillStyle = "#a0eee3"; context.font = "bold 34px sans-serif";
  context.fillText("FIELD LINK / SAMPLE REVIEW", 48, 77);
  context.fillStyle = "#8eaeb7"; context.font = "22px sans-serif";
  context.fillText("Both ground scanners connected", 48, 117);
  Object.values(Mission1.sites).forEach((site, index) => {
    const x = 44 + index * 484;
    context.fillStyle = "#102d3b"; context.fillRect(x, 152, 448, 345);
    context.drawImage(sampleMaterials[site.id].map.image, x + 24, 174, 160, 135);
    context.fillStyle = site.id === "shadow" ? "#b9f1fa" : "#e4bf85";
    context.font = "bold 27px sans-serif"; context.fillText(site.name, x + 24, 350);
    context.font = "24px sans-serif";
    context.fillText(site.id === "shadow" ? "Possible ice clue" : "Rock-like clue", x + 24, 393);
    context.fillStyle = "#98b4be"; context.font = "20px sans-serif";
    context.fillText(state.observations.includes(site.id) ? "Reading received" : "Awaiting scanner", x + 24, 437);
  });
  context.fillStyle = "#e4f4ed"; context.font = "26px sans-serif";
  context.fillText("Possible water ice. More measurements needed.", 48, 550);
  context.fillStyle = "#8eaeb7"; context.font = "20px sans-serif";
  context.fillText("SIMULATED TRAINING READINGS", 48, 598);
  fieldDisplay.texture.needsUpdate = true;
}
// A dish and receiver visually connect the report to Earth.
const dishMast = new THREE.Group(); dishMast.position.set(1.2, groundHeight(1.2, -3.8), -3.8);
detail(dishMast, new THREE.CylinderGeometry(0.06, 0.1, 1.7, 12), metal, 0, 0.85, 0);
const dish = new THREE.Group(); dish.position.y = 1.8; dish.rotation.x = -0.65; dishMast.add(dish);
const bowl = detail(dish, new THREE.SphereGeometry(0.65, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), habitatMaterial, 0, 0, 0);
bowl.scale.y = 0.3; bowl.material = habitatMaterial.clone(); bowl.material.side = THREE.DoubleSide;
detail(dish, new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), trim, 0, 0.25, 0);
const transmissionLight = detail(dish, new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0x8ae5f1 }), 0, 0.52, 0);
scene.add(dishMast); obstacles.push(dishMast);
// Pip stays at the landing point and guides the player by radio. No pathfinding needed.
const { pip, pipHead, pipEyes, eyes } = createPip();
pip.position.set(1.6, groundHeight(1.6, 6), 6);
scene.add(pip); obstacles.push(pip);
stations.push({ id: "pip", name: "Pip", x: 1.6, z: 6 });
addLabel("Pip / your buddy", 1.6, pip.position.y + 1.55, 6, "#ffc267");
const marker = new THREE.Group();
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffc267, transparent: true, opacity: 0.5, depthWrite: false });
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.5, 8), markerMaterial);
beacon.position.y = 1.25;
const beaconTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: 0xffc267 }));
beaconTop.position.y = 2.65;
marker.add(beacon, beaconTop); scene.add(marker);
const panelBounds = [-3.2, 3.2].map(x => new THREE.Box3(
  new THREE.Vector3(x - 1.68, -0.16, -5.7), new THREE.Vector3(x + 1.68, 1.45, -3.3)
));
const flag = createOutpostFlag(scene, groundHeight, renderer, ExpeditionUI.flagPlanted);
stations.push(flag.station);
addLabel("Flag site", flag.station.x, groundHeight(flag.station.x, flag.station.z) + 0.65, flag.station.z, "#e4c58c");
const solids = obstacles.map(object => new THREE.Box3().setFromObject(object)).concat(panelBounds, flag.collider);

function updateInstrumentStatus() {
  for (const [id, equipment] of instruments) {
    const reading = ExpeditionUI.state.observations.includes(id);
    const scanning = scanEffect?.id === id;
    const status = reading ? "READING SAVED" : scanning ? "SCANNING" : "READY";
    if (equipment.status === status) continue;
    equipment.status = status;
    const context = equipment.statusCanvas.getContext("2d");
    context.fillStyle = "#0a202b"; context.fillRect(0, 0, 256, 112);
    context.fillStyle = id === "shadow" ? "#a7e8ee" : "#ffd18f";
    context.font = "bold 23px monospace";
    context.fillText(id === "shadow" ? "POLAR SAMPLE" : "SUNLIT REF", 12, 34);
    context.fillStyle = reading ? "#abedc8" : "#d6e5e7";
    context.font = "22px monospace"; context.fillText(status, 12, 78);
    equipment.statusTexture.needsUpdate = true;
    equipment.statusLight.material.color.setHex(reading ? 0x8ce3ac : scanning ? 0xffc267 : 0x8ae5f1);
  }
}
const equipmentMotion = matchMedia("(prefers-reduced-motion: reduce)");
let scanEffect = null, deployment = null, transmitting = false, speaking = false;
function syncDeployedEquipment() {
  if (powerMission) return;
  for (const [id, equipment] of instruments) {
    const active = deployment?.id === id;
    equipment.preview.visible = active && deployment.preview === true;
    equipment.scanner.visible = ExpeditionUI.state.deployed.includes(id) || (active && !deployment.preview);
    const progress = active && !deployment.preview && !equipmentMotion.matches ? deployment.progress : 1;
    equipment.scanner.position.y = (1 - progress) * 0.75;
    for (const leg of equipment.legs) {
      leg.mesh.rotation.x = leg.x * progress;
      leg.mesh.rotation.z = leg.z;
      leg.mesh.scale.y = 0.65 + progress * 0.35;
    }
  }
  if (fieldDisplay) {
    const active = deployment?.id === "field-screen";
    fieldDisplay.preview.visible = active && deployment.preview === true;
    fieldDisplay.hardware.visible = ExpeditionUI.state.screenDeployed || (active && !deployment.preview);
    const progress = active && !deployment.preview && !equipmentMotion.matches ? deployment.progress : 1;
    fieldDisplay.hinge.rotation.x = -1.5 + progress;
    fieldDisplay.hardware.position.y = (1 - progress) * 0.5;
  }
  renderer.shadowMap.needsUpdate = true;
}
document.addEventListener("expeditiondeploy", ({ detail }) => {
  deployment = detail.active ? detail : null;
  syncDeployedEquipment();
});
if (!powerMission) {
  syncDeployedEquipment();
  drawFieldScreen(ExpeditionUI.state);
  updateInstrumentStatus();
  document.addEventListener("expeditionchange", () => {
    syncDeployedEquipment();
    drawFieldScreen(ExpeditionUI.state);
    updateInstrumentStatus();
  });
}
document.addEventListener("expeditionscan", ({ detail }) => {
  scanEffect = detail.active ? detail : null;
  for (const [id, instrument] of instruments) {
    instrument.beam.visible = instrument.sweep.visible = detail.active && id === detail.id;
  }
  updateInstrumentStatus();
});
document.addEventListener("expeditiontransmit", ({ detail }) => { transmitting = detail.active; });
document.addEventListener("expeditionpip", ({ detail }) => { speaking = detail.speaking; });
function animateEquipment(time, reduced) {
  if (scanEffect) {
    const instrument = instruments.get(scanEffect.id);
    instrument.sweep.position.y = reduced ? 0.2 : 0.15 + 0.5 * (1 - scanEffect.progress);
    instrument.sweep.scale.setScalar(reduced ? 1 : 0.7 + 0.3 * Math.sin(scanEffect.progress * Math.PI * 6));
  }
  transmissionLight.scale.setScalar(transmitting && !reduced ? 1.3 + Math.sin(time * 6) * 0.5 : 1);
  pipHead.rotation.z = speaking && !reduced ? Math.sin(time * 3) * 0.045 : 0;
  pipHead.position.y = speaking && !reduced ? 0.79 + Math.sin(time * 4) * 0.012 : 0.79;
  eyes.color.setHex(speaking ? 0xbaffdd : 0x8ae5f1);
  for (const eye of pipEyes) eye.scale.y = speaking && !reduced && Math.sin(time * 1.6) > 0.98 ? 0.2 : 1;
  const flagMoving = flag.update(time, reduced);
  return flagMoving || (!reduced && (speaking || transmitting || Boolean(scanEffect)));
}
// In Mission 2 the sky follows the shift forecast: full sun first, then dim shadow shifts.
const sunIntensity = sunlight.intensity;
function followForecast(state) {
  sunlight.intensity = Mission2.shifts[state.shift] === "shadow" ? sunIntensity * 0.3 : sunIntensity;
  renderer.shadowMap.needsUpdate = true;
}
if (powerMission) {
  followForecast(ExpeditionUI.state);
  document.addEventListener("expeditionchange", ({ detail }) => followForecast(detail.state));
}
runTutorial({ THREE, scene, camera, renderer, groundHeight, stations, solids, marker, pipHead, animateEquipment });



