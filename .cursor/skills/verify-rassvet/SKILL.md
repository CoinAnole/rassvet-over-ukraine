---
name: verify-rassvet
description: "Drive the Rassvet over Ukraine web app (coverage clock, city presets, elevation mask, ±48h scrub, deep links, language, Method, constellation, catalog freshness) in a headless browser. Use when proving a UI change, reproducing a preview bug, or checking a user-facing path before shipping."
---

# Verify Rassvet over Ukraine

Rassvet over Ukraine is an unofficial geometric coverage clock. The primary surface is the web UI (Ukraine today, Constellation, Method). Catalog identity is a separate check, `npm run verify:catalog`, and does not prove the UI. There is no sign-in. The page does not write user data.

The harness is `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs`. Run it from the repo root. It starts its own dev server. Do not drive `http://127.0.0.1:8080` (`npm run dev`) or `http://127.0.0.1:8081` (`npm run preview`). One verification server at a time: a second launch against a taken port exits with an error instead of killing the other process.

Read `features/README.md` before a drive, then follow one feature file.

## Launch

From the repo root:

```bash
.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs launch
```

That runs `node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 4173 --strictPort` in its own process group, with `node_modules/.bin` on `PATH` and `VERIFY_RASSVET=1` in the environment. Override the port with `--port` or `VERIFY_RASSVET_PORT`. Ports 8080 and 8081 are rejected.

To exercise a stale catalog without waiting on CelesTrak, launch with `--gp-fixture`:

```bash
.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs launch --gp-fixture stale-in-set
.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs launch --gp-fixture stale-outside-set
```

`stale-in-set` makes RASSVET-3 1 and RASSVET-3 2 older than 72 hours (raised production, so the default set shows `Stale GP`). RASSVET-3 3 is 71 hours old and must stay off the list. `stale-outside-set` makes Rassvet-1 No. 1 and Rassvet-2 No. 1 older than 72 hours and leaves raised production inside the gate, so the default set shows `Older GP`. Rassvet-1 No. 2 is the 71-hour control. Every other element set is 6 hours old. Mean motion is copied from `src/data/catalog-seed.json`, so raised / climbing / not climbing do not move. Switching fixtures needs `cleanup` first; a second launch refuses a live server whose fixture does not match. The dev server caches the catalog for ten minutes, which is why a new process is required.

Ready means `GET http://127.0.0.1:4173/` returns HTTP 200 and the HTML includes `Rassvet over Ukraine`. The first request waits on Vite compile and on the catalog loader (live CelesTrak queries, 8s timeout each, else the checked-in snapshot). Launch waits up to 180s, then prints JSON `{ ok, pid, port, url, log }` on stdout. The log is `.cursor/skills/verify-rassvet/.run/vite.log`.

A launch that finds the pid it already recorded, still marked with `VERIFY_RASSVET=1`, and already answering on that port prints `alreadyRunning: true` and leaves it up.

Teardown is `cleanup` below. Do not start this server with `npm run dev`; that binds port 8080.

## Doctor

```bash
.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs doctor
```

Run this first whenever the page looks wrong. Exit 0 JSON means the recorded pid is alive, its command line is the `vite dev --port <port>` process this harness spawned, `GET /` is HTTP 200 and contains `Rassvet over Ukraine`, and `GET /api/catalog` is JSON with `source` of `live` or `seed`.

`catalog` in that JSON is the read to trust:

- `source`: `live` (a GP response was parsed) or `seed` (live fetch failed; `src/data/catalog-seed.json` is in use).
- `fetchedAt`: element-set fetch time. The seed snapshot is dated `2026-09-20T12:32:36Z`.
- `objectCount`, `staleOnOrbit` (raised, climbing, and not climbing), `warning`.
- Top-level `gpFixture`: `stale-in-set`, `stale-outside-set`, or null. A fixture launch still reports `source: live`, because the app parsed GP JSON. Say so in the proof notes. It is not a CelesTrak round trip.

Do not add a test-only catalog endpoint. Do not block CelesTrak to force the seed path. If `source` is `seed`, keep driving; the seed banner is the real fallback, and the proof notes must say so. `npm run verify:catalog` queries CelesTrak for NORAD identity and is not a substitute for this doctor.

## GP fixture

`loadCatalog` fetches `https://celestrak.org/NORAD/elements/gp.php` from the Vite process. Playwright's `page.route` never sees that request. With `--gp-fixture`, the harness does both of these, and neither changes app code:

