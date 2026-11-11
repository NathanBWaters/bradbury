/**
 * Authentic Duolingo-Style Calendar Streak & Gamification Engine for Bradbury 1000
 *
 * Core Duolingo Rules Implemented:
 * 1. Calendar-Day Streak: Your streak counts consecutive local calendar days (`YYYY-MM-DD`)
 *    with >= 1 completed reading (catalog work or logged external book).
 *    - Completing 0 works ever -> streak is 0 (`unstarted`).
 *    - Completing your 1st work today -> ignites today's flame and increments streak by +1 (`extended_today`).
 *    - Completing 2nd, 3rd, 4th+ works on the SAME calendar day -> keeps today's streak at +1
 *      while advancing Today's Daily Ritual Ring (3 reads = Gold Bradbury Night, 4 = Perfect Quartet).
 *    - If you read yesterday (streak = N) and haven't read yet today -> streak displays `N`
 *      with an UNLIT flame (`at_risk`), urging 1 read before midnight to reach `N + 1`.
 * 2. Streak Freeze Protection:
 *    - Readers start with 1 equipped Streak Freeze (max capacity: 2).
 *    - Missing an entire calendar day when `streak > 0` and `freezeTokens > 0` automatically
 *      consumes 1 Streak Freeze (`frozen`), preserving `streak` without incrementing it.
 *    - Missing a day with `0` freezes resets `currentStreak` to `0` (`broken`), while preserving `longestStreak`.
 *    - Hitting every 7-day streak milestone (`7, 14, 21, ...`) awards +1 Streak Freeze (up to 2 max).
 */

const STORAGE_KEY = 'bradbury_1000_user_state_v1';

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365, 500, 1000];

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SHORTS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats a Date or ISO timestamp into a local calendar key `YYYY-MM-DD`.
 */
export function toLocalDateKey(input = new Date()) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses `YYYY-MM-DD` as local noon so DST transitions never shift calendar arithmetic.
 */
