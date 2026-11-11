/**
 * Automated Headless Chromium Mobile & Desktop Integration Test Runner (CDP)
 * Verifies the multi-page Choose-Your-Adventure funnel on mobile (393x852 @ 2x DPR)
 * and desktop (1280x860), asserting layout, zero overflow, History-API back/forward,
 * Quartet shuffling, Guided Type->Genre->Shelf funnel, Reader View, Ledger, PWA, and WCAG 2.2 AA targets.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:5173';
const PORT = Number(process.env.CDP_PORT || 9229);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findChromiumBinary() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ].filter(Boolean);
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return '/usr/bin/chromium';
}

async function launchChromium() {
  const profileDir = '/tmp/bradbury_chromium_e2e_profile';
  fs.rmSync(profileDir, { recursive: true, force: true });
  const bin = findChromiumBinary();
  const proc = spawn(
    bin,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${PORT}`,
      '--window-size=393,852',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  for (let i = 0; i < 45; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return { proc, wsUrl: page.webSocketDebuggerUrl };
      }
    } catch {
      // wait for browser startup
    }
    await sleep(150);
  }
  proc.kill('SIGKILL');
  throw new Error('Failed to connect to headless Chromium on port ' + PORT);
}

class CDPSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Runtime.evaluate exception: ${
          res.exceptionDetails.exception?.description || res.exceptionDetails.text
        }`
      );
    }
    return res.result.value;
  }

  async screenshot(outPath) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false
    });
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    return outPath;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

async function assertCleanMobilePage(cdp, label) {
  const check = await cdp.eval(`(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const h1Count = document.querySelectorAll('h1').length;
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    });
    const undersized = buttons
      .map(b => {
        const r = b.getBoundingClientRect();
        return { id: b.id || b.className, w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter(x => x.w < 24 || x.h < 24);
    return {
      path: location.pathname + location.search,
      docWidth,
      winWidth,
      hasOverflow: docWidth > winWidth + 1,
      h1Count,
      undersized
    };
  })()`);
  assert.equal(
    check.hasOverflow,
    false,
    `[${label}] Must have zero horizontal overflow (${check.docWidth}px > ${check.winWidth}px)`
  );
  assert.equal(check.h1Count, 1, `[${label}] Must have exactly 1 semantic <h1>, got ${check.h1Count}`);
  assert.equal(
    check.undersized.length,
    0,
    `[${label}] All visible buttons must be >=24x24px (WCAG 2.2 AA), found: ${JSON.stringify(check.undersized)}`
  );
  return check;
}

async function runFunnelTests(tag = 'funnel') {
  console.log(`\n=== Starting Headless Chromium Funnel E2E Suite (${tag}) ===`);
  const { proc, wsUrl } = await launchChromium();
  const cdp = new CDPSession(wsUrl);

  try {
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true
    });

    await cdp.send('Page.navigate', { url: APP_URL });
    for (let i = 0; i < 30; i++) {
      const ready = await cdp.eval(`Boolean(document.querySelector('h1'))`);
      if (ready) break;
      await sleep(200);
    }

    // Deterministic clean state
    await cdp.eval(`localStorage.clear(); location.replace('/');`);
    await sleep(400);
    for (let i = 0; i < 30; i++) {
      const ready = await cdp.eval(`Boolean(document.querySelector('h1'))`);
      if (ready) break;
      await sleep(200);
    }

    // 1. HOME FUNNEL VIEW (/): Unlit 0-day streak, Folio SVG Mascot, 7-day strip & Sound toggle
    await assertCleanMobilePage(cdp, 'Home (/)');
    const homeMetrics = await cdp.eval(`(() => {
      const masthead = document.querySelector('.masthead');
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      const navButtons = Array.from(document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item'));
      const autoBtn = document.getElementById('adventure-auto-btn');
      const customBtn = document.getElementById('adventure-custom-btn');
      const streakBtn = document.getElementById('topbar-ledger-btn');
      const soundBtn = document.getElementById('sound-toggle-btn');
      const folioSvg = document.querySelector('#home-funnel-view .folio-svg');
      const weekCells = document.querySelectorAll('#home-streak-preview .duo-day-col').length;
      return {
        pathname: location.pathname,
        mastheadHeight: masthead ? Math.round(masthead.getBoundingClientRect().height) : 999,
        bottomNavVisible: bottomNav ? getComputedStyle(bottomNav).display !== 'none' : false,
        bottomNavTabCount: navButtons.length,
        autoVisible: Boolean(autoBtn && autoBtn.getBoundingClientRect().top < window.innerHeight - 60),
        customVisible: Boolean(customBtn && customBtn.getBoundingClientRect().top < window.innerHeight - 60),
        initialStreakText: streakBtn?.querySelector('.ledger-pill-part')?.textContent?.trim(),
        initialStreakUnlit: streakBtn?.classList.contains('is-unlit'),
        soundBtnPressed: soundBtn?.getAttribute('aria-pressed'),
        hasFolioSvg: Boolean(folioSvg),
        weekCells
      };
    })()`);
    console.log('1. Home Funnel Metrics:', JSON.stringify(homeMetrics));
    assert.equal(homeMetrics.pathname, '/');
    assert.ok(homeMetrics.mastheadHeight <= 64, `Masthead must be <=64px, got ${homeMetrics.mastheadHeight}px`);
    assert.equal(homeMetrics.bottomNavVisible, true, 'Mobile 4-tab bottom nav must be visible');
    assert.equal(homeMetrics.bottomNavTabCount, 4, 'Mobile bottom nav must have 4 clean mode tabs');
    assert.equal(homeMetrics.autoVisible, true, 'Path A (Pick One of Four For Me) must be visible above fold');
    assert.equal(homeMetrics.customVisible, true, 'Path B (Choose a Type & Genre) must be visible above fold');
    assert.equal(homeMetrics.initialStreakText, '0', 'Unstarted Duolingo streak pill must show 0, not fake 1');
    assert.equal(homeMetrics.initialStreakUnlit, true, 'Unstarted streak pill must have is-unlit styling');
    assert.equal(homeMetrics.soundBtnPressed, 'true', 'Sound effects must be enabled by default');
    assert.equal(homeMetrics.hasFolioSvg, true, 'Folio the Lantern Owl SVG mascot must render in Home hero');
    assert.equal(homeMetrics.weekCells, 7, 'Duolingo 7-day calendar strip must render 7 day nodes');

    // Toggle sound off and back on + tap Folio mascot for interactive hop
    await cdp.eval(`document.getElementById('sound-toggle-btn').click()`);
    await sleep(150);
    assert.equal(await cdp.eval(`document.getElementById('sound-toggle-btn').getAttribute('aria-pressed')`), 'false');
    await cdp.eval(`document.getElementById('sound-toggle-btn').click()`);
    await sleep(150);
    assert.equal(await cdp.eval(`document.getElementById('sound-toggle-btn').getAttribute('aria-pressed')`), 'true');

    await cdp.eval(`document.querySelector('#home-funnel-view .folio-mascot-wrap').click()`);
    await sleep(200);
    await assertCleanMobilePage(cdp, 'Home after Folio tap');

    await cdp.screenshot(`/tmp/${tag}_mobile_home.png`);

    // 2. PATH A — AUTOMATIC CURATED QUARTET (/tonight)
    await cdp.eval(`document.getElementById('adventure-auto-btn').click()`);
    await sleep(450);
    await assertCleanMobilePage(cdp, 'Tonight Quartet (/tonight)');

    const initialQuartet = await cdp.eval(`(() => ({
      pathname: location.pathname,
      hasCoachMascot: Boolean(document.querySelector('.mascot-coach-banner .folio-svg')),
      cardIds: Array.from(document.querySelectorAll('#tonight-quartet-grid .slot-card')).map(el => el.getAttribute('data-testid'))
    }))()`);
    console.log('2. Tonight Quartet Initial Deal:', JSON.stringify(initialQuartet));
    assert.equal(initialQuartet.pathname, '/tonight');
    assert.equal(initialQuartet.hasCoachMascot, true, 'Tonight view must display Folio coach banner');
    assert.equal(initialQuartet.cardIds.length, 4, 'Tonight view must deal exactly 4 pillar cards');

    await cdp.screenshot(`/tmp/${tag}_mobile_tonight.png`);

    // Shuffle all 4
    await cdp.eval(`document.getElementById('shuffle-quartet-btn').click()`);
    await sleep(350);
    const shuffledQuartet = await cdp.eval(`Array.from(document.querySelectorAll('#tonight-quartet-grid .slot-card')).map(el => el.getAttribute('data-testid'))`);
    assert.notDeepEqual(shuffledQuartet, initialQuartet.cardIds, 'Shuffle All 4 must deal a fresh hand');

    // Swap single slot (poem)
    await cdp.eval(`document.getElementById('swap-slot-poem').click()`);
    await sleep(300);
    const swappedQuartet = await cdp.eval(`Array.from(document.querySelectorAll('#tonight-quartet-grid .slot-card')).map(el => el.getAttribute('data-testid'))`);
    assert.notEqual(swappedQuartet[0], shuffledQuartet[0], 'Swapping poem slot must deal a new poem');
    assert.deepEqual(swappedQuartet.slice(1), shuffledQuartet.slice(1), 'Other 3 slots must remain unchanged');

    // Mark first quartet card Done -> ignites Day 1 Duolingo streak (0 -> 1) + shows celebration stage!
    await cdp.eval(`document.querySelector('#tonight-quartet-grid .slot-card .check-btn').click()`);
    await sleep(450);
    const afterQuartetDone = await cdp.eval(`(() => {
      const streakBtn = document.getElementById('topbar-ledger-btn');
      const celeb = document.getElementById('duolingo-celebration-card');
      return {
        stillSameFirstCard: document.querySelector('#tonight-quartet-grid .slot-card')?.getAttribute('data-testid'),
        isCompletedGrayed: document.querySelector('#tonight-quartet-grid .slot-card')?.classList.contains('completed-grayed'),
        streakText: streakBtn?.querySelector('.ledger-pill-part')?.textContent?.trim(),
        isLitToday: streakBtn?.classList.contains('is-lit-today'),
        hasCelebration: Boolean(celeb),
        isStreakExtendedCelebration: celeb?.classList.contains('kind-streak_extended')
      };
    })()`);
    console.log('2b. First Completion Celebration:', JSON.stringify(afterQuartetDone));
    assert.equal(afterQuartetDone.stillSameFirstCard, swappedQuartet[0], 'Completed card stays locked in its Quartet slot until swapped');
    assert.equal(afterQuartetDone.isCompletedGrayed, true);
    assert.equal(afterQuartetDone.streakText, '1', 'First completion today ignites streak from 0 -> 1');
    assert.equal(afterQuartetDone.isLitToday, true, 'TopBar streak pill turns lit once completed today');
    assert.equal(afterQuartetDone.hasCelebration, true, 'Duolingo celebration card appears on completion');
    assert.equal(afterQuartetDone.isStreakExtendedCelebration, true, 'First read of day triggers streak_extended celebration');

    await cdp.screenshot(`/tmp/${tag}_mobile_celebration.png`);

    // Click "Open One For Me" -> opens Reader View & auto-clears celebration overlay
    await cdp.eval(`document.getElementById('surprise-quartet-btn').click()`);
    await sleep(550);

    // 3. READER VIEW (/:category/:id)
    await assertCleanMobilePage(cdp, 'Reader View');
    const readerCheck = await cdp.eval(`(() => {
      const title = document.querySelector('.reader-title')?.textContent || '';
      const hasKeyContext = Boolean(document.getElementById('key-context-card'));
      const analysisCards = document.querySelectorAll('#five-paragraph-analysis .analysis-paragraph-card').length;
      const isPersonal = location.pathname.startsWith('/personal/');
      const actionBarVisible = getComputedStyle(document.querySelector('.mobile-reader-action-bar')).display !== 'none';
      return { pathname: location.pathname, title, hasKeyContext, analysisCards, isPersonal, actionBarVisible };
    })()`);
    console.log('3. Reader View Check:', JSON.stringify(readerCheck));
    assert.ok(readerCheck.title.length > 0);
    assert.equal(readerCheck.hasKeyContext, true);
    assert.equal(readerCheck.analysisCards, readerCheck.isPersonal ? 4 : 6);
    assert.equal(readerCheck.actionBarVisible, true);

    // Test Aa drawer & Sepia theme
    await cdp.eval(`document.getElementById('reader-aa-toggle-btn').click()`);
    await sleep(250);
    await cdp.eval(`document.getElementById('aa-theme-sepia').click()`);
    await sleep(200);
    await cdp.eval(`document.getElementById('aa-font-112').click()`);
    await sleep(250);
    const sepiaTheme = await cdp.eval(`document.documentElement.getAttribute('data-theme')`);
    assert.equal(sepiaTheme, 'sepia');
    await cdp.screenshot(`/tmp/${tag}_mobile_reader.png`);
    await cdp.eval(`document.getElementById('aa-theme-parchment').click()`);
    await sleep(200);

    // Back button returns to /tonight!
    await cdp.eval(`document.getElementById('reader-back-btn').click()`);
    await sleep(450);
    assert.equal(await cdp.eval(`location.pathname`), '/tonight', 'Reader Back must return to /tonight');

    // 4. PATH B — STEP-BY-STEP TYPE & GENRE FUNNEL + TITLE SEARCH SPOTLIGHT
    await cdp.eval(`document.getElementById('bottom-nav-explore').click()`);
    await sleep(400);
    await assertCleanMobilePage(cdp, 'Choose Type (/choose)');
    const chooseTypeInfo = await cdp.eval(`(() => ({
      pathname: location.pathname,
      cardCount: document.querySelectorAll('.type-choice-card').length,
      hasTopbarSearch: Boolean(document.getElementById('topbar-search-btn')),
      hasExploreSearchBar: Boolean(document.getElementById('explore-search-trigger-btn'))
    }))()`);
    console.log('4a. Choose Type Step:', JSON.stringify(chooseTypeInfo));
    assert.equal(chooseTypeInfo.pathname, '/choose');
    assert.equal(chooseTypeInfo.cardCount, 4);
    assert.equal(chooseTypeInfo.hasTopbarSearch, true, 'TopBar must include global search button');
    assert.equal(chooseTypeInfo.hasExploreSearchBar, true, 'Explore must include inline title search bar');
    await cdp.screenshot(`/tmp/${tag}_mobile_choose_type.png`);

    // Open Title Search Spotlight -> search for "Ozymandias" -> verify #1 title match & open Reader -> Back returns to /choose!
    await cdp.eval(`document.getElementById('explore-search-trigger-btn').click()`);
    await sleep(250);
    await assertCleanMobilePage(cdp, 'Catalog Search Modal Open');
    await cdp.eval(`(() => {
      const input = document.getElementById('catalog-search-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Ozymandias');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(200);
    const searchCheck = await cdp.eval(`(() => {
      const firstRow = document.querySelector('.catalog-search-row');
      return {
        rowCount: document.querySelectorAll('.catalog-search-row').length,
        firstTitle: firstRow?.querySelector('.catalog-row-title')?.textContent?.trim(),
        hasHighlight: Boolean(firstRow?.querySelector('mark.catalog-search-mark'))
      };
    })()`);
    console.log('4a-ii. Title Search Spotlight Check:', JSON.stringify(searchCheck));
    assert.ok(searchCheck.rowCount >= 1, 'Searching Ozymandias must return matching title');
    assert.equal(searchCheck.firstTitle, 'Ozymandias');
    assert.equal(searchCheck.hasHighlight, true, 'Matching title fragment must be highlighted');
    await cdp.screenshot(`/tmp/${tag}_mobile_search.png`);

    await cdp.eval(`document.querySelector('.catalog-search-row').click()`);
    await sleep(450);
    assert.ok(
      (await cdp.eval(`location.pathname`)).startsWith('/poems/'),
      'Selecting Ozymandias from search must open its poem Reader URL'
    );
    await cdp.eval(`document.getElementById('reader-back-btn').click()`);
    await sleep(400);
    assert.equal(await cdp.eval(`location.pathname`), '/choose', 'Reader Back after search must return cleanly to /choose');

    // Step into Personal (/choose/personal) -> verify 2 Places + 5 Cross-Pacific Themes
    await cdp.eval(`document.getElementById('choose-type-personal').click()`);
    await sleep(400);
    await assertCleanMobilePage(cdp, 'Choose Personal Place/Theme (/choose/personal)');
    const personalGenreInfo = await cdp.eval(`(() => ({
      pathname: location.pathname,
      regionCount: document.querySelectorAll('.region-choice-card').length,
      themeCount: document.querySelectorAll('.genre-choice-card').length
    }))()`);
    console.log('4b. Choose Personal Place/Theme Step:', JSON.stringify(personalGenreInfo));
    assert.equal(personalGenreInfo.pathname, '/choose/personal');
    assert.equal(personalGenreInfo.regionCount, 2);
    assert.equal(personalGenreInfo.themeCount, 5);
    await cdp.screenshot(`/tmp/${tag}_mobile_choose_personal.png`);

    // Select Korea -> Focused Shelf (/personal?genre=Korea)
    await cdp.eval(`document.getElementById('choose-genre-korea').click()`);
    await sleep(400);
    await assertCleanMobilePage(cdp, 'Korea Shelf (/personal?genre=Korea)');
    const koreaShelf = await cdp.eval(`(() => ({
      url: location.pathname + location.search,
      unreadCount: document.querySelectorAll('#unread-options-grid .slot-card').length
    }))()`);
    console.log('4c. Korea Focused Shelf:', JSON.stringify(koreaShelf));
    assert.equal(koreaShelf.url, '/personal?genre=Korea');
    assert.equal(koreaShelf.unreadCount, 50, 'Korea shelf must show 50 unread Korea chronicles');

    // Test browser Back button steps cleanly back through /choose/personal -> /choose
    await cdp.eval(`history.back()`);
    await sleep(350);
    assert.equal(await cdp.eval(`location.pathname`), '/choose/personal');
    await cdp.eval(`history.back()`);
    await sleep(350);
    assert.equal(await cdp.eval(`location.pathname`), '/choose');

    // Now choose Short Stories -> first genre -> test ElevenReader auto-complete & Completed archive
    await cdp.eval(`document.getElementById('choose-type-story').click()`);
    await sleep(350);
    assert.equal(await cdp.eval(`location.pathname`), '/choose/stories');
    await cdp.screenshot(`/tmp/${tag}_mobile_choose_stories.png`);

    await cdp.eval(`document.querySelector('.genre-choice-card').click()`);
    await sleep(400);
    await assertCleanMobilePage(cdp, 'Story Genre Shelf');
    const beforeShelfCount = await cdp.eval(`document.querySelectorAll('#unread-options-grid .slot-card').length`);
    await cdp.eval(`document.querySelector('#unread-options-grid .slot-card .card-eleven-btn').click()`);
    await sleep(450);
    const afterElevenShelf = await cdp.eval(`(() => {
      const streakBtn = document.getElementById('topbar-ledger-btn');
      const celeb = document.getElementById('duolingo-celebration-card');
      return {
        unreadCount: document.querySelectorAll('#unread-options-grid .slot-card').length,
        completedCount: document.querySelectorAll('#completed-options-section .slot-card').length,
        streakText: streakBtn?.querySelector('.ledger-pill-part')?.textContent?.trim(),
        isStoryCompleteCelebration: celeb?.classList.contains('kind-story_complete')
      };
    })()`);
    assert.equal(afterElevenShelf.unreadCount, beforeShelfCount - 1);
    assert.equal(afterElevenShelf.completedCount, 1);
    assert.equal(afterElevenShelf.streakText, '1', '2nd read on the same day must keep Duolingo day streak at 1');
    assert.equal(afterElevenShelf.isStoryCompleteCelebration, true, '2nd read of day triggers story_complete celebration toward Gold Night');
    await cdp.screenshot(`/tmp/${tag}_mobile_shelf.png`);

    // 5. READING LEDGER (/journal), HOME MOMENTUM, NOCTURNAL MODE & PWA
    await cdp.eval(`document.getElementById('bottom-nav-journal').click()`);
    await sleep(400);
    await assertCleanMobilePage(cdp, 'Reading Ledger (/journal)');
    const journalInfo = await cdp.eval(`(() => ({
      pathname: location.pathname,
      statBoxes: document.querySelectorAll('.journal-stat-box').length,
      pillarBars: document.querySelectorAll('.journal-pillar-card').length,
      archivedItems: document.querySelectorAll('.journal-archive-item').length
    }))()`);
    console.log('5. Journal / Ledger Check:', JSON.stringify(journalInfo));
    assert.equal(journalInfo.pathname, '/journal');
    assert.equal(journalInfo.statBoxes, 3);
    assert.equal(journalInfo.pillarBars, 4);
    assert.equal(journalInfo.archivedItems, 2, 'Both completed works (from /tonight and shelf) appear in Ledger');
    await cdp.screenshot(`/tmp/${tag}_mobile_journal.png`);

    // Return Home -> verify Momentum banner + Nocturnal theme + PWA Modal
    await cdp.eval(`document.getElementById('bottom-nav-home').click()`);
    await sleep(400);
    const momentumVisible = await cdp.eval(`Boolean(document.getElementById('streak-celebration-banner'))`);
    assert.equal(momentumVisible, true, 'Home momentum callout must appear once works are read');

    await cdp.eval(`document.getElementById('theme-toggle-btn').click()`);
    await sleep(300);
    assert.equal(await cdp.eval(`document.documentElement.getAttribute('data-theme')`), 'nocturnal');
    await cdp.screenshot(`/tmp/${tag}_mobile_nocturnal.png`);

    // PWA Modal check
    await cdp.eval(`document.getElementById('pwa-offline-badge-btn').click()`);
    await sleep(350);
    const pwaOpen = await cdp.eval(`Boolean(document.getElementById('pwa-install-modal'))`);
    assert.equal(pwaOpen, true);
    await cdp.eval(`document.querySelector('#pwa-install-modal .btn-secondary').click()`);
    await sleep(250);

    // Reset theme back to parchment & verify Desktop viewport (1280x860)
    await cdp.eval(`document.getElementById('theme-toggle-btn').click()`);
    await sleep(250);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 860,
      deviceScaleFactor: 2,
      mobile: false
    });
    await sleep(350);
    const desktopHomeOverflow = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`);
    assert.equal(desktopHomeOverflow, false, 'Desktop Home must have zero horizontal overflow');
    await cdp.screenshot(`/tmp/${tag}_desktop_home.png`);

    await cdp.eval(`document.getElementById('adventure-auto-btn').click()`);
    await sleep(400);
    await cdp.screenshot(`/tmp/${tag}_desktop_tonight.png`);

    console.log(`=== ALL ${tag.toUpperCase()} MOBILE & DESKTOP FUNNEL E2E ASSERTIONS PASSED! ===\n`);
  } finally {
    cdp.close();
    proc.kill('SIGKILL');
  }
}

const roundArg = process.argv[2] || 'funnel';
runFunnelTests(roundArg).catch((err) => {
  console.error('Integration Test Failed:', err);
  process.exit(1);
});
