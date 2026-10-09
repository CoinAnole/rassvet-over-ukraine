# Deep link

Copy link and the address bar share the ground point, the minimum elevation, and a held clock. `at` is an absolute UTC instant. An instant outside ±48 hours of real now clamps the clock to the nearest edge, leaves the original `at` in the URL, and shows the clamp banner.

## Sub-features

- `link-place` keeps a non-default city in the query.
- `link-held` holds the clock at an absolute `at` inside the window.
- `link-clamp` shows `Outside ±48 hours` when `at` is outside the window and keeps that `at` in the URL.
- `link-copy` offers `Copy link` for the current view. The address bar is the proof that the link is right.

## How to get to it (user POV)

- Choose `Copy link` on Ukraine today. The button reads `Copied` when the clipboard accepts the URL.
- Use the platform share sheet when a `Share` button is shown.
- Open a URL with `place`, `el`, and `at` query keys.
- Type a civil time into `Date and time`.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin.
- English UI. Compute an in-window instant in the shell as `AT=$(node -e "console.log(new Date(Date.now()+2*3600e3).toISOString())")`.

- **In window.** Open the held instant. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open "/?at=$AT"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Not live"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "at="`. The clamp banner is absent: `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --absent "Outside ±48 hours"`.
- **Place and mask.** Open Lviv at 10° with the same instant. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open "/?place=lviv&el=10&at=$AT"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "place=lviv"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "At 10° minimum elevation over Lviv"`.
- **Clamp.** Open an instant in 2000. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open "/?at=2000-01-01T00:00:00.000Z"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Outside ±48 hours"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "2000-01-01"`. The page also says `Not live`. The original year stays in the URL.
- **Copy control.** Confirm the button. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role button --name "Copy link"`. Do not treat a clipboard error as a failed link. The URL from the previous expect is the link.
- **Proof.** Capture the clamp banner. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/deep-link/clamped.png --full-page --feature deep-link` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/deep-link/clamped.aria.txt --feature deep-link`. Both show `Outside ±48 hours` and `Rassvet over Ukraine`.

## Gotchas

- `Date and time` has a min and a max of ±48 hours, so typing in that field cannot produce the clamp banner. Open an out-of-range `at` URL to prove the banner.
- The original `at` stays in the URL while the clock sits on the clamped edge. Refreshing that URL shows the banner again.
- `Copy link` calls the clipboard API. Headless Chromium often rejects it. Assert the button and the address bar.
- `Share` is rendered only when `navigator.share` exists. Headless Chromium does not render it. Do not fail the recipe for a missing Share button.
- An `at` equal to real now is live, and the query omits `at`. Use an instant at least a minute away.
- Colon characters in `at` may be percent-encoded. Match a stable substring such as `2000-01-01` or `at=`, not one exact encoding.
