/**
 * Pure functions for normalizing the Bradbury 1000 reading catalog,
 * computing genre subcategories with counts, filtering unread vs. completed items,
 * and calculating 2-tier Duolingo streak statistics.
 */
import { computeDuolingoStreak } from './streakEngine.js';

export const MAIN_CATEGORIES = [
  {
    key: 'poem',
    label: 'Poem',
    pluralLabel: 'Poems',
    shortLabel: 'Poems',
    subtitle: 'Verbatim Verse + Deep-Dive Analysis',
    description:
      'Lyric odes, sonnets, elegies, and modernist verse paired with a six-part critical companion.',
    typicalDuration: '~11 min'
  },
  {
    key: 'story',
    label: 'Short Story',
    pluralLabel: 'Short Stories',
    shortLabel: 'Stories',
    subtitle: 'Canonical Fiction + Deep-Dive Analysis',
    description:
      'Unabridged stories of realism, speculative worlds, wit, and gothic suspense with deep analysis.',
    typicalDuration: '15–25 min'
  },
  {
    key: 'essay',
    label: 'Essay',
    pluralLabel: 'Essays',
    shortLabel: 'Essays',
    subtitle: 'Classical Essays + Deep-Dive Analysis',
    description:
      'Stoic letters, nature walks, cultural criticism, and philosophical inquiries across centuries.',
    typicalDuration: '15–20 min'
  },
  {
    key: 'personal',
    label: 'Personal (Korea & SF)',
    pluralLabel: 'Korea & San Francisco Chronicles',
    shortLabel: 'Korea & SF',
    subtitle: 'Korea & SF Lore + Primary Sources',
    description:
      'Twenty-minute archival narratives exploring the hidden history, craft, and ecology of Korea and San Francisco.',
    typicalDuration: '20 min'
  }
];

const ESSAY_GENRE_CANONICAL_MAP = {
  'Aphoristic Moral & Intellectual Essay': 'Stoic & Moral Philosophy',
  'Stoic Moral Epistle & Treatise': 'Stoic & Moral Philosophy',
  'Transcendentalist Philosophical Essay': 'Transcendentalism & Nature',
  'Lyrical Nature & Philosophical Essay': 'Transcendentalism & Nature',
  'Popular Science & Evolutionary Essay': 'Transcendentalism & Nature',
  'Personal & Psychological Essay': 'Travel & Personal Essay',
  'Humorous & Philosophical Familiar Essay': 'Travel & Personal Essay',
  'Autobiographical Reverie / Familiar Essay': 'Travel & Personal Essay',
  'Romantic Personal & Travel Essay': 'Travel & Personal Essay',
  'Psychological & Philosophical Treatise': 'Philosophy & Epistemology',
  'Philosophical Treatise': 'Philosophy & Epistemology',
  'Literary Critical Essay': 'Cultural & Literary Criticism',
  'Literary Craft & Aesthetic Treatise': 'Cultural & Literary Criticism',
  'Parodic & Satirical Moral Essay': 'Social & Political Philosophy'
};

export const PERSONAL_THEMES = [
  'Architecture & Urban Design',
  'Craft, Food & Innovation',
  'Arts, Literature & Culture',
  'Nature, Ecology & Science',
  'History, Maritime & Civic Life'
];

export function classifyPersonalTheme(item) {
  const hay = `${item?.category || ''} ${item?.title || ''}`.toLowerCase();
  if (
    /(gastronom|food|culinar|tea|gimjang|onggi|yeast|market|paper|metalwork|tavern|celadon|ceramic|string craft|horolog|electronic|cybernetic|computing|cable car|invent)/.test(
      hay
    )
  ) {
    return 'Craft, Food & Innovation';
  }
  if (
    /(literar|poet|cinema|pansori|jazz|mural|fresco|media art|woodblock|jikji|hangul|bohemia|counterculture|botanical painting|satire|chess)/.test(
      hay
    )
  ) {
    return 'Arts, Literature & Culture';
  }
  if (
    /(maritime|admiral|turtle ship|ghost fleet|alcatraz|angel island|immigra|civil rights|harvey milk|emperor norton|labor|diplomacy|epidemiolog|public health|royal archives|dynasty|quake|wartime|military)/.test(
      hay
    )
  ) {
    return 'History, Maritime & Civic Life';
  }
  if (
    /(ecolog|geolog|fog|volcan|haenyeo|forest|stream|cheonggyecheon|astronom|meteorol|climate|marine|rewild|dune|lighthouse|garden)/.test(
      hay
    )
  ) {
    return 'Nature, Ecology & Science';
  }
  return 'Architecture & Urban Design';
}

