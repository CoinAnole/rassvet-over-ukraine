/**
 * Compare `src/config/objects.json` to CelesTrak GP rows.
 *
 * Altitude is the same Brouwer semi-major axis as the runtime catalog.
 * This module only reports: present, missing, unexpected RASSVET names, catalogName /
 * COSPAR mismatches, whether a confirmed reentry is absent from GP, and
 * whether a below-450 km object has a current climb rate.
 * A stale history or an unknown rate is a warning, not a failure.
 */

import { orbitFromGp as brouwerOrbit } from "../src/lib/orbit/brouwer-altitude.mjs";
import { climbRate, epochToMs, rateIsStale } from "../src/lib/orbit/climb-rate.mjs";

const RASSVET_NAME = /rassvet|рассвет/i;

/** Same Brouwer altitude the site shows. Inclination is required. */
export function orbitFromGp(row) {
  const orbit = brouwerOrbit(row);
  if (!orbit) return null;
  return {
    approxAltitudeKm: orbit.approxAltitudeKm,
    perigeeKm: orbit.perigeeKm,
  };
}

export function epochAgeHours(epoch, now) {
  if (!epoch || typeof epoch !== "string") return null;
  const iso = epoch.endsWith("Z") ? epoch : `${epoch}Z`;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / 3_600_000;
}

function duplicates(values) {
  const seen = new Set();
  const dup = new Set();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    else seen.add(value);
  }
  return [...dup];
}

function km(n) {
  return n == null || !Number.isFinite(n) ? "—" : n.toFixed(1);
}

function isRassvetName(name) {
  return RASSVET_NAME.test(String(name ?? ""));
}

/**
 * @param {object} opts
 * @param {object} opts.config Parsed objects.json
 * @param {object[]} opts.records GP rows from queries that succeeded
 * @param {{url: string, ok: boolean, error: string|null, count: number}[]} opts.queries
 * @param {"live"|"seed"} opts.source
 * @param {Date} [opts.now]
 * @param {{fetchedAt: string|null, ids: number[]}|null} [opts.seed]
 */
