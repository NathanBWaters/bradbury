import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAIN_CATEGORIES,
  PERSONAL_STORY_AUDIO_RULE,
  buildNormalizedCatalog,
  getSubcategoriesForCategory,
  filterAndPartitionItems,
  computeStreakStats,
  getNextRecommendedPillar,
  dealTonightQuartet,
  pickSurpriseItem,
  computeStoryAudioMetrics,
  markItemCompletedState,
  normalizeSearchText,
  searchCatalog
} from '../../src/utils/catalogEngine.js';
import { formatFullPlainTextForElevenReader } from '../../src/utils/plainTextFormatter.js';
import { buildEpubBlob } from '../../src/utils/epubGenerator.js';
import {
  parseLocation,
  itemPath,
  categoryPath,
  tonightPath,
  chooseTypePath,
  chooseGenrePath,
  shelfPath,
  journalPath
} from '../../src/utils/router.js';

const LITERARY_ANALYSIS_HEADINGS = [
  'I. What It Really Means',
  'II. How Well It Works: A Critique',
  'III. The Impact It Had',
  'IV. What Readers Loved',
  'V. What Critics Pushed Back On',
  'VI. Its Place in the Bigger Picture'
];
import {
  DEFAULT_USER_STATE,
  evaluateNightStatus,
  recomputeStreakSummary,
  computeDuolingoStreak,
  addDaysToDateKey
} from '../../src/utils/streakEngine.js';
import {
  playStoryCompleteSound,
  playStreakExtendedSound,
  playGoldNightSound,
  playMascotChirpSound
} from '../../src/utils/soundEffects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const poemsAndEssays = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/data/poemsAndEssays.json'), 'utf8')
);
const storiesAndPlaces = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/data/storiesAndPlaces.json'), 'utf8')
);

