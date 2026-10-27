# Home return

Ukraine today keeps place, minimum elevation, population, timezone, and a custom lat/lon when you leave for Constellation or Method and come back with the nav. The return is live: a held clock is not put back on the URL. A typed or shared `/` stays on the defaults, and an explicit query beats whatever was remembered.

## Sub-features

- `home-constellation` restores the home query after a Constellation round trip.
- `home-method` restores the same query after a Method round trip.
- `home-live` drops `at` on the way back.
- `home-explicit` lets `/?place=odesa` win over a remembered Lviv.
- `home-lang` keeps `lang` on the return link with the remembered place.

## How to get to it (user POV)

- Choose a place, elevation, population, or timezone on Ukraine today, open Constellation or Method, then choose `Ukraine today`.
- Open a home URL that includes `at`, leave, and come back the same way. The clock is live.
- Type `/` or open a different `?place=` link. That address is what you see.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin. Record `catalog.source`.
- English profile, then the sequence switches to UK itself.
- One `browser sequence`. The remembered query lives in the tab, and a separate command reloads only the last URL.

- **Round trip.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser sequence --file .cursor/skills/verify-rassvet/sequences/home-return.json`. Lviv at 10°, all catalogued objects, and UTC survive Constellation and Method. The return URL has no `at`. `/?place=odesa` shows Odesa. A later Constellation round trip comes back to Odesa, not Lviv. `/?place=lviv&lang=uk` comes back as Lviv with `lang=uk`. The command exits 0 and `hydrationWarnings` is empty.
- **Proof.** The sequence writes a screenshot and an ARIA snapshot of the restored Lviv page. Both show `Rassvet over Ukraine` and `Lviv`.

## Gotchas

- The product title is not a link home. The return path is the `Ukraine today` nav link.
- Constellation and Method addresses do not grow a `place` or `el` parameter. The home link's href is filled after hydration from the last home query.
- `Date and time` held with `at` stays in history for Back. The nav link omits it.
- A bare `/` does not read the remembered query into the page. It becomes the new remembered query, so the next return is the defaults.
