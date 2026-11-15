# Moonbase Commander · Surface tutorial

In PowerShell, run:

```powershell
cd "$env:USERPROFILE\moonbase-cmder"
python -m http.server 8127 --bind 127.0.0.1
```

Open [the intro and mission menu](http://127.0.0.1:8127/). Choose Mission 1 in 3D or open its 2D dashboard. The header lets you switch views without losing progress in this tab. A finished expedition returns to selection with its journal and replay options. Stop the server with Ctrl+C. The 3D page requires WebGL 2 and internet access to load Three.js 0.187.0. No build step or npm install is needed.

Choose **Begin expedition**. Walk with **WASD**, press **Shift** (or click the scene) to lock the mouse for looking around, and press **Shift** again (or Esc) to free it for clicking buttons, or drag to look. Press **V** to switch between helmet and third-person views. On touchscreens, use the arrow pad, drag the scene to look, and tap the view button.

On touchscreens, hold an arrow on the movement pad to move continuously, or tap it for a small step.

The **Shift lock on/off** button shows whether the mouse is locked, in both views, and clicking it switches too. In third person, a locked mouse also gives an over-the-shoulder view. The astronaut faces your aim while **A/D** strafe and **S** backs up. Toggle it again for free orbit.

Pip is the small rover at the landing point. The **Shaded crater** scanner is at `(8, 3)` and the **Sunlit reference** at `(5, 6)`. Walk close and press **E** or tap the on-screen interaction button. Either scan can come first. Aim the center reticle at the instrument until its ring turns green, then press E or tap Scan. Arrow keys also adjust your aim. A three-second sweep collects the reading. Canceling allows a retry, and repeated scans reopen the recorded observation.

After both scans, use **Communications** at `(0, -4)` to review both readings, select **Ready to send**, and watch the transmission. After Earth acknowledges the finding, choose **View discovery journal**. Mission 1 has no resource costs, countdown, or failure state. **Ask Pip · Hint** identifies the next destination and the amber marker points toward it. **Return to Pip** resets position and aim without clearing findings. **Field journal** reopens your observations at any time.

The 2D dashboard uses the same controller, scan results, dialogue, and report gate. The standalone classic page retains the original survival rules.

Completed journals are saved in local storage; active expeditions and 3D pose use session storage. When all storage is unavailable, the completed journal stays on the current page so it can still be read.