describe('Bradbury 1000 — Catalog Engine & Subcategory Partitioning', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);

  it('normalizes all 400 literary & personal works across the 4 pillars (100 each)', () => {
    assert.equal(catalog.poem.length, 100, 'Should have 100 poems');
    assert.equal(catalog.story.length, 100, 'Should have 100 short stories');
    assert.equal(catalog.essay.length, 100, 'Should have 100 essays');
    assert.equal(catalog.personal.length, 100, 'Should have 100 personal essays (50 Korea + 50 SF)');
    const total =
      catalog.poem.length +
      catalog.story.length +
      catalog.essay.length +
      catalog.personal.length;
    assert.equal(total, 400, 'Total catalog should contain 400 works');
  });

  it('extracts genre subcategories with All first and item counts for each category', () => {
    for (const cat of MAIN_CATEGORIES) {
      const subcats = getSubcategoriesForCategory(catalog, cat.key);
      assert.equal(subcats[0].id, 'All', `First subcategory for ${cat.key} must have id All`);
      assert.equal(
        subcats[0].count,
        catalog[cat.key].length,
        `All chip count for ${cat.key} must equal category length`
      );
      assert.ok(subcats.length >= 4, `${cat.key} should have at least 3 distinct genres plus All`);
    }
  });

  it('partitions unread items at the top and completed items at the bottom', () => {
    const firstTwoStoryIds = [catalog.story[0].id, catalog.story[2].id];
    const completedMap = {
      [firstTwoStoryIds[0]]: { completed: true },
      [firstTwoStoryIds[1]]: { completed: true }
    };
    const partitioned = filterAndPartitionItems(catalog, 'story', 'All', completedMap);

    assert.equal(partitioned.unreadItems.length, 98);
    assert.equal(partitioned.completedCategoryItems.length, 2);
    assert.deepEqual(
      partitioned.completedCategoryItems.map((i) => i.id),
      firstTwoStoryIds
    );
    assert.ok(
      partitioned.unreadItems.every((i) => !firstTwoStoryIds.includes(i.id)),
      'No completed item may appear in the unread list'
    );
  });

  it('filters by specific genre subcategory while preserving unread/completed split', () => {
    const targetGenre = catalog.story[0].genre;
    const completedMap = { [catalog.story[0].id]: { completed: true } };
    const filtered = filterAndPartitionItems(catalog, 'story', targetGenre, completedMap);

    assert.ok(filtered.unreadItems.every((item) => item.genre === targetGenre));
    assert.equal(filtered.completedCategoryItems.length, 1);
    assert.equal(filtered.completedCategoryItems[0].id, catalog.story[0].id);
  });

  it('computes accurate 2-tier streak stats and next recommended pillar', () => {
    const now = new Date(2026, 10, 10, 21, 0, 0);
    const iso = now.toISOString();
    const completedMap = {
      [catalog.story[0].id]: { completed: true, completedAt: iso },
      [catalog.poem[0].id]: { completed: true, completedAt: iso },
      [catalog.essay[0].id]: { completed: true, completedAt: iso }
    };
    const stats = computeStreakStats(catalog, completedMap, [], { now });
    assert.equal(stats.totalCompleted, 3);
    assert.equal(stats.currentStreak, 1, '3 reads on the same day equal a 1-day Duolingo streak');
    assert.equal(stats.completedToday, true);
    assert.equal(stats.todayCount, 3);
    assert.equal(stats.todayGoldUnlocked, true);
    assert.equal(stats.goldNights, 1);
    assert.equal(stats.categoriesTouched, 3);
    assert.equal(stats.freezeTokens, 1);

    // Since poem, story, essay each have 1 completed item, personal is the untouched pillar
    const nextRec = getNextRecommendedPillar(catalog, completedMap);
    assert.ok(nextRec);
    assert.equal(nextRec.categoryKey, 'personal');
  });

  it('normalizes essay genres cleanly without 1-item singleton noise and organizes personal works by place + 5 themes', () => {
    const essaySubcats = getSubcategoriesForCategory(catalog, 'essay');
    assert.equal(essaySubcats[0].id, 'All');
    assert.equal(essaySubcats.length, 7, 'Essays should have All + 6 cohesive genres');
    assert.ok(
      essaySubcats.slice(1).every((s) => s.count >= 5),
      'Every normalized essay genre should contain multiple essays'
    );

    const personalSubcats = getSubcategoriesForCategory(catalog, 'personal');
    assert.equal(personalSubcats[0].id, 'All');
    assert.equal(personalSubcats[1].id, 'Korea');
    assert.equal(personalSubcats[1].count, 50);
    assert.equal(personalSubcats[2].id, 'San Francisco');
    assert.equal(personalSubcats[2].count, 50);
    assert.equal(personalSubcats.length, 8, 'Personal should have All + 2 places + 5 cross-Pacific themes');

    const themePartition = filterAndPartitionItems(
      catalog,
      'personal',
      'Architecture & Urban Design',
      {}
    );
    assert.ok(themePartition.unreadItems.length >= 10);
  });

  it('deals 4 curated unread works across the 4 pillars and rotates picks on shuffle', () => {
    const completedMap = {
      [catalog.poem[0].id]: { completed: true }
    };
    const dealA = dealTonightQuartet(catalog, completedMap, 0);
    const dealB = dealTonightQuartet(catalog, completedMap, 1);

    assert.equal(dealA.length, 4);
    assert.deepEqual(
      dealA.map((e) => e.categoryKey),
      ['poem', 'story', 'essay', 'personal']
    );
    assert.notEqual(dealA[0].item.id, catalog.poem[0].id, 'Completed poem must be skipped');
    assert.ok(
      dealA.some((entry, idx) => entry.item.id !== dealB[idx].item.id),
      'Shuffling seed should deal fresh picks'
    );

    const surprise = pickSurpriseItem(catalog, completedMap, {
      categoryKey: 'story',
      seed: 3
    });
    assert.equal(surprise.categoryKey, 'story');
  });
});

