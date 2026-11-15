import * as THREE from "../vendor/three/three.module.js";

const mount = document.getElementById("moon-view");
const intro = document.getElementById("intro");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const pause = document.getElementById("moon-pause");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
camera.position.set(0, 0, 5.5);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
const canvas = renderer.domElement;
canvas.tabIndex = 0;
canvas.setAttribute("role", "img");
canvas.setAttribute("aria-label", "Rotating 3D Moon. Drag or use left and right arrow keys to explore.");
canvas.setAttribute("aria-describedby", "moon-help");
mount.prepend(canvas);

const sunlight = new THREE.DirectionalLight(0xfff5e6, 3.5);
sunlight.position.set(-3, 2, 3);
scene.add(sunlight, new THREE.AmbientLight(0xc4d0df, 0.055));
const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64),
  new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, bumpScale: 0.035 }));
// Presentation rotation and terrain relief are exaggerated, not real-time ephemeris.
moon.rotation.set(0.12, -1.6, -0.12);
scene.add(moon);

const orbit = new THREE.Group();
orbit.rotation.set(0.92, -0.35, 0.2);
const orbitPoints = Array.from({ length: 181 }, (_, index) => {
  const angle = index / 180 * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle) * 1.48, 0, Math.sin(angle) * 1.48);
});
orbit.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitPoints),
  new THREE.LineBasicMaterial({ color: 0xd4b583, transparent: true, opacity: 0.32 })));
const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xffcf86 }));
orbit.add(beacon);
scene.add(orbit);

// One small point cloud provides depth without another background asset.
const stars = new Float32Array(180 * 3);
for (let index = 0; index < stars.length; index += 3) {
  stars[index] = (Math.random() - 0.5) * 14;
  stars[index + 1] = (Math.random() - 0.5) * 12;
  stars[index + 2] = -2 - Math.random() * 5;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb7c8d3, size: 0.012, transparent: true, opacity: 0.65 })));

let paused = reducedMotion.matches, ready = false, frame = 0, previous = 0, elapsed = 0;
let pointer = null, lastX = 0, lastY = 0;
function requestFrame() {
  if (!frame && !document.hidden && !intro.hidden) frame = requestAnimationFrame(draw);
}
function draw(now) {
  frame = 0;
  if (document.hidden || intro.hidden) { previous = 0; return; }
  const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
  previous = now;
  if (!paused && pointer === null) {
    elapsed += dt;
    moon.rotation.y += dt * 0.085;
  }
  beacon.position.set(Math.cos(elapsed * 0.28 + 0.8) * 1.48, 0, Math.sin(elapsed * 0.28 + 0.8) * 1.48);
  renderer.render(scene, camera);
  if (ready) mount.classList.add("is-ready");
  if (!paused && pointer === null) requestFrame();
  else previous = 0;
}
function sync() {
  cancelAnimationFrame(frame);
  frame = previous = 0;
  requestFrame();
}
function resize() {
  const width = mount.clientWidth, height = mount.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  requestFrame();
}
new ResizeObserver(resize).observe(mount);
addEventListener("hashchange", sync);
addEventListener("pageshow", sync);
document.addEventListener("visibilitychange", sync);
function updatePause() {
  pause.textContent = paused ? "Resume rotation" : "Pause rotation";
  pause.setAttribute("aria-pressed", String(paused));
  sync();
}
pause.addEventListener("click", () => { paused = !paused; updatePause(); });
reducedMotion.addEventListener("change", () => { paused = reducedMotion.matches; updatePause(); });
canvas.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  pointer = event.pointerId;
  lastX = event.clientX; lastY = event.clientY;
  canvas.setPointerCapture(pointer);
  canvas.classList.add("dragging");
});
canvas.addEventListener("pointermove", event => {
  if (pointer !== event.pointerId) return;
  moon.rotation.y += (event.clientX - lastX) * 0.008;
  moon.rotation.x = THREE.MathUtils.clamp(moon.rotation.x + (event.clientY - lastY) * 0.004, -0.5, 0.5);
  lastX = event.clientX; lastY = event.clientY;
  requestFrame();
});
canvas.addEventListener("lostpointercapture", () => {
  pointer = null;
  canvas.classList.remove("dragging");
  sync();
});
canvas.addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  moon.rotation.y += event.key === "ArrowRight" ? 0.15 : -0.15;
  requestFrame();
});
canvas.addEventListener("webglcontextlost", event => {
  event.preventDefault();
  cancelAnimationFrame(frame);
  frame = 0;
  mount.classList.remove("is-ready");
  mount.querySelector(".globe-controls").hidden = true;
});
canvas.addEventListener("webglcontextrestored", () => {
  mount.querySelector(".globe-controls").hidden = false;
  sync();
});

const loader = new THREE.TextureLoader();
const color = await loader.loadAsync(new URL("./assets/moon-color.jpg", import.meta.url).href);
color.colorSpace = THREE.SRGBColorSpace;
color.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
moon.material.map = color;
moon.material.needsUpdate = true;
ready = true;
mount.querySelector(".globe-controls").hidden = false;
updatePause();
loader.load(new URL("./assets/moon-height.jpg", import.meta.url).href, texture => {
  moon.material.bumpMap = texture;
  moon.material.needsUpdate = true;
  requestFrame();
}, undefined, () => { /* Color-only globe remains usable if the height map fails. */ });
resize();
