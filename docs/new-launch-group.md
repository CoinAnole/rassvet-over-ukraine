# New launch group

Checklist for adding a Rassvet batch to the curated catalog. Follow it in order. The catalog model does not change: `src/config/objects.json` remains the list of groups, objects, the manual `decayed` NORAD list, and the CelesTrak GP query URLs.

Do not hardcode on-orbit counts in the UI. Counts come from this list plus the status rules below.

## Status rules (do not reinvent them)

These match Method copy and `src/lib/catalog/build.ts`.

| Status | Rule |
| --- | --- |
| Raised | In `objects`, not decayed, approximate altitude `a − 6371` ≥ `raisedAltitudeKm` (480). |
| Climbing | In `objects`, has a GP row, perigee ≥ `decayPerigeeKm` (150), altitude under 480 km. |
| Decayed | NORAD is on the `decayed` list, **or** the latest GP perigee is under 150 km. Excluded from coverage. A `decayed` entry also drops the element set, even if GP still has one. |
| Missing | In `objects`, no GP row, and not on `decayed`. Omitted from Now / Today / footprints. |
| Stale | Newest GP epoch older than `staleHours` (72). Still propagated. |

`NAME=RASSVET` does not see experimental objects that CelesTrak still calls `OBJECT <letter>`. Those need their launch `INTDES` query. A rideshare `INTDES` also returns objects that are not Rassvet. Do not add those.

COSPAR piece letters skip I and O. Sixteen pieces run A–R, not A–P.

## 1. Identify the batch

- [ ] Find the international designator (`YYYY-NNN`) and the launch date from a public source you can cite in the PR (CelesTrak GP `OBJECT_ID`, or CelesTrak SATCAT `LAUNCH_DATE`).
- [ ] Fetch GP the same way the site does. The queries live in `objects.json` under `celestrak.queries`:
  - `https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json`
  - `https://celestrak.org/NORAD/elements/gp.php?INTDES=YYYY-NNN&FORMAT=json`
- [ ] Run `npm run verify:catalog`. The **Unexpected RASSVET names** section is the candidate list. A name containing `RASSVET` or `Рассвет` that is not already in `objects` is the new batch.
- [ ] For a batch that is still named `OBJECT <letter>`, decide which letters are Rassvet before editing. The script will not guess. `2023-091` and `2024-092` return the rest of those rideshares on purpose; leave non-Rassvet rows out.
- [ ] Record, per object: `NORAD_CAT_ID`, `OBJECT_ID` (COSPAR), `OBJECT_NAME`, approximate altitude, and perigee. The verify script prints altitude with the same `a − Re` proxy the site uses.

## 2. Edit `src/config/objects.json`

- [ ] Set `updated` to the UTC date you verified (`YYYY-MM-DD`).
- [ ] Add one `groups` entry before `unassigned`:
  - `id`: stable slug, for example `prod-2026-11`. Do not rename old ids.
  - `launchDate`: `YYYY-MM-DD`, or `null` if the date is not known yet.
  - `label`: `en`, `uk`, and `ru`.
- [ ] Append each new object. Copy GP fields; do not invent IDs.
  - `norad`: `NORAD_CAT_ID`
  - `catalogName`: exact `OBJECT_NAME`
  - `cospar`: exact `OBJECT_ID`
  - `name`: GP `OBJECT_NAME` for production objects (`RASSVET-3 17`). Experimental display names may stay a curated label (`Rassvet-1 No. 1`) while `catalogName` stays the GP name (`OBJECT P`). The verify script treats that display difference as a note, not a failure.
  - `group`: the new group id.
- [ ] Add an `INTDES` URL to `celestrak.queries` when `NAME=RASSVET` will not return the batch (unnamed `OBJECT *` pieces). Named `RASSVET-*` objects are already covered by the name query; an `INTDES` URL is still worth adding so a later rename does not drop them. Do not remove the existing queries.
- [ ] Leave `decayPerigeeKm`, `raisedAltitudeKm`, and `staleHours` alone unless the product rule itself is changing.

