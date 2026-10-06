# Rassvet over Ukraine

Unofficial geometric coverage clock for catalogued Rassvet / «Рассвет» objects over a point in Ukraine. Not affiliated with Bureau 1440 or any government.

## Live site

[https://rassvet-over-ukraine.vercel.app](https://rassvet-over-ukraine.vercel.app) is the current live deploy. Vercel project `lizard-logic/rassvet-over-ukraine` builds production from GitHub [`main`](https://github.com/CoinAnole/rassvet-over-ukraine).

[https://rassvet-over-ukraine.grok.me/](https://rassvet-over-ukraine.grok.me/) is an unsynced archive only: a one-shot Grok Build publish that cannot sync with this GitHub repo. It is not the self-managed live deploy.

## What it computes

At a ground point P and minimum elevation E, how many minutes of geometric line-of-sight the current public catalog produces today, when the next window is, and which objects are still climbing versus near operational altitude (raised ≥ 480 km).

Visible is never presented as linked, encrypted, military-ready, or 24-hour service.

## Adding a launch group

Follow [docs/new-launch-group.md](docs/new-launch-group.md). Edit `src/config/objects.json`, then run `npm run verify:catalog`. The live Vercel site rebuilds from `main`.

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
- User-Agent: `RassvetOverUkraine/0.1 (unofficial geometric coverage tracker)`.

## Pass list vs Today tile

Per-object passes in the table. Today minutes and city chips union overlapping intervals so overlapping satellites do not double-count.

## Local notes for operators

Language files: `src/config/i18n/{en,uk,ru}.json` plus Method copy in `src/lib/i18n/method.ts`. Review the homepage sentence with a human before quoting the numbers in print.
