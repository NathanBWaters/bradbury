import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Award,
  Snowflake,
  BookOpen,
  Download,
  Share2,
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
  Check,
  Feather,
  ScrollText
} from 'lucide-react';
import poemsAndEssays from './data/poemsAndEssays.json';
import storiesAndPlaces from './data/storiesAndPlaces.json';
import { buildEpubBlob, downloadEpubBlob } from './utils/epubGenerator.js';

const STORAGE_KEY = 'bradbury_1000_user_state_v2';

const DEFAULT_USER_STATE = {
  profile: {
    name: 'Nathan Waters',
    email: 'watersnathan1@gmail.com',
    elevenReaderToken: '',
    includeAnalysisInEpub: true,
    theme: 'parchment'
  },
  // Map of item.id -> { completed: true, completedAt: ISOString, categoryKey: 'poem' | 'story' | 'essay' | 'personal' }
  completedItems: {},
  externalLogs: []
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_STATE,
      ...parsed,
      profile: { ...DEFAULT_USER_STATE.profile, ...(parsed.profile || {}) },
      completedItems: { ...(parsed.completedItems || {}) },
      externalLogs: Array.isArray(parsed.externalLogs) ? parsed.externalLogs : []
    };
  } catch {
    return DEFAULT_USER_STATE;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

const MAIN_CATEGORIES = [
  {
    key: 'poem',
    label: 'Poem',
    subtitle: 'Classic Unabridged Verse + 5-Para Analysis',
    icon: Feather
  },
  {
    key: 'story',
    label: 'Short Story',
    subtitle: 'Verbatim Canonical Fiction + 5-Para Analysis',
    icon: BookOpen
  },
  {
    key: 'essay',
    label: 'Essay',
    subtitle: 'Verbatim Classical Essays + 5-Para Commentary',
    icon: ScrollText
  },
  {
    key: 'personal',
    label: 'Personal (Korea & SF)',
    subtitle: '10 Korea & 10 San Francisco Deep-Dives + Real Sources',
    icon: Compass
  }
];

export default function App() {
  const [userState, setUserState] = useState(() => loadState());
  const [selectedCategory, setSelectedCategory] = useState('story'); // 'poem' | 'story' | 'essay' | 'personal'
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [activeReader, setActiveReader] = useState(null); // { item, categoryKey, slotLabel }
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
    }, 4000);
  };

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      userState.profile.theme === 'nocturnal' ? 'nocturnal' : 'parchment'
    );
  }, [userState.profile.theme]);

  useEffect(() => {
    saveState(userState);
  }, [userState]);

  // Reset genre subcategory filter to 'All' when switching main category
  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    setSelectedSubcategory('All');
    if (activeReader) {
      closeReader();
    }
  };

  // Normalize all pools with clean genre subcategories
  const allItemsByCategory = useMemo(() => {
    const poems = (poemsAndEssays.poems || []).map((p, idx) => ({
      ...p,
      categoryKey: 'poem',
      slotLabel: 'Poem',
      nightNumber: p.night || idx + 1,
      staticUrl: `/read/day-${p.night || ((idx % 10) + 1)}/poem`,
      subcategory: p.genre || p.era || 'Lyric Poetry'
    }));

    const stories = (storiesAndPlaces.stories || []).map((s, idx) => ({
      ...s,
      categoryKey: 'story',
      slotLabel: 'Short Story',
      nightNumber: s.night || idx + 1,
      staticUrl: `/read/day-${s.night || ((idx % 10) + 1)}/story`,
      subcategory: s.genre || s.era || 'Literary Fiction'
    }));

    const essays = (poemsAndEssays.essays || []).map((e, idx) => ({
      ...e,
      categoryKey: 'essay',
      slotLabel: 'Essay',
      nightNumber: e.night || idx + 1,
      staticUrl: `/read/day-${e.night || ((idx % 10) + 1)}/essay`,
      subcategory: e.genre || e.era || 'Classical Essay'
    }));

    const korea = (storiesAndPlaces.koreaStories || []).map((k, idx) => ({
      ...k,
      categoryKey: 'personal',
      slotLabel: 'Korea Deep-Dive',
      nightNumber: k.night || idx + 1,
      staticUrl: `/read/day-${k.night || idx + 1}/korea`,
      subcategory: `Korea • ${k.category || 'History & Culture'}`,
      regionGroup: 'Korea'
    }));

    const sf = (storiesAndPlaces.sfStories || []).map((s, idx) => ({
      ...s,
      categoryKey: 'personal',
      slotLabel: 'San Francisco Deep-Dive',
      nightNumber: s.night || idx + 1,
      staticUrl: `/read/day-${s.night || idx + 1}/sf`,
      subcategory: `San Francisco • ${s.category || 'History & Culture'}`,
      regionGroup: 'San Francisco'
    }));

    // Interleave Korea and SF 1..10 so both appear equally
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
  }, []);

  // Support URL hash / path routing for clean reader links
  useEffect(() => {
    const parseLocationForReader = () => {
      const pathMatch = window.location.pathname.match(/\/read\/day-(\d+)\/([a-z]+)/i);
      const hashMatch = window.location.hash.match(/#\/?read\/day-(\d+)\/([a-z]+)/i);
      const match = pathMatch || hashMatch;
      if (match) {
        const nightNum = Math.max(1, Math.min(10, parseInt(match[1], 10) || 1));
        const slotKey = match[2].toLowerCase();
        let foundItem = null;
        if (slotKey === 'poem') {
          foundItem = allItemsByCategory.poem.find((x) => x.nightNumber === nightNum);
        } else if (slotKey === 'story') {
          foundItem = allItemsByCategory.story.find((x) => x.nightNumber === nightNum);
        } else if (slotKey === 'essay') {
          foundItem = allItemsByCategory.essay.find((x) => x.nightNumber === nightNum);
        } else if (slotKey === 'korea') {
          foundItem = allItemsByCategory.personal.find(
            (x) => x.region === 'Korea' && x.nightNumber === nightNum
          );
        } else if (slotKey === 'sf') {
          foundItem = allItemsByCategory.personal.find(
            (x) => x.region === 'San Francisco' && x.nightNumber === nightNum
          );
        }
        if (foundItem) {
          setActiveReader({
            item: foundItem,
            categoryKey: foundItem.categoryKey,
            slotLabel: foundItem.slotLabel
          });
        }
      }
    };
    parseLocationForReader();
    window.addEventListener('hashchange', parseLocationForReader);
    return () => window.removeEventListener('hashchange', parseLocationForReader);
  }, [allItemsByCategory]);

  // Compute Streak & Completion Stats across the 4 categories
  const streakStats = useMemo(() => {
    const completedEntries = Object.values(userState.completedItems || {}).filter(
      (x) => x && x.completed
    );
    const poemsDone = allItemsByCategory.poem.filter(
      (i) => userState.completedItems[i.id]?.completed
    ).length;
    const storiesDone = allItemsByCategory.story.filter(
      (i) => userState.completedItems[i.id]?.completed
    ).length;
    const essaysDone = allItemsByCategory.essay.filter(
      (i) => userState.completedItems[i.id]?.completed
    ).length;
    const personalDone = allItemsByCategory.personal.filter(
      (i) => userState.completedItems[i.id]?.completed
    ).length;

    const totalCompleted =
      poemsDone + storiesDone + essaysDone + personalDone + userState.externalLogs.length;
    const categoriesTouched = [poemsDone > 0, storiesDone > 0, essaysDone > 0, personalDone > 0].filter(
      Boolean
    ).length;

    const goldNights = Math.floor(totalCompleted / 3);
    const freezeTokens = Math.min(2, 1 + Math.floor(goldNights / 7));
    const litFlameStreak = totalCompleted > 0 ? Math.max(1, totalCompleted) : 1;

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
      litFlameStreak
    };
  }, [userState.completedItems, userState.externalLogs, allItemsByCategory]);

  // Compute Subcategories for the currently selected main category
  const availableSubcategories = useMemo(() => {
    const items = allItemsByCategory[selectedCategory] || [];
    if (selectedCategory === 'personal') {
      const cats = new Set(['All', 'Korea (All 10)', 'San Francisco (All 10)']);
      items.forEach((item) => {
        if (item.category) cats.add(item.category);
      });
      return Array.from(cats);
    }
    const genres = new Set(['All']);
    items.forEach((item) => {
      if (item.genre) genres.add(item.genre);
    });
    return Array.from(genres);
  }, [allItemsByCategory, selectedCategory]);

  // Filter items by selected subcategory, then split into Unread (top) and Completed (grayed out at bottom)
  const { unreadItems, completedCategoryItems } = useMemo(() => {
    const rawItems = allItemsByCategory[selectedCategory] || [];
    const filtered = rawItems.filter((item) => {
      if (selectedSubcategory === 'All') return true;
      if (selectedCategory === 'personal') {
        if (selectedSubcategory === 'Korea (All 10)') return item.region === 'Korea';
        if (selectedSubcategory === 'San Francisco (All 10)') return item.region === 'San Francisco';
        return item.category === selectedSubcategory;
      }
      return item.genre === selectedSubcategory;
    });

    const unread = [];
    const done = [];
    filtered.forEach((item) => {
      if (userState.completedItems[item.id]?.completed) {
        done.push(item);
      } else {
        unread.push(item);
      }
    });

    return { unreadItems: unread, completedCategoryItems: done };
  }, [allItemsByCategory, selectedCategory, selectedSubcategory, userState.completedItems]);

  function openReader(item) {
    setActiveReader({
      item,
      categoryKey: item.categoryKey,
      slotLabel: item.slotLabel
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeReader() {
    setActiveReader(null);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  function toggleItemCompleted(item) {
    setUserState((prev) => {
      const wasDone = Boolean(prev.completedItems[item.id]?.completed);
      const nextDone = !wasDone;
      const updated = {
        ...prev.completedItems,
        [item.id]: {
          completed: nextDone,
          completedAt: nextDone ? new Date().toISOString() : null,
          categoryKey: item.categoryKey
        }
      };
      if (nextDone) {
        showToastMessage(
          `Completed "${item.title}"! Moved to Completed at the bottom & credited your streak.`
        );
      } else {
        showToastMessage(`Moved "${item.title}" back to your Unread queue.`);
      }
      return {
        ...prev,
        completedItems: updated
      };
    });
  }

  function handleDownloadSingleEpub(item) {
    const includeAnalysis = userState.profile.includeAnalysisInEpub !== false;
    const blob = buildEpubBlob({
      title: `${item.title} — ${item.author || item.region}`,
      subtitle: `${item.slotLabel} • ${item.genre || item.category}`,
      author: item.author || `${item.region} Cultural Chronicle`,
      uid: `urn:bradbury1000:item:${item.id}`,
      includeAnalysis,
      chapters: [{ slotLabel: item.slotLabel, item }]
    });
    const safeSlug = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    downloadEpubBlob(blob, `bradbury-${item.id}-${safeSlug}.epub`);
    showToastMessage(`Downloaded "${item.title}.epub" (with 5-paragraph analysis) for ElevenReader!`);
  }

  function handleDownloadUnreadNightBundle() {
    const nextPoem =
      allItemsByCategory.poem.find((i) => !userState.completedItems[i.id]?.completed) ||
      allItemsByCategory.poem[0];
    const nextStory =
      allItemsByCategory.story.find((i) => !userState.completedItems[i.id]?.completed) ||
      allItemsByCategory.story[0];
    const nextEssay =
      allItemsByCategory.essay.find((i) => !userState.completedItems[i.id]?.completed) ||
      allItemsByCategory.essay[0];
    const nextPersonal =
      allItemsByCategory.personal.find((i) => !userState.completedItems[i.id]?.completed) ||
      allItemsByCategory.personal[0];

    const chapters = [
      { slotLabel: 'Poem', item: nextPoem },
      { slotLabel: 'Short Story', item: nextStory },
      { slotLabel: 'Essay', item: nextEssay },
      { slotLabel: `Personal (${nextPersonal.region})`, item: nextPersonal }
    ].filter((c) => c.item);

    const blob = buildEpubBlob({
      title: `Bradbury 1000 — Next Unread Quartet (.epub)`,
      subtitle: `1 Poem, 1 Short Story, 1 Essay & 1 Personal (${nextPersonal?.region}) Story + 5-Paragraph Analyses`,
      author: 'Bradbury 1000 Curated Anthology',
      uid: `urn:bradbury1000:next-quartet-${Date.now()}`,
      includeAnalysis: userState.profile.includeAnalysisInEpub !== false,
      chapters
    });
    downloadEpubBlob(blob, `bradbury-1000-tonights-unread-quartet.epub`);
    showToastMessage(
      `Bundled your next unread Poem, Short Story, Essay & ${nextPersonal?.region} story into one .epub!`
    );
  }

  async function handleElevenReaderShare(item) {
    const cleanUrl = `${window.location.origin}${item.staticUrl || ''}`;
    const shareData = {
      title: `${item.title} — Bradbury 1000`,
      text: `Read or listen to "${item.title}" (${item.author || item.region}) on Bradbury 1000.`,
      url: cleanUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToastMessage(`Opened native Share Sheet for ElevenReader handoff!`);
        return;
      } catch {
        // fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(cleanUrl);
      showToastMessage(`Copied clean ElevenReader article URL (${cleanUrl}) to clipboard!`);
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
      slotKey,
      title: title.trim(),
      author: (author || 'External Anthology').trim(),
      loggedAt: new Date().toISOString()
    };
    setUserState((prev) => ({
      ...prev,
      externalLogs: [entry, ...prev.externalLogs]
    }));
    setExtCustomTitle('');
    setExtCustomAuthor('');
    setShowExternalModal(false);
    showToastMessage(`Logged "${title}" to your permanent library & credited your streak!`);
  }

  return (
    <div>
      {/* Top Editorial Masthead with Streak & Profile */}
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand-group">
            <h1
              className="brand-title"
              id="brand-home-link"
              onClick={() => closeReader()}
            >
              Bradbury 1000
            </h1>
            <span className="brand-subtitle">
              Poem • Short Story • Essay • Personal (Korea &amp; SF)
            </span>
          </div>

          {/* Duolingo-Style Streak Bar */}
          <div className="streak-cluster">
            <div
              className="streak-pill flame"
              title="Lit Flame Streak: Complete at least 1 reading to keep your daily flame lit"
            >
              <Flame size={15} />
              <span>{streakStats.litFlameStreak} Flame Streak</span>
            </div>
            <div
              className="streak-pill gold"
              title="Gold Bradbury Nights: Every 3 completed readings earns a Gold Night toward 1,000"
            >
              <Award size={15} />
              <span>{streakStats.goldNights} / 1000 Gold Nights</span>
            </div>
            <div
              className="streak-pill freeze"
              title="Streak Freeze Vault (max 2 held, +1 every 7 Gold Nights)"
            >
              <Snowflake size={14} />
              <span>
                {streakStats.freezeTokens}/{streakStats.maxFreezeTokens} Freezes
              </span>
            </div>

            <button
              id="bundle-next-quartet-btn"
              className="btn-secondary"
              style={{ padding: '0.38rem 0.72rem', fontSize: '0.78rem' }}
              onClick={handleDownloadUnreadNightBundle}
              title="Bundle your next unread Poem, Short Story, Essay & Personal Story into one .epub for ElevenReader"
            >
              <Download size={14} />
              Bundle Next Quartet (.epub)
            </button>

            <button
              id="log-external-book-btn"
              className="icon-btn"
              onClick={() => setShowExternalModal(true)}
              title="Log an external book or story"
            >
              <PlusCircle size={15} />
              <span>Log Book</span>
            </button>

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
        {activeReader ? (
          /* DISTRACTION-FREE READER VIEW WITH 5-PARAGRAPH ANALYSIS & REAL SOURCES */
          <div className="reader-container">
            <div className="reader-toolbar">
              <button id="reader-back-btn" className="btn-secondary" onClick={closeReader}>
                <ArrowLeft size={15} />
                Back to {activeReader.slotLabel} Queue
              </button>

              <div className="slot-actions">
                <button
                  id="reader-elevenreader-share-btn"
                  className="btn-secondary"
                  onClick={() => handleElevenReaderShare(activeReader.item)}
                >
                  <Headphones size={15} />
                  Listen in ElevenReader
                </button>

                <button
                  id="reader-download-epub-btn"
                  className="btn-secondary"
                  onClick={() => handleDownloadSingleEpub(activeReader.item)}
                >
                  <Download size={15} />
                  Send .EPUB to ElevenReader
                </button>

                {activeReader.item.staticUrl && (
                  <a
                    href={activeReader.item.staticUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-btn"
                    title="Open raw static HTML Reader URL for ElevenReader URL Import"
                  >
                    <ExternalLink size={14} />
                    Clean URL
                  </a>
                )}

                <button
                  id="reader-mark-complete-btn"
                  className={`check-btn ${
                    userState.completedItems[activeReader.item.id]?.completed ? 'done' : ''
                  }`}
                  onClick={() => toggleItemCompleted(activeReader.item)}
                >
                  {userState.completedItems[activeReader.item.id]?.completed ? (
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
                {activeReader.slotLabel} • {activeReader.item.genre || activeReader.item.category}
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

              {/* Verbatim Full Text */}
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

              {/* Primary & Historical Sources for Korea & San Francisco Deep-Dives */}
              {Array.isArray(activeReader.item.sources) &&
                activeReader.item.sources.length > 0 && (
                  <section
                    className="analysis-panel"
                    id="historical-sources-panel"
                    style={{ marginTop: '2rem', paddingTop: '1.75rem' }}
                  >
                    <div className="analysis-header">
                      <div>
                        <div className="reader-kicker">Verified Archival &amp; Scholarly Citations</div>
                        <h2 className="analysis-title">Primary &amp; Historical Sources</h2>
                      </div>
                      <span className="slot-tag">
                        {activeReader.item.sources.length} Real Sources Cited
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {activeReader.item.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="analysis-paragraph-card"
                          style={{ marginBottom: 0, padding: '0.95rem 1.2rem' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              gap: '0.75rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <strong style={{ fontSize: '0.95rem' }}>{src.title}</strong>
                            {src.url && (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--accent-flame)',
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                Source Reference ↗
                              </a>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              color: 'var(--text-secondary)',
                              marginTop: '0.25rem'
                            }}
                          >
                            {src.author} {src.year ? `• ${src.year}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

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
                      Original Source Archive
                    </a>
                  )}
                </div>

                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!userState.completedItems[activeReader.item.id]?.completed) {
                      toggleItemCompleted(activeReader.item);
                    }
                    closeReader();
                  }}
                >
                  <Check size={16} />
                  {userState.completedItems[activeReader.item.id]?.completed
                    ? 'Completed — Back to Queue'
                    : 'Mark Read & Credit Streak'}
                </button>
              </div>
            </article>
          </div>
        ) : (
          /* HOME PAGE: STREAK HERO + 4-PILLAR PICKER + GENRE SUBCATEGORIES + UNREAD vs GRAYED COMPLETED */
          <>
            {/* Streak & Question Hero */}
            <section className="ritual-hero">
              <div className="ritual-hero-top">
                <div style={{ flex: '1 1 500px' }}>
                  <div className="night-eyebrow">
                    <span>Bradbury 1,000 Nights • {streakStats.totalCompleted} Total Readings Completed</span>
                  </div>
                  <h2 className="ritual-headline">What would you like to read tonight?</h2>
                  <p className="ritual-quote">
                    Choose a pillar below—<strong>Poem</strong>, <strong>Short Story</strong>,{' '}
                    <strong>Essay</strong>, or <strong>Personal (Korea &amp; San Francisco)</strong>—and
                    filter by genre. Unread picks appear first; completed readings are grayed out at
                    the bottom.
                  </p>
                </div>

                {/* Duolingo Streak Summary Card */}
                <div className="tier-meter-card">
                  <div className="tier-meter-header">
                    <span>🔥 {streakStats.litFlameStreak}d Streak • {streakStats.goldNights} Gold Nights</span>
                    <span>{streakStats.totalCompleted} Read</span>
                  </div>
                  <div className="tier-steps">
                    {[
                      { label: 'Poems', count: streakStats.poemsDone },
                      { label: 'Stories', count: streakStats.storiesDone },
                      { label: 'Essays', count: streakStats.essaysDone },
                      { label: 'Personal', count: streakStats.personalDone }
                    ].map((p, idx) => (
                      <div
                        key={idx}
                        className={`tier-step-bar ${p.count > 0 ? 'filled-gold' : ''}`}
                        title={`${p.label}: ${p.count} completed`}
                      />
                    ))}
                  </div>
                  <div className="tier-caption">
                    <span>Poems: {streakStats.poemsDone}</span>
                    <span>Stories: {streakStats.storiesDone}</span>
                    <span>Essays: {streakStats.essaysDone}</span>
                    <span>Korea/SF: {streakStats.personalDone}</span>
                  </div>
                </div>
              </div>

              {/* 4-Pillar Selector Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.85rem',
                  marginTop: '1.35rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}
                role="tablist"
                aria-label="Choose reading category"
              >
                {MAIN_CATEGORIES.map((cat) => {
                  const IconComp = cat.icon;
                  const isActive = selectedCategory === cat.key;
                  const catItems = allItemsByCategory[cat.key] || [];
                  const unreadCount = catItems.filter(
                    (i) => !userState.completedItems[i.id]?.completed
                  ).length;
                  const doneCount = catItems.length - unreadCount;

                  return (
                    <button
                      key={cat.key}
                      id={`pick-category-${cat.key}`}
                      onClick={() => handleSelectCategory(cat.key)}
                      style={{
                        textAlign: 'left',
                        padding: '1rem 1.15rem',
                        borderRadius: 'var(--radius-md)',
                        border: isActive
                          ? '2px solid var(--text-primary)'
                          : '1px solid var(--border-subtle)',
                        background: isActive ? 'var(--bg-primary)' : 'var(--bg-elevated)',
                        boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.45rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%'
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.45rem',
                            color: 'var(--text-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <IconComp size={18} />
                          {cat.label}
                        </span>
                        <span
                          className="slot-badge"
                          style={{
                            background: isActive ? 'var(--text-primary)' : 'var(--bg-subtle)',
                            color: isActive ? 'var(--bg-elevated)' : 'var(--text-secondary)'
                          }}
                        >
                          {unreadCount} Unread
                        </span>
                      </div>
                      <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                        {cat.subtitle}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {doneCount} completed • {catItems.length} total
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Subcategory / Genre Filter Pills */}
              <div
                className="night-selector-bar"
                style={{ marginTop: '1rem', paddingTop: '1rem' }}
                role="tablist"
                aria-label="Filter by Genre or Subcategory"
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.73rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    marginRight: '0.35rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Genre / Subcategory:
                </span>
                {availableSubcategories.map((sub) => (
                  <button
                    key={sub}
                    className={`night-chip ${selectedSubcategory === sub ? 'active' : ''}`}
                    onClick={() => setSelectedSubcategory(sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </section>

            {/* UNREAD OPTIONS SECTION */}
            <section style={{ marginBottom: '2.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.65rem',
                    fontWeight: 400,
                    margin: 0
                  }}
                >
                  Unread {MAIN_CATEGORIES.find((c) => c.key === selectedCategory)?.label} Options (
                  {unreadItems.length})
                </h3>
                {selectedSubcategory !== 'All' && (
                  <button
                    className="icon-btn"
                    onClick={() => setSelectedSubcategory('All')}
                  >
                    Showing "{selectedSubcategory}" • Reset to All
                  </button>
                )}
              </div>

              {unreadItems.length === 0 ? (
                <div
                  className="ritual-hero"
                  style={{ textAlign: 'center', padding: '2.25rem' }}
                >
                  <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    You’ve completed every reading in this genre filter! Switch to{' '}
                    <strong>All</strong> or pick another category above.
                  </p>
                </div>
              ) : (
                <div className="quartet-grid">
                  {unreadItems.map((item) => (
                    <ReadingOptionCard
                      key={item.id}
                      item={item}
                      completed={false}
                      onOpenReader={() => openReader(item)}
                      onToggleComplete={() => toggleItemCompleted(item)}
                      onDownloadEpub={() => handleDownloadSingleEpub(item)}
                      onShareElevenReader={() => handleElevenReaderShare(item)}
                      onSelectGenre={(g) => setSelectedSubcategory(g)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* COMPLETED (GRAYED OUT AT THE BOTTOM) SECTION */}
            {completedCategoryItems.length > 0 && (
              <section
                style={{
                  marginTop: '2.5rem',
                  paddingTop: '1.75rem',
                  borderTop: '1px dashed var(--border-strong)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '1rem'
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.45rem',
                      fontWeight: 400,
                      margin: 0,
                      color: 'var(--text-muted)'
                    }}
                  >
                    Completed ({completedCategoryItems.length})
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Already read — click any card to re-read or uncheck
                  </span>
                </div>

                <div className="quartet-grid">
                  {completedCategoryItems.map((item) => (
                    <ReadingOptionCard
                      key={item.id}
                      item={item}
                      completed={true}
                      onOpenReader={() => openReader(item)}
                      onToggleComplete={() => toggleItemCompleted(item)}
                      onDownloadEpub={() => handleDownloadSingleEpub(item)}
                      onShareElevenReader={() => handleElevenReaderShare(item)}
                      onSelectGenre={(g) => setSelectedSubcategory(g)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
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
              Library or enter it directly to credit your streak.
            </p>

            <div className="form-field">
              <label>Category</label>
              <select
                className="form-input"
                value={extCustomSlot}
                onChange={(e) => setExtCustomSlot(e.target.value)}
              >
                <option value="story">Short Story</option>
                <option value="poem">Poem</option>
                <option value="essay">Essay</option>
                <option value="personal">Personal (Korea / San Francisco)</option>
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

      {/* PROFILE & ELEVENREADER SETTINGS MODAL */}
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

function ReadingOptionCard({
  item,
  completed,
  onOpenReader,
  onToggleComplete,
  onDownloadEpub,
  onShareElevenReader,
  onSelectGenre
}) {
  if (!item) return null;

  const isKorea = item.region === 'Korea';
  const isSF = item.region === 'San Francisco';
  const genreOrCategory = item.genre || item.category;

  return (
    <article
      className={`slot-card ${completed ? 'completed-grayed' : ''}`}
      style={
        completed
          ? {
              opacity: 0.55,
              filter: 'grayscale(0.75)',
              background: 'var(--bg-subtle)'
            }
          : undefined
      }
    >
      <div>
        <div className="slot-header">
          <span
            className={`slot-badge ${isKorea ? 'korea' : isSF ? 'sf' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectGenre && onSelectGenre(genreOrCategory)}
            title="Click to filter by this genre"
          >
            {isKorea ? `🇰🇷 Korea • ${item.category}` : isSF ? `🌉 SF • ${item.category}` : genreOrCategory}
          </span>
          <div className="slot-meta-row">
            <Clock size={13} />
            <span>{item.readingTimeMinutes} min</span>
            {item.wordCount ? <span>• {item.wordCount.toLocaleString()} words</span> : null}
            {item.lineCount ? <span>• {item.lineCount} lines</span> : null}
          </div>
        </div>

        <h3
          className="slot-title"
          onClick={onOpenReader}
          style={completed ? { textDecoration: 'line-through' } : undefined}
        >
          {item.title}
        </h3>
        <p className="slot-author">
          {item.author ? (
            <>
              {item.author} • {item.year} ({item.era})
            </>
          ) : (
            <>
              {item.subtitle} • {item.era}
            </>
          )}
        </p>

        {item.epigraph && <p className="slot-epigraph">{item.epigraph}</p>}

        <div className="slot-tags">
          {item.author ? (
            <span className="slot-tag">Verbatim Unabridged Text</span>
          ) : (
            item.location && (
              <span className="slot-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} />
                {item.location}
              </span>
            )
          )}
          <span className="slot-tag">
            + {item.analysis?.length || 5}-Paragraph Analysis
          </span>
          {Array.isArray(item.sources) && item.sources.length > 0 && (
            <span className="slot-tag" style={{ color: 'var(--accent-gold)' }}>
              {item.sources.length} Real Sources Cited
            </span>
          )}
        </div>
      </div>

      <div className="slot-footer">
        <div className="slot-actions">
          <button className="btn-primary" onClick={onOpenReader}>
            <BookOpen size={14} />
            {completed ? 'Re-Read' : 'Read + Analysis'}
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
            title="Download .epub with 5-paragraph analysis for ElevenReader"
          >
            <Download size={14} />
            .epub
          </button>
        </div>

        <button
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
              Mark Done
            </>
          )}
        </button>
      </div>
    </article>
  );
}
