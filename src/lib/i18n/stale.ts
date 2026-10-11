import type { StaleSummary } from "../catalog/stale-summary.ts";
import type { Lang } from "../catalog/types.ts";
import { slavicPlural } from "./index.ts";

function enWhere(usedDefaultSet: boolean): string {
  return usedDefaultSet ? "the default raised-production set" : "this coverage set";
}

function ukWhere(usedDefaultSet: boolean): string {
  return usedDefaultSet ? "типовий набір піднятих серійних" : "цей набір покриття";
}

function ruWhere(usedDefaultSet: boolean): string {
  return usedDefaultSet ? "набор по умолчанию (поднятые серийные)" : "этот набор покрытия";
}

function enLine(n: number, k: number, usedDefaultSet: boolean): string {
  const where = enWhere(usedDefaultSet);
  if (k === 0) {
    if (n === 1) return `1 element set is older than 72 hours. It is not in ${where}.`;
    return `${n} element sets are older than 72 hours. None are in ${where}.`;
  }
  if (k === n) {
    if (n === 1) return `1 element set older than 72 hours is in ${where}.`;
    return `${n} element sets older than 72 hours are in ${where}.`;
  }
  if (k === 1) return `${n} element sets are older than 72 hours. 1 is in ${where}.`;
  return `${n} element sets are older than 72 hours. ${k} are in ${where}.`;
}

function ukLine(n: number, k: number, usedDefaultSet: boolean): string {
  const where = ukWhere(usedDefaultSet);
  if (n === 1 && k === 0) {
    return `1 набір елементів старіший за 72 години. Він не входить у ${where}.`;
  }
  if (n === 1 && k === 1) {
    return `1 набір елементів старіший за 72 години, і він входить у ${where}.`;
  }
  const noun = slavicPlural(n, "набір елементів", "набори елементів", "наборів елементів");
  const older = `Є ${n} ${noun}, старіших за 72 години.`;
  if (k === 0) return `${older} Жоден не входить у ${where}.`;
  if (k === n) return `${older} Усі вони входять у ${where}.`;
  if (k === 1) return `${older} 1 входить у ${where}.`;
  return `${older} ${k} входять у ${where}.`;
}

function ruLine(n: number, k: number, usedDefaultSet: boolean): string {
  const where = ruWhere(usedDefaultSet);
  if (n === 1 && k === 0) {
    return `1 набор элементов старше 72 часов. Он не входит в ${where}.`;
  }
  if (n === 1 && k === 1) {
    return `1 набор элементов старше 72 часов, и он входит в ${where}.`;
  }
  const noun = slavicPlural(n, "набор элементов", "набора элементов", "наборов элементов");
  const older = `${n} ${noun} старше 72 часов.`;
  if (k === 0) return `${older} Ни один не входит в ${where}.`;
  if (k === n) return `${older} Все они входят в ${where}.`;
  if (k === 1) return `${older} 1 входит в ${where}.`;
  return `${older} ${k} входят в ${where}.`;
}

/** One sentence for the collapsed note. Counts follow the summary, not a second threshold. */
export function staleBannerLine(lang: Lang, summary: StaleSummary): string {
  const { count, inSetCount, usedDefaultSet } = summary;
  if (count < 1) return "";
  if (lang === "uk") return ukLine(count, inSetCount, usedDefaultSet);
  if (lang === "ru") return ruLine(count, inSetCount, usedDefaultSet);
  return enLine(count, inSetCount, usedDefaultSet);
}
