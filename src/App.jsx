import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import poemsAndEssays from './data/poemsAndEssays.json';
import storiesAndPlaces from './data/storiesAndPlaces.json';
import { buildEpubBlob, downloadEpubBlob } from './utils/epubGenerator.js';
import {
  MAIN_CATEGORIES,
  buildNormalizedCatalog,
  getSubcategoriesForCategory,
  filterAndPartitionItems,
  computeStreakStats,
  getNextRecommendedPillar,
  markItemCompletedState
} from './utils/catalogEngine.js';
import { formatFullPlainTextForElevenReader } from './utils/plainTextFormatter.js';
import TopBar from './components/TopBar.jsx';
import BottomNav from './components/BottomNav.jsx';
import CategoryDeck from './components/CategoryDeck.jsx';
import ReadingOptionCard from './components/ReadingOptionCard.jsx';
import ReaderView from './components/ReaderView.jsx';
import StreakCelebrationBanner from './components/StreakCelebrationBanner.jsx';
import {
  ExternalBookModal,
  ProfileSettingsModal,
  PwaInstallModal
} from './components/Modals.jsx';

const STORAGE_KEY = 'bradbury_1000_user_state_v2';

const THEME_COLORS = {
  parchment: '#fbf8f1',
  sepia: '#f3ead8',
  nocturnal: '#1b1714'
};

