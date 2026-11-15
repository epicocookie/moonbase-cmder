# Mission 3 — Into the Lava Tube

Select the mission from the main menu. The 3D cave uses the shared outpost,
Pip, astronaut, scanner, portable display, movement controls, and optional flag.
Active progress and position are stored per tab. The last completed report is
saved locally in the browser. Replay starts a fresh expedition and keeps the
previous report until another expedition completes.

## Playthrough

1. Visit the entrance scanner at `(8, 1.5)`. Confirm the seismic test. It collects
   the single +4 sunlight charge at the surface and spends 1 energy, leaving 8/9.
2. Follow the lit ramp into the tunnel. The instruments are at `(8, 8.8)`,
   `(8, 11.8)`, and `(8, 14.8)`. Either cave scan order works.
3. Confirm each structural scan and wait for its three-second progress bar.
   Cave scans cost 2 energy each. The second and third scans also cost 1 oxygen.
   Canceling a scan costs nothing; inspecting a saved reading costs nothing.
4. Return along the ramp to Communications at `(0, -4)` or the field display
   beside it. Review the findings and confirm the report, spending 1 energy.

A completed run ends with 1/9 energy and 1/3 oxygen after four shifts. Walking,
jumping, looking, hints, and reviewing do not advance shifts. Solar energy is
collected once at the surface entrance. The cave has no solar generation.

Use WASD, Shift lock, Q/Esc release, V for POV, and Space for a lunar hop.
Touch controls include movement arrows and Jump. Jump height and camera motion
are constrained by the cave roof. Return to Pip brings you to the surface while
preserving your findings.

## Science and training simplifications

The cave geometry, scanner readings, and suit-resource units are authored training
content. The report identifies a possible shelter candidate that needs additional
investigation. This scene combines ideas from different studies, rather than
claiming to reproduce a surveyed landing site.

- [NASA seismic work on locating underground shelter](https://science.nasa.gov/blogs/science-news/2025/09/26/hammering-out-shelter-on-moon-and-mars/) informs the entrance test.
- [NASA lunar volcanism overview](https://science.nasa.gov/moon/lunar-volcanism/) provides the lava-tube context.
- [NASA LRO pit-temperature research](https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/) found sheltered areas around 17 °C in a studied pit using observations and modeling. Our thermal reading is simulated.
- [NASA LRO radar findings](https://science.nasa.gov/solar-system/moon/new-evidence-adds-to-findings-hinting-at-network-of-caves-on-moon/) provide context for evidence of a conduit extending from a pit.

## Checks

Run `node tests/mission3-flow.cjs` for rules, costs, saves, and replay.
With Playwright available and the local server running on port 8127, run
`node tests/mission3.browser.cjs` for the full traversable route, scan cancellation,
resume, cave roof collision, reporting, and replay. `PLAYWRIGHT_MODULE` can point
to an existing Playwright installation.
