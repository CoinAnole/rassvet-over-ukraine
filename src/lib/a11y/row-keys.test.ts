import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rowKeyAction } from "./row-keys.ts";

describe("keyboard row selection", () => {
  it("moves through rows and selects the focused one", () => {
    assert.deepEqual(rowKeyAction("ArrowDown", 0, 4), { type: "move", index: 1 });
    assert.deepEqual(rowKeyAction("ArrowRight", 2, 4), { type: "move", index: 3 });
    assert.deepEqual(rowKeyAction("ArrowDown", 3, 4), { type: "move", index: 3 });
    assert.deepEqual(rowKeyAction("ArrowUp", 0, 4), { type: "move", index: 0 });
    assert.deepEqual(rowKeyAction("ArrowLeft", 2, 4), { type: "move", index: 1 });
    assert.deepEqual(rowKeyAction("Home", 3, 4), { type: "move", index: 0 });
    assert.deepEqual(rowKeyAction("End", 0, 4), { type: "move", index: 3 });
    assert.deepEqual(rowKeyAction("Enter", 2, 4), { type: "select" });
    assert.deepEqual(rowKeyAction(" ", 2, 4), { type: "select" });
    assert.deepEqual(rowKeyAction("Tab", 2, 4), { type: "none" });
    assert.deepEqual(rowKeyAction("Enter", 0, 0), { type: "none" });
  });
});
