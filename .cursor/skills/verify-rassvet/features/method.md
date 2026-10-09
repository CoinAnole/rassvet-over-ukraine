# Method

Method is the written contract for the numbers on the other screens: where the orbit data comes from, what geometric line-of-sight means, why the elevation masks are 10° / 25° / 40°, and how a stale element set is marked.

## Sub-features

- `method-open` opens Method from Primary navigation.
- `method-contract` shows the lede that this page is the contract.
- `method-masks` shows the section that explains 10° / 25° / 40°.
- `method-stale` shows the section on element sets older than 72 hours.

## How to get to it (user POV)

- Choose `Method` in the Primary navigation.
- Open `/method` directly.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin.
- The profile is in English. If the heading is not `Rassvet over Ukraine`, click button `EN` on Ukraine today first.

- **Nav entry.** From the Ukraine page, choose Method. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role link --name "Method"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "/method"`.
- **Contract.** Confirm the lede. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role heading --name "Method"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "This page is the contract."`.
- **Masks.** Confirm the elevation section. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role heading --name "Why 10° / 25° / 40°"`.
- **Stale rule.** Confirm the stale-element section. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role heading --name "Stale element sets"`.
- **Direct entry.** Open the route. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /method`. The same heading and lede are present.
- **Proof.** Capture the page. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/method/method.png --full-page --feature method` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/method/method.aria.txt --feature method`. Both show the heading `Method` and the product heading `Rassvet over Ukraine`.

## Gotchas

- Method has no place, elevation, or clock controls. Do not expect `at` or `el` on this URL.
- The page is long. Use `--full-page` so the mask and stale headings are in the screenshot, and use the heading expects for the ones below the fold.
- Language on Method comes from the profile, not from `?lang=` on `/method`. See the language map.
- The nav link and the page title are both named `Method`. The page title expect uses `--role heading`.
