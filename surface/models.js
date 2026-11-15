import * as THREE from "three";

const habitatMaterial = new THREE.MeshStandardMaterial({ color: 0xc6c9c9, roughness: 0.58, metalness: 0.12 });
const metal = new THREE.MeshStandardMaterial({ color: 0x747f89, roughness: 0.42, metalness: 0.68 });
const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x173957, roughness: 0.32, metalness: 0.48 });
const panelLine = new THREE.MeshStandardMaterial({ color: 0x6d9abd, roughness: 0.4, metalness: 0.35 });
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
// Rounded manufactured shells share a small bevel that catches the low lunar light.
function roundedHousing(width, height, depth, radius = 0.05) {
  const x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const bevel = Math.min(0.012, depth / 6);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bevel, steps: 1,
    bevelEnabled: true, bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel, curveSegments: 4 });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}
const equipmentShell = new THREE.MeshStandardMaterial({ color: 0xd6ddd5, roughness: 0.62, metalness: 0.12 });
const anodized = new THREE.MeshStandardMaterial({ color: 0x607782, roughness: 0.58, metalness: 0.38 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x17252e, roughness: 0.96 });
const sensorLens = new THREE.MeshStandardMaterial({ color: 0x205a68, roughness: 0.15,
  metalness: 0.18, emissive: 0x175563, emissiveIntensity: 0.3 });

const coldRim = new THREE.MeshStandardMaterial({ color: 0x8bd8e2, roughness: 0.45 });
export { habitatMaterial, metal, panelMaterial, panelLine, trim, amber, glass, detail, roundedHousing, coldRim };

export function createHabitat() {
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
  return habitat;
}
export function createSolarPanel() {
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
  panel.scale.setScalar(1.5);
  return panel;
}

export function createAstronaut() {
  const suit = new THREE.Group();
  const upperBody = new THREE.Group();
  suit.add(upperBody);
  const white = new THREE.MeshStandardMaterial({ color: 0xe3dfd3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b3946 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd59842, metalness: 0.52, roughness: 0.28 });
  function part(geometry, material, x, y, z, parent = upperBody) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  part(new THREE.CapsuleGeometry(0.23, 0.27), white, 0, 0.83, 0);
  part(new THREE.BoxGeometry(0.38, 0.45, 0.19), dark, 0, 0.84, 0.22);
  part(new THREE.SphereGeometry(0.24), white, 0, 1.32, 0);
  part(new THREE.SphereGeometry(0.22), gold, 0, 1.32, -0.06).scale.set(0.96, 0.78, 1);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    legs.push(part(new THREE.CapsuleGeometry(0.106, 0.37), white, side * 0.13, 0.33, 0, suit));
    arms.push(part(new THREE.CapsuleGeometry(0.085, 0.28), white, side * 0.29, 0.83, 0));
  }
  // Collar, boots, controls, and a wrist scanner clarify the astronaut at game scale.
  part(new THREE.TorusGeometry(0.18, 0.04, 8, 20), dark, 0, 1.12, 0).rotation.x = Math.PI / 2;
  part(new THREE.BoxGeometry(0.25, 0.2, 0.06), dark, 0, 0.88, -0.23);
  part(new THREE.BoxGeometry(0.16, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: 0x8ae5f1 }), 0, 0.91, -0.27);
  for (const side of [-1, 1]) {
    part(new THREE.BoxGeometry(0.21, 0.13, 0.3), dark, side * 0.13, 0.07, -0.04, suit);
    part(new THREE.SphereGeometry(0.11, 12, 8), dark, side * 0.29, 0.77, 0);
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 10), white, side * 0.13, 0.86, 0.34);
  }
  part(new THREE.BoxGeometry(0.15, 0.12, 0.18), dark, -0.32, 0.57, -0.08);
  part(new THREE.BoxGeometry(0.1, 0.04, 0.02), gold, -0.32, 0.58, -0.18);
  return { suit, upperBody, legs, arms };
}

