# Rassvet over Ukraine

Unofficial geometric coverage clock for catalogued Rassvet / «Рассвет» objects over a point in Ukraine. Not affiliated with Bureau 1440 or any government.

## What it computes

At a ground point P and minimum elevation E, how many minutes of geometric line-of-sight the current public catalog produces today, when the next window is, and which objects are still climbing versus near operational altitude (raised ≥ 480 km).

Visible is never presented as linked, encrypted, military-ready, or 24-hour service.

## Adding a launch group

1. Edit `src/config/objects.json`.
2. Add a group under `groups` with `id`, `launchDate`, and EN/UK/RU labels.
3. Append each new NORAD ID to `objects` with `name`, `catalogName`, `cospar`, and `group`.
4. If an object has reentered, add its NORAD number to `decayed`.
5. Redeploy. Live CelesTrak GP fetch is by `NAME=RASSVET` plus the listed international designators; unknown new names go to `unassigned` only if you add them to the object list.

Do not hardcode on-orbit counts in the UI. Counts are derived from the catalog plus status rules.

## Config constants

| Key | Meaning |
| --- | --- |
| `raisedAltitudeKm` | 480 — Raised population gate |
| `staleHours` | 72 — mark and still propagate |
| `stepSeconds` | 30 — elevation sampling |
| `minPassSeconds` | 60 — ignore shorter passes |
| `earthRadiusKm` | 6371 — spherical Earth for altitude, elevation, footprints |

## Data

- Source: CelesTrak public GP JSON.
- Fallback: `src/data/catalog-seed.json` (snapshot dated in-file) if the live fetch fails.
- User-Agent: `RassvetOverUkraine/0.1 (unofficial geometric coverage tracker; not affiliated with Bureau 1440)`.

## Pass list vs Today tile

Per-object passes in the table. Today minutes and city chips union overlapping intervals so overlapping satellites do not double-count.

## Local notes for operators

Language files: `src/config/i18n/{en,uk,ru}.json` plus Method copy in `src/lib/i18n/method.ts`. Review the homepage sentence and unofficial badge with a human before quoting the numbers in print.