describe('Bradbury 1000 — ElevenReader Plain-Text Share Formatter', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);

  it('formats full unabridged literary text + 5-paragraph analysis for ElevenReader', () => {
    const story = catalog.story[0];
    const formatted = formatFullPlainTextForElevenReader(story);

    assert.ok(formatted.includes(story.title), 'Formatted share text must include title');
    assert.ok(formatted.includes(story.author), 'Formatted share text must include author');
    assert.ok(
      formatted.includes('Literary and Historical Analysis'),
      'Formatted share text must include the analysis section header'
    );
    for (const sec of story.analysis) {
      assert.ok(formatted.includes(sec.heading), 'All analysis headings must be included');
      assert.ok(
        formatted.includes(sec.paragraph.slice(0, 60)),
        'All analysis paragraphs must be included'
      );
    }
  });

  it('includes Primary & Historical Sources for Korea & San Francisco personal dispatches', () => {
    const personalItem = catalog.personal[0];
    const formatted = formatFullPlainTextForElevenReader(personalItem);

    assert.ok(
      formatted.includes('Primary and Historical Sources:'),
      'Personal dispatches must include historical sources in ElevenReader share text'
    );
    assert.ok(formatted.includes(personalItem.sources[0].title));
  });

  it('returns empty string safely on null or undefined item', () => {
    assert.equal(formatFullPlainTextForElevenReader(null), '');
    assert.equal(formatFullPlainTextForElevenReader(undefined), '');
  });

  it('automatically marks an item as completed when sent to ElevenReader and moves it to Completed', () => {
    const targetItem = catalog.personal[0];
    const updatedCompleted = markItemCompletedState({}, targetItem, 'elevenreader');
    assert.equal(updatedCompleted[targetItem.id]?.completed, true);
    assert.equal(updatedCompleted[targetItem.id]?.completedVia, 'elevenreader');

    const partitioned = filterAndPartitionItems(
      catalog,
      'personal',
      'All',
      updatedCompleted
    );
    assert.equal(partitioned.completedCategoryItems.length, 1);
    assert.equal(partitioned.completedCategoryItems[0].id, targetItem.id);
    assert.equal(partitioned.unreadItems.length, 99);
  });
});

describe('Bradbury 1000 — Spec-Compliant Pure-JS EPUB 2/3 Generator', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);

  it('generates a valid EPUB ZIP Blob with uncompressed mimetype first', async () => {
    const sample = catalog.poem[0];
    const epubBlob = buildEpubBlob({
      title: sample.title,
      subtitle: 'Poem Edition',
      author: sample.author,
      uid: 'bradbury-test-poem-1',
      chapters: [{ item: sample, slotLabel: 'Poem' }],
      includeAnalysis: true
    });

    assert.equal(epubBlob.type, 'application/epub+zip');
    const epubBytes = new Uint8Array(await epubBlob.arrayBuffer());
    assert.ok(epubBytes.byteLength > 2000, 'Generated EPUB should be > 2KB');

    // Verify PK\x03\x04 local file header magic bytes
    assert.equal(epubBytes[0], 0x50); // 'P'
    assert.equal(epubBytes[1], 0x4b); // 'K'
    assert.equal(epubBytes[2], 0x03);
    assert.equal(epubBytes[3], 0x04);

    // Decode ASCII subset to verify required EPUB structure entries
    const asciiText = new TextDecoder('utf-8', { fatal: false }).decode(epubBytes);
    assert.ok(
      asciiText.includes('mimetypeapplication/epub+zip'),
      'Must start with uncompressed mimetype'
    );
    assert.ok(asciiText.includes('META-INF/container.xml'));
    assert.ok(asciiText.includes('OEBPS/content.opf'));
    assert.ok(asciiText.includes('OEBPS/toc.ncx'));
    assert.ok(asciiText.includes('OEBPS/chapter_1.xhtml'));
    assert.ok(asciiText.includes('Key Context &amp; Why It Matters'));
    assert.ok(asciiText.includes('Literary &amp; Historical Analysis'));
  });
});

