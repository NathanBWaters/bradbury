/**
 * 2-Tier Duolingo-Style Streak & Progress Engine for Bradbury 1000
 * - Tier 1 ("Lit Flame"): Completing >= 1 of 4 nightly readings preserves the daily streak.
 * - Tier 2 ("Gold Bradbury Night"): Completing >= 3 of 4 nightly readings advances the
 *   1,000 Nights Counter and progresses toward Streak Freeze tokens (+1 every 7 Gold Nights, max 2 held).
 * - Tier 3 ("Diamond Quartet"): Completing all 4 of 4 readings (Poem, Story, Essay, and Korea/SF Lore).
 */

const STORAGE_KEY = 'bradbury_1000_user_state_v1';

export const DEFAULT_USER_STATE = {
  profile: {
    name: 'Nathan Waters',
    email: 'watersnathan1@gmail.com',
    elevenReaderToken: '',
    includeAnalysisInEpub: true,
    preferredPlaceTrack: 'both', // 'both' | 'Korea' | 'San Francisco'
    theme: 'parchment' // 'parchment' | 'nocturnal'
  },
  currentNight: 1,
  streak: {
    litFlameDays: 1,
    goldNightsCount: 0,
    diamondNightsCount: 0,
    freezeTokens: 1, // starts with 1 starter Streak Freeze token (max 2)
    maxFreezeTokens: 2,
    goldNightsTowardNextFreeze: 0
  },
  // Map of nightNumber -> { poem: boolean, story: boolean, essay: boolean, korea: boolean, sf: boolean, completedAt: string }
  completedSlots: {
    1: { poem: false, story: false, essay: false, korea: false, sf: false }
  },
  // Map of nightNumber -> { poem?: string, story?: string, essay?: string } for swapped item IDs
  swappedItems: {},
  // External books/stories logged via Open Library or manual entry
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

/**
 * Evaluates a night's completion status across the 4 pillars:
 * 1. Poem
 * 2. Short Story
 * 3. Essay
 * 4. Place & Lore (Korea and/or San Francisco completed)
 */
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

  let tier = 'unlit'; // 'unlit' | 'flame' | 'gold' | 'diamond'
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