export function auditCatalog(opts) {
  const config = opts.config;
  const now = opts.now ?? new Date();
  const queries = opts.queries ?? [];
  const fetchComplete = queries.length > 0 && queries.every((q) => q.ok);
  const objects = Array.isArray(config.objects) ? config.objects : [];
  const groups = Array.isArray(config.groups) ? config.groups : [];
  const groupIds = new Set(groups.map((g) => g.id));
  const reentries = Array.isArray(opts.reentries) ? opts.reentries : [];
  const reentrySet = new Set(
    reentries.map((record) => Number(record?.norad)).filter((id) => Number.isFinite(id)),
  );
  const decayPerigeeKm = Number(config.decayPerigeeKm);
  const raisedAltitudeKm = Number(config.raisedAltitudeKm);
  const staleHours = Number(config.staleHours);

  const failures = [];
  const notes = [];

  if (!Array.isArray(config.objects)) {
    failures.push("objects.json is missing `objects`.");
  }
  if (opts.reentriesError) {
    notes.push(
      `Reentry records were not loaded (${opts.reentriesError}). Confirmed decays were not checked.`,
    );
  }
  if (config.decayed != null) {
    failures.push(
      "`decayed` was the manual reentry list. Remove it. Confirmed reentries come from reentries.json in Blob, with the data branch as fallback.",
    );
  }
  if (config.stuck != null) {
    failures.push(
      "`stuck` was the manual not-climbing list. Remove it. Status under 450 km comes from altitude history.",
    );
  }
  for (const id of duplicates(objects.map((o) => o.norad))) {
    failures.push(`Duplicate NORAD ${id} in objects.`);
  }
  for (const id of duplicates(objects.map((o) => o.cospar))) {
    failures.push(`Duplicate COSPAR ${id} in objects.`);
  }
  const objectIds = new Set(objects.map((o) => o.norad));
  for (const obj of objects) {
    if (!groupIds.has(obj.group)) {
      failures.push(`NORAD ${obj.norad} group ${JSON.stringify(obj.group)} is not in groups.`);
    }
  }

  const byNorad = new Map();
  for (const row of opts.records ?? []) {
    const norad = Number(row?.NORAD_CAT_ID);
    if (!Number.isFinite(norad)) continue;
    const prev = byNorad.get(norad);
    if (!prev) {
      byNorad.set(norad, row);
      continue;
    }
    if (
      String(prev.OBJECT_ID ?? "") !== String(row.OBJECT_ID ?? "") ||
      String(prev.OBJECT_NAME ?? "") !== String(row.OBJECT_NAME ?? "")
    ) {
      failures.push(
        `NORAD ${norad} disagrees across queries: ${prev.OBJECT_ID} ${JSON.stringify(prev.OBJECT_NAME)} vs ${row.OBJECT_ID} ${JSON.stringify(row.OBJECT_NAME)}.`,
      );
    }
  }

  const present = [];
  const missing = [];
  const mismatches = [];
  const displayDiffs = [];
  const lowPerigee = [];
  const underRaised = [];
  const stale = [];

  if (fetchComplete) {
    for (const obj of objects) {
      const row = byNorad.get(obj.norad) ?? null;
      if (!row) {
        missing.push(obj);
        if (!reentrySet.has(obj.norad)) {
          failures.push(
            `NORAD ${obj.norad} (${obj.cospar} ${obj.name}) is not in GP and has no confirmed reentry. It will show as missing.`,
          );
        } else {
          notes.push(
            `NORAD ${obj.norad} (${obj.name}) has no GP row and a confirmed reentry. The site marks it decayed.`,
          );
        }
        continue;
      }
      const orbit = orbitFromGp(row);
      const ageH = epochAgeHours(String(row.EPOCH ?? ""), now);
      const entry = { obj, row, orbit, ageH };
      present.push(entry);

      const gpName = String(row.OBJECT_NAME ?? "");
      const gpId = String(row.OBJECT_ID ?? "");
      if (gpName !== obj.catalogName || gpId !== obj.cospar) {
        mismatches.push({ obj, gpName, gpId });
      }
      if (gpName !== obj.catalogName) {
        failures.push(
          `NORAD ${obj.norad} catalogName ${JSON.stringify(obj.catalogName)} != GP OBJECT_NAME ${JSON.stringify(gpName)}.`,
        );
      }
      if (gpId !== obj.cospar) {
        failures.push(`NORAD ${obj.norad} cospar ${obj.cospar} != GP OBJECT_ID ${gpId}.`);
      }
      if (obj.name !== gpName) {
        displayDiffs.push({ obj, gpName });
      }
      if (orbit && orbit.perigeeKm < decayPerigeeKm) {
        lowPerigee.push(entry);
        notes.push(
          `NORAD ${obj.norad} perigee ${km(orbit.perigeeKm)} km is under ${decayPerigeeKm} km. The runtime marks it decayed from the element set.`,
        );
      } else if (orbit && orbit.approxAltitudeKm < raisedAltitudeKm && !reentrySet.has(obj.norad)) {
        underRaised.push(entry);
      }
      if (ageH != null && ageH > staleHours) stale.push(entry);
    }
  } else {
    notes.push(
      "One or more CelesTrak queries failed. NORAD presence, names, and the decay audit were not scored.",
    );
  }

  const unexpected = [];
  if (fetchComplete) {
    for (const [norad, row] of byNorad) {
      if (objectIds.has(norad)) continue;
      if (!isRassvetName(row.OBJECT_NAME)) continue;
      unexpected.push(row);
      const orbit = orbitFromGp(row);
      failures.push(
        `Unexpected GP object ${norad} ${row.OBJECT_ID} ${JSON.stringify(row.OBJECT_NAME)} (alt ${km(orbit?.approxAltitudeKm)} km) is not in objects.`,
      );
    }
  }

  const rideshare = [];
  if (fetchComplete) {
    for (const query of queries) {
      const rows = query.objects ?? [];
      const extras = rows.filter((row) => {
        const norad = Number(row.NORAD_CAT_ID);
        return !objectIds.has(norad) && !isRassvetName(row.OBJECT_NAME);
      });
      if (extras.length > 0) rideshare.push({ url: query.url, count: extras.length });
    }
  }

  let seedNote = null;
  if (opts.seed) {
    const seedIds = new Set(opts.seed.ids);
    const absent = objects
      .filter((o) => !seedIds.has(o.norad))
      .map((o) => ({ norad: o.norad, name: o.name, decayed: reentrySet.has(o.norad) }));
    const extra = [...seedIds].filter((id) => !objectIds.has(id));
    seedNote = { fetchedAt: opts.seed.fetchedAt, absent, extra };
  }

  if (opts.source === "seed") {
    notes.push(
      "Seed mode checks curated IDs against the checked-in GP snapshot. It cannot see a new RASSVET name. Run without --seed before adding a launch group.",
    );
  }

  const rates = classifyUnderRaised({
    history: opts.history,
    fetchComplete,
    present,
    underRaised,
    decayedSet: reentrySet,
    notes,
  });

  let exitCode = 0;
  if (failures.length > 0) exitCode = 1;
  else if (!fetchComplete) exitCode = 2;

  return {
    source: opts.source,
    fetchedAt: now.toISOString(),
    fetchComplete,
    exitCode,
    failures,
    notes,
    queries,
    present,
    missing,
    mismatches,
    displayDiffs,
    unexpected,
    rideshare,
    lowPerigee,
    climbing: rates.climbing,
    notClimbing: rates.notClimbing,
    ratePending: rates.ratePending,
    stale,
    decayed: [...reentrySet],
    decayPerigeeKm,
    raisedAltitudeKm,
    staleHours,
    groups,
    seedNote,
  };
}