export function createPip() {
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
pipPart(roundedHousing(0.65, 0.38, 0.4, 0.08), pipShell, 0, 0, 0, pipHead);
pipPart(roundedHousing(0.55, 0.25, 0.035, 0.065), pipDark, 0, 0, 0.22, pipHead);
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
pipPart(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 12), anodized, 0, 0.62, 0);
for (const x of [-0.38, 0.38]) for (const z of [-0.23, 0.23]) {
  const tire = pipPart(new THREE.TorusGeometry(0.125, 0.035, 8, 16), rubber, x, 0.2, z);
  tire.rotation.y = Math.PI / 2;
}
for (const x of [-0.34, 0.34]) {
  pipPart(new THREE.SphereGeometry(0.07, 12, 8), anodized, x, 0, 0, pipHead).scale.set(0.4, 1, 1);
}
pipPart(roundedHousing(0.18, 0.035, 0.02, 0.012), amber, 0, -0.12, 0.236, pipHead);
  return { pip, pipHead, pipEyes, eyes };
}

export function createGroundScanner(id) {
  const scanner = new THREE.Group();
  const legs = [];
  // Each foot hangs from an actual hinge, with a sleeve over its telescoping shaft.
  for (const angle of [Math.PI / 6, Math.PI * 5 / 6, Math.PI * 3 / 2]) {
    const leg = new THREE.Group();
    const swivel = new THREE.Group(); swivel.rotation.y = angle; swivel.add(leg); scanner.add(swivel);
    // The hinge positions are radial, while the leg folds in its local vertical plane.
    leg.position.set(0, 0.79, 0.23);
    const hinge = detail(leg, new THREE.CylinderGeometry(0.065, 0.065, 0.12, 12), anodized, 0, 0, 0);
    hinge.rotation.z = Math.PI / 2;
    detail(leg, new THREE.CylinderGeometry(0.038, 0.045, 0.35, 12), equipmentShell, 0, -0.2, 0);
    detail(leg, new THREE.CylinderGeometry(0.023, 0.023, 0.53, 10), anodized, 0, -0.61, 0);
    detail(leg, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), rubber, 0, -0.37, 0);
    const foot = detail(leg, new THREE.CylinderGeometry(0.09, 0.105, 0.055, 12), rubber, 0, -0.87, 0);
    foot.rotation.x = 0.5;
    legs.push({ mesh: leg, x: -0.5, z: 0 });
  }
  const accent = id === "shadow" ? coldRim : amber;
  detail(scanner, roundedHousing(0.58, 0.25, 0.49, 0.08), equipmentShell, 0, 0.91, 0);
  detail(scanner, roundedHousing(0.59, 0.055, 0.5, 0.06), rubber, 0, 0.81, 0);
  detail(scanner, roundedHousing(0.36, 0.035, 0.2, 0.03), anodized, 0, 1.06, -0.07);
  // Protective shoulder guards and vent slots make the instrument read as field equipment.
  for (const x of [-0.27, 0.27]) {
    detail(scanner, roundedHousing(0.07, 0.25, 0.48, 0.03), rubber, x, 0.92, 0);
    for (let i = 0; i < 4; i++) detail(scanner, new THREE.BoxGeometry(0.015, 0.07, 0.02), anodized, x, 0.93, -0.12 + i * 0.06);
  }
  detail(scanner, new THREE.CylinderGeometry(0.15, 0.17, 0.09, 20), trim, 0, 0.75, 0);
  const collar = detail(scanner, new THREE.TorusGeometry(0.125, 0.018, 8, 24), anodized, 0, 0.7, 0);
  collar.rotation.x = Math.PI / 2;
  const lens = detail(scanner, new THREE.CircleGeometry(0.11, 24), sensorLens, 0, 0.694, 0);
  lens.rotation.x = Math.PI / 2;
  detail(scanner, roundedHousing(0.16, 0.028, 0.02, 0.01), accent, 0.18, 1.0, 0.259);
  const statusCanvas = document.createElement("canvas"); statusCanvas.width = 256; statusCanvas.height = 112;
  const statusTexture = new THREE.CanvasTexture(statusCanvas); statusTexture.colorSpace = THREE.SRGBColorSpace;
  const control = new THREE.Group(); control.position.set(0, 0.98, 0.265); control.rotation.x = -0.22; scanner.add(control);
  detail(control, roundedHousing(0.31, 0.17, 0.035, 0.025), rubber, -0.035, 0, 0);
  const statusFace = new THREE.Mesh(new THREE.PlaneGeometry(0.265, 0.125), new THREE.MeshBasicMaterial({ map: statusTexture }));
  statusFace.position.set(-0.035, 0, 0.023); control.add(statusFace);
  const statusLight = detail(control, new THREE.SphereGeometry(0.018, 10, 6), new THREE.MeshBasicMaterial({ color: 0x8ae5f1 }), 0.17, 0.03, 0.025);
  detail(scanner, new THREE.CylinderGeometry(0.024, 0.035, 0.23, 10), rubber, -0.18, 1.14, -0.16);
  detail(scanner, new THREE.SphereGeometry(0.028, 10, 6), accent, -0.18, 1.27, -0.16);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.37, 0.65, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x86e4e9, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 0.45; beam.visible = false; scanner.add(beam);
  const sweep = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 40), new THREE.MeshBasicMaterial({ color: 0xa8ffff }));
  sweep.rotation.x = Math.PI / 2; sweep.position.y = 0.18; sweep.visible = false; scanner.add(sweep);
  return { scanner, beam, sweep, legs, statusCanvas, statusTexture, statusLight };
}

