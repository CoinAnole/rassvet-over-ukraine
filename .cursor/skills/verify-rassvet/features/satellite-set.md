# Satellite set

The Ukraine page defaults to raised production RASSVET-3. Experimental Rassvet-1 and Rassvet-2 are separate population choices. A link that names `set=raised` or `set=operational` still opens every raised object. Under 450 km, a current rate above 0.8 km/day is climbing, a flat or falling rate is not climbing, and an unknown or stale rate is rate pending. RASSVET-3 11 at or above 450 km is raised.

## Sub-features

- `set-default` opens `/` on Raised production, with no `set` parameter, and shows how many satellites are in that set.
- `set-experimental` selects Experimental, Rassvet-1 and writes `set=exp-2023`.
- `set-legacy-raised` opens `/?set=raised` on Raised, including experimental.
- `set-rate-pending` shows rate pending, not climbing, and raised on Constellation from the live altitude history.

## How to get to it (user POV)

- Open the site root. The population control reads Raised production.
- Choose Experimental, Rassvet-1 in Population.
- Open a link with `set=raised`.
- Choose Constellation and read the table statuses for RASSVET-3 14, 17, 23, 26, and 11.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin and a catalog source of `live` or `seed`. Record which one. Counts below are the live catalog on 2026-10-11. If `source` is `seed`, record the on-screen count and do not treat a mismatch with 26 as a failure of the control.
- English profile.

- **Default set.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role combobox --name "Population"`. The selected option is Raised production. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "26 in this set"` when the catalog source is live. The URL has no `set` parameter. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Experimental Rassvet-1 and Rassvet-2 are separate choices."`.
- **Experimentals.** Choose Experimental, Rassvet-1. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser select --label "Population" --option "Experimental, Rassvet-1" --wait-text "3 in this set"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "set=exp-2023"`.
- **Legacy raised link.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /?set=raised`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Raised, including experimental"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "set=raised"`. When the catalog source is live, the set line reads `32 in this set`.
- **Rate pending.** Open Constellation. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role link --name "Constellation"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Rate pending"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Not climbing"`. Read `/api/catalog` for RASSVET-3 14, 17, 23, 26, and 11. On the 2026-10-24 history, 14, 17, and 23 are rate pending, 26 is not climbing, and 11 is raised when the GP altitude is at least 450 km. A seed catalog can differ. Record `source`.
- **Proof.** Capture the default Ukraine page and the constellation table. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/satellite-set/default.png --full-page --feature satellite-set` after returning to `/`, and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/satellite-set/constellation.png --full-page --feature satellite-set` on Constellation. Both show the heading `Rassvet over Ukraine`.

## Gotchas

- The default omits `set` from the URL. `set=raised` is the previous all-raised choice, not the new default.
- `26` and `32` are live-catalog counts from 2026-10-11. A seed snapshot can differ. Say which source doctor reported.
- Rate pending and not climbing are on the constellation table. The default Ukraine map does not draw those objects, because they are under 450 km. The map legend still names them.
