import * as THREE from "three";
import { runTutorial } from "./tutorial.js";

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

const habitatMaterial = new THREE.MeshStandardMaterial({ color: 0xc6c9c9, roughness: 0.58, metalness: 0.12 });
const metal = new THREE.MeshStandardMaterial({ color: 0x747f89, roughness: 0.42, metalness: 0.68 });
const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x173957, roughness: 0.32, metalness: 0.48 });
const panelLine = new THREE.MeshStandardMaterial({ color: 0x6d9abd, roughness: 0.4, metalness: 0.35 });

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
// Shared materials keep the outpost equipment visually consistent.
const trim = new THREE.MeshStandardMaterial({ color: 0x263946, roughness: 0.7 });
const amber = new THREE.MeshStandardMaterial({ color: 0xe7a84b, roughness: 0.55 });
const glass = new THREE.MeshStandardMaterial({ color: 0x163d50, metalness: 0.5, roughness: 0.18, emissive: 0x224956, emissiveIntensity: 0.25 });
function detail(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
// Dome habitat uses a short cylinder base and an upper-half sphere shell.
const habitat = new THREE.Group();
const base = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.38, 0.32, 32), metal);
base.position.y = 0.16;
base.castShadow = true;
base.receiveShadow = true;
habitat.add(base);
const dome = new THREE.Mesh(new THREE.SphereGeometry(1.22, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), habitatMaterial);
dome.position.y = 0.32;
dome.castShadow = true;
dome.receiveShadow = true;
habitat.add(dome);
const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.055, 20), metal);
hatch.rotation.x = Math.PI / 2;
hatch.position.set(0, 0.67, 1.18);
habitat.add(hatch);
habitat.scale.setScalar(1.8);
habitat.position.set(-3.4, -0.14, 2);
scene.add(habitat);
// Reinforcing ribs and a separate airlock give the habitat a readable silhouette.
for (let angle = 0; angle < Math.PI; angle += Math.PI / 4) {
  const rib = detail(habitat, new THREE.TorusGeometry(1.235, 0.024, 6, 40, Math.PI), metal, 0, 0.32, 0);
  rib.rotation.y = angle;
}
detail(habitat, new THREE.BoxGeometry(0.65, 0.95, 0.7), habitatMaterial, 0, 0.5, 1.12);
detail(habitat, new THREE.BoxGeometry(0.49, 0.73, 0.04), trim, 0, 0.48, 1.49);
detail(habitat, new THREE.BoxGeometry(0.31, 0.18, 0.05), glass, 0, 0.69, 1.52);
detail(habitat, new THREE.BoxGeometry(0.08, 0.23, 0.06), amber, 0.17, 0.38, 1.53);
for (const x of [-0.7, 0.7]) {
  const window = detail(habitat, new THREE.SphereGeometry(0.24, 16, 10), glass, x, 0.81, 0.77);
  window.scale.set(1, 0.7, 0.22);
}
for (let i = 0; i < 3; i++) detail(habitat, new THREE.BoxGeometry(0.8, 0.08, 0.23), metal, 0, 0.16 - i * 0.04, 1.53 + i * 0.22);
detail(habitat, new THREE.BoxGeometry(0.45, 0.55, 0.48), trim, -1.05, 0.3, 0.7);
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
function addSolarPanel(x) {
  const panel = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 1.45), panelMaterial);
  deck.position.y = 0.82;
  deck.castShadow = true;
  deck.receiveShadow = true;
  panel.add(deck);
  for (let i = 1; i < 5; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, 1.43), panelLine);
    line.position.set(-1.05 + i * 0.42, 0.875, 0);
    panel.add(line);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.018, 0.025), panelLine);
  cross.position.set(0, 0.875, 0);
  panel.add(cross);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.055, 1.57), metal);
  frame.position.y = 0.77;
  panel.add(frame);
  for (const z of [-0.55, 0.55]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.74, 8), metal);
    leg.position.set(0, 0.39, z);
    leg.castShadow = true;
    panel.add(leg);
  }
  panel.position.set(x, -0.15, -4.5);
  panel.scale.setScalar(1.5);
  panel.rotation.z = x < 0 ? -0.12 : 0.12;
  scene.add(panel);
}
addSolarPanel(-3.2);
addSolarPanel(3.2);

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
const coldRim = new THREE.MeshStandardMaterial({ color: 0x8bd8e2, roughness: 0.45 });
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
  for (const angle of [0, 2.094, 4.189]) {
    const leg = detail(instrument, new THREE.CylinderGeometry(0.035, 0.045, 0.9, 8), metal, Math.cos(angle) * 0.46, 0.45, Math.sin(angle) * 0.46);
    leg.rotation.z = Math.cos(angle) * 0.3;
    leg.rotation.x = -Math.sin(angle) * 0.3;
  }
  const headGeometry = site.id === "shadow" ? new THREE.CylinderGeometry(0.22, 0.28, 0.2, 16) : new THREE.BoxGeometry(0.48, 0.2, 0.4);
  detail(instrument, headGeometry, habitatMaterial, 0, 0.91, 0);
  detail(instrument, new THREE.BoxGeometry(0.28, 0.035, 0.02), site.id === "shadow" ? glass : amber, 0, 0.92, 0.23);
  detail(instrument, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), glass, 0, 0.79, 0);
  detail(instrument, new THREE.BoxGeometry(0.34, 0.18, 0.13), trim, 0, 1.03, 0.13);
  detail(instrument, new THREE.BoxGeometry(0.26, 0.09, 0.02), glass, 0, 1.04, 0.21);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.37, 0.65, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x86e4e9, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 0.45; beam.visible = false; instrument.add(beam);
  const sweep = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 40), new THREE.MeshBasicMaterial({ color: 0xa8ffff }));
  sweep.rotation.x = Math.PI / 2; sweep.position.y = 0.18; sweep.visible = false; instrument.add(sweep);
  instruments.set(site.id, { beam, sweep });
  scene.add(instrument); obstacles.push(instrument);
  stations.push({ id: site.id, name: site.name, x: site.x, z: site.z });
  addLabel(site.name, site.x, groundHeight(site.x, site.z) + 1.5, site.z, "#b5d6f2");
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
const pip = new THREE.Group();
const pipShell = new THREE.MeshStandardMaterial({ color: 0xd4dbce, roughness: 0.65 });
const pipDark = new THREE.MeshStandardMaterial({ color: 0x203540 });
function pipPart(geometry, material, x, y, z, parent = pip) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z); part.castShadow = true; parent.add(part); return part;
}
pipPart(new THREE.CapsuleGeometry(0.3, 0.35, 4, 12), pipShell, 0, 0.4, 0).rotation.z = Math.PI / 2;
for (const x of [-0.38, 0.38]) for (const z of [-0.23, 0.23]) {
  pipPart(new THREE.CylinderGeometry(0.16, 0.16, 0.13, 12), pipDark, x, 0.2, z).rotation.z = Math.PI / 2;
}
const pipHead = new THREE.Group(); pipHead.position.y = 0.75; pip.add(pipHead);
pipPart(new THREE.BoxGeometry(0.65, 0.38, 0.4), pipShell, 0, 0, 0, pipHead);
pipPart(new THREE.BoxGeometry(0.55, 0.25, 0.03), pipDark, 0, 0, 0.22, pipHead);
const eyes = new THREE.MeshBasicMaterial({ color: 0x8ae5f1 });
const pipEyes = [];
for (const x of [-0.14, 0.14]) pipEyes.push(pipPart(new THREE.SphereGeometry(0.055, 12, 8), eyes, x, 0.01, 0.25, pipHead));
pipPart(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 8), pipShell, 0.15, 0.3, 0, pipHead);
pipPart(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffc267 }), 0.15, 0.46, 0, pipHead);
for (const x of [-0.38, 0.38]) {
  pipPart(new THREE.BoxGeometry(0.08, 0.08, 0.65), metal, x, 0.32, 0);
  for (const z of [-0.23, 0.23]) {
    const hub = pipPart(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12), amber, x, 0.2, z);
    hub.rotation.z = Math.PI / 2;
  }
}
pipPart(new THREE.BoxGeometry(0.48, 0.06, 0.38), panelMaterial, 0, 0.73, -0.14);
pipPart(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 12), metal, 0, 0.62, 0);
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
const solids = obstacles.map(object => new THREE.Box3().setFromObject(object)).concat(panelBounds);

let scanEffect = null, transmitting = false, speaking = false;
document.addEventListener("expeditionscan", ({ detail }) => {
  scanEffect = detail.active ? detail : null;
  for (const [id, instrument] of instruments) {
    instrument.beam.visible = instrument.sweep.visible = detail.active && id === detail.id;
  }
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
  return !reduced && (speaking || transmitting || Boolean(scanEffect));
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



