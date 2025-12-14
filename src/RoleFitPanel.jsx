import React, { useMemo, useEffect } from "react";
import { ROLE_DEFINITIONS_FM26 } from "./fm26RoleDefinitions.js";
import { computeRoleFit, getTierColor } from "./roleFit.js";

const VALID_FM26_GROUPS = [
  'GK', 'D-C', 'D-LR', 'D/WB-LR', 'WB-LR', 'DM', 'M-C', 'M-LR', 
  'M/AM-C', 'M/AM-LR', 'AM-C', 'AM-LR', 'ST'
];

const mapPositionToGroups = (positionGroup) => {
  if (!positionGroup || positionGroup === 'ALL') return null;
  
  const p = String(positionGroup).toUpperCase();
  
  if (VALID_FM26_GROUPS.includes(p)) return [p];
  
  if (p.includes('GK')) return ['GK'];
  if (p === 'CB' || p.includes('D(C)')) return ['D-C'];
  if (p.includes('D(L)') || p.includes('D(R)')) return ['D-LR', 'D/WB-LR'];
  if (p.includes('WB') || p === 'FB/WB') return ['WB-LR', 'D/WB-LR'];
  if (p === 'DM/CM') return ['DM', 'M-C', 'M/AM-C'];
  if (p.includes('DM')) return ['DM'];
  if (p.includes('M(C)')) return ['M-C', 'M/AM-C'];
  if (p.includes('M(L)') || p.includes('M(R)')) return ['M-LR', 'M/AM-LR'];
  if (p.includes('AM(C)')) return ['AM-C', 'M/AM-C'];
  if (p.includes('AM(L)') || p.includes('AM(R)')) return ['AM-LR', 'M/AM-LR'];
  if (p === 'W/AM' || p.includes('RW') || p.includes('LW')) return ['AM-LR', 'M/AM-LR', 'M-LR'];
  if (p.includes('ST')) return ['ST'];
  
  return null;
};

const getUniquePositionGroups = () => {
  const groups = new Set();
  ROLE_DEFINITIONS_FM26.forEach(r => groups.add(r.positionGroup));
  return Array.from(groups);
};

const getRolesForPositionGroups = (positionGroups) => {
  if (!positionGroups) {
    return ROLE_DEFINITIONS_FM26;
  }
  return ROLE_DEFINITIONS_FM26.filter(r => positionGroups.includes(r.positionGroup));
};

