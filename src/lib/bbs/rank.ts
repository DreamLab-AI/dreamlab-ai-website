/**
 * Map relay cohort membership onto BBS-flavored "rank" and zone access, so the
 * footer stats line shows something both authentic-looking and truthful.
 */

import type { Zone } from "./types";

/** A BBS rank label derived from the user's cohorts + whitelist status. */
export function rankFromCohorts(
  cohorts: string[],
  whitelisted: boolean
): string {
  const set = new Set(cohorts.map((c) => c.toLowerCase()));
  if (set.has("admin")) return "SysOp";
  if (set.has("business") || set.has("dreamlab")) return "DreamLab";
  if (set.has("family")) return "Family";
  if (set.has("friends")) return "Friend";
  if (set.has("members") || set.has("member")) return "Member";
  if (whitelisted) return "Verified";
  return "Guest";
}

/** Whether a zone is unlocked for a given set of cohorts. */
export function zoneUnlocked(zone: Zone, cohorts: string[]): boolean {
  if (!zone.required_cohorts || zone.required_cohorts.length === 0) return true;
  const set = new Set(cohorts.map((c) => c.toLowerCase()));
  return zone.required_cohorts.some((c) => set.has(c.toLowerCase()));
}

/** Count how many zones the user can access. */
export function zonesUnlocked(zones: Zone[], cohorts: string[]): number {
  return zones.filter((z) => zoneUnlocked(z, cohorts)).length;
}