describe('Bradbury 1000 — Authentic Duolingo Calendar-Day Streak Engine & Sound Synthesizer', () => {
  const localIsoForKey = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d, 20, 30, 0).toISOString();
  };

  it('starts at 0 (unstarted) with zero completions rather than a fake 1', () => {
    const s = computeDuolingoStreak({}, [], { now: new Date(2026, 10, 10, 21, 0, 0) });
    assert.equal(s.currentStreak, 0);
    assert.equal(s.longestStreak, 0);
    assert.equal(s.completedToday, false);
    assert.equal(s.streakState, 'unstarted');
    assert.equal(s.freezeTokens, 1);
    assert.equal(s.weekDays.length, 7);
    assert.ok(s.weekDays.every((d) => d.status === 'empty'));
  });

  it('counts multiple completions on the same day as a 1-day streak while unlocking Gold Night at 3 reads', () => {
    const todayKey = '2026-11-10';
    const now = new Date(2026, 10, 10, 22, 0, 0);
    const completed = {
      'poem-1': { completed: true, completedAt: localIsoForKey(todayKey) },
      'story-1': { completed: true, completedAt: localIsoForKey(todayKey) },
      'essay-1': { completed: true, completedAt: localIsoForKey(todayKey) },
      'personal-1': { completed: true, completedAt: localIsoForKey(todayKey) }
    };
    const s = computeDuolingoStreak(completed, [], { now });
    assert.equal(s.currentStreak, 1, '4 reads on Day 1 must keep currentStreak === 1');
    assert.equal(s.completedToday, true);
    assert.equal(s.todayCount, 4);
    assert.equal(s.todayGoldUnlocked, true);
    assert.equal(s.goldNights, 1);
    assert.equal(s.streakState, 'extended_today');
    assert.equal(s.weekDays[6].status, 'gold');
  });

  it('marks an active streak from yesterday as at_risk until today’s first read extends it', () => {
    const now = new Date(2026, 10, 10, 19, 0, 0);
    const completed = {
      'poem-1': { completed: true, completedAt: localIsoForKey('2026-11-07') },
      'poem-2': { completed: true, completedAt: localIsoForKey('2026-11-08') },
      'poem-3': { completed: true, completedAt: localIsoForKey('2026-11-09') }
    };
    const beforeToday = computeDuolingoStreak(completed, [], { now });
    assert.equal(beforeToday.currentStreak, 3);
    assert.equal(beforeToday.completedToday, false);
    assert.equal(beforeToday.streakState, 'at_risk');

    const afterToday = computeDuolingoStreak(
      {
        ...completed,
        'poem-4': { completed: true, completedAt: localIsoForKey('2026-11-10') }
      },
      [],
      { now }
    );
    assert.equal(afterToday.currentStreak, 4);
    assert.equal(afterToday.completedToday, true);
    assert.equal(afterToday.streakState, 'extended_today');
  });

  it('automatically consumes a Streak Freeze on 1 missed calendar day and resets to 0 if out of freezes', () => {
    const now = new Date(2026, 10, 10, 20, 0, 0);
    // Read Nov 6, 7, 8; missed Nov 9 (yesterday); not yet read Nov 10 (today)
    const completed = {
      a: { completed: true, completedAt: localIsoForKey('2026-11-06') },
      b: { completed: true, completedAt: localIsoForKey('2026-11-07') },
      c: { completed: true, completedAt: localIsoForKey('2026-11-08') }
    };
    const saved = computeDuolingoStreak(completed, [], { now, initialFreezeTokens: 1 });
    assert.equal(saved.currentStreak, 3, 'Streak Freeze preserves the 3-day streak without incrementing');
    assert.equal(saved.freezeTokens, 0, 'Starter freeze token was consumed on Nov 9');
    assert.equal(saved.frozeYesterday, true);
    assert.equal(saved.streakState, 'frozen_saved');
    assert.equal(saved.weekDays[5].status, 'frozen', 'Yesterday appears frozen in 7-day strip');

    // Now simulate missing 2 consecutive days (Nov 8 & Nov 9) with only 1 freeze -> breaks streak!
    const broken = computeDuolingoStreak(
      {
        a: { completed: true, completedAt: localIsoForKey('2026-11-05') },
        b: { completed: true, completedAt: localIsoForKey('2026-11-06') },
        c: { completed: true, completedAt: localIsoForKey('2026-11-07') }
      },
      [],
      { now, initialFreezeTokens: 1 }
    );
    assert.equal(broken.currentStreak, 0, 'Missing 2 days with 1 freeze resets streak to 0');
    assert.equal(broken.longestStreak, 3, 'Longest streak remains preserved at 3');
    assert.equal(broken.streakState, 'broken');
  });

  it('refills +1 Streak Freeze on every 7-day streak milestone up to max 2', () => {
    const startKey = '2026-11-04';
    const completed = {};
    for (let i = 0; i < 7; i++) {
      const key = addDaysToDateKey(startKey, i);
      completed[`item-${i}`] = { completed: true, completedAt: localIsoForKey(key) };
    }
    const s = computeDuolingoStreak(completed, [], {
      now: new Date(2026, 10, 10, 21, 0, 0),
      initialFreezeTokens: 1
    });
    assert.equal(s.currentStreak, 7);
    assert.equal(s.freezeTokens, 2, 'Reaching a 7-day streak awards +1 Streak Freeze (max 2)');
  });

  it('evaluates legacy Night Status & no-ops sound synthesizer cleanly in non-browser environments', () => {
    assert.equal(evaluateNightStatus({}).tier, 'unlit');
    assert.equal(evaluateNightStatus({ poem: true }).tier, 'flame');
    assert.equal(evaluateNightStatus({ poem: true, story: true, essay: true }).tier, 'gold');
    assert.equal(
      evaluateNightStatus({ poem: true, story: true, essay: true, korea: true }).tier,
      'diamond'
    );

    const completedSlots = {
      1: { poem: true, story: true, essay: true, korea: false, sf: false },
      2: { poem: true, story: false, essay: false, korea: false, sf: false },
      3: { poem: true, story: true, essay: true, korea: true, sf: false }
    };
    const summary = recomputeStreakSummary(completedSlots, 1);
    assert.equal(summary.litFlameDays, 3);
    assert.equal(summary.goldNightsCount, 2);
    assert.equal(summary.diamondNightsCount, 1);

    // Sound effects return false gracefully when Web Audio API is absent in Node
    assert.equal(playStoryCompleteSound(true), false);
    assert.equal(playStreakExtendedSound(true), false);
    assert.equal(playGoldNightSound(true), false);
    assert.equal(playMascotChirpSound(false), false);
  });
});