const DEFAULT_USER_STATE = {
  profile: {
    name: 'Nathan Waters',
    email: 'watersnathan1@gmail.com',
    elevenReaderToken: '',
    includeAnalysisInEpub: true,
    theme: 'parchment',
    readerFontScale: 100,
    readerLineHeight: 'relaxed'
  },
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

export default function App() {
  const [userState, setUserState] = useState(() => loadState());
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    return ['poem', 'story', 'essay', 'personal'].includes(cat) ? cat : 'story';
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [activeReader, setActiveReader] = useState(null);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [toast, setToast] = useState(null);

  const showToastMessage = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    const theme = userState.profile.theme || 'parchment';
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.getElementById('theme-color-meta');
    if (metaTheme) {
      metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.parchment);
    }
  }, [userState.profile.theme]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    saveState(userState);
  }, [userState]);

  const allItemsByCategory = useMemo(
    () => buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces),
    []
  );

  // Support URL hash / path routing for clean reader links
  useEffect(() => {
    const parseLocationForReader = () => {
      const pathMatch = window.location.pathname.match(/\/read\/day-(\d+)\/([a-z]+)/i);
      const hashMatch = window.location.hash.match(/#\/?read\/day-(\d+)\/([a-z]+)/i);
      const match = pathMatch || hashMatch;
      if (match) {
        const nightNum = Math.max(1, Math.min(100, parseInt(match[1], 10) || 1));
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

  const streakStats = useMemo(
    () =>
      computeStreakStats(
        allItemsByCategory,
        userState.completedItems,
        userState.externalLogs
      ),
    [allItemsByCategory, userState.completedItems, userState.externalLogs]
  );

  const unreadCounts = useMemo(
    () => ({
      poem: allItemsByCategory.poem.filter((i) => !userState.completedItems[i.id]?.completed)
        .length,
      story: allItemsByCategory.story.filter((i) => !userState.completedItems[i.id]?.completed)
        .length,
      essay: allItemsByCategory.essay.filter((i) => !userState.completedItems[i.id]?.completed)
        .length,
      personal: allItemsByCategory.personal.filter(
        (i) => !userState.completedItems[i.id]?.completed
      ).length
    }),
    [allItemsByCategory, userState.completedItems]
  );

  const subcategories = useMemo(
    () => getSubcategoriesForCategory(allItemsByCategory, selectedCategory),
    [allItemsByCategory, selectedCategory]
  );

  const { unreadItems, completedCategoryItems } = useMemo(
    () =>
      filterAndPartitionItems(
        allItemsByCategory,
        selectedCategory,
        selectedSubcategory,
        userState.completedItems
      ),
    [allItemsByCategory, selectedCategory, selectedSubcategory, userState.completedItems]
  );

  function handleSelectCategory(catKey) {
    setSelectedCategory(catKey);
    setSelectedSubcategory('All');
    if (activeReader) {
      closeReader();
    }
  }

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
    showToastMessage(
      `Downloaded "${item.title}.epub" (with 5-paragraph analysis) for ElevenReader!`
    );
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

  function markItemCompleted(item, source = 'elevenreader') {
    setUserState((prev) => {
      const nextState = {
        ...prev,
        completedItems: markItemCompletedState(prev.completedItems, item, source)
      };
      saveState(nextState);
      return nextState;
    });
  }

  async function handleElevenReaderShare(item, mode = 'text') {
    const includeAnalysis = userState.profile.includeAnalysisInEpub !== false;
    const fullTextPayload = formatFullPlainTextForElevenReader(item, includeAnalysis);

    if (mode === 'epub' && navigator.share && navigator.canShare) {
      try {
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
        const file = new File([blob], `${safeSlug}.epub`, {
          type: 'application/epub+zip'
        });
        if (navigator.canShare({ files: [file] })) {
          const sharePromise = navigator.share({
            title: `${item.title} — ${item.author || item.region}`,
            files: [file]
          });
          markItemCompleted(item, 'elevenreader-epub');
          await sharePromise;
          showToastMessage(
            `Shared "${item.title}.epub" to ElevenReader & marked as completed!`
          );
          return;
        }
      } catch {
        // fall through to text share
      }
    }

    if (navigator.share) {
      try {
        const sharePromise = navigator.share({
          title: `${item.title} — ${item.author || item.region}`,
          text: fullTextPayload
        });
        markItemCompleted(item, 'elevenreader');
        await sharePromise;
        showToastMessage(
          `Sent "${item.title}" to ElevenReader & marked as completed!`
        );
        return;
      } catch {
        // user canceled or desktop fallback — ensure item is still marked completed
        markItemCompleted(item, 'elevenreader');
      }
    }

    markItemCompleted(item, 'elevenreader');

    try {
      await navigator.clipboard.writeText(fullTextPayload);
      showToastMessage(
        `Sent "${item.title}" to ElevenReader (copied full text) & marked as completed!`
      );
    } catch {
      const cleanUrl = `${window.location.origin}${item.staticUrl || ''}`;
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
      showToastMessage(`Opened "${item.title}" for ElevenReader & marked as completed!`);
    }
  }

  function logExternalReading({ title, author, slotKey }) {
    if (!title || !title.trim()) return;
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
    setShowExternalModal(false);
    showToastMessage(`Logged "${title}" to your permanent library & credited your streak!`);
  }

  function handleToggleTheme() {
    setUserState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        theme: prev.profile.theme === 'nocturnal' ? 'parchment' : 'nocturnal'
      }
    }));
  }

  function handleUpdateProfile(patch) {
    setUserState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch }
    }));
  }

  const currentCategoryLabel =
    MAIN_CATEGORIES.find((c) => c.key === selectedCategory)?.label || 'Reading';

  return (
    <div className="app-root">
      <TopBar
        streakStats={streakStats}
        theme={userState.profile.theme}
        onToggleTheme={handleToggleTheme}
        onCloseReader={closeReader}
        onDownloadUnreadBundle={handleDownloadUnreadNightBundle}
        onOpenExternalModal={() => setShowExternalModal(true)}
        onOpenProfileModal={() => setShowProfileModal(true)}
      />

      <main className="page-shell">
        {activeReader ? (
          <ReaderView
            activeReader={activeReader}
            isCompleted={Boolean(userState.completedItems[activeReader.item.id]?.completed)}
            profile={userState.profile}
            onUpdateProfile={handleUpdateProfile}
            onCloseReader={closeReader}
            onShareElevenReader={handleElevenReaderShare}
            onDownloadEpub={handleDownloadSingleEpub}
            onToggleComplete={toggleItemCompleted}
          />
        ) : (
          <>
            <CategoryDeck
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              subcategories={subcategories}
              allItemsByCategory={allItemsByCategory}
              completedItems={userState.completedItems}
              streakStats={streakStats}
              onSelectCategory={handleSelectCategory}
              onSelectSubcategory={setSelectedSubcategory}
              onOpenPwaModal={() => setShowPwaModal(true)}
            />

            <StreakCelebrationBanner
              streakStats={streakStats}
              nextRecommendation={getNextRecommendedPillar(
                allItemsByCategory,
                userState.completedItems
              )}
              onJumpToRecommendation={(rec) => {
                if (rec?.categoryKey) {
                  handleSelectCategory(rec.categoryKey);
                }
              }}
            />

            {/* UNREAD OPTIONS SECTION */}
            <section className="options-section" aria-label="Unread Reading Options">
              <div className="section-heading-row">
                <h3 className="section-heading-title">
                  Unread {currentCategoryLabel} Options ({unreadItems.length})
                </h3>
                {selectedSubcategory !== 'All' && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setSelectedSubcategory('All')}
                  >
                    Showing &ldquo;{selectedSubcategory}&rdquo; • Reset to All
                  </button>
                )}
              </div>

              {unreadItems.length === 0 ? (
                <div className="empty-filter-card">
                  <p>
                    You&rsquo;ve completed every reading in this genre filter! Switch to{' '}
                    <strong>All</strong> or pick another category above.
                  </p>
                </div>
              ) : (
                <div className="quartet-grid" id="unread-options-grid">
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
                className="completed-section"
                id="completed-options-section"
                aria-label="Completed Reading Options"
              >
                <div className="section-heading-row">
                  <h3 className="section-heading-title muted">
                    Completed ({completedCategoryItems.length})
                  </h3>
                  <span className="completed-hint">
                    Already read — tap any card to re-read or uncheck
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

      {!activeReader && (
        <BottomNav
          selectedCategory={selectedCategory}
          activeReader={activeReader}
          unreadCounts={unreadCounts}
          onSelectCategory={handleSelectCategory}
          onDownloadUnreadBundle={handleDownloadUnreadNightBundle}
        />
      )}

      {showExternalModal && (
        <ExternalBookModal
          onClose={() => setShowExternalModal(false)}
          onLogExternalReading={logExternalReading}
        />
      )}

      {showProfileModal && (
        <ProfileSettingsModal
          profile={userState.profile}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showPwaModal && (
        <PwaInstallModal
          deferredPrompt={deferredPrompt}
          onTriggerInstall={async () => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
            }
            setShowPwaModal(false);
          }}
          onClose={() => setShowPwaModal(false)}
        />
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
