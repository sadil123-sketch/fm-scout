// Role Fit scoring (FM26) — phase-aware, normalized by default.
// Unnecessary attributes are ignored (weight 0).
import { ROLE_DEFINITIONS_FM26 } from "./fm26RoleDefinitions.js";

export const DEFAULT_RATING_ENGINE_SETTINGS = {
  keyWeight: 1.0,
  preferredWeight: 0.7,
  normalizationEnabled: true,
  // "Both" mode convenience summary (current version): Overall 50/50
  overallBlendEnabled: true,
  overallBlendIP: 0.5,
  overallBlendOOP: 0.5,
};

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Safely read an attribute value by canonical FM name.
 * - If missing, returns 0 (and caller can show "missing" state).
 */
export function getAttrValue(playerAttrs, attrName) {
  if (!playerAttrs) return 0;
  const v = playerAttrs[attrName];
  if (typeof v === "number") return v;
  // Accept numeric strings (common in prototypes)
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Compute normalized role score and per-attribute contributions.
 * @returns { score: number, contributions: Array<{attribute, category, value, weight, contribution}> }
 */
export function computeRoleFit(roleDef, playerAttrs, settings = DEFAULT_RATING_ENGINE_SETTINGS) {
  if (!roleDef) return { score: 0, contributions: [] };

  const wK = settings.keyWeight ?? 1.0;
  const wP = settings.preferredWeight ?? 0.7;
  const wU = 0.0; // fixed ignored

  const contributions = [];

  const push = (attribute, category, weight) => {
    const value = getAttrValue(playerAttrs, attribute);
    const contribution = value * weight;
    contributions.push({ attribute, category, value, weight, contribution });
  };

  (roleDef.key || []).forEach(a => push(a, "KEY", wK));
  (roleDef.preferred || []).forEach(a => push(a, "PREFERRED", wP));
  (roleDef.unnecessary || []).forEach(a => push(a, "UNNECESSARY", wU));

  const numerator = contributions.reduce((sum, r) => sum + r.contribution, 0);
  const denom =
    (roleDef.key?.length ?? 0) * wK +
    (roleDef.preferred?.length ?? 0) * wP +
    (roleDef.unnecessary?.length ?? 0) * wU;

  const normalized = settings.normalizationEnabled !== false;
  const rawScore = denom > 0 ? numerator / denom : 0;
  const score = normalized ? rawScore : numerator;

  // Sort contributions high → low for explainability
  contributions.sort((a, b) => b.contribution - a.contribution);

  return { score, contributions };
}

export function findRoleById(roleId) {
  return ROLE_DEFINITIONS_FM26.find(r => r.id === roleId) || null;
}

/**
 * Compute IP/OOP and optional Overall 50/50 (Both mode)
 */
export function computePhaseRoleFits({ ipRoleId, oopRoleId, playerAttrs, settings = DEFAULT_RATING_ENGINE_SETTINGS }) {
  const ipRole = ipRoleId ? findRoleById(ipRoleId) : null;
  const oopRole = oopRoleId ? findRoleById(oopRoleId) : null;

  const ip = ipRole ? computeRoleFit(ipRole, playerAttrs, settings) : null;
  const oop = oopRole ? computeRoleFit(oopRole, playerAttrs, settings) : null;

  let overall = null;
  if (settings.overallBlendEnabled && ip && oop) {
    const a = settings.overallBlendIP ?? 0.5;
    const b = settings.overallBlendOOP ?? 0.5;
    const denom = a + b;
    overall = denom > 0 ? (ip.score * a + oop.score * b) / denom : (ip.score + oop.score) / 2;
  }

  return { ipRole, oopRole, ip, oop, overall };
}
