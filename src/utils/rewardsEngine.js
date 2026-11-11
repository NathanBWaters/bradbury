/**
 * Duolingo-playbook reward loops for Bradbury 1000: XP & levels, three Daily Quests with a
 * bonus chest, a monthly challenge badge, and tiered achievements.
 *
 * Everything here is a pure function of `completedItems` + `externalLogs` (the two things
 * that already sync across devices), so rewards need no extra storage, can never drift
 * between devices, and un-marking a work simply takes its XP back.
 */
import { toLocalDateKey, parseLocalDateKey } from './streakEngine.js';

export const FORM_KEYS = ['poem', 'story', 'essay', 'personal'];

export const BASE_XP = { poem: 10, story: 20, essay: 15, personal: 20 };
export const FIRST_READ_BONUS_XP = 5;
export const GOLD_NIGHT_BONUS_XP = 15;
export const QUARTET_BONUS_XP = 25;
export const QUEST_CHEST_BONUS_XP = 25;
export const MONTHLY_QUEST_TARGET = 30;

const FORM_QUESTS = {
  poem: { title: 'Read a poem', short: 'Poem' },
  story: { title: 'Read a short story', short: 'Story' },
  essay: { title: 'Read an essay', short: 'Essay' },
  personal: { title: 'Read a Korea or SF chronicle', short: 'Chronicle' }
};

const STRETCH_QUESTS = [
  { metric: 'forms', target: 2, title: 'Read 2 different forms' },
  { metric: 'count', target: 3, title: 'Read 3 works for a Gold Night' },
  { metric: 'baseXp', target: 40, title: 'Earn 40 XP from reading' },
  { metric: 'count', target: 2, title: 'Read 2 works tonight' }
];

const LEVEL_TITLES = [
  'Candle Lighter',
  'Page Turner',
  'Porch Reader',
  'Lamplighter',
  'Night Owl',
  'Verse Voyager',
  'Ink Alchemist',
  'Midnight Scholar',
  'Rocket Summer Dreamer',
  'Dandelion Vintner',
  'Martian Chronicler',
  'Illustrated Mind',
  'Carnival Seer',
  'Keeper of the Flame',
  'Bradbury Laureate'
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/** Tiered achievements; `tiers` are the thresholds for level 1, 2, 3… */
export const ACHIEVEMENT_DEFS = [
  { id: 'wildfire', name: 'Wildfire', icon: 'flame', unit: 'day streak', tiers: [3, 7, 14, 30, 50, 100, 200, 365] },
  { id: 'bibliophile', name: 'Bibliophile', icon: 'book', unit: 'works read', tiers: [1, 10, 25, 50, 100, 200, 400] },
  { id: 'sage', name: 'Sage', icon: 'zap', unit: 'XP earned', tiers: [100, 500, 1000, 2500, 5000, 10000, 20000] },
  { id: 'gilded', name: 'Gilded', icon: 'award', unit: 'Gold Nights', tiers: [1, 5, 10, 25, 50, 100] },
  { id: 'quartet', name: 'Quartet Master', icon: 'gem', unit: 'perfect quartets', tiers: [1, 3, 10, 25, 50] },
  { id: 'quester', name: 'Quest Champion', icon: 'target', unit: 'quests done', tiers: [3, 15, 50, 150, 500] },
  { id: 'poet', name: 'Poet', icon: 'feather', unit: 'poems', tiers: [5, 25, 50, 100] },
  { id: 'storyteller', name: 'Storyteller', icon: 'scroll', unit: 'stories', tiers: [5, 25, 50, 100] },
  { id: 'essayist', name: 'Essayist', icon: 'pen', unit: 'essays', tiers: [5, 25, 50, 100] },
  { id: 'wayfarer', name: 'Wayfarer', icon: 'map', unit: 'chronicles', tiers: [5, 25, 50, 100] },
  { id: 'nightowl', name: 'Night Owl', icon: 'moon', unit: 'reads after 10pm', tiers: [1, 10, 50] },
  { id: 'earlybird', name: 'Early Bird', icon: 'sunrise', unit: 'reads before 9am', tiers: [1, 10, 50] }
];

/** Cumulative XP needed to *reach* a level (level 1 = 0 XP). */
export function xpForLevel(level) {
  const n = Math.max(0, level - 1);
  return 40 * n + 10 * n * Math.max(0, n - 1);
}

export function levelTitle(level) {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length, Math.max(1, level)) - 1];
}

export function levelFromXp(totalXp) {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level += 1;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return {
    level,
    title: levelTitle(level),
    nextTitle: levelTitle(level + 1),
    xpIntoLevel: totalXp - floor,
    xpForNextLevel: ceiling - floor,
    xpToNextLevel: ceiling - totalXp,
    progress: (totalXp - floor) / (ceiling - floor)
  };
}

