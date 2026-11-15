# 🌕Moonbase commander: 
An interactive lunar survival game where young
astronauts learn about resource management,
decision-making, and space exploration.
Built for NASA Space Apps Challenge 2026.

## Team
A three-person international student team.

## Status
Currently in development.

## Project layout
| Area | Where to look |
| --- | --- |
| Intro and mission selection | [index.html](index.html), [launch/](launch/) |
| Playable 2D dashboard | [dashboard.html](dashboard.html) shares Mission 1 progress with 3D |
| Mission 2 | [dashboard-mission2.html](dashboard-mission2.html) (2D), [3d-mission2.html](3d-mission2.html) (3D), and rules in [shared/mission2.js](shared/mission2.js) |
| Classic mission | [classic-mission.html](classic-mission.html) and [classic/](classic/) for its styles |
| 3D tutorial | [3d-test.html](3d-test.html) and [surface/](surface/) for scene, movement, cameras, and styles |
| Shared expedition | [shared/mission1.js](shared/mission1.js), [shared/expedition-ui.js](shared/expedition-ui.js), and [shared/surface-run.js](shared/surface-run.js) |
| Standalone survival page | [shared/game.js](shared/game.js), used only by the classic page; its shift math comes from [shared/mission2.js](shared/mission2.js) |
| Guides and notes | [Classic mission](docs/classic-mission.md), [3D setup and controls](docs/surface-tutorial.md), [mission resources](docs/mission-resources.md) |

## Play locally

From this folder, run `python -m http.server 8127 --bind 127.0.0.1` and open
[Moonbase Commander](http://127.0.0.1:8127/). No install or build step.

The intro leads to mission selection. Missions 1 and 2 are playable in 3D or from
their 2D dashboards; Mission 3 is coming soon. Switch views during a run to continue
the same observations. Mission 1, **A Clue in the Cold**, is a safe expedition for
ages 7–12: meet Pip, scan the shaded crater and sunlit reference in either order,
align your scanner and watch each reading appear, then review your evidence at
Communications before sending your possible-ice report. Pip introduces the mystery
and Earth acknowledges your finding. Dialogue reveals gradually and includes
**Show full text**. The expedition targets a 3–5 minute first visit. There is no countdown,
resource cost, or failure state. **Return to Pip** brings you back without losing
your findings; **Ask Pip** points toward the next task.
The optional **Movement pad** supports taps, held arrows, and keyboard activation.

After the transmission, **View discovery journal** returns to selection with the journal expanded. Active
progress lasts in the current browser tab. The latest completed journal stays in
this browser across tab closures and replays. If browser storage is blocked,
the expedition still works; with all storage blocked, its completed journal is
shown on the current page instead of navigating away. Old survival saves remain
untouched. The legacy classic page remains a separate standalone game.

**Mission 2, Power Through the Shadows** (menu card "Beyond the outpost"), is
the engineering challenge from the team guide. The crew starts with 3 / 9 battery
and 3 / 3 oxygen safety. Shift 1 is sunlit (+4 solar), shifts 2 and 3 are in shadow.
At the **Habitat** choose Hold steady (2 energy, oxygen +1) or Save power (1 energy,
oxygen −1); at **Communications** send the report once (4 energy, oxygen +1). Each
station previews the exact result before you confirm, and closing a preview spends
no shift. Survive all three shifts with the report sent to win. Battery or oxygen
at 0 ends the run, and so does finishing without a report. The debrief names your
plan, what happened and one change to try. Mission 2 has its own active run and
last outcome. Switching views keeps the shift, resources, report and position, and
replaying never touches the Mission 1 journal. It is offered directly from
selection, so judges can try it without finishing Mission 1. In 3D the sunlight
dims during the shadow shifts. The classic page now uses the same calculation.

Run `node tests/mission-flow.cjs` for scan orders, report gating, view handoff,
pose persistence, journal retention, replay, blocked storage, classic win/loss, and
Mission 2's three worked runs, preview/confirm parity, saves and replay. Without a
Node install, VS Code's bundled runtime works:
`ELECTRON_RUN_AS_NODE=1 "<VS Code folder>/Code.exe" tests/mission-flow.cjs`.

The surface is an authored training outpost, not a map of a real landing site.
Scanner readings are simulated; the journal's short explanations link to NASA's
science on lunar polar ice. Pip speaks through text radio, with no audio required.

The intro includes a rotating 3D Moon using NASA/LRO color and elevation maps.
Drag it or use the left/right arrow keys when focused; rotation can be paused.
Reduced motion and a texture-based fallback are supported. The intro reuses the
surface mission's Three.js CDN version. Mission imagery and credits are in
[launch/assets/CREDITS.md](launch/assets/CREDITS.md).

## Credits and AI/SI assistance

Read [Credits & AI use](credits.html) for source imagery, science references,
software notices, and a visible disclosure. [provenance.json](provenance.json)
records the same assistance and asset origins as machine-readable metadata.

Substantial code and game content were generated or revised with ChatGPT/Codex.
Mission 2's code, dialogue, menu wiring, tests and this documentation were written
with Claude Code (Anthropic), following the rules the team set in its release guide.
This includes mission brainstorming and refinement, HTML/CSS/JavaScript,
procedural 3D geometry and animations, UI design, Pip dialogue, educational text,
simulated readings, documentation, and tests. The team supplied the goal of
inspiring children through space exploration and chose the expedition direction.
This record does not claim independent human scientific review or organizer approval.

NASA-source images and maps are credited separately from AI-assisted code and
authored content. No image-generation model or generated audio was used for the
six bundled NASA-source JPEGs during this development work. The existing diamond
favicon's creator and generation history remain unverified. The project MIT
license does not relicense third-party media or software.

For later generated images/videos, add a visible AI/SI-generation watermark and
record the tool and method. Generated audio needs a disclosure in descriptive
text and metadata. Keep NASA logos, flags, and mission identifiers out of
generated artwork. Before submission, clarify the idea-origin clause and the
treatment of code-rendered captures with organizers; adding credits does not
establish eligibility. Guidance: https://github.com/nasa/spaceapps/discussions/1849

## Tutorial status and later work

The previous 3D tutorial page has been repurposed as the guided Mission 1
expedition. Its descent, movement, camera controls, on-screen movement pad, and
interaction controls remain, alongside Pip's welcome and hints. The original
2D survival tutorial remains at [classic-mission.html](classic-mission.html).

A dedicated optional controls tutorial is a requested future addition, to be
planned with the team when game work resumes. It is not implemented as a
separate walkthrough yet. This credits pass does not change gameplay.