export function buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces) {
  const poems = (poemsAndEssays?.poems || []).map((p, idx) => ({
    ...p,
    keyContext: p.keyContext || p.analysis?.[0]?.paragraph || '',
    categoryKey: 'poem',
    slotLabel: 'Poem',
    nightNumber: p.night || idx + 1,
    staticUrl: `/read/day-${p.night || idx + 1}/poem`,
    subcategory: p.genre || p.era || 'Lyric Poetry'
  }));

  const stories = (storiesAndPlaces?.stories || []).map((s, idx) => ({
    ...s,
    keyContext: s.keyContext || s.analysis?.[0]?.paragraph || '',
    categoryKey: 'story',
    slotLabel: 'Short Story',
    nightNumber: s.night || idx + 1,
    staticUrl: `/read/day-${s.night || idx + 1}/story`,
    subcategory: s.genre || s.era || 'Literary Fiction'
  }));

  const essays = (poemsAndEssays?.essays || []).map((e, idx) => {
    const rawGenre = e.genre || e.era || 'Classical Essay';
    const canonicalGenre = ESSAY_GENRE_CANONICAL_MAP[rawGenre] || rawGenre;
    return {
      ...e,
      rawGenre,
      genre: canonicalGenre,
      keyContext: e.keyContext || e.analysis?.[0]?.paragraph || '',
      categoryKey: 'essay',
      slotLabel: 'Essay',
      nightNumber: e.night || idx + 1,
      staticUrl: `/read/day-${e.night || idx + 1}/essay`,
      subcategory: canonicalGenre
    };
  });

  const korea = (storiesAndPlaces?.koreaStories || []).map((k, idx) => {
    const metrics = computeStoryAudioMetrics(k);
    const themeGroup = classifyPersonalTheme(k);
    const resolvedCategory = k.category || themeGroup;
    return {
      ...k,
      category: resolvedCategory,
      themeGroup,
      keyContext: k.keyContext || k.analysis?.[0]?.paragraph || '',
      wordCount: k.wordCount || metrics.totalWords,
      audioDurationMinutes: k.audioDurationMinutes || metrics.estimatedAudioMinutes,
      categoryKey: 'personal',
      slotLabel: 'Korea Deep-Dive',
      nightNumber: k.night || idx + 1,
      staticUrl: `/read/day-${k.night || idx + 1}/korea`,
      subcategory: `Korea • ${resolvedCategory}`,
      regionGroup: 'Korea'
    };
  });

  const sf = (storiesAndPlaces?.sfStories || []).map((s, idx) => {
    const metrics = computeStoryAudioMetrics(s);
    const themeGroup = classifyPersonalTheme(s);
    const resolvedCategory = s.category || themeGroup;
    return {
      ...s,
      category: resolvedCategory,
      themeGroup,
      keyContext: s.keyContext || s.analysis?.[0]?.paragraph || '',
      wordCount: s.wordCount || metrics.totalWords,
      audioDurationMinutes: s.audioDurationMinutes || metrics.estimatedAudioMinutes,
      categoryKey: 'personal',
      slotLabel: 'San Francisco Deep-Dive',
      nightNumber: s.night || idx + 1,
      staticUrl: `/read/day-${s.night || idx + 1}/sf`,
      subcategory: `San Francisco • ${resolvedCategory}`,
      regionGroup: 'San Francisco'
    };
  });

  // Interleave Korea and SF 1..50 equally
  const personal = [];
  const maxLen = Math.max(korea.length, sf.length);
  for (let i = 0; i < maxLen; i++) {
    if (korea[i]) personal.push(korea[i]);
    if (sf[i]) personal.push(sf[i]);
  }

  return {
    poem: poems,
    story: stories,
    essay: essays,
    personal
  };
}

