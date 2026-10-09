# Coverage clock and cities

The Ukraine today page shows how many catalogued objects are above the elevation mask, how many unioned minutes that produces today, the longest window, and the next window. The location picker moves that clock to a preset city, including Lviv and Vinnytsia. A city strip repeats today's minutes for Kyiv, Kharkiv, Odesa, and Lviv without following the picker.

## Sub-features

- `clock-tiles` shows Now, Today, Longest window today, and Next window for the default point.
- `clock-place-lviv` moves the clock to Lviv from the location picker.
- `clock-place-vinnytsia` moves the clock to Vinnytsia, which is not a strip chip.
- `clock-strip` lists Kyiv, Kharkiv, Odesa, and Lviv minutes and stays on those four cities.
- `clock-passes` lists per-object passes for the next 36 hours under the clock.

## How to get to it (user POV)

- Open the site root. The default point is Kyiv, minimum elevation 25°, population Raised.
- Choose `Ukraine today` in the Primary navigation.
- Choose a city in the `Location` selector. Lviv and Vinnytsia are options. Vinnytsia is not on the strip.
- Read the strip labelled `Same mask and population, other cities`.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin and a catalog source of `live` or `seed`.
- The browser profile is still in English.
- No held clock: the URL has no `at` and the button `Live / now` is pressed.

- **Open the clock.** Open the Ukraine page. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. The heading reads `Rassvet over Ukraine`, the sentence contains `over Kyiv`, and the URL path is `/` with no `place` and no `at`.
- **Tiles.** Confirm the four tiles. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Now"`, then the same command with `--text "Today"` and `--text "Longest window today"`. The fourth tile reads `Window open` while a pass is in progress and `Next window` otherwise. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --any "Next window" --any "Window open"`. Each exits 0. Today shows a minute count, not an em dash.
- **Lviv.** Choose Lviv. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser select --label "Location" --option "Lviv" --wait-text "over Lviv"`. Then run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "place=lviv"`. The sentence contains `over Lviv`.
- **Strip at Lviv.** Read the strip. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --section "Same mask and population, other cities" --text "Lviv" --absent "Vinnytsia"`. The section text also contains `Kyiv`, `Kharkiv`, and `Odesa`.
- **Vinnytsia.** Choose Vinnytsia. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser select --label "Location" --option "Vinnytsia" --wait-text "over Vinnytsia"`. Then run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "place=vinnytsia"`. The sentence contains `over Vinnytsia`.
- **Strip does not follow.** Read the strip again. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --section "Same mask and population, other cities" --text "Lviv" --absent "Vinnytsia"`. Vinnytsia is in the sentence and in the location control, and absent from the strip.
- **Passes.** Confirm the pass list. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role heading --name "Next 36 hours"`. The heading is visible while the clock is live.
- **Proof.** Capture the Vinnytsia result. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/coverage-clock/vinnytsia.png --full-page --feature coverage-clock` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/coverage-clock/vinnytsia.aria.txt --feature coverage-clock`. Both show `Rassvet over Ukraine` and `Vinnytsia`. The snapshot file's first line is the `place=vinnytsia` URL.

## Gotchas

- The city strip is Kyiv, Kharkiv, Odesa, and Lviv. Vinnytsia is a location-picker preset only. A screenshot of the sentence is not strip proof.
- The strip does not follow the location picker. Changing the picker must not add or remove strip cities.
- Kyiv is the default and is omitted from the query. Assert `place=lviv` or `place=vinnytsia` after a change, not after the first load.
- Today minutes are a union. They will not equal the sum of the pass-list durations.
- The pass-list heading switches to `36 hours from this clock` while the clock is held. This recipe is the live clock.
- Wait for `over Lviv` or `over Vinnytsia`. The location control shows the city name before the sentence updates.
- Painted tile labels are uppercased in CSS (`NOW`, `TODAY`). Assert the copy strings `Now` and `Today`. `--text` matches that copy, not the painted case.
- The fourth tile is `Window open` during a pass and `Next window` between passes. Require one of them, not a specific one.
- The harness waits until the page has hydrated before it changes a control. A select changed on the server HTML alone does not move the clock.
