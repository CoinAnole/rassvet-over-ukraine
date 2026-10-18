import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLIMB_KM_PER_DAY,
  climbClass,
  climbListDisagreement,
  climbRate,
  formatClimbRate,
  leastSquaresSlope,
} from "./climb-rate.ts";
import liveRows from "./climb-rate.live.json" with { type: "json" };

const T0 = Date.parse("2026-10-01T00:00:00Z");

function series(slope: number, opts?: { n?: number; spanHours?: number; startMs?: number }) {
  const n = opts?.n ?? 4;
  const spanHours = opts?.spanHours ?? 48;
  const start = opts?.startMs ?? T0;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const hours = n === 1 ? 0 : (spanHours * i) / (n - 1);
    rows.push({
      epoch: new Date(start + hours * 3_600_000).toISOString().replace(/Z$/, ""),
      altKm: 300 + slope * (hours / 24),
    });
  }
  return rows;
}

describe("least-squares slope", () => {
  it("recovers a line of +2 km/day", () => {
    const fit = leastSquaresSlope([
      { tDays: 0, altKm: 100 },
      { tDays: 1, altKm: 102 },
      { tDays: 2, altKm: 104 },
    ]);
    assert.ok(fit);
    assert.ok(Math.abs(fit.slope - 2) < 1e-9);
    assert.ok(Math.abs(fit.intercept - 100) < 1e-9);
  });

  it("fits the most recent two-to-three-day window, not older epochs", () => {
    const newest = T0 + 10 * 86_400_000;
    const old = [];
    for (let day = 0; day <= 6; day++) {
      old.push({
        epoch: new Date(T0 + day * 86_400_000).toISOString(),
        altKm: 200 + day * 10,
      });
    }
    const recent = [60, 40, 20, 0].map((hours) => ({
      epoch: new Date(newest - hours * 3_600_000).toISOString(),
      altKm: 400,
    }));
    const rate = climbRate([...old, ...recent]);
    assert.ok(rate);
    assert.ok(Math.abs(rate.kmPerDay) < 1e-6, `${rate.kmPerDay}`);
    assert.equal(rate.klass, "holding");
    assert.equal(rate.points, 4);
  });

  it("reads epochs without a Z suffix and keeps one sample per timestamp", () => {
    const rows = series(2.6);
    const last = rows[rows.length - 1]!;
    rows.unshift(last);
    rows.push({ ...last });
    const rate = climbRate(rows.reverse());
    assert.ok(rate);
    assert.ok(Math.abs(rate.kmPerDay - 2.6) < 1e-6, `${rate.kmPerDay}`);
    assert.equal(formatClimbRate(rate.kmPerDay), "+2.6");
    assert.equal(rate.points, 4);
  });
});

describe("gap and sample count", () => {
  it("is unknown with fewer than three points", () => {
    assert.equal(climbRate(series(3, { n: 2, spanHours: 48 })), null);
    assert.equal(climbRate([]), null);
    assert.equal(climbRate(null), null);
  });

  it("is unknown when three points span less than 36 hours", () => {
    assert.equal(climbRate(series(2, { n: 3, spanHours: 30 })), null);
  });

  it("accepts three points that span exactly 36 hours", () => {
    const rate = climbRate(series(1.2, { n: 3, spanHours: 36 }));
    assert.ok(rate);
    assert.ok(Math.abs(rate.kmPerDay - 1.2) < 1e-6);
    assert.equal(rate.spanHours, 36);
    assert.equal(rate.klass, "climbing");
  });
});

describe("single-point outliers", () => {
  it("drops one spike and keeps the underlying slope", () => {
    const rows = series(1, { n: 5, spanHours: 48 });
    const spiked = rows.map((row, i) => (i === 1 ? { ...row, altKm: row.altKm + 8 } : row));
    const rate = climbRate(spiked);
    assert.ok(rate);
    assert.equal(rate.droppedOutlier, true);
    assert.equal(rate.points, 4);
    assert.ok(Math.abs(rate.kmPerDay - 1) < 1e-6, `${rate.kmPerDay}`);
    assert.equal(rate.klass, "climbing");
  });

  it("keeps two spikes instead of pretending one point is the problem", () => {
    const rows = series(1, { n: 5, spanHours: 48 });
    const spiked = rows.map((row, i) =>
      i === 1 || i === 3 ? { ...row, altKm: row.altKm + 8 } : row,
    );
    const rate = climbRate(spiked);
    assert.ok(rate);
    assert.equal(rate.droppedOutlier, false);
    assert.equal(rate.points, 5);
  });

  it("keeps the newest epoch when the earlier points alone would be too short", () => {
    const start = T0;
    const rows = [0, 10, 20, 50].map((hours, i) => ({
      epoch: new Date(start + hours * 3_600_000).toISOString(),
      altKm: i === 3 ? 104 : 100,
    }));
    const rate = climbRate(rows);
    assert.ok(rate);
    assert.equal(rate.droppedOutlier, false);
    assert.equal(rate.points, 4);
    assert.equal(rate.spanHours, 50);
    assert.ok(rate.kmPerDay > 0);
  });
});

