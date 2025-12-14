// FM26 Role Definitions (Phase-aware) — generated from provided Role Attributes list.
// IMPORTANT: Do not change grouping (key/preferred/unnecessary). Unnecessary is ignored by scoring (weight 0).
//
// Shape:
//   { id, displayName, positionGroup, phase: "IP"|"OOP", key:[], preferred:[], unnecessary?:[], version:"FM26" }
//
// Canonical attribute naming is enforced via FM_ATTRIBUTE_KEYS (only includes attrs referenced in this dataset).
// If you add more roles later, extend FM_ATTRIBUTE_KEYS accordingly.

export const FM_ATTRIBUTE_KEYS = [
  "Aerial Reach","Command of Area","Communication","Handling","Reflexes","Agility","Concentration","Positioning",
  "Kicking","One on Ones","Throwing","Anticipation","Decisions","Eccentricity","Composure","Passing","Rushing Out",
  "Heading","Marking","Tackling","Jumping","Strength","Aggression","Bravery","Pace","First Touch","Technique","Vision",
  "Dribbling","Work Rate","Acceleration","Stamina","Crossing","Off the Ball","Balance","Flair","Long Shots","Finishing",
  "Team Work","Positioning" // note: Positioning already included; kept for clarity
].filter((v, i, a) => a.indexOf(v) === i);

