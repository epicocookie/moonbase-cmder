# Moonbase Commander · Two-day roadmap

A student commands a lunar outpost for three shifts. Can they keep the habitat powered through shadow and still transmit a science report? After replaying, they should be able to point to the decision that changed the outcome.

## First mission

Start with 3 battery units and an unsent report. The forecast is visible from the start: sunlight, shadow, shadow. Each shift the habitat needs 2 units. Sunlight supplies 4 units; shadow supplies 0. Resolve generation first, reserve habitat power second, then apply the command. These are invented teaching units and a compressed timeline.

- **Hold the transmission.** Spend the available reserve on future habitat demand.
- **Send the report.** Spend 2 extra units to transmit once. Disable this command if the report is already sent or the current reserve cannot cover it.
- **Use emergency power-saving mode.** Once per mission, reduce that shift’s habitat demand to 1 by shutting down nonessential equipment. This consumes the shift’s command. Preview the saving before committing.

Evaluate habitat demand after accounting for the selected mode. Exactly enough energy keeps the crew safe for that shift. A shortfall ends the run immediately. After shift three, distinguish crew safe with report sent from crew safe with report pending. Show the first decisive choice in the debrief.

| Paper test | Battery after each shift | Outcome |
| --- | --- | --- |
| Send → hold → hold | 3 → 1 → shortfall of 1 | Crew loses habitat power |
| Send → save power → hold | 3 → 2 → 0 | Crew safe, report sent |
| Hold → hold → hold | 5 → 3 → 1 | Crew safe, report pending |

## Build order and proposed owners

| When | David · game rules | Teammate · player experience | Done when |
| --- | --- | --- | --- |
| First 30 minutes | Trace the three runs together | Sketch forecast, battery, commands and result on one screen | Both can predict the losing turn |
| Day 1, first build block | Implement a pure JS function that takes state and command and returns next state plus a turn log | Build one HTML/CSS screen from the starting state and sample turn log | One click plays a real shift in the browser |
| Day 1, second block | Verify the three runs, illegal commands, zero balance and restart | Display next-shift forecast and explain each energy change in plain language | Both teammates can finish and replay independently |
| Day 2, first block | Check source credits and fix the most confusing rule | Give a fresh player the mission without coaching; ask which decision they would change | Tester can predict the effect of saving one unit |
| Day 2, final block | Test the shared build on a clean browser and verify links | Record one failed turn, replay it, and show what saved the crew | Demo, source credits and event submission fields reviewed together |

Use plain HTML, CSS and JavaScript unless both teammates already ship faster in the same framework. Exchange one example state before coding: shift index 0, battery 3, report pending, emergency mode available, mission active. Bind the UI to the rules function immediately. For Vietnam–US handoffs, leave the last working commit, a replay sequence and the next task in one message.

## Science and submission

NASA describes generation, storage and distribution as linked lunar surface power problems. Credit that connection in the debrief, with a link to the original engineering source. For a visual grounding, show NASA’s polar-shadow image beside the forecast with its published credit. The three-shift forecast is fictional. Record which source informed each asset or mechanic.

- [Official challenge brief](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)
- [NASA lunar surface power](https://www.nasa.gov/lunar-surface-technology/)
- [NASA polar-shadow image and credit](https://science.nasa.gov/resource/shadows-near-the-moons-south-pole/)

At kickoff, verify your team’s registered event, submission cutoff and timezone, required fields and demo format on the event page. Agree on a shared internal deadline an hour earlier. If time slips, keep the tested mission, replay and debrief. Defer new resources, random events, accounts and a second map until after the demo works.
