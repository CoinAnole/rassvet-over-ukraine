# Elevation mask

The minimum-elevation control recomputes the clock, the sentence, the city strip, and the scrub bands at 10°, 25°, or 40°. 25° is the default.

## Sub-features

- `mask-10` selects 10° and puts `el=10` on the URL.
- `mask-40` selects 40° and puts `el=40` on the URL.
- `mask-25` returns to 25° and drops `el` from the URL.
- `mask-sentence` rewrites the coverage sentence with the selected angle.

## How to get to it (user POV)

- On Ukraine today, open the `Min elevation` selector.
- Choose `10°`, `25°`, or `40°`.
- Open a shared URL that already has `el=10` or `el=40`.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin.
- The Ukraine page is in English at `/` with no `el` query.

- **Default.** Open the page. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "At 25° minimum elevation"`. The URL does not contain `el=`.
- **10°.** Choose 10°. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser select --label "Min elevation" --option "10°" --wait-text "At 10° minimum elevation"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "el=10"`.
- **40°.** Choose 40°. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser select --label "Min elevation" --option "40°" --wait-text "At 40° minimum elevation"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "el=40"`.
- **Back to 25°.** Choose 25°. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser select --label "Min elevation" --option "25°" --wait-text "At 25° minimum elevation"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser url`. The URL does not contain `el=`.
- **Deep link.** Open 10° directly. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open "/?el=10"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "At 10° minimum elevation"`.
- **Proof.** Capture 10°. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/elevation-mask/el-10.png --full-page --feature elevation-mask` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/elevation-mask/el-10.aria.txt --feature elevation-mask`. Both show `10°` and the heading `Rassvet over Ukraine`.

## Gotchas

- The degree sign in the option label is `°` (U+00B0). `10` alone does not match the option.
- 25° is the default and is omitted from the query. A URL that still says `el=25` is not this page's canonical form; after the selector settles, `el` is absent.
- Changing the mask also moves scrub bands and city-strip minutes. Prove the sentence and the `el` query, not a remembered minute count.
- The map caption includes the mask. It is not a separate control.