describe('Bradbury 1000 — Dataset Verbatim, Key Context & Single-Text Analysis Integrity (400 Works)', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);
  const allWorks = [
    ...catalog.poem,
    ...catalog.story,
    ...catalog.essay,
    ...catalog.personal
  ];

  it('verifies all 400 works have complete text, Key Context briefing, and focused single-text analysis (6-section deep dive for literature, 4 sections for Personal) without bundle wrap-ups', () => {
    assert.equal(allWorks.length, 400);
    const forbiddenBundleRx =
      /\b(Metaphor\s+Collision|Bradbury\s+Collision|Night\s+\d+|side\s+by\s+side\s+with\s+classic|Pairing\s+this\s+Night|tonight's\s+poem|tonight's\s+short\s+story|tonight's\s+essay|reading\s+sequence)\b/i;

    for (const item of allWorks) {
      assert.ok(item.title && item.title.length > 1, `Missing title on ${item.id}`);
      assert.ok(
        (item.author && item.author.length > 1) || (item.region && item.region.length > 1),
        `Missing author/region on ${item.id}`
      );
      assert.ok(item.subcategory && item.subcategory.length > 1, `Missing subcategory on ${item.id}`);
      assert.ok(
        item.keyContext && item.keyContext.length >= 180,
        `Work ${item.id} (${item.title}) must have a rich keyContext briefing (>=180 chars)`
      );
      assert.equal(
        forbiddenBundleRx.test(item.keyContext),
        false,
        `Work ${item.id} keyContext must not contain bundle/sequence references`
      );
      const fullString = Array.isArray(item.fullText)
        ? item.fullText.join('\n')
        : typeof item.fullText === 'string'
        ? item.fullText
        : (item.paragraphs || []).join('\n');
      const minTextChars = item.categoryKey === 'poem' ? 80 : 400;
      assert.ok(
        fullString.length >= minTextChars,
        `Text too short on ${item.id} (${fullString.length} chars, min ${minTextChars})`
      );
      assert.ok(Array.isArray(item.analysis), `Analysis must be an array on ${item.id}`);
      if (item.categoryKey === 'personal') {
        assert.equal(
          item.analysis.length,
          4,
          `Work ${item.id} (${item.title}) must have 4 single-text analysis sections (no bundle wrap-up), found ${item.analysis.length}`
        );
      } else {
        // Poems, stories & essays: ~1-minute plain-prose Key Context + ~5x deep-dive analysis
        const words = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
        const kcWords = words(item.keyContext);
        assert.ok(
          kcWords >= 120 && kcWords <= 190,
          `Work ${item.id} keyContext should be ~1 minute spoken (120-190 words), found ${kcWords}`
        );
        assert.deepEqual(
          item.analysis.map((sec) => sec.heading),
          LITERARY_ANALYSIS_HEADINGS,
          `Work ${item.id} (${item.title}) must use the 6 deep-dive analysis sections`
        );
        const analysisWords = item.analysis.reduce((n, sec) => n + words(sec.paragraph), 0);
        assert.ok(
          analysisWords >= 2300,
          `Work ${item.id} analysis should be ~2,500+ words, found ${analysisWords}`
        );
      }
      for (const sec of item.analysis) {
        assert.equal(
          forbiddenBundleRx.test(sec.heading + ' ' + sec.paragraph),
          false,
          `Work ${item.id} analysis section "${sec.heading}" must focus only on the single text without bundle/Night-N wrap-ups`
        );
      }
    }
  });

  it('verifies all 100 Personal (50 Korea + 50 San Francisco) dispatches include 4 verified historical sources', () => {
    assert.equal(catalog.personal.length, 100);
    for (const item of catalog.personal) {
      assert.ok(Array.isArray(item.sources), `Missing sources array on ${item.id}`);
      assert.ok(
        item.sources.length >= 4,
        `Personal dispatch ${item.id} must have at least 4 verified sources, found ${item.sources.length}`
      );
      for (const src of item.sources) {
        assert.ok(
          src.title && (src.author || src.authorOrOrg) && src.url,
          `Incomplete source metadata on ${item.id}`
        );
      }
    }
  });

  it('enforces the 20-Minute Audio Rule (~3,000 words at 150 WPM) on all 100 Personal (50 Korea & 50 SF) stories', () => {
    assert.equal(PERSONAL_STORY_AUDIO_RULE.targetAudioMinutes, 20);
    for (const item of catalog.personal) {
      const metrics = computeStoryAudioMetrics(item);
      assert.ok(
        metrics.bodyWords >= PERSONAL_STORY_AUDIO_RULE.minBodyWords,
        `Personal story ${item.id} (${item.title}) bodyWords (${metrics.bodyWords}) must be >= ${PERSONAL_STORY_AUDIO_RULE.minBodyWords}`
      );
      assert.ok(
        metrics.totalWords >= PERSONAL_STORY_AUDIO_RULE.minTotalWords,
        `Personal story ${item.id} (${item.title}) totalWords (${metrics.totalWords}) must be >= ${PERSONAL_STORY_AUDIO_RULE.minTotalWords} (~20 min audio at 150 WPM)`
      );
      assert.ok(
        metrics.estimatedAudioMinutes >= PERSONAL_STORY_AUDIO_RULE.minAudioMinutes &&
          metrics.estimatedAudioMinutes <= PERSONAL_STORY_AUDIO_RULE.maxAudioMinutes,
        `Personal story ${item.id} estimatedAudioMinutes (${metrics.estimatedAudioMinutes}m) must be between ${PERSONAL_STORY_AUDIO_RULE.minAudioMinutes}m and ${PERSONAL_STORY_AUDIO_RULE.maxAudioMinutes}m`
      );
      assert.equal(
        item.readingTimeMinutes,
        20,
        `Personal story ${item.id} readingTimeMinutes must be 20`
      );
    }
  });
});



