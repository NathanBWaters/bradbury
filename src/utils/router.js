/**
 * History-API router for the Bradbury 1000 multi-page reading funnel.
 *
 * URL scheme:
 *   /                                      → Home: Choose Your Adventure (Auto 1-of-4 vs. Type + Genre)
 *   /tonight                               → Automatic Mode: Tonight's 4 Curated Picks
 *   /choose                                → Custom Step 1: Choose a Literary Type
 *   /choose/poems | /choose/stories ...    → Custom Step 2: Choose a Genre or Place
 *   /poems | /stories?genre=...            → Focused Shelf for that Type (+ optional Genre)
 *   /poems/poem-12 | /personal/korea-4 ... → Distraction-Free Reader View for that work
 *   /journal                               → Reading Ledger, Streaks & Completed Archive
 *
 * Legacy links (?category=poem, #/read/day-N/slot) are still understood and upgraded.
 */

export const CATEGORY_SLUGS = {
  poem: 'poems',
  story: 'stories',
  essay: 'essays',
  personal: 'personal'
};

const SLUG_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([k, v]) => [v, k])
);

export const DEFAULT_CATEGORY = 'story';

export function homePath() {
  return '/';
}

export function tonightPath() {
  return '/tonight';
}

export function chooseTypePath() {
  return '/choose';
}

export function chooseGenrePath(categoryKey) {
  return `/choose/${CATEGORY_SLUGS[categoryKey] || CATEGORY_SLUGS[DEFAULT_CATEGORY]}`;
}

export function journalPath() {
  return '/journal';
}

export function categoryPath(categoryKey) {
  return `/${CATEGORY_SLUGS[categoryKey] || CATEGORY_SLUGS[DEFAULT_CATEGORY]}`;
}

export function shelfPath(categoryKey, subcategory = 'All') {
  const base = categoryPath(categoryKey);
  if (!subcategory || subcategory === 'All') return base;
  return `${base}?genre=${encodeURIComponent(subcategory)}`;
}

export function itemPath(item) {
  return `${categoryPath(item.categoryKey)}/${encodeURIComponent(item.id)}`;
}

function findLegacyReadItem(catalog, nightStr, slotKey) {
  const night = Math.max(1, Math.min(100, parseInt(nightStr, 10) || 1));
  const slot = slotKey.toLowerCase();
  if (slot === 'korea' || slot === 'sf') {
    const region = slot === 'korea' ? 'Korea' : 'San Francisco';
    return (catalog.personal || []).find((x) => x.region === region && x.nightNumber === night);
  }
  return (catalog[slot] || []).find((x) => x.nightNumber === night) || null;
}

/**
 * Turn a location into { view, categoryKey, subcategory, item, canonical }.
 * Views: 'home' | 'tonight' | 'choose-type' | 'choose-genre' | 'shelf' | 'reader' | 'journal'
 */
export function parseLocation({ pathname = '/', search = '', hash = '' }, catalog) {
  const legacy =
    hash.match(/#\/?read\/day-(\d+)\/([a-z]+)/i) ||
    pathname.match(/^\/read\/day-(\d+)\/([a-z]+)/i);
  if (legacy) {
    const item = findLegacyReadItem(catalog, legacy[1], legacy[2]);
    if (item) {
      return {
        view: 'reader',
        categoryKey: item.categoryKey,
        subcategory: 'All',
        item,
        canonical: itemPath(item)
      };
    }
  }

  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(search);

  if (parts[0] === 'tonight' || parts[0] === 'quartet') {
    return {
      view: 'tonight',
      categoryKey: DEFAULT_CATEGORY,
      subcategory: 'All',
      item: null,
      canonical: tonightPath()
    };
  }

  if (parts[0] === 'journal' || parts[0] === 'progress') {
    return {
      view: 'journal',
      categoryKey: DEFAULT_CATEGORY,
      subcategory: 'All',
      item: null,
      canonical: journalPath()
    };
  }

  if (parts[0] === 'choose') {
    const targetCat = SLUG_TO_CATEGORY[parts[1]];
    if (targetCat) {
      return {
        view: 'choose-genre',
        categoryKey: targetCat,
        subcategory: 'All',
        item: null,
        canonical: chooseGenrePath(targetCat)
      };
    }
    return {
      view: 'choose-type',
      categoryKey: DEFAULT_CATEGORY,
      subcategory: 'All',
      item: null,
      canonical: chooseTypePath()
    };
  }

  const categoryKey = SLUG_TO_CATEGORY[parts[0]];
  if (categoryKey) {
    if (parts[1]) {
      const item = (catalog[categoryKey] || []).find((x) => x.id === parts[1]);
      if (item) {
        return {
          view: 'reader',
          categoryKey,
          subcategory: 'All',
          item,
          canonical: itemPath(item)
        };
      }
    }
    const genreParam = params.get('genre') || 'All';
    return {
      view: 'shelf',
      categoryKey,
      subcategory: genreParam,
      item: null,
      canonical: shelfPath(categoryKey, genreParam)
    };
  }

  const queryCat = params.get('category');
  if (CATEGORY_SLUGS[queryCat]) {
    return {
      view: 'shelf',
      categoryKey: queryCat,
      subcategory: 'All',
      item: null,
      canonical: categoryPath(queryCat)
    };
  }

  return {
    view: 'home',
    categoryKey: DEFAULT_CATEGORY,
    subcategory: 'All',
    item: null,
    canonical: homePath()
  };
}

