# Catalog freshness

The header tells the reader whether the element sets are a live CelesTrak fetch, a checked-in snapshot after a failed fetch, or a live fetch that still contains on-orbit element sets older than 72 hours. Positions are still shown in the seed and stale cases. The banner has to match the catalog source doctor just reported.

A live stale catalog is one collapsed line: how many element sets are older than 72 hours, and whether any of them are in the coverage set this page is judging. On Ukraine today that set is the selected population (default: raised production). On Constellation and Method there is no picker, so the line judges the default raised-production set and says so. The line is a button (`aria-expanded`, `aria-controls="stale-gp-details"`). Expanding it lists each stale object and links to Method `#stale-element-sets`. The open state is not in the URL.

When at least one of those objects is in the judged set, the kicker is `Stale GP` and the border is the decay colour. When none of them are, the kicker is `Older GP` and the border is neutral. A failed fetch stays `Not live` and does not use this disclosure.

## Sub-features

- `fresh-live` shows `CelesTrak GP` and no `Not live`, `Stale GP`, or `Older GP` kicker when the catalog is live and nothing on orbit is stale.
- `fresh-seed` shows `Not live` and `checked-in snapshot` when doctor reports `source: seed`.
- `fresh-stale` shows `Stale GP` or `Older GP` when doctor reports `source: live` and `staleOnOrbit` greater than 0. `Stale GP` means a stale object is in the judged coverage set. `Older GP` means none are.
- `fresh-stale-details` opens the disclosure, lists the objects, and closes again from the keyboard. The URL does not gain a key for the open state.
- `fresh-stale-uk` shows the same note in Ukrainian.
- `fresh-today` repeats the limitation on the Today tile.

## How to get to it (user POV)

- Read the header on any page. It shows the newest element-set epoch, the last successful fetch, and either `CelesTrak GP` or `checked-in snapshot`.
- Read the status line under the navigation when the catalog is a snapshot or has stale element sets.
- Read the note under the Today minutes on Ukraine today.

## Driving it with verify-rassvet

Preconditions:

- Doctor has been run in this same launch. Branch on `catalog.source` and `catalog.staleOnOrbit`. Drive only the branch doctor reported.
- English Ukraine page.

- **Record the branch.** Keep the doctor JSON. The proof is invalid if the screenshot's banner disagrees with `catalog.source`.
- **Seed branch.** Only when `source` is `seed`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Not live"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "checked-in snapshot"`. The snapshot date in the status is the date in `catalog.fetchedAt` (the checked-in file is 2026-09-20). The Today tile contains `Snapshot — live fetch failed`. When `staleOnOrbit` is greater than 0, the status also says the snapshot is older than 72 hours.
- **Live stale branch.** Only when `source` is `live` and `staleOnOrbit` is greater than 0, including a `--gp-fixture` launch. Record `gpFixture` from doctor. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. The status starts with `Stale GP` or `Older GP`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "element set"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "72 hours"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "CelesTrak GP"`. The old sentence `One or more element sets are older than 72 hours` is absent. `Not live` is absent. If the line says `None are in this coverage set`, the Today tile does not say `Includes element sets older than 72 h`. If the line says an element set `is in this coverage set`, the Today tile does say that. For `stale-in-set`, the line is `2 element sets older than 72 hours are in this coverage set` and the open panel names RASSVET-3 1 and RASSVET-3 2, not RASSVET-3 3 (71 hours). For `stale-outside-set`, the kicker is `Older GP` and the open panel names Rassvet-1 No. 1 and Rassvet-2 No. 1, not Rassvet-1 No. 2.
- **Disclosure keyboard.** On the open panel, `browser expect --selector "button[aria-controls=stale-gp-details]" --attr aria-expanded=true`. Focus that button, `browser press --key Enter`, then expect `aria-expanded=false` and the explanation absent. Focus again, `browser press --key Space`, then expect `aria-expanded=true`. The URL gains no key for the open panel. The link `Stale element sets, in Method` opens `/method#stale-element-sets`.
- **Disclosure.** Only on the live stale branch. Capture the collapsed header first. Then run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --selector "button[aria-controls=stale-gp-details]" --wait-text "An element set is the public"`. The panel names each object, a NORAD id, an element-set epoch, an age, and whether it changes the minutes. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "does not turn that drift into a kilometres figure"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser url` and confirm the query has no key for the open panel. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser focus --selector "button[aria-controls=stale-gp-details]"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser press --key Enter`, then `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --absent "An element set is the public"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser press --key Enter` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "An element set is the public"`.
- **Ukrainian.** Only on the live stale branch, after the disclosure is open. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role button --name "UK" --wait-text "набір елементів"`. The URL contains `lang=uk`.
- **Method anchor.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role button --name "EN"`, then `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open "/method#stale-element-sets"`, then `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Stale element sets"`. The open disclosure is not required for this anchor.
- **Live current branch.** Only when `source` is `live` and `staleOnOrbit` is 0. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "CelesTrak GP"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --absent "Not live"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --absent "Stale GP"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --absent "Older GP"`. The disclosure is not on the page. Do not invent a stale object. The Method anchor can still be checked with `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open "/method#stale-element-sets"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Stale element sets"`.
- **Proof.** Capture the branch that was actually showing. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/catalog-freshness/banner.png --full-page --feature catalog-freshness` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/catalog-freshness/banner.aria.txt --feature catalog-freshness`. Write doctor's `source` into the run notes next to those files.

## Gotchas

- Do not block the network and do not add a seed-only endpoint. The loader already falls back, and doctor reports which path served this process.
- Seed and stale are different banners. A seed snapshot older than 72 hours still uses the `Not live` kicker, not `Stale GP` or `Older GP`, and it has no object disclosure.
- `Older GP` is a quiet live note, not a fresh catalog. Do not treat a missing `Stale GP` kicker as a pass while `Older GP` is showing.
- The disclosure button is `button[aria-controls=stale-gp-details]`. Its accessible name includes the count, so do not require an exact name. Reload closes the panel. No query key records it.
- `--gp-fixture` is opt-in. A plain launch still calls CelesTrak. Doctor's `source: live` under a fixture means the app parsed the fixture, not that CelesTrak answered. Write `gpFixture` next to the screenshots. Cleanup before changing fixtures.
- `Not live` is also the held-clock label. On a seed run, assert `checked-in snapshot` as well so a held clock is not mistaken for the catalog banner.
- A live catalog can still warn about missing NORAD ids in the header (`Warning:`). That warning is not the stale banner.
- Per-object `stale TLE` in the pass list is a row mark. The page banner is the catalog-level proof.
