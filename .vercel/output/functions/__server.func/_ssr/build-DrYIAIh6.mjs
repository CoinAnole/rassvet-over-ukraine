import { a as MU_KM3_S2, n as EARTH_RADIUS_KM, u as hoursOld } from "./time-BqVPJKsl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/build-DrYIAIh6.js
var objects_default = {
	updated: "2026-09-20",
	raisedAltitudeKm: 480,
	staleHours: 72,
	stepSeconds: 30,
	minPassSeconds: 60,
	earthRadiusKm: 6371,
	muKm3s2: 398600.4418,
	decayPerigeeKm: 150,
	userAgent: "RassvetOverUkraine/0.1 (unofficial geometric coverage tracker; not affiliated with Bureau 1440)",
	celestrak: { "queries": [
		"https://celestrak.org/NORAD/elements/gp.php?NAME=RASSVET&FORMAT=json",
		"https://celestrak.org/NORAD/elements/gp.php?INTDES=2026-061&FORMAT=json",
		"https://celestrak.org/NORAD/elements/gp.php?INTDES=2026-165&FORMAT=json",
		"https://celestrak.org/NORAD/elements/gp.php?INTDES=2024-092&FORMAT=json",
		"https://celestrak.org/NORAD/elements/gp.php?INTDES=2023-091&FORMAT=json"
	] },
	groups: [
		{
			"id": "exp-2023",
			"launchDate": "2023-06-27",
			"label": {
				"en": "Experimental 2023",
				"uk": "Експериментальні 2023",
				"ru": "Экспериментальные 2023"
			}
		},
		{
			"id": "exp-2024",
			"launchDate": "2024-05-16",
			"label": {
				"en": "Experimental 2024",
				"uk": "Експериментальні 2024",
				"ru": "Экспериментальные 2024"
			}
		},
		{
			"id": "prod-2026-03",
			"launchDate": "2026-03-23",
			"label": {
				"en": "Production Mar 2026",
				"uk": "Серійні, бер. 2026",
				"ru": "Серийные, март 2026"
			}
		},
		{
			"id": "prod-2026-07",
			"launchDate": "2026-07-19",
			"label": {
				"en": "Production Jul 2026",
				"uk": "Серійні, лип. 2026",
				"ru": "Серийные, июль 2026"
			}
		},
		{
			"id": "unassigned",
			"launchDate": null,
			"label": {
				"en": "Unassigned",
				"uk": "Без групи",
				"ru": "Без группы"
			}
		}
	],
	decayed: [68363],
	objects: [
		{
			"norad": 57179,
			"name": "Rassvet-1 No. 1",
			"catalogName": "OBJECT P",
			"cospar": "2023-091P",
			"group": "exp-2023"
		},
		{
			"norad": 57183,
			"name": "Rassvet-1 No. 2",
			"catalogName": "OBJECT T",
			"cospar": "2023-091T",
			"group": "exp-2023"
		},
		{
			"norad": 57170,
			"name": "Rassvet-1 No. 3",
			"catalogName": "OBJECT E",
			"cospar": "2023-091E",
			"group": "exp-2023"
		},
		{
			"norad": 59779,
			"name": "Rassvet-2 No. 1",
			"catalogName": "OBJECT G",
			"cospar": "2024-092G",
			"group": "exp-2024"
		},
		{
			"norad": 59780,
			"name": "Rassvet-2 No. 2",
			"catalogName": "OBJECT H",
			"cospar": "2024-092H",
			"group": "exp-2024"
		},
		{
			"norad": 59781,
			"name": "Rassvet-2 No. 3",
			"catalogName": "OBJECT J",
			"cospar": "2024-092J",
			"group": "exp-2024"
		},
		{
			"norad": 68360,
			"name": "RASSVET-3 1",
			"catalogName": "RASSVET-3 1",
			"cospar": "2026-061A",
			"group": "prod-2026-03"
		},
		{
			"norad": 68361,
			"name": "RASSVET-3 2",
			"catalogName": "RASSVET-3 2",
			"cospar": "2026-061B",
			"group": "prod-2026-03"
		},
		{
			"norad": 68362,
			"name": "RASSVET-3 3",
			"catalogName": "RASSVET-3 3",
			"cospar": "2026-061C",
			"group": "prod-2026-03"
		},
		{
			"norad": 68363,
			"name": "RASSVET-3 4",
			"catalogName": "RASSVET-3 4",
			"cospar": "2026-061D",
			"group": "prod-2026-03"
		},
		{
			"norad": 68364,
			"name": "RASSVET-3 5",
			"catalogName": "RASSVET-3 5",
			"cospar": "2026-061E",
			"group": "prod-2026-03"
		},
		{
			"norad": 68365,
			"name": "RASSVET-3 6",
			"catalogName": "RASSVET-3 6",
			"cospar": "2026-061F",
			"group": "prod-2026-03"
		},
		{
			"norad": 68366,
			"name": "RASSVET-3 7",
			"catalogName": "RASSVET-3 7",
			"cospar": "2026-061G",
			"group": "prod-2026-03"
		},
		{
			"norad": 68367,
			"name": "RASSVET-3 8",
			"catalogName": "RASSVET-3 8",
			"cospar": "2026-061H",
			"group": "prod-2026-03"
		},
		{
			"norad": 68368,
			"name": "RASSVET-3 9",
			"catalogName": "RASSVET-3 9",
			"cospar": "2026-061J",
			"group": "prod-2026-03"
		},
		{
			"norad": 68369,
			"name": "RASSVET-3 10",
			"catalogName": "RASSVET-3 10",
			"cospar": "2026-061K",
			"group": "prod-2026-03"
		},
		{
			"norad": 68370,
			"name": "RASSVET-3 11",
			"catalogName": "RASSVET-3 11",
			"cospar": "2026-061L",
			"group": "prod-2026-03"
		},
		{
			"norad": 68371,
			"name": "RASSVET-3 12",
			"catalogName": "RASSVET-3 12",
			"cospar": "2026-061M",
			"group": "prod-2026-03"
		},
		{
			"norad": 68372,
			"name": "RASSVET-3 13",
			"catalogName": "RASSVET-3 13",
			"cospar": "2026-061N",
			"group": "prod-2026-03"
		},
		{
			"norad": 68373,
			"name": "RASSVET-3 14",
			"catalogName": "RASSVET-3 14",
			"cospar": "2026-061P",
			"group": "prod-2026-03"
		},
		{
			"norad": 68374,
			"name": "RASSVET-3 15",
			"catalogName": "RASSVET-3 15",
			"cospar": "2026-061Q",
			"group": "prod-2026-03"
		},
		{
			"norad": 68375,
			"name": "RASSVET-3 16",
			"catalogName": "RASSVET-3 16",
			"cospar": "2026-061R",
			"group": "prod-2026-03"
		},
		{
			"norad": 100083,
			"name": "RASSVET-3 17",
			"catalogName": "RASSVET-3 17",
			"cospar": "2026-165A",
			"group": "prod-2026-07"
		},
		{
			"norad": 100084,
			"name": "RASSVET-3 18",
			"catalogName": "RASSVET-3 18",
			"cospar": "2026-165B",
			"group": "prod-2026-07"
		},
		{
			"norad": 100085,
			"name": "RASSVET-3 19",
			"catalogName": "RASSVET-3 19",
			"cospar": "2026-165C",
			"group": "prod-2026-07"
		},
		{
			"norad": 100086,
			"name": "RASSVET-3 20",
			"catalogName": "RASSVET-3 20",
			"cospar": "2026-165D",
			"group": "prod-2026-07"
		},
		{
			"norad": 100087,
			"name": "RASSVET-3 21",
			"catalogName": "RASSVET-3 21",
			"cospar": "2026-165E",
			"group": "prod-2026-07"
		},
		{
			"norad": 100088,
			"name": "RASSVET-3 22",
			"catalogName": "RASSVET-3 22",
			"cospar": "2026-165F",
			"group": "prod-2026-07"
		},
		{
			"norad": 100089,
			"name": "RASSVET-3 23",
			"catalogName": "RASSVET-3 23",
			"cospar": "2026-165G",
			"group": "prod-2026-07"
		},
		{
			"norad": 100090,
			"name": "RASSVET-3 24",
			"catalogName": "RASSVET-3 24",
			"cospar": "2026-165H",
			"group": "prod-2026-07"
		},
		{
			"norad": 100091,
			"name": "RASSVET-3 25",
			"catalogName": "RASSVET-3 25",
			"cospar": "2026-165J",
			"group": "prod-2026-07"
		},
		{
			"norad": 100092,
			"name": "RASSVET-3 26",
			"catalogName": "RASSVET-3 26",
			"cospar": "2026-165K",
			"group": "prod-2026-07"
		},
		{
			"norad": 100093,
			"name": "RASSVET-3 27",
			"catalogName": "RASSVET-3 27",
			"cospar": "2026-165L",
			"group": "prod-2026-07"
		},
		{
			"norad": 100094,
			"name": "RASSVET-3 28",
			"catalogName": "RASSVET-3 28",
			"cospar": "2026-165M",
			"group": "prod-2026-07"
		},
		{
			"norad": 100095,
			"name": "RASSVET-3 29",
			"catalogName": "RASSVET-3 29",
			"cospar": "2026-165N",
			"group": "prod-2026-07"
		},
		{
			"norad": 100096,
			"name": "RASSVET-3 30",
			"catalogName": "RASSVET-3 30",
			"cospar": "2026-165P",
			"group": "prod-2026-07"
		},
		{
			"norad": 100097,
			"name": "RASSVET-3 31",
			"catalogName": "RASSVET-3 31",
			"cospar": "2026-165Q",
			"group": "prod-2026-07"
		},
		{
			"norad": 100098,
			"name": "RASSVET-3 32",
			"catalogName": "RASSVET-3 32",
			"cospar": "2026-165R",
			"group": "prod-2026-07"
		}
	]
};
function meanMotionToSmaKm(meanMotionRevPerDay, mu = MU_KM3_S2) {
	const n = meanMotionRevPerDay * (2 * Math.PI) / 86400;
	return Math.cbrt(mu / (n * n));
}
function orbitFromOmm(omm) {
	const n = Number(omm.MEAN_MOTION);
	const e = Number(omm.ECCENTRICITY);
	const i = Number(omm.INCLINATION);
	const a = meanMotionToSmaKm(n);
	return {
		semiMajorKm: a,
		approxAltitudeKm: a - EARTH_RADIUS_KM,
		perigeeKm: a * (1 - e) - EARTH_RADIUS_KM,
		apogeeKm: a * (1 + e) - EARTH_RADIUS_KM,
		periodMin: 1440 / n,
		inclinationDeg: i
	};
}
var config = objects_default;
function getObjectsConfig() {
	return config;
}
function asOmm(raw) {
	const norad = Number(raw.NORAD_CAT_ID);
	if (!Number.isFinite(norad) || !raw.EPOCH || raw.MEAN_MOTION == null) return null;
	return {
		OBJECT_NAME: String(raw.OBJECT_NAME ?? ""),
		OBJECT_ID: String(raw.OBJECT_ID ?? ""),
		EPOCH: String(raw.EPOCH),
		MEAN_MOTION: Number(raw.MEAN_MOTION),
		ECCENTRICITY: Number(raw.ECCENTRICITY),
		INCLINATION: Number(raw.INCLINATION),
		RA_OF_ASC_NODE: Number(raw.RA_OF_ASC_NODE),
		ARG_OF_PERICENTER: Number(raw.ARG_OF_PERICENTER),
		MEAN_ANOMALY: Number(raw.MEAN_ANOMALY),
		EPHEMERIS_TYPE: 0,
		CLASSIFICATION_TYPE: "U",
		NORAD_CAT_ID: norad,
		ELEMENT_SET_NO: Number(raw.ELEMENT_SET_NO ?? 999),
		REV_AT_EPOCH: Number(raw.REV_AT_EPOCH ?? 0),
		BSTAR: Number(raw.BSTAR ?? 0),
		MEAN_MOTION_DOT: Number(raw.MEAN_MOTION_DOT ?? 0),
		MEAN_MOTION_DDOT: Number(raw.MEAN_MOTION_DDOT ?? 0)
	};
}
function indexOmms(list) {
	const map = /* @__PURE__ */ new Map();
	for (const item of list) {
		if (!item || typeof item !== "object") continue;
		const omm = asOmm(item);
		if (!omm) continue;
		map.set(omm.NORAD_CAT_ID, omm);
	}
	return map;
}
function buildCatalog(opts) {
	const now = opts.now ?? /* @__PURE__ */ new Date();
	const decayedSet = new Set(config.decayed);
	const groupById = new Map(config.groups.map((g) => [g.id, g]));
	const objects = [];
	const missingKnownIds = [];
	for (const meta of config.objects) {
		const omm = opts.omms.get(meta.norad) ?? null;
		const group = groupById.get(meta.group);
		if (decayedSet.has(meta.norad)) {
			objects.push({
				norad: meta.norad,
				name: meta.name,
				catalogName: meta.catalogName,
				cospar: meta.cospar,
				group: meta.group,
				launchDate: group?.launchDate ?? null,
				omm: null,
				epoch: null,
				status: "decayed",
				stale: false,
				approxAltitudeKm: null,
				inclinationDeg: null,
				periodMin: null,
				perigeeKm: null,
				apogeeKm: null,
				elementSetCount: omm ? 1 : 0
			});
			continue;
		}
		if (!omm) {
			missingKnownIds.push(meta.norad);
			objects.push({
				norad: meta.norad,
				name: meta.name,
				catalogName: meta.catalogName,
				cospar: meta.cospar,
				group: meta.group,
				launchDate: group?.launchDate ?? null,
				omm: null,
				epoch: null,
				status: "missing",
				stale: false,
				approxAltitudeKm: null,
				inclinationDeg: null,
				periodMin: null,
				perigeeKm: null,
				apogeeKm: null,
				elementSetCount: 0
			});
			continue;
		}
		const orbit = orbitFromOmm(omm);
		const stale = hoursOld(String(omm.EPOCH), now) > (config.staleHours || 72);
		let status = "climbing";
		if (orbit.perigeeKm < (config.decayPerigeeKm || 150)) status = "decayed";
		else if (orbit.approxAltitudeKm >= (config.raisedAltitudeKm || 480)) status = "raised";
		objects.push({
			norad: meta.norad,
			name: meta.name,
			catalogName: meta.catalogName,
			cospar: meta.cospar,
			group: meta.group,
			launchDate: group?.launchDate ?? null,
			omm,
			epoch: String(omm.EPOCH),
			status,
			stale,
			approxAltitudeKm: orbit.approxAltitudeKm,
			inclinationDeg: orbit.inclinationDeg,
			periodMin: orbit.periodMin,
			perigeeKm: orbit.perigeeKm,
			apogeeKm: orbit.apogeeKm,
			elementSetCount: 1
		});
	}
	return {
		fetchedAt: opts.fetchedAt,
		source: opts.source,
		warning: opts.warning,
		missingKnownIds,
		objects,
		decayed: [...config.decayed],
		raisedAltitudeKm: config.raisedAltitudeKm,
		staleHours: config.staleHours,
		stepSeconds: config.stepSeconds,
		minPassSeconds: config.minPassSeconds,
		configUpdated: config.updated
	};
}
//#endregion
export { getObjectsConfig as n, indexOmms as r, buildCatalog as t };
