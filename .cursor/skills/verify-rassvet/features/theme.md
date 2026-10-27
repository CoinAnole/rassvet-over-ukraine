# Theme

System, Light, and Dark recolor the whole clock. System is the default and follows `prefers-color-scheme`. Light and Dark are explicit. The choice is a cookie, so the next document paints in that theme. System leaves the theme attribute off and the CSS media query supplies the tokens.

## Sub-features

- `theme-system` leaves `data-theme` unset and switches the page background with the emulated scheme.
- `theme-light` selects Light from the keyboard and shows the light background.
- `theme-dark` selects Dark and shows the dark background.
- `theme-pages` shows Ukraine today, Constellation, and Method in both explicit themes.
- `theme-hydration` fails the command when the console reports a hydration mismatch.

## How to get to it (user POV)

- Tab to the `Theme` radio group in the header, next to EN / UK / RU.
- Press the arrow keys. The checked radio is System, Light, or Dark.
- Reload. An explicit choice stays. System keeps following the operating system.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin. Record `catalog.source`.
- A fresh profile has no `rassvet-theme` cookie, so the control starts on System.
- Keep emulation, focus, and the theme clicks in one `browser sequence`.

- **System, Light, and Dark.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser sequence --file .cursor/skills/verify-rassvet/sequences/theme.json`. System has no `data-theme`. Emulated light makes the page background `rgb(246, 244, 239)`. ArrowRight from System checks Light and sets `data-theme="light"`. Ukraine today, Constellation, and Method stay light across reloads. Dark sets `data-theme="dark"` and the background `rgb(8, 9, 12)` on those three routes. System again clears the attribute, and emulated dark returns the dark background. The command exits 0 and `hydrationWarnings` is empty.
- **Proof.** The sequence writes light and dark screenshots for each of the three routes. Each shows the heading `Rassvet over Ukraine`.

## Gotchas

- System is the absence of `data-theme`, not `data-theme="system"`.
- `--computed` compares `getComputedStyle` with spaces removed, so `rgb(8, 9, 12)` is `rgb(8,9,12)`.
- Both themes draw the map as a flat canvas with country borders and the Ukraine outline. There is no tile server. Attribution is the Leaflet control, and the flag stays hidden.
- `og.jpg` does not change with the theme.