describe('History-API router (multi-page funnel & per-work URLs)', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);
  const loc = (pathname, search = '', hash = '') => ({ pathname, search, hash });

  it('maps root, funnel paths, and genre shelf paths cleanly', () => {
    assert.deepEqual(parseLocation(loc('/'), catalog), {
      view: 'home',
      categoryKey: 'story',
      subcategory: 'All',
      item: null,
      canonical: '/'
    });
    assert.equal(parseLocation(loc(tonightPath()), catalog).view, 'tonight');
    assert.equal(parseLocation(loc(chooseTypePath()), catalog).view, 'choose-type');
    assert.equal(parseLocation(loc(journalPath()), catalog).view, 'journal');

    const choosePoems = parseLocation(loc(chooseGenrePath('poem')), catalog);
    assert.equal(choosePoems.view, 'choose-genre');
    assert.equal(choosePoems.categoryKey, 'poem');

    const poemShelf = parseLocation(loc('/poems'), catalog);
    assert.equal(poemShelf.view, 'shelf');
    assert.equal(poemShelf.categoryKey, 'poem');
    assert.equal(poemShelf.subcategory, 'All');
    assert.equal(poemShelf.item, null);

    const sciFiUrl = shelfPath('story', 'Sci-Fi & Speculative');
    const sciFiQuery = sciFiUrl.slice(sciFiUrl.indexOf('?'));
    const sciFiShelf = parseLocation(loc('/stories', sciFiQuery), catalog);
    assert.equal(sciFiShelf.view, 'shelf');
    assert.equal(sciFiShelf.categoryKey, 'story');
    assert.equal(sciFiShelf.subcategory, 'Sci-Fi & Speculative');
    assert.equal(sciFiShelf.canonical, sciFiUrl);

    assert.equal(parseLocation(loc('/personal'), catalog).categoryKey, 'personal');
  });

  it('round-trips every work through its own URL', () => {
    for (const cat of ['poem', 'story', 'essay', 'personal']) {
      for (const item of catalog[cat]) {
        const route = parseLocation(loc(itemPath(item)), catalog);
        assert.equal(route.view, 'reader');
        assert.equal(route.item?.id, item.id);
        assert.equal(route.categoryKey, cat);
        assert.ok(itemPath(item).startsWith(categoryPath(cat) + '/'));
      }
    }
  });

  it('falls back to the category shelf for unknown ids and upgrades legacy links', () => {
    const unknown = parseLocation(loc('/essays/essay-9999'), catalog);
    assert.equal(unknown.view, 'shelf');
    assert.equal(unknown.item, null);
    assert.equal(unknown.canonical, '/essays');
    assert.equal(parseLocation(loc('/', '?category=poem'), catalog).canonical, '/poems');
    const legacy = parseLocation(loc('/', '', '#/read/day-3/essay'), catalog);
    assert.equal(legacy.view, 'reader');
    assert.equal(legacy.item?.categoryKey, 'essay');
    assert.equal(legacy.canonical, itemPath(legacy.item));
  });
});