function summarizeGroupItems(groupItems, completedItems = {}) {
  const unreadCount = groupItems.filter((x) => !completedItems[x.id]?.completed).length;
  const voices = [];
  const seenVoices = new Set();
  for (const item of groupItems) {
    const cleanAuthor = item.author
      ? item.author.replace(/\s*\([^)]*\)/g, '').trim()
      : '';
    const cleanLocation = item.location
      ? item.location.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim()
      : '';
    const rawVoice = cleanAuthor
      ? cleanAuthor.split(/\s+/).slice(-1)[0]
      : cleanLocation;
    if (rawVoice && !seenVoices.has(rawVoice)) {
      seenVoices.add(rawVoice);
      voices.push(rawVoice);
    }
    if (voices.length >= 3) break;
  }
  return {
    count: groupItems.length,
    unreadCount,
    sampleVoices: voices.join(' · ')
  };
}

export function getSubcategoriesForCategory(
  allItemsByCategory,
  selectedCategory,
  completedItems = {}
) {
  const items = allItemsByCategory[selectedCategory] || [];
  if (selectedCategory === 'personal') {
    const koreaItems = items.filter((i) => i.region === 'Korea');
    const sfItems = items.filter((i) => i.region === 'San Francisco');
    const allStats = summarizeGroupItems(items, completedItems);
    const koreaStats = summarizeGroupItems(koreaItems, completedItems);
    const sfStats = summarizeGroupItems(sfItems, completedItems);

    const list = [
      { id: 'All', label: 'All Chronicles', kind: 'all', ...allStats },
      {
        id: 'Korea',
        label: 'Korea',
        kind: 'region',
        blurb: 'Royal observatories, Jeju basalt coasts, celadon kilns, and Seoul urbanism.',
        ...koreaStats
      },
      {
        id: 'San Francisco',
        label: 'San Francisco',
        kind: 'region',
        blurb: 'Buried Gold Rush ships, Beat poetry, fog physics, and bayfront engineering.',
        ...sfStats
      }
    ];

    PERSONAL_THEMES.forEach((theme) => {
      const themeItems = items.filter((x) => x.themeGroup === theme);
      if (themeItems.length > 0) {
        list.push({
          id: theme,
          label: theme,
          kind: 'theme',
          ...summarizeGroupItems(themeItems, completedItems)
        });
      }
    });
    return list;
  }

  const allStats = summarizeGroupItems(items, completedItems);
  const list = [{ id: 'All', label: 'All Genres', kind: 'all', ...allStats }];
  const seen = new Set(['All']);
  items.forEach((item) => {
    if (item.genre && !seen.has(item.genre)) {
      seen.add(item.genre);
      const genreItems = items.filter((x) => x.genre === item.genre);
      list.push({
        id: item.genre,
        label: item.genre,
        kind: 'genre',
        ...summarizeGroupItems(genreItems, completedItems)
      });
    }
  });
  return list;
}

export function filterAndPartitionItems(
  allItemsByCategory,
  selectedCategory,
  selectedSubcategory,
  completedItems = {}
) {
  const rawItems = allItemsByCategory[selectedCategory] || [];
  const filtered = rawItems.filter((item) => {
    if (!selectedSubcategory || selectedSubcategory === 'All') return true;
    if (selectedCategory === 'personal') {
      if (selectedSubcategory === 'Korea' || selectedSubcategory === 'Korea (All 10)') {
        return item.region === 'Korea';
      }
      if (
        selectedSubcategory === 'San Francisco' ||
        selectedSubcategory === 'San Francisco (All 10)'
      ) {
        return item.region === 'San Francisco';
      }
      return item.themeGroup === selectedSubcategory || item.category === selectedSubcategory;
    }
    return item.genre === selectedSubcategory || item.rawGenre === selectedSubcategory;
  });

  const unreadItems = [];
  const completedCategoryItems = [];

  filtered.forEach((item) => {
    if (completedItems[item.id]?.completed) {
      completedCategoryItems.push(item);
    } else {
      unreadItems.push(item);
    }
  });

  return { unreadItems, completedCategoryItems };
}

