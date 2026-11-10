import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Award,
  Snowflake,
  BookOpen,
  Download,
  Share2,
  RefreshCw,
  CheckCircle2,
  Circle,
  Sparkles,
  Compass,
  Library,
  PlusCircle,
  User,
  Moon,
  Sun,
  ExternalLink,
  ArrowLeft,
  Headphones,
  FileText,
  MapPin,
  Clock,
  Check
} from 'lucide-react';
import poemsAndEssays from './data/poemsAndEssays.json';
import storiesAndPlaces from './data/storiesAndPlaces.json';
import { buildEpubBlob, downloadEpubBlob } from './utils/epubGenerator.js';
import {
  loadUserState,
  saveUserState,
  evaluateNightStatus,
  recomputeStreakSummary
} from './utils/streakEngine.js';

const METAPHOR_COLLISION_NOTES = {
  1: 'Night 1 collides British Romanticism (Shelley’s ruined desert empire) with Russian Realism (Chekhov’s fifteen-year solitary wager), Renaissance Empiricism (Bacon on disciplined reading), Joseon Dynasty linguistic engineering (King Sejong’s secret creation of Hangul), and 1849 Gold Rush maritime archaeology (the buried ships beneath San Francisco’s Financial District).',
  2: 'Night 2 pairs Emily Dickinson’s quiet carriage ride into eternity with Kate Chopin’s fierce sixty-minute awakening, Emerson’s transcendental "transparent eyeball," Admiral Yi Sun-sin’s 13 turtle and panokseon warships in the Myeongnyang whirlpools, and San Francisco’s beloved self-proclaimed monarch, Emperor Norton I.',
  3: 'Night 3 contrasts Robert Frost’s snowy New England woods with Edgar Allan Poe’s claustrophobic Gothic floorboards, Michel de Montaigne’s Renaissance study on the untamed mind, the free-diving matriarchal Haenyeo of volcanic Jeju Island, and the mechanical physics of Andrew Hallidie’s 1873 San Francisco cable cars.',
  4: 'Night 4 ignites William Blake’s fearful symmetry alongside Guy de Maupassant’s Parisian diamond irony, William James’s neuroplastic psychology of habit, Seoul’s daylighting of the buried Cheonggyecheon stream, and the 1906 San Francisco earthquake & A.P. Giannini’s barrel-top bank.',
  5: 'Night 5 brings W. B. Yeats’s post-war apocalyptic gyre together with O. Henry’s sacrificial Christmas fable, Virginia Woolf’s fierce defense of independent readers, the golden crowns and astronomical towers of ancient Silla in Gyeongju, and Lawrence Ferlinghetti’s City Lights Bookstore & the Howl obscenity trial in North Beach.',
  6: 'Weekend Boss Night 6 expands into visionary scale: Coleridge’s opium-dreamed Xanadu, H. G. Wells’s cosmic planetary close-call ("The Star"), Thoreau’s manifesto on wild sauntering, the microbiology of Korean Onggi breathing jars and communal Gimjang fermentation, and the impossible engineering of the Golden Gate Bridge in International Orange.',
  7: 'Weekend Boss Night 7 delves into obsession and deep time: Poe’s midnight Raven, Kafka’s parable of the Hunger Artist & the Law, T. H. Huxley tracing deep geological oceans inside a piece of carpenter’s chalk, Korea’s 1377 Jikji movable metal type & 81,258 Tripitaka woodblocks, and the glass ruins of Adolph Sutro’s Baths at Lands End.',
  8: 'Night 8 bends perception and craft: Keats’s frozen Grecian urn, Ambrose Bierce’s split-second temporal dilation at Owl Creek Bridge, G. K. Chesterton’s defense of everyday wonder, Seoul’s Euljiro labyrinth of 1960s machine shops and neon speakeasies, and Look Tin Eli’s architectural reinvention of San Francisco’s Chinatown.',
  9: 'Night 9 explores voice, spirit, and fermentation: Walt Whitman stepping out from the lecture hall into the mystical night air, Virginia Woolf’s lyrical ghost story, Bertrand Russell on how philosophy liberates us from the prison of prejudice, Korean Pansori’s one-drum vocal storytelling & Han/Heung, and the wild Gold Rush microbiology of San Francisco sourdough & Mission murals.',
  10: 'Night 10 closes the initial 10-Night arc by revealing the hidden machinery behind art and nature: Matthew Arnold’s retreating sea of faith at Dover Beach, Saki’s wickedly framed Edwardian tall tale, Poe reverse-engineering his own creative method, the seasonal thermodynamics of Bukchon Hanok’s Ondol & Maru floors, and the Pacific wind-tunnel physics of Karl the Fog.'
};

