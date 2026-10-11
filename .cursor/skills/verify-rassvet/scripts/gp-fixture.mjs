/**
 * Live-shaped CelesTrak GP JSON built from the checked-in snapshot.
 * Only EPOCH changes. Mean motion, and therefore raised / climbing / not-climbing,
 * stays the snapshot's. The dev server's own 72-hour gate does the rest.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export const GP_FIXTURES = ["stale-in-set", "stale-outside-set"];

const FRESH_HOURS = 6;

/**
 * Hours before the fixture clock. Above 72 the app marks the object stale.
 * 71 stays inside the gate on purpose.
 */
const PLANS = {
  "stale-in-set": {
    summary: "Two raised production objects are past 72 hours. One raised production object is at 71 hours and must stay off the list.",
    stale: [
      { norad: 68360, name: "RASSVET-3 1", hours: 100 },
      { norad: 68361, name: "RASSVET-3 2", hours: 80 },
    ],
    insideGate: [{ norad: 68362, name: "RASSVET-3 3", hours: 71 }],
  },
  "stale-outside-set": {
    summary: "Two experimental objects are past 72 hours. Raised production stays inside 72 hours, so the default set is unaffected.",
    stale: [
      { norad: 57179, name: "Rassvet-1 No. 1", hours: 96 },
      { norad: 59779, name: "Rassvet-2 No. 1", hours: 80 },
    ],
    insideGate: [{ norad: 57183, name: "Rassvet-1 No. 2", hours: 71 }],
  },
};

function epochHoursBefore(now, hours) {
  return new Date(now.getTime() - hours * 3_600_000).toISOString().replace(/Z$/, "");
}

export function buildGpFixture(mode, now = new Date()) {
  if (!GP_FIXTURES.includes(mode)) {
    throw new Error(`unknown gp fixture ${mode}. Use ${GP_FIXTURES.join(" or ")}.`);
  }
  const seed = JSON.parse(readFileSync(resolve(REPO_ROOT, "src/data/catalog-seed.json"), "utf8"));
  const byNorad = new Map(seed.objects.map((row) => [row.NORAD_CAT_ID, row]));
  const spec = PLANS[mode];
  const assigned = new Map();
  for (const row of [...spec.stale, ...spec.insideGate]) {
    if (!byNorad.has(row.norad)) throw new Error(`seed has no NORAD ${row.norad}`);
    assigned.set(row.norad, row.hours);
  }
  const objects = seed.objects.map((row) => {
    const hours = assigned.get(row.NORAD_CAT_ID) ?? FRESH_HOURS;
    return { ...row, EPOCH: epochHoursBefore(now, hours) };
  });
  return {
    objects,
    plan: {
      mode,
      generatedAt: now.toISOString(),
      freshHours: FRESH_HOURS,
      summary: spec.summary,
      stale: spec.stale,
      insideGate: spec.insideGate,
    },
  };
}
