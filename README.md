# Rassvet over Ukraine

Unofficial geometric coverage clock for catalogued Rassvet / «Рассвет» objects over a point in Ukraine. Not affiliated with Bureau 1440 or any government.

## Live site

[https://rassvet-over-ukraine.vercel.app](https://rassvet-over-ukraine.vercel.app) is the current live deploy. Vercel project `lizard-logic/rassvet-over-ukraine` builds production from GitHub [`main`](https://github.com/CoinAnole/rassvet-over-ukraine).

[https://rassvet-over-ukraine.grok.me/](https://rassvet-over-ukraine.grok.me/) is an unsynced archive only: a one-shot Grok Build publish that cannot sync with this GitHub repo. It is not the self-managed live deploy. The Grok Build sandbox that produced the first commit (`.grok` skills, platform auth, and the Created with Grok banner) is not part of this repository. Agent notes are in `AGENTS.md`.

## What it computes

At a ground point P and minimum elevation E, how many minutes of geometric line-of-sight the current public catalog produces today, when the next window is, and which objects are still climbing versus near operational altitude (raised ≥ 450 km).

The default set is production RASSVET-3 at or above 450 km. Experimental Rassvet-1 and Rassvet-2 are separate choices. Below 450 km, a recent altitude history steeper than 0.8 km/day is climbing. A flat or falling rate is not climbing. When that rate is unknown, the status is rate pending and is not counted as climbing.

Visible is never presented as linked, encrypted, military-ready, or 24-hour service.

## Adding a launch group

Follow [docs/new-launch-group.md](docs/new-launch-group.md). Edit `src/config/objects.json`, then run `npm run verify:catalog`. The live Vercel site rebuilds from `main`.

Do not hardcode on-orbit counts in the UI. Counts are derived from the catalog plus status rules.

## Config constants

| Key | Meaning |
| --- | --- |
| `raisedAltitudeKm` | 450 — Raised population gate. |
| `reentriesUrl` | GitHub fallback for SATCAT decay records. Blob `data/reentries.json` is read first. RASSVET-3 4 (`68363`) decayed 2026-06-06. |
| `staleHours` | 72 — mark and still propagate |
| `stepSeconds` | 30 — elevation sampling |
| `minPassSeconds` | 60 — ignore shorter passes |
| `earthRadiusKm` | 6371 — spherical small-circle for the map footprint rings and the pass pre-filter. Elevation uses satellite.js look angles with a WGS-84 observer. Altitude is the Brouwer mean semi-major axis from satellite.js SGP4 init minus the WGS-72 equatorial radius 6378.135 km (μ = 398600.8 km³/s²). |
| `muKm3s2` | 398600.4418 — not used for altitude. |

## Data

- Source: CelesTrak public GP JSON.
- If that fetch fails: public Blob `data/gp-latest.json`, then the GitHub `data` branch URL, then `src/data/catalog-seed.json` (snapshot dated in-file).
- User-Agent: `RassvetOverUkraine/0.1 (unofficial geometric coverage tracker)`.

## Altitude history

`npm run record:altitudes` is the Blob writer (`node scripts/record-altitude-history.mjs --blob`). It needs `BLOB_READ_WRITE_TOKEN` and no other environment variable. It reads the prior history and reentries from the public Blob pathnames, merges, and writes them back. `data/gp-latest.json` is written only when every GP query succeeded. A CelesTrak fetch that still fails after retries exits 1 and does not update the files. A feed with no new epochs exits 0. Objects named RASSVET that are not in `objects.json` are a warning, and the count is printed as `unlisted_rassvet`. Run `npm run seed:blob` once before the first record so the log is the current `data` branch, not an empty file.

`.github/workflows/altitude-history.yml` still runs at 05:17 and 17:17 UTC, and when someone starts it by hand. It writes the same three files on the `data` branch and does not use Blob. Each run fetches the Rassvet GP JSON from CelesTrak once, appends `{norad, name, epoch, alt_km}` to `altitude-history.json`, and drops epochs older than 60 days. Those files are not on `main`. The run asks CelesTrak for the RASSVET name query and for each experimental launch query already listed in `celestrak.queries`. Rows are kept only for NORADs in the catalog, under the display name. It asks SATCAT only about a tracked object that is missing from those responses or whose epoch is more than 72 hours behind the newest one. A failed GP fetch retries, then fails the job. A feed with no new epochs succeeds and leaves the file as it was.

The site reads Blob first (`data/altitude-history.json`, `data/reentries.json`, `data/gp-latest.json`), then the raw `data` branch URLs, on the same ten-minute cache. A missing history file, a window that is too short, or a newest epoch more than three days behind the newest epoch in the catalog leaves that rate unknown. Under 450 km the status is then rate pending, which is not counted as climbing, unless the object is reentering: no decay date, that same stale epoch, and a last altitude under 250 km or a decaying rate. `reentries.json` holds SATCAT-confirmed decays and is not pruned.

## Pass list vs Today tile

Per-object passes in the table. Today minutes and city chips union overlapping intervals so overlapping satellites do not double-count.

## Local notes for operators

Language files: `src/config/i18n/{en,uk,ru}.json` plus Method copy in `src/lib/i18n/method.ts`. Review the homepage sentence with a human before quoting the numbers in print.

## Cloud agents

`.cursor/environment.json` points `install` and `start` at pstack setup. `install` runs `bash .cursor/setup-cloud-agent.sh` after checkout, and only during a snapshot build of the default branch. `start` is an inline command Cursor launches on every boot, including before that checkout has created the script. It waits until `.cursor/setup-cloud-agent.sh` and `.cursor/pstack/pstack-models.mdc` are both non-empty (bound `PSTACK_CHECKOUT_WAIT_SECONDS`, default 60), then runs the script. Each attempt appends timestamped lines to `~/.cursor/pstack-setup.log`.

The tracked model map is `.cursor/pstack/pstack-models.mdc`. It stays out of `.cursor/rules/` so a local Cursor window does not apply the committed copy and the home copy together. The script copies it to `~/.cursor/rules/pstack-models.mdc`, which is the always-applied file pstack reads. Budget is large: code roles use `grok-4.7-xhigh-fast`; judgment, prose, and the hardest tasks use `claude-opus-5-5-xhigh`; arena, architect, and interrogate panels list both. If no pstack install is present, the script sparse-clones `https://github.com/cursor/plugins` and copies `pstack/` to `~/.cursor/plugins/local/pstack`.
