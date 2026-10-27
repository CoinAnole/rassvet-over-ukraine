# Keyboard

The skip link moves to the main content. The pass table and the constellation table are each one tab stop: ArrowDown moves to the next row and Enter selects it. The scatter chart is one tab stop with the same keys. The clock range shows a focus ring. Apply on a bad latitude or longitude shows an inline error and focuses Latitude.

## Sub-features

- `key-skip` tabs to `Skip to content` and Enter focuses `#main`.
- `key-pass` reaches the pass table as one row stop, then ArrowDown and Enter set `aria-selected`.
- `key-constellation` does the same on the constellation table.
- `key-chart` uses ArrowDown on the scatter chart to select a satellite.
- `key-range` shows a solid outline on `Offset from real now` after Tab.
- `key-coords` shows the lat/lon error and leaves focus on Latitude.

## How to get to it (user POV)

- Press Tab from the top of Ukraine today. The first stop is `Skip to content`.
- Press Enter on that link. Focus moves to the main content.
- Tab from the pass list's `Status` header. One row is the next stop. ArrowDown, then Enter, highlights that satellite.
- Open Constellation. The page heading is `Constellation`. Tab to the table row or to the chart and use the arrow keys.
- Choose `Custom lat/lon`, type a non-number, and press Apply.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin and an `objectCount` greater than 0. Record `catalog.source`.
- English profile. A stale-GP banner button sits in the header, so it does not change the Tab stops from `Live / now` to the pass row.
- Focus and keys stay inside one `browser sequence`. A separate `browser press` reloads the page and drops the focus.

- **Skip link.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser sequence --file .cursor/skills/verify-rassvet/sequences/keyboard-skip.json`. The first Tab lands on `Skip to content`. Enter puts `#main` in the URL and focuses the main landmark. The command exits 0.
- **Pass rows and range.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser sequence --file .cursor/skills/verify-rassvet/sequences/keyboard-pass.json`. From `Live / now`, two Tabs reach `Offset from real now` and `--focus-ring` passes. Exactly one pass row has `tabindex="0"`. Tab from the `Status` header reaches that row. ArrowDown then Enter leaves it focused with `aria-selected=true`.
- **Constellation rows and chart.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser sequence --file .cursor/skills/verify-rassvet/sequences/keyboard-constellation.json`. The heading `Constellation` is present. Exactly one table row has `tabindex="0"`. Tab from `Element-set epoch` reaches it. ArrowDown and Enter set `aria-selected=true`. ArrowDown on the chart group `Altitude against days since launch. Arrow keys select a satellite.` leaves one selected row.
- **Latitude error.** Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser sequence --file .cursor/skills/verify-rassvet/sequences/keyboard-coords.json`. After Apply, the page shows `Enter a latitude and a longitude as numbers.` and the focused name is `Latitude`.
- **Proof.** The pass sequence and the constellation sequence write a screenshot and an ARIA snapshot. Both show the heading `Rassvet over Ukraine`.

## Gotchas

- `browser focus` does not draw `:focus-visible`. The range ring is checked after Tab, not after a programmatic focus.
- `Date and time` is a `datetime-local` control. Chromium tabs through each segment, so a fixed Tab count from the range does not land on the pass row. Tab from the last column header instead.
- Only one pass row and one constellation row have `tabindex="0"`. The others are `-1`. Do not expect every row to be a Tab stop.
- Map dots are buttons named `Name, NORAD` and are not in the tab order. The table is the keyboard path for the same selection.
- The chart keeps focus on the group. Selection shows up as `aria-selected="true"` on a table row.
- Custom lat/lon is the `Location` option `Custom lat/lon`. The error is an alert, not a toast.
- Hide decayed and the launch group reset when a new document loads. This feature does not change them.