describe("October 2026 history", () => {
  const rows = liveRows as { norad: number; epoch: string; alt_km: number }[];
  function forNorad(norad: number) {
    return rows.filter((row) => row.norad === norad);
  }

  it("fits every epoch in the 72-hour window, including a burn at the newest one", () => {
    const eleven = climbRate(forNorad(68370));
    assert.ok(eleven);
    assert.equal(eleven.droppedOutlier, false);
    assert.equal(eleven.points, 4);
    assert.ok(Math.abs(eleven.kmPerDay - 4.98) < 0.01, `${eleven.kmPerDay}`);
    assert.equal(formatClimbRate(eleven.kmPerDay), "+5.0");

    const seventeen = climbRate(forNorad(100083));
    assert.ok(seventeen);
    assert.equal(seventeen.droppedOutlier, false);
    assert.equal(seventeen.points, 5);
    assert.ok(seventeen.spanHours > 59 && seventeen.spanHours < 60);
    assert.ok(Math.abs(seventeen.kmPerDay - -3.79) < 0.01, `${seventeen.kmPerDay}`);
    assert.equal(formatClimbRate(seventeen.kmPerDay), "-3.8");

    const twenty = climbRate(forNorad(100086));
    assert.ok(twenty);
    assert.equal(twenty.droppedOutlier, false);
    assert.equal(twenty.points, 6);
    assert.ok(twenty.spanHours > 44 && twenty.spanHours < 45);
    assert.ok(Math.abs(twenty.kmPerDay - 1.34) < 0.01, `${twenty.kmPerDay}`);
    assert.equal(formatClimbRate(twenty.kmPerDay), "+1.3");
    assert.equal(twenty.klass, "climbing");

    const twentyEight = climbRate(forNorad(100094));
    assert.ok(twentyEight);
    assert.equal(twentyEight.droppedOutlier, false);
    assert.equal(twentyEight.points, 5);
    assert.ok(twentyEight.spanHours > 40 && twentyEight.spanHours < 42);
    assert.ok(Math.abs(twentyEight.kmPerDay - 1.46) < 0.01, `${twentyEight.kmPerDay}`);
    assert.equal(formatClimbRate(twentyEight.kmPerDay), "+1.5");
    assert.equal(twentyEight.klass, "climbing");
  });
});

describe("classes", () => {
  it("treats 0.8 km/day as holding and anything steeper as climbing or decaying", () => {
    assert.equal(CLIMB_KM_PER_DAY, 0.8);
    assert.equal(climbClass(0.8), "holding");
    assert.equal(climbClass(0.81), "climbing");
    assert.equal(climbClass(-0.8), "holding");
    assert.equal(climbClass(-0.81), "decaying");
    assert.equal(climbRate(series(0.8))?.klass, "holding");
    assert.equal(climbRate(series(0.81))?.klass, "climbing");
    assert.equal(climbRate(series(-0.8))?.klass, "holding");
    assert.equal(climbRate(series(-1.4))?.klass, "decaying");
  });

  it("formats a signed one-decimal rate", () => {
    assert.equal(formatClimbRate(2.64), "+2.6");
    assert.equal(formatClimbRate(-1.24), "-1.2");
    assert.equal(formatClimbRate(0), "+0.0");
  });

  it("flags a manual list that disagrees and lets decaying agree with not-climbing", () => {
    assert.equal(climbListDisagreement(true, "climbing"), true);
    assert.equal(climbListDisagreement(false, "holding"), true);
    assert.equal(climbListDisagreement(false, "decaying"), true);
    assert.equal(climbListDisagreement(true, "holding"), false);
    assert.equal(climbListDisagreement(true, "decaying"), false);
    assert.equal(climbListDisagreement(false, "climbing"), false);
    assert.equal(climbListDisagreement(false, null), false);
  });
});
