import assert from "node:assert/strict";
import test from "node:test";
import {
  commandFailed,
  isHydrationWarning,
} from "../.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs";

const caretMismatch = `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.

<input type="range" className="clock-range" onPointerUp={function onPointerUp}
- style={{caret-color:"transparent"}}
>`;

test("a caret-color hydration mismatch fails the command", () => {
  assert.equal(isHydrationWarning(caretMismatch), true);
  assert.equal(
    commandFailed({
      ok: true,
      consoleErrors: [caretMismatch],
      hydrationWarnings: [caretMismatch],
      pageErrors: [],
    }),
    true,
  );
});

test("an empty style left by caret cleanup is still a hydration warning", () => {
  const text =
    "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. - style={{}}";
  assert.equal(isHydrationWarning(text), true);
});

test("a blocked font console error does not fail the command", () => {
  const text = "Failed to load resource: the server responded with a status of 404 ()";
  assert.equal(isHydrationWarning(text), false);
  assert.equal(
    commandFailed({ ok: true, consoleErrors: [text], hydrationWarnings: [], pageErrors: [] }),
    false,
  );
});

test("a page error still fails the command", () => {
  assert.equal(commandFailed({ ok: true, pageErrors: ["boom"], hydrationWarnings: [] }), true);
});
