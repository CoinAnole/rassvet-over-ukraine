# Time scrub

The clock slider holds geometric line-of-sight anywhere within 48 hours of real now. Shaded bands on the track are unioned line-of-sight windows. Activating a band holds the clock at that window's acquisition (AOS), not at peak elevation. `Live / now` returns to the ticking clock.

## Sub-features

- `scrub-offset` commits a non-zero slider offset and shows `Not live`.
- `scrub-url` writes an absolute `at` instant when the offset is committed.
- `scrub-bands` exposes one button per visible line-of-sight band.
- `scrub-aos` holds the clock at the band's acquisition.
- `scrub-live` clears the hold from `Live / now`.

## How to get to it (user POV)

- On Ukraine today, use the slider named `Offset from real now`. The ends are labelled −48 h and +48 h.
- Press a shaded band. Its name starts with `Geometric line-of-sight`.
- Choose `Live / now`.
- Type a civil time in `Date and time` (see the deep-link map for the URL form).

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin.
- English Ukraine page, live clock, URL without `at`.
- `browser count --selector "[data-scrub-band]"` is greater than 0. If it is 0, the empty copy `No geometric line-of-sight in this ±48 hour span` is on screen: record that and stop. Do not mark `scrub-aos` verified.

- **Count bands.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser count --selector "[data-scrub-band]"`. A positive count is required before the tap step.
- **Slide.** Set the offset to 6 hours and commit it. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser range --name "Offset from real now" --value 6 --wait-text "Not live"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "at="`. A status contains `Not live`. The button `Live / now` is no longer pressed as the live state.
- **Keyboard nudge.** Focus the slider and press ArrowRight. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser focus --role slider --name "Offset from real now"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser press --key "ArrowRight"`. The URL still contains `at=` and the page still says `Not live`.
- **Tap a band.** Activate the first band. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --selector "[data-scrub-band]" --nth 0 --wait-text "Not live"`. The page still says `Not live`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser url` and keep that URL; `at` is the band acquisition, not the previous +6 h instant.
- **Back to live.** Choose `Live / now`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role button --name "Live / now" --wait-text "Live"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser url`. The query has no `at`.
- **Proof.** Repeat the +6 h range step, then capture. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/time-scrub/held.png --full-page --feature time-scrub` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/time-scrub/held.aria.txt --feature time-scrub`. Both show `Not live` and the heading `Rassvet over Ukraine`.

## Gotchas

- The slider's `input` event moves the preview and does not write `at` until keyup or pointerup. `browser range` fills the control and presses Enter so the commit happens. A bare fill is not a held clock.
- Offset 0 returns to the live tick and removes `at`. Do not assert `Not live` after setting 0.
- A band's accessible name includes the window's start, end, and duration, so it changes with the mask, the city, and the catalog. Select `[data-scrub-band]`, not a baked timestamp.
- Choosing a band holds acquisition (AOS). It does not hold peak elevation.
- Tiles catch up about a fifth of a second after the scrubber. Wait for `Not live` and for `at=` in the URL.
- The slider cannot show the out-of-range clamp banner. That banner is a deep-link behavior.
- The pass list heading becomes `36 hours from this clock` while held.