export function computeStreakStats(
  allItemsByCategory,
  completedItems = {},
  externalLogs = [],
  options = {}
) {
  const poemsDone = (allItemsByCategory.poem || []).filter(
    (i) => completedItems[i.id]?.completed
  ).length;
  const storiesDone = (allItemsByCategory.story || []).filter(
    (i) => completedItems[i.id]?.completed
  ).length;
  const essaysDone = (allItemsByCategory.essay || []).filter(
    (i) => completedItems[i.id]?.completed
  ).length;
  const personalDone = (allItemsByCategory.personal || []).filter(
    (i) => completedItems[i.id]?.completed
  ).length;

  const totalCompleted =
    poemsDone + storiesDone + essaysDone + personalDone + (externalLogs?.length || 0);
  const categoriesTouched = [
    poemsDone > 0,
    storiesDone > 0,
    essaysDone > 0,
    personalDone > 0
  ].filter(Boolean).length;

  const duo = computeDuolingoStreak(completedItems, externalLogs, options);
  const goldNights = Math.max(duo.totalGoldDays, Math.floor(totalCompleted / 3));
  const nextGoldProgress =
    duo.todayCount > 0 ? duo.todayCount % 3 : totalCompleted % 3;

  return {
    poemsDone,
    storiesDone,
    essaysDone,
    personalDone,
    totalCompleted,
    categoriesTouched,
    goldNights,
    freezeTokens: duo.freezeTokens,
    maxFreezeTokens: duo.maxFreezeTokens,
    litFlameStreak: duo.currentStreak,
    currentStreak: duo.currentStreak,
    longestStreak: duo.longestStreak,
    completedToday: duo.completedToday,
    todayCount: duo.todayCount,
    todayCategories: duo.todayCategories,
    todayGoldUnlocked: duo.todayGoldUnlocked,
    todayPerfectQuartet: duo.todayPerfectQuartet,
    streakState: duo.streakState,
    frozeYesterday: duo.frozeYesterday,
    frozenDates: duo.frozenDates,
    lastBrokenStreak: duo.lastBrokenStreak,
    totalActiveDays: duo.totalActiveDays,
    weekDays: duo.weekDays,
    nextMilestone: duo.nextMilestone,
    daysToNextFreeze: duo.daysToNextFreeze,
    nextGoldProgress
  };
}

/**
 * Recommends the next unread pillar & item to complete the user's nightly quartet
 * ("One Clear Next Action" habit loop).
 */
export function getNextRecommendedPillar(allItemsByCategory, completedItems = {}) {
  const order = [
    { key: 'poem', label: 'Poem' },
    { key: 'story', label: 'Short Story' },
    { key: 'essay', label: 'Essay' },
    { key: 'personal', label: 'Korea & SF' }
  ];

  // First prioritize a category where the user has 0 completed items tonight
  for (const cat of order) {
    const items = allItemsByCategory[cat.key] || [];
    const doneInCat = items.some((i) => completedItems[i.id]?.completed);
    if (!doneInCat) {
      const nextUnread = items.find((i) => !completedItems[i.id]?.completed);
      if (nextUnread) {
        return {
          categoryKey: cat.key,
          categoryLabel: cat.label,
          item: nextUnread
        };
      }
    }
  }

  // Otherwise return the first unread item across any category
  for (const cat of order) {
    const items = allItemsByCategory[cat.key] || [];
    const nextUnread = items.find((i) => !completedItems[i.id]?.completed);
    if (nextUnread) {
      return {
        categoryKey: cat.key,
        categoryLabel: cat.label,
        item: nextUnread
      };
    }
  }

  return null;
}

/**
 * Canonical 20-Minute Audio Rule for Personal (Korea & San Francisco) Stories.
 * At the standard literary audiobook narration pace of 150 WPM, ~20 minutes of audio
 * requires ~3,000 total narrated words (2,750–3,300 words across body + 5-paragraph analysis).
 */
export const PERSONAL_STORY_AUDIO_RULE = {
  targetAudioMinutes: 20,
  minAudioMinutes: 18,
  maxAudioMinutes: 23,
  speakingRateWpm: 150,
  minBodyWords: 2100,
  minTotalWords: 2750
};

export function computeStoryAudioMetrics(item) {
  if (!item) {
    return { bodyWords: 0, analysisWords: 0, totalWords: 0, estimatedAudioMinutes: 0 };
  }
  const bodyStr = Array.isArray(item.paragraphs)
    ? item.paragraphs.join(' ')
    : Array.isArray(item.fullText)
    ? item.fullText.join(' ')
    : String(item.fullText || '');
  const bodyWords = bodyStr.trim() ? bodyStr.trim().split(/\s+/).length : 0;

  const analysisStr = Array.isArray(item.analysis)
    ? item.analysis.map((sec) => `${sec.heading || ''} ${sec.paragraph || ''}`).join(' ')
    : '';
  const analysisWords = analysisStr.trim() ? analysisStr.trim().split(/\s+/).length : 0;

  const totalWords = bodyWords + analysisWords;
  const estimatedAudioMinutes = Math.round(
    totalWords / PERSONAL_STORY_AUDIO_RULE.speakingRateWpm
  );

  return {
    bodyWords,
    analysisWords,
    totalWords,
    estimatedAudioMinutes
  };
}

