# Rassvet over Ukraine

Unofficial geometric coverage clock for catalogued Rassvet objects. Read `README.md` for the product and `docs/new-launch-group.md` before changing the catalog.

This repository is developed in Cursor and deployed by the Vercel project `lizard-logic/rassvet-over-ukraine` from GitHub `main`. The live site is https://rassvet-over-ukraine.vercel.app. https://rassvet-over-ukraine.grok.me/ is an unsynced Grok Build archive, not this deploy.

## Do not restore the Grok Build sandbox

The first commit is an export from Grok Build on grok.com. That environment does not apply here. Do not add back:

- `.grok/` skills, `app-env.json`, or a preview/hibernate contract
- `startup.sh`, or any rule that the app must be served for a Grok live preview
- Better Auth, Neon, PGLite, `src/lib/auth`, `src/lib/db`, or `migrations/`
- Grok viewer connectors (`src/lib/app-data`) or the multiplayer relay
- The preview host bridge, `public/__grok`, or the extensions.js “Created with Grok” banner
- App-builder smoke, brand-check, auth-invariant, or migration scripts

There is no sign-in and no database. A high score or a preference in `localStorage` is not a reason to add either.

## Where the app lives

- UI: `src/routes`, `src/components`
- Copy: `src/config/i18n/{en,uk,ru}.json` and Method text in `src/lib/i18n/method.ts`
- Catalog rules: `src/config/objects.json` (raised gate, decayed, stale hours)
- Propagation and coverage: `src/lib/orbit`, `src/lib/catalog`
- Seed snapshot: `src/data/catalog-seed.json`, used when a CelesTrak fetch fails
- Altitude history, reentries, and the GP snapshot live in a public Vercel Blob store at `data/altitude-history.json`, `data/reentries.json`, and `data/gp-latest.json`. The app reads Blob first, then the raw GitHub `data` branch, then `src/data/catalog-seed.json` for element sets. Do not commit the history file to `main`. The GitHub Action still writes the `data` branch and must not receive `BLOB_READ_WRITE_TOKEN`
- Record into Blob, with only that token in the environment: `npm run record:altitudes` (`node scripts/record-altitude-history.mjs --blob`). Run `npm run seed:blob` once before the first record, to copy the current `data` branch files into those pathnames. `gp-latest.json` is written only when every GP query succeeds. A failed CelesTrak fetch exits 1
- Share card: `public/og.jpg`. The document head in `src/routes/__root.tsx` points `og:image` at `https://rassvet-over-ukraine.vercel.app/og.jpg` so a scraper does not request the image from a protected deployment host
- UI harness: `.cursor/skills/verify-rassvet`
- Cloud agent setup: `.cursor/environment.json` and `.cursor/setup-cloud-agent.sh`

Do not hardcode on-orbit counts in the UI. Counts come from the catalog plus the rules in `objects.json`.

## Commands

- `npm run dev` — Vite on `0.0.0.0:8080`
- `npm run build` — production build. Vite uses the Nitro Vercel preset
- `npm run preview` — serves that build on `127.0.0.1:8081`
- `npm run typecheck`
- `npm test`
- `npm run verify:catalog` — checks NORAD identity against CelesTrak. Needs the network

The verify-rassvet harness starts its own server on port 4173. It refuses 8080 and 8081 so it does not attach to `npm run dev` or `npm run preview`. Use that skill to prove a UI change.

## Cloud agents

`install` and `start` in `.cursor/environment.json` run `.cursor/setup-cloud-agent.sh`. That copies `.cursor/pstack/pstack-models.mdc` into the home rules directory pstack reads. The committed copy stays out of `.cursor/rules/` so a local Cursor window does not apply it twice. Details are in the README section “Cloud agents”.
