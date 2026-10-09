# Rassvet over Ukraine verification map

This directory is the maintained source for verifying the user-facing behavior of Rassvet over Ukraine. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch the verification server with `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs launch` so it listens at `http://127.0.0.1:4173`.
- Run `doctor` and require `ok: true`, that URL, and a catalog `source` of `live` or `seed`. Record which one.
- Use the browser profile created by this launch (`.cursor/skills/verify-rassvet/.run/browser-profile`). It starts empty, in English (`locale=en-US`).
- Do not drive port 8080 or 8081, and do not drive a server this harness did not start.
- One verification server at a time. A second launch must refuse a taken port.

## Driving conventions

- Start every recipe from `/` in English unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names. Use `[data-scrub-band]` only for the pass-window marks.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser …`.
- Wait for text or for the URL. A fixed sleep is not a pass.
- Restore a live English Ukraine page before the next feature (`browser open /`, then button `EN` if the profile language changed). Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the heading `Rassvet over Ukraine` visible.
- URL-backed proof includes the command JSON `url` and a `browser expect --url-includes` result.
- Record `catalog.source` from doctor with every run. Seed and live are different freshness screens.
- Record the feature id (`--feature`) and the entry point with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-rassvet` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Coverage clock and cities](./coverage-clock.md) covers the Ukraine today tiles, the location picker (including Lviv and Vinnytsia), and the city strip.
- [Elevation mask](./elevation-mask.md) covers the 10° / 25° / 40° minimum-elevation selector.
- [Time scrub](./time-scrub.md) covers the ±48 hour slider, line-of-sight bands, and tap-to-acquisition.
- [Deep link](./deep-link.md) covers a shareable URL, a held `at` instant, and the out-of-range clamp banner.
- [Language](./language.md) covers EN / UK / RU on the Ukraine page and on Method.
- [Method](./method.md) covers the Method page contract.
- [Catalog freshness](./catalog-freshness.md) covers the live, seed, and stale-element banners.
- [Constellation](./constellation.md) covers the constellation counts, decayed filter, and launch-group filter.
