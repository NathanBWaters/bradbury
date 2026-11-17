import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const seriesDir = path.join(rootDir, 'src/data/series');
const storiesPlacesPath = path.join(rootDir, 'src/data/storiesAndPlaces.json');
const narrativeSeriesOutPath = path.join(rootDir, 'src/data/narrativeSeries.json');

const SERIES_SORT_ORDER = ['korean-presidents', 'us-presidents', 'modern-korea-epics'];

function countWords(text = '') {
  const clean = String(text || '').trim();
  return clean ? clean.split(/\s+/).length : 0;
}

function syncCounts(item) {
  const paragraphs = Array.isArray(item.paragraphs) ? item.paragraphs : [];
  const analysis = Array.isArray(item.analysis) ? item.analysis : [];
  const bodyWords = paragraphs.reduce((sum, p) => sum + countWords(p), 0);
  const analysisWords = analysis.reduce(
    (sum, sec) => sum + countWords(sec?.heading) + countWords(sec?.paragraph),
    0
  );
  const totalWords = bodyWords + analysisWords;
  const expectedMinutes = Math.max(6, Math.round(totalWords / 150));

  const changed =
    item.bodyWords !== bodyWords ||
    item.analysisWords !== analysisWords ||
    item.totalWords !== totalWords ||
    item.wordCount !== totalWords ||
    item.readingTimeMinutes !== expectedMinutes ||
    item.audioDurationMinutes !== expectedMinutes;

  item.bodyWords = bodyWords;
  item.analysisWords = analysisWords;
  item.totalWords = totalWords;
  item.wordCount = totalWords;
  item.readingTimeMinutes = expectedMinutes;
  item.audioDurationMinutes = expectedMinutes;

  return { item, changed };
}

const files = fs
  .readdirSync(seriesDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

const items = [];
let korea50Item = null;
let syncedCount = 0;

for (const file of files) {
  const fullPath = path.join(seriesDir, file);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const { item, changed } = syncCounts(raw);
  if (changed) {
    fs.writeFileSync(fullPath, JSON.stringify(item, null, 2) + '\n', 'utf8');
    syncedCount++;
  }
  if (item.id === 'korea-50') {
    korea50Item = {
      ...item,
      night: 50,
      region: 'Korea',
      seriesId: 'modern-korea-epics',
      seriesTitle: 'Series: Modern Korea Deep-Dives',
      seriesOrder: 2
    };
    if (
      item.night !== 50 ||
      item.seriesId !== 'modern-korea-epics' ||
      item.seriesOrder !== 2
    ) {
      fs.writeFileSync(fullPath, JSON.stringify(korea50Item, null, 2) + '\n', 'utf8');
    }
  } else {
    items.push(item);
  }
}

if (!korea50Item) {
  throw new Error('Missing src/data/series/korea-50.json');
}

const sp = JSON.parse(fs.readFileSync(storiesPlacesPath, 'utf8'));
const k50Idx = (sp.koreaStories || []).findIndex((s) => s.id === 'korea-50');
if (k50Idx < 0) {
  throw new Error('Could not find korea-50 inside src/data/storiesAndPlaces.json');
}
sp.koreaStories[k50Idx] = korea50Item;
fs.writeFileSync(storiesPlacesPath, JSON.stringify(sp, null, 2) + '\n', 'utf8');

items.sort((a, b) => {
  const sA = SERIES_SORT_ORDER.indexOf(a.seriesId || '');
  const sB = SERIES_SORT_ORDER.indexOf(b.seriesId || '');
  if (sA !== sB) return (sA === -1 ? 99 : sA) - (sB === -1 ? 99 : sB);
  return (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999);
});

fs.writeFileSync(
  narrativeSeriesOutPath,
  JSON.stringify({ items }, null, 2) + '\n',
  'utf8'
);

console.log(
  `Synced korea-50 into storiesAndPlaces.json and compiled ${items.length} standalone series episodes into src/data/narrativeSeries.json (recomputed metadata on ${syncedCount} files).`
);