### Decayed and missing

- [ ] If GP no longer has a curated NORAD, confirm reentry before calling it decayed. CelesTrak SATCAT `https://celestrak.org/satcat/records.php?CATNR=<norad>&FORMAT=JSON` field `DECAY_DATE` (and `OPS_STATUS_CODE` `D`) is the check. The site does not fetch SATCAT at runtime.
- [ ] Add that NORAD to `decayed` and **keep the object in `objects`**. Dropping it from `objects` removes it from the constellation list. Leaving it off `decayed` labels it missing.
- [ ] Do not put a NORAD on `decayed` while GP still publishes it and perigee is at or above 150 km. That override hides a live object. `npm run verify:catalog` fails this case.
- [ ] A perigee under 150 km is already excluded by the runtime. Note it. Add the NORAD to `decayed` once the TLE disappears, so the next gap is decayed rather than missing.
- [ ] Current worked example: `68363` / `2026-061D` / `RASSVET-3 4` is on `decayed`, absent from GP, and SATCAT records decay on 2026-06-06. Leave it there.

## 3. Wire the population filter

A new group id is invisible in the set picker until these closed lists include it. Constellation group labels are read from `objects.json`; the picker is not.

- [ ] `PopulationFilter` in `src/lib/catalog/types.ts`
- [ ] `parseSet` in `src/lib/view-state.ts`
- [ ] `SETS` in `src/components/ukraine-board.tsx`
- [ ] `population.<id>` in `src/config/i18n/en.json`, `uk.json`, and `ru.json` (same wording as the group label)
- [ ] `GROUP_COLORS` in `src/components/constellation-view.tsx` (otherwise the chart falls back to the default scatter color)

`unassigned` stays a holding group. Do not add it to the picker.

## 4. Fallback snapshot

`src/lib/catalog/fetch.server.ts` starts from `src/data/catalog-seed.json` and overwrites any NORAD a live query returns. The payload is labelled `seed` only when none of the curated IDs came back live. A new NORAD that is not in the seed, and whose query failed, shows as missing.

- [ ] Refresh the seed in the same change when you can copy a complete GP array for the curated on-orbit IDs.
- [ ] Set `fetched_at`. Keep `source` as `celestrak-gp-snapshot`.
- [ ] Include only curated NORADs that still have an element set. Omit decayed IDs that GP no longer publishes (`68363` is absent on purpose).
- [ ] Do not commit a seed built from a failed or partial query. If you skip the refresh, say so in the PR. Live fetch still serves the new objects.

## 5. Check

- [ ] `npm run verify:catalog` exits 0. Expect the new IDs under Present, matching COSPAR and `catalogName`, no unexpected `RASSVET` names left, and every `decayed` ID either absent from GP or called out as a failure.
- [ ] `npm run verify:catalog -- --seed` after a seed refresh. Seed mode cannot discover a new launch; it only checks the snapshot.
- [ ] `npm run typecheck`
- [ ] `npm test`

Push to `main` only when those pass. The live site rebuilds from that branch.

## What the verify script scores

`npm run verify:catalog` fetches `celestrak.queries` with the configured User-Agent (30s timeout, one retry).

Failures (exit 1):

- duplicate NORAD or COSPAR, a group id that is not in `groups`, or a `decayed` id that is not in `objects`
- `catalogName` or `cospar` different from the GP row for that NORAD
- a curated NORAD missing from every successful query and not on `decayed`
- a GP name containing `RASSVET` or `Рассвет` whose NORAD is not curated
- a `decayed` NORAD that is still in GP with perigee ≥ 150 km

Not failures:

- curated display `name` different from `OBJECT_NAME` (experimental labels)
- other objects on an `INTDES` query (rideshare)
- perigee under 150 km (printed as a note; the runtime already marks it decayed)
- altitude under 480 km (printed as climbing)

Exit 2 means a query failed and presence was not scored. Do not treat that run as a clean catalog.
