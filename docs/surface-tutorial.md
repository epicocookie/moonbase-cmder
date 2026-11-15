# Moonbase Commander · Surface tutorial

In PowerShell, run:

```powershell
cd "$env:USERPROFILE\moonbase-cmder"
python -m http.server 8127 --bind 127.0.0.1
```

Open [the intro and mission menu](http://127.0.0.1:8127/). Choose Mission 1 in 3D or open its 2D dashboard. The header lets you switch views without losing progress in this tab. A finished expedition returns to selection with its journal and replay options. Stop the server with Ctrl+C. The 3D page requires WebGL 2 and the bundled Three.js 0.187.0 files. No build step or npm install is needed.

Choose **Begin expedition**. Walk with **WASD** and use **Shift** or the **Shift lock** button to capture the mouse for looking around. **Q** or **Esc** releases the cursor immediately. With the cursor free, hold and drag on the scene to look. **V** switches between helmet and third-person views.

Press **Space** for a floaty lunar jump, approximately 1.5 metres high with a 2.7-second flight. The simplified jump uses lunar gravity of 1.62 m/s². A jump starts from the ground, and steering still works in the air. Modal conversations pause movement. On touchscreens, use the movement pad, drag to look, and tap **Jump**.

The **Shift lock on/off** button reflects mouse capture. In third person, capture also enables the shoulder camera, with the astronaut facing your aim. Release the cursor to return to free orbit. Saved runs restore the selected POV with the cursor free.

An optional **American flag** spot is near the habitat at `(-6.5, 5.5)`. Walk close, interact, and confirm **Plant American flag**. The pole settles into the ground; a horizontal support holds the creased fabric open. The flag stays for this browser tab across the 3D missions. With storage unavailable it stays on the current page. Reduced-motion mode places it immediately.

Pip is the small rover at the landing point. Visit the **Shaded crater** sample at `(8, 3)` and the **Sunlit reference** at `(5, 6)` in either order. Aim at a marked sample, press **E** or tap the interaction button, then select **Place scanner**. Your equipment unfolds onto the ground and automatically scans the sample for four seconds. Canceling placement leaves the scanner in your kit. Canceling after placement leaves the equipment on site, ready to **Resume scan**. Finished scanners remain beside their samples.

Once both readings arrive, follow the marker to the **Field screen** at `(3, 0)`. Select **Place screen on the ground** to unfold its kickstand and connect both scanners. Open the screen to compare the sample visuals and simulated reading patterns, then select **Evidence reviewed · prepare report**. The screen remains on the ground and can be reopened.

Use **Communications** at `(0, -4)` to select **Send reviewed finding**. After Earth acknowledges the transmission, choose **View discovery journal**. **Ask Pip · Hint** identifies the next task. **Return to Pip** resets position and aim while keeping equipment and findings. **Field journal** reopens your observations at any time.

The 2D dashboard uses the same controller, scan results, dialogue, and report gate. The standalone classic page retains the original survival rules.

Completed journals are saved in local storage; active expeditions and 3D pose use session storage. When all storage is unavailable, the completed journal stays on the current page so it can still be read.


## Mission 3

Choose **Into the lava tube** from mission selection. Its controls, astronaut, Pip,
outpost equipment, and optional flag use the same components as the other missions.
Follow the amber marker to the entrance test, then the lit ramp to three cave
instruments. Confirm each scan and wait for its progress bar to finish. Closing
it cancels without spending resources. Bring the readings to Surface Comms or the
adjacent field display to review and send your report. [Full cave guide](mission3.md).
