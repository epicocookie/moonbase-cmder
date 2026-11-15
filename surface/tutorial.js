// Shared movement and camera controls; the hosting mission owns interactions and progress.
import { createAstronaut } from "./models.js";
export function runTutorial({ THREE, scene, camera, renderer, groundHeight, stations, solids, marker, pipHead, animateEquipment,
  controller = ExpeditionUI, startPosition = { x: 0, z: 6 }, canTraverse = (x, z) => Math.abs(x) <= 16 && Math.abs(z) <= 16,
  ceilingHeight = () => Infinity, cameraObstacles = solids, interactionRange = 1.8 }) {
  const $ = id => document.getElementById(id);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Lunar surface. WASD to move, Space to jump, Shift to lock the mouse, Q to release, V to change view.");
  const clamp = THREE.MathUtils.clamp;
  const keys = new Set();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const start = new THREE.Vector3(startPosition.x, groundHeight(startPosition.x, startPosition.z), startPosition.z);
  const { suit, upperBody, legs, arms } = createAstronaut();
  scene.add(suit);
  suit.position.copy(start);
  suit.visible = false;

  let phase = "briefing", third = false, nearby = null, yaw = 0, pitch = -0.06;
  let shiftLocked = false, lockRequested = false, gait = 0, breath = 0;
  let verticalVelocity = 0, airborne = false;
  let descentStart = 0, stride = 0, pointer = null, lastX = 0, lastY = 0;
  const eye = new THREE.Vector3(), direction = new THREE.Vector3(), target = new THREE.Vector3();
  const boom = new THREE.Vector3(), hit = new THREE.Vector3(), ray = new THREE.Ray();
  const cameraSolids = cameraObstacles.map(box => box.clone().expandByScalar(0.14));
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
    if (value !== "walk") releaseMouse();
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
        if (!canTraverse(hit.x, hit.z) || hit.y < groundHeight(hit.x, hit.z) + 0.15) { distance = step - 0.1; break; }
      }
      camera.position.addScaledVector(boom, distance);
      suit.visible = distance > 0.48;
    }
    camera.position.y = Math.min(camera.position.y, ceilingHeight(camera.position.x, camera.position.z) - 0.16);
    if (third && shiftLocked) camera.lookAt(target.copy(camera.position).add(direction));
    else camera.lookAt(target.copy(eye).addScaledVector(direction, third ? 2.4 : 1));
  }
  function land(announce = true) {
    setPhase("walk");
    suit.position.copy(start); suit.rotation.y = yaw = 0; pitch = -0.06;
    resetJump();
    $("briefing").hidden = $("skip").hidden = true;
    $("live").hidden = false;
    canvas.focus({ preventScroll: true });
    updateNavigation();
    aimCamera();
    checkStation();
    if (announce) {
      if (controller.finished) controller.celebration();
      else controller.welcome();
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
    setShiftLock(document.pointerLockElement === canvas);
    document.body.dataset.view = third ? "third" : "first";
    aimCamera();
    requestFrame();
  }

  function setShiftLock(on) {
    shiftLocked = on;
    $("shift-lock").setAttribute("aria-pressed", String(on));
    $("shift-lock").textContent = "Shift lock " + (on ? "on" : "off");
    aimCamera();
    requestFrame();
  }
  function releaseMouse() {
    lockRequested = false;
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    setShiftLock(false);
  }
  function captureFailed() {
    lockRequested = false;
    setShiftLock(false);
    $("mouse-status").textContent = "Mouse capture unavailable. Drag on the surface to look around.";
  }
  function toggleMouse() {
    if (phase !== "walk") return;
    if (lockRequested || document.pointerLockElement === canvas) { releaseMouse(); return; }
    if (!canvas.requestPointerLock) { captureFailed(); return; }
    lockRequested = true;
    $("mouse-status").textContent = "";
    try { canvas.requestPointerLock()?.catch(captureFailed); }
    catch { captureFailed(); }
  }
  $("shift-lock").onclick = event => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      if (third && phase === "walk") setShiftLock(!shiftLocked);
    } else toggleMouse();
  };
  document.addEventListener("pointerlockchange", () => {
    pointer = null;
    const captured = document.pointerLockElement === canvas;
    if (captured && (!lockRequested || phase !== "walk")) { releaseMouse(); return; }
    if (!captured) lockRequested = false;
    else canvas.focus({ preventScroll: true });
    setShiftLock(captured);
  });
  document.addEventListener("pointerlockerror", captureFailed);

  function resetJump() {
    verticalVelocity = 0;
    airborne = false;
    $("jump").disabled = false;
    document.body.dataset.airborne = "false";
  }
  function jump() {
    if (phase !== "walk" || airborne) return;
    verticalVelocity = 2.2;
    airborne = true;
    $("jump").disabled = true;
    document.body.dataset.airborne = "true";
    checkStation();
    requestFrame();
  }
  $("jump").onclick = jump;
  function canStand(x, z) {
    return canTraverse(x, z) && !solids.some(box =>
      x > box.min.x - 0.23 && x < box.max.x + 0.23 && z > box.min.z - 0.23 && z < box.max.z + 0.23);
  }
  function walk(dt, flightDt = dt) {
    let forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
    let side = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const step = 2.8 * dt / (Math.hypot(forward, side) || 1);
    const dx = (side * Math.cos(yaw) - forward * Math.sin(yaw)) * step;
    const dz = (-forward * Math.cos(yaw) - side * Math.sin(yaw)) * step;
    const p = suit.position;
    const oldX = p.x, oldZ = p.z;
    if (canStand(p.x + dx, p.z)) p.x += dx;
    if (canStand(p.x, p.z + dz)) p.z += dz;
    const ground = groundHeight(p.x, p.z);
    if (airborne) {
      p.y += verticalVelocity * flightDt - 0.5 * 1.62 * flightDt * flightDt;
      verticalVelocity -= 1.62 * flightDt;
      const ceiling = ceilingHeight(p.x, p.z) - 1.6;
      if (p.y > ceiling) { p.y = Math.max(ground, ceiling); verticalVelocity = Math.min(0, verticalVelocity); }
      if (p.y <= ground) { p.y = ground; resetJump(); }
    } else p.y = ground;
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
    const next = controller.next();
    marker.visible = !controller.finished && !scanInProgress;
    const markerX = next.x + (next.id === "field-screen" ? 1.1 : 0);
    marker.position.set(markerX, groundHeight(markerX, next.z), next.z);
    const dx = next.x - suit.position.x, dz = next.z - suit.position.z;
    $("waypoint-name").textContent = `${next.name} · ${Math.round(Math.hypot(dx, dz))} m`;
    $("waypoint-arrow").style.transform = `rotate(${Math.atan2(dx, -dz) + yaw}rad)`;
    pipHead.rotation.y = Math.atan2(suit.position.x - 1.6, suit.position.z - 6);
  }
  function checkStation() {
    if (airborne) { $("use").hidden = true; $("reticle").classList.remove("scan-ready"); return; }
    const next = stations.filter(station => Math.hypot(station.x - suit.position.x, station.z - suit.position.z) <= interactionRange)
      .sort((a, b) => Math.hypot(a.x - suit.position.x, a.z - suit.position.z) - Math.hypot(b.x - suit.position.x, b.z - suit.position.z))[0];
    nearby = next;
    $("use").hidden = !nearby;
    const unscanned = nearby && controller.needsScan(nearby.id);
    const aligned = !unscanned || scanAligned(nearby);
    $("reticle").classList.toggle("scan-ready", Boolean(unscanned && aligned));
    $("use").disabled = !aligned;
    if (nearby) {
      let action = "Explore ";
      if (unscanned) action = aligned ? (controller.state.deployed.includes(nearby.id) ? "Resume scanner · " : "Place scanner · ") : "Aim at ";
      else if (nearby.id === "field-screen") action = controller.state.screenDeployed !== false ? "Open " : "Place ";
      else if (nearby.id === "pip") action = "Talk to ";
      else if (nearby.id === "flag") action = nearby.planted ? "Visit " : "Plant ";
      $("use").textContent = action + nearby.name + " · E";
    }
  }
  function scanAligned(station) {
    const sample = new THREE.Vector3(station.x, groundHeight(station.x, station.z) + 0.6, station.z);
    const offset = sample.sub(camera.position).normalize();
    return camera.getWorldDirection(new THREE.Vector3()).dot(offset) > 0.86;
  }
  function use() {
    if (!nearby || airborne || phase !== "walk" || $("use").disabled) return;
    controller.inspect(nearby.id, { aligned: controller.isSite(nearby.id) });
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
  document.addEventListener("expeditiondeploy", ({ detail }) => {
    scanInProgress = detail.active && !detail.preview;
    updateNavigation();
  });
  for (const event of ["expeditionscan", "expeditiondeploy", "expeditiontransmit", "expeditionpip", "expeditionplantflag", "expeditionflagchange"]) document.addEventListener(event, requestFrame);
  document.addEventListener("expeditionchange", () => { updateNavigation(); requestFrame(); });
  $("return-pip").onclick = () => {
    suit.position.copy(start); suit.rotation.y = yaw = 0; pitch = -0.06;
    resetJump();
    setPhase("walk"); aimCamera(); checkStation(); updateNavigation();
    controller.run.checkpoint({ x: suit.position.x, z: suit.position.z, yaw, pitch, third, shiftLocked });
    requestFrame();
  };

  addEventListener("keydown", e => {
    if (phase !== "walk" || e.target.closest("input, textarea, select, [contenteditable=true]") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === "KeyQ" || e.code === "Escape") { releaseMouse(); return; }
    if (e.code === "Space") {
      if (e.target.closest("button, a, summary, [role=button]")) return;
      e.preventDefault();
      if (!e.repeat) jump();
      return;
    }
    if (["KeyW","KeyA","KeyS","KeyD"].includes(e.code)) { keys.add(e.code); requestFrame(); }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
      e.preventDefault();
      look(e.code === "ArrowLeft" ? -35 : e.code === "ArrowRight" ? 35 : 0, e.code === "ArrowUp" ? -25 : e.code === "ArrowDown" ? 25 : 0);
    }
    if (!e.repeat && e.code === "KeyV") changeView();
    if (!e.repeat && (e.code === "ShiftLeft" || e.code === "ShiftRight")) toggleMouse();
    if (!e.repeat && e.code === "KeyE") use();
  });
  addEventListener("keyup", e => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); releaseMouse(); });
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
    canvas.focus({ preventScroll: true });
    pointer = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(pointer);
  };
  canvas.onpointermove = e => {
    // Only a held button drags the view, so a free mouse can roam the screen.
    if (phase !== "walk" || document.pointerLockElement || pointer !== e.pointerId || (e.pointerType === "mouse" && !(e.buttons & 1))) return;
    look(e.clientX - lastX, e.clientY - lastY); lastX = e.clientX; lastY = e.clientY;
  };
  canvas.onlostpointercapture = canvas.onpointerup = () => { pointer = null; };
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
  document.body.dataset.view = "first";
  document.body.dataset.airborne = "false";
  resize(); frameBriefing(); updateNavigation();
  $("loading").hidden = true; $("deploy").disabled = false;
  // Only the visible astronaut casts a moving shadow.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  addEventListener("pagehide", () => {
    releaseMouse();
    if (phase === "walk" || phase === "station") {
      controller.run.checkpoint({ x: suit.position.x, z: suit.position.z, yaw, pitch, third, shiftLocked });
    }
  });
  if (location.hash === "#resume") {
    const saved = controller.run.load();
    if (saved) {
      land(false);
      const pose = saved.pose;
      if (pose && Number.isFinite(pose.x) && Number.isFinite(pose.z) && canStand(pose.x, pose.z) && Number.isFinite(pose.yaw) && Number.isFinite(pose.pitch)) {
        suit.position.set(pose.x, groundHeight(pose.x, pose.z), pose.z);
        yaw = pose.yaw; pitch = clamp(pose.pitch, -1.1, 1.05);
        if (pose.third) changeView();
        setShiftLock(false);
        aimCamera(); checkStation();
      }
      updateNavigation();
      if (controller.finished) controller.celebration();
      else controller.welcome();
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(pendingFrame);
      pendingFrame = previous = 0;
      keys.clear();
      releaseMouse();
    } else requestFrame();
  });
  function draw(now) {
    pendingFrame = 0;
    const frameDelta = Math.min(0.25, Math.max(0, (now - previous) / 1000));
    const dt = Math.min(0.05, frameDelta);
    previous = now;
    if (phase === "descent") {
      const t = clamp((now - descentStart) / 3000, 0, 1);
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(introPosition, landingEye, eased);
      camera.lookAt(introFocus.lerpVectors(introTarget, landingTarget, eased));
      if (t === 1) land();
    } else if (phase === "walk") walk(dt, frameDelta);
    const equipmentMoving = animateEquipment(now / 1000, reducedMotion.matches);
    renderer.render(scene, camera);
    if (equipmentMoving || phase === "descent" || (phase === "walk" && ((third && !reducedMotion.matches) || keys.size || airborne))) requestFrame();
    else previous = 0;
  }
}



