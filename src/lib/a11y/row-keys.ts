export type RowKeyAction =
  | { type: "move"; index: number }
  | { type: "select" }
  | { type: "none" };

/** Arrow, Home, End, Enter, and Space for one tab stop in a data table. */
export function rowKeyAction(key: string, index: number, count: number): RowKeyAction {
  if (count <= 0) return { type: "none" };
  const last = count - 1;
  const clamped = Math.max(0, Math.min(last, index));
  if (key === "ArrowDown" || key === "ArrowRight") {
    return { type: "move", index: Math.min(last, clamped + 1) };
  }
  if (key === "ArrowUp" || key === "ArrowLeft") {
    return { type: "move", index: Math.max(0, clamped - 1) };
  }
  if (key === "Home") return { type: "move", index: 0 };
  if (key === "End") return { type: "move", index: last };
  if (key === "Enter" || key === " ") return { type: "select" };
  return { type: "none" };
}