export default function App() {
  const [userState, setUserState] = useState(() => loadUserState());
  const [activeTab, setActiveTab] = useState('tonight'); // 'tonight' | 'places' | 'curriculum' | 'library'
  const [activeReader, setActiveReader] = useState(null); // { night, slotKey, item, slotLabel }
  const [placeFilter, setPlaceFilter] = useState('all'); // 'all' | 'Korea' | 'San Francisco'
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toast, setToast] = useState(null);

  // External Book Search state
  const [extQuery, setExtQuery] = useState('');
  const [extResults, setExtResults] = useState([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extCustomTitle, setExtCustomTitle] = useState('');
  const [extCustomAuthor, setExtCustomAuthor] = useState('');
  const [extCustomSlot, setExtCustomSlot] = useState('story');

  const showToastMessage = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      userState.profile.theme === 'nocturnal' ? 'nocturnal' : 'parchment'
    );
  }, [userState.profile.theme]);

  // Persist user state
  useEffect(() => {
    saveUserState(userState);
  }, [userState]);

  // Support URL hash / path routing for clean reader links (e.g., #/read/day-1/story or ?read=1:story)
  useEffect(() => {
    const parseLocationForReader = () => {
      const pathMatch = window.location.pathname.match(/\/read\/day-(\d+)\/([a-z]+)/i);
      const hashMatch = window.location.hash.match(/#\/?read\/day-(\d+)\/([a-z]+)/i);
      const match = pathMatch || hashMatch;
      if (match) {
        const nightNum = Math.max(1, Math.min(10, parseInt(match[1], 10) || 1));
        const slotKey = match[2].toLowerCase();
        openReaderByNightAndSlot(nightNum, slotKey, false);
      }
    };
    parseLocationForReader();
    window.addEventListener('hashchange', parseLocationForReader);
    return () => window.removeEventListener('hashchange', parseLocationForReader);
  }, []);

  const currentNight = userState.currentNight || 1;

  // Build resolved 10-Night schedule taking any user swaps into account
  const nightsSchedule = useMemo(() => {
    const primaryPoems = poemsAndEssays.poems.filter((p) => !p.isSwap);
    const primaryStories = storiesAndPlaces.stories.filter((s) => !s.isSwap);
    const primaryEssays = poemsAndEssays.essays.filter((e) => !e.isSwap);
    const koreaList = storiesAndPlaces.koreaStories;
    const sfList = storiesAndPlaces.sfStories;

    const schedule = {};
    for (let n = 1; n <= 10; n++) {
      const swapCfg = userState.swappedItems?.[n] || {};
      const poem =
        poemsAndEssays.poems.find((p) => p.id === swapCfg.poem) ||
        primaryPoems.find((p) => p.night === n) ||
        primaryPoems[n - 1];
      const story =
        storiesAndPlaces.stories.find((s) => s.id === swapCfg.story) ||
        primaryStories.find((s) => s.night === n) ||
        primaryStories[n - 1];
      const essay =
        poemsAndEssays.essays.find((e) => e.id === swapCfg.essay) ||
        primaryEssays.find((e) => e.night === n) ||
        primaryEssays[n - 1];
      const korea = koreaList.find((k) => k.night === n) || koreaList[n - 1];
      const sf = sfList.find((s) => s.night === n) || sfList[n - 1];

      schedule[n] = {
        night: n,
        isBossNight: n === 6 || n === 7,
        metaphorCollision: METAPHOR_COLLISION_NOTES[n],
        poem,
        story,
        essay,
        korea,
        sf
      };
    }
    return schedule;
  }, [userState.swappedItems]);

  const tonightData = nightsSchedule[currentNight];
  const tonightSlotsState = userState.completedSlots[currentNight] || {};
  const tonightStatus = evaluateNightStatus(tonightSlotsState);
  const streakSummary = useMemo(
    () => recomputeStreakSummary(userState.completedSlots, 1),
    [userState.completedSlots]
  );

  function openReaderByNightAndSlot(nightNum, slotKey, updateHash = true) {
    const bundle = nightsSchedule[nightNum];
    if (!bundle) return;
    const labelMap = {
      poem: 'Nightly Poem',
      story: 'Nightly Short Story',
      essay: 'Nightly Essay',
      korea: 'Korea Deep-Dive Story',
      sf: 'San Francisco Deep-Dive Story'
    };
    const item = bundle[slotKey];
    if (!item) return;
    setActiveReader({
      night: nightNum,
      slotKey,
      item,
      slotLabel: labelMap[slotKey] || 'Nightly Reading'
    });
    if (updateHash) {
      window.history.replaceState(null, '', `#/read/day-${nightNum}/${slotKey}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeReader() {
    setActiveReader(null);
    window.history.replaceState(null, '', window.location.pathname);
  }

  function toggleSlotComplete(nightNum, slotKey) {
    setUserState((prev) => {
      const prevNight = prev.completedSlots[nightNum] || {};
      const nextVal = !prevNight[slotKey];
      const updatedNight = {
        ...prevNight,
        [slotKey]: nextVal,
        completedAt: nextVal ? new Date().toISOString() : prevNight.completedAt
      };
      const updatedCompletedSlots = {
        ...prev.completedSlots,
        [nightNum]: updatedNight
      };
      const newStatus = evaluateNightStatus(updatedNight);
      if (nextVal) {
        if (newStatus.isDiamondNight) {
          showToastMessage(`Diamond Quartet Complete for Night ${nightNum}! All 4 pillars lit.`);
        } else if (newStatus.isGoldNight) {
          showToastMessage(`Gold Bradbury Night unlocked for Night ${nightNum}! (+1 toward Streak Freeze)`);
        } else if (newStatus.isLitFlame && newStatus.pillarsCompleted === 1) {
          showToastMessage(`Lit Flame ignited for Night ${nightNum}! Your daily streak is safe.`);
        }
      }
      return {
        ...prev,
        completedSlots: updatedCompletedSlots
      };
    });
  }

  function handleSwapSlot(nightNum, slotKey) {
    const pool =
      slotKey === 'poem'
        ? poemsAndEssays.poems
        : slotKey === 'story'
        ? storiesAndPlaces.stories
        : slotKey === 'essay'
        ? poemsAndEssays.essays
        : [];
    if (!pool.length) return;

    const currentItem = nightsSchedule[nightNum][slotKey];
    const swapCandidates = pool.filter((item) => item.isSwap || item.id !== currentItem.id);
    const currentIndex = swapCandidates.findIndex((i) => i.id === currentItem.id);
    const nextCandidate = swapCandidates[(currentIndex + 1) % swapCandidates.length];

    setUserState((prev) => ({
      ...prev,
      swappedItems: {
        ...prev.swappedItems,
        [nightNum]: {
          ...(prev.swappedItems[nightNum] || {}),
          [slotKey]: nextCandidate.id
        }
      }
    }));
    showToastMessage(`Swapped tonight's ${slotKey} to "${nextCandidate.title}" by ${nextCandidate.author}`);
  }

  function handleDownloadSingleEpub(nightNum, slotKey, item, slotLabel) {
    const includeAnalysis = userState.profile.includeAnalysisInEpub !== false;
    const blob = buildEpubBlob({
      title: `${item.title} (Bradbury Night ${nightNum})`,
      subtitle: `${slotLabel} • ${item.author || item.region}`,
      author: item.author || `${item.region} Cultural Chronicle`,
      uid: `urn:bradbury1000:night-${nightNum}:${slotKey}:${item.id}`,
      includeAnalysis,
      chapters: [{ slotLabel, item }]
    });
    const safeSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadEpubBlob(blob, `bradbury-night-${nightNum}-${slotKey}-${safeSlug}.epub`);
    showToastMessage(`Downloaded "${item.title}.epub" (with 5-paragraph analysis) for ElevenReader!`);
  }

  function handleDownloadNightBundleEpub(nightNum) {
    const bundle = nightsSchedule[nightNum];
    const includeAnalysis = userState.profile.includeAnalysisInEpub !== false;
    const chapters = [
      { slotLabel: `Night ${nightNum} Poem`, item: bundle.poem },
      { slotLabel: `Night ${nightNum} Short Story`, item: bundle.story },
      { slotLabel: `Night ${nightNum} Essay`, item: bundle.essay },
      { slotLabel: `Night ${nightNum} Korea Lore`, item: bundle.korea },
      { slotLabel: `Night ${nightNum} San Francisco Lore`, item: bundle.sf }
    ];
    const blob = buildEpubBlob({
      title: `Bradbury 1000 — Night ${nightNum} Complete Bedtime Bundle`,
      subtitle: `Poem, Short Story, Essay, Korea & San Francisco Lore + 5-Paragraph Literary Analyses`,
      author: `${bundle.poem.author}, ${bundle.story.author}, ${bundle.essay.author} & Bradbury 1000`,
      uid: `urn:bradbury1000:night-${nightNum}:complete-bundle`,
      includeAnalysis,
      chapters
    });
    downloadEpubBlob(blob, `bradbury-1000-night-${nightNum}-complete-quartet.epub`);
    showToastMessage(
      `Bundled Night ${nightNum} Quartet (.epub) — ready for ElevenReader Chrome Extension or mobile import!`
    );
  }

  function handleDownloadAllPlacesEpub() {
    const chapters = [];
    for (let n = 1; n <= 10; n++) {
      const k = storiesAndPlaces.koreaStories.find((x) => x.night === n);
      const s = storiesAndPlaces.sfStories.find((x) => x.night === n);
      if (k) chapters.push({ slotLabel: `Korea Story #${n}`, item: k });
      if (s) chapters.push({ slotLabel: `San Francisco Story #${n}`, item: s });
    }
    const blob = buildEpubBlob({
      title: `Korea & San Francisco Cultural Lore Anthology (20 Pre-Baked Stories)`,
      subtitle: `10 Korea Deep-Dives & 10 San Francisco Deep-Dives with 5-Paragraph Cultural Analysis`,
      author: `Bradbury 1000 Cultural & Historical Anthology`,
      uid: `urn:bradbury1000:korea-sf-20-anthology`,
      includeAnalysis: true,
      chapters
    });
    downloadEpubBlob(blob, `bradbury-1000-korea-and-sf-anthology.epub`);
    showToastMessage(`Downloaded all 20 Korea & San Francisco stories as a single EPUB anthology!`);
  }

  async function handleElevenReaderShare(nightNum, slotKey, item) {
    const cleanUrl = `${window.location.origin}/read/day-${nightNum}/${slotKey}`;
    const shareData = {
      title: `${item.title} — Bradbury Night ${nightNum}`,
      text: `Read or listen to "${item.title}" (${item.author || item.region}) with 5-paragraph analysis on Bradbury 1000.`,
      url: cleanUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToastMessage(`Opened native Share Sheet for ElevenReader handoff!`);
        return;
      } catch {
        // user canceled or desktop fallback
      }
    }

    try {
      await navigator.clipboard.writeText(cleanUrl);
      showToastMessage(
        `Copied clean ElevenReader article URL (${cleanUrl}) to clipboard! Paste directly into ElevenReader.`
      );
    } catch {
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async function searchOpenLibrary(e) {
    e.preventDefault();
    if (!extQuery.trim()) return;
    setExtLoading(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(extQuery.trim())}&limit=5`
      );
      const data = await res.json();
      setExtResults(
        (data.docs || []).slice(0, 5).map((d) => ({
          key: d.key,
          title: d.title,
          author: Array.isArray(d.author_name) ? d.author_name[0] : 'Unknown Author',
          year: d.first_publish_year || ''
        }))
      );
    } catch {
      setExtResults([]);
    } finally {
      setExtLoading(false);
    }
  }

  function logExternalReading({ title, author, slotKey }) {
    if (!title.trim()) return;
    const entry = {
      id: `ext-${Date.now()}`,
      night: currentNight,
      slotKey,
      title: title.trim(),
      author: (author || 'External Anthology').trim(),
      loggedAt: new Date().toISOString()
    };
    setUserState((prev) => {
      const prevNight = prev.completedSlots[currentNight] || {};
      return {
        ...prev,
        externalLogs: [entry, ...prev.externalLogs],
        completedSlots: {
          ...prev.completedSlots,
          [currentNight]: {
            ...prevNight,
            [slotKey]: true,
            completedAt: new Date().toISOString()
          }
        }
      };
    });
    setExtCustomTitle('');
    setExtCustomAuthor('');
    setShowExternalModal(false);
    showToastMessage(`Logged "${title}" toward Night ${currentNight}'s ${slotKey.toUpperCase()} slot!`);
  }

  const totalReadingMinutesTonight =
    (tonightData.poem?.readingTimeMinutes || 5) +
    (tonightData.story?.readingTimeMinutes || 15) +
    (tonightData.essay?.readingTimeMinutes || 10) +
    (tonightData.korea?.readingTimeMinutes || 9) +
    (tonightData.sf?.readingTimeMinutes || 9);

  return (
    <div>
      {/* Top Editorial Masthead */}
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand-group">
            <h1
              className="brand-title"
              id="brand-home-link"
              onClick={() => {
                closeReader();
                setActiveTab('tonight');
              }}
            >
              Bradbury 1000
            </h1>
            <span className="brand-subtitle">
              1 Poem • 1 Story • 1 Essay • Korea &amp; SF Lore
            </span>
          </div>

          <nav className="nav-tabs" aria-label="Primary Navigation">
            <button
              id="nav-tab-tonight"
              className={`nav-tab ${activeTab === 'tonight' && !activeReader ? 'active' : ''}`}
              onClick={() => {
                closeReader();
                setActiveTab('tonight');
              }}
            >
              <Flame size={15} />
              Tonight’s Ritual
            </button>
            <button
              id="nav-tab-places"
              className={`nav-tab ${activeTab === 'places' && !activeReader ? 'active' : ''}`}
              onClick={() => {
                closeReader();
                setActiveTab('places');
              }}
            >
              <Compass size={15} />
              Korea &amp; SF Stories (20)
            </button>
            <button
              id="nav-tab-curriculum"
              className={`nav-tab ${activeTab === 'curriculum' && !activeReader ? 'active' : ''}`}
              onClick={() => {
                closeReader();
                setActiveTab('curriculum');
              }}
            >
              <Library size={15} />
              10-Night Curriculum
            </button>
          </nav>

          {/* 2-Tier Duolingo Streak & Profile Cluster */}
          <div className="streak-cluster">
            <div
              className="streak-pill flame"
              title="Tier 1 Lit Flame Streak: Complete at least 1 reading each night to keep your daily flame alive"
            >
              <Flame size={15} />
              <span>{streakSummary.litFlameDays}d Flame</span>
            </div>
            <div
              className="streak-pill gold"
              title="Tier 2 Gold Bradbury Nights: Complete 3+ pillars in a night to advance your 1,000 Nights counter"
            >
              <Award size={15} />
              <span>{streakSummary.goldNightsCount} / 1000 Gold</span>
            </div>
            <div
              className="streak-pill freeze"
              title="Streak Freeze Vault: Earn 1 Freeze every 7 Gold Nights (max 2 held)"
            >
              <Snowflake size={14} />
              <span>
                {streakSummary.freezeTokens}/{streakSummary.maxFreezeTokens} Freezes
              </span>
            </div>

            <button
              id="theme-toggle-btn"
              className="icon-btn"
              onClick={() =>
                setUserState((prev) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    theme: prev.profile.theme === 'nocturnal' ? 'parchment' : 'nocturnal'
                  }
                }))
              }
              title="Toggle Warm Parchment / Nocturnal Bedtime Ink"
            >
              {userState.profile.theme === 'nocturnal' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              id="profile-settings-btn"
              className="icon-btn"
              onClick={() => setShowProfileModal(true)}
              title="Profile & ElevenReader Settings (watersnathan1@gmail.com)"
            >
              <User size={15} />
              <span>Nathan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page-shell">
        {/* IN-APP DISTRACTION-FREE READER VIEW */}
        {activeReader ? (
          <div className="reader-container">
            <div className="reader-toolbar">
              <button id="reader-back-btn" className="btn-secondary" onClick={closeReader}>
                <ArrowLeft size={15} />
                Back to Night {activeReader.night}
              </button>

              <div className="slot-actions">
                <button
                  id="reader-elevenreader-share-btn"
                  className="btn-secondary"
                  onClick={() =>
                    handleElevenReaderShare(
                      activeReader.night,
                      activeReader.slotKey,
                      activeReader.item
                    )
                  }
                  title="2-Tap Mobile Share to ElevenReader or Copy Distraction-Free Article URL"
                >
                  <Headphones size={15} />
                  Listen in ElevenReader
                </button>

                <button
                  id="reader-download-epub-btn"
                  className="btn-secondary"
                  onClick={() =>
                    handleDownloadSingleEpub(
                      activeReader.night,
                      activeReader.slotKey,
                      activeReader.item,
                      activeReader.slotLabel
                    )
                  }
                  title="Download spec-compliant .epub (with 5-paragraph analysis) for ElevenReader Chrome Extension"
                >
                  <Download size={15} />
                  Send .EPUB to ElevenReader
                </button>

                <a
                  href={`/read/day-${activeReader.night}/${activeReader.slotKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  title="Open raw static HTML Reader URL for ElevenReader URL Import"
                >
                  <ExternalLink size={14} />
                  Clean URL
                </a>

                <button
                  id="reader-mark-complete-btn"
                  className={`check-btn ${
                    userState.completedSlots[activeReader.night]?.[activeReader.slotKey]
                      ? 'done'
                      : ''
                  }`}
                  onClick={() => toggleSlotComplete(activeReader.night, activeReader.slotKey)}
                >
                  {userState.completedSlots[activeReader.night]?.[activeReader.slotKey] ? (
                    <>
                      <CheckCircle2 size={15} />
                      Completed
                    </>
                  ) : (
                    <>
                      <Circle size={15} />
                      Mark Read
                    </>
                  )}
                </button>
              </div>
            </div>

            <article>
              <div className="reader-kicker">
                Night {activeReader.night} of 1,000 • {activeReader.slotLabel} •{' '}
                {activeReader.item.genre || activeReader.item.category}
              </div>
              <h1 className="reader-title">{activeReader.item.title}</h1>
              <p className="reader-byline">
                {activeReader.item.author ? (
                  <>
                    By <strong>{activeReader.item.author}</strong> ({activeReader.item.year} •{' '}
                    {activeReader.item.era})
                  </>
                ) : (
                  <>
                    <strong>{activeReader.item.region}</strong> — {activeReader.item.subtitle} (
                    {activeReader.item.era} • {activeReader.item.location})
                  </>
                )}{' '}
                • {activeReader.item.readingTimeMinutes} min read
              </p>

              {activeReader.item.epigraph && (
                <blockquote className="reader-epigraph">{activeReader.item.epigraph}</blockquote>
              )}

              {/* Full Pre-Baked Text */}
              <div className="reader-body">
                {Array.isArray(activeReader.item.fullText) ? (
                  activeReader.item.fullText.map((stanza, sIdx) => (
                    <div key={sIdx} className="poem-stanza">
                      {stanza.split('\n').map((line, lIdx) => (
                        <p key={lIdx} className="poem-line">
                          {line}
                        </p>
                      ))}
                    </div>
                  ))
                ) : typeof activeReader.item.fullText === 'string' ? (
                  activeReader.item.fullText.split(/\n\s*\n/).map((stanza, sIdx) => (
                    <div key={sIdx} className="poem-stanza">
                      {stanza.split('\n').map((line, lIdx) => (
                        <p key={lIdx} className="poem-line">
                          {line}
                        </p>
                      ))}
                    </div>
                  ))
                ) : (
                  (activeReader.item.paragraphs || []).map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))
                )}
              </div>

              {/* 5-Paragraph Literary / Cultural Analysis at the End */}
              {Array.isArray(activeReader.item.analysis) &&
                activeReader.item.analysis.length > 0 && (
                  <section className="analysis-panel" id="five-paragraph-analysis">
                    <div className="analysis-header">
                      <div>
                        <div className="reader-kicker">Post-Reading Critical Companion</div>
                        <h2 className="analysis-title">
                          Five-Paragraph Literary &amp; Historical Analysis
                        </h2>
                      </div>
                      <span className="slot-tag">
                        {activeReader.item.analysis.length} Paragraphs Pre-Baked
                      </span>
                    </div>

                    {activeReader.item.analysis.map((sec, idx) => (
                      <div key={idx} className="analysis-paragraph-card">
                        <h3>{sec.heading}</h3>
                        <p>{sec.paragraph}</p>
                      </div>
                    ))}
                  </section>
                )}

              {/* Bottom Completion & Source Links */}
              <div
                style={{
                  marginTop: '2.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div className="slot-actions">
                  {activeReader.item.standardEbooksUrl && (
                    <a
                      href={activeReader.item.standardEbooksUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      <BookOpen size={14} />
                      Standard Ebooks Catalog
                    </a>
                  )}
                  {activeReader.item.sourceUrl && (
                    <a
                      href={activeReader.item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      <ExternalLink size={14} />
                      Reference Archive
                    </a>
                  )}
                </div>

                <button
                  className={`btn-primary`}
                  onClick={() => {
                    if (!userState.completedSlots[activeReader.night]?.[activeReader.slotKey]) {
                      toggleSlotComplete(activeReader.night, activeReader.slotKey);
                    }
                    closeReader();
                  }}
                >
                  <Check size={16} />
                  {userState.completedSlots[activeReader.night]?.[activeReader.slotKey]
                    ? 'Done — Return to Night Dashboard'
                    : 'Complete Reading & Credit Streak'}
                </button>
              </div>
            </article>
          </div>
        ) : activeTab === 'tonight' ? (
          /* TONIGHT'S RITUAL DASHBOARD */
          <>
            <section className="ritual-hero">
              <div className="ritual-hero-top">
                <div style={{ flex: '1 1 520px' }}>
                  <div className="night-eyebrow">
                    <span>Night {currentNight} of 1,000 • Pre-Baked Prototype (Nights 1–10)</span>
                    {tonightData.isBossNight && (
                      <span className="boss-badge">Weekend Boss Night</span>
                    )}
                  </div>
                  <h2 className="ritual-headline">
                    Tonight’s Metaphor Collision &amp; Bedtime Quartet
                  </h2>
                  <p className="ritual-quote">{tonightData.metaphorCollision}</p>
                </div>

                {/* Duolingo-Style 2-Tier Night Progress Card */}
                <div className="tier-meter-card">
                  <div className="tier-meter-header">
                    <span>
                      {tonightStatus.isDiamondNight
                        ? '💎 Diamond Quartet Complete (4/4)'
                        : tonightStatus.isGoldNight
                        ? '🏆 Gold Bradbury Night Unlocked (3/4)'
                        : tonightStatus.isLitFlame
                        ? '🔥 Lit Flame Active (Daily Streak Safe)'
                        : '🌙 Complete 1 Reading to Light Tonight’s Flame'}
                    </span>
                    <span>{tonightStatus.pillarsCompleted}/4 Pillars</span>
                  </div>
                  <div className="tier-steps">
                    {[1, 2, 3, 4].map((step) => {
                      const active = tonightStatus.pillarsCompleted >= step;
                      const cls = !active
                        ? ''
                        : tonightStatus.isDiamondNight
                        ? 'filled-diamond'
                        : tonightStatus.isGoldNight
                        ? 'filled-gold'
                        : 'filled-flame';
                      return <div key={step} className={`tier-step-bar ${cls}`} />;
                    })}
                  </div>
                  <div className="tier-caption">
                    <span>1/4 = Lit Flame</span>
                    <span>3/4 = Gold Night</span>
                    <span>4/4 = Diamond Quartet</span>
                  </div>
                </div>
              </div>

              {/* 10-Night Selector Strip */}
              <div className="night-selector-bar" role="tablist" aria-label="Select Night 1 to 10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const st = evaluateNightStatus(userState.completedSlots[n] || {});
                  return (
                    <button
                      key={n}
                      id={`select-night-${n}`}
                      className={`night-chip ${currentNight === n ? 'active' : ''} ${
                        st.isDiamondNight
                          ? 'tier-diamond'
                          : st.isGoldNight
                          ? 'tier-gold'
                          : ''
                      }`}
                      onClick={() => setUserState((prev) => ({ ...prev, currentNight: n }))}
                    >
                      <span>Night {n}</span>
                      {(n === 6 || n === 7) && <span title="Weekend Boss Night">★</span>}
                      {st.isDiamondNight ? (
                        <span>💎</span>
                      ) : st.isGoldNight ? (
                        <span>🏆</span>
                      ) : st.isLitFlame ? (
                        <span>🔥</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ElevenReader & Nightly EPUB Bundle Action Bar */}
            <section className="handoff-bar" aria-label="ElevenReader Audio and EPUB Handoff">
              <div className="handoff-info">
                <Headphones size={20} style={{ color: 'var(--accent-flame)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    ElevenReader Bedtime Handoff • ~{totalReadingMinutesTonight} min total audio
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Package all of Night {currentNight}’s pre-baked texts + 5-paragraph analyses
                    into one spec-compliant <code>.epub</code>, or share individual distraction-free
                    reader URLs.
                  </div>
                </div>
              </div>

              <div className="handoff-actions">
                <button
                  id="bundle-tonight-epub-btn"
                  className="btn-primary"
                  onClick={() => handleDownloadNightBundleEpub(currentNight)}
                >
                  <Download size={15} />
                  Bundle Tonight’s Quartet (.epub)
                </button>
                <button
                  id="log-external-book-btn"
                  className="btn-secondary"
                  onClick={() => setShowExternalModal(true)}
                >
                  <PlusCircle size={15} />
                  Log External Book / Kindle
                </button>
              </div>
            </section>

            {/* THE 4 NIGHTLY PILLARS: POEM, SHORT STORY, ESSAY + KOREA & SF LORE */}
            <div className="quartet-grid">
              {/* SLOT 1: POEM + 5-PARAGRAPH ANALYSIS */}
              <SlotCard
                night={currentNight}
                slotKey="poem"
                slotNumber="Pillar I • Poem"
                item={tonightData.poem}
                completed={Boolean(tonightSlotsState.poem)}
                onOpenReader={() => openReaderByNightAndSlot(currentNight, 'poem')}
                onToggleComplete={() => toggleSlotComplete(currentNight, 'poem')}
                onSwap={() => handleSwapSlot(currentNight, 'poem')}
                onDownloadEpub={() =>
                  handleDownloadSingleEpub(
                    currentNight,
                    'poem',
                    tonightData.poem,
                    `Night ${currentNight} Poem`
                  )
                }
                onShareElevenReader={() =>
                  handleElevenReaderShare(currentNight, 'poem', tonightData.poem)
                }
              />

              {/* SLOT 2: SHORT STORY + 5-PARAGRAPH ANALYSIS */}
              <SlotCard
                night={currentNight}
                slotKey="story"
                slotNumber="Pillar II • Short Story"
                item={tonightData.story}
                completed={Boolean(tonightSlotsState.story)}
                onOpenReader={() => openReaderByNightAndSlot(currentNight, 'story')}
                onToggleComplete={() => toggleSlotComplete(currentNight, 'story')}
                onSwap={() => handleSwapSlot(currentNight, 'story')}
                onDownloadEpub={() =>
                  handleDownloadSingleEpub(
                    currentNight,
                    'story',
                    tonightData.story,
                    `Night ${currentNight} Short Story`
                  )
                }
                onShareElevenReader={() =>
                  handleElevenReaderShare(currentNight, 'story', tonightData.story)
                }
              />

              {/* SLOT 3: ESSAY + 5-PARAGRAPH COMMENTARY */}
              <SlotCard
                night={currentNight}
                slotKey="essay"
                slotNumber="Pillar III • Essay"
                item={tonightData.essay}
                completed={Boolean(tonightSlotsState.essay)}
                onOpenReader={() => openReaderByNightAndSlot(currentNight, 'essay')}
                onToggleComplete={() => toggleSlotComplete(currentNight, 'essay')}
                onSwap={() => handleSwapSlot(currentNight, 'essay')}
                onDownloadEpub={() =>
                  handleDownloadSingleEpub(
                    currentNight,
                    'essay',
                    tonightData.essay,
                    `Night ${currentNight} Essay`
                  )
                }
                onShareElevenReader={() =>
                  handleElevenReaderShare(currentNight, 'essay', tonightData.essay)
                }
              />
            </div>

            {/* PILLAR IV: KOREA & SAN FRANCISCO EQUAL LORE SECTION */}
            <section style={{ marginTop: '0.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}
              >
                <div>
                  <div className="night-eyebrow">
                    Pillar IV • Place, History &amp; Cultural Lore (500 Korea + 500 San Francisco Track)
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.75rem',
                      fontWeight: 400,
                      margin: 0
                    }}
                  >
                    Tonight’s Korea &amp; San Francisco Deep-Dive Stories
                  </h3>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Complete either (or both!) to light Pillar IV for Night {currentNight}
                </span>
              </div>

              <div className="quartet-grid">
                <PlaceSlotCard
                  night={currentNight}
                  slotKey="korea"
                  badgeText="Korea Deep-Dive"
                  badgeClass="korea"
                  item={tonightData.korea}
                  completed={Boolean(tonightSlotsState.korea)}
                  onOpenReader={() => openReaderByNightAndSlot(currentNight, 'korea')}
                  onToggleComplete={() => toggleSlotComplete(currentNight, 'korea')}
                  onDownloadEpub={() =>
                    handleDownloadSingleEpub(
                      currentNight,
                      'korea',
                      tonightData.korea,
                      `Night ${currentNight} Korea Story`
                    )
                  }
                  onShareElevenReader={() =>
                    handleElevenReaderShare(currentNight, 'korea', tonightData.korea)
                  }
                />

                <PlaceSlotCard
                  night={currentNight}
                  slotKey="sf"
                  badgeText="San Francisco Deep-Dive"
                  badgeClass="sf"
                  item={tonightData.sf}
                  completed={Boolean(tonightSlotsState.sf)}
                  onOpenReader={() => openReaderByNightAndSlot(currentNight, 'sf')}
                  onToggleComplete={() => toggleSlotComplete(currentNight, 'sf')}
                  onDownloadEpub={() =>
                    handleDownloadSingleEpub(
                      currentNight,
                      'sf',
                      tonightData.sf,
                      `Night ${currentNight} San Francisco Story`
                    )
                  }
                  onShareElevenReader={() =>
                    handleElevenReaderShare(currentNight, 'sf', tonightData.sf)
                  }
                />
              </div>
            </section>
          </>
        ) : activeTab === 'places' ? (
          /* KOREA & SAN FRANCISCO 20 PRE-BAKED STORIES ATLAS */
          <section>
            <div className="ritual-hero">
              <div className="ritual-hero-top">
                <div>
                  <div className="night-eyebrow">
                    Equal Cultural Curriculum • 10 Korea + 10 San Francisco Pre-Baked Prototype
                  </div>
                  <h2 className="ritual-headline">
                    Korea &amp; San Francisco Cultural Chronicle
                  </h2>
                  <p className="ritual-quote">
                    Every story is pre-baked with an 8–10 paragraph narrative deep-dive and a
                    5-paragraph historical &amp; cultural analysis. Review these initial 20 stories
                    (10 Korea, 10 San Francisco) before scaling to the full 1,000.
                  </p>
                </div>

                <div className="handoff-actions">
                  <button className="btn-primary" onClick={handleDownloadAllPlacesEpub}>
                    <Download size={15} />
                    Export All 20 Korea &amp; SF Stories (.epub)
                  </button>
                </div>
              </div>

              <div className="night-selector-bar">
                {['all', 'Korea', 'San Francisco'].map((flt) => (
                  <button
                    key={flt}
                    className={`night-chip ${placeFilter === flt ? 'active' : ''}`}
                    onClick={() => setPlaceFilter(flt)}
                  >
                    {flt === 'all'
                      ? 'All 20 Stories (10 Korea + 10 SF)'
                      : flt === 'Korea'
                      ? '🇰🇷 Korea (10 Pre-Baked)'
                      : '🌉 San Francisco (10 Pre-Baked)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="quartet-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                const kItem = storiesAndPlaces.koreaStories.find((x) => x.night === n);
                const sfItem = storiesAndPlaces.sfStories.find((x) => x.night === n);
                return (
                  <React.Fragment key={n}>
                    {(placeFilter === 'all' || placeFilter === 'Korea') && kItem && (
                      <PlaceSlotCard
                        night={n}
                        slotKey="korea"
                        badgeText={`Night ${n} • Korea`}
                        badgeClass="korea"
                        item={kItem}
                        completed={Boolean(userState.completedSlots[n]?.korea)}
                        onOpenReader={() => openReaderByNightAndSlot(n, 'korea')}
                        onToggleComplete={() => toggleSlotComplete(n, 'korea')}
                        onDownloadEpub={() =>
                          handleDownloadSingleEpub(n, 'korea', kItem, `Night ${n} Korea Story`)
                        }
                        onShareElevenReader={() => handleElevenReaderShare(n, 'korea', kItem)}
                      />
                    )}
                    {(placeFilter === 'all' || placeFilter === 'San Francisco') && sfItem && (
                      <PlaceSlotCard
                        night={n}
                        slotKey="sf"
                        badgeText={`Night ${n} • San Francisco`}
                        badgeClass="sf"
                        item={sfItem}
                        completed={Boolean(userState.completedSlots[n]?.sf)}
                        onOpenReader={() => openReaderByNightAndSlot(n, 'sf')}
                        onToggleComplete={() => toggleSlotComplete(n, 'sf')}
                        onDownloadEpub={() =>
                          handleDownloadSingleEpub(
                            n,
                            'sf',
                            sfItem,
                            `Night ${n} San Francisco Story`
                          )
                        }
                        onShareElevenReader={() => handleElevenReaderShare(n, 'sf', sfItem)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        ) : (
          /* 10-NIGHT MASTER CURRICULUM & METAPHOR COLLISION MATRIX */
          <section>
            <div className="ritual-hero">
              <div className="night-eyebrow">
                Bradbury Metaphor Collision Scheduler • 50 Pre-Baked Readings + Analyses
              </div>
              <h2 className="ritual-headline">
                The 10-Night Prototype Index (10 Poems, 10 Stories, 10 Essays, 10 Korea, 10 SF)
              </h2>
              <p className="ritual-quote">
                Click any title below to open its full pre-baked text and 5-paragraph literary
                analysis, or export any night’s complete bedtime EPUB bundle.
              </p>
            </div>

            <div className="curriculum-table-wrap">
              <table className="curriculum-table">
                <thead>
                  <tr>
                    <th>Night</th>
                    <th>Poem (+ 5-Para Analysis)</th>
                    <th>Short Story (+ 5-Para Analysis)</th>
                    <th>Essay (+ 5-Para Commentary)</th>
                    <th>Korea Story (10)</th>
                    <th>San Francisco Story (10)</th>
                    <th>EPUB Bundle</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                    const row = nightsSchedule[n];
                    const st = evaluateNightStatus(userState.completedSlots[n] || {});
                    return (
                      <tr key={n}>
                        <td>
                          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            Night {n}
                          </div>
                          {row.isBossNight && (
                            <span className="boss-badge" style={{ display: 'inline-block', marginTop: 4 }}>
                              Boss Night
                            </span>
                          )}
                          <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {st.pillarsCompleted}/4 Pillars
                          </div>
                        </td>
                        <td>
                          <button
                            className="nav-tab"
                            style={{ padding: 0, textAlign: 'left', fontWeight: 600 }}
                            onClick={() => openReaderByNightAndSlot(n, 'poem')}
                          >
                            {row.poem.title}
                          </button>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            {row.poem.author} ({row.poem.year})
                          </div>
                        </td>
                        <td>
                          <button
                            className="nav-tab"
                            style={{ padding: 0, textAlign: 'left', fontWeight: 600 }}
                            onClick={() => openReaderByNightAndSlot(n, 'story')}
                          >
                            {row.story.title}
                          </button>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            {row.story.author} ({row.story.year})
                          </div>
                        </td>
                        <td>
                          <button
                            className="nav-tab"
                            style={{ padding: 0, textAlign: 'left', fontWeight: 600 }}
                            onClick={() => openReaderByNightAndSlot(n, 'essay')}
                          >
                            {row.essay.title}
                          </button>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            {row.essay.author} ({row.essay.year})
                          </div>
                        </td>
                        <td>
                          <button
                            className="nav-tab"
                            style={{ padding: 0, textAlign: 'left', fontWeight: 600 }}
                            onClick={() => openReaderByNightAndSlot(n, 'korea')}
                          >
                            {row.korea.title}
                          </button>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {row.korea.era}
                          </div>
                        </td>
                        <td>
                          <button
                            className="nav-tab"
                            style={{ padding: 0, textAlign: 'left', fontWeight: 600 }}
                            onClick={() => openReaderByNightAndSlot(n, 'sf')}
                          >
                            {row.sf.title}
                          </button>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {row.sf.era}
                          </div>
                        </td>
                        <td>
                          <button
                            className="icon-btn"
                            onClick={() => handleDownloadNightBundleEpub(n)}
                          >
                            <Download size={13} />
                            .epub
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* EXTERNAL BOOK / KINDLE QUICK-ADD MODAL */}
      {showExternalModal && (
        <div className="modal-backdrop" onClick={() => setShowExternalModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', marginTop: 0 }}>
              Log an External Book, Story, or Essay
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Read a short story or essay from a physical anthology or Kindle tonight? Search Open
              Library or enter it directly to credit Night {currentNight}’s streak.
            </p>

            <div className="form-field">
              <label>Which Tonight’s Slot Does This Credit?</label>
              <select
                className="form-input"
                value={extCustomSlot}
                onChange={(e) => setExtCustomSlot(e.target.value)}
              >
                <option value="story">Pillar II — Short Story</option>
                <option value="poem">Pillar I — Poem</option>
                <option value="essay">Pillar III — Essay</option>
                <option value="korea">Pillar IV — Korea Story</option>
                <option value="sf">Pillar IV — San Francisco Story</option>
              </select>
            </div>

            <form onSubmit={searchOpenLibrary} className="form-field">
              <label>Search Open Library Catalog</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., The Illustrated Man, Borges Labyrinths..."
                  value={extQuery}
                  onChange={(e) => setExtQuery(e.target.value)}
                />
                <button type="submit" className="btn-secondary">
                  {extLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {extResults.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {extResults.map((r) => (
                  <div
                    key={r.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.65rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.83rem'
                    }}
                  >
                    <div>
                      <strong>{r.title}</strong> — {r.author} {r.year && `(${r.year})`}
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() =>
                        logExternalReading({
                          title: r.title,
                          author: r.author,
                          slotKey: extCustomSlot
                        })
                      }
                    >
                      Log &amp; Credit
                    </button>
                  </div>
                ))}
              </div>
            )}

            <hr style={{ border: 0, borderTop: '1px solid var(--border-subtle)', margin: '1rem 0' }} />

            <div className="form-field">
              <label>Or Quick-Add Custom Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="Story / Poem / Essay Title"
                value={extCustomTitle}
                onChange={(e) => setExtCustomTitle(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Author Name"
                value={extCustomAuthor}
                onChange={(e) => setExtCustomAuthor(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button className="btn-secondary" onClick={() => setShowExternalModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  logExternalReading({
                    title: extCustomTitle,
                    author: extCustomAuthor,
                    slotKey: extCustomSlot
                  })
                }
              >
                Log to Library &amp; Credit Streak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE & ELEVENREADER SETTINGS MODAL (watersnathan1@gmail.com) */}
      {showProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', marginTop: 0 }}>
              Reader Profile &amp; ElevenReader Settings
            </h3>

            <div className="form-field">
              <label>Profile Name</label>
              <input
                type="text"
                className="form-input"
                value={userState.profile.name}
                onChange={(e) =>
                  setUserState((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, name: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-field">
              <label>Account Email</label>
              <input
                type="email"
                className="form-input"
                value={userState.profile.email}
                onChange={(e) =>
                  setUserState((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, email: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-field">
              <label>
                ElevenReader Session Token (<code>ELEVENREADER_TOKEN</code> — Optional Power-User
                Queue Push)
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Paste optional ElevenReader bearer token..."
                value={userState.profile.elevenReaderToken}
                onChange={(e) =>
                  setUserState((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, elevenReaderToken: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={userState.profile.includeAnalysisInEpub !== false}
                  onChange={(e) =>
                    setUserState((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, includeAnalysisInEpub: e.target.checked }
                    }))
                  }
                />
                Include 5-Paragraph Literary &amp; Cultural Analysis at the end of EPUB exports
              </label>
            </div>

            {userState.externalLogs.length > 0 && (
              <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Logged External Readings ({userState.externalLogs.length})
                </label>
                {userState.externalLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.35rem 0',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    Night {log.night} ({log.slotKey}): <strong>{log.title}</strong> — {log.author}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
              <button className="btn-primary" onClick={() => setShowProfileModal(false)}>
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-banner" role="status">
          <Sparkles size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  night,
  slotKey,
  slotNumber,
  item,
  completed,
  onOpenReader,
  onToggleComplete,
  onSwap,
  onDownloadEpub,
  onShareElevenReader
}) {
  if (!item) return null;
  return (
    <article className={`slot-card ${completed ? 'completed' : ''}`}>
      <div>
        <div className="slot-header">
          <span className="slot-badge">{slotNumber}</span>
          <div className="slot-meta-row">
            <Clock size={13} />
            <span>{item.readingTimeMinutes} min</span>
            {item.wordCount ? <span>• {item.wordCount.toLocaleString()} words</span> : null}
            {item.lineCount ? <span>• {item.lineCount} lines</span> : null}
          </div>
        </div>

        <h3 className="slot-title" onClick={onOpenReader}>
          {item.title}
        </h3>
        <p className="slot-author">
          {item.author} • {item.year} ({item.era})
        </p>

        {item.epigraph && <p className="slot-epigraph">{item.epigraph}</p>}

        <div className="slot-tags">
          <span className="slot-tag">{item.genre}</span>
          <span className="slot-tag">
            + {item.analysis?.length || 5}-Paragraph Literary Analysis
          </span>
          {item.standardEbooksUrl && (
            <a
              href={item.standardEbooksUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="slot-tag"
              style={{ textDecoration: 'none', color: 'var(--accent-gold)' }}
            >
              Standard Ebooks ↗
            </a>
          )}
        </div>
      </div>

      <div className="slot-footer">
        <div className="slot-actions">
          <button
            id={`read-${slotKey}-night-${night}`}
            className="btn-primary"
            onClick={onOpenReader}
          >
            <BookOpen size={14} />
            Read + Analysis
          </button>

          <button
            className="icon-btn"
            onClick={onShareElevenReader}
            title="Share Clean Reader URL to ElevenReader (iOS/Android/Web)"
          >
            <Share2 size={14} />
            ElevenReader
          </button>

          <button
            className="icon-btn"
            onClick={onDownloadEpub}
            title="Download .epub with 5-paragraph analysis for ElevenReader Chrome Extension"
          >
            <Download size={14} />
            .epub
          </button>

          <button
            className="icon-btn"
            onClick={onSwap}
            title="Swap Tonight's Pick (Different Genre / Pre-Baked Pool)"
          >
            <RefreshCw size={13} />
            Swap
          </button>
        </div>

        <button
          id={`complete-${slotKey}-night-${night}`}
          className={`check-btn ${completed ? 'done' : ''}`}
          onClick={onToggleComplete}
        >
          {completed ? (
            <>
              <CheckCircle2 size={15} />
              Done
            </>
          ) : (
            <>
              <Circle size={15} />
              Done
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function PlaceSlotCard({
  night,
  slotKey,
  badgeText,
  badgeClass,
  item,
  completed,
  onOpenReader,
  onToggleComplete,
  onDownloadEpub,
  onShareElevenReader
}) {
  if (!item) return null;
  return (
    <article className={`slot-card ${completed ? 'completed' : ''}`}>
      <div>
        <div className="slot-header">
          <span className={`slot-badge ${badgeClass}`}>{badgeText}</span>
          <div className="slot-meta-row">
            <Clock size={13} />
            <span>{item.readingTimeMinutes} min</span>
            {item.wordCount ? <span>• {item.wordCount.toLocaleString()} words</span> : null}
          </div>
        </div>

        <h3 className="slot-title" onClick={onOpenReader}>
          {item.title}
        </h3>
        <p className="slot-author">
          {item.subtitle} • {item.era}
        </p>

        {item.epigraph && <p className="slot-epigraph">{item.epigraph}</p>}

        <div className="slot-tags">
          <span className="slot-tag">{item.category}</span>
          {item.location && (
            <span className="slot-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} />
              {item.location}
            </span>
          )}
          <span className="slot-tag">+ 5-Paragraph Cultural Analysis</span>
        </div>
      </div>

      <div className="slot-footer">
        <div className="slot-actions">
          <button
            id={`read-${slotKey}-night-${night}`}
            className="btn-primary"
            onClick={onOpenReader}
          >
            <BookOpen size={14} />
            Read Story + Analysis
          </button>

          <button
            className="icon-btn"
            onClick={onShareElevenReader}
            title="Share Clean Reader URL to ElevenReader"
          >
            <Share2 size={14} />
            ElevenReader
          </button>

          <button
            className="icon-btn"
            onClick={onDownloadEpub}
            title="Download .epub for ElevenReader"
          >
            <Download size={14} />
            .epub
          </button>
        </div>

        <button
          id={`complete-${slotKey}-night-${night}`}
          className={`check-btn ${completed ? 'done' : ''}`}
          onClick={onToggleComplete}
        >
          {completed ? (
            <>
              <CheckCircle2 size={15} />
              Done
            </>
          ) : (
            <>
              <Circle size={15} />
              Done
            </>
          )}
        </button>
      </div>
    </article>
  );
}
