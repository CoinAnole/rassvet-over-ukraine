# New launch group

Checklist for adding a Rassvet batch to the curated catalog. Follow it in order. The catalog model does not change: `src/config/objects.json` remains the list of groups, objects, and the CelesTrak GP query URLs. Confirmed reentries live in `reentries.json` on the `data` branch.

Do not hardcode on-orbit counts in the UI. Counts come from this list plus the status rules below.

## Status rules (do not reinvent them)

These match Method copy and `src/lib/catalog/build.ts`.

| Status | Rule |
| --- | --- |
| Raised | In `objects`, not decayed, Brouwer mean altitude `a − 6378.135` ≥ `raisedAltitudeKm` (450). The raised gate wins over the rate. |
| Climbing | In `objects`, has a GP row, perigee ≥ `decayPerigeeKm` (150), altitude under 450 km, and a current rate above 0.8 km/day. |
| Not climbing | In `objects`, has a GP row, perigee ≥ 150 km, altitude under 450 km, and a current rate of 0.8 km/day or less (holding, or a sustained loss). Excluded from the climbing population. Still included in all-catalogued and in its launch group. |
| Rate pending | In `objects`, has a GP row, perigee ≥ 150 km, altitude under 450 km, and no current rate. That covers too few points, a span under 36 hours, no history, a failed history fetch, or a newest epoch more than 72 hours behind the newest epoch in the catalog. Not counted as climbing. Still included in all-catalogued and in its launch group. |
| Decayed | A confirmed reentry in `reentries.json` on the `data` branch (SATCAT `DECAY_DATE` or ops code `D`), or the latest GP perigee is under 150 km. Excluded from coverage. A confirmed reentry drops the element set. |
| Reentering | No decay date, newest epoch more than 72 hours behind the catalog, and last altitude under 250 km or a decaying rate. Not on orbit. No pass predictions. |
| Missing | In `objects`, no GP row, and not on `decayed`. Omitted from Now / Today / footprints. |
| Stale | Newest GP epoch older than `staleHours` (72). Still propagated. |

The default coverage population is raised production (`kind: "production"` and status raised). Experimental groups stay out of that default. `set=raised` and `set=operational` in a shared link still mean every raised object, including experimentals.

Climb rate is a least-squares slope of Brouwer altitude over the most recent three days of epochs, from `altitude-history.json` on the `data` branch. It needs at least three points spanning at least 36 hours. If that window is shorter, the fit reaches back by whole epochs up to five days from the object’s newest epoch. One interior point that misses the track between its neighbors by at least 5 km is dropped. The newest epoch stays. More than 0.8 km/day is climbing. A sustained loss steeper than 0.8 km/day downward is not climbing, and the shown rate is negative. Between those is holding, also not climbing. When the history is missing, the window is too short, or the object’s newest epoch is more than 72 hours behind the newest epoch in the catalog, the rate is unknown and the status under 450 km is rate pending. `npm run verify:catalog` warns on a stale history and on a below-450 object with an unknown rate. It does not fail the run. There is no manual not-climbing list. Do not add `stuck` back. `MEAN_MOTION_DOT` on a single element set is a short-arc fit. Do not add a rate column from that field.

`NAME=RASSVET` does not see experimental objects that CelesTrak still calls `OBJECT <letter>`. Those need their launch `INTDES` query. A rideshare `INTDES` also returns objects that are not Rassvet. Do not add those.

COSPAR piece letters skip I and O. Sixteen pieces run A–R, not A–P.

## 1. Identify the batch

- [ ] Find the international designator (`YYYY-NNN`) and the launch date from a public source you can cite in the PR (CelesTrak GP `OBJECT_ID`, or CelesTrak SATCAT `LAUNCH_DATE`).
- [ ] Fetch GP the same way the site does. The queries live in `objects.json` under `celestrak.queries`:
  - `https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json`
  - `https://celestrak.org/NORAD/elements/gp.php?INTDES=YYYY-NNN&FORMAT=json`
- [ ] Run `npm run verify:catalog`. The **Unexpected RASSVET names** section is the candidate list. A name containing `RASSVET` or `Рассвет` that is not already in `objects` is the new batch.
- [ ] For a batch that is still named `OBJECT <letter>`, decide which letters are Rassvet before editing. The script will not guess. `2023-091` and `2024-092` return the rest of those rideshares on purpose; leave non-Rassvet rows out.
- [ ] Record, per object: `NORAD_CAT_ID`, `OBJECT_ID` (COSPAR), `OBJECT_NAME`, approximate altitude, and perigee. The verify script prints altitude with the same Brouwer `a − 6378.135` the site uses.

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

- [ ] Keep the object in `objects`. Dropping it removes it from the constellation list.
- [ ] Do not add a `decayed` array. The altitude-history Action asks CelesTrak SATCAT for each tracked NORAD and writes confirmed decays (`DECAY_DATE` or ops code `D`) to `reentries.json` on the `data` branch. Those records are not pruned.
- [ ] A perigee under 150 km is already excluded by the runtime.
- [ ] An object that is still in GP, with no decay date, a newest epoch more than 72 hours behind the catalog, and a last altitude under 250 km or a decaying rate, shows as reentering. The clock does not predict passes for it.

### Climb rate

There is no manual list. Status under 450 km comes from `altitude-history.json` on the `data` branch.

- [ ] Read the `npm run verify:catalog` notes. A stale history, or an object under 450 km with an unknown rate, is a warning. The site shows rate pending and does not count it as climbing. The warning is not a failure.
- [ ] Do not add a `stuck` array or a `stuckNote`. The catalog check fails if `stuck` is present.

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
- a curated NORAD missing from every successful query and not in `reentries.json`
- a GP name containing `RASSVET` or `Рассвет` whose NORAD is not curated
- a `decayed` key in `objects.json`

Not failures:

- curated display `name` different from `OBJECT_NAME` (experimental labels)
- other objects on an `INTDES` query (rideshare)
- perigee under 150 km (printed as a note; the runtime already marks it decayed)
- altitude under 450 km with a current rate of 0.8 km/day or less (printed as not climbing)
- altitude under 450 km with a current rate above 0.8 km/day (printed as climbing)
- a stale altitude history, or an object under 450 km with an unknown rate (printed as a warning; the site shows rate pending)

A `stuck` key in `objects.json` is a failure. That list has been removed.

Exit 2 means a query failed and presence was not scored. Do not treat that run as a clean catalog.