describe('Cross-device progress merge', async () => {
  const { mergeProgress, progressKey } = await import('../../src/utils/progressMerge.js');

  it('unions reads from phone and laptop without losing either', () => {
    const phone = { completedItems: { 'poem-1': { completed: true, completedAt: '2026-11-01T00:00:00Z' } } };
    const laptop = { completedItems: { 'essay-2': { completed: true, completedAt: '2026-11-02T00:00:00Z' } } };
    const merged = mergeProgress(phone, laptop);
    assert.deepEqual(Object.keys(merged.completedItems).sort(), ['essay-2', 'poem-1']);
  });

  it('lets the most recent change win, so un-marking propagates', () => {
    const older = { completedItems: { 'poem-1': { completed: true, completedAt: '2026-11-01T00:00:00Z' } } };
    const newer = {
      completedItems: { 'poem-1': { completed: false, completedAt: null, updatedAt: '2026-11-03T00:00:00Z' } }
    };
    assert.equal(mergeProgress(older, newer).completedItems['poem-1'].completed, false);
    assert.equal(mergeProgress(newer, older).completedItems['poem-1'].completed, false);
  });

  it('dedupes external logs and prefers account prefs', () => {
    const log = { id: 'ext-1', title: 'Dune', loggedAt: '2026-11-01T00:00:00Z' };
    const merged = mergeProgress(
      { externalLogs: [log], prefs: { theme: 'parchment', readerFontScale: 110 } },
      { externalLogs: [log], prefs: { theme: 'nocturnal' } }
    );
    assert.equal(merged.externalLogs.length, 1);
    assert.deepEqual(merged.prefs, { theme: 'nocturnal', readerFontScale: 110 });
  });

  it('produces an order-independent key so sync does not loop', () => {
    const a = { completedItems: { x: { completed: true, completedAt: 't' }, y: { completedAt: 't', completed: true } } };
    const b = { completedItems: { y: { completed: true, completedAt: 't' }, x: { completedAt: 't', completed: true } } };
    assert.equal(progressKey(a), progressKey(b));
  });
});

