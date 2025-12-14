import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Home, Users, UserCog, Building2, List, Sliders, History, Trophy, Target,
  Search, Moon, Sun, Bell, Settings, ChevronLeft, ChevronRight, Filter,
  Download, GitCompare, Plus, Star, TrendingUp, DollarSign, MapPin, FileText,
  Clock, Eye, Crown, X, Check, ChevronDown, ChevronUp, Play, RefreshCw, Zap,
  AlertCircle, Info, Sparkles, BarChart3, Activity, MoreHorizontal, HelpCircle,
  Loader2, CheckCircle2, XCircle, Save, Upload, FolderOpen, Layout, Grid,
  Columns, Table, Tag, RotateCcw, Edit3, Trash2, UserPlus, CheckSquare, Copy
} from 'lucide-react';
import { getRolesByPhaseAndGroup, ROLE_DEFINITIONS_FM26 } from './fm26RoleDefinitions.js';
import { computeRoleFit, DEFAULT_RATING_ENGINE_SETTINGS, getBestRoleForPosition } from './roleFit.js';
import RoleFitPanel from './RoleFitPanel.jsx';

// ============================================
// Design System
// ============================================
const theme = {
  colors: {
    primary: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
    success: { light: '#dcfce7', main: '#22c55e', dark: '#16a34a' },
    warning: { light: '#fef3c7', main: '#f59e0b', dark: '#d97706' },
    error: { light: '#fee2e2', main: '#ef4444', dark: '#dc2626' },
    gold: { light: '#fef3c7', main: '#f59e0b', dark: '#b45309' },
  }
};

// ============================================
// Helpers (formatting + derived data)
// ============================================
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const safeParseDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatISODate = (iso) => {
  const d = safeParseDate(iso);
  if (!d) return '—';
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const calcAgeFromDOB = (dobISO, fallbackAge) => {
  const dob = safeParseDate(dobISO);
  if (!dob) return fallbackAge ?? '—';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
};

const formatTimeAgo = (iso) => {
  const d = safeParseDate(iso);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return formatISODate(iso);
};

const formatDurationFromDays = (days) => {
  const d = Math.max(0, Math.floor(days));
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.round(d / 7)}w`;
  if (d < 365) return `${Math.round(d / 30)}m`;
  const y = Math.floor(d / 365);
  const m = Math.round((d % 365) / 30);
  return `${y}y${m ? ` ${m}m` : ''}`;
};

const contractRemaining = (untilISO) => {
  const until = safeParseDate(untilISO);
  if (!until) return { label: '—', days: null, status: 'neutral' };
  const diffDays = Math.floor((until.getTime() - Date.now()) / 86400000);
  const label = diffDays >= 0 ? formatDurationFromDays(diffDays) : 'Expired';
  const status = diffDays < 0 ? 'danger' : diffDays <= 180 ? 'warning' : 'success';
  return { label, days: diffDays, status };
};

const formSummary = (arr) => {
  const xs = Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : [];
  if (!xs.length) return { avg: null, delta: null };
  const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
  const delta = xs.length >= 2 ? xs[xs.length - 1] - xs[0] : 0;
  return { avg, delta };
};

const copyToClipboard = async (textToCopy) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    }
  } catch (_) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = textToCopy;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch (_) {
    return false;
  }
};

const makeId = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

// ============================================
// API Data Transformation
// ============================================
const transformPlayerFromAPI = (apiPlayer) => {
  const nationFlags = {
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'Spain': '🇪🇸',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
    'Portugal': '🇵🇹',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
  };
  
  const formatValue = (val) => {
    if (!val) return '€0';
    if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `€${(val / 1000).toFixed(0)}k`;
    return `€${val}`;
  };

  const formatWage = (wage) => {
    if (!wage) return '€0 p/w';
    return `€${(wage / 1000).toFixed(0)}k p/w`;
  };

  return {
    id: `p_${apiPlayer.id}`,
    name: `${apiPlayer.first_name} ${apiPlayer.last_name}`,
    age: apiPlayer.age,
    dob: apiPlayer.date_of_birth,
    club: apiPlayer.club_name || 'Free Agent',
    nation: nationFlags[apiPlayer.nationality] || '🏳️',
    pos: apiPlayer.primary_position,
    positionsLabel: apiPlayer.primary_position,
    ca: apiPlayer.current_ability,
    pa: apiPlayer.potential_ability,
    value: formatValue(apiPlayer.value),
    valueNum: apiPlayer.value || 0,
    contract: {
      until: apiPlayer.contract_expiry,
      wage: formatWage(apiPlayer.wage),
    },
    lastUpdated: new Date().toISOString(),
    foot: apiPlayer.preferred_foot || 'Right',
    injury: { status: 'fit' },
    personality: apiPlayer.personality || 'Balanced',
    mediaHandling: apiPlayer.media_handling || 'Reserved',
    attrs: {
      // Technical
      crossing: apiPlayer.crossing,
      dribbling: apiPlayer.dribbling,
      finishing: apiPlayer.finishing,
      firstTouch: apiPlayer.first_touch,
      heading: apiPlayer.heading,
      longShots: apiPlayer.long_shots,
      marking: apiPlayer.marking,
      passing: apiPlayer.passing,
      tackling: apiPlayer.tackling,
      technique: apiPlayer.technique,
      // Set Pieces
      corners: apiPlayer.corners,
      freeKickTaking: apiPlayer.free_kicks,
      longThrows: apiPlayer.long_throws,
      penaltyTaking: apiPlayer.penalty_taking,
      // Mental
      aggression: apiPlayer.aggression,
      anticipation: apiPlayer.anticipation,
      bravery: apiPlayer.bravery,
      composure: apiPlayer.composure,
      concentration: apiPlayer.concentration,
      decisions: apiPlayer.decisions,
      determination: apiPlayer.determination,
      flair: apiPlayer.flair,
      leadership: apiPlayer.leadership,
      offTheBall: apiPlayer.off_the_ball,
      positioning: apiPlayer.positioning,
      teamwork: apiPlayer.teamwork,
      vision: apiPlayer.vision,
      workRate: apiPlayer.work_rate,
      // Physical
      acceleration: apiPlayer.acceleration,
      agility: apiPlayer.agility,
      balance: apiPlayer.balance,
      jumpingReach: apiPlayer.jumping_reach,
      naturalFitness: apiPlayer.natural_fitness,
      pace: apiPlayer.pace,
      stamina: apiPlayer.stamina,
      strength: apiPlayer.strength,
      // Goalkeeping
      aerialReach: apiPlayer.aerial_reach,
      commandOfArea: apiPlayer.command_of_area,
      communication: apiPlayer.communication,
      eccentricity: apiPlayer.eccentricity,
      handling: apiPlayer.handling,
      kicking: apiPlayer.kicking,
      oneOnOnes: apiPlayer.one_on_ones,
      punching: apiPlayer.punching,
      reflexes: apiPlayer.reflexes,
      rushingOut: apiPlayer.rushing_out,
      throwing: apiPlayer.throwing,
    },
    form: [7.0, 7.1, 6.9, 7.2, 7.0],
  };
};

const transformStaffFromAPI = (apiStaff) => {
  const nationFlags = {
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'Portugal': '🇵🇹',
    'Spain': '🇪🇸',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
  };

  const calcStars = (val) => val ? Math.min(5, Math.max(1, Math.round(val / 4))) : 2;
  const calcRepStars = (ca) => ca ? Math.min(5, Math.max(1, Math.round(ca / 40))) : 2;

  return {
    id: `s_${apiStaff.id}`,
    name: `${apiStaff.first_name} ${apiStaff.last_name}`,
    age: apiStaff.age,
    nation: nationFlags[apiStaff.nationality] || '🏳️',
    role: apiStaff.role,
    club: apiStaff.club_name || 'Unemployed',
    rep: calcRepStars(apiStaff.current_ability),
    ca: apiStaff.current_ability,
    stars: {
      judgePA: calcStars(apiStaff.judging_player_potential),
      judgeCA: calcStars(apiStaff.judging_player_ability),
      motiv: calcStars(apiStaff.motivating),
      tact: calcStars(apiStaff.tactical),
      man: calcStars(apiStaff.man_management),
      youth: calcStars(apiStaff.working_with_youngsters),
      phys: calcStars(apiStaff.physiotherapy),
      work: calcStars(apiStaff.determination),
    },
  };
};

const transformClubFromAPI = (apiClub) => {
  return {
    id: apiClub.id,
    name: apiClub.name,
    shortName: apiClub.short_name,
    country: apiClub.nation || 'England',
    league: apiClub.league,
    rep: Math.min(5, Math.max(1, Math.round(apiClub.reputation / 40))),
    finances: apiClub.balance ? Math.min(100, Math.max(0, Math.round((apiClub.balance / 500000000) * 100))) : 50,
    facilities: apiClub.training_facilities ? apiClub.training_facilities * 5 : 50,
    youthFacilities: apiClub.youth_facilities ? apiClub.youth_facilities * 5 : 50,
    youthRecruitment: apiClub.youth_recruitment ? apiClub.youth_recruitment * 5 : 50,
    stadium: apiClub.stadium_name,
    capacity: apiClub.stadium_capacity,
    playerCount: apiClub.player_count || 0,
    staffCount: apiClub.staff_count || 0,
    vacancy: false,
  };
};

// Small toast stack used for micro-feedback (copy, added, etc.)
const ToastStack = ({ toasts, onDismiss, dark }) => {
  if (!toasts?.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} onClick={() => onDismiss?.(t.id)} className="cursor-pointer">
          <Toast variant={t.variant} title={t.title} message={t.message} dark={dark} />
        </div>
      ))}
    </div>
  );
};

// ============================================
// Player Attribute Groups (FM26-aligned)
// ============================================

const ATTRIBUTE_GROUP_ORDER = ['Technical', 'Set Pieces', 'Mental', 'Physical', 'Goalkeeping'];

const ATTRIBUTE_GROUPS_V26 = {
  Technical: [
    { key: 'crossing', label: 'Crossing' },
    { key: 'dribbling', label: 'Dribbling' },
    { key: 'finishing', label: 'Finishing' },
    { key: 'firstTouch', label: 'First Touch' },
    { key: 'heading', label: 'Heading' },
    { key: 'longShots', label: 'Long Shots' },
    { key: 'marking', label: 'Marking' },
    { key: 'passing', label: 'Passing' },
    { key: 'tackling', label: 'Tackling' },
    { key: 'technique', label: 'Technique' },
  ],
  'Set Pieces': [
    { key: 'corners', label: 'Corners' },
    { key: 'freeKickTaking', label: 'Free Kick Taking' },
    { key: 'longThrows', label: 'Long Throws' },
    { key: 'penaltyTaking', label: 'Penalty Taking' },
  ],
  Mental: [
    { key: 'aggression', label: 'Aggression' },
    { key: 'anticipation', label: 'Anticipation' },
    { key: 'bravery', label: 'Bravery' },
    { key: 'composure', label: 'Composure' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'decisions', label: 'Decisions' },
    { key: 'determination', label: 'Determination' },
    { key: 'flair', label: 'Flair' },
    { key: 'leadership', label: 'Leadership' },
    { key: 'offTheBall', label: 'Off The Ball' },
    { key: 'positioning', label: 'Positioning' },
    { key: 'teamwork', label: 'Teamwork' },
    { key: 'vision', label: 'Vision' },
    { key: 'workRate', label: 'Work Rate' },
  ],
  Physical: [
    { key: 'acceleration', label: 'Acceleration' },
    { key: 'agility', label: 'Agility' },
    { key: 'balance', label: 'Balance' },
    { key: 'jumpingReach', label: 'Jumping Reach' },
    { key: 'naturalFitness', label: 'Natural Fitness' },
    { key: 'pace', label: 'Pace' },
    { key: 'stamina', label: 'Stamina' },
    { key: 'strength', label: 'Strength' },
  ],
  Goalkeeping: [
    { key: 'aerialReach', label: 'Aerial Reach' },
    { key: 'commandOfArea', label: 'Command Of Area' },
    { key: 'communication', label: 'Communication' },
    { key: 'eccentricity', label: 'Eccentricity' },
    { key: 'firstTouch', label: 'First Touch' },
    { key: 'handling', label: 'Handling' },
    { key: 'kicking', label: 'Kicking' },
    { key: 'oneOnOnes', label: 'One On Ones' },
    { key: 'passing', label: 'Passing' },
    { key: 'punching', label: 'Punching (Tendency)' },
    { key: 'reflexes', label: 'Reflexes' },
    { key: 'rushingOut', label: 'Rushing Out (Tendency)' },
    { key: 'throwing', label: 'Throwing' },
  ],
};

const ATTRIBUTE_GROUPS_GK_OVERRIDES = {
  Technical: [
    { key: 'freeKickTaking', label: 'Free Kick Taking' },
    { key: 'penaltyTaking', label: 'Penalty Taking' },
    { key: 'technique', label: 'Technique' },
  ],
};

const ATTRIBUTE_TOOLTIPS = {
  crossing: "Ability to deliver accurate crosses into the penalty area from wide positions.",
  dribbling: "Ability to run with the ball under control and beat opponents.",
  finishing: "Ability to put the ball in the net when presented with a goal-scoring chance.",
  firstTouch: "Ability to control the ball well on first contact, setting up the next action.",
  heading: "Ability to use the head effectively for passing, shooting, and clearing.",
  longShots: "Ability to shoot accurately from outside the penalty area.",
  marking: "Ability to track and stay close to opponents to prevent them receiving the ball.",
  passing: "Ability to find teammates with accurate short and medium-range passes.",
  tackling: "Ability to win the ball from opponents with well-timed tackles.",
  technique: "Technical ability and skill when performing actions with the ball.",
  corners: "Ability to deliver accurate corner kicks into dangerous areas.",
  freeKickTaking: "Ability to take direct and indirect free kicks effectively.",
  longThrows: "Ability to throw the ball long distances from throw-ins.",
  penaltyTaking: "Ability to score from penalty kicks with composure and accuracy.",
  aggression: "How likely a player is to get stuck in and compete for the ball.",
  anticipation: "Ability to predict events and react to situations before they develop.",
  bravery: "Willingness to risk physical injury for the good of the team.",
  composure: "Ability to stay calm under pressure and make good decisions.",
  concentration: "Ability to maintain focus throughout the match without lapses.",
  decisions: "Ability to make the right choice in any given situation.",
  determination: "Desire to succeed and unwillingness to give up.",
  flair: "Ability to do the unpredictable and produce moments of magic.",
  leadership: "Ability to inspire and command respect from teammates.",
  offTheBall: "Ability to move intelligently without the ball to create space and options.",
  positioning: "Ability to read the game and take up good defensive positions.",
  teamwork: "Willingness to work for the team and follow tactical instructions.",
  vision: "Ability to see potential passes and opportunities others might miss.",
  workRate: "How hard a player will work during a match.",
  acceleration: "How quickly a player can reach top speed from a standing start.",
  agility: "Ability to change direction quickly while maintaining balance.",
  balance: "Ability to stay on feet and maintain body position under pressure.",
  jumpingReach: "How high a player can jump to reach the ball.",
  naturalFitness: "How quickly a player recovers from injuries and maintains condition.",
  pace: "Top running speed a player can achieve.",
  stamina: "Ability to maintain physical exertion over the course of a match.",
  strength: "Physical power in challenges and ability to hold off opponents.",
  aerialReach: "How high the goalkeeper can reach when jumping for the ball.",
  commandOfArea: "Ability to dominate the penalty area and organize the defense.",
  communication: "Ability to direct and organize defensive teammates vocally.",
  eccentricity: "Tendency to make unexpected and risky decisions as a goalkeeper.",
  handling: "Ability to safely catch and hold onto the ball.",
  kicking: "Ability to distribute the ball accurately with kicks.",
  oneOnOnes: "Ability to stop opponents in one-on-one situations.",
  punching: "Tendency to punch the ball clear rather than catch it.",
  reflexes: "Reaction speed to make saves from close-range shots.",
  rushingOut: "Tendency to come off the line to intercept through balls.",
  throwing: "Ability to distribute the ball accurately with throws.",
};

const getAttributeTooltip = (key, groupName) => {
  if (groupName === 'Goalkeeping') {
    if (key === 'firstTouch') return "Goalkeeper's ability to control the ball with feet when receiving back passes.";
    if (key === 'passing') return "Goalkeeper's ability to distribute the ball accurately with passes to teammates.";
  }
  return ATTRIBUTE_TOOLTIPS[key] || null;
};

const DEFAULT_GROUPS_OUTFIELD = ['Technical', 'Set Pieces', 'Mental', 'Physical'];
const DEFAULT_GROUPS_GK = ['Goalkeeping', 'Mental', 'Physical', 'Technical'];

const isGoalkeeperPlayer = (p) => {
  const pos = String(p?.pos || '').toUpperCase();
  const label = String(p?.positionsLabel || '');
  return pos === 'GK' || /\bGK\b/i.test(label) || /goalkeeper/i.test(label);
};

// Clean "GK" icon badge (used instead of Shield)
const GKIcon = ({ size = 16, className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex items-center justify-center rounded-md border border-slate-500/40 ${className}`}
    style={{ width: size, height: size }}
  >
    <span className="text-[9px] leading-none font-bold tracking-tight">GK</span>
  </span>
);

// ============================================
// Position Map for Football Pitch Visualization
// ============================================
const POSITION_MAP = {
  'GK': { x: 50, y: 92, label: 'Goalkeeper', shortLabel: 'GK' },
  'D(L)': { x: 20, y: 78, label: 'Defender (Left)', shortLabel: 'DL' },
  'D(C)': { x: 50, y: 78, label: 'Defender (Centre)', shortLabel: 'DC' },
  'D(R)': { x: 80, y: 78, label: 'Defender (Right)', shortLabel: 'DR' },
  'WB(L)': { x: 8, y: 58, label: 'Wing Back (Left)', shortLabel: 'WBL' },
  'WB(R)': { x: 92, y: 58, label: 'Wing Back (Right)', shortLabel: 'WBR' },
  'DM': { x: 50, y: 58, label: 'Defensive Midfielder', shortLabel: 'DM' },
  'M(L)': { x: 25, y: 45, label: 'Midfielder (Left)', shortLabel: 'ML' },
  'M(C)': { x: 50, y: 45, label: 'Midfielder (Centre)', shortLabel: 'MC' },
  'M(R)': { x: 75, y: 45, label: 'Midfielder (Right)', shortLabel: 'MR' },
  'AM(L)': { x: 25, y: 28, label: 'Attacking Midfielder (Left)', shortLabel: 'AML' },
  'AM(C)': { x: 50, y: 28, label: 'Attacking Midfielder (Centre)', shortLabel: 'AMC' },
  'AM(R)': { x: 75, y: 28, label: 'Attacking Midfielder (Right)', shortLabel: 'AMR' },
  'ST(C)': { x: 50, y: 12, label: 'Striker', shortLabel: 'ST' },
};

const POSITION_TO_GROUP = {
  'GK': 'GK',
  'D(L)': 'D-LR',
  'D(C)': 'D-C',
  'D(R)': 'D-LR',
  'WB(L)': 'WB-LR',
  'WB(R)': 'WB-LR',
  'DM': 'DM',
  'M(L)': 'M-LR',
  'M(C)': 'M-C',
  'M(R)': 'M-LR',
  'AM(L)': 'AM-LR',
  'AM(C)': 'AM-C',
  'AM(R)': 'AM-LR',
  'ST(C)': 'ST',
};

