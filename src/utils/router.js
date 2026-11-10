/**
 * Tiny History-API router for the Bradbury 1000 PWA.
 *
 * URL scheme:
 *   /                      → menu (default category)
 *   /poems | /stories | /essays | /personal          → menu for that category
 *   /poems/poem-12 | /stories/story-3 | /personal/korea-4 ... → that work's own page
 * Legacy links (?category=poem, #/read/day-N/slot) are still understood.
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

export function categoryPath(categoryKey) {
  return `/${CATEGORY_SLUGS[categoryKey] || CATEGORY_SLUGS[DEFAULT_CATEGORY]}`;
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
 * Turn a location into { categoryKey, item }. `item` is null on menu routes.
 * `canonical` is the path the app should show for this location (used to
 * replace legacy URLs).
 */
export function parseLocation({ pathname = '/', search = '', hash = '' }, catalog) {
  const legacy = hash.match(/#\/?read\/day-(\d+)\/([a-z]+)/i) || pathname.match(/^\/read\/day-(\d+)\/([a-z]+)/i);
  if (legacy) {
    const item = findLegacyReadItem(catalog, legacy[1], legacy[2]);
    if (item) return { categoryKey: item.categoryKey, item, canonical: itemPath(item) };
  }

  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const categoryKey = SLUG_TO_CATEGORY[parts[0]];

  if (categoryKey) {
    if (parts[1]) {
      const item = (catalog[categoryKey] || []).find((x) => x.id === parts[1]);
      if (item) return { categoryKey, item, canonical: itemPath(item) };
    }
    return { categoryKey, item: null, canonical: categoryPath(categoryKey) };
  }

  const queryCat = new URLSearchParams(search).get('category');
  const fallback = CATEGORY_SLUGS[queryCat] ? queryCat : DEFAULT_CATEGORY;
  return { categoryKey: fallback, item: null, canonical: pathname === '/' && !queryCat ? '/' : categoryPath(fallback) };
}
