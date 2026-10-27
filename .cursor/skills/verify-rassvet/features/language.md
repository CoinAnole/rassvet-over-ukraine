# Language

EN, UK, and RU switch the product title, navigation, coverage sentence, and the dates on the clock and pass list. The choice is written into the `lang` query on Ukraine today, Constellation, and Method (`uk` or `ru`; English omits it). `<html lang>` matches that language. The cookie remembers it for a later visit; `localStorage` only seeds the cookie and does not change the current page.

## Sub-features

- `lang-en` shows English copy, `html lang` `en`, and no `lang` query.
- `lang-uk` shows Ukrainian copy, `html lang` `uk`, `lang=uk`, and a pass time containing `жовт`.
- `lang-ru` shows Russian copy, `html lang` `ru`, `lang=ru`, and a pass time containing `окт`.
- `lang-routes` keeps `lang` on Constellation and Method after the switch.
- `lang-hydration` fails the command when the console reports a hydration mismatch.

## How to get to it (user POV)

- Choose the `EN`, `UK`, or `RU` button in the header. The pressed button is the active language.
- Open any of the three routes with `?lang=uk` or `?lang=ru`.
- Follow Primary navigation after a switch. The next route keeps the same `lang`.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin. Record `catalog.source`.
- Fresh English profile, or switch back to `EN` before starting.
- Button names stay `EN`, `UK`, and `RU` in every language.
- One `browser sequence` so the switch and the following navigations share the profile page. A later `browser` command reloads the last URL.

- **English, Ukrainian, routes, and Russian.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser sequence --file .cursor/skills/verify-rassvet/sequences/language.json`. English starts with `html lang` `en`, navigation `Primary`, and no `lang` in the URL. UK sets `html lang` `uk`, `lang=uk`, navigation `Основне`, and a `жовт` date. Constellation and Method keep `lang=uk` and `html lang` `uk`. RU sets `html lang` `ru` and `lang=ru`, and the Ukraine pass list contains `окт`. The command exits 0 and `hydrationWarnings` is empty.
- **Proof.** The sequence writes the Ukrainian Ukraine screenshot and ARIA snapshot. Both show `Рассвет над Україною`.

## Gotchas

- The language button names are always `EN`, `UK`, and `RU`. Do not look for `УК` or `РУ`.
- English omits `lang`. Assert that with `--url-absent lang=`. Assert `lang=uk` and `lang=ru` only after those switches.
- `localStorage` key `rassvet-lang` is not the source of the current page. A stored value is copied into the cookie for the next document.
- The browser profile remembers the cookie. A later feature that expects English must click `EN` or start from a profile cleanup created.
- Navigation after a switch carries `lang` and drops other Ukraine query keys such as `place`.
- Hydration warnings fail the command by themselves. Do not treat a green-looking screenshot as a pass when `hydrationWarnings` is non-empty.