export function parseLocalDateKey(dateKey) {
  const [y, m, d] = String(dateKey)
    .split('-')
    .map((n) => Number(n));
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDaysToDateKey(dateKey, deltaDays) {
  const dt = parseLocalDateKey(dateKey);
  dt.setDate(dt.getDate() + deltaDays);
  return toLocalDateKey(dt);
}

export function diffCalendarDays(startKey, endKey) {
  const a = parseLocalDateKey(startKey);
  const b = parseLocalDateKey(endKey);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Computes the complete Duolingo-authentic streak state from completedItems + externalLogs.
 *
 * @param {object} completedItems - Map of itemId -> { completed, completedAt, categoryKey }
 * @param {Array} externalLogs - Array of { id, title, loggedAt, slotKey }
 * @param {object} options - { now?: Date | string, initialFreezeTokens?: number, maxFreezeTokens?: number }
 */
export function computeDuolingoStreak(completedItems = {}, externalLogs = [], options = {}) {
  const todayKey = toLocalDateKey(options.now || new Date());
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const maxFreezeTokens = options.maxFreezeTokens ?? 2;
  const initialFreezeTokens = options.initialFreezeTokens ?? 1;

  // Bucket every completed reading into its local calendar date `YYYY-MM-DD`.
  // Legacy entries with `completed: true` but no timestamp safely bucket to `todayKey`.
  const activityByDay = new Map();

  function recordActivity(dateKey, categoryKey = 'story') {
    const key = dateKey || todayKey;
    if (!activityByDay.has(key)) {
      activityByDay.set(key, { count: 0, categories: new Set() });
    }
    const bucket = activityByDay.get(key);
    bucket.count += 1;
    if (categoryKey) bucket.categories.add(categoryKey);
  }

  for (const [, entry] of Object.entries(completedItems || {})) {
    if (!entry || !entry.completed) continue;
    const key = entry.completedAt ? toLocalDateKey(entry.completedAt) : todayKey;
    // Clamp any future clock-skewed timestamp to todayKey
    const safeKey = key && key <= todayKey ? key : todayKey;
    recordActivity(safeKey, entry.categoryKey || 'story');
  }

  for (const log of externalLogs || []) {
    if (!log) continue;
    const key = log.loggedAt ? toLocalDateKey(log.loggedAt) : todayKey;
    const safeKey = key && key <= todayKey ? key : todayKey;
    recordActivity(safeKey, log.slotKey || 'story');
  }

  const sortedActiveDays = [...activityByDay.keys()].sort();
  const todayBucket = activityByDay.get(todayKey) || { count: 0, categories: new Set() };
  const todayCount = todayBucket.count;
  const todayCategories = [...todayBucket.categories];
  const completedToday = todayCount >= 1;

  let runningStreak = 0;
  let longestStreak = 0;
  let freezeTokens = initialFreezeTokens;
  let lastBrokenStreak = 0;
  let totalGoldDays = 0;
  let totalDiamondDays = 0;
  const frozenDateSet = new Set();

  if (sortedActiveDays.length > 0) {
    const firstDayKey = sortedActiveDays[0];
    const totalSpanDays = diffCalendarDays(firstDayKey, yesterdayKey);

    // Simulate every calendar day from firstDayKey through yesterdayKey
    for (let offset = 0; offset <= totalSpanDays; offset++) {
      const dayKey = addDaysToDateKey(firstDayKey, offset);
      const bucket = activityByDay.get(dayKey);

      if (bucket && bucket.count >= 1) {
        runningStreak += 1;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
        if (bucket.count >= 3) totalGoldDays += 1;
        if (bucket.categories.size >= 4) totalDiamondDays += 1;

        // Duolingo Streak Society: every 7 consecutive lit days awards +1 Streak Freeze (max 2)
        if (runningStreak > 0 && runningStreak % 7 === 0) {
          freezeTokens = Math.min(maxFreezeTokens, freezeTokens + 1);
        }
      } else if (runningStreak > 0) {
        if (freezeTokens > 0) {
          // Streak Freeze automatically saves the streak for this missed calendar day!
          freezeTokens -= 1;
          frozenDateSet.add(dayKey);
        } else {
          lastBrokenStreak = runningStreak;
          runningStreak = 0;
        }
      }
    }

    // Evaluate Today (`todayKey`)
    if (completedToday) {
      runningStreak += 1;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
      if (todayCount >= 3) totalGoldDays += 1;
      if (todayBucket.categories.size >= 4) totalDiamondDays += 1;
      if (runningStreak > 0 && runningStreak % 7 === 0) {
        freezeTokens = Math.min(maxFreezeTokens, freezeTokens + 1);
      }
    }
  }

  const frozeYesterday = frozenDateSet.has(yesterdayKey);

  let streakState = 'unstarted';
  if (completedToday) {
    streakState = 'extended_today';
  } else if (runningStreak > 0) {
    streakState = frozeYesterday ? 'frozen_saved' : 'at_risk';
  } else if (lastBrokenStreak > 0) {
    streakState = 'broken';
  }

  // Build 7-day Duolingo rolling week strip ending today
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const dateKey = addDaysToDateKey(todayKey, -i);
    const dt = parseLocalDateKey(dateKey);
    const dow = dt.getDay();
    const bucket = activityByDay.get(dateKey);
    const count = bucket ? bucket.count : 0;
    const isFrozen = frozenDateSet.has(dateKey);

    let status = 'empty';
    if (count >= 3) {
      status = 'gold';
    } else if (count >= 1) {
      status = 'lit';
    } else if (isFrozen) {
      status = 'frozen';
    }

    weekDays.push({
      dateKey,
      dayLetter: DAY_LETTERS[dow],
      dayShort: DAY_SHORTS[dow],
      isToday: i === 0,
      count,
      status
    });
  }

  const nextMilestone =
    STREAK_MILESTONES.find((m) => m > runningStreak) ||
    Math.ceil((runningStreak + 1) / 100) * 100;
  const daysToNextFreeze = runningStreak > 0 ? 7 - (runningStreak % 7) : 7;

  return {
    todayKey,
    currentStreak: runningStreak,
    longestStreak,
    completedToday,
    todayCount,
    todayCategories,
    todayGoldUnlocked: todayCount >= 3,
    todayPerfectQuartet: todayBucket.categories.size >= 4,
    streakState, // 'unstarted' | 'extended_today' | 'at_risk' | 'frozen_saved' | 'broken'
    freezeTokens,
    maxFreezeTokens,
    frozeYesterday,
    frozenDates: [...frozenDateSet],
    lastBrokenStreak,
    totalActiveDays: sortedActiveDays.length,
    totalGoldDays,
    goldNights: totalGoldDays,
    totalDiamondDays,
    weekDays,
    nextMilestone,
    daysToNextFreeze
  };
}

// ============================================================================
// Legacy Night-Slot Exports (kept for backwards compatibility & unit tests)
// ============================================================================

export const DEFAULT_USER_STATE = {
  profile: {
    name: 'Nathan Waters',
    email: 'watersnathan1@gmail.com',
    elevenReaderToken: '',
    includeAnalysisInEpub: true,
    preferredPlaceTrack: 'both',
    theme: 'parchment',
    soundEnabled: true
  },
  currentNight: 1,
  streak: {
    litFlameDays: 0,
    goldNightsCount: 0,
    diamondNightsCount: 0,
    freezeTokens: 1,
    maxFreezeTokens: 2,
    goldNightsTowardNextFreeze: 0
  },
  completedSlots: {
    1: { poem: false, story: false, essay: false, korea: false, sf: false }
  },
  swappedItems: {},
  externalLogs: []
};

export function loadUserState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_STATE,
      ...parsed,
      profile: { ...DEFAULT_USER_STATE.profile, ...(parsed.profile || {}) },
      streak: { ...DEFAULT_USER_STATE.streak, ...(parsed.streak || {}) },
      completedSlots: { ...DEFAULT_USER_STATE.completedSlots, ...(parsed.completedSlots || {}) },
      swappedItems: { ...(parsed.swappedItems || {}) },
      externalLogs: Array.isArray(parsed.externalLogs) ? parsed.externalLogs : []
    };
  } catch {
    return DEFAULT_USER_STATE;
  }
}