const getRoleFitColor = (score) => {
  if (score >= 15) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
  if (score >= 12) return { text: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' };
  if (score >= 9) return { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' };
  if (score >= 6) return { text: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' };
  return { text: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' };
};

const CAMEL_TO_FM26_ATTR_MAP = {
  crossing: 'Crossing', dribbling: 'Dribbling', finishing: 'Finishing', firstTouch: 'First Touch',
  heading: 'Heading', longShots: 'Long Shots', marking: 'Marking', passing: 'Passing',
  tackling: 'Tackling', technique: 'Technique', corners: 'Corners', freeKickTaking: 'Free Kick Taking',
  longThrows: 'Long Throws', penaltyTaking: 'Penalty Taking', aggression: 'Aggression',
  anticipation: 'Anticipation', bravery: 'Bravery', composure: 'Composure', concentration: 'Concentration',
  decisions: 'Decisions', determination: 'Determination', flair: 'Flair', leadership: 'Leadership',
  offTheBall: 'Off the Ball', positioning: 'Positioning', teamwork: 'Team Work', vision: 'Vision',
  workRate: 'Work Rate', acceleration: 'Acceleration', agility: 'Agility', balance: 'Balance',
  jumpingReach: 'Jumping', naturalFitness: 'Natural Fitness', pace: 'Pace', stamina: 'Stamina',
  strength: 'Strength', aerialReach: 'Aerial Reach', commandOfArea: 'Command of Area',
  communication: 'Communication', eccentricity: 'Eccentricity', handling: 'Handling', kicking: 'Kicking',
  oneOnOnes: 'One on Ones', punching: 'Punching', reflexes: 'Reflexes', rushingOut: 'Rushing Out',
  throwing: 'Throwing',
};

const convertAttrsToFM26Format = (camelAttrs) => {
  const fm26Attrs = {};
  for (const [camelKey, value] of Object.entries(camelAttrs || {})) {
    const fm26Key = CAMEL_TO_FM26_ATTR_MAP[camelKey];
    if (fm26Key) {
      fm26Attrs[fm26Key] = value;
    }
  }
  return fm26Attrs;
};

const FM26_TO_CAMEL_ATTR_MAP = Object.fromEntries(
  Object.entries(CAMEL_TO_FM26_ATTR_MAP).map(([camel, fm26]) => [fm26.toLowerCase().replace(/\s+/g, ''), camel])
);

const ATTR_TO_GROUP_MAP_OUTFIELD = (() => {
  const map = {};
  const outfieldOrder = ['Technical', 'Set Pieces', 'Mental', 'Physical'];
  for (const group of outfieldOrder) {
    for (const { key } of (ATTRIBUTE_GROUPS_V26[group] || [])) {
      if (!map[key]) map[key] = group;
    }
  }
  return map;
})();

const ATTR_TO_GROUP_MAP_GK = (() => {
  const map = {};
  const gkOrder = ['Goalkeeping', 'Mental', 'Physical', 'Technical', 'Set Pieces'];
  for (const group of gkOrder) {
    const attrs = group === 'Technical' ? (ATTRIBUTE_GROUPS_GK_OVERRIDES.Technical || []) : (ATTRIBUTE_GROUPS_V26[group] || []);
    for (const { key } of attrs) {
      if (!map[key]) map[key] = group;
    }
  }
  return map;
})();

const categorizeRoleAttributesByGroup = (role, playerAttrs, isGK = false) => {
  if (!role) return {};
  
  const keySet = new Set((role.key || []).map(a => a.toLowerCase().replace(/\s+/g, '')));
  const prefSet = new Set((role.preferred || []).map(a => a.toLowerCase().replace(/\s+/g, '')));
  const unnecessarySet = new Set((role.unnecessary || []).map(a => a.toLowerCase().replace(/\s+/g, '')));
  
  const allRoleAttrs = [...(role.key || []), ...(role.preferred || []), ...(role.unnecessary || [])];
  const grouped = { Technical: [], 'Set Pieces': [], Mental: [], Physical: [], Goalkeeping: [] };
  const groupMap = isGK ? ATTR_TO_GROUP_MAP_GK : ATTR_TO_GROUP_MAP_OUTFIELD;
  
  for (const fm26Name of allRoleAttrs) {
    const normalized = fm26Name.toLowerCase().replace(/\s+/g, '');
    const camelKey = FM26_TO_CAMEL_ATTR_MAP[normalized];
    if (!camelKey) continue;
    
    const group = groupMap[camelKey];
    if (!group || !grouped[group]) continue;
    
    const value = playerAttrs?.[camelKey];
    if (typeof value !== 'number') continue;
    
    const type = keySet.has(normalized) ? 'key' : prefSet.has(normalized) ? 'preferred' : unnecessarySet.has(normalized) ? 'unnecessary' : 'preferred';
    
    if (!grouped[group].some(x => x.key === camelKey)) {
      grouped[group].push({ key: camelKey, name: fm26Name, value, type });
    }
  }
  
  for (const group of Object.keys(grouped)) {
    grouped[group].sort((a, b) => {
      const priority = { key: 0, preferred: 1, unnecessary: 2 };
      return priority[a.type] - priority[b.type];
    });
  }
  
  return grouped;
};

const getPositionColor = (rating) => {
  if (rating >= 15) return { bg: '#22c55e', border: '#16a34a', text: '#fff' };
  if (rating >= 10) return { bg: '#eab308', border: '#ca8a04', text: '#1e293b' };
  if (rating >= 5) return { bg: '#f97316', border: '#ea580c', text: '#fff' };
  return { bg: '#475569', border: '#334155', text: '#94a3b8' };
};

const FootballPitch = ({ positionRatings = {}, selectedPosition, onSelectPosition, dark }) => {
  return (
    <div className="relative w-full" style={{ paddingBottom: '130%' }}>
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 130"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Pitch background */}
        <rect x="0" y="0" width="100" height="130" fill="#1a5a32" />
        
        {/* Outer border */}
        <rect x="4" y="4" width="92" height="122" fill="none" stroke="#2d7a4a" strokeWidth="0.8" />
        
        {/* Center line */}
        <line x1="4" y1="65" x2="96" y2="65" stroke="#2d7a4a" strokeWidth="0.5" />
        
        {/* Center circle */}
        <circle cx="50" cy="65" r="10" fill="none" stroke="#2d7a4a" strokeWidth="0.5" />
        <circle cx="50" cy="65" r="1" fill="#2d7a4a" />
        
        {/* Top penalty area */}
        <rect x="22" y="4" width="56" height="18" fill="none" stroke="#2d7a4a" strokeWidth="0.5" />
        <rect x="34" y="4" width="32" height="7" fill="none" stroke="#2d7a4a" strokeWidth="0.5" />
        
        {/* Bottom penalty area */}
        <rect x="22" y="108" width="56" height="18" fill="none" stroke="#2d7a4a" strokeWidth="0.5" />
        <rect x="34" y="119" width="32" height="7" fill="none" stroke="#2d7a4a" strokeWidth="0.5" />
        
        {/* Position markers */}
        {Object.entries(POSITION_MAP).map(([posKey, pos]) => {
          const rating = positionRatings[posKey] ?? 0;
          const colors = getPositionColor(rating);
          const isSelected = selectedPosition === posKey;
          const cx = pos.x;
          const cy = pos.y * 1.3;
          
          return (
            <g 
              key={posKey} 
              onClick={() => onSelectPosition?.(posKey)}
              style={{ cursor: 'pointer' }}
            >
              {isSelected && (
                <circle cx={cx} cy={cy} r="7" fill="none" stroke="#fff" strokeWidth="1.5" />
              )}
              <circle 
                cx={cx} 
                cy={cy} 
                r="5.5" 
                fill={colors.bg}
                stroke={isSelected ? '#fff' : colors.border}
                strokeWidth="0.8"
              />
              <text 
                x={cx} 
                y={cy - 1} 
                textAnchor="middle" 
                dominantBaseline="middle"
                fill={colors.text}
                fontSize="3.2"
                fontWeight="600"
              >
                {pos.shortLabel}
              </text>
              <text 
                x={cx} 
                y={cy + 2.5} 
                textAnchor="middle" 
                dominantBaseline="middle"
                fill={colors.text}
                fontSize="2.8"
                fontWeight="500"
              >
                {rating > 0 ? rating : '-'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Deterministic pseudo-random 0..1 from string
const hash01 = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return ((h >>> 0) % 1000) / 999;
};

const ALL_GROUP_ATTR_KEYS = (() => {
  const set = new Set();
  Object.values(ATTRIBUTE_GROUPS_V26).forEach((arr) => arr.forEach((x) => set.add(x.key)));
  return Array.from(set);
})();

const enrichPlayerForAttributeGroups = (player) => {
  const p = player || {};
  const attrs = { ...(p.attrs || {}) };
  const isGK = isGoalkeeperPlayer(p);

  const ca = typeof p.ca === 'number' ? p.ca : 130;
  // Base 6..16-ish
  const core = clamp(Math.round(ca / 10), 6, 16);

  ALL_GROUP_ATTR_KEYS.forEach((k) => {
    if (typeof attrs[k] === 'number') return;

    const r = hash01(`${p.id || p.name || 'p'}:${k}`);
    const jitter = Math.round((r - 0.5) * 6); // -3..+3

    const isGKAttr = ATTRIBUTE_GROUPS_V26.Goalkeeping.some((x) => x.key === k);

    if (isGK) {
      // GK has strong GK attrs; reasonable outfield baseline for the rest.
      if (isGKAttr) attrs[k] = clamp(core + 4 + jitter, 8, 20);
      else attrs[k] = clamp(core + jitter, 4, 18);
    } else {
      // Outfield: low GK attributes, but still present.
      if (isGKAttr) attrs[k] = clamp(1 + Math.round(r * 5), 1, 6);
      else attrs[k] = clamp(core + jitter, 3, 18);
    }
  });

  return { ...p, attrs };
};

const getAttributeGroupDefs = (groupName, { isGKContext = false } = {}) => {
  if (isGKContext && ATTRIBUTE_GROUPS_GK_OVERRIDES?.[groupName]) return ATTRIBUTE_GROUPS_GK_OVERRIDES[groupName];
  return ATTRIBUTE_GROUPS_V26?.[groupName] || [];
};

const buildAttributeGroupItems = (attrs = {}, { isGKContext = false } = {}) => {
  const out = {};
  ATTRIBUTE_GROUP_ORDER.forEach((g) => {
    const defs = getAttributeGroupDefs(g, { isGKContext });
    out[g] = defs.map((d) => ({ ...d, value: attrs?.[d.key] }));
  });
  return out;
};

const buildFm26AttributeColumns = (isGKContext, visibleGroups = []) => {
  const has = (g) => (visibleGroups || []).includes(g);

  if (isGKContext) {
    return [
      has('Goalkeeping') ? ['Goalkeeping'] : [],
      has('Mental') ? ['Mental'] : [],
      [
        ...(has('Physical') ? ['Physical'] : []),
        ...(has('Technical') ? ['Technical'] : []),
        ...(has('Set Pieces') ? ['Set Pieces'] : []),
      ],
    ];
  }

  return [
    [
      ...(has('Technical') ? ['Technical'] : []),
      ...(has('Set Pieces') ? ['Set Pieces'] : []),
    ],
    has('Mental') ? ['Mental'] : [],
    [
      ...(has('Physical') ? ['Physical'] : []),
      ...(has('Goalkeeping') ? ['Goalkeeping'] : []),
    ],
  ];
};




// ============================================
// Wireframe Container
// ============================================
const WireframeContainer = ({ title, description, children, dark = true }) => (
  <div className="mb-12">
    <div className="mb-4">
      <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {description && <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>}
    </div>
    <div className={`rounded-2xl overflow-hidden ${dark ? 'shadow-2xl shadow-black/20' : 'shadow-xl shadow-slate-200/50'}`}>
      {children}
    </div>
  </div>
);

// ============================================
// Core UI Components
// ============================================

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon = null, dark = false, className = '', disabled = false, loading = false, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5',
    secondary: dark ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600/50 hover:border-slate-500' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm',
    ghost: dark ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
    gold: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2 text-sm gap-2', lg: 'px-6 py-3 text-base gap-2' };
  return (
    <button className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />}
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default', size = 'sm', dark }) => {
  const variants = {
    default: dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700',
    primary: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
    gold: 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 border border-amber-500/30',
  };
  const sizes = { xs: 'px-1.5 py-0.5 text-[10px]', sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
  return <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>{children}</span>;
};

const ProgressBar = ({ value, max = 100, variant = 'primary', size = 'md' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const variants = { primary: 'bg-blue-500', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-red-500' };
  const sizes = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
  return (
    <div className={`w-full bg-slate-700/50 rounded-full overflow-hidden ${sizes[size]}`}>
      <div className={`${sizes[size]} ${variants[variant]} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const AttributeValue = ({ value, size = 'md' }) => {
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };
  const isNum = typeof value === 'number' && !Number.isNaN(value);

  if (!isNum) {
    return (
      <span className={`inline-flex items-center justify-center font-bold rounded-lg text-slate-400 bg-slate-500/10 border border-slate-500/20 ${sizes[size]}`}>
        —
      </span>
    );
  }

  const getColor = (val) => {
    if (val >= 18) return 'text-emerald-400 bg-emerald-500/10';
    if (val >= 15) return 'text-green-400 bg-green-500/10';
    if (val >= 12) return 'text-yellow-400 bg-yellow-500/10';
    if (val >= 8) return 'text-orange-400 bg-orange-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  return (
    <span className={`inline-flex items-center justify-center font-bold rounded-lg ${getColor(value)} ${sizes[size]}`}>
      {value}
    </span>
  );
};

const AttributeTooltip = ({ label, tooltip, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div 
      className="relative inline-flex items-center gap-1 cursor-help group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {tooltip && show && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-56 p-2 text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-lg shadow-xl pointer-events-none">
          <div className="font-medium text-slate-100 mb-1">{label}</div>
          <div className="text-slate-400 leading-relaxed">{tooltip}</div>
        </div>
      )}
    </div>
  );
};

const Card = ({ children, className = '', dark, hover = false }) => {
  const bg = dark ? 'bg-slate-800' : 'bg-white';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const hoverClass = hover ? (dark ? 'hover:bg-slate-700/50 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer') : '';
  return <div className={`${bg} rounded-2xl border ${border} ${hoverClass} ${className}`}>{children}</div>;
};

const Avatar = ({ name, size = 'md', dark }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' };
  const bg = dark ? 'bg-slate-700' : 'bg-slate-200';
  const text = dark ? 'text-slate-300' : 'text-slate-600';
  return <div className={`${sizes[size]} rounded-xl ${bg} flex items-center justify-center ${text} font-medium`}>{name?.charAt(0)?.toUpperCase() || <Users size={size === 'sm' ? 14 : 18} />}</div>;
};

const Toast = ({ variant = 'info', title, message, action, dark }) => {
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const configs = {
    info: { bg: 'bg-blue-500/10 border-blue-500/20', icon: HelpCircle, color: 'text-blue-500' },
    success: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2, color: 'text-emerald-500' },
    warning: { bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertCircle, color: 'text-amber-500' },
    error: { bg: 'bg-red-500/10 border-red-500/20', icon: XCircle, color: 'text-red-500' },
  };
  const { bg, icon: Icon, color } = configs[variant];
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${bg} border`}>
      <Icon className={color} size={20} />
      <div className="flex-1">
        <div className={`text-sm font-medium ${color.replace('-500', '-400')}`}>{title}</div>
        {message && <div className={`text-xs ${muted}`}>{message}</div>}
      </div>
      {action && <Button variant="ghost" size="sm" dark={dark}>{action}</Button>}
    </div>
  );
};

const Skeleton = ({ className = '', dark }) => (
  <div className={`${dark ? 'bg-slate-700' : 'bg-slate-200'} rounded animate-pulse ${className}`} />
);

const EmptyState = ({ icon: Icon, title, description, action, dark }) => {
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const text = dark ? 'text-white' : 'text-slate-900';
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className={`w-16 h-16 rounded-2xl ${dark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center mb-4`}>
        <Icon size={32} className={muted} />
      </div>
      <h3 className={`font-semibold ${text} mb-2`}>{title}</h3>
      <p className={`text-sm ${muted} max-w-sm mb-4`}>{description}</p>
      {action}
    </div>
  );
};

// ============================================
// Sidebar Component
// ============================================
const Sidebar = ({ dark, collapsed, activeNav, gameLoaded = false }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const hover = dark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';

  const mainNav = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'players', icon: Users, label: 'Players', disabled: !gameLoaded },
    { id: 'staff', icon: UserCog, label: 'Staff', disabled: !gameLoaded },
    { id: 'clubs', icon: Building2, label: 'Clubs', disabled: !gameLoaded },
    { id: 'shortlists', icon: List, label: 'Shortlists', disabled: !gameLoaded },
  ];

  const toolsNav = [
    { id: 'ratings', icon: Sliders, label: 'Custom Ratings', disabled: !gameLoaded },
    { id: 'history', icon: History, label: 'History Points', disabled: !gameLoaded },
    { id: 'comparison', icon: GitCompare, label: 'Compare', disabled: !gameLoaded },
  ];

  const proNav = [
    { id: 'toplists', icon: Trophy, label: 'Top Lists', pro: true },
    { id: 'squadgap', icon: Grid, label: 'Squad Gap Analyzer', pro: true },
    { id: 'replacement', icon: GitCompare, label: 'Replacement Finder', pro: true },
    { id: 'shortlistopt', icon: Zap, label: 'Shortlist Optimizer', pro: true },
    { id: 'dealintel', icon: DollarSign, label: 'Deal Intelligence', pro: true },
    { id: 'contractradar', icon: Clock, label: 'Contract & Clause Radar', pro: true },
    { id: 'rolefinder', icon: Target, label: 'Role Finder', pro: true },
    { id: 'radar', icon: Eye, label: 'Radar', pro: true },
    { id: 'transferplan', icon: MapPin, label: 'Transfer Plan', pro: true },
    { id: 'presetmarket', icon: Star, label: 'Preset Marketplace', pro: true },
    { id: 'reports', icon: FileText, label: 'Pro Reports', pro: true },
  ];

  if (collapsed) {
    return (
      <aside className={`w-16 shrink-0 ${dark ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl border-r ${border} flex flex-col items-center py-4`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
          <Sparkles className="text-white" size={18} />
        </div>
        {mainNav.map((item, i) => (
          <button key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all ${activeNav === item.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : item.disabled ? `${muted} opacity-40` : `${muted} ${hover}`}`}>
            <item.icon size={20} />
          </button>
        ))}
        <div className={`w-8 border-t ${border} my-3`} />
        {toolsNav.map((item, i) => (
          <button key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${item.disabled ? `${muted} opacity-40` : `${muted} ${hover}`}`}>
            <item.icon size={20} />
          </button>
        ))}
        <div className="mt-auto">
          <button className={`w-10 h-10 rounded-xl flex items-center justify-center ${muted} ${hover}`}><Settings size={20} /></button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`w-64 shrink-0 ${dark ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl border-r ${border} flex flex-col`}>
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Sparkles className="text-white" size={20} />
        </div>
        <div>
          <span className={`font-bold text-lg ${text}`}>Genie Scout</span>
          <div className={`text-[10px] ${muted} flex items-center gap-1`}>
            <div className={`w-1.5 h-1.5 rounded-full ${gameLoaded ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            {gameLoaded ? 'Connected' : 'Not Connected'}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-auto">
        <div className={`text-[10px] uppercase tracking-wider ${muted} px-3 mb-2`}>Main</div>
        {mainNav.map((item, i) => (
          <button key={i} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all ${activeNav === item.id ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-400 border border-blue-500/20' : item.disabled ? `${muted} opacity-40` : `${muted} ${hover}`}`}>
            <item.icon size={18} />
            <span className="text-sm font-medium">{item.label}</span>
            {item.disabled && <div className="ml-auto w-2 h-2 rounded-full bg-slate-600" />}
          </button>
        ))}
        <div className={`border-t ${border} my-4`} />
        <div className={`text-[10px] uppercase tracking-wider ${muted} px-3 mb-2`}>Tools</div>
        {toolsNav.map((item, i) => (
          <button key={i} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${item.disabled ? `${muted} opacity-40` : `${muted} ${hover}`}`}>
            <item.icon size={18} />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
        <div className={`border-t ${border} my-4`} />
        <div className={`text-[10px] uppercase tracking-wider text-amber-500 px-3 mb-2 flex items-center gap-1`}><Crown size={10} /> g Edition</div>
        {proNav.map((item, i) => (
          <button key={i} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${muted} opacity-40`}>
            <item.icon size={18} />
            <span className="text-sm font-medium">{item.label}</span>
            <Crown size={12} className="ml-auto text-amber-500/50" />
          </button>
        ))}
      </nav>

      <div className="p-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="text-amber-500" size={16} />
            <span className={`font-semibold ${text} text-sm`}>Unlock More</span>
          </div>
          <p className={`text-xs ${muted} mb-3`}>Get advanced projections and more.</p>
          <Button variant="gold" size="sm" className="w-full">Upgrade Now</Button>
        </div>
      </div>
    </aside>
  );
};

// ============================================
// Header Component
// ============================================
const Header = ({ dark, gameLoaded, onQuickAction }) => {
  const [qaOpen, setQaOpen] = useState(false);
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const text = dark ? 'text-white' : 'text-slate-900';
  const surface = dark ? 'bg-slate-800/50 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const hover = dark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';

  const groups = [
    {
      label: 'Load Game',
      items: [
        { id: 'load', icon: Play, label: 'Detect Running FM', hint: 'Auto-detect active save' },
        { id: 'reload', icon: RefreshCw, label: 'Reload last save', hint: 'Use last loaded save' },
        { id: 'browse', icon: FolderOpen, label: 'Browse save file', hint: 'Manual .fm selection' },
      ],
    },
    {
      label: 'Shortlists',
      items: [
        { id: 'shortlists', icon: List, label: 'Open shortlists', hint: 'My Shortlist panel' },
        { id: 'import_shortlist', icon: Upload, label: 'Import shortlist', hint: 'From FM / file' },
        { id: 'export_shortlist', icon: Download, label: 'Export shortlist', hint: 'HTML / CSV / XLSX' },
      ],
    },
    {
      label: 'Search',
      items: [
        { id: 'search_players', icon: Users, label: 'Search players', hint: 'Filters + presets' },
        { id: 'search_staff', icon: UserCog, label: 'Search staff', hint: 'Role presets + stars' },
        { id: 'search_clubs', icon: Building2, label: 'Search clubs', hint: 'Facilities + finances' },
      ],
    },
  ];

  const handleAction = (actionId) => {
    setQaOpen(false);
    onQuickAction?.(actionId);
  };

  return (
    <header className={`h-16 ${surface} border-b ${border} flex items-center px-6 gap-4 relative`}>
      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          icon={Zap}
          dark={dark}
          onClick={() => setQaOpen(v => !v)}
          className="min-w-[44px]"
          aria-haspopup="menu"
          aria-expanded={qaOpen}
        >
          <span className="hidden sm:inline">Quick</span>
          <ChevronDown size={14} className={`${muted} ml-1`} />
        </Button>

        {qaOpen && (
          <div
            role="menu"
            className={`absolute left-0 mt-2 w-[360px] rounded-2xl border ${border} ${dark ? 'bg-slate-900/95' : 'bg-white/95'} shadow-2xl overflow-hidden z-50`}
          >
            {groups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? `border-t ${border}` : ''}>
                <div className={`px-4 py-2 text-[10px] uppercase tracking-wider ${muted}`}>{group.label}</div>
                <div className="p-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAction(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${hover}`}
                    >
                      <div className={`w-8 h-8 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center border ${border}`}>
                        <item.icon size={16} className="text-blue-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-medium ${text}`}>{item.label}</div>
                        <div className={`text-xs ${muted}`}>{item.hint}</div>
                      </div>
                      <ChevronRight size={16} className={muted} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={`p-3 border-t ${border}`}>
              <Button variant="ghost" size="sm" dark={dark} className="w-full" onClick={() => setQaOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={`flex-1 max-w-xl flex items-center gap-3 ${dark ? 'bg-slate-800/50' : 'bg-slate-100'} rounded-xl px-4 py-2.5 border ${border}`}>
        <Search size={18} className={muted} />
        <input type="text" placeholder="Search players, staff, clubs... (Ctrl+K)" className={`flex-1 bg-transparent outline-none text-sm ${text}`} />
        <kbd className={`px-2 py-0.5 rounded text-xs ${dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>⌘K</kbd>
      </div>

      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${gameLoaded ? `${dark ? 'bg-emerald-500/10' : 'bg-emerald-50'} border-emerald-500/20` : `${dark ? 'bg-amber-500/10' : 'bg-amber-50'} border-amber-500/20`} border`}>
        <div className="relative">
          <div className={`w-2.5 h-2.5 ${gameLoaded ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full`} />
          {!gameLoaded && <div className="absolute inset-0 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping opacity-50" />}
        </div>
        <span className={`text-sm font-medium ${gameLoaded ? 'text-emerald-400' : 'text-amber-400'}`}>{gameLoaded ? 'FM 26 Connected' : 'No Game Loaded'}</span>
      </div>

      <div className="flex items-center gap-1">
        {[Bell, HelpCircle, Sun, Settings].map((Icon, i) => (
          <button key={i} className={`p-2.5 rounded-xl ${hover}`}><Icon size={20} className={muted} /></button>
        ))}
      </div>
    </header>
  );
};


// ============================================
// Rating Engine (FM26): Roles, Modifier Packs, Scoring Helpers
// ============================================


const normalizeWeights = (weights) => {
  const entries = Object.entries(weights || {}).filter(([, w]) => Number(w) > 0);
  const sum = entries.reduce((s, [, w]) => s + Number(w), 0);
  if (!sum) return {};
  const out = {};
  entries.forEach(([k, w]) => { out[k] = Number(w) / sum; });
  return out;
};

// Attribute groups used by the Coefficient Editor (subset for prototype)
const FM26_ATTRIBUTE_GROUPS = [
  { id: 'technical', label: 'Technical', keys: ['crossing', 'dribbling', 'firstTouch', 'finishing', 'passing', 'technique', 'tackling'] },
  { id: 'mental', label: 'Mental', keys: ['anticipation', 'composure', 'decisions', 'offTheBall', 'positioning', 'teamwork', 'vision', 'workRate'] },
  { id: 'physical', label: 'Physical', keys: ['acceleration', 'agility', 'balance', 'pace', 'stamina', 'strength'] },
];

// FM26 role library (prototype subset). Each role defines separate IP/OOP baseline weights.
const FM26_ROLE_LIBRARY = [
  {
    id: 'afba',
    name: 'Attacking Full-Back (A)',
    positionGroup: 'FB/WB',
    ipWeights: { pace: 12, acceleration: 10, stamina: 10, crossing: 9, dribbling: 7, passing: 6, teamwork: 4, workRate: 6, offTheBall: 5, decisions: 4 },
    oopWeights: { tackling: 10, positioning: 10, anticipation: 8, pace: 6, stamina: 6, strength: 5, decisions: 5, teamwork: 4, workRate: 6 },
  },
  {
    id: 'iwsa',
    name: 'Inverted Winger (S)',
    positionGroup: 'W/AM',
    ipWeights: { dribbling: 12, technique: 9, firstTouch: 8, pace: 9, acceleration: 8, passing: 7, vision: 6, offTheBall: 7, decisions: 5, finishing: 4 },
    oopWeights: { workRate: 7, teamwork: 6, positioning: 5, tackling: 4, stamina: 6, pace: 5, anticipation: 4 },
  },
  {
    id: 'apss',
    name: 'Advanced Playmaker (S)',
    positionGroup: 'AM/CM',
    ipWeights: { passing: 12, vision: 10, technique: 8, firstTouch: 7, decisions: 8, offTheBall: 6, dribbling: 6, composure: 6, teamwork: 4 },
    oopWeights: { workRate: 5, teamwork: 6, positioning: 5, tackling: 4, stamina: 5, anticipation: 4, decisions: 4 },
  },
  {
    id: 'dlpd',
    name: 'Deep-Lying Playmaker (D)',
    positionGroup: 'DM/CM',
    ipWeights: { passing: 10, vision: 8, decisions: 8, technique: 6, composure: 7, teamwork: 6, positioning: 7 },
    oopWeights: { positioning: 10, tackling: 8, anticipation: 7, decisions: 6, teamwork: 6, stamina: 5, strength: 5 },
  },
  {
    id: 'bpd',
    name: 'Ball-Playing Defender (D)',
    positionGroup: 'CB',
    ipWeights: { passing: 8, technique: 5, composure: 8, decisions: 7, vision: 5, firstTouch: 4 },
    oopWeights: { tackling: 10, positioning: 10, anticipation: 8, strength: 8, pace: 5, decisions: 6, composure: 6 },
  },
  {
    id: 'nccb',
    name: 'No-Nonsense Centre-Back (D)',
    positionGroup: 'CB',
    ipWeights: { passing: 2, technique: 2, composure: 4 },
    oopWeights: { tackling: 11, positioning: 11, anticipation: 9, strength: 10, pace: 4, decisions: 6, bravery: 0 }, // bravery omitted from groups (kept 0)
  },
  {
    id: 'pf',
    name: 'Pressing Forward (A)',
    positionGroup: 'ST',
    ipWeights: { finishing: 8, offTheBall: 8, pace: 8, acceleration: 7, dribbling: 5, firstTouch: 6, composure: 6, decisions: 5, teamwork: 6, workRate: 10, stamina: 8 },
    oopWeights: { workRate: 10, teamwork: 8, stamina: 9, pace: 6, anticipation: 6, tackling: 4, positioning: 4, decisions: 5 },
  },
  {
    id: 'af',
    name: 'Advanced Forward (A)',
    positionGroup: 'ST',
    ipWeights: { finishing: 10, offTheBall: 10, pace: 10, acceleration: 9, dribbling: 6, firstTouch: 7, composure: 7, decisions: 5 },
    oopWeights: { workRate: 5, teamwork: 4, stamina: 5, pace: 4, anticipation: 4, decisions: 4 },
  },
];

const FM26_ROLE_GROUPS = ['ALL', 'GK', 'FB/WB', 'CB', 'DM/CM', 'AM/CM', 'W/AM', 'ST'];

// Modifier packs apply deltas to weights (prototype deltas; replace with final doc tables)
const FM26_MODIFIER_PACKS = [
  { id: 'pressing_intensity', name: 'Pressing Intensity', scope: 'both', deltas: { workRate: 2, stamina: 2, teamwork: 1, anticipation: 1 } },
  { id: 'ball_progression', name: 'Ball Progression', scope: 'ip', deltas: { passing: 2, vision: 1, technique: 1, firstTouch: 1 } },
  { id: 'chance_creation', name: 'Chance Creation', scope: 'ip', deltas: { dribbling: 1, passing: 1, vision: 1, offTheBall: 1 } },
  { id: 'defensive_duels', name: 'Defensive Duels', scope: 'oop', deltas: { tackling: 2, positioning: 2, strength: 1, anticipation: 1 } },
  { id: 'athleticism', name: 'Athleticism', scope: 'both', deltas: { pace: 1, acceleration: 1, stamina: 1, strength: 1 } },
];

const getRoleById = (id) => FM26_ROLE_LIBRARY.find(r => r.id === id) || FM26_ROLE_LIBRARY[0];

const parsePositionsLabel = (positionsLabel, fallbackPos) => {
  const raw = (positionsLabel || fallbackPos || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const uniq = [];
  raw.forEach((p) => { if (!uniq.includes(p)) uniq.push(p); });
  return uniq.length ? uniq : (fallbackPos ? [fallbackPos] : []);
};

const guessRoleIdsFromPos = (pos = '') => {
  const p = String(pos || '').toUpperCase();
  // Best-effort defaults (prototype) — adjust when full FM26 role library is wired.
  if (p.includes('RW') || p.includes('LW') || p.includes('AM(R') || p.includes('AM(L') || p.includes('W')) return { ip: 'iwsa', oop: 'iwsa' };
  if (p.includes('ST')) return { ip: 'af', oop: 'pf' };
  if (p.includes('DM')) return { ip: 'dlpd', oop: 'dlpd' };
  if (p.includes('AM') || p.includes('AMC')) return { ip: 'apss', oop: 'apss' };
  if (p.includes('CM')) return { ip: 'apss', oop: 'dlpd' };
  if (p.includes('CB')) return { ip: 'bpd', oop: 'nccb' };
  if (p.includes('WB') || p.includes('FB')) return { ip: 'afba', oop: 'afba' };
  return { ip: FM26_ROLE_LIBRARY[0]?.id || 'afba', oop: FM26_ROLE_LIBRARY[0]?.id || 'afba' };
};

const guessRoleGroupFromPosition = (positionLabel = '') => {
  const p = String(positionLabel || '').toUpperCase();
  if (p.includes('GK')) return 'GK';
  if (p.includes('CB')) return 'CB';
  if (p.includes('WB') || p.includes('FB')) return 'FB/WB';
  if (p.includes('DM')) return 'DM/CM';
  if (p.includes('AM') || p.includes('W') || p.includes('RW') || p.includes('LW')) return 'W/AM';
  if (p.includes('ST')) return 'ST';
  if (p.includes('CM')) return 'DM/CM';
  return 'ALL';
};

const applyModifierPacks = (baseWeights, selectedPackIds = [], scope = 'ip') => {
  const w = { ...(baseWeights || {}) };
  selectedPackIds.forEach((pid) => {
    const pack = FM26_MODIFIER_PACKS.find(p => p.id === pid);
    if (!pack) return;
    if (pack.scope !== 'both' && pack.scope !== scope) return;
    Object.entries(pack.deltas || {}).forEach(([k, delta]) => {
      w[k] = clamp((w[k] || 0) + delta, 0, 20);
    });
  });
  return normalizeWeights(w);
};

const calcPhaseScore = (attrs = {}, normalizedWeights = {}) => {
  const entries = Object.entries(normalizedWeights || {});
  if (!entries.length) return 0;
  const weighted = entries.reduce((s, [k, w]) => s + (Number(attrs[k]) || 0) * w, 0);
  return Math.round((weighted / 20) * 100);
};

const calcRolePairScore = ({ attrs, ipWeights, oopWeights, mix }) => {
  const ip = calcPhaseScore(attrs, ipWeights);
  const oop = calcPhaseScore(attrs, oopWeights);
  const total = Math.round(ip * (mix?.ip ?? 1) + oop * (mix?.oop ?? 0));
  return { ip, oop, total };
};

const buildEffectiveWeights = (baseWeights, overrides = {}, packIds = [], scope = 'ip') => {
  const merged = { ...(baseWeights || {}) };
  Object.entries(overrides || {}).forEach(([k, v]) => {
    merged[k] = clamp(Number(v) || 0, 0, 20);
  });
  return applyModifierPacks(merged, packIds, scope);
};

// ============================================
// Rating Engine UI Components
// ============================================

const RolePairSelector = ({
  dark,
  mode = 'pair', // 'pair' | 'single'
  ipRoleId,
  oopRoleId,
  onModeChange,
  onChange,
  compact = false,
}) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';

  const [group, setGroup] = useState('ALL');

  const base = FM26_ROLE_LIBRARY
    .filter(r => (group === 'ALL' ? true : r.positionGroup === group))
    .map(r => ({ id: r.id, name: r.name }));

  // Ensure selected roles remain visible even if group filter would hide them.
  const optById = new Map(base.map(o => [o.id, o]));
  [ipRoleId, oopRoleId].forEach((id) => {
    if (!id) return;
    if (optById.has(id)) return;
    const r = getRoleById(id);
    optById.set(id, { id: r.id, name: r.name });
  });
  const options = Array.from(optById.values());

  const ipRole = getRoleById(ipRoleId);
  const oopRole = getRoleById(oopRoleId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className={`text-sm font-semibold ${text}`}>{compact ? 'Role Fit' : 'Role Pair Selector'}</div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onModeChange?.('pair')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${border} ${mode === 'pair' ? 'bg-blue-500 text-white border-blue-500/30' : dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'}`}
          >
            IP + OOP
          </button>
          <button
            onClick={() => onModeChange?.('single')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${border} ${mode === 'single' ? 'bg-blue-500 text-white border-blue-500/30' : dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'}`}
          >
            IP only
          </button>
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2">
          {FM26_ROLE_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${group === g ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : `${dark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} ${muted}`}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
        <div>
          <label className={`text-xs ${muted} block mb-1`}>In Possession (IP)</label>
          <select
            value={ipRoleId}
            onChange={(e) => onChange?.({ ipRoleId: e.target.value, oopRoleId })}
            className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'}`}
          >
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {mode === 'pair' && (
          <div>
            <label className={`text-xs ${muted} block mb-1`}>Out of Possession (OOP)</label>
            <select
              value={oopRoleId}
              onChange={(e) => onChange?.({ ipRoleId, oopRoleId: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'}`}
            >
              {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {!compact && (
        <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-500 mt-0.5" />
            <div className="flex-1">
              <div className={`text-sm font-medium ${text}`}>{ipRole.name}{mode === 'pair' ? ` ↔ ${oopRole.name}` : ''}</div>
              <div className={`text-xs ${muted} mt-1`}>Role pair selection feeds Search “Role Fit”, Top Lists sorting, and Live Preview.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CoefficientEditor = ({
  dark,
  title,
  scope = 'ip',
  baseWeights,
  overrides,
  onOverrideChange,
  selectedPacks,
  onTogglePack,
  showAdvanced = true,
}) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';

  const allKeys = Array.from(new Set([
    ...Object.keys(baseWeights || {}),
    ...Object.keys(overrides || {}),
    ...FM26_ATTRIBUTE_GROUPS.flatMap(g => g.keys),
  ]));

  const getVal = (k) => {
    if (overrides && overrides[k] !== undefined) return overrides[k];
    return baseWeights?.[k] ?? 0;
  };

  return (
    <Card dark={dark} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-sm font-semibold ${text}`}>{title}</div>
          <div className={`text-xs ${muted}`}>Override weights (0–20). Packs apply deltas after overrides.</div>
        </div>
        <Badge variant={scope === 'ip' ? 'primary' : 'warning'}>{scope.toUpperCase()}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FM26_MODIFIER_PACKS.filter(p => p.scope === 'both' || p.scope === scope).map((p) => {
          const active = (selectedPacks || []).includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onTogglePack?.(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${border} ${active ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'}`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {FM26_ATTRIBUTE_GROUPS.map((group) => (
          <div key={group.id}>
            <div className={`text-[10px] uppercase tracking-wider ${muted} mb-2`}>{group.label}</div>
            <div className="grid grid-cols-2 gap-3">
              {group.keys.filter(k => showAdvanced ? true : allKeys.includes(k)).map((k) => (
                <div key={k} className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-xs font-medium ${text}`}>{k}</div>
                    <div className={`text-xs ${muted}`}>{getVal(k)}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={getVal(k)}
                    onChange={(e) => onOverrideChange?.(k, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const RolePairLivePreview = ({ dark, title = 'Live Preview', ipWeights, oopWeights, mix }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';

  const samplePlayers = [
    { name: 'Winger A', attrs: { pace: 17, acceleration: 17, dribbling: 16, passing: 12, finishing: 11, offTheBall: 15, workRate: 12, stamina: 13, decisions: 12, vision: 12, technique: 15, crossing: 13, tackling: 7, positioning: 7, anticipation: 10, composure: 12, strength: 9, firstTouch: 14, teamwork: 11, agility: 15, balance: 12 } },
    { name: 'Fullback B', attrs: { pace: 15, acceleration: 14, dribbling: 12, passing: 11, finishing: 6, offTheBall: 10, workRate: 15, stamina: 16, decisions: 12, vision: 9, technique: 11, crossing: 14, tackling: 13, positioning: 13, anticipation: 12, composure: 11, strength: 12, firstTouch: 10, teamwork: 14, agility: 12, balance: 12 } },
    { name: 'CB C', attrs: { pace: 12, acceleration: 11, dribbling: 7, passing: 10, finishing: 4, offTheBall: 6, workRate: 13, stamina: 13, decisions: 12, vision: 8, technique: 8, crossing: 5, tackling: 15, positioning: 15, anticipation: 14, composure: 13, strength: 16, firstTouch: 8, teamwork: 13, agility: 10, balance: 14 } },
  ];

  return (
    <Card dark={dark} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-sm font-semibold ${text}`}>{title}</div>
          <div className={`text-xs ${muted}`}>Scores update instantly; used for Search “Role Fit” and Top Lists.</div>
        </div>
        <Badge variant="success">Realtime</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {samplePlayers.map((p) => {
          const { ip, oop, total } = calcRolePairScore({ attrs: p.attrs, ipWeights, oopWeights, mix });
          return (
            <div key={p.name} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
              <div className={`font-medium ${text}`}>{p.name}</div>
              <div className={`text-xs ${muted} mt-1`}>Total: <span className="text-blue-400 font-semibold">{total}%</span></div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${muted} uppercase tracking-wider`}>IP</span>
                  <span className={`text-xs ${muted}`}>{ip}%</span>
                </div>
                <ProgressBar value={ip} max={100} variant={ip >= 75 ? 'success' : 'warning'} size="sm" />
                {mix?.oop > 0 && (
                  <>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] ${muted} uppercase tracking-wider`}>OOP</span>
                      <span className={`text-xs ${muted}`}>{oop}%</span>
                    </div>
                    <ProgressBar value={oop} max={100} variant={oop >= 75 ? 'success' : 'warning'} size="sm" />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};


// ============================================
// Screen: Dashboard
// ============================================
const DashboardScreen = ({ dark, gameLoaded, onLoadGame }) => {
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const surfaceSolid = dark ? 'bg-slate-800' : 'bg-white';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const hover = dark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';

  const quickActionStyle = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  };

  return (
    <main className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className={`${surfaceSolid} rounded-3xl p-8 mb-8 border ${border} relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-8">
          <div className="flex-1">
            <h1 className={`text-3xl font-bold ${text} mb-3`}>Welcome to Genie Scout</h1>
            <p className={`${muted} text-lg mb-6 max-w-xl`}>Your ultimate Football Manager companion. Load your save to unlock powerful scouting tools.</p>
            <div className="flex gap-3">
              <Button variant="primary" size="lg" icon={Play} onClick={onLoadGame}>{gameLoaded ? 'Reload Save' : 'Detect Running FM'}</Button>
              <Button variant="secondary" size="lg" icon={FolderOpen} dark={dark}>Browse Files</Button>
            </div>
          </div>
          <div className={`${dark ? 'bg-slate-700/50' : 'bg-slate-100'} rounded-2xl p-6 w-72 shrink-0`}>
            <div className="flex items-center gap-3 mb-4">
              {gameLoaded ? <CheckCircle2 className="text-emerald-500" size={24} /> : <Loader2 className={`${muted} animate-spin`} size={24} />}
              <span className={`font-semibold ${gameLoaded ? text : muted}`}>{gameLoaded ? 'Save Loaded' : 'Waiting for FM...'}</span>
            </div>
            {gameLoaded ? (
              <div className="space-y-3">
                {[{ label: 'Players', value: '251,847' }, { label: 'Staff', value: '89,432' }, { label: 'Clubs', value: '12,458' }].map((stat, i) => (
                  <div key={i} className="flex justify-between"><span className={`text-sm ${muted}`}>{stat.label}</span><span className={`text-sm font-semibold ${text}`}>{stat.value}</span></div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${muted}`}>Launch Football Manager and load a save game to continue.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className={`text-sm font-semibold ${muted} uppercase tracking-wider mb-4`}>Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Users, title: 'Search Players', desc: 'Find your next star', color: 'blue' },
              { icon: List, title: 'Shortlists', desc: 'Manage targets', color: 'emerald' },
              { icon: GitCompare, title: 'Compare', desc: 'Side by side', color: 'purple' },
              { icon: Trophy, title: 'Top Lists', desc: 'Best by position', color: 'amber', pro: true },
              { icon: Target, title: 'Role Finder', desc: 'Find perfect fits', color: 'rose', pro: true },
              { icon: TrendingUp, title: 'Projections', desc: 'Future potential', color: 'cyan', pro: true },
            ].map((item, i) => (
              <Card key={i} dark={dark} hover className={`p-4 ${!gameLoaded && !item.pro ? 'opacity-50' : ''}`}>
                <div className={`w-10 h-10 rounded-xl ${quickActionStyle[item.color]?.bg || quickActionStyle.blue.bg} flex items-center justify-center mb-3`}>
                  <item.icon size={20} className={`${quickActionStyle[item.color]?.text || quickActionStyle.blue.text}`} />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${text}`}>{item.title}</h3>
                  {item.pro && <Crown size={12} className="text-amber-500" />}
                </div>
                <p className={`text-xs ${muted} mt-1`}>{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${muted} uppercase tracking-wider mb-4`}>Getting Started</h2>
          <Card dark={dark} className="divide-y divide-slate-700/50">
            {[
              { step: 1, title: 'Launch Football Manager', done: gameLoaded },
              { step: 2, title: 'Load your save game', done: gameLoaded },
              { step: 3, title: 'Click "Detect Running FM"', done: gameLoaded },
              { step: 4, title: 'Start scouting!', done: false },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 ${hover}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${item.done ? 'bg-emerald-500/20 text-emerald-400' : dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {item.done ? <Check size={16} /> : item.step}
                </div>
                <span className={`${text} ${item.done ? 'line-through opacity-50' : ''}`}>{item.title}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </main>
  );
};

// ============================================
// Screen: Search & Filters (Players / Staff / Clubs)
// ============================================
// NOTE: Sample dataset is shared between Search → Profile to enable real navigation flow.
const SAMPLE_PLAYERS = [
  {
    id: 'p_yamal',
    name: 'Lamine Yamal',
    age: 17,
    dob: '2007-07-13',
    club: 'FC Barcelona',
    nation: '🇪🇸',
    pos: 'RW',
    positionsLabel: 'Right Winger, AM(R)',
    ca: 156,
    pa: 189,
    value: '€120M',
    contract: { until: '2029-06-30', wage: '€65k p/w' },
    lastUpdated: '2025-12-13T08:32:00Z',
    foot: 'Left',
    injury: { status: 'fit' },
    personality: 'Driven',
    mediaHandling: 'Reserved',
    tag: 'hot',
    attrs: {
      pace: 17, acceleration: 17, dribbling: 16, technique: 15, firstTouch: 14, passing: 12, vision: 12,
      offTheBall: 15, decisions: 12, composure: 12, crossing: 13, workRate: 12, teamwork: 11, stamina: 13,
      tackling: 7, positioning: 7, anticipation: 10, strength: 9, agility: 15, balance: 12, finishing: 11,
    },
    form: [7.1, 6.8, 7.4, 7.6, 7.3],
  },
  {
    id: 'p_endrick',
    name: 'Endrick',
    age: 18,
    dob: '2006-07-21',
    club: 'Real Madrid',
    nation: '🇧🇷',
    pos: 'ST',
    positionsLabel: 'Striker (ST)',
    ca: 142,
    pa: 182,
    value: '€80M',
    contract: { until: '2030-06-30', wage: '€55k p/w' },
    lastUpdated: '2025-12-12T19:05:00Z',
    foot: 'Right',
    injury: { status: 'fit' },
    personality: 'Professional',
    mediaHandling: 'Level-headed',
    tag: 'rising',
    attrs: {
      pace: 15, acceleration: 16, dribbling: 13, technique: 13, firstTouch: 13, passing: 10, vision: 9,
      offTheBall: 15, decisions: 12, composure: 14, crossing: 6, workRate: 13, teamwork: 11, stamina: 13,
      tackling: 7, positioning: 8, anticipation: 12, strength: 14, agility: 12, balance: 13, finishing: 16,
    },
    form: [6.9, 7.0, 7.2, 6.7, 7.1],
  },
  {
    id: 'p_wze',
    name: 'Warren Zaïre-Emery',
    age: 18,
    dob: '2006-03-08',
    club: 'PSG',
    nation: '🇫🇷',
    pos: 'CM',
    positionsLabel: 'Central Midfielder (CM)',
    ca: 148,
    pa: 178,
    value: '€90M',
    contract: { until: '2029-06-30', wage: '€90k p/w' },
    lastUpdated: '2025-12-13T11:10:00Z',
    foot: 'Right',
    injury: { status: 'fit' },
    personality: 'Determined',
    mediaHandling: 'Calm',
    attrs: {
      pace: 13, acceleration: 13, dribbling: 12, technique: 12, firstTouch: 12, passing: 14, vision: 13,
      offTheBall: 12, decisions: 13, composure: 13, crossing: 8, workRate: 15, teamwork: 14, stamina: 15,
      tackling: 12, positioning: 12, anticipation: 12, strength: 12, agility: 12, balance: 13, finishing: 9,
    },
    form: [7.0, 6.8, 7.3, 7.1, 7.2],
  },
  {
    id: 'p_gavi',
    name: 'Gavi',
    age: 19,
    dob: '2004-08-05',
    club: 'FC Barcelona',
    nation: '🇪🇸',
    pos: 'CM',
    positionsLabel: 'Central Midfielder (CM)',
    ca: 158,
    pa: 180,
    value: '€100M',
    contract: { until: '2030-06-30', wage: '€120k p/w' },
    lastUpdated: '2025-12-11T15:41:00Z',
    foot: 'Right',
    injury: { status: 'fit' },
    personality: 'Spirited',
    mediaHandling: 'Volatile',
    attrs: {
      pace: 13, acceleration: 14, dribbling: 13, technique: 13, firstTouch: 14, passing: 14, vision: 13,
      offTheBall: 13, decisions: 13, composure: 12, crossing: 9, workRate: 16, teamwork: 15, stamina: 16,
      tackling: 12, positioning: 12, anticipation: 13, strength: 10, agility: 14, balance: 13, finishing: 9,
    },
    form: [7.4, 7.1, 7.0, 7.3, 7.2],
  },
  {
    id: 'p_mainoo',
    name: 'Kobbie Mainoo',
    age: 19,
    dob: '2005-04-19',
    club: 'Man United',
    nation: '🏴',
    pos: 'CM',
    positionsLabel: 'Central Midfielder (CM)',
    ca: 138,
    pa: 172,
    value: '€55M',
    contract: { until: '2028-06-30', wage: '€35k p/w' },
    lastUpdated: '2025-12-10T09:18:00Z',
    foot: 'Right',
    injury: { status: 'injured', until: '2026-01-05', desc: 'Sprained ankle' },
    personality: 'Balanced',
    mediaHandling: 'Reserved',
    tag: 'bargain',
    attrs: {
      pace: 12, acceleration: 13, dribbling: 12, technique: 12, firstTouch: 12, passing: 13, vision: 12,
      offTheBall: 11, decisions: 12, composure: 12, crossing: 8, workRate: 14, teamwork: 13, stamina: 14,
      tackling: 12, positioning: 12, anticipation: 12, strength: 11, agility: 12, balance: 12, finishing: 8,
    },
    form: [6.8, 7.0, 6.9, 7.1, 7.0],
  },
  {
    id: 'p_cubarsi',
    name: 'Pau Cubarsí',
    age: 17,
    dob: '2007-01-22',
    club: 'FC Barcelona',
    nation: '🇪🇸',
    pos: 'CB',
    positionsLabel: 'Centre-Back (CB)',
    ca: 144,
    pa: 176,
    value: '€60M',
    contract: { until: '2029-06-30', wage: '€25k p/w' },
    lastUpdated: '2025-12-13T07:55:00Z',
    foot: 'Right',
    injury: { status: 'fit' },
    personality: 'Fairly Professional',
    mediaHandling: 'Unflappable',
    tag: 'rising',
    attrs: {
      pace: 13, acceleration: 12, dribbling: 8, technique: 9, firstTouch: 10, passing: 12, vision: 10,
      offTheBall: 6, decisions: 13, composure: 14, crossing: 5, workRate: 13, teamwork: 13, stamina: 13,
      tackling: 15, positioning: 15, anticipation: 14, strength: 14, agility: 10, balance: 14, finishing: 4,
    },
    form: [7.2, 7.4, 7.0, 7.3, 7.1],
  },

{
  id: 'p_donnarumma',
  name: 'Gianluigi Donnarumma',
  age: 26,
  dob: '1999-02-25',
  club: 'PSG',
  nation: '🇮🇹',
  pos: 'GK',
  positionsLabel: 'Goalkeeper (GK)',
  ca: 165,
  pa: 175,
  value: '€70M',
  contract: { until: '2028-06-30', wage: '€190k p/w' },
  lastUpdated: '2025-12-13T09:20:00Z',
  foot: 'Right',
  injury: { status: 'fit' },
  personality: 'Resolute',
  mediaHandling: 'Reserved',
  tag: 'elite',
  attrs: {
    // Goalkeeping
    aerialReach: 16, handling: 17, punching: 14, commandOfArea: 15, communication: 14,
    kicking: 15, throwing: 14, oneOnOnes: 16, reflexes: 17, eccentricity: 9, rushingOut: 13,
    // Shared / outfield
    passing: 12, firstTouch: 10,
    // Mental + Physical
    composure: 15, decisions: 14, concentration: 15, anticipation: 14, bravery: 15, determination: 14, leadership: 11, aggression: 10,
    agility: 14, balance: 13, strength: 14, jumpingReach: 15, pace: 11, acceleration: 11, stamina: 10, naturalFitness: 12,
  },
  form: [7.2, 7.0, 7.4, 7.1, 7.3],
},
{
  id: 'p_maignan',
  name: 'Mike Maignan',
  age: 30,
  dob: '1995-07-03',
  club: 'AC Milan',
  nation: '🇫🇷',
  pos: 'GK',
  positionsLabel: 'Goalkeeper (GK)',
  ca: 160,
  pa: 168,
  value: '€45M',
  contract: { until: '2027-06-30', wage: '€135k p/w' },
  lastUpdated: '2025-12-12T12:10:00Z',
  foot: 'Right',
  injury: { status: 'fit' },
  personality: 'Professional',
  mediaHandling: 'Calm',
  tag: 'elite',
  attrs: {
    aerialReach: 15, handling: 16, punching: 13, commandOfArea: 14, communication: 15,
    kicking: 16, throwing: 15, oneOnOnes: 15, reflexes: 16, eccentricity: 10, rushingOut: 15,
    passing: 13, firstTouch: 11,
    composure: 14, decisions: 14, concentration: 14, anticipation: 15, bravery: 14, determination: 13, leadership: 12, aggression: 11,
    agility: 14, balance: 13, strength: 13, jumpingReach: 14, pace: 12, acceleration: 12, stamina: 11, naturalFitness: 13,
  },
  form: [7.1, 7.2, 6.9, 7.3, 7.0],
},

];

const PlayerSearchScreen = ({ dark, players = SAMPLE_PLAYERS, onSelectPlayer, isShortlisted, isFavorite, isCompared }) => {
  const [entity, setEntity] = useState('players'); // players | staff | clubs
  const [selectedPreset, setSelectedPreset] = useState('wonderkids');
  const [onlyShortlist, setOnlyShortlist] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Role Fit profile (wired to Rating Engine presets)
  const [roleMode, setRoleMode] = useState('pair'); // 'pair' | 'single'
  const [ipRoleId, setIpRoleId] = useState('iwsa');
  const [oopRoleId, setOopRoleId] = useState('pf');
  const [ipShare, setIpShare] = useState(65);
  const [packsIP, setPacksIP] = useState(['chance_creation']);
  const [packsOOP, setPacksOOP] = useState(['pressing_intensity']);

  // Lightweight undo/redo for filter state (prototype)
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const surface = dark ? 'bg-slate-800/50 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl';
  const surfaceSolid = dark ? 'bg-slate-800' : 'bg-white';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const hover = dark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';

  const presetsByEntity = {
    players: ['Wonderkids', 'Free Agents', 'Bargains', 'Expiring'],
    staff: ['Head of Youth', 'Assistant', 'Scout', 'Physio'],
    clubs: ['Vacancies', 'Top Facilities', 'Rich Clubs', 'Relegation Zone'],
  };

  // Players are now passed in so Search and Profile share the same dataset.

  const staff = [
    { name: 'Miguel Santos', age: 44, nation: '🇵🇹', role: 'Scout', rep: 3.5, ca: 118, pa: 128, stars: { judgePA: 4.0, judgeCA: 3.5, adapt: 4.0 }, trait: 'Judging Potential (14)' },
    { name: 'Daniel Clarke', age: 39, nation: '🏴', role: 'Assistant Manager', rep: 4.0, ca: 132, pa: 140, stars: { motiv: 4.5, tact: 3.5, man: 4.0 }, trait: 'Motivation (16)' },
    { name: 'Rui Almeida', age: 51, nation: '🇵🇹', role: 'HoYD', rep: 4.5, ca: 142, pa: 150, stars: { youth: 4.5, work: 4.0, judgePA: 4.0 }, trait: 'Working With Youngsters (17)' },
    { name: 'Alex Chen', age: 33, nation: '🇨🇳', role: 'Physio', rep: 3.0, ca: 110, pa: 120, stars: { phys: 4.0, rehab: 3.5 }, trait: 'Physio (15)' },
  ];

  const clubs = [
    { name: 'Brighton', country: 'England', league: 'Premier League', rep: 4.0, finances: 72, facilities: 85, vacancy: false },
    { name: 'Sporting CP', country: 'Portugal', league: 'Liga Portugal', rep: 4.5, finances: 68, facilities: 80, vacancy: true },
    { name: 'Feyenoord', country: 'Netherlands', league: 'Eredivisie', rep: 4.0, finances: 61, facilities: 78, vacancy: false },
    { name: 'Celtic', country: 'Scotland', league: 'Premiership', rep: 4.0, finances: 59, facilities: 74, vacancy: true },
  ];

  // Compute Role Fit using current role pair + packs (mirrors Rating Engine wiring)
  const roleMix = roleMode === 'single' ? { ip: 1, oop: 0 } : { ip: ipShare / 100, oop: 1 - ipShare / 100 };
  const roleIP = getRoleById(ipRoleId);
  const roleOOP = getRoleById(oopRoleId);

  const roleIPWeights = buildEffectiveWeights(roleIP.ipWeights, {}, packsIP, 'ip');
  const roleOOPWeights = roleMode === 'pair' ? buildEffectiveWeights(roleOOP.oopWeights, {}, packsOOP, 'oop') : {};

  const toggleRolePack = (scope, id) => {
    const setter = scope === 'ip' ? setPacksIP : setPacksOOP;
    const current = scope === 'ip' ? packsIP : packsOOP;
    if (current.includes(id)) setter(current.filter(x => x !== id));
    else setter([...current, id]);
  };

  const playersWithRoleFit = players
    .map((p) => ({ ...p, roleFit: calcRolePairScore({ attrs: p.attrs, ipWeights: roleIPWeights, oopWeights: roleOOPWeights, mix: roleMix }).total }))
    .sort((a, b) => b.roleFit - a.roleFit);

  const filteredPlayersWithRoleFit = (onlyShortlist && typeof isShortlisted === 'function')
    ? playersWithRoleFit.filter((p) => isShortlisted(p.id))
    : playersWithRoleFit;


  const pushHistory = (snapshot) => {
    setHistory((h) => [...h.slice(-20), snapshot]);
    setFuture([]);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [{ entity, selectedPreset, onlyShortlist, showWizard }, ...f]);
      setEntity(prev.entity);
      setSelectedPreset(prev.selectedPreset);
      setOnlyShortlist(prev.onlyShortlist);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      pushHistory({ entity, selectedPreset, onlyShortlist, showWizard });
      setEntity(next.entity);
      setSelectedPreset(next.selectedPreset);
      setOnlyShortlist(next.onlyShortlist);
      return f.slice(1);
    });
  };

  const onSwitchEntity = (next) => {
    if (next === entity) return;
    pushHistory({ entity, selectedPreset, onlyShortlist, showWizard });
    setEntity(next);
    setSelectedPreset(presetsByEntity[next][0].toLowerCase().replace(/\s+/g, ''));
  };

  const resultsCount = entity === 'players' ? filteredPlayersWithRoleFit.length : entity === 'staff' ? 312 : 64;

  const FilterWizard = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={() => setShowWizard(false)} />
      <div className={`relative w-full max-w-2xl rounded-3xl border ${border} ${dark ? 'bg-slate-900' : 'bg-white'} shadow-2xl overflow-hidden`}>
        <div className={`p-5 border-b ${border} flex items-center justify-between`}>
          <div>
            <div className={`text-sm font-semibold ${text}`}>Filter Wizard</div>
            <div className={`text-xs ${muted}`}>Guided setup → basic first, advanced later (per dev doc)</div>
          </div>
          <Button variant="ghost" size="sm" dark={dark} icon={X} onClick={() => setShowWizard(false)} />
        </div>

        <div className="p-5 grid grid-cols-2 gap-5">
          <Card dark={dark} className="p-4">
            <div className={`text-xs ${muted} uppercase tracking-wider mb-3`}>Step 1 • Basics</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${text}`}>Entity</span>
                <div className="flex gap-1.5">
                  {['players', 'staff', 'clubs'].map((k) => (
                    <button key={k} onClick={() => onSwitchEntity(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${entity === k ? 'bg-blue-500 text-white' : `${dark ? 'bg-slate-800' : 'bg-slate-100'} ${muted}`}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={`text-sm ${text} mb-1`}>Preset</div>
                <div className="flex flex-wrap gap-2">
                  {presetsByEntity[entity].map((p) => {
                    const id = p.toLowerCase().replace(/\s+/g, '');
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedPreset(id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${selectedPreset === id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : `${dark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} ${muted}`}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={`p-3 rounded-2xl ${dark ? 'bg-slate-800' : 'bg-slate-50'} border ${border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-medium ${text}`}>Limit to shortlist</div>
                    <div className={`text-xs ${muted}`}>Toggle to restrict results to a shortlist</div>
                  </div>
                  <button
                    onClick={() => setOnlyShortlist(v => !v)}
                    className={`w-12 h-7 rounded-full transition-all ${onlyShortlist ? 'bg-blue-500' : dark ? 'bg-slate-700' : 'bg-slate-200'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow transform transition-all ${onlyShortlist ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card dark={dark} className="p-4">
            <div className={`text-xs ${muted} uppercase tracking-wider mb-3`}>Step 2 • Advanced</div>
            <div className="space-y-3">
              <div className={`p-3 rounded-2xl ${dark ? 'bg-slate-800' : 'bg-slate-50'} border ${border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Filter size={16} className="text-blue-500" />
                  <div className={`text-sm font-medium ${text}`}>Progressive disclosure</div>
                </div>
                <div className={`text-xs ${muted}`}>CA/PA sliders, contract clauses, attributes thresholds… (placeholder)</div>
              </div>
              <div className={`p-3 rounded-2xl ${dark ? 'bg-slate-800' : 'bg-slate-50'} border ${border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <History size={16} className="text-blue-500" />
                  <div className={`text-sm font-medium ${text}`}>Save + History</div>
                </div>
                <div className={`text-xs ${muted}`}>Save as favourite preset, and undo/redo recent filter sets.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className={`p-5 border-t ${border} flex items-center justify-between`}>
          <div className={`text-xs ${muted}`}>This wizard is a UI affordance; actual filters are still editable in the sidebar.</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" dark={dark} onClick={() => setShowWizard(false)}>Cancel</Button>
            <Button variant="primary" size="sm" icon={Check} onClick={() => setShowWizard(false)}>Apply</Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex-1 flex ${bg}`}>
      {/* Filters Panel */}
      <div className={`w-80 ${surface} border-r ${border} flex flex-col`}>
        <div className={`border-b ${border}`}>
          <div className="flex">
            {[
              { key: 'players', label: 'Players', icon: Users },
              { key: 'staff', label: 'Staff', icon: UserCog },
              { key: 'clubs', label: 'Clubs', icon: Building2 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => onSwitchEntity(tab.key)}
                className={`flex-1 py-4 text-sm font-medium relative ${tab.key === entity ? text : muted}`}
              >
                <span className="inline-flex items-center gap-2 justify-center">
                  <tab.icon size={16} />
                  {tab.label}
                </span>
                {tab.key === entity && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <div className={`text-xs uppercase tracking-wider ${muted}`}>Quick Presets</div>
            <Button variant="ghost" size="sm" dark={dark} icon={Zap} onClick={() => setShowWizard(true)}>Wizard</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {presetsByEntity[entity].map((preset) => {
              const id = preset.toLowerCase().replace(/\s+/g, '');
              return (
                <button
                  key={id}
                  onClick={() => {
                    pushHistory({ entity, selectedPreset, onlyShortlist, showWizard });
                    setSelectedPreset(id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    selectedPreset === id
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : `${dark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} ${muted}`
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          <div className={`mt-4 p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/30' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-medium ${text}`}>Limit to shortlist</div>
                <div className={`text-xs ${muted}`}>Shortlist-first workflow toggle</div>
              </div>
              <button
                onClick={() => {
                  pushHistory({ entity, selectedPreset, onlyShortlist, showWizard });
                  setOnlyShortlist(v => !v);
                }}
                className={`w-12 h-7 rounded-full transition-all ${onlyShortlist ? 'bg-blue-500' : dark ? 'bg-slate-700' : 'bg-slate-200'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow transform transition-all ${onlyShortlist ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          <Card dark={dark} className="overflow-hidden">
            <button className={`w-full flex items-center justify-between p-4 ${hover}`}>
              <span className={`font-medium ${text}`}>Filters</span>
              <ChevronUp size={18} className={muted} />
            </button>
            <div className="px-4 pb-4 space-y-4">
              <div className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle size={14} className={muted} />
                  <div className={`text-sm font-medium ${text}`}>Unified filters</div>
                </div>
                <div className={`text-xs ${muted}`}>Group by entity (General, Ability, Contract, Attributes). Real controls omitted for brevity.</div>
              </div>

              {entity === 'staff' && (
                <div>
                  <label className={`text-xs ${muted} mb-2 block`}>Reputation</label>
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} size={14} className={i <= 4 ? 'text-amber-500' : muted} />
                    ))}
                    <span className={`text-xs ${muted}`}>≥ 4 stars</span>
                  </div>
                </div>
              )}

              {entity === 'clubs' && (
                <div>
                  <label className={`text-xs ${muted} mb-2 block`}>Facilities</label>
                  <div className={`h-2 ${dark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full relative`}>
                    <div className="absolute left-[55%] right-[10%] h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" />
                  </div>
                  <div className={`text-xs ${muted} mt-1`}>Min 70 / 100</div>
                </div>
              )}
            </div>
          </Card>
          {entity === 'players' && (
            <Card dark={dark} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`text-xs uppercase tracking-wider ${muted}`}>Role Fit Profile</div>
                <Badge variant="primary" size="xs">wired</Badge>
              </div>

              <RolePairSelector
                dark={dark}
                compact
                mode={roleMode}
                ipRoleId={ipRoleId}
                oopRoleId={oopRoleId}
                onModeChange={setRoleMode}
                onChange={({ ipRoleId: ip, oopRoleId: oop }) => {
                  setIpRoleId(ip);
                  setOopRoleId(oop);
                }}
              />

              <div className={`mt-3 p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-xs ${muted}`}>IP / OOP mix</div>
                  <div className={`text-xs ${muted}`}>{roleMode === 'single' ? 'IP only' : `${ipShare}% / ${100 - ipShare}%`}</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={roleMode === 'single' ? 100 : ipShare}
                  onChange={(e) => setIpShare(Number(e.target.value))}
                  disabled={roleMode === 'single'}
                  className="w-full"
                />
              </div>

              <div className="mt-3">
                <div className={`text-[10px] uppercase tracking-wider ${muted} mb-2`}>Modifier Packs</div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {['ball_progression', 'chance_creation', 'athleticism'].map((pid) => {
                      const p = FM26_MODIFIER_PACKS.find(x => x.id === pid);
                      const active = packsIP.includes(pid);
                      return (
                        <button
                          key={pid}
                          onClick={() => toggleRolePack('ip', pid)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${border} ${
                            active ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : `${dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'}`
                          }`}
                        >
                          {p?.name || pid} <span className={muted}>IP</span>
                        </button>
                      );
                    })}
                  </div>

                  {roleMode === 'pair' && (
                    <div className="flex flex-wrap gap-2">
                      {['pressing_intensity', 'defensive_duels', 'athleticism'].map((pid) => {
                        const p = FM26_MODIFIER_PACKS.find(x => x.id === pid);
                        const active = packsOOP.includes(pid);
                        return (
                          <button
                            key={pid}
                            onClick={() => toggleRolePack('oop', pid)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${border} ${
                              active ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : `${dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'}`
                            }`}
                          >
                            {p?.name || pid} <span className={muted}>OOP</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}



          <div className={`${surfaceSolid} rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent`}>
            <button className="w-full flex items-center gap-3 p-4">
              <Crown size={16} className="text-amber-500" />
              <span className={`font-medium ${text} flex-1 text-left`}>Smart Suggestions</span>
              <Badge variant="gold" size="xs">g</Badge>
            </button>
            <div className="px-4 pb-4">
              <div className={`text-xs ${muted}`}>Example: “Left-footed winger” based on squad gap (placeholder)</div>
            </div>
          </div>
        </div>

        <div className={`p-4 border-t ${border} ${surface}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <span className={`text-sm ${text}`}><span className="font-bold text-blue-400">{resultsCount}</span> results</span>
            </div>
            <button className={`text-xs ${muted} hover:text-red-400`}>Clear All</button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={Save} dark={dark} className="flex-1">Save Preset</Button>
            <Button variant="ghost" size="sm" icon={History} dark={dark} onClick={undo} disabled={!history.length} />
            <Button variant="ghost" size="sm" icon={RefreshCw} dark={dark} onClick={redo} disabled={!future.length} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 flex flex-col">
        <header className={`h-14 ${surface} border-b ${border} flex items-center px-6 gap-4`}>
          <h1 className={`font-semibold ${text}`}>
            {entity === 'players' ? 'Players' : entity === 'staff' ? 'Staff' : 'Clubs'}
          </h1>
          <Badge variant="primary">{resultsCount} results</Badge>
          {onlyShortlist && <Badge variant="warning">Shortlist-only</Badge>}
          {entity === 'players' && (
            <Badge variant="primary">
              {getRoleById(ipRoleId).name}{roleMode === 'pair' ? ` ↔ ${getRoleById(oopRoleId).name}` : ''}
            </Badge>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" icon={Columns} dark={dark}>Columns</Button>
          <Button variant="ghost" size="sm" icon={Download} dark={dark}>Export</Button>
        </header>

        <div className="flex-1 overflow-auto">
          {entity === 'players' && (
            <table className="w-full">
              <thead className={`${dark ? 'bg-slate-800/80' : 'bg-slate-50'} sticky top-0 z-10`}>
                <tr className={`text-xs ${muted} uppercase tracking-wider`}>
                  <th className="text-left p-4 w-10"><input type="checkbox" /></th>
                  <th className="text-left p-4">Player</th>
                  <th className="text-left p-4">Position</th>
                  <th className="text-center p-4">Age</th>
                  <th className="text-center p-4">CA</th>
                  <th className="text-center p-4">PA</th>
                  <th className="text-center p-4">Role Fit</th>
                  <th className="text-right p-4">Value</th>
                  <th className="text-center p-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayersWithRoleFit.map((player) => (
                  <tr
                    key={player.id}
                    className={`border-b ${border} ${hover} ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                    onClick={() => onSelectPlayer?.(player.id)}
                  >
                    <td className="p-4"><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar dark={dark} name={player.name} size="sm" />
                        <div>
                          <div className={`font-medium ${text} flex items-center gap-2`}>
                            {player.name} <span className="text-sm">{player.nation}</span>
                            {typeof isFavorite === 'function' && isFavorite(player.id) && <Star size={14} className="text-amber-500" fill="currentColor" title="Favourite" />}
                            {typeof isShortlisted === 'function' && isShortlisted(player.id) && <List size={14} className="text-blue-400" title="Shortlisted" />}
                            {typeof isCompared === 'function' && isCompared(player.id) && <GitCompare size={14} className="text-emerald-400" title="In Compare" />}
                            {player.tag && <Badge variant={player.tag === 'bargain' ? 'success' : 'warning'} size="xs">{player.tag}</Badge>}
                          </div>
                          <div className={`text-xs ${muted}`}>{player.club}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`p-4 ${muted}`}>{player.pos}</td>
                    <td className={`p-4 text-center ${muted}`}>{calcAgeFromDOB(player.dob, player.age)}</td>
                    <td className="p-4 text-center"><span className="text-emerald-400 font-semibold">{player.ca}</span></td>
                    <td className="p-4 text-center"><span className="text-blue-400 font-semibold">{player.pa}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20"><ProgressBar value={player.roleFit} max={100} variant={player.roleFit >= 85 ? 'success' : 'warning'} size="sm" /></div>
                        <span className={`text-xs ${player.roleFit >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>{player.roleFit}%</span>
                      </div>
                    </td>
                    <td className={`p-4 text-right ${muted}`}>{player.value}</td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" icon={MoreHorizontal} dark={dark} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {entity === 'staff' && (
            <div className="p-6 grid grid-cols-2 gap-4">
              {staff.map((s) => (
                <Card key={s.name} dark={dark} hover className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar dark={dark} name={s.name} size="lg" />
                    <div className="flex-1">
                      <div className={`font-semibold ${text}`}>{s.name} <span className="ml-2">{s.nation}</span></div>
                      <div className={`text-sm ${muted}`}>{s.role} • {s.age} years</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs ${muted}`}>Rep</div>
                      <div className="flex justify-end">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} size={14} className={i <= Math.round(s.rep) ? 'text-amber-500' : muted} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl ${dark ? 'bg-slate-700/40' : 'bg-slate-50'} border ${border}`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${text}`}>Key stars</div>
                      <Badge variant="primary" size="xs">{s.trait}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(s.stars).slice(0,3).map(([k,v]) => (
                        <div key={k} className="text-center">
                          <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{k}</div>
                          <div className="flex justify-center mt-1">
                            {[1,2,3,4,5].map((i) => (
                              <Star key={i} size={12} className={i <= Math.round(v) ? 'text-amber-500' : muted} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {entity === 'clubs' && (
            <div className="p-6 space-y-3">
              {clubs.map((c) => (
                <Card key={c.name} dark={dark} hover className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${dark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center`}>
                      <Building2 size={22} className="text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`font-semibold ${text}`}>{c.name}</div>
                        {c.vacancy && <Badge variant="warning" size="xs">Vacancy</Badge>}
                      </div>
                      <div className={`text-sm ${muted}`}>{c.country} • {c.league}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="w-36">
                        <div className={`text-xs ${muted} mb-1`}>Facilities</div>
                        <ProgressBar value={c.facilities} max={100} variant={c.facilities >= 80 ? 'success' : 'warning'} size="sm" />
                      </div>
                      <div className="w-36">
                        <div className={`text-xs ${muted} mb-1`}>Finances</div>
                        <ProgressBar value={c.finances} max={100} variant={c.finances >= 70 ? 'success' : 'warning'} size="sm" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {showWizard && <FilterWizard />}
    </div>
  );
};


// ============================================
// Screen: Player Profile (NO OVERLAY)
// ============================================

// ============================================
// Screen: Player Profile (Data-driven + actions + tabs)
// ============================================
const PlayerProfileScreen = ({
  dark,
  player,
  onBack,

  // State-driven actions
  shortlists = [{ id: 'fm-shortlist', name: 'FM Shortlist', color: 'blue' }],
  shortlistEntries = {},
  onAddToShortlist,
  onRemoveFromShortlist,

  comparisonIds = [],
  onToggleCompare,
  onOpenComparison,

  onCreateHistoryPoint,

  isFavorite,
  onToggleFavorite,

  pushToast,

  playerReports = {},
  onSavePlayerReport,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [shortlistDraft, setShortlistDraft] = useState({ listId: shortlists?.[0]?.id || 'fm-shortlist', tag: 'target', note: '' });
  const [historyLabel, setHistoryLabel] = useState('Manual snapshot');

  // Role Fit (FM26 Rating Engine) — local config for this profile session
  const defaultRoleIds = useMemo(() => guessRoleIdsFromPos(player?.pos), [player?.id, player?.pos]);
  const [roleMode, setRoleMode] = useState('pair'); // 'pair' | 'single'
  const [ipRoleId, setIpRoleId] = useState(defaultRoleIds.ip);
  const [oopRoleId, setOopRoleId] = useState(defaultRoleIds.oop);
  const [ipShare, setIpShare] = useState(70); // % weight for IP when in pair mode
  const [packsIP, setPacksIP] = useState([]);
  const [packsOOP, setPacksOOP] = useState([]);

  useEffect(() => {
    // Reset defaults when a different player is opened
    const ids = guessRoleIdsFromPos(player?.pos);
    setRoleMode('pair');
    setIpRoleId(ids.ip);
    setOopRoleId(ids.oop);
    setIpShare(70);
    setPacksIP([]);
    setPacksOOP([]);
  }, [player?.id, player?.pos]);


  // Positions selector (Positions tab)
  const [selectedPosition, setSelectedPosition] = useState(() => {
    const list = parsePositionsLabel(player?.positionsLabel, player?.pos);
    return list?.[0] || player?.pos || '';
  });
  const [showPotentialRating, setShowPotentialRating] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    const list = parsePositionsLabel(player?.positionsLabel, player?.pos);
    setSelectedPosition(list?.[0] || player?.pos || '');
  }, [player?.id, player?.positionsLabel, player?.pos]);

  const handleRoleSelect = (role, fit) => {
    if (role && fit) {
      setSelectedRole({ role, fit });
    } else {
      setSelectedRole(null);
    }
  };

// Attribute groups (FM26) — defaults depend on GK vs outfield.
const isGKPlayer = isGoalkeeperPlayer(player);
const defaultAttrGroups = useMemo(
  () => (isGKPlayer ? DEFAULT_GROUPS_GK : DEFAULT_GROUPS_OUTFIELD),
  [player?.id, isGKPlayer]
);

const visibleAttrGroups = defaultAttrGroups;


  // Report state (persisted via app-level store)
  const storedReport = playerReports?.[player?.id] || null;
  const defaultReport = useMemo(() => ({
    recommendation: storedReport?.recommendation || 'shortlist', // sign | shortlist | monitor | avoid
    confidence: typeof storedReport?.confidence === 'number' ? storedReport.confidence : 65,
    ratingStars: typeof storedReport?.ratingStars === 'number' ? storedReport.ratingStars : 4,
    tags: Array.isArray(storedReport?.tags) ? storedReport.tags : [],
    pros: Array.isArray(storedReport?.pros) ? storedReport.pros : [],
    cons: Array.isArray(storedReport?.cons) ? storedReport.cons : [],
    note: storedReport?.note || '',
    updatedAt: storedReport?.updatedAt || null,
  }), [player?.id, storedReport]);

  const [reportDraft, setReportDraft] = useState(defaultReport);
  const [reportProInput, setReportProInput] = useState('');
  const [reportConInput, setReportConInput] = useState('');

  useEffect(() => {
    setReportDraft(defaultReport);
    setReportProInput('');
    setReportConInput('');
  }, [defaultReport]);

  const toast = (variant, title, message) => pushToast?.({ variant, title, message });

  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const surface = dark ? 'bg-slate-800/95' : 'bg-white/95';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const hover = dark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';

  if (!player) {
    return (
      <div className={`w-full h-full ${surface} flex items-center justify-center p-6`}>
        <EmptyState
          icon={Users}
          title="No player selected"
          description="Go back to Player Search and select a player to open their profile."
          action={onBack ? <Button variant="secondary" size="sm" dark={dark} icon={ChevronLeft} onClick={onBack}>Back to Search</Button> : null}
          dark={dark}
        />
      </div>
    );
  }

  const age = calcAgeFromDOB(player.dob, player.age);
  const contract = player.contract || {};
  const contractLeft = contractRemaining(contract.until);
  const f = formSummary(player.form);
  const fav = typeof isFavorite === 'function' ? isFavorite(player.id) : false;
  const compared = comparisonIds.includes(player.id);

  const inLists = (shortlists || []).filter((l) => shortlistEntries?.[l.id]?.[player.id]);
  const isShortlisted = inLists.length > 0;

  const injury = player.injury || { status: 'fit' };
  const availability = injury.status === 'injured'
    ? { label: `Injured • until ${formatISODate(injury.until)}`, status: 'danger', sub: injury.desc || 'Injury' }
    : { label: 'Fit & available', status: 'success', sub: 'No reported injury' };

  const metaChips = [
    player.foot ? { icon: Info, label: `Foot: ${player.foot}` } : null,
    player.personality ? { icon: Sparkles, label: player.personality } : null,
    player.mediaHandling ? { icon: Eye, label: `Media: ${player.mediaHandling}` } : null,
  ].filter(Boolean);

  const a = player.attrs || {};

  // --- Role Fit (computed) ---
  const ipRole = getRoleById(ipRoleId);
  const oopRole = getRoleById(oopRoleId);
  const mix = roleMode === 'single'
    ? { ip: 1, oop: 0 }
    : { ip: clamp(ipShare, 0, 100) / 100, oop: (100 - clamp(ipShare, 0, 100)) / 100 };

  const ipWeights = applyModifierPacks(ipRole?.ipWeights || {}, packsIP, 'ip');
  const oopWeights = roleMode === 'pair' ? applyModifierPacks(oopRole?.oopWeights || {}, packsOOP, 'oop') : {};

  const baseIpWeights = normalizeWeights(ipRole?.ipWeights || {});
  const baseOopWeights = roleMode === 'pair' ? normalizeWeights(oopRole?.oopWeights || {}) : {};

  const roleScore = calcRolePairScore({ attrs: a, ipWeights, oopWeights, mix });
  const baseRoleScore = calcRolePairScore({ attrs: a, ipWeights: baseIpWeights, oopWeights: baseOopWeights, mix });
  const roleScoreDelta = roleScore.total - baseRoleScore.total;

  const toggleRolePack = (scope, pid) => {
    if (scope === 'ip') setPacksIP((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
    else setPacksOOP((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

  const combinedWeights = (() => {
    const keys = new Set([...Object.keys(ipWeights || {}), ...Object.keys(oopWeights || {})]);
    const out = {};
    keys.forEach((k) => {
      const w = (ipWeights?.[k] || 0) * mix.ip + (oopWeights?.[k] || 0) * mix.oop;
      if (w > 0) out[k] = w;
    });
    return out;
  })();

  const topContributors = (() => {
    const rows = Object.entries(combinedWeights)
      .map(([k, w]) => {
        const val = Number(a?.[k]) || 0;
        const points = (val / 20) * w * 100; // approx contribution to total points
        return { key: k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), val, w, points };
      })
      .sort((x, y) => y.points - x.points)
      .slice(0, 5);
    return rows;
  })();

  const biggestGaps = (() => {
    const rows = Object.entries(combinedWeights)
      .map(([k, w]) => {
        const val = Number(a?.[k]) || 0;
        const gap = ((20 - val) / 20) * w * 100; // approx potential points gain
        return { key: k, label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), val, w, gap };
      })
      .sort((x, y) => y.gap - x.gap)
      .slice(0, 5);
    return rows;
  })();

  const attributeGroups = buildAttributeGroupItems(a, { isGKContext: isGKPlayer });

  const keyAttrs = Object.entries(a)
    .map(([k, v]) => ({ key: k, name: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value: v }))
    .filter(x => typeof x.value === 'number')
    .sort((x, y) => y.value - x.value)
    .slice(0, 8);

  const positionsList = parsePositionsLabel(player.positionsLabel, player.pos);
  const activePosLabel = selectedPosition || positionsList?.[0] || player.pos;
  const activeRoleGroup = guessRoleGroupFromPosition(activePosLabel);

  const roleCandidates = FM26_ROLE_LIBRARY
    .filter((r) => activeRoleGroup === 'ALL' ? true : r.positionGroup === activeRoleGroup);

  const roleRecommendations = roleCandidates
    .map((r) => {
      const ipW = applyModifierPacks(r.ipWeights || {}, packsIP, 'ip');
      const oopW = roleMode === 'pair'
        ? applyModifierPacks(getRoleById(oopRoleId).oopWeights || {}, packsOOP, 'oop')
        : {};
      const s = calcRolePairScore({ attrs: a, ipWeights: ipW, oopWeights: oopW, mix });
      const baseS = calcRolePairScore({ attrs: a, ipWeights: normalizeWeights(r.ipWeights || {}), oopWeights: roleMode === 'pair' ? normalizeWeights(getRoleById(oopRoleId).oopWeights || {}) : {}, mix });
      return { role: r, score: s.total, ip: s.ip, oop: s.oop, deltaVsCurrent: s.total - roleScore.total, deltaVsBase: s.total - baseS.total };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 8);

  const weakAttrs = Object.entries(a)
    .map(([k, v]) => ({ key: k, name: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value: v }))
    .filter(x => typeof x.value === 'number')
    .sort((x, y) => x.value - y.value)
    .slice(0, 6);

  const openShortlistModal = () => {
    const defaultList = inLists?.[0]?.id || shortlists?.[0]?.id || 'fm-shortlist';
    const existing = shortlistEntries?.[defaultList]?.[player.id];
    setShortlistDraft({
      listId: defaultList,
      tag: existing?.tag || 'target',
      note: existing?.note || '',
    });
    setShowShortlistModal(true);
  };

  const applyShortlist = () => {
    const { listId, tag, note } = shortlistDraft;
    if (!listId) return;
    onAddToShortlist?.(player.id, listId, { tag, note });
    toast('success', 'Shortlist updated', `${player.name} added to ${shortlists.find(l => l.id === listId)?.name || 'shortlist'}.`);
    setShowShortlistModal(false);
  };

  const removeFromSelectedShortlist = () => {
    const { listId } = shortlistDraft;
    onRemoveFromShortlist?.(player.id, listId);
    toast('warning', 'Removed from shortlist', `${player.name} removed.`);
    setShowShortlistModal(false);
  };

  const goToComparison = () => {
    // Compare is managed in the Comparison screen. From Profile we *open* Comparison and
    // ensure this player is included (handled by app-level callback).
    onOpenComparison?.(player.id);
  };

  const createHistoryPoint = () => {
    onCreateHistoryPoint?.(player.id, { label: historyLabel });
    toast('success', 'History point created', `${player.name} • ${historyLabel}`);
    setShowHistoryModal(false);
  };

  const toggleFav = () => {
    onToggleFavorite?.(player.id);
    toast('info', fav ? 'Removed from favourites' : 'Added to favourites', player.name);
  };

  const doCopy = async () => {
    const ok = await copyToClipboard(`${player.name} (${player.id})`);
    toast(ok ? 'success' : 'error', ok ? 'Copied' : 'Copy failed', ok ? 'Player name + ID copied.' : 'Clipboard unavailable.');
  };

  const tabs = [
    { id: 'overview', icon: Users, label: 'Overview' },
    { id: 'attributes', icon: BarChart3, label: 'Attributes' },
    { id: 'positions', icon: MapPin, label: 'Positions' },
    { id: 'transfer', icon: DollarSign, label: 'Transfer' },
    { id: 'report', icon: FileText, label: 'Report' },
    { id: 'development', icon: TrendingUp, label: 'Development', pro: true },
  ];

  // FM-style: Compare is a pill action in the tab row (not a tab panel).
  const proTab = tabs.find((t) => t.id === 'development');
  const mainTabs = tabs.filter((t) => t.id !== 'development');

  const ShortlistModal = () => {
    const activeEntry = shortlistEntries?.[shortlistDraft.listId]?.[player.id];
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowShortlistModal(false)} />
        <div className={`relative w-full max-w-xl rounded-3xl border ${border} ${dark ? 'bg-slate-900' : 'bg-white'} shadow-2xl overflow-hidden`}>
          <div className={`p-5 border-b ${border} flex items-center justify-between`}>
            <div>
              <div className={`text-sm font-semibold ${text}`}>Add to Shortlist</div>
              <div className={`text-xs ${muted}`}>{player.name} • choose list + tag</div>
            </div>
            <Button variant="ghost" size="sm" dark={dark} icon={X} onClick={() => setShowShortlistModal(false)} />
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className={`text-xs ${muted} mb-2`}>Shortlist</div>
              <div className="grid grid-cols-2 gap-2">
                {(shortlists || []).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setShortlistDraft((d) => ({ ...d, listId: l.id }))}
                    className={`p-3 rounded-2xl border text-left transition-all ${shortlistDraft.listId === l.id ? 'border-blue-500/40 bg-blue-500/10' : border} ${dark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`text-sm font-medium ${text}`}>{l.name}</div>
                    <div className={`text-xs ${muted}`}>{Object.keys(shortlistEntries?.[l.id] || {}).length} players</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={`text-xs ${muted} mb-2`}>Tag</div>
                <select
                  value={shortlistDraft.tag}
                  onChange={(e) => setShortlistDraft((d) => ({ ...d, tag: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}
                >
                  <option value="target">Target</option>
                  <option value="watchlist">Watchlist</option>
                  <option value="loan">Loan</option>
                  <option value="do_not_buy">Do Not Buy</option>
                </select>
              </div>
              <div>
                <div className={`text-xs ${muted} mb-2`}>Quick note</div>
                <input
                  value={shortlistDraft.note}
                  onChange={(e) => setShortlistDraft((d) => ({ ...d, note: e.target.value }))}
                  placeholder="e.g., Priority signing"
                  className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-white text-slate-900 placeholder:text-slate-400'}`}
                />
              </div>
            </div>

            <div className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-800/60' : 'bg-slate-50'} flex items-start gap-3`}>
              <Info size={18} className="text-blue-500 mt-0.5" />
              <div>
                <div className={`text-sm font-medium ${text}`}>State-driven</div>
                <div className={`text-xs ${muted}`}>This updates shared state. You’ll see it reflected in Shortlists and Search (shortlist-only).</div>
              </div>
            </div>
          </div>

          <div className={`p-5 border-t ${border} flex items-center justify-between`}>
            <div>
              {activeEntry ? (
                <button onClick={removeFromSelectedShortlist} className={`text-sm font-medium text-red-400 hover:text-red-300 flex items-center gap-2`}>
                  <Trash2 size={16} /> Remove from this shortlist
                </button>
              ) : (
                <div className={`text-xs ${muted}`}>Not in this shortlist yet</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" dark={dark} onClick={() => setShowShortlistModal(false)}>Cancel</Button>
              <Button variant="primary" size="md" icon={Check} onClick={applyShortlist}>Save</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HistoryModal = () => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistoryModal(false)} />
      <div className={`relative w-full max-w-lg rounded-3xl border ${border} ${dark ? 'bg-slate-900' : 'bg-white'} shadow-2xl overflow-hidden`}>
        <div className={`p-5 border-b ${border} flex items-center justify-between`}>
          <div>
            <div className={`text-sm font-semibold ${text}`}>Create History Point</div>
            <div className={`text-xs ${muted}`}>{player.name} • snapshot CA/PA + key attributes</div>
          </div>
          <Button variant="ghost" size="sm" dark={dark} icon={X} onClick={() => setShowHistoryModal(false)} />
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className={`text-xs ${muted} mb-2`}>Label</div>
            <input
              value={historyLabel}
              onChange={(e) => setHistoryLabel(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-white text-slate-900 placeholder:text-slate-400'}`}
              placeholder="e.g., Post-training camp"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
              <div className={`text-xs ${muted}`}>Date</div>
              <div className={`text-sm font-semibold ${text}`}>{formatISODate(new Date().toISOString())}</div>
            </div>
            <div className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
              <div className={`text-xs ${muted}`}>CA</div>
              <div className={`text-sm font-semibold text-emerald-400`}>{player.ca}</div>
            </div>
            <div className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
              <div className={`text-xs ${muted}`}>PA</div>
              <div className={`text-sm font-semibold text-blue-400`}>{player.pa}</div>
            </div>
          </div>

          <div className={`text-xs ${muted}`}>Includes top 6 attributes by current value (prototype).</div>
        </div>

        <div className={`p-5 border-t ${border} flex justify-end gap-2`}>
          <Button variant="secondary" size="md" dark={dark} onClick={() => setShowHistoryModal(false)}>Cancel</Button>
          <Button variant="primary" size="md" icon={Plus} onClick={createHistoryPoint}>Create</Button>
        </div>
      </div>
    </div>
  );

  const HeaderMeta = () => (
    <div className={`flex items-center gap-3 ${muted} text-sm mb-4 flex-wrap`}>
      <span>{age} years old</span>
      <span className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>({formatISODate(player.dob)})</span>
      <span className="w-1 h-1 rounded-full bg-current" />
      <span>{player.positionsLabel || player.pos}</span>
      <span className="w-1 h-1 rounded-full bg-current" />
      <span className={`font-medium ${text}`}>{player.club}</span>
      <span className="w-1 h-1 rounded-full bg-current" />
      <span title={`Last updated: ${formatISODate(player.lastUpdated)}`}>Updated {formatTimeAgo(player.lastUpdated)}</span>
    </div>
  );

  return (
    <div className={`w-full h-full ${surface} flex flex-col`}>
      {/* Hero / header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative p-6">
          {onBack && (
            <button
              onClick={onBack}
              className={`absolute top-4 left-4 w-8 h-8 rounded-xl ${dark ? 'bg-slate-700/50' : 'bg-white/50'} flex items-center justify-center hover:opacity-90`}
              aria-label="Back to search"
              title="Back"
            >
              <ChevronLeft size={18} className={muted} />
            </button>
          )}
          <button
            onClick={onBack}
            className={`absolute top-4 right-4 w-8 h-8 rounded-xl ${dark ? 'bg-slate-700/50' : 'bg-white/50'} flex items-center justify-center hover:opacity-90`}
            aria-label="Close profile"
            title="Close"
          >
            <X size={18} className={muted} />
          </button>

          <div className="flex gap-5">
            <div className={`w-28 h-28 rounded-2xl ${dark ? 'bg-slate-700' : 'bg-slate-200'} flex items-center justify-center border-2 ${border}`}>
              <Users size={48} className={muted} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className={`text-2xl font-bold ${text}`}>{player.name}</h1>
                {player.nation && <span className="text-2xl">{player.nation}</span>}

                <button
                  onClick={toggleFav}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${border} ${dark ? 'bg-slate-900/10 hover:bg-slate-900/20' : 'bg-white/60 hover:bg-white'} transition-all`}
                  title={fav ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <Star size={14} className={fav ? 'text-amber-500' : muted} fill={fav ? 'currentColor' : 'none'} />
                  <span className={`text-xs ${fav ? 'text-amber-400' : muted}`}>{fav ? 'Favourite' : 'Star'}</span>
                </button>

                <button
                  onClick={doCopy}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${border} ${dark ? 'bg-slate-900/10 hover:bg-slate-900/20' : 'bg-white/60 hover:bg-white'} transition-all`}
                  title="Copy name + ID"
                >
                  <Copy size={14} className={muted} />
                  <span className={`text-xs ${muted}`}>Copy</span>
                </button>

                {isShortlisted && <Badge variant="primary" size="sm">Shortlisted</Badge>}
                {compared && (
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${border} ${dark ? 'bg-emerald-500/10' : 'bg-white/70'}`}
                    title="In compare"
                  >
                    <GitCompare size={14} className="text-emerald-400" />
                    <span className={`text-xs font-medium ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>In Compare</span>
                  </span>
                )}


              </div>

              <HeaderMeta />

              <div className="flex gap-6">
                <div className="flex-1">
                  <div className={`text-xs ${muted} mb-1.5`}>Current Ability</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1"><ProgressBar value={player.ca} max={200} variant="success" size="lg" /></div>
                    <span className="text-xl font-bold text-emerald-400">{player.ca}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className={`text-xs ${muted} mb-1.5`}>Potential Ability</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1"><ProgressBar value={player.pa} max={200} variant="primary" size="lg" /></div>
                    <span className="text-xl font-bold text-blue-400">{player.pa}</span>
                  </div>
                </div>
              </div>

              {metaChips.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {metaChips.map((c, i) => (
                    <span key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white/60'} text-xs`}>
                      <c.icon size={14} className="text-blue-500" />
                      <span className={muted}>{c.label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5 flex-wrap">
            <Button
              variant={isShortlisted ? 'secondary' : 'primary'}
              size="md"
              icon={isShortlisted ? CheckSquare : Plus}
              dark={dark}
              onClick={openShortlistModal}
              title="Add to shortlist"
            >
              {isShortlisted ? 'Edit Shortlist' : 'Add to Shortlist'}
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={History}
              dark={dark}
              onClick={() => setShowHistoryModal(true)}
              title="Create history snapshot"
            >
              Track History
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex items-center border-b ${border} px-6 ${dark ? 'bg-slate-800/30' : 'bg-slate-50/50'} overflow-auto`}>
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium relative whitespace-nowrap ${activeTab === tab.id ? text : muted}`}
            title={tab.pro ? 'PRO tab (prototype)' : tab.label}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={goToComparison}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${border} ${dark ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'bg-white/70 hover:bg-white'} transition-all whitespace-nowrap mr-2`}
          title="Open Comparison"
        >
          <GitCompare size={16} className={compared ? 'text-emerald-400' : (dark ? 'text-slate-200' : 'text-slate-700')} />
          <span className={`text-sm font-medium ${compared ? 'text-emerald-300' : (dark ? 'text-slate-200' : 'text-slate-700')}`}>{compared ? 'In Compare' : 'Compare'}</span>
        </button>

        {proTab && (
          <button
            key={proTab.id}
            onClick={() => setActiveTab(proTab.id)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium relative whitespace-nowrap ${activeTab === proTab.id ? text : muted}`}
            title={proTab.pro ? 'PRO tab (prototype)' : proTab.label}
          >
            <proTab.icon size={16} />
            {proTab.label}
            {proTab.pro && <Crown size={12} className="text-amber-500" />}
            {activeTab === proTab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <Card dark={dark} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs ${muted}`}>Value</div>
                  <DollarSign size={16} className="text-blue-500" />
                </div>
                <div className={`text-lg font-bold ${text}`}>{player.value || '—'}</div>
                <div className={`text-xs ${muted}`}>Wage: {contract.wage || '—'}</div>
              </Card>

              <Card dark={dark} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs ${muted}`}>Contract</div>
                  <Clock size={16} className="text-blue-500" />
                </div>
                <div className={`text-lg font-bold ${contractLeft.status === 'danger' ? 'text-red-400' : contractLeft.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {contractLeft.label}
                </div>
                <div className={`text-xs ${muted}`} title={`Until ${formatISODate(contract.until)}`}>Until {formatISODate(contract.until)}</div>
              </Card>

              <Card dark={dark} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs ${muted}`}>Availability</div>
                  <Activity size={16} className="text-blue-500" />
                </div>
                <div className={`text-sm font-semibold ${availability.status === 'danger' ? 'text-red-400' : 'text-emerald-400'}`}>{availability.label}</div>
                <div className={`text-xs ${muted}`}>{availability.sub}</div>
              </Card>

              <Card dark={dark} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs ${muted}`}>Form</div>
                  <TrendingUp size={16} className="text-blue-500" />
                </div>
                <div className={`text-lg font-bold ${text}`}>{f.avg ? f.avg.toFixed(2) : '—'}</div>
                <div className={`text-xs ${muted}`}>
                  Trend: <span className={f.delta > 0 ? 'text-emerald-400' : f.delta < 0 ? 'text-red-400' : muted}>{f.delta ? (f.delta > 0 ? `+${f.delta.toFixed(2)}` : f.delta.toFixed(2)) : '0.00'}</span>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <RoleFitPanel player={{ ...player, attributes: player.attrs }} positionGroup={activeRoleGroup} selectedRoleId={selectedRole?.role?.id} onRoleSelect={handleRoleSelect} />

              <Card dark={dark} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${text}`}>Key Attributes</h3>
                  {selectedRole?.role && (
                    <span className="text-xs text-blue-400">{selectedRole.role.displayName}</span>
                  )}
                </div>
                {(() => {
                  const role = selectedRole?.role;
                  const isGK = isGoalkeeperPlayer(player);
                  const groupedAttrs = categorizeRoleAttributesByGroup(role, a, isGK);
                  const groupOrder = isGK 
                    ? ['Goalkeeping', 'Mental', 'Physical', 'Technical', 'Set Pieces']
                    : ['Technical', 'Set Pieces', 'Mental', 'Physical', 'Goalkeeping'];
                  const hasAttrs = groupOrder.some(g => groupedAttrs[g]?.length > 0);
                  
                  if (!hasAttrs) {
                    return (
                      <div className={`text-sm ${muted} text-center py-4`}>
                        Select a role to see key attributes
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      {groupOrder.map(groupName => {
                        const attrs = groupedAttrs[groupName] || [];
                        if (attrs.length === 0) return null;
                        
                        return (
                          <div key={groupName}>
                            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-slate-700/30">
                              {groupName === 'Goalkeeping' && <GKIcon size={12} />}
                              <span className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>{groupName}</span>
                              <Badge variant="default" dark={dark} size="xs">{attrs.length}</Badge>
                            </div>
                            <div className="space-y-1">
                              {attrs.map(attr => (
                                <div key={attr.key} className={`flex items-center gap-2 py-1 px-2 rounded-lg ${
                                  attr.type === 'key' ? 'bg-emerald-500/10' :
                                  attr.type === 'unnecessary' ? 'bg-slate-500/5' :
                                  'bg-transparent'
                                }`}>
                                  <span className={`text-sm flex-1 ${
                                    attr.type === 'key' ? 'font-semibold text-emerald-400' :
                                    attr.type === 'preferred' ? 'text-blue-300' :
                                    'text-slate-500 line-through'
                                  }`}>{attr.name}</span>
                                  <AttributeValue value={attr.value} size="sm" />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-4 pt-2 border-t border-slate-700/20">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className={`text-[10px] ${muted}`}>Key</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          <span className={`text-[10px] ${muted}`}>Preferred</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                          <span className={`text-[10px] ${muted}`}>Unnecessary</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>
          </div>
        )}

        
{activeTab === 'attributes' && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    {(() => {
      const columns = buildFm26AttributeColumns(isGKPlayer, visibleAttrGroups || []);

      return columns.map((col, colIdx) => (
        <div key={`attr_col_${colIdx}`} className="space-y-5">
          {col.map((groupName) => {
            const items = attributeGroups?.[groupName] || [];

            return (
              <Card key={groupName} dark={dark} className="p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/30">
                  {groupName === 'Goalkeeping' ? <GKIcon size={14} /> : null}
                  <h3 className={`text-sm font-semibold ${text}`}>{groupName}</h3>
                  <Badge variant="default" dark={dark} size="xs">{items.length}</Badge>
                </div>
                <div className="space-y-1">
                  {items.map(({ label, value, key }) => {
                    const tooltip = getAttributeTooltip(key, groupName);
                    return (
                      <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg odd:bg-slate-800/30">
                        <AttributeTooltip label={label} tooltip={tooltip}>
                          <span className={`text-sm ${muted}`}>{label}</span>
                          {tooltip && <Info size={12} className="text-slate-500 ml-1" />}
                        </AttributeTooltip>
                        <AttributeValue value={value} size="sm" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ));
    })()}
  </div>
)}

        {activeTab === 'positions' && (() => {
          const currentRatings = player.positionRatings || {
            'GK': isGoalkeeperPlayer(player) ? 18 : 1,
            'D(L)': isGoalkeeperPlayer(player) ? 1 : Math.round(10 + hash01(`${player.id}:DL`) * 8),
            'D(C)': isGoalkeeperPlayer(player) ? 1 : Math.round(10 + hash01(`${player.id}:DC`) * 8),
            'D(R)': isGoalkeeperPlayer(player) ? 1 : Math.round(10 + hash01(`${player.id}:DR`) * 8),
            'WB(L)': isGoalkeeperPlayer(player) ? 1 : Math.round(8 + hash01(`${player.id}:WBL`) * 10),
            'WB(R)': isGoalkeeperPlayer(player) ? 1 : Math.round(8 + hash01(`${player.id}:WBR`) * 10),
            'DM': isGoalkeeperPlayer(player) ? 1 : Math.round(8 + hash01(`${player.id}:DM`) * 10),
            'M(L)': isGoalkeeperPlayer(player) ? 1 : Math.round(10 + hash01(`${player.id}:ML`) * 8),
            'M(C)': isGoalkeeperPlayer(player) ? 1 : Math.round(10 + hash01(`${player.id}:MC`) * 8),
            'M(R)': isGoalkeeperPlayer(player) ? 1 : Math.round(10 + hash01(`${player.id}:MR`) * 8),
            'AM(L)': isGoalkeeperPlayer(player) ? 1 : Math.round(12 + hash01(`${player.id}:AML`) * 8),
            'AM(C)': isGoalkeeperPlayer(player) ? 1 : Math.round(12 + hash01(`${player.id}:AMC`) * 8),
            'AM(R)': isGoalkeeperPlayer(player) ? 1 : Math.round(12 + hash01(`${player.id}:AMR`) * 8),
            'ST(C)': isGoalkeeperPlayer(player) ? 1 : Math.round(10 + hash01(`${player.id}:ST`) * 10),
          };
          
          const ca = player.ca ?? 130;
          const pa = player.pa ?? (ca + Math.round(hash01(`${player.id}:pa`) * 30));
          const growthFactor = pa > ca ? (pa / ca) : 1;
          
          const potentialRatings = Object.fromEntries(
            Object.entries(currentRatings).map(([pos, rating]) => [
              pos,
              Math.min(20, Math.round(rating * growthFactor + hash01(`${player.id}:${pos}:pot`) * 2))
            ])
          );
          
          const positionRatings = showPotentialRating ? potentialRatings : currentRatings;
          
          const leftFoot = player.leftFoot ?? Math.round(10 + hash01(`${player.id}:LF`) * 10);
          const rightFoot = player.rightFoot ?? Math.round(10 + hash01(`${player.id}:RF`) * 10);
          
          const preferredMoves = player.preferredMoves || [
            'Runs With Ball Often',
            'Tries Killer Balls Often',
            'Gets Into Opposition Area',
          ].filter(() => hash01(`${player.id}:move${Math.random()}`) > 0.3);
          
          const sortedPositions = Object.entries(positionRatings)
            .map(([pos, rating]) => {
              const currentVal = currentRatings[pos];
              const potentialVal = potentialRatings[pos];
              return { pos, rating, currentVal, potentialVal, label: POSITION_MAP[pos]?.label || pos };
            })
            .sort((a, b) => b.rating - a.rating);
          
          const selectedPosData = POSITION_MAP[selectedPosition] || null;
          
          return (
            <div className="grid grid-cols-2 gap-5">
              {/* Left: Overview Panel */}
              <Card dark={dark} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${text}`}>Overview</h3>
                  <button
                    onClick={() => setShowPotentialRating(!showPotentialRating)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      showPotentialRating 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                        : `${dark ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                    }`}
                  >
                    <TrendingUp size={12} />
                    {showPotentialRating ? 'Potential' : 'Current'}
                  </button>
                </div>
                
                {/* Positions List */}
                <div className="mb-5">
                  <div className={`text-xs font-medium ${muted} uppercase tracking-wider mb-2`}>
                    Positions {showPotentialRating && <span className="text-purple-400">(Potential)</span>}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {sortedPositions.map(({ pos, rating, currentVal, potentialVal, label }) => {
                      const colors = getPositionColor(rating);
                      const growth = potentialVal - currentVal;
                      return (
                        <button
                          key={pos}
                          onClick={() => setSelectedPosition(pos)}
                          className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                            selectedPosition === pos 
                              ? 'bg-blue-500/15 border border-blue-500/30' 
                              : `${dark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`
                          }`}
                        >
                          <span className={`text-sm ${text}`}>{label}</span>
                          <div className="flex items-center gap-2">
                            {showPotentialRating && growth > 0 && (
                              <span className="text-xs text-purple-400">+{growth}</span>
                            )}
                            <span className={`text-sm font-bold px-2 py-0.5 rounded`} style={{ backgroundColor: colors.bg, color: colors.text }}>
                              {rating}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Feet Section */}
                <div className="mb-5">
                  <div className={`text-xs font-medium ${muted} uppercase tracking-wider mb-2`}>Feet</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                      <div className={`text-xs ${muted}`}>Left Foot</div>
                      <div className={`text-lg font-bold ${leftFoot >= 15 ? 'text-emerald-400' : leftFoot >= 10 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {leftFoot}
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                      <div className={`text-xs ${muted}`}>Right Foot</div>
                      <div className={`text-lg font-bold ${rightFoot >= 15 ? 'text-emerald-400' : rightFoot >= 10 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {rightFoot}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Preferred Moves */}
                <div>
                  <div className={`text-xs font-medium ${muted} uppercase tracking-wider mb-2`}>Preferred Moves</div>
                  {preferredMoves.length > 0 ? (
                    <div className="space-y-1">
                      {preferredMoves.map((move, i) => (
                        <div key={i} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                          <Zap size={12} className="text-amber-400" />
                          <span className={`text-sm ${text}`}>{move}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-sm ${muted} italic`}>No preferred moves</div>
                  )}
                </div>
              </Card>
              
              {/* Right: Football Pitch */}
              <Card dark={dark} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${text}`}>Positions</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> 15+</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> 10-14</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 5-9</span>
                  </div>
                </div>
                
                <FootballPitch 
                  positionRatings={positionRatings}
                  selectedPosition={selectedPosition}
                  onSelectPosition={setSelectedPosition}
                  dark={dark}
                />
                
                {selectedPosData && (
                  <div className={`mt-4 p-3 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                    <div className={`text-xs ${muted}`}>Selected</div>
                    <div className={`text-sm font-semibold ${text}`}>{selectedPosData.label}</div>
                    <div className={`text-xs ${muted} mt-1`}>Rating: {positionRatings[selectedPosition]}</div>
                  </div>
                )}
              </Card>
              
              {/* Role Rating Panel */}
              {selectedPosition && (() => {
                const posGroup = POSITION_TO_GROUP[selectedPosition];
                if (!posGroup) return null;
                
                const ipRoles = getRolesByPhaseAndGroup('IP', posGroup);
                const oopRoles = getRolesByPhaseAndGroup('OOP', posGroup);
                
                const playerAttrs = convertAttrsToFM26Format(player.attrs || {});
                
                const ipRoleFits = ipRoles.map(role => {
                  const fit = computeRoleFit(role, playerAttrs, DEFAULT_RATING_ENGINE_SETTINGS);
                  return { ...role, fit: fit.score };
                }).sort((a, b) => b.fit - a.fit);
                
                const oopRoleFits = oopRoles.map(role => {
                  const fit = computeRoleFit(role, playerAttrs, DEFAULT_RATING_ENGINE_SETTINGS);
                  return { ...role, fit: fit.score };
                }).sort((a, b) => b.fit - a.fit);
                
                return (
                  <Card dark={dark} className="p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className={`font-semibold ${text}`}>Role Rating</h3>
                        <div className={`text-xs ${muted}`}>{POSITION_MAP[selectedPosition]?.label}</div>
                      </div>
                      <Badge variant="primary" size="sm">FM26</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* In Possession Roles */}
                      <div>
                        <div className={`text-xs font-medium ${muted} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          In Possession (IP)
                        </div>
                        <div className="space-y-2">
                          {ipRoleFits.length > 0 ? ipRoleFits.map(role => {
                            const fitPercent = Math.round(role.fit * 5);
                            const colors = getRoleFitColor(role.fit);
                            return (
                              <div 
                                key={role.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border ${colors.border} ${colors.bg}`}
                              >
                                <span className={`text-sm ${text}`}>{role.displayName}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${role.fit >= 12 ? 'bg-emerald-500' : role.fit >= 9 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                                      style={{ width: `${Math.min(fitPercent, 100)}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-bold ${colors.text} w-12 text-right`}>
                                    {role.fit.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className={`text-sm ${muted} italic py-2`}>No IP roles available</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Out of Possession Roles */}
                      <div>
                        <div className={`text-xs font-medium ${muted} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Out of Possession (OOP)
                        </div>
                        <div className="space-y-2">
                          {oopRoleFits.length > 0 ? oopRoleFits.map(role => {
                            const fitPercent = Math.round(role.fit * 5);
                            const colors = getRoleFitColor(role.fit);
                            return (
                              <div 
                                key={role.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border ${colors.border} ${colors.bg}`}
                              >
                                <span className={`text-sm ${text}`}>{role.displayName}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${role.fit >= 12 ? 'bg-emerald-500' : role.fit >= 9 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                                      style={{ width: `${Math.min(fitPercent, 100)}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-bold ${colors.text} w-12 text-right`}>
                                    {role.fit.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className={`text-sm ${muted} italic py-2`}>No OOP roles available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>
          );
        })()}


        {activeTab === 'transfer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card dark={dark} className="p-5 lg:col-span-2">
              <h3 className={`font-semibold ${text} mb-4`}>Deal Snapshot</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Market value', value: player.value || '—' },
                  { label: 'Wage', value: contract.wage || '—' },
                  { label: 'Contract until', value: formatISODate(contract.until) },
                ].map((x) => (
                  <div key={x.label} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                    <div className={`text-xs ${muted}`}>{x.label}</div>
                    <div className={`text-sm font-semibold ${text}`}>{x.value}</div>
                  </div>
                ))}
              </div>

              <div className={`mt-4 p-4 rounded-2xl border ${border} ${dark ? 'bg-amber-500/5' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Info size={16} className="text-amber-500" />
                  <div className={`text-sm font-semibold ${text}`}>Next phases</div>
                </div>
                <div className={`text-xs ${muted}`}>This tab will later include clause radar, fee estimation, and deal intelligence widgets (g edition).</div>
              </div>
            </Card>

            <Card dark={dark} className="p-5">
              <h3 className={`font-semibold ${text} mb-4`}>Availability</h3>

              <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className={`text-sm font-semibold ${availability.status === 'danger' ? 'text-red-400' : 'text-emerald-400'}`}>{availability.label}</div>
                <div className={`text-xs ${muted} mt-1`}>{availability.sub}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'} mt-4`}>
                <div className={`text-xs ${muted}`}>Contract urgency</div>
                <div className={`text-sm font-semibold ${contractLeft.status === 'danger' ? 'text-red-400' : contractLeft.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>{contractLeft.label}</div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card dark={dark} className="p-5 lg:col-span-2">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className={`font-semibold ${text}`}>Scout Report</h3>
                  <div className={`text-xs ${muted} mt-1`}>Structured report builder (state-driven). Save persists per player within the prototype session.</div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    dark={dark}
                    icon={Sparkles}
                    onClick={() => {
                      const strengths = keyAttrs.slice(0, 3).map(x => x.name);
                      const weaknesses = weakAttrs.slice(0, 2).map(x => x.name);
                      const fitLine = `Role Fit: ${ipRole?.name}${roleMode === 'pair' ? ` ↔ ${oopRole?.name}` : ''} — ${roleScore.total} (${roleScoreDelta >= 0 ? `+${roleScoreDelta}` : roleScoreDelta} vs base)`;

                      setReportDraft((d) => {
                        const nextPros = (d.pros?.length ? d.pros : strengths.map(s => `Strength: ${s}`));
                        const nextCons = (d.cons?.length ? d.cons : weaknesses.map(w => `Improve: ${w}`));
                        const note = `Summary\n- ${fitLine}\n- Availability: ${availability.label}\n\nStrengths\n- ${strengths.join('\n- ') || '—'}\n\nRisks / Questions\n- ${injury.status === 'injured' ? (injury.desc || 'Injury') : (weaknesses.join(', ') || 'No major flags')}\n\nRecommendation\n- ${String(d.recommendation || 'shortlist').toUpperCase()} (${d.confidence}%)`;
                        return { ...d, note: d.note?.trim() ? d.note : note, pros: nextPros, cons: nextCons };
                      });

                      toast('success', 'Generated', 'Draft filled with derived insights.');
                    }}
                  >
                    Generate
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    dark={dark}
                    icon={Copy}
                    onClick={async () => {
                      const md = [
                        `# ${player.name} — Scout Report`,
                        ``,
                        `**Recommendation:** ${String(reportDraft.recommendation || '').toUpperCase()} • **Confidence:** ${reportDraft.confidence}% • **Rating:** ${reportDraft.ratingStars}/5`,
                        ``,
                        `**Role Fit:** ${ipRole?.name}${roleMode === 'pair' ? ` ↔ ${oopRole?.name}` : ''} — ${roleScore.total} (${roleScoreDelta >= 0 ? `+${roleScoreDelta}` : roleScoreDelta} vs base)`,
                        `**Availability:** ${availability.label}`,
                        `**Contract:** until ${formatISODate(contract.until)} (${contractLeft.label})`,
                        ``,
                        reportDraft.tags?.length ? `**Tags:** ${reportDraft.tags.join(', ')}` : '',
                        ``,
                        reportDraft.pros?.length ? `## Pros\n${reportDraft.pros.map(p => `- ${p}`).join('\n')}` : '',
                        ``,
                        reportDraft.cons?.length ? `## Cons\n${reportDraft.cons.map(c => `- ${c}`).join('\n')}` : '',
                        ``,
                        reportDraft.note?.trim() ? `## Notes\n${reportDraft.note.trim()}` : '',
                      ].filter(Boolean).join('\n');
                      const ok = await copyToClipboard(md);
                      toast(ok ? 'success' : 'error', ok ? 'Copied' : 'Copy failed', ok ? 'Report copied as Markdown.' : 'Clipboard unavailable.');
                    }}
                  >
                    Copy
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={Save}
                    onClick={() => {
                      const hadSaved = !!reportDraft.updatedAt;
                      const updatedAt = new Date().toISOString();
                      const payload = { ...reportDraft, updatedAt };
                      onSavePlayerReport?.(player.id, payload);
                      setReportDraft((d) => ({ ...d, updatedAt }));
                      toast('success', 'Report saved', hadSaved ? 'Updated existing report.' : 'Created new report.');
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className={`text-xs ${muted} mb-2`}>Recommendation</div>
                  <select
                    value={reportDraft.recommendation}
                    onChange={(e) => setReportDraft((d) => ({ ...d, recommendation: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'}`}
                  >
                    <option value="sign">Sign</option>
                    <option value="shortlist">Shortlist</option>
                    <option value="monitor">Monitor</option>
                    <option value="avoid">Avoid</option>
                  </select>

                  <div className={`text-xs ${muted} mt-3`}>Last saved</div>
                  <div className={`text-sm font-semibold ${text}`}>{reportDraft.updatedAt ? formatTimeAgo(reportDraft.updatedAt) : '—'}</div>
                </div>

                <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-xs ${muted}`}>Confidence</div>
                    <div className={`text-xs ${text}`}>{reportDraft.confidence}%</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={reportDraft.confidence}
                    onChange={(e) => setReportDraft((d) => ({ ...d, confidence: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className={`text-xs ${muted} mt-2`}>Higher confidence boosts shortlist priority (later).</div>
                </div>

                <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className={`text-xs ${muted} mb-2`}>Overall rating</div>
                  <div className="flex items-center gap-1.5">
                    {[1,2,3,4,5].map((i) => (
                      <button
                        key={i}
                        onClick={() => setReportDraft((d) => ({ ...d, ratingStars: i }))}
                        className="p-1 rounded-lg hover:bg-slate-700/30"
                        title={`${i} / 5`}
                      >
                        <Star size={16} className={i <= (reportDraft.ratingStars || 0) ? 'text-amber-500' : muted} />
                      </button>
                    ))}
                    <span className={`text-xs ${muted} ml-2`}>{reportDraft.ratingStars}/5</span>
                  </div>

                  <div className={`mt-3 p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-950/30' : 'bg-slate-50'}`}>
                    <div className={`text-xs ${muted}`}>Role Fit</div>
                    <div className={`text-sm font-semibold ${text}`}>{roleScore.total} <span className={muted}>({roleScoreDelta >= 0 ? `+${roleScoreDelta}` : roleScoreDelta})</span></div>
                    <div className={`text-xs ${muted} mt-1 break-words`}>{ipRole?.name}{roleMode === 'pair' ? ` ↔ ${oopRole?.name}` : ''}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-xs ${muted}`}>Tags</div>
                  <div className={`text-xs ${muted}`}>click to toggle</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Starter-ready', 'High ceiling', 'Value', 'Homegrown', 'Injury risk', 'Tactical fit'].map((t) => {
                    const active = (reportDraft.tags || []).includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => setReportDraft((d) => {
                          const tags = Array.isArray(d.tags) ? d.tags : [];
                          return { ...d, tags: active ? tags.filter(x => x !== t) : [...tags, t] };
                        })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${border} ${
                          active ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : `${dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'}`
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-sm font-semibold ${text}`}>Pros</div>
                    <Badge variant="success" size="xs">{(reportDraft.pros || []).length}</Badge>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <input
                      value={reportProInput}
                      onChange={(e) => setReportProInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = reportProInput.trim();
                          if (!v) return;
                          setReportDraft((d) => ({ ...d, pros: [...(d.pros || []), v] }));
                          setReportProInput('');
                        }
                      }}
                      placeholder="Add a pro… (Enter)"
                      className={`flex-1 px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900/20 text-white placeholder:text-slate-500' : 'bg-white text-slate-900 placeholder:text-slate-400'}`}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      dark={dark}
                      icon={Plus}
                      onClick={() => {
                        const v = reportProInput.trim();
                        if (!v) return;
                        setReportDraft((d) => ({ ...d, pros: [...(d.pros || []), v] }));
                        setReportProInput('');
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(reportDraft.pros || []).length === 0 ? (
                      <div className={`text-xs ${muted}`}>No pros yet. Use Generate or add manually.</div>
                    ) : (reportDraft.pros || []).map((p, idx) => (
                      <div key={`${p}-${idx}`} className={`flex items-center gap-2 p-2 rounded-xl border ${border} ${dark ? 'bg-slate-950/20' : 'bg-slate-50'}`}>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <div className={`text-sm ${text} flex-1`}>{p}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          dark={dark}
                          icon={X}
                          onClick={() => setReportDraft((d) => ({ ...d, pros: (d.pros || []).filter((_, i) => i !== idx) }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-sm font-semibold ${text}`}>Cons / Risks</div>
                    <Badge variant="warning" size="xs">{(reportDraft.cons || []).length}</Badge>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <input
                      value={reportConInput}
                      onChange={(e) => setReportConInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = reportConInput.trim();
                          if (!v) return;
                          setReportDraft((d) => ({ ...d, cons: [...(d.cons || []), v] }));
                          setReportConInput('');
                        }
                      }}
                      placeholder="Add a con… (Enter)"
                      className={`flex-1 px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900/20 text-white placeholder:text-slate-500' : 'bg-white text-slate-900 placeholder:text-slate-400'}`}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      dark={dark}
                      icon={Plus}
                      onClick={() => {
                        const v = reportConInput.trim();
                        if (!v) return;
                        setReportDraft((d) => ({ ...d, cons: [...(d.cons || []), v] }));
                        setReportConInput('');
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(reportDraft.cons || []).length === 0 ? (
                      <div className={`text-xs ${muted}`}>No risks yet. Use Generate or add manually.</div>
                    ) : (reportDraft.cons || []).map((c, idx) => (
                      <div key={`${c}-${idx}`} className={`flex items-center gap-2 p-2 rounded-xl border ${border} ${dark ? 'bg-slate-950/20' : 'bg-slate-50'}`}>
                        <AlertCircle size={16} className="text-amber-400" />
                        <div className={`text-sm ${text} flex-1`}>{c}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          dark={dark}
                          icon={X}
                          onClick={() => setReportDraft((d) => ({ ...d, cons: (d.cons || []).filter((_, i) => i !== idx) }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-semibold ${text}`}>Notes</div>
                  <div className={`text-xs ${muted}`}>Free-form (included in exports)</div>
                </div>
                <textarea
                  value={reportDraft.note}
                  onChange={(e) => setReportDraft((d) => ({ ...d, note: e.target.value }))}
                  placeholder="Write notes for this player…"
                  className={`w-full min-h-[180px] px-4 py-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20 text-white placeholder:text-slate-500' : 'bg-white text-slate-900 placeholder:text-slate-400'}`}
                />
              </div>
            </Card>

            <Card dark={dark} className="p-5">
              <h3 className={`font-semibold ${text} mb-4`}>Quick Summary</h3>

              <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className={`text-xs ${muted}`}>Strengths (auto)</div>
                <div className={`text-sm ${text} mt-1`}>{keyAttrs.slice(0, 4).map(x => x.name).join(', ') || '—'}</div>
                <div className={`text-xs ${muted} mt-2`}>Weaknesses (auto)</div>
                <div className={`text-sm ${text} mt-1`}>{weakAttrs.slice(0, 3).map(x => x.name).join(', ') || '—'}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'} mt-4`}>
                <div className={`text-xs ${muted}`}>Tactical fit</div>
                <div className="flex items-center justify-between mt-1">
                  <div className={`text-sm font-semibold ${text}`}>{roleScore.total}</div>
                  <Badge variant={roleScoreDelta >= 0 ? 'success' : 'danger'} size="xs">{roleScoreDelta >= 0 ? `+${roleScoreDelta}` : roleScoreDelta}</Badge>
                </div>
                <div className={`text-xs ${muted} mt-1 break-words`}>{ipRole?.name}{roleMode === 'pair' ? ` ↔ ${oopRole?.name}` : ''}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'} mt-4`}>
                <div className={`text-xs ${muted}`}>Risks</div>
                <div className={`text-sm ${text} mt-1`}>
                  {injury.status === 'injured' ? (injury.desc || 'Injury') : (contractLeft.status === 'warning' ? 'Contract nearing end' : 'No major flags')}
                </div>
                <div className={`text-xs ${muted} mt-1`}>{availability.label}</div>
              </div>

              <div className={`mt-4 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-slate-50'} flex items-start gap-3`}>
                <Info size={16} className="text-blue-500 mt-0.5" />
                <div>
                  <div className={`text-sm font-semibold ${text}`}>Next step</div>
                  <div className={`text-xs ${muted} mt-1`}>Later we’ll connect this to “Pro Reports (g)” exports and add attachments + versioning.</div>
                </div>
              </div>
            </Card>
          </div>
        )}


        {activeTab === 'development' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card dark={dark} className="p-5 lg:col-span-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <div className="flex items-center gap-2 mb-4">
                <Crown size={16} className="text-amber-500" />
                <h3 className={`font-semibold ${text}`}>Development Forecast</h3>
                <Badge variant="gold" size="xs">PRO</Badge>
              </div>
              <div className={`text-sm ${muted}`}>The full development model is coming later. This panel will eventually show growth curves, training impact and scenario planning.</div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                {[
                  { label: 'Peak age', value: '27 (est.)' },
                  { label: 'Progress rate', value: 'Fast (est.)' },
                  { label: 'Risk', value: injury.status === 'injured' ? 'Medium' : 'Low' },
                ].map((x) => (
                  <div key={x.label} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-white'}`}>
                    <div className={`text-xs ${muted}`}>{x.label}</div>
                    <div className={`text-sm font-semibold ${text}`}>{x.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card dark={dark} className="p-5">
              <h3 className={`font-semibold ${text} mb-4`}>Upgrade</h3>
              <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className={`text-sm font-semibold ${text}`}>g Edition required</div>
                <div className={`text-xs ${muted} mt-1`}>Unlock forecasts, cohort comps, and plan exports.</div>
                <Button variant="gold" size="md" icon={Crown} className="w-full mt-4">Upgrade</Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {showShortlistModal && <ShortlistModal />}
      {showHistoryModal && <HistoryModal />}
    </div>
  );
};
// ============================================
// Screen: Shortlists
// ============================================

// ============================================
// Screen: Shortlists (state-driven)
// ============================================
const ShortlistScreen = ({ dark, shortlists = [], shortlistEntries = {}, players = SAMPLE_PLAYERS, onSelectPlayer, onRemoveFromShortlist, pushToast }) => {
  const [activeList, setActiveList] = useState(shortlists?.[0]?.id || 'fm-shortlist');
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const surface = dark ? 'bg-slate-800/50 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const hover = dark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const toast = (variant, title, message) => pushToast?.({ variant, title, message });

  const lists = shortlists?.length ? shortlists : [{ id: 'fm-shortlist', name: 'FM Shortlist', color: 'blue', synced: true }];
  const active = lists.find(l => l.id === activeList) || lists[0];
  const entries = shortlistEntries?.[active.id] || {};
  const playerRows = Object.keys(entries)
    .map((pid) => ({ pid, entry: entries[pid], player: players.find(p => p.id === pid) }))
    .filter((x) => x.player);

  const tagColors = {
    target: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    watchlist: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    loan: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    do_not_buy: 'bg-red-500/15 text-red-400 border-red-500/20',
  };

  return (
    <div className={`flex-1 flex ${bg}`}>
      <div className={`w-72 ${surface} border-r ${border} flex flex-col`}>
        <div className={`p-4 border-b ${border}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-semibold ${text}`}>Shortlists</h2>
            <Button variant="ghost" size="sm" icon={Plus} dark={dark} title="Create (prototype)" />
          </div>
          <div className={`flex items-center gap-2 text-xs ${dark ? 'bg-emerald-500/10' : 'bg-emerald-50'} text-emerald-400 px-3 py-2 rounded-xl border border-emerald-500/20`}>
            <Check size={14} /><span>Synced with FM</span><span className={`ml-auto ${muted}`}>2m ago</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-1">
          {lists.map((list) => {
            const count = Object.keys(shortlistEntries?.[list.id] || {}).length;
            return (
              <button
                key={list.id}
                onClick={() => setActiveList(list.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activeList === list.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : `${hover} ${muted}`}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${list.color === 'emerald' ? 'bg-emerald-500' : list.color === 'amber' ? 'bg-amber-500' : list.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                <span className="flex-1 text-left text-sm font-medium">{list.name}</span>
                <span className="text-xs">{count}</span>
              </button>
            );
          })}
        </div>

        <div className={`p-3 border-t ${border} space-y-2`}>
          <Button variant="secondary" size="sm" icon={Upload} dark={dark} className="w-full">Import</Button>
          <Button variant="secondary" size="sm" icon={Download} dark={dark} className="w-full">Export</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className={`h-14 ${surface} border-b ${border} flex items-center px-6 gap-4`}>
          <h1 className={`font-semibold ${text}`}>{active?.name || 'Shortlist'}</h1>
          <Badge variant="primary">{playerRows.length} players</Badge>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" icon={RefreshCw} dark={dark}>Sync</Button>
          <Button variant="ghost" size="sm" icon={GitCompare} dark={dark} title="Compare (open Comparison screen)">Compare</Button>
        </header>

        <div className="flex-1 overflow-auto">
          {playerRows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={List}
                title="No players in this shortlist"
                description="Add players from Player Profile or Search."
                action={<Button variant="secondary" size="sm" dark={dark} icon={Plus}>Add Players</Button>}
                dark={dark}
              />
            </div>
          ) : (
            playerRows.map(({ pid, entry, player }) => (
              <div
                key={pid}
                className={`flex items-center gap-4 px-6 py-4 border-b ${border} ${hover} ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                onClick={() => onSelectPlayer?.(pid)}
              >
                <Avatar dark={dark} name={player.name} size="lg" />
                <div className="flex-1">
                  <div className={`font-medium ${text} flex items-center gap-2`}>
                    {player.name} <span className="text-sm">{player.nation}</span>
                  </div>
                  <div className={`text-sm ${muted}`}>{player.pos} • {player.club}</div>
                </div>

                <div className="flex items-center gap-2">
                  <AttributeValue value={Math.floor(player.ca / 10)} size="sm" />
                  <span className={muted}>/</span>
                  <AttributeValue value={Math.floor(player.pa / 10)} size="sm" />
                </div>

                {entry?.tag && (
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${tagColors[entry.tag] || tagColors.watchlist}`}>{entry.tag}</span>
                )}
                {entry?.note && <span className={`text-xs ${muted} max-w-40 truncate`}>{entry.note}</span>}

                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    dark={dark}
                    title="Remove from shortlist"
                    onClick={() => {
                      onRemoveFromShortlist?.(pid, active.id);
                      toast('warning', 'Removed', `${player.name} removed from ${active.name}.`);
                    }}
                  />
                  <Button variant="ghost" size="sm" icon={MoreHorizontal} dark={dark} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
// ============================================
// Screen: Comparison
// ============================================

// ============================================
// Screen: Comparison (state-driven)
// ============================================
const ComparisonScreen = ({
  dark,
  players = SAMPLE_PLAYERS,
  comparisonIds = [],
  onToggleCompare,
  onSelectPlayer,
  onReplaceCompareSlot,
  onMakeBase,
  pushToast,
}) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark
    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800'
    : 'bg-gradient-to-br from-slate-50 to-white';

  const MAX_COMPARE = 5;

  const comparedPlayers = (comparisonIds || [])
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  const basePlayer = comparedPlayers?.[0] || null;
  const baseIsGK = isGoalkeeperPlayer(basePlayer);

  const defaultCompareGroups = useMemo(
    () => (baseIsGK ? DEFAULT_GROUPS_GK : DEFAULT_GROUPS_OUTFIELD),
    [basePlayer?.id, baseIsGK]
  );

  const [selectedCompareGroups, setSelectedCompareGroups] = useState(defaultCompareGroups);
  const compareGroupRefs = useRef({});

  useEffect(() => {
    setSelectedCompareGroups(defaultCompareGroups);
    compareGroupRefs.current = {};
  }, [basePlayer?.id]);

  const orderedSelectedGroups = ATTRIBUTE_GROUP_ORDER.filter((g) => (selectedCompareGroups || []).includes(g));

  const [notice, setNotice] = useState(null);

  const safeToast = (variant, title, message) => {
    if (pushToast) pushToast({ variant, title, message });
    else setNotice(message);
  };

  // --- Add player search (name or id) ---
  const [addQuery, setAddQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const addCandidates = useMemo(() => {
    const q = (addQuery || '').trim().toLowerCase();
    if (!q) return [];
    return (players || [])
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return name.includes(q) || id.includes(q);
      })
      .slice(0, 10);
  }, [addQuery, players]);

  const ensureAddToCompare = (playerId) => {
    if (!playerId) return;
    setNotice(null);

    if ((comparisonIds || []).includes(playerId)) {
      safeToast('info', 'Already added', 'That player is already in your compare list.');
      return;
    }

    if ((comparisonIds || []).length >= MAX_COMPARE) {
      safeToast('warning', 'Compare limit', `You can compare up to ${MAX_COMPARE} players.`);
      return;
    }

    onToggleCompare?.(playerId);
    setAddQuery('');
    setAddOpen(false);
  };

  const onAddKeyDown = (e) => {
    if (e.key === 'Escape') {
      setAddOpen(false);
      return;
    }

    if (e.key !== 'Enter') return;

    const q = (addQuery || '').trim();
    if (!q) return;

    const exact = (players || []).find((p) => (p.id || '').toLowerCase() === q.toLowerCase());
    if (exact) {
      ensureAddToCompare(exact.id);
      return;
    }

    if (addCandidates.length === 1) ensureAddToCompare(addCandidates[0].id);
  };

  const removeFromCompare = (playerId) => {
    if (!playerId) return;
    if (playerId === basePlayer?.id) {
      safeToast('info', 'Base player', 'The base player cannot be removed. Use Swap Base or Quick Replace.');
      return;
    }
    onToggleCompare?.(playerId);
  };

  // --- Group jump ---
  const jumpToGoalkeeping = () => {
    setSelectedCompareGroups((prev) => {
      const has = (prev || []).includes('Goalkeeping');
      const next = has ? (prev || []) : [...(prev || []), 'Goalkeeping'];
      return ATTRIBUTE_GROUP_ORDER.filter((g) => next.includes(g));
    });

    setTimeout(() => {
      const el = compareGroupRefs.current?.Goalkeeping;
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  // --- Replace helpers ---
  const replaceAtIndex = (index, newId) => {
    if (index == null || index < 0) return;
    if (!newId) return;

    if ((comparisonIds || []).includes(newId)) {
      safeToast('info', 'Already added', 'That player is already in your compare list.');
      return;
    }

    if (typeof onReplaceCompareSlot === 'function') {
      onReplaceCompareSlot(index, newId);
      return;
    }

    // Fallback: remove old then add new
    const old = comparisonIds[index];
    if (old) onToggleCompare?.(old);
    setTimeout(() => onToggleCompare?.(newId), 0);
  };

  // ========================================
  // Quick Replace (separated state)
  // ========================================
  const [toolbarQrOpen, setToolbarQrOpen] = useState(false);
  const [toolbarQrSlotIndex, setToolbarQrSlotIndex] = useState(1);
  const [toolbarQrQuery, setToolbarQrQuery] = useState('');

  const [cardQrOpenIndex, setCardQrOpenIndex] = useState(null); // index in comparedPlayers
  const [cardQrQuery, setCardQrQuery] = useState('');

  const [swapBaseOpen, setSwapBaseOpen] = useState(false);

  const toolbarQrWrapRef = useRef(null);
  const swapBaseWrapRef = useRef(null);

  // Close toolbar popovers on outside click
  useEffect(() => {
    const onDown = (e) => {
      const t = e.target;
      if (toolbarQrOpen && toolbarQrWrapRef.current && !toolbarQrWrapRef.current.contains(t)) {
        setToolbarQrOpen(false);
        setToolbarQrQuery('');
      }
      if (swapBaseOpen && swapBaseWrapRef.current && !swapBaseWrapRef.current.contains(t)) {
        setSwapBaseOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [toolbarQrOpen, swapBaseOpen]);

  useEffect(() => {
    // keep toolbar slot valid (slots start at 1 because base is index 0)
    const maxIdx = Math.max(0, comparedPlayers.length - 1);
    if (toolbarQrSlotIndex > maxIdx) setToolbarQrSlotIndex(Math.max(1, maxIdx));
  }, [comparedPlayers.length]);

  const toolbarQrCandidates = useMemo(() => {
    const q = (toolbarQrQuery || '').trim().toLowerCase();
    if (!q) return [];
    return (players || [])
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return (name.includes(q) || id.includes(q)) && !(comparisonIds || []).includes(p.id);
      })
      .slice(0, 10);
  }, [toolbarQrQuery, players, comparisonIds]);

  const cardQrCandidates = useMemo(() => {
    const q = (cardQrQuery || '').trim().toLowerCase();
    if (!q) return [];
    return (players || [])
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return (name.includes(q) || id.includes(q)) && !(comparisonIds || []).includes(p.id);
      })
      .slice(0, 10);
  }, [cardQrQuery, players, comparisonIds]);

  const doMakeBase = (playerId) => {
    if (!playerId || playerId === basePlayer?.id) return;
    if (typeof onMakeBase === 'function') {
      onMakeBase(playerId);
      safeToast('success', 'Base updated', 'Base player swapped. Defaults updated to match base type.');
    } else {
      safeToast('warning', 'Unavailable', 'Swap Base is not wired in this view.');
    }
  };

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `180px repeat(${Math.max(1, comparedPlayers.length)}, minmax(160px, 1fr))`,
    }),
    [comparedPlayers.length]
  );

  const HeaderCellBg = dark ? 'bg-slate-950/80' : 'bg-white/85';
  const StickyCellBg = dark ? 'bg-slate-900/70' : 'bg-white/90';

  const CompactPlayerCard = ({ p, index }) => {
    if (!p) return null;
    const canRemove = index !== 0;
    const slotLabel = `Slot ${index + 1}`;

    return (
      <div className={`rounded-2xl border ${border} ${dark ? 'bg-slate-900/25' : 'bg-white'} p-3`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant={index === 0 ? 'success' : 'default'} size="xs" dark={dark}>
                {slotLabel}{index === 0 ? ' • Base' : ''}
              </Badge>
            </div>

            <button
              className={`text-sm font-semibold ${text} hover:underline break-words`}
              onClick={() => onSelectPlayer?.(p.id)}
              title="Open profile"
            >
              {p.name}
            </button>
            <div className={`text-xs ${muted} break-words mt-0.5`}>{p.positionsLabel || p.pos} • {p.club}</div>
          </div>

          <div className="flex items-center gap-1">
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                dark={dark}
                title="Remove"
                onClick={() => removeFromCompare(p.id)}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className={`rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'} p-2`}>
            <div className={`text-[10px] ${muted}`}>CA</div>
            <div className="text-sm font-bold text-emerald-400">{p.ca}</div>
          </div>
          <div className={`rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'} p-2`}>
            <div className={`text-[10px] ${muted}`}>PA</div>
            <div className="text-sm font-bold text-blue-400">{p.pa}</div>
          </div>
          <div className={`rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'} p-2`}>
            <div className={`text-[10px] ${muted}`}>Value</div>
            <div className={`text-xs font-semibold ${text} break-words`}>{p.value || '—'}</div>
          </div>
        </div>

        {/* Inline Quick Replace (FM-like) */}
        {index !== 0 && (
          <div className="mt-3">
            <div className={`inline-flex items-center gap-2 text-[11px] ${muted} mb-1`}>Replace Slot {index + 1}</div>
            <div className={`flex items-center gap-2 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-white'} px-2 py-1.5`}>
              <Search size={14} className={muted} />
              <input
                value={cardQrOpenIndex === index ? cardQrQuery : ''}
                onChange={(e) => {
                  setCardQrOpenIndex(index);
                  setCardQrQuery(e.target.value);
                  // close other popovers
                  setToolbarQrOpen(false);
                  setToolbarQrQuery('');
                  setSwapBaseOpen(false);
                }}
                onFocus={() => {
                  setCardQrOpenIndex(index);
                  setToolbarQrOpen(false);
                  setToolbarQrQuery('');
                  setSwapBaseOpen(false);
                }}
                onBlur={() => setTimeout(() => {
                  setCardQrOpenIndex((cur) => (cur === index ? null : cur));
                }, 120)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCardQrOpenIndex(null);
                    setCardQrQuery('');
                  }
                  if (e.key === 'Enter' && cardQrCandidates.length === 1) {
                    replaceAtIndex(index, cardQrCandidates[0].id);
                    setCardQrQuery('');
                    setCardQrOpenIndex(null);
                  }
                }}
                placeholder="Search name or ID"
                className={`w-full bg-transparent outline-none text-xs ${text}`}
              />
            </div>

            {cardQrOpenIndex === index && (cardQrCandidates || []).length > 0 && (
              <div className={`mt-2 rounded-2xl border ${border} ${dark ? 'bg-slate-950' : 'bg-white'} overflow-hidden`}> 
                {(cardQrCandidates || []).slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      replaceAtIndex(index, c.id);
                      setCardQrQuery('');
                      setCardQrOpenIndex(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} flex items-center justify-between gap-2`}
                  >
                    <div className="min-w-0">
                      <div className={`font-medium ${text} break-words`}>{c.name}</div>
                      <div className={`text-[10px] ${muted} break-words`}>{c.id} • {c.positionsLabel || c.pos} • {c.club}</div>
                    </div>
                    <Badge variant="default" size="xs" dark={dark}>{c.value}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex-1 overflow-auto ${bg}`}>
      {/* Sticky compare toolbar */}
      <div className={`sticky top-0 z-30 border-b ${border} ${dark ? 'bg-slate-950/70' : 'bg-white/80'} backdrop-blur`}>
        <div className="px-8 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl font-bold ${text}`}>Comparison</h1>
                <Badge variant="primary" size="xs">{comparedPlayers.length} / {MAX_COMPARE}</Badge>
                {basePlayer && (
                  <span className={`text-xs ${muted}`}>Base: <span className={`${text} font-medium`}>{basePlayer.name}</span></span>
                )}
              </div>
              <div className={`text-xs ${muted} mt-1`}>Search by name or player ID. Cards align with the attribute columns below.</div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={Download} dark={dark}>Export</Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Add player */}
            <div className={`relative flex items-center gap-2 px-3 py-2 rounded-2xl border ${border} ${dark ? 'bg-slate-900/30' : 'bg-white'} w-80 max-w-full`}>
              <Search size={16} className={muted} />
              <input
                value={addQuery}
                onChange={(e) => {
                  setAddQuery(e.target.value);
                  setAddOpen(true);
                }}
                onFocus={() => setAddOpen(true)}
                onBlur={() => setTimeout(() => setAddOpen(false), 120)}
                onKeyDown={onAddKeyDown}
                placeholder="Add player (name or ID)"
                className={`w-full bg-transparent outline-none text-sm ${text}`}
              />
              <Badge variant="default" size="xs" dark={dark}>+ add</Badge>

              {addOpen && addCandidates.length > 0 && (
                <div className={`absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl border ${border} ${dark ? 'bg-slate-950' : 'bg-white'} overflow-hidden shadow-2xl`}>
                  {addCandidates.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => ensureAddToCompare(c.id)}
                      className={`w-full px-4 py-3 text-left ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} flex items-center justify-between gap-3`}
                    >
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${text} break-words`}>{c.name}</div>
                        <div className={`text-[11px] ${muted} break-words`}>{c.id} • {c.positionsLabel || c.pos} • {c.club}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" size="xs" dark={dark}>{c.value}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Base */}
            <div className="relative" ref={swapBaseWrapRef}>
              <Button
                variant="secondary"
                size="sm"
                dark={dark}
                icon={RotateCcw}
                onClick={() => {
                  setSwapBaseOpen((v) => {
                    const next = !v;
                    if (next) {
                      setToolbarQrOpen(false);
                      setToolbarQrQuery('');
                      setCardQrOpenIndex(null);
                      setCardQrQuery('');
                    }
                    return next;
                  });
                }}
                title="Swap base player"
                disabled={comparedPlayers.length < 2}
              >
                Swap Base
              </Button>

              {swapBaseOpen && comparedPlayers.length > 1 && (
                <div className={`absolute top-[calc(100%+10px)] right-0 w-[360px] rounded-3xl border ${border} ${dark ? 'bg-slate-950' : 'bg-white'} shadow-2xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-semibold ${text}`}>Swap Base</div>
                    <Button variant="ghost" size="sm" dark={dark} icon={X} onClick={() => setSwapBaseOpen(false)} />
                  </div>
                  <div className={`text-xs ${muted} mt-1`}>Choose an existing slot to become Slot 1 (Base).</div>

                  <div className={`mt-3 rounded-2xl border ${border} overflow-hidden`}>
                    {comparedPlayers.slice(1).map((p, idx) => {
                      const slot = idx + 2;
                      return (
                        <button
                          key={p.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            doMakeBase(p.id);
                            setSwapBaseOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} flex items-center justify-between gap-3`}
                        >
                          <div className="min-w-0">
                            <div className={`text-sm font-medium ${text} break-words`}>Slot {slot}: {p.name}</div>
                            <div className={`text-[11px] ${muted} break-words`}>{p.positionsLabel || p.pos} • {p.club} • CA {p.ca} / PA {p.pa}</div>
                          </div>
                          <Badge variant="success" size="xs">Make Base</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Replace toolbar */}
            <div className="relative" ref={toolbarQrWrapRef}>
              <Button
                variant="secondary"
                size="sm"
                dark={dark}
                icon={RefreshCw}
                onClick={() => {
                  setToolbarQrOpen((v) => {
                    const next = !v;
                    if (next) {
                      setSwapBaseOpen(false);
                      setCardQrOpenIndex(null);
                      setCardQrQuery('');
                    }
                    return next;
                  });
                }}
                disabled={comparedPlayers.length < 2}
              >
                Quick Replace
              </Button>

              {toolbarQrOpen && comparedPlayers.length > 1 && (
                <div className={`absolute top-[calc(100%+10px)] right-0 w-[440px] rounded-3xl border ${border} ${dark ? 'bg-slate-950' : 'bg-white'} shadow-2xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-semibold ${text}`}>Quick Replace</div>
                    <Button variant="ghost" size="sm" dark={dark} icon={X} onClick={() => { setToolbarQrOpen(false); setToolbarQrQuery(''); }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <div className={`text-xs ${muted} mb-2`}>Replace slot</div>
                      <select
                        value={toolbarQrSlotIndex}
                        onChange={(e) => setToolbarQrSlotIndex(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
                      >
                        {comparedPlayers.map((p, idx) => (
                          idx === 0 ? null : (
                            <option key={p.id} value={idx}>Slot {idx + 1}: {p.name}</option>
                          )
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className={`text-xs ${muted} mb-2`}>Search player</div>
                      <input
                        value={toolbarQrQuery}
                        onChange={(e) => setToolbarQrQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setToolbarQrOpen(false);
                            setToolbarQrQuery('');
                          }
                          if (e.key === 'Enter' && toolbarQrCandidates.length === 1) {
                            replaceAtIndex(toolbarQrSlotIndex, toolbarQrCandidates[0].id);
                            setToolbarQrQuery('');
                            setToolbarQrOpen(false);
                          }
                        }}
                        placeholder="Name or ID"
                        className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900 text-white placeholder:text-slate-600' : 'bg-white text-slate-900 placeholder:text-slate-400'}`}
                      />
                    </div>
                  </div>

                  {(toolbarQrCandidates || []).length > 0 ? (
                    <div className={`mt-3 rounded-2xl border ${border} overflow-hidden`}>
                      {toolbarQrCandidates.slice(0, 6).map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            replaceAtIndex(toolbarQrSlotIndex, c.id);
                            setToolbarQrQuery('');
                            setToolbarQrOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} flex items-center justify-between gap-3`}
                        >
                          <div className="min-w-0">
                            <div className={`text-sm font-medium ${text} break-words`}>{c.name}</div>
                            <div className={`text-[11px] ${muted} break-words`}>{c.id} • {c.positionsLabel || c.pos} • {c.club}</div>
                          </div>
                          <Badge variant="default" size="xs" dark={dark}>{c.value}</Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={`mt-3 text-xs ${muted}`}>Type to search replacements (excluding players already in compare).</div>
                  )}
                </div>
              )}
            </div>

            {/* Jump to GK */}
            <Button variant="secondary" size="sm" dark={dark} icon={GKIcon} onClick={jumpToGoalkeeping} title="Jump to Goalkeeping">
              Goalkeeping
            </Button>
          </div>

          {/* Group toggles */}
          <div className="mt-4 flex flex-wrap gap-2">
            {ATTRIBUTE_GROUP_ORDER.map((g) => {
              const on = (selectedCompareGroups || []).includes(g);
              const isDefault = (defaultCompareGroups || []).includes(g);
              const count = getAttributeGroupDefs(g, { isGKContext: baseIsGK }).length;

              return (
                <button
                  key={g}
                  onClick={() => {
                    setSelectedCompareGroups((prev) => {
                      const has = (prev || []).includes(g);
                      const next = has ? (prev || []).filter((x) => x !== g) : [...(prev || []), g];
                      return ATTRIBUTE_GROUP_ORDER.filter((x) => next.includes(x));
                    });
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    on
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      : `${dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'} ${border}`
                  }`}
                  title={isDefault ? 'Default group' : 'Optional group'}
                >
                  {g === 'Goalkeeping' ? <GKIcon size={14} className={on ? 'border-blue-500/40' : ''} /> : null}
                  <span>{g}</span>
                  <Badge variant={on ? 'primary' : 'default'} size="xs" dark={dark}>{count}</Badge>
                  {isDefault ? <span className={`${muted} text-[10px]`}>• default</span> : null}
                </button>
              );
            })}
          </div>

          {notice && (
            <div className={`mt-3 text-xs ${muted}`}>
              <Info size={14} className="inline mr-1" />
              {notice}
            </div>
          )}
        </div>
      </div>

      <div className="p-8">
        {comparedPlayers.length === 0 ? (
          <Card dark={dark} className="p-8">
            <EmptyState
              icon={GitCompare}
              title="No players in compare"
              description="Open a player profile and tap “Compare” to add them here."
              action={<Button variant="secondary" size="sm" dark={dark} icon={Search}>Go to Search</Button>}
              dark={dark}
            />
          </Card>
        ) : (
          <Card dark={dark} className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-sm font-semibold ${text}`}>Attribute comparison</div>
                <div className={`text-xs ${muted} mt-1`}>
                  Frozen header + attribute column (FM-style). Defaults follow base type ({baseIsGK ? 'GK' : 'Outfield'}).
                </div>
              </div>
            </div>

            {/* FM-style scroll region: freezes header row + attribute column */}
            <div className="mt-5 overflow-auto max-h-[520px] rounded-2xl border border-transparent">
              {/* Header: player cards aligned to columns */}
              <div
                className={`grid gap-3 sticky top-0 z-20 ${HeaderCellBg} backdrop-blur py-2 border-b ${border}`}
                style={gridStyle}
              >
                <div className={`sticky left-0 z-30 ${HeaderCellBg} backdrop-blur`} />
                {comparedPlayers.map((p, idx) => (
                  <CompactPlayerCard key={p.id} p={p} index={idx} />
                ))}
              </div>

              <div className="mt-4 space-y-6">
                {orderedSelectedGroups.map((group) => {
                  const defs = getAttributeGroupDefs(group, { isGKContext: baseIsGK });

                  return (
                    <div key={group} ref={(el) => { compareGroupRefs.current[group] = el; }} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className={`text-sm font-semibold ${text}`}>{group}</div>
                        <Badge variant="default" size="xs" dark={dark}>{defs.length} attrs</Badge>
                      </div>

                      <div className={`rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                        {defs.map((d) => {
                            const values = comparedPlayers.map((p) => {
                              const raw = p.attrs?.[d.key];
                              return (typeof raw === 'number' && !Number.isNaN(raw)) ? raw : null;
                            });
                            const safeVals = values.map((v) => (typeof v === 'number' ? v : -1));
                            const max = Math.max(...safeVals);

                            return (
                              <div
                                key={d.key}
                                className={`group grid items-center gap-3 py-2 ${dark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition-colors`}
                                style={gridStyle}
                              >
                                <div
                                  className={`text-xs ${muted} pr-2 px-3 sticky left-0 z-10 ${StickyCellBg} backdrop-blur group-hover:${dark ? 'bg-slate-800/60' : 'bg-slate-50'}`}
                                >
                                  {d.label}
                                </div>

                                {values.map((v, i) => {
                                  const base = values[0];
                                  const delta = typeof v === 'number' && typeof base === 'number' ? v - base : null;
                                  const isMax = typeof v === 'number' && v === max;

                                  return (
                                    <div key={`${d.key}_${i}`} className="flex items-center gap-2 px-3">
                                      <span className={`${isMax ? 'ring-1 ring-emerald-500/30 rounded-lg p-0.5' : ''}`}>
                                        <AttributeValue value={typeof v === 'number' ? v : null} size="sm" />
                                      </span>
                                      <span className={`text-[11px] ${muted}`}>
                                        {i === 0 ? 'base' : delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============================================
// Screen: Rating Engine (Role Pair Selector + Coefficient Editor + Live Preview)
// ============================================
const RatingDesignerScreen = ({ dark }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const [mode, setMode] = useState('pair'); // 'pair' | 'single'
  const [ipRoleId, setIpRoleId] = useState('afba');
  const [oopRoleId, setOopRoleId] = useState('pf');
  const [ipShare, setIpShare] = useState(60);

  const [overridesIP, setOverridesIP] = useState({});
  const [overridesOOP, setOverridesOOP] = useState({});

  const [packsIP, setPacksIP] = useState(['ball_progression']);
  const [packsOOP, setPacksOOP] = useState(['pressing_intensity']);

  const ipRole = getRoleById(ipRoleId);
  const oopRole = getRoleById(oopRoleId);

  const mix = mode === 'single' ? { ip: 1, oop: 0 } : { ip: ipShare / 100, oop: 1 - ipShare / 100 };

  const ipWeights = buildEffectiveWeights(ipRole.ipWeights, overridesIP, packsIP, 'ip');
  const oopWeights = mode === 'pair'
    ? buildEffectiveWeights(oopRole.oopWeights, overridesOOP, packsOOP, 'oop')
    : {};

  const resetAll = () => {
    setMode('pair');
    setIpRoleId('afba');
    setOopRoleId('pf');
    setIpShare(60);
    setOverridesIP({});
    setOverridesOOP({});
    setPacksIP(['ball_progression']);
    setPacksOOP(['pressing_intensity']);
  };

  const togglePack = (scope, id) => {
    const setter = scope === 'ip' ? setPacksIP : setPacksOOP;
    const current = scope === 'ip' ? packsIP : packsOOP;
    if (current.includes(id)) setter(current.filter(x => x !== id));
    else setter([...current, id]);
  };

  const quickPairs = [
    { id: 'fb_w', label: 'FB/WB + Press', ip: 'afba', oop: 'pf', share: 60 },
    { id: 'creator', label: 'Creator + Press', ip: 'apss', oop: 'pf', share: 70 },
    { id: 'dm_lock', label: 'DLP(D) + Duels', ip: 'dlpd', oop: 'bpd', share: 55 },
    { id: 'striker', label: 'AF + Minimal OOP', ip: 'af', oop: 'af', share: 85 },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Rating Engine</h1>
            <Badge variant="primary">FM26</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Role Pair Selector + Coefficient Editor (IP/OOP) + Live Preview.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" icon={RotateCcw} dark={dark} onClick={resetAll}>Reset</Button>
          <Button variant="secondary" size="md" icon={HelpCircle} dark={dark}>Docs</Button>
          <Button variant="primary" size="md" icon={Save}>Save Preset</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-5 lg:col-span-1">
          <RolePairSelector
            dark={dark}
            mode={mode}
            ipRoleId={ipRoleId}
            oopRoleId={oopRoleId}
            onModeChange={setMode}
            onChange={({ ipRoleId: ip, oopRoleId: oop }) => {
              setIpRoleId(ip);
              setOopRoleId(oop);
            }}
          />

          <div className={`mt-4 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`text-sm font-semibold ${text}`}>IP vs OOP Mix</div>
              <Badge variant="primary">{mix.ip.toFixed(2)} / {mix.oop.toFixed(2)}</Badge>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={mode === 'single' ? 100 : ipShare}
              onChange={(e) => setIpShare(Number(e.target.value))}
              disabled={mode === 'single'}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] mt-1">
              <span className={muted}>OOP heavy</span>
              <span className={muted}>IP heavy</span>
            </div>
          </div>

          <div className="mt-4">
            <div className={`text-[10px] uppercase tracking-wider ${muted} mb-2`}>Quick pairs</div>
            <div className="grid grid-cols-1 gap-2">
              {quickPairs.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setMode('pair');
                    setIpRoleId(q.ip);
                    setOopRoleId(q.oop);
                    setIpShare(q.share);
                  }}
                  className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10 hover:bg-slate-900/20' : 'bg-white hover:bg-slate-50'} text-left`}
                >
                  <div className={`text-sm font-medium ${text}`}>{q.label}</div>
                  <div className={`text-xs ${muted}`}>{getRoleById(q.ip).name} ↔ {getRoleById(q.oop).name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={`mt-4 p-4 rounded-2xl border ${border} ${dark ? 'bg-emerald-500/5' : 'bg-emerald-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <div className={`text-sm font-semibold ${text}`}>Wiring</div>
            </div>
            <div className={`text-xs ${muted}`}>
              Saved presets are used by Player Search (Role Fit column), Top Lists sorting, and exports.
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
          <CoefficientEditor
            dark={dark}
            title="Coefficient Editor — IP"
            scope="ip"
            baseWeights={ipRole.ipWeights}
            overrides={overridesIP}
            selectedPacks={packsIP}
            onTogglePack={(id) => togglePack('ip', id)}
            onOverrideChange={(k, v) => setOverridesIP((prev) => ({ ...prev, [k]: v }))}
          />

          <CoefficientEditor
            dark={dark}
            title="Coefficient Editor — OOP"
            scope="oop"
            baseWeights={oopRole.oopWeights}
            overrides={overridesOOP}
            selectedPacks={packsOOP}
            onTogglePack={(id) => togglePack('oop', id)}
            onOverrideChange={(k, v) => setOverridesOOP((prev) => ({ ...prev, [k]: v }))}
          />
        </div>
      </div>

      <div className="mt-6">
        <RolePairLivePreview dark={dark} ipWeights={ipWeights} oopWeights={oopWeights} mix={mix} />
      </div>
    </div>
  );
};

// ============================================
// Screen: History Points & Snapshots
// ============================================

// ============================================
// Screen: History Points & Snapshots (state-driven)
// ============================================
const HistoryPointsScreen = ({ dark, players = SAMPLE_PLAYERS, historyPoints = [], defaultPlayerId, onRemoveHistoryPoint, pushToast }) => {
  const [autoSnapshots, setAutoSnapshots] = useState(true);
  const [playerId, setPlayerId] = useState(defaultPlayerId || historyPoints?.[0]?.playerId || players?.[0]?.id);

  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const toast = (variant, title, message) => pushToast?.({ variant, title, message });

  const player = players.find(p => p.id === playerId);
  const points = historyPoints
    .filter(p => p.playerId === playerId)
    .slice()
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

  const values = points.map(p => p.ca);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const path = points.length >= 2 ? points.map((p, i) => {
    const x = (i / (points.length - 1)) * 260 + 20;
    const y = 90 - ((p.ca - min) / Math.max(1, (max - min))) * 60;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') : '';

  const playersWithPoints = Array.from(new Set(historyPoints.map(h => h.playerId)))
    .map(pid => players.find(p => p.id === pid))
    .filter(Boolean);

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${text}`}>History Points</h1>
          <p className={`${muted} text-sm mt-1`}>Snapshots created from Player Profile → “Track History”.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" icon={Plus} dark={dark} title="Create from profile (prototype)">Create History Point</Button>
          <Button variant="secondary" size="md" icon={Download} dark={dark}>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h3 className={`font-semibold ${text}`}>Timeline (CA)</h3>
              <div className={`text-xs ${muted}`}>{player ? `${player.name} • ${player.club}` : 'Select a player'}</div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={playerId || ''}
                onChange={(e) => setPlayerId(e.target.value)}
                className={`px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}
              >
                {(playersWithPoints.length ? playersWithPoints : players).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Badge variant="primary">{points.length} points</Badge>
            </div>
          </div>

          {points.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="No history points yet"
                description="Open a player profile and click “Track History” to create the first snapshot."
                dark={dark}
              />
            </div>
          ) : (
            <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-white'}`}>
              <svg viewBox="0 0 300 120" className="w-full h-28">
                {path && <path d={path} fill="none" stroke="currentColor" className="text-blue-500" strokeWidth="3" />}
                {points.map((p, i) => {
                  const x = points.length === 1 ? 150 : (i / (points.length - 1)) * 260 + 20;
                  const y = 90 - ((p.ca - min) / Math.max(1, (max - min))) * 60;
                  return <circle key={p.id} cx={x} cy={y} r="5" className="text-blue-500" fill="currentColor" />;
                })}
              </svg>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {points.slice(-3).map(p => (
                  <div key={p.id} className={`p-3 rounded-xl ${dark ? 'bg-slate-800/60' : 'bg-slate-50'} border ${border}`}>
                    <div className={`text-xs ${muted}`}>{formatISODate(p.dateISO)}</div>
                    <div className={`text-sm font-semibold ${text}`}>{p.label}</div>
                    <div className={`text-xs ${muted}`}>CA: <span className={`font-semibold text-emerald-400`}>{p.ca}</span> • PA: <span className="font-semibold text-blue-400">{p.pa}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card dark={dark} className="p-6">
          <h3 className={`font-semibold ${text} mb-4`}>Automation</h3>
          <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-medium ${text}`}>Automatic snapshots</div>
                <div className={`text-xs ${muted}`}>Every 6 months (prototype)</div>
              </div>
              <button
                onClick={() => setAutoSnapshots(v => !v)}
                className={`w-12 h-7 rounded-full transition-all ${autoSnapshots ? 'bg-blue-500' : dark ? 'bg-slate-700' : 'bg-slate-200'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow transform transition-all ${autoSnapshots ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className={`text-xs ${muted} mt-3`}>Warn users about performance impact for large databases.</div>
          </div>

          <div className={`mt-4 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-white'}`}>
            <h4 className={`text-sm font-semibold ${text} mb-3`}>Manage points</h4>
            {points.length === 0 ? (
              <div className={`text-xs ${muted}`}>No points to manage.</div>
            ) : (
              <div className="space-y-2">
                {points.slice().reverse().map(p => (
                  <div key={p.id} className={`flex items-center gap-2 p-2 rounded-xl ${dark ? 'bg-slate-800/60' : 'bg-slate-50'} border ${border}`}>
                    <div className="flex-1">
                      <div className={`text-sm ${text}`}>{p.label}</div>
                      <div className={`text-xs ${muted}`}>{formatISODate(p.dateISO)} • CA {p.ca}</div>
                    </div>
                    <Button variant="ghost" size="sm" dark={dark} icon={Trash2} onClick={() => {
                      onRemoveHistoryPoint?.(p.id);
                      toast('warning', 'History point removed', `${player?.name || 'Player'} • ${p.label}`);
                    }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
// ============================================
// Screen: Staff Interface
// ============================================
const StaffInterfaceScreen = ({ dark }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/staff?limit=20');
        if (!response.ok) throw new Error('Failed to fetch staff');
        const data = await response.json();
        const transformed = (data.staff || []).map(transformStaffFromAPI);
        setStaff(transformed);
      } catch (error) {
        console.error('Error fetching staff:', error);
        setStaff([
          { name: 'Rui Almeida', role: 'Head of Youth Development', nation: '🇵🇹', rep: 4.5, stars: { youth: 5, judgePA: 4, work: 5 } },
          { name: 'Daniel Clarke', role: 'Assistant Manager', nation: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rep: 4.0, stars: { motiv: 5, tact: 4, man: 4 } },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${text}`}>Staff</h1>
          <p className={`${muted} text-sm mt-1`}>Role presets, star sliders, and card-based staff results.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" icon={Save} dark={dark}>Save Preset</Button>
          <Button variant="secondary" size="md" icon={Download} dark={dark}>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-5 lg:col-span-1">
          <h3 className={`font-semibold ${text} mb-4`}>Role presets</h3>
          <div className="space-y-2">
            {['Head of Youth', 'Assistant Manager', 'Scout', 'Physio'].map((p) => (
              <button key={p} className={`w-full text-left p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10 hover:bg-slate-900/20' : 'bg-white hover:bg-slate-50'}`}>
                <div className={`text-sm font-medium ${text}`}>{p}</div>
                <div className={`text-xs ${muted}`}>Pre-fills relevant filters</div>
              </button>
            ))}
          </div>

          <div className={`mt-5 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-amber-500" />
              <div className={`text-sm font-medium ${text}`}>Reputation gauge</div>
            </div>
            <div className={`text-xs ${muted}`}>Visualise staff reputation relative to your club’s standing.</div>
          </div>
        </Card>

        <Card dark={dark} className="p-5 lg:col-span-2">
          <h3 className={`font-semibold ${text} mb-4`}>Suggested staff</h3>
          <div className="grid grid-cols-2 gap-4">
            {staff.map((s) => (
              <Card key={s.name} dark={dark} hover className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar dark={dark} name={s.name} size="lg" />
                  <div className="flex-1">
                    <div className={`font-semibold ${text}`}>{s.name} <span className="ml-2">{s.nation}</span></div>
                    <div className={`text-sm ${muted}`}>{s.role}</div>
                  </div>
                  <Badge variant="primary">{s.rep.toFixed(1)}★</Badge>
                </div>

                <div className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${muted} uppercase tracking-wider mb-2`}>Key stars</div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(s.stars || {}).slice(0,3).map(([k,v]) => (
                      <div key={k} className="text-center">
                        <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{k}</div>
                        <div className="flex justify-center mt-1">
                          {[1,2,3,4,5].map((i) => (
                            <Star key={i} size={12} className={i <= v ? 'text-amber-500' : muted} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" dark={dark} className="flex-1" icon={UserPlus}>Shortlist</Button>
                  <Button variant="ghost" size="sm" dark={dark} icon={ChevronRight} />
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Screen: Club Interface
// ============================================
const ClubInterfaceScreen = ({ dark }) => {
  const [tab, setTab] = useState('info');
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/clubs');
        if (!response.ok) throw new Error('Failed to fetch clubs');
        const data = await response.json();
        const transformed = data.map(transformClubFromAPI);
        setClubs(transformed);
        if (transformed.length > 0) {
          setSelectedClub(transformed[0]);
        }
      } catch (error) {
        console.error('Error fetching clubs:', error);
        setSelectedClub({ name: 'Brighton', shortName: 'BHA', league: 'Premier League', rep: 4.0, finances: 72, facilities: 85, playerCount: 25, staffCount: 10 });
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  const club = selectedClub || { name: 'Loading...', shortName: '', league: '', rep: 0, finances: 0, facilities: 0, playerCount: 0, staffCount: 0 };

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${text}`}>Club Profile</h1>
          <p className={`${muted} text-sm mt-1`}>Overview, finances, and tactics board with formation insights.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Users}>View Squad</Button>
        </div>
      </div>

      <Card dark={dark} className="p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl ${dark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center`}>
            <Trophy size={28} className="text-blue-500" />
          </div>
          <div className="flex-1">
            <div className={`text-xl font-bold ${text}`}>{club.name}</div>
            <div className={`text-sm ${muted}`}>England • Premier League</div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {[
                { label: 'Stadium', value: '31,800' },
                { label: 'Training', value: '85/100' },
                { label: 'Youth', value: '82/100' },
              ].map((item) => (
                <div key={item.label} className={`p-3 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${muted}`}>{item.label}</div>
                  <div className={`text-sm font-semibold ${text}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-56 shrink-0">
            <div className={`text-xs ${muted} mb-2`}>Finances (balance vs budget)</div>
            <ProgressBar value={72} max={100} variant="success" size="lg" />
            <div className={`text-xs ${muted} mt-2`}>Healthy balance • room to spend</div>
          </div>
        </div>
      </Card>

      <div className={`flex border-b ${border} mb-6`}>
        {[
          { id: 'info', label: 'Information', icon: Info },
          { id: 'kits', label: 'Kit & Finances', icon: DollarSign },
          { id: 'tactics', label: 'Tactics', icon: Layout },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium relative ${tab === t.id ? text : muted}`}
          >
            <t.icon size={16} />
            {t.label}
            {tab === t.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />}
          </button>
        ))}
      </div>

      {tab !== 'tactics' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card dark={dark} className="p-5 lg:col-span-2">
            <h3 className={`font-semibold ${text} mb-4`}>Club overview</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Continental reputation', value: '★★★★☆' },
                { label: 'Domestic reputation', value: '★★★★☆' },
                { label: 'Attendance', value: '29,140' },
                { label: 'Supporters', value: 'Excellent' },
              ].map((x) => (
                <div key={x.label} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className={`text-xs ${muted}`}>{x.label}</div>
                  <div className={`text-sm font-semibold ${text}`}>{x.value}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card dark={dark} className="p-5">
            <h3 className={`font-semibold ${text} mb-4`}>Quick links</h3>
            <div className="space-y-2">
              {[
                { icon: Users, label: 'Top players in club' },
                { icon: UserCog, label: 'Best staff in club' },
                { icon: Search, label: 'Search linked entities' },
              ].map((l) => (
                <button key={l.label} className={`w-full flex items-center gap-3 p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10 hover:bg-slate-900/20' : 'bg-white hover:bg-slate-50'}`}>
                  <l.icon size={16} className="text-blue-500" />
                  <span className={`text-sm font-medium ${text}`}>{l.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card dark={dark} className="p-5 lg:col-span-2">
            <h3 className={`font-semibold ${text} mb-4`}>Formation board</h3>
            <div className={`p-5 rounded-2xl border ${border} ${dark ? 'bg-emerald-500/5' : 'bg-emerald-50'} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
              <div className="relative grid grid-cols-5 gap-3">
                {[...Array(11)].map((_, i) => (
                  <div key={i} className={`h-14 rounded-2xl ${dark ? 'bg-slate-900/40' : 'bg-white/70'} border ${border} flex items-center justify-center`}>
                    <Users size={18} className={muted} />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card dark={dark} className="p-5">
            <h3 className={`font-semibold ${text} mb-4`}>Tactics insights</h3>
            <div className="space-y-4">
              {[
                { label: '4-2-3-1', score: 82 },
                { label: '4-3-3', score: 76 },
                { label: '3-4-3', score: 69 },
              ].map((f) => (
                <div key={f.label} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-semibold ${text}`}>{f.label}</div>
                    <Badge variant={f.score >= 80 ? 'success' : 'warning'}>{f.score}</Badge>
                  </div>
                  <ProgressBar value={f.score} max={100} variant={f.score >= 80 ? 'success' : 'warning'} size="sm" />
                </div>
              ))}
              <div className={`text-xs ${muted}`}>Suggest tactics that suit your current squad (placeholder).</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ============================================
// Screen: Top Lists (g edition)
// ============================================
const TopListsScreen = ({ dark }) => {
  const [view, setView] = useState('top_players');

  // Role Fit profile (same wiring as Search + Rating Engine)
  const [roleMode, setRoleMode] = useState('pair');
  const [ipRoleId, setIpRoleId] = useState('afba');
  const [oopRoleId, setOopRoleId] = useState('pf');
  const [ipShare, setIpShare] = useState(60);
  const [packsIP, setPacksIP] = useState(['ball_progression']);
  const [packsOOP, setPacksOOP] = useState(['pressing_intensity']);

  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const roleMix = roleMode === 'single' ? { ip: 1, oop: 0 } : { ip: ipShare / 100, oop: 1 - ipShare / 100 };
  const roleIP = getRoleById(ipRoleId);
  const roleOOP = getRoleById(oopRoleId);
  const roleIPWeights = buildEffectiveWeights(roleIP.ipWeights, {}, packsIP, 'ip');
  const roleOOPWeights = roleMode === 'pair' ? buildEffectiveWeights(roleOOP.oopWeights, {}, packsOOP, 'oop') : {};

  const togglePack = (scope, id) => {
    const setter = scope === 'ip' ? setPacksIP : setPacksOOP;
    const current = scope === 'ip' ? packsIP : packsOOP;
    if (current.includes(id)) setter(current.filter(x => x !== id));
    else setter([...current, id]);
  };

  const players = [
    { name: 'Lamine Yamal', pos: 'RW', club: 'Barcelona', ca: 156, pa: 189, valueNum: 120, attrs: { pace: 17, acceleration: 17, dribbling: 16, technique: 15, firstTouch: 14, passing: 12, vision: 12, offTheBall: 15, decisions: 12, composure: 12, crossing: 13, workRate: 12, teamwork: 11, stamina: 13, tackling: 7, positioning: 7, anticipation: 10, strength: 9 } },
    { name: 'Endrick', pos: 'ST', club: 'Real Madrid', ca: 142, pa: 182, valueNum: 80, attrs: { pace: 15, acceleration: 16, dribbling: 13, technique: 13, firstTouch: 13, passing: 10, vision: 9, offTheBall: 15, decisions: 12, composure: 14, workRate: 13, teamwork: 11, stamina: 13, tackling: 7, positioning: 8, anticipation: 12, strength: 14, finishing: 16 } },
    { name: 'W. Zaïre-Emery', pos: 'CM', club: 'PSG', ca: 148, pa: 178, valueNum: 90, attrs: { pace: 13, acceleration: 13, dribbling: 12, technique: 12, firstTouch: 12, passing: 14, vision: 13, offTheBall: 12, decisions: 13, composure: 13, workRate: 15, teamwork: 14, stamina: 15, tackling: 12, positioning: 12, anticipation: 12, strength: 12 } },
    { name: 'Pau Cubarsí', pos: 'CB', club: 'Barcelona', ca: 144, pa: 176, valueNum: 60, attrs: { pace: 13, acceleration: 12, dribbling: 8, technique: 9, firstTouch: 10, passing: 12, vision: 10, decisions: 13, composure: 14, workRate: 13, teamwork: 13, stamina: 13, tackling: 15, positioning: 15, anticipation: 14, strength: 14 } },
  ];

  const rows = players
    .map((p) => {
      const base = calcRolePairScore({ attrs: p.attrs, ipWeights: roleIPWeights, oopWeights: roleOOPWeights, mix: roleMix }).total;
      const promisingBoost = Math.round((p.pa - p.ca) / 2);
      const bargainBoost = Math.round(Math.max(0, 120 - p.valueNum) / 6);
      const score = view === 'most_promising'
        ? clamp(base + promisingBoost, 0, 100)
        : view === 'top_bargains'
          ? clamp(base + bargainBoost, 0, 100)
          : base;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Top Lists</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Curated views driven by your Rating Engine preset (Role Fit).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Save}>Save as Preset</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { id: 'top_players', label: 'Top Players', icon: Trophy },
          { id: 'most_promising', label: 'Most Promising', icon: TrendingUp },
          { id: 'top_bargains', label: 'Top Bargains', icon: Tag },
        ].map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border ${border} ${view === t.id ? 'bg-blue-500 text-white border-blue-500/30' : dark ? 'bg-slate-900/20 text-slate-300 hover:bg-slate-900/30' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <Card dark={dark} className="p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <RolePairSelector
              dark={dark}
              compact={false}
              mode={roleMode}
              ipRoleId={ipRoleId}
              oopRoleId={oopRoleId}
              onModeChange={setRoleMode}
              onChange={({ ipRoleId: ip, oopRoleId: oop }) => {
                setIpRoleId(ip);
                setOopRoleId(oop);
              }}
            />
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-semibold ${text}`}>Mix</div>
                <Badge variant="primary">{roleMix.ip.toFixed(2)} / {roleMix.oop.toFixed(2)}</Badge>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={roleMode === 'single' ? 100 : ipShare}
                onChange={(e) => setIpShare(Number(e.target.value))}
                disabled={roleMode === 'single'}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] mt-1">
                <span className={muted}>OOP heavy</span>
                <span className={muted}>IP heavy</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
              <div className={`text-[10px] uppercase tracking-wider ${muted} mb-2`}>Packs</div>
              <div className="flex flex-wrap gap-2">
                {['ball_progression', 'chance_creation', 'pressing_intensity', 'defensive_duels', 'athleticism'].map((pid) => {
                  const p = FM26_MODIFIER_PACKS.find(x => x.id === pid);
                  const active = (packsIP.includes(pid) || packsOOP.includes(pid));
                  return (
                    <button
                      key={pid}
                      onClick={() => {
                        // quick toggle: route pack to its declared scope
                        const scope = (FM26_MODIFIER_PACKS.find(x => x.id === pid)?.scope || 'both');
                        if (scope === 'ip') togglePack('ip', pid);
                        else if (scope === 'oop') togglePack('oop', pid);
                        else { togglePack('ip', pid); togglePack('oop', pid); }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${border} ${active ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : dark ? 'bg-slate-900/10 text-slate-300' : 'bg-white text-slate-700'}`}
                    >
                      {p?.name || pid}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card dark={dark} className="overflow-hidden">
        <table className="w-full">
          <thead className={`${dark ? 'bg-slate-800/80' : 'bg-slate-50'} sticky top-0 z-10`}>
            <tr className={`text-xs ${muted} uppercase tracking-wider`}>
              <th className="text-left p-4">Player</th>
              <th className="text-left p-4">Position</th>
              <th className="text-left p-4">Club</th>
              <th className="text-center p-4">Role Fit</th>
              <th className="text-center p-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={`border-b ${border} ${dark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar dark={dark} name={r.name} size="sm" />
                    <div className={`font-medium ${text}`}>{r.name}</div>
                  </div>
                </td>
                <td className={`p-4 ${muted}`}>{r.pos}</td>
                <td className={`p-4 ${muted}`}>{r.club}</td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-20"><ProgressBar value={r.score} max={100} variant={r.score >= 85 ? 'success' : 'warning'} size="sm" /></div>
                    <span className={`text-xs ${r.score >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>{r.score}%</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <Button variant="ghost" size="sm" dark={dark} icon={MoreHorizontal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className={`mt-6 p-5 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle size={16} className="text-blue-500" />
          <div className={`text-sm font-semibold ${text}`}>Implementation notes</div>
        </div>
        <div className={`text-xs ${muted}`}>Top Lists queries bind to the selected role pair (or single-role IP mode) and the active coefficient preset.</div>
      </div>
    </div>
  );
};

// ============================================
// Screen: Role Finder (g edition)
// ============================================
const RoleFinderScreen = ({ dark }) => {
  const [formation, setFormation] = useState('4-2-3-1');
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const missing = [
    { slot: 'RB (WB-A)', need: 'No natural overlap runner', severity: 'high' },
    { slot: 'DM (DLP-S)', need: 'Passing + positioning gap', severity: 'medium' },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Role Finder</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Select tactic roles, see missing coverage, and open Player Search with filters pre-filled.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Search}>Find Targets</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${text}`}>Tactic</h3>
            <div className="flex gap-2">
              {['4-2-3-1', '4-3-3', '3-4-3'].map((f) => (
                <button key={f} onClick={() => setFormation(f)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${border} ${formation === f ? 'bg-blue-500 text-white border-blue-500/30' : dark ? 'bg-slate-900/20 text-slate-300' : 'bg-white text-slate-700'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-5 rounded-2xl border ${border} ${dark ? 'bg-emerald-500/5' : 'bg-emerald-50'} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
            <div className="relative grid grid-cols-5 gap-3">
              {[...Array(11)].map((_, i) => (
                <div key={i} className={`h-14 rounded-2xl ${dark ? 'bg-slate-900/40' : 'bg-white/70'} border ${border} flex items-center justify-center`}>
                  <Target size={18} className="text-blue-500" />
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-4 text-xs ${muted}`}>Role suitability and slot model should match Squad Gap Analyzer (single source of truth).</div>
        </Card>

        <Card dark={dark} className="p-6">
          <h3 className={`font-semibold ${text} mb-4`}>Missing roles</h3>
          <div className="space-y-3">
            {missing.map((m) => (
              <div key={m.slot} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-semibold ${text}`}>{m.slot}</div>
                  <Badge variant={m.severity === 'high' ? 'danger' : 'warning'}>{m.severity}</Badge>
                </div>
                <div className={`text-xs ${muted} mt-1`}>{m.need}</div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" dark={dark} className="flex-1" icon={Search}>Find fits</Button>
                  <Button variant="ghost" size="sm" dark={dark} icon={HelpCircle} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};


// ============================================
// Screen: Squad Gap Analyzer (g edition)
// ============================================
const SquadGapAnalyzerScreen = ({ dark }) => {
  const [formation, setFormation] = useState('4-2-3-1');
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const gaps = [
    { id: 1, area: 'RB (WB-A)', issue: 'No natural overlap runner', severity: 'high', suggestion: 'Attacking Full-Back (A) profile' },
    { id: 2, area: 'DM (DLP-D)', issue: 'Passing + positioning gap', severity: 'medium', suggestion: 'Deep-Lying Playmaker (D) profile' },
    { id: 3, area: 'ST (PF-A)', issue: 'Press resistance / first touch', severity: 'low', suggestion: 'Pressing Forward (A) profile' },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Squad Gap Analyzer</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>From tactic roles → coverage map → “open Player Search with filters pre-filled”.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Search}>Open Search</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-sm font-semibold ${text}`}>Tactic</div>
              <div className={`text-xs ${muted}`}>Formation + role slots</div>
            </div>
            <Badge variant="primary">FM26</Badge>
          </div>

          <div className="space-y-3">
            <div>
              <div className={`text-xs ${muted} mb-1`}>Formation</div>
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'}`}
              >
                {['4-2-3-1', '4-3-3', '4-4-2', '3-4-2-1'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
              <div className={`text-xs ${muted} mb-2`}>Coverage (prototype)</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: 'CB', v: 86 },
                  { k: 'FB/WB', v: 62 },
                  { k: 'DM/CM', v: 71 },
                  { k: 'ST', v: 58 },
                ].map((x) => (
                  <div key={x.k} className="text-center">
                    <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{x.k}</div>
                    <div className={`text-lg font-bold ${x.v >= 75 ? 'text-emerald-400' : x.v >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card dark={dark} className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-sm font-semibold ${text}`}>Detected Gaps</div>
              <div className={`text-xs ${muted}`}>Ranked by severity (role-fit + squad depth)</div>
            </div>
            <Button variant="secondary" size="sm" dark={dark} icon={Crown}>Auto-suggest</Button>
          </div>

          <div className="space-y-3">
            {gaps.map((g) => (
              <div key={g.id} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className={`font-semibold ${text}`}>{g.area} <span className={`text-xs ${muted} font-normal`}>• {g.issue}</span></div>
                    <div className={`text-xs ${muted} mt-1`}>Suggested: <span className="text-blue-400 font-medium">{g.suggestion}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={g.severity === 'high' ? 'error' : g.severity === 'medium' ? 'warning' : 'success'} size="xs">{g.severity}</Badge>
                    <Button variant="secondary" size="sm" dark={dark} icon={Search}>Find</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Info size={16} className="text-blue-500" />
              <div className={`text-sm font-semibold ${text}`}>Implementation notes</div>
            </div>
            <div className={`text-xs ${muted}`}>Gap scoring reuses Rating Engine role pairs; output is a pre-filled search query + optional shortlist optimizer.</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Screen: Replacement Finder (g edition)
// ============================================
const ReplacementFinderScreen = ({ dark }) => {
  const [outgoing, setOutgoing] = useState('RB – Starter');
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const candidates = [
    { name: 'Target A', club: 'Ajax', age: 21, fit: 88, fee: '€24M', availability: 'Interested' },
    { name: 'Target B', club: 'RB Leipzig', age: 24, fit: 84, fee: '€36M', availability: 'Doubtful' },
    { name: 'Target C', club: 'Villarreal', age: 20, fit: 82, fee: '€18M', availability: 'Very Interested' },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Replacement Finder</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Pick an outgoing player → match by role-fit, age, budget, and availability.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Plus}>Add to Shortlist</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export</Button>
        </div>
      </div>

      <Card dark={dark} className="p-5 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className={`text-xs ${muted} mb-1`}>Outgoing</div>
            <select
              value={outgoing}
              onChange={(e) => setOutgoing(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border ${border} ${dark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'}`}
            >
              {['RB – Starter', 'DM – Rotation', 'ST – Backup'].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <div className={`text-xs ${muted} mt-2`}>Auto-loads the matching Rating Engine preset + contract constraints.</div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { k: 'Budget', v: '€40M' },
              { k: 'Age cap', v: '≤ 25' },
              { k: 'Min fit', v: '≥ 80%' },
            ].map((x) => (
              <div key={x.k} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{x.k}</div>
                <div className={`text-lg font-bold ${text}`}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card dark={dark} className="overflow-hidden">
        <table className="w-full">
          <thead className={`${dark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
            <tr className={`text-xs ${muted} uppercase tracking-wider`}>
              <th className="text-left p-4">Candidate</th>
              <th className="text-left p-4">Club</th>
              <th className="text-center p-4">Age</th>
              <th className="text-center p-4">Fit</th>
              <th className="text-center p-4">Fee</th>
              <th className="text-center p-4">Signal</th>
              <th className="text-center p-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.name} className={`border-b ${border} ${dark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar dark={dark} name={c.name} size="sm" />
                    <div className={`font-medium ${text}`}>{c.name}</div>
                  </div>
                </td>
                <td className={`p-4 ${muted}`}>{c.club}</td>
                <td className={`p-4 text-center ${muted}`}>{c.age}</td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-20"><ProgressBar value={c.fit} max={100} variant={c.fit >= 85 ? 'success' : 'warning'} size="sm" /></div>
                    <span className={`text-xs ${c.fit >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>{c.fit}%</span>
                  </div>
                </td>
                <td className={`p-4 text-center ${muted}`}>{c.fee}</td>
                <td className="p-4 text-center">
                  <Badge variant={c.availability.includes('Very') ? 'success' : c.availability === 'Interested' ? 'primary' : 'warning'} size="xs">{c.availability}</Badge>
                </td>
                <td className="p-4 text-center"><Button variant="ghost" size="sm" dark={dark} icon={MoreHorizontal} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ============================================
// Screen: Transfer Shortlist Optimizer (g edition)
// ============================================
const ShortlistOptimizerScreen = ({ dark }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const picks = [
    { role: 'RB (WB-A)', name: 'Target A', fit: 88, fee: '€24M', risk: 'low' },
    { role: 'DM (DLP-D)', name: 'Target D', fit: 84, fee: '€18M', risk: 'medium' },
    { role: 'ST (PF-A)', name: 'Target F', fit: 81, fee: '€12M', risk: 'low' },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Transfer Shortlist Optimizer</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Optimize a shortlist against budget + squad gaps + risk profile.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Sparkles}>Run Optimize</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Save}>Save Plan</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-6 lg:col-span-1">
          <div className={`text-sm font-semibold ${text} mb-2`}>Constraints</div>
          <div className="space-y-3">
            {[
              { k: 'Budget', v: '€60M' },
              { k: 'Max squad risk', v: 'Medium' },
              { k: 'Must fill', v: 'RB, DM' },
            ].map((x) => (
              <div key={x.k} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{x.k}</div>
                <div className={`text-lg font-bold ${text}`}>{x.v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card dark={dark} className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-sm font-semibold ${text}`}>Recommended Set</div>
              <div className={`text-xs ${muted}`}>Max total fit under constraints</div>
            </div>
            <Badge variant="success">+12% coverage</Badge>
          </div>

          <div className="space-y-3">
            {picks.map((p) => (
              <div key={p.role} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${text}`}>{p.role} <span className={`text-xs ${muted} font-normal`}>→ {p.name}</span></div>
                    <div className={`text-xs ${muted} mt-1`}>Fee: {p.fee} • Risk: <span className={p.risk === 'low' ? 'text-emerald-400' : 'text-amber-400'}>{p.risk}</span></div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs ${muted}`}>Fit</div>
                    <div className={`text-xl font-bold ${p.fit >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>{p.fit}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Info size={16} className="text-blue-500" />
              <div className={`text-sm font-semibold ${text}`}>How it works (prototype)</div>
            </div>
            <div className={`text-xs ${muted}`}>Objective = maximize Role Fit + coverage delta; penalties for high fees, injury risk, and low interest.</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Screen: Deal Intelligence (g edition)
// ============================================
const DealIntelligenceScreen = ({ dark }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const signals = [
    { k: 'Asking vs value', v: '€32M vs €26M', tag: 'warning', note: 'Try bonuses / clauses' },
    { k: 'Agent stance', v: 'Neutral', tag: 'primary', note: 'Offer playing time promise' },
    { k: 'Club pressure', v: 'Needs sale (FFP)', tag: 'success', note: 'Negotiate late window' },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Deal Intelligence</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Negotiation guidance using price, interest, clauses, and club context.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={DollarSign}>Open Negotiation</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Copy}>Copy Summary</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-6 lg:col-span-1">
          <div className={`text-sm font-semibold ${text} mb-2`}>Target snapshot</div>
          <div className="space-y-3">
            {[
              { k: 'Player', v: 'Target A' },
              { k: 'Role fit', v: '88%' },
              { k: 'Interest', v: 'Interested' },
              { k: 'Contract', v: '2y left' },
            ].map((x) => (
              <div key={x.k} className="flex items-center justify-between">
                <span className={`text-sm ${muted}`}>{x.k}</span>
                <span className={`text-sm ${text}`}>{x.v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card dark={dark} className="p-6 lg:col-span-2">
          <div className={`text-sm font-semibold ${text} mb-4`}>Signals</div>
          <div className="space-y-3">
            {signals.map((s) => (
              <div key={s.k} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className={`font-semibold ${text}`}>{s.k}</div>
                    <div className={`text-xs ${muted} mt-1`}>{s.note}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={s.tag} size="xs">{s.v}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-amber-500" />
              <div className={`text-sm font-semibold ${text}`}>Recommended offer structure</div>
            </div>
            <div className={`text-xs ${muted}`}>Lower fixed fee, add appearance + team achievement bonuses, and include optional sell-on %.</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Screen: Contract & Clause Radar (g edition)
// ============================================
const ContractClauseRadarScreen = ({ dark }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const alerts = [
    { id: 1, name: 'Player X', type: 'Expiring', due: '6 months', severity: 'high', action: 'Renew or sell' },
    { id: 2, name: 'Player Y', type: 'Release clause', due: '€18M active', severity: 'medium', action: 'Offer new deal' },
    { id: 3, name: 'Player Z', type: 'Wage rise', due: 'After 20 apps', severity: 'low', action: 'Plan budget' },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Contract & Clause Radar</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Monitor expiries, clauses, triggers, and generate action lists.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={FileText}>Generate Actions</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export</Button>
        </div>
      </div>

      <Card dark={dark} className="overflow-hidden">
        <table className="w-full">
          <thead className={`${dark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
            <tr className={`text-xs ${muted} uppercase tracking-wider`}>
              <th className="text-left p-4">Item</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Due</th>
              <th className="text-center p-4">Severity</th>
              <th className="text-left p-4">Suggested action</th>
              <th className="text-center p-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className={`border-b ${border} ${dark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar dark={dark} name={a.name} size="sm" />
                    <div className={`font-medium ${text}`}>{a.name}</div>
                  </div>
                </td>
                <td className={`p-4 ${muted}`}>{a.type}</td>
                <td className={`p-4 ${muted}`}>{a.due}</td>
                <td className="p-4 text-center">
                  <Badge variant={a.severity === 'high' ? 'error' : a.severity === 'medium' ? 'warning' : 'success'} size="xs">{a.severity}</Badge>
                </td>
                <td className={`p-4 ${muted}`}>{a.action}</td>
                <td className="p-4 text-center"><Button variant="ghost" size="sm" dark={dark} icon={MoreHorizontal} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className={`mt-6 p-5 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-1">
          <Info size={16} className="text-blue-500" />
          <div className={`text-sm font-semibold ${text}`}>Implementation notes</div>
        </div>
        <div className={`text-xs ${muted}`}>Radar reads saved presets + squad context to prioritize renewals and highlight clause-trigger risk.</div>
      </div>
    </div>
  );
};


// ============================================
// Screen: Radar Workspace (g edition)
// ============================================
const RadarScreen = ({ dark }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const items = [
    { type: 'Expiring', name: 'Winger A', club: 'Club X', badge: 'Fair fee', risk: 'low' },
    { type: 'Release clause', name: 'DM B', club: 'Club Y', badge: 'Overpay risk', risk: 'high' },
    { type: 'Bosman', name: 'CB C', club: 'Club Z', badge: 'Good value', risk: 'medium' },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Radar</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Opportunity inbox grouped by contract/market triggers with shortlist actions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={RefreshCw}>Refresh</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Save}>Save preset</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-5 lg:col-span-1">
          <h3 className={`font-semibold ${text} mb-4`}>Filters</h3>
          <div className="space-y-3">
            {['Budget', 'Needs', 'Age', 'Position'].map((f) => (
              <div key={f} className={`p-3 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className={`text-sm font-medium ${text}`}>{f}</div>
                <div className={`text-xs ${muted}`}>Placeholder controls</div>
              </div>
            ))}
          </div>
          <div className={`mt-5 p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
            <div className={`text-xs ${muted}`}>Use cached/incremental refresh; show progress + cancel for large databases.</div>
          </div>
        </Card>

        <Card dark={dark} className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${text}`}>Opportunities</h3>
            <Badge variant="primary">{items.length} cards</Badge>
          </div>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'} flex items-center gap-4`}>
                <div className={`w-10 h-10 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center`}>
                  <Eye size={18} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${text}`}>{it.name}</div>
                  <div className={`text-xs ${muted}`}>{it.type} • {it.club}</div>
                </div>
                <Badge variant={it.risk === 'low' ? 'success' : it.risk === 'high' ? 'danger' : 'warning'}>{it.badge}</Badge>
                <Button variant="secondary" size="sm" dark={dark} icon={UserPlus}>Shortlist</Button>
                <Button variant="ghost" size="sm" dark={dark} icon={MoreHorizontal} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Screen: Transfer Plan Workspace (g edition)
// ============================================
const TransferPlanScreen = ({ dark }) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const start = () => {
    setRunning(true);
    setProgress(15);
    const t = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 12);
        if (next >= 100) {
          clearInterval(t);
          setRunning(false);
        }
        return next;
      });
    }, 450);
  };

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Transfer Plan</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Build Plan A / Plan B bundles under constraints and export decisions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export bundle</Button>
          <Button variant="primary" size="md" icon={Play} onClick={start} disabled={running}>{running ? 'Optimizing...' : 'Run optimizer'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-6 lg:col-span-1">
          <h3 className={`font-semibold ${text} mb-4`}>Constraints</h3>
          <div className="space-y-3">
            {[
              { label: 'Transfer budget', value: '€60M' },
              { label: 'Wage budget', value: '€350k/w' },
              { label: 'Age', value: '≤ 24' },
            ].map((c) => (
              <div key={c.label} className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className={`text-xs ${muted}`}>{c.label}</div>
                <div className={`text-sm font-semibold ${text}`}>{c.value}</div>
              </div>
            ))}

            <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-semibold ${text}`}>Performance UX</div>
                {running && <Badge variant="warning">Running</Badge>}
              </div>
              <ProgressBar value={progress} max={100} variant="primary" size="md" />
              <div className={`text-xs ${muted} mt-2`}>Show progress + cancel; cache repeat results.</div>
            </div>

            {running && (
              <Button variant="secondary" size="sm" dark={dark} icon={X} onClick={() => { setRunning(false); setProgress(0); }}>Cancel</Button>
            )}
          </div>
        </Card>

        <Card dark={dark} className="p-6 lg:col-span-2">
          <h3 className={`font-semibold ${text} mb-4`}>Bundles</h3>
          <div className="grid grid-cols-2 gap-4">
            {['Plan A', 'Plan B'].map((plan) => (
              <div key={plan} className={`p-5 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-sm font-semibold ${text}`}>{plan}</div>
                  <Badge variant="primary">3 targets</Badge>
                </div>
                <div className={`text-xs ${muted} mb-3`}>Explainable output (gaps fixed, fit improvement, cost drivers).</div>
                <div className="space-y-2">
                  {['Target 1', 'Target 2', 'Target 3'].map((t) => (
                    <div key={t} className={`p-3 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'} flex items-center justify-between`}>
                      <div className={`text-sm ${text}`}>{t}</div>
                      <Badge variant="success">Fit +</Badge>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" dark={dark} className="flex-1" icon={FileText}>Quick Card</Button>
                  <Button variant="secondary" size="sm" dark={dark} className="flex-1" icon={FileText}>Full Dossier</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Screen: Preset Marketplace (g edition)
// ============================================
const PresetMarketplaceScreen = ({ dark }) => {
  const [selected, setSelected] = useState('wonderkids_v26');
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  const presets = [
    { id: 'wonderkids_v26', name: 'Wonderkids (FM26)', type: 'Filters', compat: 'FM26', rating: 4.8 },
    { id: 'rolefit_v26', name: 'Role Fit Column Set', type: 'Columns', compat: 'FM26', rating: 4.6 },
    { id: 'bargains_v25', name: 'Bargains (FM25)', type: 'Filters', compat: 'FM25', rating: 4.2, warn: true },
  ];

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Preset Marketplace</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Browse/import presets with preview, compatibility warnings, and safe application.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Upload}>Import file</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export my presets</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-5 lg:col-span-1">
          <h3 className={`font-semibold ${text} mb-4`}>Library</h3>
          <div className="space-y-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left p-3 rounded-2xl border ${selected === p.id ? 'border-blue-500/40 bg-blue-500/10' : border} transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className={`font-medium ${text}`}>{p.name}</div>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-amber-500" />
                    <span className={`text-xs ${muted}`}>{p.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className={`text-xs ${muted}`}>{p.type} • {p.compat}{p.warn ? ' • incompatible' : ''}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card dark={dark} className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${text}`}>Preview</h3>
            {presets.find(p => p.id === selected)?.warn ? <Badge variant="warning">Compatibility warning</Badge> : <Badge variant="success">Compatible</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
              <div className={`text-sm font-semibold ${text} mb-2`}>What it adds</div>
              <ul className={`text-xs ${muted} space-y-1 list-disc ml-4`}>
                <li>Filter conditions / columns / rating profiles</li>
                <li>Default sorting + visible columns</li>
                <li>Optional tags and notes template</li>
              </ul>
            </div>

            <div className={`p-4 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'}`}>
              <div className={`text-sm font-semibold ${text} mb-2`}>Diff preview</div>
              <div className={`text-xs ${muted}`}>Show a safe diff before applying (prototype placeholder).</div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <Button variant="secondary" size="md" dark={dark} icon={Copy}>Apply as copy</Button>
            <Button variant="primary" size="md" icon={Check}>Apply</Button>
          </div>

          <div className={`mt-4 text-xs ${muted}`}>MVP: file import/export. vNext: online marketplace with ratings/verification.</div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Screen: Pro Reports Export (g edition)
// ============================================
const ProReportsScreen = ({ dark }) => {
  const [template, setTemplate] = useState('quick');
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? 'border-slate-700/50' : 'border-slate-200';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${text}`}>Pro Reports Export</h1>
            <Badge variant="gold" size="sm">g</Badge>
          </div>
          <p className={`${muted} text-sm mt-1`}>Export player/shortlist/plan dossiers with templates and preview.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export PDF</Button>
          <Button variant="secondary" size="md" dark={dark} icon={Download}>Export HTML</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card dark={dark} className="p-5 lg:col-span-1">
          <h3 className={`font-semibold ${text} mb-4`}>Template</h3>
          <div className="space-y-2">
            {[
              { id: 'quick', label: 'Quick Card', desc: 'Compact, scannable' },
              { id: 'full', label: 'Full Dossier', desc: 'Complete scout report' },
              { id: 'bundle', label: 'Plan Bundle', desc: 'Transfer plan pack + index' },
            ].map((t) => (
              <button key={t.id} onClick={() => setTemplate(t.id)} className={`w-full text-left p-3 rounded-2xl border ${template === t.id ? 'border-blue-500/40 bg-blue-500/10' : border} transition-all`}>
                <div className={`font-medium ${text}`}>{t.label}</div>
                <div className={`text-xs ${muted}`}>{t.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card dark={dark} className="p-5 lg:col-span-2">
          <h3 className={`font-semibold ${text} mb-4`}>Preview</h3>
          <div className={`p-5 rounded-2xl border ${border} ${dark ? 'bg-slate-900/10' : 'bg-white'} min-h-[260px]`}>
            <div className={`text-sm font-semibold ${text}`}>{template === 'quick' ? 'Quick Card' : template === 'full' ? 'Full Dossier' : 'Bundle Pack'}</div>
            <div className={`text-xs ${muted} mt-2`}>Preview of included sections: Role/Position summary, Deal snapshot, narrative blocks (placeholder).</div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                <div className={`text-xs ${muted}`}>Sections</div>
                <div className={`text-sm ${text}`}>Attributes • Roles • Deal</div>
              </div>
              <div className={`p-3 rounded-xl border ${border} ${dark ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                <div className={`text-xs ${muted}`}>Batch</div>
                <div className={`text-sm ${text}`}>Export shortlist / plan A+B</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <Button variant="secondary" size="md" dark={dark} icon={CheckSquare}>Select players</Button>
            <Button variant="primary" size="md" icon={Download}>Export</Button>
          </div>

          <div className={`mt-4 text-xs ${muted}`}>Formats: PDF + HTML. Batch exports should include a combined pack + index.</div>
        </Card>
      </div>
    </div>
  );
};


// ============================================
// Screen: Loading States
// ============================================
const LoadingStatesScreen = ({ dark }) => {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const bg = dark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white';

  return (
    <div className={`flex-1 p-8 overflow-auto ${bg}`}>
      <h1 className={`text-2xl font-bold ${text} mb-6`}>Loading States & Feedback</h1>
      <div className="grid grid-cols-2 gap-6">
        <Card dark={dark} className="p-6">
          <h3 className={`font-semibold ${text} mb-4`}>Game Loading Progress</h3>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${dark ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center`}>
              <Loader2 size={24} className="text-blue-500 animate-spin" />
            </div>
            <div className="flex-1">
              <div className={`text-sm font-medium ${text}`}>Loading players...</div>
              <ProgressBar value={67} max={100} variant="primary" size="md" />
            </div>
            <span className={`text-sm ${muted}`}>67%</span>
          </div>
        </Card>
        <Card dark={dark} className="p-6">
          <h3 className={`font-semibold ${text} mb-4`}>Toast Notifications</h3>
          <div className="space-y-3">
            <Toast variant="success" title="Save loaded successfully" message="251,847 players imported" dark={dark} />
            <Toast variant="warning" title="Sync required" message="FM data has changed" action="Sync" dark={dark} />
            <Toast variant="error" title="Export failed" message="Check permissions" action="Retry" dark={dark} />
          </div>
        </Card>
        <Card dark={dark} className="p-6">
          <h3 className={`font-semibold ${text} mb-4`}>Button States</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4"><Button variant="primary" size="md" icon={Download}>Export</Button><span className={`text-xs ${muted}`}>Default</span></div>
            <div className="flex items-center gap-4"><Button variant="primary" size="md" loading>Exporting...</Button><span className={`text-xs ${muted}`}>Loading</span></div>
            <div className="flex items-center gap-4"><Button variant="success" size="md" icon={CheckCircle2}>Exported!</Button><span className={`text-xs ${muted}`}>Success</span></div>
            <div className="flex items-center gap-4"><Button variant="primary" size="md" icon={Download} disabled>Export</Button><span className={`text-xs ${muted}`}>Disabled</span></div>
          </div>
        </Card>
        <Card dark={dark} className="p-6">
          <h3 className={`font-semibold ${text} mb-4`}>Skeleton Loading</h3>
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" dark={dark} />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" dark={dark} /><Skeleton className="h-3 w-48" dark={dark} /></div>
            <Skeleton className="h-8 w-20 rounded-lg" dark={dark} />
          </div>
          <div className="flex gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 flex-1 rounded-lg" dark={dark} />)}</div>
        </Card>
        <Card dark={dark} className="p-6 lg:col-span-2">
          <h3 className={`font-semibold ${text} mb-4`}>Empty States</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <EmptyState icon={Search} title="No results found" description="Try adjusting your filters" action={<Button variant="secondary" size="sm" dark={dark}>Clear Filters</Button>} dark={dark} />
            <EmptyState icon={List} title="No shortlists yet" description="Create your first shortlist" action={<Button variant="primary" size="sm" icon={Plus}>Create</Button>} dark={dark} />
            <EmptyState icon={History} title="No history points" description="Track player development" action={<Button variant="secondary" size="sm" dark={dark} icon={Plus}>Create</Button>} dark={dark} />
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// Main App Component
// ============================================
export default function FMGenieScoutPrototype() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeScreen, setActiveScreen] = useState('all');
  const [gameLoaded, setGameLoaded] = useState(false);

  // Shared app state (Phase 1): Search → Profile navigation + shared player dataset
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Fetch players from API on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setPlayersLoading(true);
        const response = await fetch('/api/players?limit=100');
        if (!response.ok) throw new Error('Failed to fetch players');
        const data = await response.json();
        const transformedPlayers = (data.players || [])
          .map(transformPlayerFromAPI)
          .map(enrichPlayerForAttributeGroups);
        setPlayers(transformedPlayers);
        if (transformedPlayers.length > 0) {
          setSelectedPlayerId(transformedPlayers[0].id);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        // Fallback to sample data if API fails
        const fallbackPlayers = SAMPLE_PLAYERS.map(enrichPlayerForAttributeGroups);
        setPlayers(fallbackPlayers);
        if (fallbackPlayers.length > 0) {
          setSelectedPlayerId(fallbackPlayers[0].id);
        }
      } finally {
        setPlayersLoading(false);
      }
    };
    fetchPlayers();
  }, []);


  // Shared interactive state (Phase 2): profile actions + realism
  const [shortlists] = useState([
    { id: 'fm-shortlist', name: 'FM Shortlist', color: 'blue', synced: true },
    { id: 'targets', name: 'Targets', color: 'emerald' },
    { id: 'watchlist', name: 'Watchlist', color: 'amber' },
  ]);

  const [shortlistEntries, setShortlistEntries] = useState(() => ({
    'fm-shortlist': {
      p_wze: { tag: 'target', note: 'Starter-ready DM', addedAt: '2025-12-01T10:00:00Z' },
    },
    watchlist: {
      p_yamal: { tag: 'watchlist', note: 'Monitor minutes', addedAt: '2025-12-05T10:00:00Z' },
    },
    targets: {},
  }));

  const [comparisonIds, setComparisonIds] = useState(['p_wze', 'p_mainoo']);
  const [favorites, setFavorites] = useState({ p_wze: true });

  const [playerReports, setPlayerReports] = useState(() => ({
    p_wze: {
      recommendation: 'shortlist',
      confidence: 70,
      ratingStars: 4,
      tags: ['Starter-ready', 'Tactical fit'],
      pros: ['Composed under pressure', 'High work rate'],
      cons: ['Needs more attacking output'],
      note: 'Early assessment: fits high-tempo midfield rotations. Recheck in 2 months.',
      updatedAt: '2025-12-10T10:00:00Z',
    },
  }));

  const savePlayerReport = (playerId, report) => {
    setPlayerReports((prev) => ({ ...(prev || {}), [playerId]: report }));
  };


  const [historyPoints, setHistoryPoints] = useState(() => ([
    { id: makeId(), playerId: 'p_yamal', dateISO: '2025-07-01', label: 'Pre-season', ca: 128, pa: 176 },
    { id: makeId(), playerId: 'p_yamal', dateISO: '2026-01-01', label: 'Mid-season', ca: 136, pa: 176 },
    { id: makeId(), playerId: 'p_yamal', dateISO: '2026-07-01', label: 'Season end', ca: 142, pa: 176 },
  ]));

  const [toasts, setToasts] = useState([]);

  const pushToast = ({ variant = 'info', title, message }) => {
    const id = makeId();
    const t = { id, variant, title, message };
    setToasts((prev) => [t, ...prev].slice(0, 4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 2600);
  };

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const isShortlisted = (playerId) => Object.values(shortlistEntries || {}).some((m) => !!m?.[playerId]);
  const isFavorite = (playerId) => !!favorites?.[playerId];
  const isCompared = (playerId) => comparisonIds.includes(playerId);

  const addToShortlist = (playerId, listId, { tag, note } = {}) => {
    setShortlistEntries((prev) => {
      const next = { ...(prev || {}) };
      const list = { ...(next[listId] || {}) };
      list[playerId] = { tag: tag || 'target', note: note || '', addedAt: new Date().toISOString() };
      next[listId] = list;
      return next;
    });
  };

  const removeFromShortlist = (playerId, listId) => {
    setShortlistEntries((prev) => {
      const next = { ...(prev || {}) };
      const list = { ...(next[listId] || {}) };
      delete list[playerId];
      next[listId] = list;
      return next;
    });
  };

  const toggleCompare = (playerId) => {
    setComparisonIds((prev) => {
      const exists = prev.includes(playerId);
      if (exists) return prev.filter((id) => id !== playerId);
      if (prev.length >= 5) {
        pushToast({ variant: 'warning', title: 'Compare limit', message: 'Maximum 5 players in compare (prototype).' });
        return prev;
      }
      return [...prev, playerId];
    });
  };
  // Navigate to Comparison and ensure the player becomes the base (slot 1 of 5 total).
  const openComparisonFromProfile = (playerId) => {
    if (!playerId) return;

    setComparisonIds((prev) => {
      const MAX = 5;
      let next = [...(prev || [])];
      const existingIndex = next.indexOf(playerId);

      // If already present, move to base (index 0)
      if (existingIndex !== -1) {
        next.splice(existingIndex, 1);
        return [playerId, ...next];
      }

      // If full, drop the last slot to make room
      if (next.length >= MAX) {
        next = next.slice(0, MAX - 1);
        pushToast?.({
          variant: 'warning',
          title: 'Compare limit',
          message: `Compare is limited to ${MAX} players. Replaced the last slot.`,
        });
      }

      return [playerId, ...next];
    });

    setActiveScreen('comparison');
  };

  // Replace a compare slot in-place (keeps column order stable)
  const replaceCompareSlot = (index, newPlayerId) => {
    if (!newPlayerId) return;

    setComparisonIds((prev) => {
      const next = [...(prev || [])];
      if (index < 0 || index >= next.length) return prev;
      if (next.includes(newPlayerId)) return prev;
      next[index] = newPlayerId;
      return next;
    });
  };



  // Swap/make base player (keeps order stable; updates defaults via base change)
  const makeCompareBase = (playerId) => {
    if (!playerId) return;
    setComparisonIds((prev) => {
      const next = [...(prev || [])];
      const i = next.indexOf(playerId);
      if (i === -1) return prev;
      next.splice(i, 1);
      return [playerId, ...next];
    });
  };
  const toggleFavourite = (playerId) => {
    setFavorites((prev) => {
      const next = { ...(prev || {}) };
      if (next[playerId]) delete next[playerId];
      else next[playerId] = true;
      return next;
    });
  };

  const createHistoryPoint = (playerId, { label } = {}) => {
    const p = players.find((x) => x.id === playerId);
    if (!p) return;
    setHistoryPoints((prev) => ([
      ...prev,
      {
        id: makeId(),
        playerId,
        dateISO: new Date().toISOString(),
        label: label || 'Manual snapshot',
        ca: p.ca,
        pa: p.pa,
      }
    ]));
  };

  const removeHistoryPoint = (historyId) => setHistoryPoints((prev) => prev.filter((x) => x.id !== historyId));


  const screens = [
    { id: 'dashboard', label: 'Dashboard', component: DashboardScreen },
    { id: 'players', label: 'Search & Filters', component: PlayerSearchScreen },
    { id: 'profile', label: 'Player Profile', component: PlayerProfileScreen },
    { id: 'history', label: 'History Points', component: HistoryPointsScreen },
    { id: 'ratings', label: 'Rating Engine', component: RatingDesignerScreen },
    { id: 'staff', label: 'Staff', component: StaffInterfaceScreen },
    { id: 'clubs', label: 'Club Profile', component: ClubInterfaceScreen },
    { id: 'shortlists', label: 'Shortlists', component: ShortlistScreen },
    { id: 'comparison', label: 'Comparison', component: ComparisonScreen },

    // g Edition (premium)
    { id: 'toplists', label: 'Top Lists (g)', component: TopListsScreen },
    { id: 'squadgap', label: 'Squad Gap Analyzer (g)', component: SquadGapAnalyzerScreen },
    { id: 'replacement', label: 'Replacement Finder (g)', component: ReplacementFinderScreen },
    { id: 'shortlistopt', label: 'Shortlist Optimizer (g)', component: ShortlistOptimizerScreen },
    { id: 'dealintel', label: 'Deal Intelligence (g)', component: DealIntelligenceScreen },
    { id: 'contractradar', label: 'Contract & Clause Radar (g)', component: ContractClauseRadarScreen },
    { id: 'rolefinder', label: 'Role Finder (g)', component: RoleFinderScreen },
    { id: 'radar', label: 'Radar (g)', component: RadarScreen },
    { id: 'transferplan', label: 'Transfer Plan (g)', component: TransferPlanScreen },
    { id: 'presetmarket', label: 'Preset Marketplace (g)', component: PresetMarketplaceScreen },
    { id: 'reports', label: 'Pro Reports (g)', component: ProReportsScreen },

    { id: 'loading', label: 'Loading & Feedback', component: LoadingStatesScreen },
  ];

  const bg = darkMode ? 'bg-slate-950' : 'bg-slate-100';
  const text = darkMode ? 'text-white' : 'text-slate-900';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';

  const renderScreen = (screenId) => {
    const screen = screens.find(s => s.id === screenId);
    if (!screen) return null;
    const ScreenComponent = screen.component;

    if (screenId === 'players') {
      return (
        <WireframeContainer key={screenId} title={`Screen: ${screen.label}`} dark={darkMode}>
          <div className={`rounded-2xl overflow-hidden flex ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ height: 600 }}>
            <Sidebar dark={darkMode} collapsed={true} activeNav={screenId} gameLoaded={true} />
            <div className="flex-1 flex flex-col">
              <ScreenComponent
                dark={darkMode}
                gameLoaded={true}
                players={players}
                isShortlisted={isShortlisted}
                isFavorite={isFavorite}
                isCompared={isCompared}
                onSelectPlayer={(id) => {
                  setSelectedPlayerId(id);
                  setActiveScreen('profile');
                }}
              />
            </div>
          </div>
        </WireframeContainer>
      );
    }

    if (screenId === 'profile') {
      const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0] || null;
      return (
        <WireframeContainer key={screenId} title={`Screen: ${screen.label}`} description="Player profile - NO overlay backdrop" dark={darkMode}>
          <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ height: 650 }}>
            <ScreenComponent
              dark={darkMode}
              player={selectedPlayer}
              onBack={() => setActiveScreen('players')}
              shortlists={shortlists}
              shortlistEntries={shortlistEntries}
              onAddToShortlist={addToShortlist}
              onRemoveFromShortlist={removeFromShortlist}
              comparisonIds={comparisonIds}
              onToggleCompare={toggleCompare}
              onCreateHistoryPoint={createHistoryPoint}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavourite}
              playerReports={playerReports}
              onSavePlayerReport={savePlayerReport}
              onOpenComparison={openComparisonFromProfile}
              pushToast={pushToast}
            />
          </div>
        </WireframeContainer>
      );
    }


    if (screenId === 'shortlists') {
      return (
        <WireframeContainer title="Shortlists" description="State-driven shortlists (updated from Player Profile actions)." dark={darkMode}>
          <div className="h-[760px] flex bg-slate-950 relative">
            <ScreenComponent
              dark={darkMode}
              players={players}
              shortlists={shortlists}
              shortlistEntries={shortlistEntries}
              onRemoveFromShortlist={removeFromShortlist}
              onSelectPlayer={(id) => {
                setSelectedPlayerId(id);
                setActiveScreen('profile');
              }}
              pushToast={pushToast}
            />
          </div>
        </WireframeContainer>
      );
    }

    if (screenId === 'comparison') {
      return (
        <WireframeContainer title="Comparison" description="State-driven compare list (add/remove from Player Profile)." dark={darkMode}>
          <div className="h-[760px] flex bg-slate-950 relative">
            <ScreenComponent
              dark={darkMode}
              players={players}
              comparisonIds={comparisonIds}
              onToggleCompare={toggleCompare}
              onReplaceCompareSlot={replaceCompareSlot}
              onMakeBase={makeCompareBase}
              pushToast={pushToast}
              onSelectPlayer={(id) => {
                setSelectedPlayerId(id);
                setActiveScreen('profile');
              }}
            />
          </div>
        </WireframeContainer>
      );
    }

    if (screenId === 'history') {
      return (
        <WireframeContainer title="History Points" description="State-driven snapshots created from Player Profile." dark={darkMode}>
          <div className="h-[760px] flex bg-slate-950 relative">
            <ScreenComponent
              dark={darkMode}
              players={players}
              historyPoints={historyPoints}
              defaultPlayerId={selectedPlayerId}
              onRemoveHistoryPoint={removeHistoryPoint}
              pushToast={pushToast}
            />
          </div>
        </WireframeContainer>
      );
    }

    if (screenId === 'dashboard') {
      return (
        <WireframeContainer key={screenId} title={`Screen: ${screen.label}`} description="Initial landing with game status" dark={darkMode}>
          <div className={`rounded-2xl overflow-hidden flex ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ height: 600 }}>
            <Sidebar dark={darkMode} collapsed={false} activeNav="dashboard" gameLoaded={gameLoaded} />
            <div className="flex-1 flex flex-col">
              <Header dark={darkMode} gameLoaded={gameLoaded} />
              <ScreenComponent dark={darkMode} gameLoaded={gameLoaded} onLoadGame={() => setGameLoaded(!gameLoaded)} />
            </div>
          </div>
        </WireframeContainer>
      );
    }

    return (
      <WireframeContainer key={screenId} title={`Screen: ${screen.label}`} dark={darkMode}>
        <div className={`rounded-2xl overflow-hidden flex ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ height: 600 }}>
          <Sidebar dark={darkMode} collapsed={true} activeNav={screenId} gameLoaded={true} />
          <div className="flex-1 flex flex-col">
            <ScreenComponent dark={darkMode} gameLoaded={true} />
          </div>
        </div>
      </WireframeContainer>
    );
  };

  return (
    <div className={`min-h-screen ${bg} p-8`}>
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${text}`}>FM Genie Scout</h1>
                <p className={muted}>Complete UI/UX Prototype</p>
              </div>
            </div>
            <p className={`${muted} mt-4 max-w-2xl text-sm`}>Interactive prototype with all screens and components. Toggle themes and explore individual screens.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant={gameLoaded ? 'success' : 'secondary'} icon={gameLoaded ? CheckCircle2 : Play} onClick={() => setGameLoaded(!gameLoaded)} dark={darkMode}>
              {gameLoaded ? 'Game Loaded' : 'Simulate Load'}
            </Button>
            <Button variant="secondary" icon={darkMode ? Sun : Moon} onClick={() => setDarkMode(!darkMode)} dark={darkMode}>
              {darkMode ? 'Light' : 'Dark'} Mode
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-8 flex-wrap">
          <button onClick={() => setActiveScreen('all')} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeScreen === 'all' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : `${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}`}>
            All Screens
          </button>
          {screens.map(screen => (
            <button key={screen.id} onClick={() => setActiveScreen(screen.id)} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeScreen === screen.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : `${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}`}>
              {screen.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeScreen === 'all' ? screens.map(screen => renderScreen(screen.id)) : renderScreen(activeScreen)}
      </div>

      <div className={`max-w-7xl mx-auto mt-12 p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50' : 'bg-white'} border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${text}`}>Design System Components</h3>
        <div className="grid grid-cols-6 gap-4">
          {[
            { icon: Layout, title: 'Layouts', count: '4' },
            { icon: Grid, title: 'Cards', count: '8' },
            { icon: Sliders, title: 'Inputs', count: '12' },
            { icon: Bell, title: 'Feedback', count: '6' },
            { icon: Table, title: 'Tables', count: '3' },
            { icon: BarChart3, title: 'Charts', count: '5' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center mx-auto mb-2`}>
                <item.icon size={20} className="text-blue-500" />
              </div>
              <h4 className={`font-medium ${text} text-sm`}>{item.title}</h4>
              <p className={`text-xs ${muted}`}>{item.count} variants</p>
            </div>
          ))}
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} dark={darkMode} />
    </div>
  );
}