function normalizeForm(raw, id = '') {
  const key = String(raw || '').toLowerCase();
  if (FORM_KEYS.includes(key)) return key;
  if (key === 'korea' || key === 'sf') return 'personal';
  const prefix = String(id).split('-')[0];
  if (FORM_KEYS.includes(prefix)) return prefix;
  if (prefix === 'korea' || prefix === 'sf') return 'personal';
  return 'story';
}

function hashDateKey(dateKey) {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The three quests for a calendar day — same on every device, different every day. */
export function getDailyQuestDefs(dateKey) {
  const seed = hashDateKey(dateKey);
  const form = FORM_KEYS[seed % FORM_KEYS.length];
  const stretch = STRETCH_QUESTS[(seed >>> 4) % STRETCH_QUESTS.length];
  return [
    { id: 'spark', title: 'Light tonight’s lantern', metric: 'count', target: 1, rewardXp: 10 },
    { id: `form-${form}`, title: FORM_QUESTS[form].title, metric: `form:${form}`, target: 1, rewardXp: 15, form },
    { id: `stretch-${stretch.metric}-${stretch.target}`, ...stretch, rewardXp: 20 }
  ];
}

function evaluateDay(dateKey, forms) {
  const count = forms.length;
  const perForm = { poem: 0, story: 0, essay: 0, personal: 0 };
  let readingXp = 0;
  for (const f of forms) {
    perForm[f] += 1;
    readingXp += BASE_XP[f];
  }
  const distinctForms = FORM_KEYS.filter((f) => perForm[f] > 0).length;
  const isGold = count >= 3;
  const isQuartet = distinctForms >= 4;
  const bonusXp =
    (count >= 1 ? FIRST_READ_BONUS_XP : 0) +
    (isGold ? GOLD_NIGHT_BONUS_XP : 0) +
    (isQuartet ? QUARTET_BONUS_XP : 0);
  const baseXp = readingXp + bonusXp;

  const quests = getDailyQuestDefs(dateKey).map((q) => {
    let value = 0;
    if (q.metric === 'count') value = count;
    else if (q.metric === 'forms') value = distinctForms;
    else if (q.metric === 'baseXp') value = baseXp;
    else if (q.metric.startsWith('form:')) value = perForm[q.metric.slice(5)] || 0;
    const progress = Math.min(q.target, value);
    return { ...q, progress, done: value >= q.target };
  });
  const questsDone = quests.filter((q) => q.done).length;
  const chestOpened = questsDone === quests.length;
  const questXp =
    quests.reduce((sum, q) => sum + (q.done ? q.rewardXp : 0), 0) +
    (chestOpened ? QUEST_CHEST_BONUS_XP : 0);

  return {
    dateKey,
    count,
    distinctForms,
    isGold,
    isQuartet,
    readingXp,
    bonusXp,
    questXp,
    xp: baseXp + questXp,
    quests,
    questsDone,
    chestOpened
  };
}

function tierProgress(def, value) {
  let level = 0;
  while (level < def.tiers.length && value >= def.tiers[level]) level += 1;
  const maxed = level >= def.tiers.length;
  const prevTarget = level > 0 ? def.tiers[level - 1] : 0;
  const nextTarget = maxed ? def.tiers[def.tiers.length - 1] : def.tiers[level];
  return {
    ...def,
    value,
    level,
    maxLevel: def.tiers.length,
    maxed,
    nextTarget,
    progress: maxed ? 1 : Math.max(0, Math.min(1, (value - prevTarget) / (nextTarget - prevTarget)))
  };
}

/**
 * @param {object} completedItems itemId -> { completed, completedAt, categoryKey }
 * @param {Array} externalLogs [{ id, loggedAt, slotKey }]
 * @param {object} options { now?, longestStreak?, goldNights? } — pass the streak engine's
 *   numbers so achievements agree with what the rest of the app displays.
 */
export function computeRewards(completedItems = {}, externalLogs = [], options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const todayKey = toLocalDateKey(now);

  const formsByDay = new Map();
  const formTotals = { poem: 0, story: 0, essay: 0, personal: 0 };
  let nightOwlReads = 0;
  let earlyBirdReads = 0;

  function record(timestamp, form) {
    const key = timestamp ? toLocalDateKey(timestamp) : todayKey;
    const safeKey = key && key <= todayKey ? key : todayKey;
    if (!formsByDay.has(safeKey)) formsByDay.set(safeKey, []);
    formsByDay.get(safeKey).push(form);
    formTotals[form] += 1;
    if (timestamp) {
      const hour = new Date(timestamp).getHours();
      if (hour >= 22 || hour < 4) nightOwlReads += 1;
      else if (hour >= 4 && hour < 9) earlyBirdReads += 1;
    }
  }

  for (const [id, entry] of Object.entries(completedItems || {})) {
    if (!entry || !entry.completed) continue;
    record(entry.completedAt, normalizeForm(entry.categoryKey, id));
  }
  for (const log of externalLogs || []) {
    if (!log) continue;
    record(log.loggedAt, normalizeForm(log.slotKey));
  }

  let totalXp = 0;
  let totalWorks = 0;
  let totalQuestsDone = 0;
  let totalChests = 0;
  let goldDays = 0;
  let quartetDays = 0;
  const questsByMonth = new Map();

  for (const [dateKey, forms] of formsByDay) {
    const day = evaluateDay(dateKey, forms);
    totalXp += day.xp;
    totalWorks += day.count;
    totalQuestsDone += day.questsDone;
    if (day.chestOpened) totalChests += 1;
    if (day.isGold) goldDays += 1;
    if (day.isQuartet) quartetDays += 1;
    const monthKey = dateKey.slice(0, 7);
    questsByMonth.set(monthKey, (questsByMonth.get(monthKey) || 0) + day.questsDone);
  }

  const today = evaluateDay(todayKey, formsByDay.get(todayKey) || []);

  // Monthly challenge: finish 30 daily quests inside the calendar month.
  const monthKey = todayKey.slice(0, 7);
  const monthDate = parseLocalDateKey(todayKey);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const monthQuests = questsByMonth.get(monthKey) || 0;
  let monthlyBadges = 0;
  for (const count of questsByMonth.values()) {
    if (count >= MONTHLY_QUEST_TARGET) monthlyBadges += 1;
  }
  const monthly = {
    monthKey,
    name: `${MONTH_NAMES[monthDate.getMonth()]} Lantern Challenge`,
    target: MONTHLY_QUEST_TARGET,
    progress: Math.min(MONTHLY_QUEST_TARGET, monthQuests),
    done: monthQuests >= MONTHLY_QUEST_TARGET,
    daysLeft: daysInMonth - monthDate.getDate() + 1,
    badgesEarned: monthlyBadges
  };

  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msUntilReset = Math.max(0, midnight.getTime() - now.getTime());

  const goldNights = Math.max(goldDays, options.goldNights ?? 0);
  const values = {
    wildfire: options.longestStreak ?? 0,
    bibliophile: totalWorks,
    sage: totalXp,
    gilded: goldNights,
    quartet: quartetDays,
    quester: totalQuestsDone,
    poet: formTotals.poem,
    storyteller: formTotals.story,
    essayist: formTotals.essay,
    wayfarer: formTotals.personal,
    nightowl: nightOwlReads,
    earlybird: earlyBirdReads
  };
  const achievements = ACHIEVEMENT_DEFS.map((def) => tierProgress(def, values[def.id] || 0));

  return {
    todayKey,
    totalXp,
    todayXp: today.xp,
    ...levelFromXp(totalXp),
    quests: today.quests,
    questsDoneToday: today.questsDone,
    chestOpenedToday: today.chestOpened,
    chestBonusXp: QUEST_CHEST_BONUS_XP,
    msUntilReset,
    totalQuestsDone,
    totalChests,
    monthly,
    achievements,
    achievementLevels: achievements.reduce((sum, a) => sum + a.level, 0),
    achievementLevelsMax: achievements.reduce((sum, a) => sum + a.maxLevel, 0)
  };
}

/** What a single completion just unlocked — drives the celebration overlay. */
export function diffRewards(prev, next) {
  const prevQuestDone = new Set(
    prev.todayKey === next.todayKey ? prev.quests.filter((q) => q.done).map((q) => q.id) : []
  );
  const prevLevels = new Map(prev.achievements.map((a) => [a.id, a.level]));
  return {
    xpGained: Math.max(0, next.totalXp - prev.totalXp),
    questsCompleted: next.quests.filter((q) => q.done && !prevQuestDone.has(q.id)),
    chestOpened:
      next.chestOpenedToday && !(prev.todayKey === next.todayKey && prev.chestOpenedToday),
    levelUp:
      next.level > prev.level ? { from: prev.level, to: next.level, title: next.title } : null,
    achievements: next.achievements.filter((a) => a.level > (prevLevels.get(a.id) || 0)),
    monthlyCompleted: next.monthly.done && !prev.monthly.done
  };
}

export function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}
