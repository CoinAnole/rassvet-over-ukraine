/**
 * Compare `src/config/objects.json` to CelesTrak GP rows.
 *
 * The runtime catalog (`src/lib/catalog/build.ts`) is unchanged. This module
 * only reports: present, missing, unexpected RASSVET names, catalogName /
 * COSPAR mismatches, and whether the manual `decayed` list still matches the
 * perigee rule and the absence of a GP row.
 */

const RASSVET_NAME = /rassvet|рассвет/i;

export function orbitFromGp(row, { muKm3s2, earthRadiusKm }) {
  const n = Number(row.MEAN_MOTION);
  const e = Number(row.ECCENTRICITY);
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(e)) return null;
  const meanMotionRad = (n * 2 * Math.PI) / 86400;
  const semiMajorKm = Math.cbrt(muKm3s2 / (meanMotionRad * meanMotionRad));
  return {
    approxAltitudeKm: semiMajorKm - earthRadiusKm,
    perigeeKm: semiMajorKm * (1 - e) - earthRadiusKm,
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
  const decayed = Array.isArray(config.decayed) ? config.decayed : [];
  const groups = Array.isArray(config.groups) ? config.groups : [];
  const groupIds = new Set(groups.map((g) => g.id));
  const decayedSet = new Set(decayed);
  const decayPerigeeKm = Number(config.decayPerigeeKm);
  const raisedAltitudeKm = Number(config.raisedAltitudeKm);
  const staleHours = Number(config.staleHours);
  const orbitOpts = {
    muKm3s2: Number(config.muKm3s2),
    earthRadiusKm: Number(config.earthRadiusKm),
  };

  const failures = [];
  const notes = [];

  if (!Array.isArray(config.objects) || !Array.isArray(config.decayed)) {
    failures.push("objects.json is missing `objects` or `decayed`.");
  }
  for (const id of duplicates(objects.map((o) => o.norad))) {
    failures.push(`Duplicate NORAD ${id} in objects.`);
  }
  for (const id of duplicates(objects.map((o) => o.cospar))) {
    failures.push(`Duplicate COSPAR ${id} in objects.`);
  }
  for (const id of duplicates(decayed)) {
    failures.push(`Duplicate NORAD ${id} in decayed.`);
  }
  const objectIds = new Set(objects.map((o) => o.norad));
  for (const id of decayed) {
    if (!objectIds.has(id)) {
      failures.push(
        `Decayed NORAD ${id} is not in objects. The override cannot label an ID the catalog does not list.`,
      );
    }
  }
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
  const climbing = [];
  const stale = [];

  if (fetchComplete) {
    for (const obj of objects) {
      const row = byNorad.get(obj.norad) ?? null;
      if (!row) {
        missing.push(obj);
        if (!decayedSet.has(obj.norad)) {
          failures.push(
            `NORAD ${obj.norad} (${obj.cospar} ${obj.name}) is not in GP and is not on the decayed list. It will show as missing.`,
          );
        }
        continue;
      }
      const orbit = orbitFromGp(row, orbitOpts);
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
        if (!decayedSet.has(obj.norad)) {
          notes.push(
            `NORAD ${obj.norad} perigee ${km(orbit.perigeeKm)} km is under ${decayPerigeeKm} km. The runtime marks it decayed from the element set. Add it to decayed once GP drops the TLE, or it will later show as missing.`,
          );
        }
      } else if (orbit && orbit.approxAltitudeKm < raisedAltitudeKm && !decayedSet.has(obj.norad)) {
        climbing.push(entry);
      }
      if (ageH != null && ageH > staleHours) stale.push(entry);

      if (decayedSet.has(obj.norad) && orbit && orbit.perigeeKm >= decayPerigeeKm) {
        failures.push(
          `Decayed override ${obj.norad} (${obj.name}) is still in GP at perigee ${km(orbit.perigeeKm)} km, which is at or above ${decayPerigeeKm} km. The override drops the element set and hides a live object.`,
        );
      }
    }

    for (const id of decayed) {
      if (!byNorad.has(id) && objectIds.has(id)) {
        notes.push(
          `Decayed NORAD ${id} has no GP row. That matches the override: without it the same ID would be missing rather than decayed.`,
        );
      }
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
      const orbit = orbitFromGp(row, orbitOpts);
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
      .map((o) => ({ norad: o.norad, name: o.name, decayed: decayedSet.has(o.norad) }));
    const extra = [...seedIds].filter((id) => !objectIds.has(id));
    seedNote = { fetchedAt: opts.seed.fetchedAt, absent, extra };
  }

  if (opts.source === "seed") {
    notes.push(
      "Seed mode checks curated IDs against the checked-in GP snapshot. It cannot see a new RASSVET name. Run without --seed before adding a launch group.",
    );
  }

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
    climbing,
    stale,
    decayed,
    decayPerigeeKm,
    raisedAltitudeKm,
    staleHours,
    groups,
    seedNote,
  };
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
      const flag = report.decayed.includes(obj.norad) ? "on decayed list" : "NOT on decayed list";
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
    push(`Decayed list (${report.decayed.length}): ${report.decayed.join(", ") || "(empty)"}`);
    push(`Perigee under ${report.decayPerigeeKm} km: ${report.lowPerigee.length}`);
    for (const entry of report.lowPerigee) {
      push(`  ${entry.obj.norad}  ${entry.obj.name}  perigee ${km(entry.orbit?.perigeeKm)}`);
    }
    push(
      `Climbing (approx altitude < ${report.raisedAltitudeKm} km, perigee still above the decay gate): ${report.climbing.length}`,
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
