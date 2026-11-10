import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
import { parseLocation, categoryPath, itemPath } from './utils/router.js';
import {
  onUserChange,
  signInWithGoogle,
  signOut,
  syncablePart,
  watchProgress,
  writeProgress
} from './utils/cloud.js';
import { mergeProgress, progressKey } from './utils/progressMerge.js';
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

/** Apply a synced { completedItems, externalLogs, prefs } onto full user state. */
function applySyncable(state, synced) {
  const prefs = Object.fromEntries(
    Object.entries(synced.prefs || {}).filter(([, v]) => v !== undefined && v !== null)
  );
  return {
    ...state,
    completedItems: synced.completedItems || {},
    externalLogs: synced.externalLogs || [],
    profile: { ...state.profile, ...prefs }
  };
}

function readerFor(item) {
  return { item, categoryKey: item.categoryKey, slotLabel: item.slotLabel };
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
  const allItemsByCategory = useMemo(
    () => buildNormalizedCatalog(poemsAndEssays, storiesAndPlaces),
    []
  );
  const initialRoute = useMemo(() => parseLocation(window.location, allItemsByCategory), [allItemsByCategory]);
  const [selectedCategory, setSelectedCategory] = useState(initialRoute.categoryKey);
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [activeReader, setActiveReader] = useState(() =>
    initialRoute.item ? readerFor(initialRoute.item) : null
  );
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  // undefined = Firebase still restoring the session; null = signed out.
  const [authUser, setAuthUser] = useState(undefined);
  const [syncStatus, setSyncStatus] = useState('idle');
  const userStateRef = useRef(userState);
  userStateRef.current = userState;
  const lastSyncedKey = useRef(null);

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

  // ---- Account sign-in & cross-device progress sync ----
  useEffect(() => onUserChange((u) => setAuthUser(u)), []);

  useEffect(() => {
    lastSyncedKey.current = null;
    if (!authUser) return undefined;
    const uid = authUser.uid;
    setSyncStatus('syncing');
    let firstSnapshot = true;
    const unsubscribe = watchProgress(
      uid,
      (remote) => {
        const local = syncablePart(userStateRef.current);
        // First sync on this device: combine what's here with the account so
        // nothing read on either side is lost. Later: account wins for prefs.
        const merged = remote
          ? mergeProgress(local, remote, { preferRemotePrefs: true })
          : local;
        const mergedKey = progressKey(merged);
        lastSyncedKey.current = mergedKey;
        if (progressKey(local) !== mergedKey) {
          setUserState((prev) => applySyncable(prev, merged));
        }
        if (!remote || progressKey(remote) !== mergedKey) {
          writeProgress(uid, merged).catch(() => setSyncStatus('error'));
        }
        if (firstSnapshot && remote && progressKey(local) !== mergedKey) {
          showToastMessage('Synced your progress from your account.');
        }
        firstSnapshot = false;
        setSyncStatus('synced');
      },
      (err) => {
        console.warn('Progress sync failed', err);
        setSyncStatus('error');
      }
    );
    return unsubscribe;
  }, [authUser?.uid]);

  // Push local changes (marking a work read, logging a book, prefs) to the account.
  useEffect(() => {
    if (!authUser || lastSyncedKey.current === null) return undefined;
    const syncable = syncablePart(userState);
    const key = progressKey(syncable);
    if (key === lastSyncedKey.current) return undefined;
    const uid = authUser.uid;
    const t = setTimeout(() => {
      lastSyncedKey.current = key;
      writeProgress(uid, syncable)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'));
    }, 600);
    return () => clearTimeout(t);
  }, [userState, authUser]);

  async function handleSignIn() {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.warn('Sign-in failed', err);
      showToastMessage(`Sign-in failed: ${err?.code || err?.message || 'unknown error'}`);
    }
  }

  async function handleSignOut() {
    await signOut();
    setShowProfileModal(false);
    showToastMessage('Signed out. Progress on this device stays here until you sign in again.');
  }

  // Menu scroll position to restore once the menu has re-rendered after Back.
  const pendingMenuScroll = useRef(null);
  useLayoutEffect(() => {
    if (!activeReader && pendingMenuScroll.current !== null) {
      window.scrollTo(0, pendingMenuScroll.current);
      pendingMenuScroll.current = null;
    }
  }, [activeReader]);

  // History-API routing: every work has its own URL (/poems/poem-12), so the
  // browser / Android back button returns to the menu and forward re-opens it.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const { canonical } = parseLocation(window.location, allItemsByCategory);
    if (canonical !== window.location.pathname || window.location.hash || window.location.search) {
      window.history.replaceState(window.history.state, '', canonical);
    }
    const onPopState = (event) => {
      const route = parseLocation(window.location, allItemsByCategory);
      setSelectedCategory(route.categoryKey);
      if (route.item) {
        setActiveReader(readerFor(route.item));
        window.scrollTo(0, 0);
      } else {
        pendingMenuScroll.current = event.state?.menuScrollY || 0;
        setActiveReader(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
    setActiveReader(null);
    // Switching category tabs replaces the menu entry rather than stacking
    // history, so Back from a work always lands on the menu you came from.
    window.history.replaceState({ menuScrollY: 0 }, '', categoryPath(catKey));
    window.scrollTo(0, 0);
  }

  function openReader(item) {
    // Remember where the menu was scrolled so Back returns to the same spot.
    window.history.replaceState(
      { ...(window.history.state || {}), menuScrollY: window.scrollY },
      '',
      window.location.pathname
    );
    window.history.pushState({ openedFromMenu: true }, '', itemPath(item));
    setSelectedCategory(item.categoryKey);
    setActiveReader(readerFor(item));
    window.scrollTo(0, 0);
  }

  function closeReader() {
    if (activeReader && window.history.state?.openedFromMenu) {
      // Same as pressing the browser's Back button.
      window.history.back();
      return;
    }
    // Opened from a direct link: there is no menu entry behind us, so swap to it.
    const cat = activeReader?.categoryKey || selectedCategory;
    window.history.replaceState({ menuScrollY: 0 }, '', categoryPath(cat));
    setSelectedCategory(cat);
    setActiveReader(null);
    window.scrollTo(0, 0);
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
          categoryKey: item.categoryKey,
          updatedAt: new Date().toISOString()
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
      `Downloaded "${item.title}.epub" (with analysis) for ElevenReader!`
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
      subtitle: `1 Poem, 1 Short Story, 1 Essay & 1 Personal (${nextPersonal?.region}) Story + Analyses`,
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
        authUser={authUser}
        syncStatus={syncStatus}
        onSignIn={handleSignIn}
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
          authUser={authUser}
          syncStatus={syncStatus}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
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
