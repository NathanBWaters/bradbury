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
  computeStoryAudioMetrics
} from '../../src/utils/catalogEngine.js';
import { formatFullPlainTextForElevenReader } from '../../src/utils/plainTextFormatter.js';
import { buildEpubBlob } from '../../src/utils/epubGenerator.js';
import {
  DEFAULT_USER_STATE,
  evaluateNightStatus,
  recomputeStreakSummary
} from '../../src/utils/streakEngine.js';

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

  it('normalizes all 62 literary & personal works across the 4 pillars', () => {
    assert.equal(catalog.poem.length, 14, 'Should have 14 poems (10 primary + 4 swap)');
    assert.equal(catalog.story.length, 14, 'Should have 14 short stories (10 primary + 4 swap)');
    assert.equal(catalog.essay.length, 14, 'Should have 14 essays (10 primary + 4 swap)');
    assert.equal(catalog.personal.length, 20, 'Should have 20 personal essays (10 Korea + 10 SF)');
    const total =
      catalog.poem.length +
      catalog.story.length +
      catalog.essay.length +
      catalog.personal.length;
    assert.equal(total, 62, 'Total catalog should contain 62 works');
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

    assert.equal(partitioned.unreadItems.length, 12);
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
    const completedMap = {
      [catalog.story[0].id]: { completed: true },
      [catalog.poem[0].id]: { completed: true },
      [catalog.essay[0].id]: { completed: true }
    };
    const stats = computeStreakStats(catalog, completedMap, []);
    assert.equal(stats.totalCompleted, 3);
    assert.equal(stats.goldNights, 1);
    assert.equal(stats.categoriesTouched, 3);
    assert.equal(stats.freezeTokens, 1);

    // Since poem, story, essay each have 1 completed item, personal is the untouched pillar
    const nextRec = getNextRecommendedPillar(catalog, completedMap);
    assert.ok(nextRec);
    assert.equal(nextRec.categoryKey, 'personal');
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
      formatted.includes('Five-Paragraph Literary and Historical Analysis'),
      'Formatted share text must include the 5-paragraph analysis section header'
    );
    for (const sec of story.analysis) {
      assert.ok(formatted.includes(sec.heading), 'All 5 analysis headings must be included');
      assert.ok(
        formatted.includes(sec.paragraph.slice(0, 60)),
        'All 5 analysis paragraphs must be included'
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
});

describe('Bradbury 1000 — Spec-Compliant Pure-JS EPUB 2/3 Generator', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);

  it('generates a valid EPUB ZIP Blob with uncompressed mimetype first', async () => {
    const sample = catalog.poem[0];
    const epubBlob = buildEpubBlob({
      title: sample.title,
      subtitle: 'Bradbury 1000 Night 1 Poem',
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
    assert.ok(asciiText.includes('Five-Paragraph Literary &amp; Cultural Analysis'));
  });
});

describe('Bradbury 1000 — 2-Tier Duolingo Streak Engine', () => {
  it('evaluates Night Status accurately (unlit, flame, gold, diamond)', () => {
    assert.equal(evaluateNightStatus({}).tier, 'unlit');
    assert.equal(evaluateNightStatus({ poem: true }).tier, 'flame');
    assert.equal(evaluateNightStatus({ poem: true, story: true, essay: true }).tier, 'gold');
    assert.equal(
      evaluateNightStatus({ poem: true, story: true, essay: true, korea: true }).tier,
      'diamond'
    );
  });

  it('recomputes multi-night streak summary and Streak Freeze awards accurately', () => {
    assert.ok(DEFAULT_USER_STATE.streak.freezeTokens >= 1);
    const completedSlots = {
      1: { poem: true, story: true, essay: true, korea: false, sf: false },
      2: { poem: true, story: false, essay: false, korea: false, sf: false },
      3: { poem: true, story: true, essay: true, korea: true, sf: false }
    };
    const summary = recomputeStreakSummary(completedSlots, 1);
    assert.equal(summary.litFlameDays, 3, 'Should count 3 active flame nights');
    assert.equal(summary.goldNightsCount, 2, 'Should count 2 Gold Trio nights');
    assert.equal(summary.diamondNightsCount, 1, 'Should count 1 Diamond Quartet night');
  });
});

describe('Bradbury 1000 — Dataset Verbatim & 5-Paragraph Analysis Integrity', () => {
  const catalog = buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces);
  const allWorks = [
    ...catalog.poem,
    ...catalog.story,
    ...catalog.essay,
    ...catalog.personal
  ];

  it('verifies all 62 works have complete text and a 5-paragraph analysis', () => {
    for (const item of allWorks) {
      assert.ok(item.title && item.title.length > 1, `Missing title on ${item.id}`);
      assert.ok(
        (item.author && item.author.length > 1) || (item.region && item.region.length > 1),
        `Missing author/region on ${item.id}`
      );
      assert.ok(item.subcategory && item.subcategory.length > 1, `Missing subcategory on ${item.id}`);
      const fullString = Array.isArray(item.fullText)
        ? item.fullText.join('\n')
        : typeof item.fullText === 'string'
        ? item.fullText
        : (item.paragraphs || []).join('\n');
      assert.ok(fullString.length > 200, `Text too short on ${item.id}`);
      assert.ok(Array.isArray(item.analysis), `Analysis must be an array on ${item.id}`);
      assert.equal(
        item.analysis.length,
        5,
        `Work ${item.id} (${item.title}) must have exactly 5 analysis paragraphs, found ${item.analysis.length}`
      );
    }
  });

  it('verifies all 20 Korea & San Francisco dispatches include 4 verified historical sources', () => {
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

  it('enforces the 20-Minute Audio Rule (~3,000 words at 150 WPM) on all 20 Korea & San Francisco stories', () => {
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