function listObjects(entries) {
  return entries
    .map((entry) => `${entry.obj.norad} (${entry.obj.name})`)
    .join(", ");
}

/**
 * Below 450 km, a fresh rate above 0.8 km/day is climbing and any other
 * fresh rate is not climbing. No rate, including a history more than 72 h
 * behind the newest catalog epoch, is rate pending. Both the stale history
 * and the unknown rate are warnings.
 */
function classifyUnderRaised(args) {
  const empty = { climbing: [], notClimbing: [], ratePending: [] };
  if (!args.fetchComplete) return empty;
  const history = args.history;
  if (!history || !history.ok || !Array.isArray(history.rows) || history.rows.length === 0) {
    const why = !history
      ? "Altitude history was not supplied."
      : !history.ok
        ? `Altitude history was not loaded (${history.error || "unavailable"}).`
        : "Altitude history has no rows.";
    args.notes.push(
      `${why} Rates under 450 km are unknown, so those objects are rate pending and are not counted as climbing.`,
    );
    if (args.underRaised.length > 0) {
      args.notes.push(
        `Below 450 km with an unknown rate (rate pending, not counted as climbing): ${listObjects(args.underRaised)}. This is a warning, not a failure.`,
      );
    }
    return { ...empty, ratePending: args.underRaised };
  }

  const byNorad = new Map();
  let referenceMs = 0;
  for (const row of history.rows) {
    const norad = Number(row?.norad);
    if (Number.isFinite(norad)) {
      const list = byNorad.get(norad);
      if (list) list.push(row);
      else byNorad.set(norad, [row]);
    }
    const t = epochToMs(row?.epoch);
    if (t != null && t > referenceMs) referenceMs = t;
  }
  for (const entry of args.present) {
    const t = epochToMs(entry.row?.EPOCH);
    if (t != null && t > referenceMs) referenceMs = t;
  }

  const climbing = [];
  const notClimbing = [];
  const ratePending = [];
  const stale = [];
  for (const entry of args.present) {
    if (args.decayedSet.has(entry.obj.norad)) continue;
    const samples = [...(byNorad.get(entry.obj.norad) ?? [])];
    if (entry.row?.EPOCH && entry.orbit) {
      samples.push({
        epoch: String(entry.row.EPOCH),
        alt_km: entry.orbit.approxAltitudeKm,
      });
    }
    let newestMs = null;
    for (const sample of samples) {
      const t = epochToMs(sample.epoch);
      if (t != null && (newestMs == null || t > newestMs)) newestMs = t;
    }
    const historyStale = rateIsStale(newestMs, referenceMs || null);
    if (historyStale) {
      const behindH = (referenceMs - newestMs) / 3_600_000;
      stale.push(`${entry.obj.norad} (${entry.obj.name}, ${behindH.toFixed(1)} h behind)`);
    }
    if (!args.underRaised.includes(entry)) continue;
    const rate = historyStale ? null : climbRate(samples);
    if (!rate) ratePending.push(entry);
    else if (rate.klass === "climbing") climbing.push(entry);
    else notClimbing.push(entry);
  }
  if (stale.length > 0) {
    args.notes.push(
      `Stale altitude history, more than 72 h behind the newest catalog epoch: ${stale.join(", ")}. That rate is not used. This is a warning, not a failure.`,
    );
  }
  if (ratePending.length > 0) {
    args.notes.push(
      `Below 450 km with an unknown rate (rate pending, not counted as climbing): ${listObjects(ratePending)}. This is a warning, not a failure.`,
    );
  }
  return { climbing, notClimbing, ratePending };
}

