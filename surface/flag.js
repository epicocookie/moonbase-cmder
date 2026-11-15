import * as THREE from "three";

// A supported, gently creased flag cloth in the airless training outpost.
export function createOutpostFlag(scene, groundHeight, renderer, initiallyPlanted) {
  const station = { id: "flag", name: "American flag", x: -6.5, z: 5.5, planted: initiallyPlanted };
  const spot = new THREE.Group();
  spot.position.set(station.x, groundHeight(station.x, station.z), station.z);
  spot.rotation.y = 0.55;
  scene.add(spot);
  const metal = new THREE.MeshStandardMaterial({ color: 0xc1ccd1, roughness: 0.5, metalness: 0.4 });
  const pad = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.018, 6, 40),
    new THREE.MeshBasicMaterial({ color: 0xd4ba7d }));
  pad.rotation.x = Math.PI / 2; pad.position.y = 0.035; spot.add(pad);
  const assembly = new THREE.Group(); spot.add(assembly);
  assembly.visible = initiallyPlanted;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 2.25, 12), metal);
  pole.position.y = 1.125; pole.castShadow = true; assembly.add(pole);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), metal);
  cap.position.y = 2.27; assembly.add(cap);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 10), metal);
  bar.rotation.z = Math.PI / 2; bar.position.set(0.6, 2.15, 0); assembly.add(bar);

  const canvas = document.createElement("canvas"); canvas.width = 760; canvas.height = 400;
  const context = canvas.getContext("2d");
  for (let stripe = 0; stripe < 13; stripe++) {
    context.fillStyle = stripe % 2 ? "#ffffff" : "#b22234";
    context.fillRect(0, stripe * 400 / 13, 760, 400 / 13 + 1);
  }
  const cantonWidth = 304, cantonHeight = 400 * 7 / 13;
  context.fillStyle = "#3c3b6e"; context.fillRect(0, 0, cantonWidth, cantonHeight);
  context.fillStyle = "#ffffff";
  for (let row = 0; row < 9; row++) {
    const count = row % 2 ? 5 : 6;
    for (let column = 0; column < count; column++) {
      const x = (column + (count === 6 ? 0.5 : 1)) * cantonWidth / 6;
      const y = (row + 0.5) * cantonHeight / 9;
      context.beginPath();
      for (let point = 0; point < 10; point++) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 ? 3 : 7;
        const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
        if (point === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.closePath(); context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const clothGeometry = new THREE.PlaneGeometry(1.14, 0.6, 24, 12);
  const positions = clothGeometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    const x = (positions.getX(index) + 0.57) / 1.14;
    const drop = (0.3 - positions.getY(index)) / 0.6;
    positions.setZ(index, Math.sin(x * Math.PI * 7) * 0.035 * drop);
  }
  clothGeometry.computeVertexNormals();
  const cloth = new THREE.Mesh(clothGeometry,
    new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.95 }));
  cloth.position.set(0.605, 1.85, 0.012); cloth.castShadow = cloth.receiveShadow = true;
  assembly.add(cloth);
  const collider = new THREE.Box3(
    new THREE.Vector3(station.x - 0.08, spot.position.y, station.z - 0.08),
    new THREE.Vector3(station.x + 0.08, spot.position.y + 2.3, station.z + 0.08));
  let planting = false, progress = 0, previous = 0;
  document.addEventListener("expeditionplantflag", () => {
    if (station.planted || planting) return;
    planting = true; progress = 0; previous = 0; assembly.visible = true;
  });
  function update(time, reducedMotion) {
    if (!planting) return false;
    const dt = previous ? Math.min(0.05, Math.max(0, time - previous)) : 0;
    previous = time;
    progress = reducedMotion ? 1 : Math.min(1, progress + dt / 1.6);
    const eased = progress * progress * (3 - 2 * progress);
    assembly.position.y = (1 - eased) * 0.6;
    assembly.rotation.z = (1 - eased) * -0.12;
    renderer.shadowMap.needsUpdate = true;
    if (progress === 1) {
      planting = false; station.planted = true;
      document.dispatchEvent(new CustomEvent("expeditionflagplanted"));
    }
    return planting;
  }
  return { station, collider, update };
}