/**
 * Marks a reading item as completed (e.g., when sent to ElevenReader or explicitly checked off).
 */
export function markItemCompletedState(
  completedItems = {},
  item,
  source = 'elevenreader',
  timestamp = new Date().toISOString()
) {
  if (!item || !item.id) return completedItems;
  return {
    ...completedItems,
    [item.id]: {
      completed: true,
      completedAt: completedItems[item.id]?.completedAt || timestamp,
      completedVia: source,
      categoryKey: item.categoryKey,
      updatedAt: timestamp
    }
  };
}

function computeDaySeed(dateKey) {
  const str = dateKey || new Date().toISOString().slice(0, 10);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Deals one curated unread work from each of the 4 pillars for Tonight's Quartet.
 * Supports either a global numeric shuffleOffset or per-category offsets { poem, story, essay, personal }.
 */
export function dealTonightQuartet(
  allItemsByCategory,
  completedItems = {},
  shuffleOffsets = 0,
  dateKey = null
) {
  const daySeed = computeDaySeed(dateKey);
  const recommended = getNextRecommendedPillar(allItemsByCategory, completedItems);

  return MAIN_CATEGORIES.map((cat, catIdx) => {
    const allInCat = allItemsByCategory[cat.key] || [];
    const unread = allInCat.filter((i) => !completedItems[i.id]?.completed);
    const pool = unread.length > 0 ? unread : allInCat;
    const catOffset =
      typeof shuffleOffsets === 'number'
        ? shuffleOffsets
        : Number(shuffleOffsets?.[cat.key] || 0);

    const pickIdx =
      pool.length > 0 ? (daySeed + catIdx * 17 + catOffset) % pool.length : 0;
    const item = pool[pickIdx] || null;

    return {
      categoryKey: cat.key,
      categoryLabel: cat.label,
      shortLabel: cat.shortLabel,
      typicalDuration: cat.typicalDuration,
      unreadRemaining: unread.length,
      allCompletedInPillar: unread.length === 0 && allInCat.length > 0,
      isRecommendedNext: recommended?.categoryKey === cat.key,
      item
    };
  }).filter((entry) => entry.item);
}

/**
 * Picks a single unread work for 1-tap "Surprise Me" reading.
 */
export function pickSurpriseItem(
  allItemsByCategory,
  completedItems = {},
  { categoryKey = null, subcategory = 'All', randomValue = Math.random() } = {}
) {
  let pool = [];
  if (categoryKey) {
    const { unreadItems } = filterAndPartitionItems(
      allItemsByCategory,
      categoryKey,
      subcategory,
      completedItems
    );
    pool = unreadItems.length > 0 ? unreadItems : allItemsByCategory[categoryKey] || [];
  } else {
    for (const cat of MAIN_CATEGORIES) {
      const items = allItemsByCategory[cat.key] || [];
      pool.push(...items.filter((i) => !completedItems[i.id]?.completed));
    }
    if (pool.length === 0) {
      for (const cat of MAIN_CATEGORIES) {
        pool.push(...(allItemsByCategory[cat.key] || []));
      }
    }
  }
  if (pool.length === 0) return null;
  const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(randomValue * pool.length)));
  return pool[idx];
}

/**
 * Normalizes text for resilient literary title/author search
 * (strips diacritics, unifies curly apostrophes/quotes & punctuation, collapses spaces).
 */
