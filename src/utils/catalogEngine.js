/**
 * Pure functions for normalizing the Bradbury 1000 reading catalog,
 * computing genre subcategories with counts, filtering unread vs. completed items,
 * and calculating 2-tier Duolingo streak statistics.
 */

export const MAIN_CATEGORIES = [
  {
    key: 'poem',
    label: 'Poem',
    shortLabel: 'Poems',
    subtitle: 'Verbatim Verse + 5-Para Analysis'
  },
  {
    key: 'story',
    label: 'Short Story',
    shortLabel: 'Stories',
    subtitle: 'Canonical Fiction + 5-Para Analysis'
  },
  {
    key: 'essay',
    label: 'Essay',
    shortLabel: 'Essays',
    subtitle: 'Classical Essays + 5-Para Commentary'
  },
  {
    key: 'personal',
    label: 'Personal (Korea & SF)',
    shortLabel: 'Korea & SF',
    subtitle: 'Korea & SF Lore + Primary Sources'
  }
];

export function buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces) {
  const poems = (poemsAndEssays?.poems || []).map((p, idx) => ({
    ...p,
    categoryKey: 'poem',
    slotLabel: 'Poem',
    nightNumber: p.night || idx + 1,
    staticUrl: `/read/day-${p.night || ((idx % 10) + 1)}/poem`,
    subcategory: p.genre || p.era || 'Lyric Poetry'
  }));

  const stories = (storiesAndPlaces?.stories || []).map((s, idx) => ({
    ...s,
    categoryKey: 'story',
    slotLabel: 'Short Story',
    nightNumber: s.night || idx + 1,
    staticUrl: `/read/day-${s.night || ((idx % 10) + 1)}/story`,
    subcategory: s.genre || s.era || 'Literary Fiction'
  }));

  const essays = (poemsAndEssays?.essays || []).map((e, idx) => ({
    ...e,
    categoryKey: 'essay',
    slotLabel: 'Essay',
    nightNumber: e.night || idx + 1,
    staticUrl: `/read/day-${e.night || ((idx % 10) + 1)}/essay`,
    subcategory: e.genre || e.era || 'Classical Essay'
  }));

  const korea = (storiesAndPlaces?.koreaStories || []).map((k, idx) => ({
    ...k,
    categoryKey: 'personal',
    slotLabel: 'Korea Deep-Dive',
    nightNumber: k.night || idx + 1,
    staticUrl: `/read/day-${k.night || idx + 1}/korea`,
    subcategory: `Korea • ${k.category || 'History & Culture'}`,
    regionGroup: 'Korea'
  }));

  const sf = (storiesAndPlaces?.sfStories || []).map((s, idx) => ({
    ...s,
    categoryKey: 'personal',
    slotLabel: 'San Francisco Deep-Dive',
    nightNumber: s.night || idx + 1,
    staticUrl: `/read/day-${s.night || idx + 1}/sf`,
    subcategory: `San Francisco • ${s.category || 'History & Culture'}`,
    regionGroup: 'San Francisco'
  }));

  // Interleave Korea and SF 1..10 equally
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

export function getSubcategoriesForCategory(allItemsByCategory, selectedCategory) {
  const items = allItemsByCategory[selectedCategory] || [];
  if (selectedCategory === 'personal') {
    const koreaCount = items.filter((i) => i.region === 'Korea').length;
    const sfCount = items.filter((i) => i.region === 'San Francisco').length;
    const list = [
      { id: 'All', label: 'All', count: items.length },
      { id: 'Korea', label: '🇰🇷 Korea', count: koreaCount },
      { id: 'San Francisco', label: '🌉 San Francisco', count: sfCount }
    ];
    const seen = new Set(['All', 'Korea', 'San Francisco']);
    items.forEach((item) => {
      if (item.category && !seen.has(item.category)) {
        seen.add(item.category);
        const count = items.filter((x) => x.category === item.category).length;
        list.push({ id: item.category, label: item.category, count });
      }
    });
    return list;
  }

  const list = [{ id: 'All', label: 'All Genres', count: items.length }];
  const seen = new Set(['All']);
  items.forEach((item) => {
    if (item.genre && !seen.has(item.genre)) {
      seen.add(item.genre);
      const count = items.filter((x) => x.genre === item.genre).length;
      list.push({ id: item.genre, label: item.genre, count });
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
      return item.category === selectedSubcategory;
    }
    return item.genre === selectedSubcategory;
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

export function computeStreakStats(allItemsByCategory, completedItems = {}, externalLogs = []) {
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

  const goldNights = Math.floor(totalCompleted / 3);
  const freezeTokens = Math.min(2, 1 + Math.floor(goldNights / 7));
  const litFlameStreak = totalCompleted > 0 ? Math.max(1, totalCompleted) : 1;
  const nextGoldProgress = totalCompleted % 3;

  return {
    poemsDone,
    storiesDone,
    essaysDone,
    personalDone,
    totalCompleted,
    categoriesTouched,
    goldNights,
    freezeTokens,
    maxFreezeTokens: 2,
    litFlameStreak,
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