function queryLabel(url) {
  try {
    const u = new URL(url);
    const name = u.searchParams.get("NAME");
    const intdes = u.searchParams.get("INTDES");
    const catnr = u.searchParams.get("CATNR");
    if (name) return `NAME=${name}`;
    if (intdes) return `INTDES=${intdes}`;
    if (catnr) return `CATNR=${catnr}`;
  } catch {
    /* keep the raw url */
  }
  return url;
}

export function renderAudit(report) {
  const lines = [];
  const push = (s = "") => lines.push(s);
  push(`Catalog hygiene (${report.source})`);
  push(`Checked ${report.fetchedAt}`);
  push("Queries");
  if (report.queries.length === 0) push("  (none)");
  for (const query of report.queries) {
    const label = queryLabel(query.url);
    if (query.ok) push(`  ok ${String(query.count).padStart(4)}  ${label}`);
    else push(`  FAIL      ${label}  ${query.error}`);
  }

  if (report.fetchComplete) {
    push("");
    push(`Present: ${report.present.length}`);
    const order = report.groups.map((g) => g.id);
    const grouped = new Map(order.map((id) => [id, []]));
    for (const entry of report.present) {
      const bucket = grouped.get(entry.obj.group) ?? [];
      bucket.push(entry);
      grouped.set(entry.obj.group, bucket);
    }
    for (const [group, entries] of grouped) {
      if (entries.length === 0) continue;
      entries.sort((a, b) => a.obj.norad - b.obj.norad);
      push(`  ${group} (${entries.length})`);
      for (const entry of entries) {
        const age = entry.ageH == null ? "—" : `${entry.ageH.toFixed(1)}h`;
        push(
          `    ${entry.obj.norad}  ${entry.obj.cospar}  ${entry.row.OBJECT_NAME}  alt ${km(entry.orbit?.approxAltitudeKm)}  perigee ${km(entry.orbit?.perigeeKm)}  age ${age}`,
        );
      }
    }

    push("");
    push(`Missing from GP: ${report.missing.length}`);
    for (const obj of report.missing) {
      const flag = report.decayed.includes(obj.norad) ? "confirmed reentry" : "NOT a confirmed reentry";
      push(`  ${obj.norad}  ${obj.cospar}  ${obj.name}  ${flag}`);
    }

    push("");
    push(`catalogName / COSPAR mismatches: ${report.mismatches.length}`);
    push(
      `Display name differs from GP OBJECT_NAME (curated label, not a failure): ${report.displayDiffs.length}`,
    );
    for (const diff of report.displayDiffs) {
      push(
        `  ${diff.obj.norad}  ${JSON.stringify(diff.obj.name)} vs ${JSON.stringify(diff.gpName)}`,
      );
    }

    push("");
    push(`Unexpected RASSVET names: ${report.unexpected.length}`);
    for (const row of report.unexpected) {
      push(`  ${row.NORAD_CAT_ID}  ${row.OBJECT_ID}  ${row.OBJECT_NAME}`);
    }
    push(
      "INTDES objects that are not curated and are not named RASSVET (rideshare, not a failure):",
    );
    if (report.rideshare.length === 0) push("  none");
    for (const extra of report.rideshare) {
      push(`  ${extra.count}  ${queryLabel(extra.url)}`);
    }

    push("");
    push(`Confirmed reentries (${report.decayed.length}): ${report.decayed.join(", ") || "(empty)"}`);
    push(`Perigee under ${report.decayPerigeeKm} km: ${report.lowPerigee.length}`);
    for (const entry of report.lowPerigee) {
      push(`  ${entry.obj.norad}  ${entry.obj.name}  perigee ${km(entry.orbit?.perigeeKm)}`);
    }
    push(
      `Not climbing (holding or decaying, under ${report.raisedAltitudeKm} km): ${report.notClimbing.length}`,
    );
    const notClimbing = [...report.notClimbing].sort(
      (a, b) => (a.orbit?.approxAltitudeKm ?? 0) - (b.orbit?.approxAltitudeKm ?? 0),
    );
    for (const entry of notClimbing) {
      push(
        `  ${entry.obj.norad}  ${entry.obj.name}  alt ${km(entry.orbit?.approxAltitudeKm)}  perigee ${km(entry.orbit?.perigeeKm)}`,
      );
    }
    push(
      `Rate pending (under ${report.raisedAltitudeKm} km, rate unknown or stale): ${report.ratePending.length}`,
    );
    const pending = [...report.ratePending].sort(
      (a, b) => (a.orbit?.approxAltitudeKm ?? 0) - (b.orbit?.approxAltitudeKm ?? 0),
    );
    for (const entry of pending) {
      push(
        `  ${entry.obj.norad}  ${entry.obj.name}  alt ${km(entry.orbit?.approxAltitudeKm)}  perigee ${km(entry.orbit?.perigeeKm)}`,
      );
    }
    push(
      `Climbing (rate above 0.8 km/day, under ${report.raisedAltitudeKm} km): ${report.climbing.length}`,
    );
    const climbing = [...report.climbing].sort(
      (a, b) => (a.orbit?.approxAltitudeKm ?? 0) - (b.orbit?.approxAltitudeKm ?? 0),
    );
    for (const entry of climbing) {
      push(
        `  ${entry.obj.norad}  ${entry.obj.name}  alt ${km(entry.orbit?.approxAltitudeKm)}  perigee ${km(entry.orbit?.perigeeKm)}`,
      );
    }
    push(`Stale epochs (> ${report.staleHours} h): ${report.stale.length}`);
    for (const entry of report.stale) {
      push(`  ${entry.obj.norad}  ${entry.obj.name}  age ${entry.ageH?.toFixed(1)}h`);
    }
  }

  if (report.seedNote) {
    push("");
    push(`Seed snapshot ${report.seedNote.fetchedAt ?? "(no fetched_at)"}`);
    const absent = report.seedNote.absent;
    push(
      `  curated IDs absent from seed: ${
        absent.length === 0
          ? "none"
          : absent.map((o) => `${o.norad}${o.decayed ? " (decayed)" : ""}`).join(", ")
      }`,
    );
    push(
      `  seed IDs not in objects: ${report.seedNote.extra.length === 0 ? "none" : report.seedNote.extra.join(", ")}`,
    );
  }

  if (report.notes.length > 0) {
    push("");
    push("Notes");
    for (const note of report.notes) push(`  ${note}`);
  }
  if (report.failures.length > 0) {
    push("");
    push("Failures");
    for (const failure of report.failures) push(`  ${failure}`);
  }

  push("");
  push(
    report.exitCode === 0
      ? "Result: ok"
      : report.exitCode === 2
        ? "Result: incomplete fetch"
        : "Result: fail",
  );
  return `${lines.join("\n")}\n`;
}