export function normalizeSearchText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u02bc`]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function stripLeadingArticle(normTitle) {
  return normTitle.replace(/^(the|a|an)\s+/, '');
}

/**
 * Title-first search across all 400 works in the Bradbury 1000 catalog.
 * Prioritizes exact title matches, title prefixes, word-boundary title matches,
 * and title substrings before falling back to multi-token title + author/place/genre matches.
 */
export function searchCatalog(
  allItemsByCategory,
  query = '',
  { categoryKey = 'all', completedItems = {}, limit = 40 } = {}
) {
  const flatItems = [];
  const totalCounts = { all: 0, poem: 0, story: 0, essay: 0, personal: 0 };

  for (const cat of MAIN_CATEGORIES) {
    const list = allItemsByCategory?.[cat.key] || [];
    totalCounts[cat.key] = list.length;
    totalCounts.all += list.length;
    for (const item of list) {
      flatItems.push(item);
    }
  }

  const normQuery = normalizeSearchText(query);

  // Empty query: return a calm, balanced quick-pick preview (unread first)
  if (!normQuery) {
    const preview = [];
    if (categoryKey && categoryKey !== 'all') {
      const catList = allItemsByCategory?.[categoryKey] || [];
      const unread = catList.filter((i) => !completedItems[i.id]?.completed);
      const source = unread.length > 0 ? unread : catList;
      preview.push(...source.slice(0, 8));
    } else {
      for (let round = 0; round < 2; round++) {
        for (const cat of MAIN_CATEGORIES) {
          const catList = allItemsByCategory?.[cat.key] || [];
          const unread = catList.filter((i) => !completedItems[i.id]?.completed);
          const source = unread.length > 0 ? unread : catList;
          if (source[round]) preview.push(source[round]);
        }
      }
    }
    return {
      isQueryEmpty: true,
      query: '',
      results: preview,
      totalMatches:
        categoryKey && categoryKey !== 'all'
          ? totalCounts[categoryKey] || 0
          : totalCounts.all,
      totalAllCategories: totalCounts.all,
      countsByCategory: totalCounts
    };
  }

  const queryNoArticle = stripLeadingArticle(normQuery);
  const tokens = normQuery.split(' ').filter(Boolean);
  const countsByCategory = { all: 0, poem: 0, story: 0, essay: 0, personal: 0 };
  const scored = [];

  for (let idx = 0; idx < flatItems.length; idx++) {
    const item = flatItems[idx];
    const normTitle = normalizeSearchText(item.title);
    const normTitleNoArticle = stripLeadingArticle(normTitle);
    const normAuthor = normalizeSearchText(item.author || item.region || item.regionGroup || '');
    const normGenre = normalizeSearchText(
      `${item.subcategory || ''} ${item.genre || ''} ${item.category || ''} ${item.slotLabel || ''}`
    );

    let score = 0;

    if (
      normTitle === normQuery ||
      (queryNoArticle.length >= 2 && normTitleNoArticle === queryNoArticle)
    ) {
      score = 1000;
    } else if (
      normTitle.startsWith(normQuery) ||
      (queryNoArticle.length >= 2 && normTitleNoArticle.startsWith(queryNoArticle))
    ) {
      score = 860;
    } else if (` ${normTitle}`.includes(` ${normQuery}`)) {
      score = 750;
    } else if (normTitle.includes(normQuery)) {
      score = 620;
    } else if (tokens.length > 1 && tokens.every((t) => normTitle.includes(t))) {
      score = 540;
    } else {
      const combined = `${normTitle} ${normAuthor} ${normGenre}`;
      if (tokens.every((t) => combined.includes(t))) {
        const titleTokenHits = tokens.filter((t) => normTitle.includes(t)).length;
        const authorHit = normAuthor.includes(normQuery) || tokens.some((t) => normAuthor.includes(t));
        score = 260 + titleTokenHits * 95 + (authorHit ? 80 : 0);
      }
    }

    if (score > 0) {
      const isCompleted = Boolean(completedItems[item.id]?.completed);
      // Slight tie-breaker boost for unread works and tighter title lengths
      const adjustedScore =
        score + (isCompleted ? 0 : 4) - Math.min(25, Math.floor(normTitle.length * 0.25));

      countsByCategory.all += 1;
      if (countsByCategory[item.categoryKey] !== undefined) {
        countsByCategory[item.categoryKey] += 1;
      }

      scored.push({
        item,
        score: adjustedScore,
        idx
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  const filtered =
    categoryKey && categoryKey !== 'all'
      ? scored.filter((entry) => entry.item.categoryKey === categoryKey)
      : scored;

  return {
    isQueryEmpty: false,
    query: normQuery,
    results: filtered.slice(0, limit).map((entry) => entry.item),
    totalMatches: filtered.length,
    totalAllCategories: scored.length,
    countsByCategory
  };
}