export const ROLE_DEFINITIONS_FM26 = [
  // =====================
  // [GK] GOALKEEPER
  // =====================
  {
    id: "gk.goalkeeper.ip",
    displayName: "Goalkeeper",
    positionGroup: "GK",
    phase: "IP",
    key: ["Aerial Reach","Command of Area","Communication","Handling","Reflexes","Agility","Concentration","Positioning"],
    preferred: ["Kicking","One on Ones","Throwing","Anticipation","Decisions"],
    unnecessary: ["Eccentricity"],
    version: "FM26",
  },
  {
    id: "gk.ballPlayingGoalkeeper.ip",
    displayName: "Ball-Playing Goalkeeper",
    positionGroup: "GK",
    phase: "IP",
    key: ["Aerial Reach","Command of Area","Communication","Handling","Kicking","Reflexes","Agility","Concentration","Positioning"],
    preferred: ["Eccentricity","One on Ones","Throwing","Anticipation","Composure","Decisions","Passing"],
    version: "FM26",
  },
  {
    id: "gk.noNonsenseGoalkeeper.ip",
    displayName: "No-Nonsense Goalkeeper",
    positionGroup: "GK",
    phase: "IP",
    key: ["Aerial Reach","Command of Area","Communication","Handling","Reflexes","Agility","Concentration","Positioning"],
    preferred: ["One on Ones","Anticipation","Decisions"],
    unnecessary: ["Eccentricity","Passing"],
    version: "FM26",
  },

  {
    id: "gk.lineHoldingKeeper.oop",
    displayName: "Line-Holding Keeper",
    positionGroup: "GK",
    phase: "OOP",
    key: ["Positioning","Concentration"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "gk.sweeperKeeper.oop",
    displayName: "Sweeper Keeper",
    positionGroup: "GK",
    phase: "OOP",
    key: ["Rushing Out","Anticipation","Decisions"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [D] Defender Centre
  // =====================
  {
    id: "dc.centreBack.ip",
    displayName: "Centre-Back",
    positionGroup: "D-C",
    phase: "IP",
    key: ["Heading","Marking","Tackling","Anticipation","Positioning","Jumping","Strength"],
    preferred: ["Aggression","Bravery","Composure","Concentration","Decisions","Pace"],
    unnecessary: ["Passing"],
    version: "FM26",
  },
  {
    id: "dc.ballPlayingCentreBack.ip",
    displayName: "Ball-Playing Centre-Back",
    positionGroup: "D-C",
    phase: "IP",
    key: ["Heading","Marking","Passing","Tackling","Anticipation","Composure","Positioning","Jumping","Strength"],
    preferred: ["First Touch","Technique","Aggression","Bravery","Concentration","Decisions","Vision","Pace"],
    version: "FM26",
  },
  {
    id: "dc.noNonsenseCentreBack.ip",
    displayName: "No-Nonsense Centre-Back",
    positionGroup: "D-C",
    phase: "IP",
    key: ["Heading","Marking","Tackling","Anticipation","Positioning","Jumping","Strength"],
    preferred: ["Aggression","Bravery","Concentration","Pace"],
    unnecessary: ["Passing","Composure"],
    version: "FM26",
  },
  {
    id: "dc.wideCentreBack.ip",
    displayName: "Wide Centre-Back",
    positionGroup: "D-C",
    phase: "IP",
    key: ["Heading","Marking","Tackling","Anticipation","Positioning","Jumping","Strength"],
    preferred: ["Dribbling","Aggression","Bravery","Composure","Concentration","Decisions","Work Rate","Acceleration","Agility","Pace","Stamina"],
    unnecessary: ["Passing"],
    version: "FM26",
  },
  {
    id: "dc.advancedCentreBack.ip",
    displayName: "Advanced Centre-Back",
    positionGroup: "D-C",
    phase: "IP",
    key: ["Heading","Marking","Passing","Tackling","Technique","Anticipation","Composure","Decisions","Positioning","Team Work","Jumping","Strength"],
    preferred: ["Dribbling","First Touch","Aggression","Bravery","Concentration","Vision","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "dc.overlappingCentreBack.ip",
    displayName: "Overlapping Centre-Back",
    positionGroup: "D-C",
    phase: "IP",
    key: ["Crossing","Heading","Marking","Tackling","Anticipation","Work Rate","Jumping","Pace","Stamina","Strength"],
    preferred: ["Dribbling","Technique","Aggression","Bravery","Composure","Concentration","Decisions","Off the Ball","Positioning","Acceleration","Agility"],
    version: "FM26",
  },

  {
    id: "dc.coveringCentreBack.oop",
    displayName: "Covering Centre-Back",
    positionGroup: "D-C",
    phase: "OOP",
    key: ["Anticipation","Pace","Marking"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "dc.stoppingCentreBack.oop",
    displayName: "Stopping Centre-Back",
    positionGroup: "D-C",
    phase: "OOP",
    key: ["Aggression","Tackling","Strength"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "dc.coveringWideCentreBack.oop",
    displayName: "Covering Wide Centre-Back",
    positionGroup: "D-C",
    phase: "OOP",
    key: ["Anticipation","Pace","Marking"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "dc.stoppingWideCentreBack.oop",
    displayName: "Stopping Wide Centre-Back",
    positionGroup: "D-C",
    phase: "OOP",
    key: ["Aggression","Tackling","Strength"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [D] Defender Right/Left
  // =====================
  {
    id: "dlr.fullBack.ip",
    displayName: "Full-Back",
    positionGroup: "D-LR",
    phase: "IP",
    key: ["Marking","Tackling","Anticipation","Concentration","Positioning","Team Work","Acceleration"],
    preferred: ["Crossing","Dribbling","Passing","Technique","Decisions","Work Rate","Agility","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "dlr.insideFullBack.ip",
    displayName: "Inside Full-Back",
    positionGroup: "D-LR",
    phase: "IP",
    key: ["Heading","Marking","Tackling","Anticipation","Positioning","Strength"],
    preferred: ["Dribbling","Aggression","Bravery","Composure","Concentration","Decisions","Work Rate","Acceleration","Agility","Jumping","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "dlr.holdingFullBack.oop",
    displayName: "Holding Full-Back",
    positionGroup: "D-LR",
    phase: "OOP",
    key: ["Positioning","Concentration","Marking"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "dlr.pressingFullBack.oop",
    displayName: "Pressing Full-Back",
    positionGroup: "D-LR",
    phase: "OOP",
    key: ["Aggression","Work Rate","Anticipation"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [D/WB] Defender/Wing-Back (Right/Left)
  // =====================
  {
    id: "dwb.insideWingBack.ip",
    displayName: "Inside Wing-Back",
    positionGroup: "D/WB-LR",
    phase: "IP",
    key: ["Passing","Tackling","Anticipation","Composure","Decisions","Positioning","Team Work","Acceleration"],
    preferred: ["First Touch","Marking","Technique","Concentration","Work Rate","Agility","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "dwb.playmakingWingBack.ip",
    displayName: "Playmaking Wing-Back",
    positionGroup: "D/WB-LR",
    phase: "IP",
    key: ["First Touch","Passing","Tackling","Technique","Composure","Decisions","Positioning","Team Work","Vision","Acceleration"],
    preferred: ["Crossing","Dribbling","Marking","Anticipation","Concentration","Off the Ball","Positioning","Work Rate","Agility","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "dwb.wingBack.ip",
    displayName: "Wing-Back",
    positionGroup: "D/WB-LR",
    phase: "IP",
    key: ["Crossing","Marking","Tackling","Team Work","Work Rate","Acceleration","Pace","Stamina"],
    preferred: ["Dribbling","First Touch","Passing","Technique","Anticipation","Concentration","Decisions","Off the Ball","Positioning","Agility","Balance"],
    version: "FM26",
  },

  // =====================
  // [WB] Wing-Back (Right/Left)
  // =====================
  {
    id: "wb.advancedWingBack.ip",
    displayName: "Advanced Wing-Back",
    positionGroup: "WB-LR",
    phase: "IP",
    key: ["Crossing","Dribbling","Technique","Off the Ball","Team Work","Work Rate","Acceleration","Agility","Pace","Stamina"],
    preferred: ["First Touch","Marking","Passing","Tackling","Anticipation","Decisions","Flair","Positioning","Balance"],
    version: "FM26",
  },
  {
    id: "wb.holdingWingBack.oop",
    displayName: "Holding Wing-Back",
    positionGroup: "WB-LR",
    phase: "OOP",
    key: ["Positioning","Concentration","Marking"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "wb.pressingWingBack.oop",
    displayName: "Pressing Wing-Back",
    positionGroup: "WB-LR",
    phase: "OOP",
    key: ["Aggression","Work Rate","Anticipation"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [DM] Defensive Midfielder
  // =====================
  {
    id: "dm.defensiveMidfielder.ip",
    displayName: "Defensive Midfielder",
    positionGroup: "DM",
    phase: "IP",
    key: ["Tackling","Anticipation","Concentration","Positioning","Team Work"],
    preferred: ["First Touch","Marking","Passing","Aggression","Composure","Decisions","Work Rate","Stamina","Strength"],
    version: "FM26",
  },
  {
    id: "dm.boxToBoxMidfielder.ip",
    displayName: "Box-to-Box Midfielder",
    positionGroup: "DM",
    phase: "IP",
    key: ["Passing","Tackling","Off the Ball","Team Work","Work Rate","Stamina"],
    preferred: ["Dribbling","Finishing","First Touch","Long Shots","Technique","Aggression","Anticipation","Composure","Decisions","Positioning","Acceleration","Balance","Pace","Strength"],
    version: "FM26",
  },
  {
    id: "dm.boxToBoxPlaymaker.ip",
    displayName: "Box-to-Box Playmaker",
    positionGroup: "DM",
    phase: "IP",
    key: ["First Touch","Passing","Technique","Composure","Decisions","Off the Ball","Team Work","Vision","Work Rate","Stamina"],
    preferred: ["Dribbling","Marking","Tackling","Anticipation","Positioning","Acceleration","Agility","Balance","Pace"],
    version: "FM26",
  },
  {
    id: "dm.deepLyingPlaymaker.ip",
    displayName: "Deep-Lying Playmaker",
    positionGroup: "DM",
    phase: "IP",
    key: ["First Touch","Passing","Technique","Composure","Decisions","Off the Ball","Team Work","Vision"],
    preferred: ["Marking","Tackling","Anticipation","Concentration","Off the Ball","Positioning","Work Rate","Balance","Stamina"],
    version: "FM26",
  },
  {
    id: "dm.halfBack.ip",
    displayName: "Half-Back",
    positionGroup: "DM",
    phase: "IP",
    key: ["Heading","Marking","Tackling","Anticipation","Concentration","Positioning","Team Work","Jumping","Strength"],
    preferred: ["First Touch","Passing","Aggression","Bravery","Composure","Decisions","Work Rate","Stamina"],
    version: "FM26",
  },

  {
    id: "dm.droppingDefensiveMidfielder.oop",
    displayName: "Dropping Defensive Midfielder",
    positionGroup: "DM",
    phase: "OOP",
    key: ["Positioning","Decisions","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "dm.pressingDefensiveMidfielder.oop",
    displayName: "Pressing Defensive Midfielder",
    positionGroup: "DM",
    phase: "OOP",
    key: ["Aggression","Work Rate","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "dm.screeningDefensiveMidfielder.oop",
    displayName: "Screening Defensive Midfielder",
    positionGroup: "DM",
    phase: "OOP",
    key: ["Positioning","Concentration","Marking"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "dm.wideCoveringDefensiveMidfielder.oop",
    displayName: "Wide Covering Defensive Midfielder",
    positionGroup: "DM",
    phase: "OOP",
    key: ["Anticipation","Pace","Work Rate"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [M] Midfielder (Centre)
  // =====================
  {
    id: "mc.centralMidfielder.ip",
    displayName: "Central Midfielder",
    positionGroup: "M-C",
    phase: "IP",
    key: ["First Touch","Passing","Tackling","Decisions","Team Work"],
    preferred: ["Technique","Anticipation","Composure","Concentration","Off the Ball","Positioning","Vision","Work Rate","Stamina"],
    version: "FM26",
  },
  {
    id: "mc.advancedPlaymaker.ip",
    displayName: "Advanced Playmaker",
    positionGroup: "M-C",
    phase: "IP",
    key: ["First Touch","Passing","Technique","Composure","Decisions","Off the Ball","Team Work","Vision"],
    preferred: ["Crossing","Dribbling","Anticipation","Flair","Acceleration","Agility"],
    version: "FM26",
  },
  {
    id: "mc.midfieldPlaymaker.ip",
    displayName: "Midfield Playmaker",
    positionGroup: "M-C",
    phase: "IP",
    key: ["First Touch","Passing","Technique","Composure","Decisions","Off the Ball","Team Work","Vision"],
    preferred: ["Dribbling","Tackling","Anticipation","Flair","Positioning","Work Rate","Agility","Stamina"],
    version: "FM26",
  },
  {
    id: "mc.wideCentralMidfielder.ip",
    displayName: "Wide Central Midfielder",
    positionGroup: "M-C",
    phase: "IP",
    key: ["First Touch","Passing","Tackling","Decisions","Team Work"],
    preferred: ["Crossing","Dribbling","Technique","Anticipation","Composure","Concentration","Off the Ball","Positioning","Vision","Work Rate","Agility","Stamina"],
    version: "FM26",
  },

  {
    id: "mc.pressingCentralMidfielder.oop",
    displayName: "Pressing Central Midfielder",
    positionGroup: "M-C",
    phase: "OOP",
    key: ["Aggression","Work Rate","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "mc.screeningCentralMidfielder.oop",
    displayName: "Screening Central Midfielder",
    positionGroup: "M-C",
    phase: "OOP",
    key: ["Positioning","Concentration","Marking"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "mc.wideCoveringCentralMidfielder.oop",
    displayName: "Wide Covering Central Midfielder",
    positionGroup: "M-C",
    phase: "OOP",
    key: ["Anticipation","Pace","Work Rate"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [M] Midfielder (Right/Left)
  // =====================
  {
    id: "mlr.wideMidfielder.ip",
    displayName: "Wide Midfielder",
    positionGroup: "M-LR",
    phase: "IP",
    key: ["Crossing","Passing","Technique","Team Work","Work Rate","Pace","Stamina"],
    preferred: ["Dribbling","First Touch","Anticipation","Composure","Off the Ball","Vision","Acceleration","Agility"],
    version: "FM26",
  },
  {
    id: "mlr.trackingWideMidfielder.oop",
    displayName: "Tracking Wide Midfielder",
    positionGroup: "M-LR",
    phase: "OOP",
    key: ["Marking","Work Rate","Stamina"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "mlr.wideOutletWideMidfielder.oop",
    displayName: "Wide Outlet Wide Midfielder",
    positionGroup: "M-LR",
    phase: "OOP",
    key: ["Off the Ball","Pace","Anticipation"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [M/AM] Midfielder/Attacking Midfielder (Right/Left)
  // =====================
  {
    id: "mam_lr.insideWinger.ip",
    displayName: "Inside Winger",
    positionGroup: "M/AM-LR",
    phase: "IP",
    key: ["Dribbling","First Touch","Technique","Composure","Team Work","Acceleration","Agility"],
    preferred: ["Crossing","Long Shots","Passing","Anticipation","Flair","Off the Ball","Vision","Work Rate","Balance","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "mam_lr.playmakingWinger.ip",
    displayName: "Playmaking Winger",
    positionGroup: "M/AM-LR",
    phase: "IP",
    key: ["Crossing","Dribbling","First Touch","Passing","Technique","Composure","Decisions","Off the Ball","Team Work","Vision","Acceleration"],
    preferred: ["Anticipation","Flair","Work Rate","Agility","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "mam_lr.winger.ip",
    displayName: "Winger",
    positionGroup: "M/AM-LR",
    phase: "IP",
    key: ["Crossing","Dribbling","Technique","Team Work","Acceleration","Agility","Pace"],
    preferred: ["First Touch","Passing","Anticipation","Flair","Off the Ball","Work Rate","Balance","Stamina"],
    version: "FM26",
  },

  // =====================
  // [M/AM] Midfielder/Attacking Midfielder (Centre)
  // =====================
  {
    id: "mam_c.attackingMidfielder.ip",
    displayName: "Attacking Midfielder",
    positionGroup: "M/AM-C",
    phase: "IP",
    key: ["First Touch","Long Shots","Passing","Technique","Composure","Flair","Off the Ball"],
    preferred: ["Crossing","Dribbling","Finishing","Anticipation","Decisions","Vision","Acceleration","Agility"],
    version: "FM26",
  },

  // =====================
  // [AM] Attacking Midfielder (Centre)
  // =====================
  {
    id: "amc.channelMidfielder.ip",
    displayName: "Channel Midfielder",
    positionGroup: "AM-C",
    phase: "IP",
    key: ["Crossing","First Touch","Passing","Technique","Composure","Off the Ball","Work Rate","Acceleration"],
    preferred: ["Dribbling","Long Shots","Anticipation","Decisions","Flair","Vision","Agility","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "amc.freeRole.ip",
    displayName: "Free Role",
    positionGroup: "AM-C",
    phase: "IP",
    key: ["Dribbling","First Touch","Long Shots","Passing","Technique","Composure","Flair","Off the Ball","Vision"],
    preferred: ["Crossing","Finishing","Anticipation","Decisions","Acceleration","Agility"],
    version: "FM26",
  },
  {
    id: "amc.secondStriker.ip",
    displayName: "Second Striker",
    positionGroup: "AM-C",
    phase: "IP",
    key: ["Finishing","First Touch","Anticipation","Composure","Off the Ball","Acceleration"],
    preferred: ["Dribbling","Long Shots","Passing","Technique","Concentration","Decisions","Work Rate","Agility","Pace","Stamina"],
    version: "FM26",
  },

  {
    id: "amc.centralOutletAttackingMidfielder.oop",
    displayName: "Central Outlet Attacking Midfielder",
    positionGroup: "AM-C",
    phase: "OOP",
    key: ["Off the Ball","Decisions","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "amc.splittingOutletAttackingMidfielder.oop",
    displayName: "Splitting Outlet Attacking Midfielder",
    positionGroup: "AM-C",
    phase: "OOP",
    key: ["Off the Ball","Pace","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "amc.trackingAttackingMidfielder.oop",
    displayName: "Tracking Attacking Midfielder",
    positionGroup: "AM-C",
    phase: "OOP",
    key: ["Marking","Work Rate","Stamina"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [AM] Attacking Midfielder (Right/Left)
  // =====================
  {
    id: "am_lr.wideForward.ip",
    displayName: "Wide Forward",
    positionGroup: "AM-LR",
    phase: "IP",
    key: ["Dribbling","First Touch","Technique","Anticipation","Off the Ball","Acceleration","Agility","Pace"],
    preferred: ["Crossing","Finishing","Passing","Composure","Flair","Work Rate","Balance","Stamina"],
    version: "FM26",
  },
  {
    id: "am_lr.insideForward.ip",
    displayName: "Inside Forward",
    positionGroup: "AM-LR",
    phase: "IP",
    key: ["Dribbling","First Touch","Technique","Anticipation","Composure","Off the Ball","Acceleration","Agility"],
    preferred: ["Crossing","Finishing","Long Shots","Passing","Flair","Vision","Work Rate","Balance","Pace","Stamina"],
    version: "FM26",
  },

  {
    id: "am_lr.insideOutletWinger.oop",
    displayName: "Inside Outlet Winger",
    positionGroup: "AM-LR",
    phase: "OOP",
    key: ["Off the Ball","Decisions","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "am_lr.trackingWinger.oop",
    displayName: "Tracking Winger",
    positionGroup: "AM-LR",
    phase: "OOP",
    key: ["Marking","Work Rate","Stamina"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "am_lr.wideOutletWinger.oop",
    displayName: "Wide Outlet Winger",
    positionGroup: "AM-LR",
    phase: "OOP",
    key: ["Off the Ball","Pace","Anticipation"],
    preferred: [],
    version: "FM26",
  },

  // =====================
  // [ST] Striker (Centre)
  // =====================
  {
    id: "st.centreForward.ip",
    displayName: "Centre Forward",
    positionGroup: "ST",
    phase: "IP",
    key: ["Finishing","First Touch","Heading","Technique","Composure","Off the Ball","Acceleration","Strength"],
    preferred: ["Dribbling","Passing","Anticipation","Decisions","Agility","Balance","Jumping","Pace"],
    version: "FM26",
  },
  {
    id: "st.channelForward.ip",
    displayName: "Channel Forward",
    positionGroup: "ST",
    phase: "IP",
    key: ["Dribbling","Finishing","First Touch","Technique","Composure","Off the Ball","Work Rate","Acceleration"],
    preferred: ["Crossing","Heading","Passing","Anticipation","Decisions","Agility","Balance","Pace","Stamina"],
    version: "FM26",
  },
  {
    id: "st.deepLyingForward.ip",
    displayName: "Deep-Lying Forward",
    positionGroup: "ST",
    phase: "IP",
    key: ["Finishing","First Touch","Technique","Composure","Off the Ball","Strength"],
    preferred: ["Dribbling","Passing","Anticipation","Decisions","Team Work","Vision","Balance"],
    version: "FM26",
  },
  {
    id: "st.falseNine.ip",
    displayName: "False Nine",
    positionGroup: "ST",
    phase: "IP",
    key: ["Dribbling","First Touch","Passing","Technique","Composure","Decisions","Off the Ball","Team Work","Vision","Acceleration"],
    preferred: ["Finishing","Anticipation","Flair","Agility","Balance"],
    version: "FM26",
  },
  {
    id: "st.poacher.ip",
    displayName: "Poacher",
    positionGroup: "ST",
    phase: "IP",
    key: ["Finishing","Heading","Anticipation","Composure","Concentration","Off the Ball","Acceleration"],
    preferred: ["First Touch","Technique","Decisions","Balance"],
    version: "FM26",
  },
  {
    id: "st.targetForward.ip",
    displayName: "Target Forward",
    positionGroup: "ST",
    phase: "IP",
    key: ["Finishing","Heading","Aggression","Bravery","Composure","Off the Ball","Balance","Jumping","Strength"],
    preferred: ["First Touch","Anticipation","Decisions","Team Work"],
    version: "FM26",
  },

  {
    id: "st.centralOutletCentreForward.oop",
    displayName: "Central Outlet Centre Forward",
    positionGroup: "ST",
    phase: "OOP",
    key: ["Off the Ball","Decisions","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "st.splittingOutletCentreForward.oop",
    displayName: "Splitting Outlet Centre Forward",
    positionGroup: "ST",
    phase: "OOP",
    key: ["Off the Ball","Pace","Anticipation"],
    preferred: [],
    version: "FM26",
  },
  {
    id: "st.trackingCentreForward.oop",
    displayName: "Tracking Centre Forward",
    positionGroup: "ST",
    phase: "OOP",
    key: ["Marking","Work Rate","Stamina"],
    preferred: [],
    version: "FM26",
  },
];

// ---- Validation helpers ----
export function validateRoleDefinitions(roleDefs = ROLE_DEFINITIONS_FM26, canonicalKeys = FM_ATTRIBUTE_KEYS) {
  const canon = new Set(canonicalKeys);
  const errors = [];
  for (const role of roleDefs) {
    const all = [...(role.key || []), ...(role.preferred || []), ...(role.unnecessary || [])];
    for (const a of all) {
      if (!canon.has(a)) errors.push({ roleId: role.id, attribute: a });
    }
  }
  return errors;
}

export function getRolesByPhaseAndGroup(phase, positionGroup) {
  return ROLE_DEFINITIONS_FM26.filter(r => r.phase === phase && (!positionGroup || r.positionGroup === positionGroup));
}
