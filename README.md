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

## Cloud agents

`.cursor/environment.json` points `install` and `start` at pstack setup. `install` runs `bash .cursor/setup-cloud-agent.sh` after checkout, and only during a snapshot build of the default branch. `start` is an inline command Cursor launches on every boot, including before that checkout has created the script. It waits until `.cursor/setup-cloud-agent.sh` and `.cursor/pstack/pstack-models.mdc` are both non-empty (bound `PSTACK_CHECKOUT_WAIT_SECONDS`, default 60), then runs the script. Each attempt appends timestamped lines to `~/.cursor/pstack-setup.log`.

The tracked model map is `.cursor/pstack/pstack-models.mdc`. It stays out of `.cursor/rules/` so a local Cursor window does not apply the committed copy and the home copy together. The script copies it to `~/.cursor/rules/pstack-models.mdc`, which is the always-applied file pstack reads. Budget is large: code roles use `grok-4.7-xhigh-fast`; judgment, prose, and the hardest tasks use `claude-opus-5-5-xhigh`; arena, architect, and interrogate panels list both. If no pstack install is present, the script sparse-clones `https://github.com/cursor/plugins` and copies `pstack/` to `~/.cursor/plugins/local/pstack`.