describe('Bradbury 1000 — Title-First Catalog Search Engine', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);

  it('normalizes diacritics, curly quotes, and punctuation cleanly', () => {
    assert.equal(normalizeSearchText('  “An Occurrence at Owl’s—Creek!” '), "an occurrence at owl's creek");
  });

  it('returns balanced unread quick-picks and full 400 counts when query is empty', () => {
    const emptyRes = searchCatalog(catalog, '');
    assert.equal(emptyRes.isQueryEmpty, true);
    assert.equal(emptyRes.countsByCategory.all, 400);
    assert.equal(emptyRes.results.length, 8);
  });

  it('ranks exact and article-stripped title matches #1 across all 400 works', () => {
    const targetStory = catalog.story[0];
    const strippedTitle = targetStory.title.replace(/^(The|A|An)\s+/i, '');
    const hit = searchCatalog(catalog, strippedTitle);
    assert.equal(hit.isQueryEmpty, false);
    assert.ok(hit.results.length >= 1);
    assert.equal(hit.results[0].id, targetStory.id, 'Exact/article-stripped title must rank #1');
  });

  it('supports multi-word partial title queries, category filter pills, and zero-hit counts', () => {
    const samplePersonal = catalog.personal[0];
    const titleWords = samplePersonal.title
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 2)
      .join(' ');
    const allSearch = searchCatalog(catalog, titleWords, { categoryKey: 'all' });
    assert.ok(allSearch.totalAllCategories >= 1);
    assert.ok(allSearch.countsByCategory.personal >= 1);

    const poemScoped = searchCatalog(catalog, samplePersonal.title, { categoryKey: 'poem' });
    assert.equal(poemScoped.results.length, 0);
    assert.ok(
      poemScoped.totalAllCategories >= 1,
      'Must preserve totalAllCategories count so user can widen a 0-hit filtered search'
    );

    const miss = searchCatalog(catalog, 'xyzzynonexistentbook999');
    assert.equal(miss.totalMatches, 0);
    assert.equal(miss.totalAllCategories, 0);
  });
});

