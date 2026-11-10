/**
 * Automated Headless Chromium Mobile Integration Test Runner (Selenium/CDP WebDriver)
 * Launches headless Chromium on a mobile viewport (393x852 @ 2x DPR, iPhone 15/16 Pro),
 * runs real DOM interactions & layout assertions, and captures screenshots for visual review.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const PORT = 9229;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function launchChromium() {
  const profileDir = '/tmp/bradbury_chromium_e2e_profile';
  fs.rmSync(profileDir, { recursive: true, force: true });
  const proc = spawn(
    '/usr/bin/chromium',
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

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return { proc, wsUrl: page.webSocketDebuggerUrl };
      }
    } catch {
      // wait
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

async function runRoundTests(round = 'round1') {
  console.log(`\n=== Starting Headless Chromium Mobile Integration Test (${round}) ===`);
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
    await sleep(1200);

    // Clear storage so test is deterministic
    await cdp.eval(`localStorage.clear(); location.reload();`);
    await sleep(1200);

    // 1. Verify zero horizontal overflow & compact header height
    const metrics = await cdp.eval(`(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const masthead = document.querySelector('.masthead');
      const hero = document.querySelector('.ritual-hero');
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      const cards = Array.from(document.querySelectorAll('.slot-card'));
      const cardsAboveFold = cards.filter(c => c.getBoundingClientRect().top < window.innerHeight - 60);
      return {
        docWidth,
        winWidth,
        hasHorizontalOverflow: docWidth > winWidth + 1,
        mastheadHeight: masthead ? masthead.getBoundingClientRect().height : 999,
        heroHeight: hero ? hero.getBoundingClientRect().height : 999,
        bottomNavVisible: bottomNav ? getComputedStyle(bottomNav).display !== 'none' : false,
        totalCards: cards.length,
        cardsVisibleInViewport: cardsAboveFold.length,
        firstCardTop: cards[0] ? Math.round(cards[0].getBoundingClientRect().top) : 999
      };
    })()`);

    console.log('Mobile Layout Metrics (393x852):', JSON.stringify(metrics, null, 2));
    assert.equal(metrics.hasHorizontalOverflow, false, 'Must have zero horizontal scroll overflow');
    assert.ok(metrics.mastheadHeight <= 64, `Masthead must be compact (<=64px), got ${metrics.mastheadHeight}px`);
    assert.equal(metrics.bottomNavVisible, true, 'Mobile thumb-zone bottom nav must be visible');
    assert.ok(
      metrics.cardsVisibleInViewport >= 2,
      `At least 2 reading cards must be visible above the fold on 393x852, got ${metrics.cardsVisibleInViewport}`
    );

    const outHome = `/tmp/${round}_mobile_home.png`;
    await cdp.screenshot(outHome);
    console.log(`Saved mobile home screenshot: ${outHome}`);

    // 2. Test switching category via Bottom Nav to "Korea & SF" (personal)
    await cdp.eval(`document.getElementById('bottom-nav-personal').click()`);
    await sleep(400);
    const personalCheck = await cdp.eval(`(() => {
      const heading = document.querySelector('.section-heading-title')?.textContent || '';
      const chips = Array.from(document.querySelectorAll('.night-chip')).map(c => c.textContent.trim());
      return { heading, chipsCount: chips.length, firstThreeChips: chips.slice(0, 3) };
    })()`);
    console.log('Personal Category Switch Check:', JSON.stringify(personalCheck));
    assert.ok(personalCheck.heading.includes('20'), 'Personal category should show 20 unread items (10 Korea + 10 SF)');

    if (round !== 'round1') {
      const outPersonal = `/tmp/${round}_mobile_personal.png`;
      await cdp.screenshot(outPersonal);
      console.log(`Saved mobile personal screenshot: ${outPersonal}`);
    }

    // 3. Switch back to Stories and test marking a card Done -> verify it moves to Completed at bottom
    await cdp.eval(`document.getElementById('bottom-nav-story').click()`);
    await sleep(400);
    await cdp.eval(`document.querySelector('.slot-card .check-btn').click()`);
    await sleep(500);

    const completionState = await cdp.eval(`(() => {
      const completedSec = document.getElementById('completed-options-section');
      const grayedCards = document.querySelectorAll('.slot-card.completed-grayed').length;
      const unreadCards = document.querySelectorAll('#unread-options-grid .slot-card').length;
      return {
        hasCompletedSection: Boolean(completedSec),
        grayedCards,
        unreadCards
      };
    })()`);
    console.log('Completion Partition Check:', JSON.stringify(completionState));
    assert.equal(completionState.hasCompletedSection, true, 'Completed section must appear at bottom');
    assert.equal(completionState.grayedCards, 1, '1 card must be in grayed-out completed section');
    assert.equal(completionState.unreadCards, 13, '13 unread stories should remain at top');

    // 3b. Click 'ElevenReader' on the next unread card -> verify it also auto-marks as Completed!
    await cdp.eval(`document.querySelector('#unread-options-grid .slot-card .card-eleven-btn').click()`);
    await sleep(500);
    const elevenCompletionState = await cdp.eval(`(() => ({
      grayedCards: document.querySelectorAll('.slot-card.completed-grayed').length,
      unreadCards: document.querySelectorAll('#unread-options-grid .slot-card').length
    }))()`);
    console.log('ElevenReader Auto-Complete Check:', JSON.stringify(elevenCompletionState));
    assert.equal(
      elevenCompletionState.grayedCards,
      2,
      'Clicking ElevenReader must automatically mark the card as completed (2 total completed)'
    );
    assert.equal(
      elevenCompletionState.unreadCards,
      12,
      '12 unread stories should remain at top after ElevenReader auto-complete'
    );

    // 4. Open Reader View on first unread story
    await cdp.eval(`document.querySelector('#unread-options-grid .slot-card .card-read-btn').click()`);
    await sleep(600);
    const readerCheck = await cdp.eval(`(() => {
      const title = document.querySelector('.reader-title')?.textContent || '';
      const analysisCards = document.querySelectorAll('#five-paragraph-analysis .analysis-paragraph-card').length;
      return { title, analysisCards };
    })()`);
    console.log('Reader View Check:', JSON.stringify(readerCheck));
    assert.ok(readerCheck.title.length > 0, 'Reader view title must be rendered');
    assert.equal(readerCheck.analysisCards, 5, 'Reader view must render all 5 analysis paragraphs');

    const outReader = `/tmp/${round}_mobile_reader.png`;
    await cdp.screenshot(outReader);
    console.log(`Saved mobile reader screenshot: ${outReader}`);

    // Round 3+: Test Aa Typography Drawer, Sepia Theme, Font Size Scaling, and Jump to Analysis
    if (['round3', 'round4', 'round5'].includes(round)) {
      await cdp.eval(`document.getElementById('reader-aa-toggle-btn').click()`);
      await sleep(350);
      await cdp.eval(`document.getElementById('aa-theme-sepia').click()`);
      await sleep(250);
      await cdp.eval(`document.getElementById('aa-font-112').click()`);
      await sleep(300);

      const aaVerify = await cdp.eval(`(() => {
        const themeAttr = document.documentElement.getAttribute('data-theme');
        const metaTheme = document.getElementById('theme-color-meta')?.getAttribute('content');
        const bodyFontSize = document.getElementById('reader-body-content')?.style.fontSize;
        const actionBarVisible = getComputedStyle(document.querySelector('.mobile-reader-action-bar')).display !== 'none';
        return { themeAttr, metaTheme, bodyFontSize, actionBarVisible };
      })()`);
      console.log('Round 3 Reader Typography & Theme Verification:', JSON.stringify(aaVerify));
      assert.equal(aaVerify.themeAttr, 'sepia', 'Reader theme must switch to sepia');
      assert.equal(aaVerify.metaTheme, '#f3ead8', 'Meta theme-color must match sepia');
      assert.equal(aaVerify.actionBarVisible, true, 'Mobile sticky reader action bar must be visible');

      const outAa = `/tmp/${round}_mobile_aa_drawer.png`;
      await cdp.screenshot(outAa);
      console.log(`Saved mobile Aa drawer screenshot: ${outAa}`);

      // Close Aa drawer and jump to 5-paragraph analysis
      await cdp.eval(`document.getElementById('reader-aa-toggle-btn').click()`);
      await sleep(250);
      await cdp.eval(`document.getElementById('five-paragraph-analysis').scrollIntoView()`);
      await sleep(400);
      const outAnalysis = `/tmp/${round}_mobile_analysis.png`;
      await cdp.screenshot(outAnalysis);
      console.log(`Saved mobile 5-paragraph analysis screenshot: ${outAnalysis}`);

      // Reset back to parchment for subsequent checks
      await cdp.eval(`document.getElementById('reader-aa-toggle-btn').click()`);
      await sleep(200);
      await cdp.eval(`document.getElementById('aa-theme-parchment').click()`);
      await sleep(200);
    }

    // Round 2+: Verify PWA Manifest, iOS Standalone Meta Tags, Service Worker, and PWA Install Modal
    if (round !== 'round1') {
      await cdp.eval(`document.getElementById('reader-back-btn').click()`);
      await sleep(400);

      const pwaCheck = await cdp.eval(`(async () => {
        const manifestLink = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
        const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
        const appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content');
        const themeColor = document.getElementById('theme-color-meta')?.getAttribute('content');
        const manifestRes = await fetch(manifestLink);
        const manifestJson = await manifestRes.json();
        const swReady = 'serviceWorker' in navigator;
        return {
          manifestLink,
          hasViewportFitCover: viewport.includes('viewport-fit=cover'),
          appleCapable,
          themeColor,
          manifestDisplay: manifestJson.display,
          manifestIconsCount: (manifestJson.icons || []).length,
          manifestShortcutsCount: (manifestJson.shortcuts || []).length,
          swReady
        };
      })()`);
      console.log('PWA & Standalone Verification:', JSON.stringify(pwaCheck, null, 2));
      assert.equal(pwaCheck.manifestLink, '/manifest.webmanifest');
      assert.equal(pwaCheck.hasViewportFitCover, true, 'Viewport must include viewport-fit=cover');
      assert.equal(pwaCheck.appleCapable, 'yes', 'apple-mobile-web-app-capable must be yes');
      assert.equal(pwaCheck.manifestDisplay, 'standalone', 'Manifest display must be standalone');
      assert.ok(pwaCheck.manifestIconsCount >= 3, 'Manifest must define at least 3 icons');

      // Open the PWA Install & Offline Ready modal and capture screenshot
      await cdp.eval(`document.getElementById('pwa-offline-badge-btn').click()`);
      await sleep(450);
      const outPwa = `/tmp/${round}_mobile_pwa.png`;
      await cdp.screenshot(outPwa);
      console.log(`Saved mobile PWA modal screenshot: ${outPwa}`);
      await cdp.eval(`document.querySelector('#pwa-install-modal .btn-secondary').click()`);
      await sleep(300);
    }

    // Round 4+: Verify StreakCelebrationBanner, 'Up Next' Recommendation Jump, Nocturnal Mode, and Completed Section
    if (['round4', 'round5'].includes(round)) {
      const bannerCheck = await cdp.eval(`(() => {
        const banner = document.getElementById('streak-celebration-banner');
        const nextBtn = document.getElementById('up-next-recommendation-btn');
        return {
          bannerVisible: Boolean(banner),
          bannerText: banner ? banner.textContent.trim() : '',
          nextBtnText: nextBtn ? nextBtn.textContent.trim() : ''
        };
      })()`);
      console.log('Round 4 Celebration Banner Check:', JSON.stringify(bannerCheck));
      assert.equal(bannerCheck.bannerVisible, true, 'Streak celebration banner must be visible after completing 1 item');
      assert.ok(bannerCheck.nextBtnText.includes('Up Next'), 'Up Next recommendation button must be rendered');

      // Scroll to bottom Completed section on Stories before jumping
      await cdp.eval(`document.getElementById('completed-options-section').scrollIntoView()`);
      await sleep(350);
      const outCompleted = `/tmp/${round}_mobile_completed.png`;
      await cdp.screenshot(outCompleted);
      console.log(`Saved mobile completed section screenshot: ${outCompleted}`);

      // Scroll back to top, toggle Nocturnal mode, and capture screenshot
      await cdp.eval(`window.scrollTo(0, 0)`);
      await sleep(250);
      await cdp.eval(`document.getElementById('theme-toggle-btn').click()`);
      await sleep(350);
      const nocCheck = await cdp.eval(`(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        metaColor: document.getElementById('theme-color-meta')?.getAttribute('content')
      }))()`);
      console.log('Round 4 Nocturnal Mode Check:', JSON.stringify(nocCheck));
      assert.equal(nocCheck.theme, 'nocturnal');
      assert.equal(nocCheck.metaColor, '#1b1714');

      const outNocturnal = `/tmp/${round}_mobile_nocturnal.png`;
      await cdp.screenshot(outNocturnal);
      console.log(`Saved mobile nocturnal mode screenshot: ${outNocturnal}`);

      // Click 'Up Next: Poem' button and verify category switches to Poem
      await cdp.eval(`document.getElementById('up-next-recommendation-btn').click()`);
      await sleep(350);
      const switchedHeading = await cdp.eval(`document.querySelector('.section-heading-title')?.textContent || ''`);
      assert.ok(switchedHeading.includes('Poem'), `Expected heading to switch to Poem, got ${switchedHeading}`);

      // Toggle back to parchment
      await cdp.eval(`document.getElementById('theme-toggle-btn').click()`);
      await sleep(250);
    }

    // Round 5: Verify WCAG 2.2 AA Mobile Touch Targets (2.5.8 >= 24x24px), Scroll Padding (2.4.11), and Final Polish
    if (round === 'round5') {
      const wcagAudit = await cdp.eval(`(() => {
        const htmlStyle = getComputedStyle(document.documentElement);
        const scrollPadTop = parseFloat(htmlStyle.scrollPaddingTop) || 0;
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
        const primaryButtons = Array.from(document.querySelectorAll('.slot-footer .btn-primary, .bottom-nav-item')).map(b => {
          const r = b.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height) };
        });
        const minPrimaryHeight = Math.min(...primaryButtons.map(x => x.h));
        return {
          totalVisibleButtons: buttons.length,
          undersizedCount: undersized.length,
          undersized,
          minPrimaryHeight,
          scrollPadTop
        };
      })()`);
      console.log('Round 5 WCAG 2.2 AA Mobile Audit:', JSON.stringify(wcagAudit, null, 2));
      assert.equal(wcagAudit.undersizedCount, 0, `All visible buttons must meet WCAG 2.2 2.5.8 (>=24x24px), found: ${JSON.stringify(wcagAudit.undersized)}`);
      assert.ok(wcagAudit.minPrimaryHeight >= 36, `Primary action & nav buttons must be >=36px tall, got ${wcagAudit.minPrimaryHeight}px`);
      assert.ok(wcagAudit.scrollPadTop >= 48, `html scroll-padding-top must be >=48px for sticky header clearance, got ${wcagAudit.scrollPadTop}px`);

      const outFinal = `/tmp/${round}_mobile_final.png`;
      await cdp.screenshot(outFinal);
      console.log(`Saved Round 5 final mobile screenshot: ${outFinal}`);
    }

    console.log(`=== ALL ${round.toUpperCase()} MOBILE INTEGRATION ASSERTIONS PASSED! ===\n`);
  } finally {
    cdp.close();
    proc.kill('SIGKILL');
  }
}

const roundArg = process.argv[2] || 'round1';
runRoundTests(roundArg).catch((err) => {
  console.error('Integration Test Failed:', err);
  process.exit(1);
});