- Registers a Playwright route on `**/*celestrak.org/**` for the browser context, fulfilling it with the fixture, so a page request cannot reach CelesTrak during the drive.
- Starts the dev server with `node --import .cursor/skills/verify-rassvet/scripts/gp-fetch-hook.mjs`. That hook is what `loadCatalog` hits. The body is `.run/gp-fixture.json`, built by `gp-fixture.mjs` from the checked-in snapshot with epochs shifted. The plan is `.run/gp-fixture-plan.json`.

A fixture run is opt-in. A plain `launch` still calls CelesTrak and falls back to the snapshot if that fails.

A `--gp-fixture` launch also writes `.run/altitude-history.json` and the same hook serves it for any `altitude-history.json` request. The body is a 48-hour line for RASSVET-3 11 (NORAD 68370) at +2.6 km/day, so Constellation can show that rate. It is not the `data` branch and not a CelesTrak history. A plain launch still requests the raw `data` branch URL and shows no rates when that file is missing.

## Drive

Browser commands reopen the last URL in a persistent profile at `.cursor/skills/verify-rassvet/.run/browser-profile` (`locale=en-US`, viewport 1280×900). A fresh profile has no `rassvet-lang` entry, so the UI starts in English. State that matters (place, elevation, population, timezone, held clock) lives in the query string. An explicit UK or RU pick on Ukraine today is written there too. Choosing a language also writes `localStorage` key `rassvet-lang`. Method and Constellation have no `lang` query. A client-side navigation and a later full load both show that stored language. Ukraine today does too when the address has no `lang`. Hide decayed and Launch group are page state only. They are not in the URL and not in `localStorage`. Every browser command except the steps inside one `browser sequence` loads the last URL in a new document, so those two controls reset.

Every browser command waits until React has hydrated before it clicks, selects, or asserts. Changing a control on the server HTML alone does not update the clock. Wait for text or for the URL after that. Do not sleep a fixed time and declare success. Vite's dev socket never goes idle.

`--text` matches the copy in the document (`Now`, `Not live`), not the CSS-uppercased paint (`NOW`). Repeat `--any` when a label has two live wordings.

A hydration mismatch in the console fails the command. Screenshots leave the text caret as the page drew it. Playwright's default screenshot hides the caret by writing `caret-color: transparent` onto every input, and that write can land while React is still hydrating the clock range and the date-time field. This harness does not do that.

Stable handles, English UI:

| User control | Handle |
| --- | --- |
| Product title | heading `Rassvet over Ukraine` |
| Language | button `EN`, `UK`, or `RU` (`aria-pressed`) |
| Primary nav | navigation `Primary`; links `Ukraine today`, `Constellation`, `Method` |
| Catalog freshness | status whose text starts with `Not live`, `Stale GP`, or `Older GP` |
| Location | label `Location` (options include `Lviv`, `Vinnytsia`, `Custom lat/lon`) |
| Min elevation | label `Min elevation` (options `10°`, `25°`, `40°`) |
| Population | label `Population` |
| Timezone | label `Timezone` |
| Custom coordinates | labels `Latitude`, `Longitude`; button `Apply` (only after Custom lat/lon) |
| Copy link | button `Copy link` (becomes `Copied`) |
| Clock slider | slider `Offset from real now` (`aria-valuemin` −48, `aria-valuemax` 48) |
| Return to live | button `Live / now` (`aria-pressed` while live) |
| Held-clock banner | status text `Not live` |
| Clamp banner | status text `Outside ±48 hours` |
| Pass windows | button `[data-scrub-band]` with `data-aos` and an accessible name starting `Geometric line-of-sight` |
| Date and time | label `Date and time` (`datetime-local`) |
| City strip | section containing `Same mask and population, other cities` |
| Pass list | heading `Next 36 hours` or, while held, `36 hours from this clock` |
| Method title | heading `Method` |
| Constellation filters | checkbox name `Hide decayed`; label `Launch group` |

Every command prints one JSON object. `ok: false` or a non-zero exit means that step failed. `pageErrors` and `hydrationWarnings` fail the command. Other `consoleErrors` are reported and do not, by themselves, fail it (a blocked font request is not a broken clock).

```bash
H=.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs
$H browser open /
$H browser select --label "Location" --option "Lviv" --wait-text "over Lviv"
$H browser expect --url-includes "place=lviv"
$H browser click --role link --name "Method"
$H browser range --name "Offset from real now" --value 6 --wait-text "Not live"
$H browser click --selector "[data-scrub-band]" --wait-text "Not live"
$H browser count --selector "[data-scrub-band]"
```

`browser range` sets the slider, then presses Enter on it so the page commits `at` into the URL. Filling the slider without that keyup only moves the preview.

## Evidence

Write proof under `.cursor/skills/verify-rassvet/evidence/<feature-id>/`. Cleanup never deletes that directory.

