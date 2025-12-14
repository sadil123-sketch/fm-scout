import React, { useMemo, useState } from "react";
import RoleFitPanel from "./RoleFitPanel.jsx";

/**
 * Minimal harness to verify Role Fit works end-to-end.
 * Replace this wiring with your existing Player Profile screen.
 */
export default function App() {
  const [positionGroup, setPositionGroup] = useState("GK");

  // Example player attributes map (canonical FM attribute names)
  const player = useMemo(() => ({
    id: "p-001",
    name: "Example Player",
    positions: [positionGroup],
    attributes: {
      "Aerial Reach": 14,
      "Command of Area": 13,
      "Communication": 15,
      "Handling": 14,
      "Reflexes": 16,
      "Agility": 12,
      "Concentration": 13,
      "Positioning": 14,
      "Kicking": 12,
      "One on Ones": 10,
      "Throwing": 11,
      "Anticipation": 12,
      "Decisions": 13,
      "Eccentricity": 8,
      "Composure": 12,
      "Passing": 9,
      "Rushing Out": 11,

      "Heading": 12,
      "Marking": 13,
      "Tackling": 14,
      "Jumping": 13,
      "Strength": 14,
      "Aggression": 12,
      "Bravery": 13,
      "Pace": 11,
      "First Touch": 12,
      "Technique": 12,
      "Vision": 11,
      "Dribbling": 10,
      "Work Rate": 13,
      "Acceleration": 12,
      "Stamina": 12,
      "Crossing": 9,
      "Off the Ball": 11,
      "Balance": 12,
      "Flair": 10,
      "Long Shots": 9,
      "Finishing": 10,
      "Team Work": 13,
    },
  }), [positionGroup]);

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-zinc-100 text-xl font-semibold">FM26 Role Fit — Prototype</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-400">Position Group</div>
            <select
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={positionGroup}
              onChange={(e) => setPositionGroup(e.target.value)}
            >
              <option value="GK">GK</option>
              <option value="D-C">D-C</option>
              <option value="D-LR">D-LR</option>
              <option value="D/WB-LR">D/WB-LR</option>
              <option value="WB-LR">WB-LR</option>
              <option value="DM">DM</option>
              <option value="M-C">M-C</option>
              <option value="M-LR">M-LR</option>
              <option value="M/AM-LR">M/AM-LR</option>
              <option value="M/AM-C">M/AM-C</option>
              <option value="AM-C">AM-C</option>
              <option value="AM-LR">AM-LR</option>
              <option value="ST">ST</option>
            </select>
          </div>
        </div>

        <RoleFitPanel player={player} positionGroup={positionGroup} />
      </div>
    </div>
  );
}
