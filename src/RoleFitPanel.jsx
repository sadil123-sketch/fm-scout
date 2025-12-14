import React, { useEffect, useMemo, useState } from "react";
import { getRolesByPhaseAndGroup, ROLE_DEFINITIONS_FM26, validateRoleDefinitions } from "./fm26RoleDefinitions.js";
import { computePhaseRoleFits, DEFAULT_RATING_ENGINE_SETTINGS } from "./roleFit.js";

/**
 * Drop-in Role Fit panel for Player Profile.
 *
 * Requirements covered:
 * - IP/OOP computed separately
 * - "Both" mode shows IP + OOP + Overall 50/50 (current version)
 * - Unnecessary ignored
 * - Normalization ON by default
 * - Contribution table always visible (explainable scoring)
 *
 * Props:
 *   player: { id, name, positions?: string[], attributes: Record<string, number|string> }
 *   positionGroup: string (e.g., "GK", "D-C", "DM", "ST") — used to filter role dropdowns
 */
export default function RoleFitPanel({ player, positionGroup }) {
  const [mode, setMode] = useState("BOTH"); // "IP" | "OOP" | "BOTH"
  const [ipRoleId, setIpRoleId] = useState("");
  const [oopRoleId, setOopRoleId] = useState("");

  // Settings are save-scoped; prototype uses local state defaults
  const [settings, setSettings] = useState(DEFAULT_RATING_ENGINE_SETTINGS);

  useEffect(() => {
    // Validate dataset once; helpful during dev
    const errors = validateRoleDefinitions(ROLE_DEFINITIONS_FM26);
    if (errors.length) console.warn("[FM26 RoleDefs] Unknown attributes:", errors);
  }, []);

  const ipRoles = useMemo(() => getRolesByPhaseAndGroup("IP", positionGroup), [positionGroup]);
  const oopRoles = useMemo(() => getRolesByPhaseAndGroup("OOP", positionGroup), [positionGroup]);

  // auto-select first role when switching mode / group
  useEffect(() => {
    if (mode !== "OOP" && !ipRoleId && ipRoles.length) setIpRoleId(ipRoles[0].id);
    if (mode !== "IP" && !oopRoleId && oopRoles.length) setOopRoleId(oopRoles[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, positionGroup, ipRoles.length, oopRoles.length]);

  const fits = useMemo(() => {
    return computePhaseRoleFits({
      ipRoleId: mode === "OOP" ? "" : ipRoleId,
      oopRoleId: mode === "IP" ? "" : oopRoleId,
      playerAttrs: player?.attributes || {},
      settings,
    });
  }, [mode, ipRoleId, oopRoleId, player, settings]);

  const fmt = (n) => (typeof n === "number" ? n.toFixed(2) : "—");

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-zinc-400">Role Fit</div>
          <div className="text-lg font-semibold">{player?.name || "Player"} <span className="text-zinc-500 text-sm">({positionGroup || "All"})</span></div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ModePill value={mode} onChange={setMode} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Role selectors */}
        {mode !== "OOP" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-xs text-zinc-400">In Possession Role</div>
            <select
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={ipRoleId}
              onChange={(e) => setIpRoleId(e.target.value)}
            >
              {ipRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName}
                </option>
              ))}
            </select>

            <div className="mt-3 text-sm">
              <div className="text-zinc-400 text-xs">IP Score</div>
              <div className="text-2xl font-semibold">{fits.ip ? fmt(fits.ip.score) : "—"}</div>
            </div>
          </div>
        )}

        {mode !== "IP" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-xs text-zinc-400">Out of Possession Role</div>
            <select
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={oopRoleId}
              onChange={(e) => setOopRoleId(e.target.value)}
            >
              {oopRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName}
                </option>
              ))}
            </select>

            <div className="mt-3 text-sm">
              <div className="text-zinc-400 text-xs">OOP Score</div>
              <div className="text-2xl font-semibold">{fits.oop ? fmt(fits.oop.score) : "—"}</div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">Rating Engine</div>
              <div className="text-sm font-semibold">Default Weights (Save)</div>
            </div>
            <div className="text-xs text-zinc-500">Normalized</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumberField
              label="Key"
              value={settings.keyWeight}
              step={0.05}
              min={0}
              max={2}
              onChange={(v) => setSettings((s) => ({ ...s, keyWeight: v }))}
            />
            <NumberField
              label="Preferred"
              value={settings.preferredWeight}
              step={0.05}
              min={0}
              max={2}
              onChange={(v) => setSettings((s) => ({ ...s, preferredWeight: v }))}
            />
          </div>

          <label className="mt-3 flex items-center justify-between text-xs text-zinc-300">
            <span>Normalization</span>
            <input
              type="checkbox"
              checked={settings.normalizationEnabled !== false}
              onChange={(e) => setSettings((s) => ({ ...s, normalizationEnabled: e.target.checked }))}
            />
          </label>

          {mode === "BOTH" && (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-400">Overall (50/50)</div>
                <div className="text-base font-semibold">{fits.overall ? fmt(fits.overall) : "—"}</div>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Convenience summary for “Both” mode (not a final combined system).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contribution tables */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {mode !== "OOP" && (
          <ContributionTable title="In Possession Contribution" role={fits.ipRole} fit={fits.ip} />
        )}
        {mode !== "IP" && (
          <ContributionTable title="Out of Possession Contribution" role={fits.oopRole} fit={fits.oop} />
        )}
      </div>
    </div>
  );
}

function ModePill({ value, onChange }) {
  const items = [
    { id: "IP", label: "IP" },
    { id: "OOP", label: "OOP" },
    { id: "BOTH", label: "Both" },
  ];
  return (
    <div className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={
              "px-3 py-2 text-sm transition " +
              (active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")
            }
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({ label, value, onChange, step = 0.1, min = 0, max = 2 }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <input
        className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ContributionTable({ title, role, fit }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-zinc-400">{title}</div>
          <div className="text-sm font-semibold">{role ? role.displayName : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">Score</div>
          <div className="text-lg font-semibold">{fit ? fit.score.toFixed(2) : "—"}</div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-xs text-zinc-400">
            <tr>
              <th className="px-3 py-2">Attribute</th>
              <th className="px-3 py-2">Cat</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="px-3 py-2 text-right">Weight</th>
              <th className="px-3 py-2 text-right">Contrib</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(fit?.contributions || []).map((r) => (
              <tr key={r.attribute} className="bg-zinc-900/30">
                <td className="px-3 py-2">{r.attribute}</td>
                <td className="px-3 py-2">
                  <CatBadge cat={r.category} />
                </td>
                <td className="px-3 py-2 text-right">{r.value}</td>
                <td className="px-3 py-2 text-right">{r.weight.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{r.contribution.toFixed(2)}</td>
              </tr>
            ))}
            {!fit?.contributions?.length && (
              <tr>
                <td className="px-3 py-3 text-sm text-zinc-500" colSpan={5}>
                  Select a role to see the contribution breakdown.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatBadge({ cat }) {
  const map = {
    KEY: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    PREFERRED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    UNNECESSARY: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  };
  const label = cat === "UNNECESSARY" ? "UNN" : cat === "PREFERRED" ? "PREF" : "KEY";
  return (
    <span className={"inline-flex rounded-md border px-2 py-0.5 text-[11px] " + (map[cat] || map.KEY)}>
      {label}
    </span>
  );
}