A proof exercises the real user path: the controls and routes above, not a React setter and not a test-only endpoint. Capture the action and the resulting state. For a URL-backed control, that is the command JSON (it includes `url`) plus a following `browser expect`. For a mutation of what is on screen, add an ARIA snapshot and a screenshot that still shows the heading `Rassvet over Ukraine`:

```bash
$H browser screenshot --path .cursor/skills/verify-rassvet/evidence/<feature-id>/state.png --full-page --feature <feature-id>
$H browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/<feature-id>/state.aria.txt --feature <feature-id>
```

`--feature` writes a sidecar `<file>.json` with the feature id, the URL, and the capture time.

This app has no accounts and no database rows. The side effect to verify is the address bar (and, on Method or Constellation, the language that remains after a second navigation in the same profile). Clipboard copy is not proof: headless Chromium often rejects `navigator.clipboard`, and `navigator.share` is absent, so the Share button is not rendered.

CelesTrak is the only external system. The production loader already falls back to `src/data/catalog-seed.json` and labels `source: "seed"`. Trust doctor, not a mock. Record `catalog.source` in the proof notes. When the safe observation is "the banner matches the source doctor reported", say which branch was actually on screen. Do not report the other branch as verified.

Save the command stdout next to the screenshots (`commands.log` is fine). A step that cannot be reached is a failure note with the command and the unmet precondition, not a pass by a different route.

## Cleanup

```bash
.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs cleanup
```

Cleanup reads `.cursor/skills/verify-rassvet/.run/pid` and signals that process group only when the pid is alive, its command line is this harness's `vite dev --port <port>`, and its environment contains `VERIFY_RASSVET=1`. It then deletes `.run/` (pid, log, last URL, browser profile). It does not delete `evidence/`. If the pid is alive but does not match, cleanup exits non-zero and kills nothing. If a browser command still holds `.run/browser.lock`, cleanup exits non-zero and leaves the server up.

After cleanup, the evidence files must still be at the paths written during Drive. A cleanup that removes them is a failed proof.

Run cleanup after a failed launch too, so a wedged pid and port are not left behind. Then launch again.

## Helpers

The helper is executable. From the repo root:

```bash
.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs --help
```

| Command | What it does |
| --- | --- |
| `launch [--port N] [--gp-fixture stale-in-set\|stale-outside-set]` | Start the isolated dev server. Prints pid, port, url, log, and `gpFixture`. |
| `doctor` | Read-only health check. Prints the catalog source. |
| `cleanup` | Stop the server this harness started and delete `.run/` only. |
| `browser open <path>` | Open `path` on the verification origin (`/` or `/?place=lviv`). |
| `browser sequence --file <steps.json>` | Run several browser actions in one page. Each separate `browser` command opens a fresh page, so disclosure state does not survive between them. |
| `browser click --role <role> --name <name>` | Click an accessible control. `--nth` is optional. |
| `browser click --selector <css>` | Click a stable node. `[data-scrub-band]` is `pointer-events: none` under the range, so this click aims at the band's center and the range holds acquisition. |
| `browser select --label <label> --option <text>` | Choose a native `<select>` option by its visible label. |
| `browser fill --label <label> --value <value>` | Fill a labelled input, including `Date and time`. |
| `browser focus --role <role> --name <name>` | Focus a control before `press`. `--selector` works too. `press` in a later command loads a new document, so the key never reaches this focus. Keep focus and press in one `browser sequence`. |
| `browser press --key <key>` | Send a key to the focused element (`ArrowRight`, `Enter`). |
| `browser range --name <name> --value <number>` | Set `Offset from real now` and commit with Enter. |
| `browser screenshot --path <file> [--full-page] [--feature <id>]` | PNG under `evidence/`. Does not hide the text caret. |
| `browser snapshot --aria --path <file> [--feature <id>]` | ARIA snapshot, first line is the URL. |
| `browser url` | Print the current URL. |
| `browser text` | Print `body` inner text. |
| `browser section --contains <text>` | Print the nearest section that contains that text. |
| `browser count --selector <css>` | Count matching nodes. |
| `browser expect --text <t> [--any <t> ...] [--absent <t>] [--url-includes <t>] [--section <t>] [--selector <css>] [--attr <name=value>] [--role <r> --name <n>]` | Assert, exit 1 on failure. Repeated `--any` passes when one string is present. With `--section` or `--selector`, `--text` and `--absent` apply to that region only. `--attr` reads an attribute of `--selector` (`aria-expanded=true`). |

`--wait-text` on `click`, `select`, `fill`, and `range` waits until that string is visible before the command returns. Relative `--path` values resolve from the current working directory and must land under `evidence/`, `/opt/cursor/artifacts`, or `/tmp`.
