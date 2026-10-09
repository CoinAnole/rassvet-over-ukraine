# Catalog freshness

The header tells the reader whether the element sets are a live CelesTrak fetch, a checked-in snapshot after a failed fetch, or a live fetch that still contains element sets older than 72 hours. Positions are still shown in the seed and stale cases. The banner has to match the catalog source doctor just reported.

## Sub-features

- `fresh-live` shows `CelesTrak GP` and no `Not live` or `Stale GP` kicker when the catalog is live and nothing on orbit is stale.
- `fresh-seed` shows `Not live` and `checked-in snapshot` when doctor reports `source: seed`.
- `fresh-stale` shows `Stale GP` when doctor reports `source: live` and `staleOnOrbit` greater than 0.
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
- **Live stale branch.** Only when `source` is `live` and `staleOnOrbit` is greater than 0. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Stale GP"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "CelesTrak GP"`. The Today tile contains `Includes TLEs older than 72 h`. The `Not live` seed kicker is absent.
- **Live current branch.** Only when `source` is `live` and `staleOnOrbit` is 0. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "CelesTrak GP"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --absent "Not live"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --absent "Stale GP"`.
- **Proof.** Capture the branch that was actually showing. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/catalog-freshness/banner.png --full-page --feature catalog-freshness` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/catalog-freshness/banner.aria.txt --feature catalog-freshness`. Write doctor's `source` into the run notes next to those files.

## Gotchas

- Do not block the network and do not add a seed-only endpoint. The loader already falls back, and doctor reports which path served this process.
- Seed and stale are different banners. A seed snapshot older than 72 hours still uses the `Not live` kicker, not `Stale GP`.
- `Not live` is also the held-clock label. On a seed run, assert `checked-in snapshot` as well so a held clock is not mistaken for the catalog banner.
- A live catalog can still warn about missing NORAD ids in the header (`Warning:`). That warning is not the stale banner.
- Per-object `stale TLE` in the pass list is a row mark. The page banner is the catalog-level proof.