export function createFieldDisplay() {
  const hardware = new THREE.Group();
  detail(hardware, roundedHousing(1.28, 0.07, 0.66, 0.07), anodized, 0, 0.08, -0.05);
  for (const x of [-0.52, 0.52]) {
    detail(hardware, roundedHousing(0.24, 0.05, 0.42, 0.03), rubber, x, 0.025, -0.1);
    const support = detail(hardware, new THREE.BoxGeometry(0.055, 0.6, 0.065), anodized, x, 0.31, -0.25);
    support.rotation.x = -0.6;
    const pivot = detail(hardware, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12), metal, x, 0.56, -0.41);
    pivot.rotation.z = Math.PI / 2;
  }
  detail(hardware, new THREE.BoxGeometry(1.1, 0.055, 0.065), anodized, 0, 0.55, -0.4);
  const hinge = new THREE.Group(); hinge.position.y = 0.15; hardware.add(hinge);
  detail(hinge, roundedHousing(1.64, 1.06, 0.15, 0.09), rubber, 0, 0.55, 0);
  detail(hinge, roundedHousing(1.56, 0.99, 0.17, 0.07), anodized, 0, 0.55, -0.012);
  detail(hinge, roundedHousing(1.49, 0.92, 0.024, 0.04), trim, 0, 0.55, 0.086);
  // Four shock corners, recessed fasteners, and a grab handle frame the detachable tablet.
  for (const x of [-0.76, 0.76]) for (const y of [0.09, 1.01]) {
    detail(hinge, roundedHousing(0.14, 0.18, 0.2, 0.035), equipmentShell, x, y, -0.008);
    const screw = detail(hinge, new THREE.CylinderGeometry(0.014, 0.014, 0.008, 8), trim, x, y, 0.097);
    screw.rotation.x = Math.PI / 2;
  }
  detail(hinge, roundedHousing(0.58, 0.07, 0.12, 0.03), rubber, 0, 1.18, -0.02);
  for (const x of [-0.25, 0.25]) detail(hinge, roundedHousing(0.07, 0.15, 0.12, 0.025), anodized, x, 1.1, -0.02);
  for (let i = 0; i < 3; i++) detail(hinge, roundedHousing(0.065, 0.018, 0.012, 0.005), i === 0 ? sensorLens : amber, -0.58 + i * 0.1, 0.075, 0.107);
  // Connectors and rear cooling ribs give the tablet depth from the side and back.
  for (let i = 0; i < 5; i++) detail(hinge, new THREE.BoxGeometry(0.02, 0.45, 0.025), trim, -0.24 + i * 0.12, 0.55, -0.112);
  for (const y of [0.43, 0.58]) detail(hinge, new THREE.CylinderGeometry(0.025, 0.025, 0.025, 12), rubber, 0.817, y, 0).rotation.z = Math.PI / 2;
  const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 640;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.88), new THREE.MeshBasicMaterial({ map: texture }));
  face.position.set(0, 0.55, 0.102); hinge.add(face);
  return { hardware, hinge, canvas, texture };
}
