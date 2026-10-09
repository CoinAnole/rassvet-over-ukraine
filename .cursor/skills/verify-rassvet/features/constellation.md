# Constellation

Constellation counts catalogued objects and plots approximate altitude against days since launch. Decayed objects can be hidden. The launch-group selector limits the chart and the table to one group.

## Sub-features

- `constellation-counts` shows on-orbit, raised, climbing, decayed, and launch-group counts.
- `constellation-hide-decayed` hides decayed rows when the checkbox is checked.
- `constellation-group` filters the chart and the table to one launch group.
- `constellation-table` lists name, NORAD, status, and element-set epoch for the visible rows.

## How to get to it (user POV)

- Choose `Constellation` in the Primary navigation.
- Open `/constellation` directly.
- Uncheck `Hide decayed`, or choose a launch group in `Launch group`.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin and an `objectCount` greater than 0.
- English profile.

- **Open.** Choose Constellation. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role link --name "Constellation"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "/constellation"`.
- **Counts.** Confirm the summary. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Catalogued on orbit"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Raised (≥ 480 km)"`.
- **Decayed filter.** The checkbox starts checked. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role checkbox --name "Hide decayed"`. Click it. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role checkbox --name "Hide decayed"`. Decayed rows may appear in the table; the on-orbit count label stays on screen.
- **Launch group.** Choose Experimental 2023. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser select --label "Launch group" --option "Experimental 2023"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Experimental 2023"`.
- **Direct entry.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /constellation`. The counts return, and `Hide decayed` is checked again because a new document load resets the control. The launch-group choice is not in the URL.
- **Proof.** After the Experimental 2023 selection (before the direct reload), capture the filtered page. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/constellation/group.png --full-page --feature constellation` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/constellation/group.aria.txt --feature constellation`. Both show `Constellation` in the navigation and the heading `Rassvet over Ukraine`.

## Gotchas

- Hide-decayed and the launch group are not written to the URL. Reloading `/constellation` restores the checkbox to checked and the group to `All groups`.
- Language on this page is the profile language, not a `lang` query. See the language map.
- The chart is a plot, not a table. Prove a filter with the table text or the select, not with a pixel in the plot.
- Counts come from the catalog doctor already loaded. Do not assert a hardcoded population.