export default function RoleFitPanel({ player, positionGroup, selectedRoleId, onRoleSelect }) {
  const mappedGroups = useMemo(() => mapPositionToGroups(positionGroup), [positionGroup]);
  const allRoles = useMemo(() => getRolesForPositionGroups(mappedGroups), [mappedGroups]);
  
  const ipRoles = useMemo(() => allRoles.filter(r => r.phase === "IP"), [allRoles]);
  const oopRoles = useMemo(() => allRoles.filter(r => r.phase === "OOP"), [allRoles]);

  const playerAttrs = player?.attributes || player?.attrs || {};

  const ipFits = useMemo(() => {
    return ipRoles.map(role => ({
      role,
      fit: computeRoleFit(role, playerAttrs),
    })).sort((a, b) => b.fit.percentage - a.fit.percentage);
  }, [ipRoles, playerAttrs]);

  const oopFits = useMemo(() => {
    return oopRoles.map(role => ({
      role,
      fit: computeRoleFit(role, playerAttrs),
    })).sort((a, b) => b.fit.percentage - a.fit.percentage);
  }, [oopRoles, playerAttrs]);

  const bestIP = ipFits[0];
  const bestOOP = oopFits[0];

  const bestOverall = useMemo(() => {
    if (!bestIP && !bestOOP) return null;
    if (!bestIP) return bestOOP;
    if (!bestOOP) return bestIP;
    return bestIP.fit.percentage >= bestOOP.fit.percentage ? bestIP : bestOOP;
  }, [bestIP, bestOOP]);

  const prevPlayerIdRef = React.useRef(player?.id);
  const prevPositionGroupRef = React.useRef(positionGroup);
  const hasInitializedRef = React.useRef(false);

  useEffect(() => {
    const playerChanged = prevPlayerIdRef.current !== player?.id;
    const positionChanged = prevPositionGroupRef.current !== positionGroup;
    
    if (playerChanged || positionChanged) {
      prevPlayerIdRef.current = player?.id;
      prevPositionGroupRef.current = positionGroup;
      hasInitializedRef.current = true;
      if (bestOverall) {
        onRoleSelect?.(bestOverall.role, bestOverall.fit);
      } else {
        onRoleSelect?.(null, null);
      }
    } else if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (bestOverall) {
        onRoleSelect?.(bestOverall.role, bestOverall.fit);
      } else {
        onRoleSelect?.(null, null);
      }
    }
  }, [bestOverall, player?.id, positionGroup]);

  const handleRoleClick = (role, fit) => {
    onRoleSelect?.(role, fit);
  };

  const handleResetToTopFit = () => {
    if (bestOverall) {
      onRoleSelect?.(bestOverall.role, bestOverall.fit);
    }
  };

  const isTopFitSelected = selectedRoleId === bestOverall?.role?.id;

  const displayPositionGroup = positionGroup === 'ALL' ? 'All Positions' : (positionGroup || 'Position');

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Role Fit</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {player?.name || "Player"} • {displayPositionGroup}
        </p>
      </div>

      {bestIP && bestOOP && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <BestRoleCard label="In Possession (IP)" role={bestIP.role} fit={bestIP.fit} />
          <BestRoleCard label="Out of Possession (OOP)" role={bestOOP.role} fit={bestOOP.fit} />
        </div>
      )}

      {(!bestIP && !bestOOP) && (
        <div className="text-center py-8 text-zinc-500">
          <p>No roles available for this position.</p>
          <p className="text-sm mt-1">Select a different position to see role fit scores.</p>
        </div>
      )}

      {(bestIP || bestOOP) && (
        <div className="space-y-6">
          {!isTopFitSelected && (
            <button
              type="button"
              onClick={handleResetToTopFit}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reset to Top Fit
            </button>
          )}
          <RolePhaseSection 
            title="In Possession (IP)" 
            description="How well the player performs when the team has the ball"
            fits={ipFits}
            selectedRoleId={selectedRoleId}
            onRoleClick={handleRoleClick}
          />
          <RolePhaseSection 
            title="Out of Possession (OOP)" 
            description="How well the player performs when defending"
            fits={oopFits}
            selectedRoleId={selectedRoleId}
            onRoleClick={handleRoleClick}
          />
        </div>
      )}
    </div>
  );
}

function BestRoleCard({ label, role, fit }) {
  const colors = fit.tierColor;
  
  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="font-semibold text-white">{role.displayName}</div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-2xl font-bold ${colors.text}`}>{fit.percentage}%</span>
        <TierBadge tier={fit.tier} percentage={fit.percentage} />
      </div>
    </div>
  );
}

function RolePhaseSection({ title, description, fits, selectedRoleId, onRoleClick }) {
  if (!fits.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-zinc-500">No roles available for this position.</p>
      </div>
    );
  }

  const topFive = fits.slice(0, 5);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      
      <div className="space-y-2">
        {topFive.map(({ role, fit }) => (
          <RoleRow 
            key={role.id} 
            role={role} 
            fit={fit}
            isSelected={selectedRoleId === role.id}
            onClick={() => onRoleClick?.(role, fit)}
          />
        ))}
      </div>
    </div>
  );
}

function RoleRow({ role, fit, isSelected, onClick }) {
  const colors = fit.tierColor;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2 px-3 rounded-lg border transition-all text-left ${
        isSelected 
          ? `${colors.bg} ${colors.border} ring-1 ring-offset-1 ring-offset-zinc-900 ${colors.border.replace('border-', 'ring-')}`
          : 'bg-zinc-900/60 border-zinc-800/50 hover:bg-zinc-800/60 hover:border-zinc-700/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium truncate ${isSelected ? colors.text : 'text-zinc-200'}`}>
          {role.displayName}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold ${colors.text}`}>{fit.percentage}%</span>
          <TierBadge tier={fit.tier} percentage={fit.percentage} size="sm" />
        </div>
      </div>
    </button>
  );
}

function TierBadge({ tier, percentage, size = "md" }) {
  const colors = getTierColor(percentage);
  const sizeClasses = size === "sm" 
    ? "text-[10px] px-1.5 py-0.5 min-w-[70px]" 
    : "text-xs px-2 py-1";
  
  return (
    <span className={`${sizeClasses} rounded-md border ${colors.border} ${colors.bg} ${colors.text} font-medium whitespace-nowrap text-center`}>
      {tier}
    </span>
  );
}