export function saveUserState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function evaluateNightStatus(nightSlots = {}) {
  const poemDone = Boolean(nightSlots.poem);
  const storyDone = Boolean(nightSlots.story);
  const essayDone = Boolean(nightSlots.essay);
  const placeDone = Boolean(nightSlots.korea || nightSlots.sf);
  const bothPlacesDone = Boolean(nightSlots.korea && nightSlots.sf);

  const pillarsCompleted = [poemDone, storyDone, essayDone, placeDone].filter(Boolean).length;
  const totalCheckmarks = [
    poemDone,
    storyDone,
    essayDone,
    Boolean(nightSlots.korea),
    Boolean(nightSlots.sf)
  ].filter(Boolean).length;

  let tier = 'unlit';
  if (pillarsCompleted === 4) {
    tier = 'diamond';
  } else if (pillarsCompleted >= 3) {
    tier = 'gold';
  } else if (pillarsCompleted >= 1) {
    tier = 'flame';
  }

  return {
    poemDone,
    storyDone,
    essayDone,
    placeDone,
    bothPlacesDone,
    pillarsCompleted,
    totalCheckmarks,
    tier,
    isLitFlame: pillarsCompleted >= 1,
    isGoldNight: pillarsCompleted >= 3,
    isDiamondNight: pillarsCompleted === 4
  };
}

export function recomputeStreakSummary(completedSlots, baseFreezeTokens = 1) {
  let litFlameDays = 0;
  let goldNightsCount = 0;
  let diamondNightsCount = 0;

  for (let n = 1; n <= 1000; n++) {
    const status = evaluateNightStatus(completedSlots[n] || {});
    if (status.isLitFlame) litFlameDays += 1;
    if (status.isGoldNight) goldNightsCount += 1;
    if (status.isDiamondNight) diamondNightsCount += 1;
  }

  const earnedFreezes = Math.floor(goldNightsCount / 7);
  const freezeTokens = Math.min(2, baseFreezeTokens + earnedFreezes);
  const goldNightsTowardNextFreeze = goldNightsCount % 7;

  return {
    litFlameDays,
    goldNightsCount,
    diamondNightsCount,
    freezeTokens,
    maxFreezeTokens: 2,
    goldNightsTowardNextFreeze
  };
}
