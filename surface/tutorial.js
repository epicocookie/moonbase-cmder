// The shared expedition controller owns discoveries, radio, and reports.
export function runTutorial({ THREE, scene, camera, renderer, groundHeight, stations, solids, marker, pipHead, animateEquipment }) {
  const $ = id => document.getElementById(id);
  const canvas = renderer.domElement;
  const clamp = THREE.MathUtils.clamp;
  const keys = new Set();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const start = new THREE.Vector3(0, groundHeight(0, 6), 6);
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
  scene.add(suit);
  suit.position.copy(start);
  suit.visible = false;

  let phase = "briefing", third = false, nearby = null, yaw = 0, pitch = -0.06;
  let shiftLocked = false, gait = 0, breath = 0;
  let descentStart = 0, stride = 0, pointer = null, lastX = 0, lastY = 0;
  const eye = new THREE.Vector3(), direction = new THREE.Vector3(), target = new THREE.Vector3();
  const boom = new THREE.Vector3(), hit = new THREE.Vector3(), ray = new THREE.Ray();
  const cameraSolids = solids.map(box => box.clone().expandByScalar(0.14));
  const introPosition = new THREE.Vector3(11, 8, 13);
  const introTarget = new THREE.Vector3(-3, 0.8, 3.6);
  const introFocus = new THREE.Vector3();
  const landingEye = start.clone().add(new THREE.Vector3(0, 1.32, 0));
  const landingTarget = landingEye.clone().add(new THREE.Vector3(0, Math.tan(pitch), -1));
  let pendingFrame = 0, previous = 0, scanInProgress = false;
  function requestFrame() {
    if (!pendingFrame && !document.hidden) {
      if (!previous) previous = performance.now();
      pendingFrame = requestAnimationFrame(draw);
    }
  }
  function setPhase(value) {
    phase = document.body.dataset.phase = value;
    keys.clear();
    pointer = null;
    if (value !== "walk" && document.pointerLockElement) document.exitPointerLock();
    requestFrame();
  }
  function frameBriefing() {
    camera.position.copy(introPosition);
    camera.lookAt(introTarget);
  }
  function aimCamera() {
    direction.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    eye.copy(suit.position); eye.y += 1.32;
    camera.position.copy(eye);
    suit.visible = third;
    if (third) {
      boom.copy(direction).multiplyScalar(-2.9);
      boom.y += 0.72;
      if (shiftLocked) {
        boom.x += 0.55 * Math.cos(yaw);
        boom.z -= 0.55 * Math.sin(yaw);
      }
      let distance = boom.length();
      ray.set(eye, boom.normalize());
      for (const box of cameraSolids) {
        if (ray.intersectBox(box, hit)) distance = Math.min(distance, Math.max(0, eye.distanceTo(hit) - 0.06));
      }
      // Clip the boom before it crosses a crater rim or the ground.
      for (let step = 0.1; step <= distance; step += 0.1) {
        ray.at(step, hit);
        if (hit.y < groundHeight(hit.x, hit.z) + 0.15) { distance = step - 0.1; break; }
      }
      camera.position.addScaledVector(boom, distance);
      suit.visible = distance > 0.48;
    }
    if (third && shiftLocked) camera.lookAt(target.copy(camera.position).add(direction));
    else camera.lookAt(target.copy(eye).addScaledVector(direction, third ? 2.4 : 1));
  }
  function land(announce = true) {
    setPhase("walk");
    suit.position.copy(start); suit.rotation.y = yaw = 0; pitch = -0.06;
    $("briefing").hidden = $("skip").hidden = true;
    $("live").hidden = false;
    updateNavigation();
    aimCamera();
    checkStation();
    if (announce) {
      if (ExpeditionUI.finished) ExpeditionUI.celebration();
      else ExpeditionUI.welcome();
    }
  }
  $("deploy").onclick = () => {
    history.replaceState(null, "", location.pathname + "#resume");
    setPhase("descent");
    descentStart = performance.now();
    $("briefing").hidden = true; $("skip").hidden = false;
    if (reducedMotion.matches) land();
    else $("skip").focus();
  };
  $("skip").onclick = land;
  function changeView() {
    if (phase !== "walk") return;
    third = !third;
    renderer.shadowMap.autoUpdate = third;
    renderer.shadowMap.needsUpdate = true;
    setShiftLock(false);
    $("shift-lock").hidden = !third;
    $("view").textContent = (third ? "Third" : "First") + " person · V";
    aimCamera();
    requestFrame();
  }
  $("view").onclick = changeView;

  function setShiftLock(on) {
    shiftLocked = on;
    $("shift-lock").setAttribute("aria-pressed", String(on));
    $("shift-lock").textContent = "Shift lock " + (on ? "on" : "off");
  }
  function toggleLock(useMouse) {
    if (!third || phase !== "walk") return;
    setShiftLock(!shiftLocked);
    if (shiftLocked && useMouse && !document.pointerLockElement) {
      canvas.requestPointerLock?.()?.catch?.(() => {});
    } else if (!shiftLocked && document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  }
  $("shift-lock").onclick = e => toggleLock(e.pointerType === "mouse");
  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement && phase === "walk") setShiftLock(false);
  });

  function canStand(x, z) {
    return Math.abs(x) <= 16 && Math.abs(z) <= 16 && !solids.some(box =>
      x > box.min.x - 0.23 && x < box.max.x + 0.23 && z > box.min.z - 0.23 && z < box.max.z + 0.23);
  }
  function walk(dt) {
    let forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
    let side = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const step = 2.8 * dt / (Math.hypot(forward, side) || 1);
    const dx = (side * Math.cos(yaw) - forward * Math.sin(yaw)) * step;
    const dz = (-forward * Math.cos(yaw) - side * Math.sin(yaw)) * step;
    const p = suit.position;
    const oldX = p.x, oldZ = p.z;
    if (canStand(p.x + dx, p.z)) p.x += dx;
    if (canStand(p.x, p.z + dz)) p.z += dz;
    p.y = groundHeight(p.x, p.z);
    const distance = Math.hypot(p.x - oldX, p.z - oldZ);
    if (third && shiftLocked) suit.rotation.y = yaw;
    else if (distance > 0) suit.rotation.y = Math.atan2(oldX - p.x, oldZ - p.z);

    // Animate the suit from distance travelled so it settles against obstacles.
    stride += distance * 3;
    breath += dt * 2.2;
    gait = THREE.MathUtils.damp(gait, distance > 0 ? 1 : 0, 12, dt);
    const swing = 0.38 * Math.sin(stride) * gait;
    upperBody.position.y = reducedMotion.matches ? 0 : 0.014 * Math.sin(breath) * (1 - gait) + 0.045 * Math.sin(stride) ** 2 * gait;
    upperBody.rotation.z = reducedMotion.matches ? 0 : 0.028 * Math.cos(stride) * gait;
    legs[0].rotation.x = arms[1].rotation.x = swing;
    legs[1].rotation.x = arms[0].rotation.x = -swing;
    aimCamera();
    checkStation();
    updateNavigation();
  }
  function updateNavigation() {
    const next = ExpeditionUI.next();
    marker.visible = !ExpeditionUI.finished && !scanInProgress;
    marker.position.set(next.x, groundHeight(next.x, next.z), next.z);
    const dx = next.x - suit.position.x, dz = next.z - suit.position.z;
    $("waypoint-name").textContent = `${next.name} · ${Math.round(Math.hypot(dx, dz))} m`;
    $("waypoint-arrow").style.transform = `rotate(${Math.atan2(dx, -dz) + yaw}rad)`;
    pipHead.rotation.y = Math.atan2(suit.position.x - 1.6, suit.position.z - 6);
  }
  function checkStation() {
    const next = stations.filter(station => Math.hypot(station.x - suit.position.x, station.z - suit.position.z) <= 1.8)
      .sort((a, b) => Math.hypot(a.x - suit.position.x, a.z - suit.position.z) - Math.hypot(b.x - suit.position.x, b.z - suit.position.z))[0];
    nearby = next;
    $("use").hidden = !nearby;
    const unscanned = nearby && ExpeditionUI.needsScan(nearby.id);
    const aligned = !unscanned || scanAligned(nearby);
    $("reticle").classList.toggle("scan-ready", Boolean(unscanned && aligned));
    $("use").disabled = !aligned;
    if (nearby) $("use").textContent = (unscanned ? aligned ? "Scan " : "Aim at " : nearby.id === "pip" ? "Talk to " : "Explore ") + nearby.name + " · E";
  }
  function scanAligned(station) {
    const sample = new THREE.Vector3(station.x, groundHeight(station.x, station.z) + 0.6, station.z);
    const offset = sample.sub(camera.position).normalize();
    return camera.getWorldDirection(new THREE.Vector3()).dot(offset) > 0.86;
  }
  function use() {
    if (!nearby || phase !== "walk" || $("use").disabled) return;
    ExpeditionUI.inspect(nearby.id, { aligned: ExpeditionUI.isSite(nearby.id) });
  }
  $("use").onclick = use;
  document.addEventListener("expeditiondialog", event => {
    if (event.detail.open && phase === "walk") setPhase("station");
    else if (!event.detail.open && phase === "station") setPhase("walk");
  });
  document.addEventListener("expeditionscan", ({ detail }) => {
    scanInProgress = detail.active;
    updateNavigation();
  });
  for (const event of ["expeditionscan", "expeditiontransmit", "expeditionpip"]) document.addEventListener(event, requestFrame);
  document.addEventListener("expeditionchange", () => { updateNavigation(); requestFrame(); });
  $("return-pip").onclick = () => {
    suit.position.copy(start); suit.rotation.y = yaw = 0; pitch = -0.06;
    setPhase("walk"); aimCamera(); checkStation(); updateNavigation();
    ExpeditionUI.run.checkpoint({ x: suit.position.x, z: suit.position.z, yaw, pitch, third, shiftLocked });
    requestFrame();
  };
  $("toggle-pad").onclick = () => {
    const visible = document.body.classList.toggle("show-movement-pad");
    $("toggle-pad").setAttribute("aria-pressed", String(visible));
  };

  addEventListener("keydown", e => {
    if (phase !== "walk" || e.target.closest("input, textarea, select") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (["KeyW","KeyA","KeyS","KeyD"].includes(e.code)) { keys.add(e.code); requestFrame(); }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
      e.preventDefault();
      look(e.code === "ArrowLeft" ? -35 : e.code === "ArrowRight" ? 35 : 0, e.code === "ArrowUp" ? -25 : e.code === "ArrowDown" ? 25 : 0);
    }
    if (!e.repeat && e.code === "KeyV") changeView();
    if (!e.repeat && (e.code === "ShiftLeft" || e.code === "ShiftRight")) toggleLock(true);
    if (!e.repeat && e.code === "KeyE") use();
  });
  addEventListener("keyup", e => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); pointer = null; });
  for (const button of $("pad").querySelectorAll("button")) {
    let pressedAt = 0;
    button.onpointerdown = e => {
      if (phase !== "walk") return;
      pressedAt = performance.now();
      e.preventDefault(); button.setPointerCapture(e.pointerId); keys.add(button.dataset.key); requestFrame();
    };
    button.onlostpointercapture = () => keys.delete(button.dataset.key);
    // Short taps and keyboard activation also take a step, even between animation frames.
    button.onclick = event => {
      if (phase !== "walk" || (event.detail && performance.now() - pressedAt > 200)) return;
      const held = keys.has(button.dataset.key);
      keys.add(button.dataset.key);
      walk(0.12);
      if (!held) keys.delete(button.dataset.key);
      requestFrame();
    };
  }
  function look(dx, dy) {
    yaw -= dx * 0.003;
    pitch = clamp(pitch - dy * 0.003, -1.1, 1.05);
    aimCamera(); checkStation();
    requestFrame();
  }
  canvas.onpointerdown = e => {
    if (phase !== "walk" || e.button !== 0) return;
    pointer = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(pointer);
    if (e.pointerType === "mouse" && !document.pointerLockElement) {
      // Drag-to-look also works on browsers that decline pointer lock.
      canvas.requestPointerLock?.()?.catch?.(() => {});
    }
  };
  canvas.onpointermove = e => {
    if (phase !== "walk" || document.pointerLockElement || pointer !== e.pointerId) return;
    look(e.clientX - lastX, e.clientY - lastY); lastX = e.clientX; lastY = e.clientY;
  };
  canvas.onlostpointercapture = () => { pointer = null; };
  document.addEventListener("mousemove", e => {
    if (phase === "walk" && document.pointerLockElement === canvas) look(e.movementX, e.movementY);
  });

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = phase === "briefing" && camera.aspect < 1 ? 68 : 59;
    camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
    requestFrame();
  }
  addEventListener("resize", resize);
  addEventListener("surfaceassetready", requestFrame);
  reducedMotion.addEventListener("change", requestFrame);
  resize(); frameBriefing(); updateNavigation();
  $("loading").hidden = true; $("deploy").disabled = false;
  // Only the visible astronaut casts a moving shadow.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  addEventListener("pagehide", () => {
    if (phase === "walk" || phase === "station") {
      ExpeditionUI.run.checkpoint({ x: suit.position.x, z: suit.position.z, yaw, pitch, third, shiftLocked });
    }
  });
  if (location.hash === "#resume") {
    const saved = ExpeditionUI.run.load();
    if (saved) {
      land(false);
      const pose = saved.pose;
      if (pose && Number.isFinite(pose.x) && Number.isFinite(pose.z) && canStand(pose.x, pose.z) && Number.isFinite(pose.yaw) && Number.isFinite(pose.pitch)) {
        suit.position.set(pose.x, groundHeight(pose.x, pose.z), pose.z);
        yaw = pose.yaw; pitch = clamp(pose.pitch, -1.1, 1.05);
        if (pose.third) changeView();
        setShiftLock(third && pose.shiftLocked);
        aimCamera(); checkStation();
      }
      updateNavigation();
      if (ExpeditionUI.finished) ExpeditionUI.celebration();
      else ExpeditionUI.welcome();
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(pendingFrame);
      pendingFrame = previous = 0;
      keys.clear();
      pointer = null;
    } else requestFrame();
  });
  function draw(now) {
    pendingFrame = 0;
    const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000)); previous = now;
    if (phase === "descent") {
      const t = clamp((now - descentStart) / 3000, 0, 1);
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(introPosition, landingEye, eased);
      camera.lookAt(introFocus.lerpVectors(introTarget, landingTarget, eased));
      if (t === 1) land();
    } else if (phase === "walk") walk(dt);
    const equipmentMoving = animateEquipment(now / 1000, reducedMotion.matches);
    renderer.render(scene, camera);
    if (equipmentMoving || phase === "descent" || (phase === "walk" && ((third && !reducedMotion.matches) || keys.size))) requestFrame();
    else previous = 0;
  }
}



