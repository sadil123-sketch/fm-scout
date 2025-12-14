// Role Fit scoring (FM26) — phase-aware, outputs 0-100% scale with tier labels.
// Unnecessary attributes are ignored (weight 0).
import { ROLE_DEFINITIONS_FM26 } from "./fm26RoleDefinitions.js";

export const TIER_THRESHOLDS = {
  ACCOMPLISHED: 90,
  COMPETENT: 70,
  UNCONVINCING: 50,
  UNSUITABLE: 0,
};

export function getTierLabel(percentage) {
  if (percentage >= TIER_THRESHOLDS.ACCOMPLISHED) return "Accomplished";
  if (percentage >= TIER_THRESHOLDS.COMPETENT) return "Competent";
  if (percentage >= TIER_THRESHOLDS.UNCONVINCING) return "Unconvincing";
  return "Unsuitable";
}

export function getTierColor(percentage) {
  if (percentage >= TIER_THRESHOLDS.ACCOMPLISHED) return { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" };
  if (percentage >= TIER_THRESHOLDS.COMPETENT) return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" };
  if (percentage >= TIER_THRESHOLDS.UNCONVINCING) return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" };
  return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40" };
}

const FM26_TO_CAMEL_ATTR_MAP = {
  'Crossing': 'crossing', 'Dribbling': 'dribbling', 'Finishing': 'finishing', 'First Touch': 'firstTouch',
  'Heading': 'heading', 'Long Shots': 'longShots', 'Marking': 'marking', 'Passing': 'passing',
  'Tackling': 'tackling', 'Technique': 'technique', 'Corners': 'corners', 'Free Kick Taking': 'freeKickTaking',
  'Long Throws': 'longThrows', 'Penalty Taking': 'penaltyTaking', 'Aggression': 'aggression',
  'Anticipation': 'anticipation', 'Bravery': 'bravery', 'Composure': 'composure', 'Concentration': 'concentration',
  'Decisions': 'decisions', 'Determination': 'determination', 'Flair': 'flair', 'Leadership': 'leadership',
  'Off the Ball': 'offTheBall', 'Positioning': 'positioning', 'Team Work': 'teamwork', 'Vision': 'vision',
  'Work Rate': 'workRate', 'Acceleration': 'acceleration', 'Agility': 'agility', 'Balance': 'balance',
  'Jumping': 'jumpingReach', 'Natural Fitness': 'naturalFitness', 'Pace': 'pace', 'Stamina': 'stamina',
  'Strength': 'strength', 'Aerial Reach': 'aerialReach', 'Command of Area': 'commandOfArea',
  'Communication': 'communication', 'Eccentricity': 'eccentricity', 'Handling': 'handling', 'Kicking': 'kicking',
  'One on Ones': 'oneOnOnes', 'Punching': 'punching', 'Reflexes': 'reflexes', 'Rushing Out': 'rushingOut',
  'Throwing': 'throwing',
};

export const DEFAULT_RATING_ENGINE_SETTINGS = {
  keyWeight: 1.0,
  preferredWeight: 0.7,
};

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function getAttrValue(playerAttrs, fm26AttrName) {
  if (!playerAttrs) return 0;
  
  let v = playerAttrs[fm26AttrName];
  if (typeof v === "number") return v;
  
  const camelKey = FM26_TO_CAMEL_ATTR_MAP[fm26AttrName];
  if (camelKey) {
    v = playerAttrs[camelKey];
    if (typeof v === "number") return v;
  }
  
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeRoleFit(roleDef, playerAttrs, settings = DEFAULT_RATING_ENGINE_SETTINGS) {
  if (!roleDef) return { score: 0, percentage: 0, tier: "Unsuitable", tierColor: getTierColor(0) };

  const wK = settings.keyWeight ?? 1.0;
  const wP = settings.preferredWeight ?? 0.7;
  const MAX_ATTR_VALUE = 20;

  let totalWeightedValue = 0;
  let totalMaxPossible = 0;

  (roleDef.key || []).forEach(attr => {
    const value = getAttrValue(playerAttrs, attr);
    totalWeightedValue += value * wK;
    totalMaxPossible += MAX_ATTR_VALUE * wK;
  });

  (roleDef.preferred || []).forEach(attr => {
    const value = getAttrValue(playerAttrs, attr);
    totalWeightedValue += value * wP;
    totalMaxPossible += MAX_ATTR_VALUE * wP;
  });

  const percentage = totalMaxPossible > 0 
    ? Math.round((totalWeightedValue / totalMaxPossible) * 100) 
    : 0;

  return {
    score: totalWeightedValue,
    percentage,
    tier: getTierLabel(percentage),
    tierColor: getTierColor(percentage),
  };
}

export function findRoleById(roleId) {
  return ROLE_DEFINITIONS_FM26.find(r => r.id === roleId) || null;
}

export function computeAllRoleFitsForPosition(positionGroup, playerAttrs, settings = DEFAULT_RATING_ENGINE_SETTINGS) {
  const roles = ROLE_DEFINITIONS_FM26.filter(r => r.positionGroup === positionGroup);
  
  const ipRoles = roles.filter(r => r.phase === "IP");
  const oopRoles = roles.filter(r => r.phase === "OOP");

  const ipFits = ipRoles.map(role => ({
    role,
    fit: computeRoleFit(role, playerAttrs, settings),
  })).sort((a, b) => b.fit.percentage - a.fit.percentage);

  const oopFits = oopRoles.map(role => ({
    role,
    fit: computeRoleFit(role, playerAttrs, settings),
  })).sort((a, b) => b.fit.percentage - a.fit.percentage);

  return { ipFits, oopFits };
}

export function getBestRoleForPosition(positionGroup, playerAttrs, phase = null, settings = DEFAULT_RATING_ENGINE_SETTINGS) {
  const roles = ROLE_DEFINITIONS_FM26.filter(r => 
    r.positionGroup === positionGroup && (phase ? r.phase === phase : true)
  );

  let bestRole = null;
  let bestFit = null;

  roles.forEach(role => {
    const fit = computeRoleFit(role, playerAttrs, settings);
    if (!bestFit || fit.percentage > bestFit.percentage) {
      bestRole = role;
      bestFit = fit;
    }
  });

  return { role: bestRole, fit: bestFit };
}
