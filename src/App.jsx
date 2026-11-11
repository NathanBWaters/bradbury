import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
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
  markItemCompletedState,
  dealTonightQuartet,
  pickSurpriseItem
} from './utils/catalogEngine.js';
import { formatFullPlainTextForElevenReader } from './utils/plainTextFormatter.js';
import {
  parseLocation,
  homePath,
  tonightPath,
  chooseTypePath,
  chooseGenrePath,
  shelfPath,
  itemPath,
  journalPath
} from './utils/router.js';
import {
  onUserChange,
  signInWithGoogle,
  signOut,
  syncablePart,
  watchProgress,
  writeProgress
} from './utils/cloud.js';
import { mergeProgress, progressKey } from './utils/progressMerge.js';
import {
  playStoryCompleteSound,
  playStreakExtendedSound,
  playGoldNightSound,
  playMascotChirpSound,
  playStepPopSound,
  playUndoSound
} from './utils/soundEffects.js';
import TopBar from './components/TopBar.jsx';
import BottomNav from './components/BottomNav.jsx';
import HomeFunnelView from './components/HomeFunnelView.jsx';
import TonightQuartetView from './components/TonightQuartetView.jsx';
import ChooseTypeView from './components/ChooseTypeView.jsx';
import ChooseGenreView from './components/ChooseGenreView.jsx';
import ShelfView from './components/ShelfView.jsx';
import JournalView from './components/JournalView.jsx';
import ReaderView from './components/ReaderView.jsx';
import StreakCelebrationOverlay from './components/StreakCelebrationOverlay.jsx';
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
    readerLineHeight: 'relaxed',
    soundEnabled: true
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
  const initialRoute = useMemo(
    () => parseLocation(window.location, allItemsByCategory),
    [allItemsByCategory]
  );

  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [selectedCategory, setSelectedCategory] = useState(initialRoute.categoryKey);
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    initialRoute.subcategory || 'All'
  );
  const [activeReader, setActiveReader] = useState(() =>
    initialRoute.item ? readerFor(initialRoute.item) : null
  );

  // Deal 4 curated unread items for Tonight's Quartet and keep their IDs stable
  // during the session unless the user explicitly taps Shuffle or Swap.
  const [quartetOffsets, setQuartetOffsets] = useState({
    poem: 0,
    story: 0,
    essay: 0,
    personal: 0
  });
  const [lockedQuartetIds, setLockedQuartetIds] = useState(() => {
    const initialDeal = dealTonightQuartet(allItemsByCategory, userState.completedItems, 0);
    return Object.fromEntries(initialDeal.map((entry) => [entry.categoryKey, entry.item.id]));
  });

  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [authUser, setAuthUser] = useState(undefined);
  const [syncStatus, setSyncStatus] = useState('idle');
  const userStateRef = useRef(userState);
  userStateRef.current = userState;
  const lastSyncedKey = useRef(null);

  const soundEnabled = userState.profile.soundEnabled !== false;

  const showToastMessage = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  const dismissCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

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
  }, [authUser?.uid, showToastMessage]);

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

  // Restore scroll position on Back navigation
  const pendingScrollY = useRef(null);
  useLayoutEffect(() => {
    if (pendingScrollY.current !== null) {
      window.scrollTo(0, pendingScrollY.current);
      pendingScrollY.current = null;
    }
  }, [currentView, selectedCategory, selectedSubcategory, activeReader]);

  function applyRoute(route) {
    setCurrentView(route.view);
    setSelectedCategory(route.categoryKey);
    setSelectedSubcategory(route.subcategory || 'All');
    setActiveReader(route.item ? readerFor(route.item) : null);
  }

  function navigateTo(url, { replace = false, playPop = false } = {}) {
    setCelebration(null);
    if (playPop) {
      playStepPopSound(userStateRef.current.profile.soundEnabled !== false);
    }
    const currentFullUrl = `${window.location.pathname}${window.location.search}`;
    if (!replace && currentFullUrl === url) {
      window.scrollTo(0, 0);
      return;
    }

    if (!replace) {
      window.history.replaceState(
        { ...(window.history.state || {}), scrollY: window.scrollY },
        '',
        currentFullUrl
      );
      window.history.pushState({ fromApp: true, scrollY: 0 }, '', url);
    } else {
      window.history.replaceState(
        { ...(window.history.state || {}), scrollY: 0 },
        '',
        url
      );
    }

    const parsedUrl = new URL(url, window.location.origin);
    const nextRoute = parseLocation(parsedUrl, allItemsByCategory);
    applyRoute(nextRoute);
    window.scrollTo(0, 0);
  }

  // History-API routing across all funnel steps and reader pages
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const { canonical } = parseLocation(window.location, allItemsByCategory);
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (canonical !== currentFull || window.location.hash) {
      window.history.replaceState(window.history.state, '', canonical);
    }
    const onPopState = (event) => {
      setCelebration(null);
      const route = parseLocation(window.location, allItemsByCategory);
      pendingScrollY.current = event.state?.scrollY || 0;
      applyRoute(route);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [allItemsByCategory]);

  // Dynamic page title for SEO & browser history clarity
  useEffect(() => {
    const catLabel =
      MAIN_CATEGORIES.find((c) => c.key === selectedCategory)?.pluralLabel || 'Library';
    if (activeReader?.item) {
      document.title = `${activeReader.item.title} — Bradbury 1000`;
    } else if (currentView === 'tonight') {
      document.title = `Tonight’s Curated Four — Bradbury 1000`;
    } else if (currentView === 'choose-type') {
      document.title = `Choose a Literary Form — Bradbury 1000`;
    } else if (currentView === 'choose-genre') {
      document.title = `Choose a Genre • ${catLabel} — Bradbury 1000`;
    } else if (currentView === 'shelf') {
      const sub = selectedSubcategory !== 'All' ? `${selectedSubcategory} • ` : '';
      document.title = `${sub}${catLabel} — Bradbury 1000`;
    } else if (currentView === 'journal') {
      document.title = `Reading Ledger — Bradbury 1000`;
    } else {
      document.title = `Bradbury 1000 — Nightly Poem, Story, Essay & Korea/SF Chronicles`;
    }
  }, [currentView, selectedCategory, selectedSubcategory, activeReader]);

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
    () =>
      getSubcategoriesForCategory(
        allItemsByCategory,
        selectedCategory,
        userState.completedItems
      ),
    [allItemsByCategory, selectedCategory, userState.completedItems]
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

  const nextRecommendation = useMemo(
    () => getNextRecommendedPillar(allItemsByCategory, userState.completedItems),
    [allItemsByCategory, userState.completedItems]
  );

  const quartetEntries = useMemo(() => {
    const freshDeal = dealTonightQuartet(
      allItemsByCategory,
      userState.completedItems,
      quartetOffsets
    );
    return freshDeal.map((entry) => {
      const lockedId = lockedQuartetIds[entry.categoryKey];
      const lockedItem = lockedId
        ? (allItemsByCategory[entry.categoryKey] || []).find((x) => x.id === lockedId)
        : null;
      return {
        ...entry,
        item: lockedItem || entry.item
      };
    });
  }, [allItemsByCategory, userState.completedItems, quartetOffsets, lockedQuartetIds]);

  /**
   * Evaluates before/after Duolingo streak state and triggers the matching musical
   * fanfare + animated Folio celebration stage!
   */
  function celebrateNewCompletion(prevState, nextCompletedItems, nextExternalLogs, title) {
    const soundOn = prevState.profile.soundEnabled !== false;
    const prevStats = computeStreakStats(
      allItemsByCategory,
      prevState.completedItems,
      prevState.externalLogs
    );
    const nextStats = computeStreakStats(
      allItemsByCategory,
      nextCompletedItems,
      nextExternalLogs
    );

    if (nextStats.totalCompleted <= prevStats.totalCompleted) {
      return false;
    }

    setToast(null);

    if (!prevStats.completedToday && nextStats.completedToday) {
      playStreakExtendedSound(soundOn);
      setCelebration({
        id: Date.now(),
        kind: 'streak_extended',
        itemTitle: title,
        prevStreak: prevStats.currentStreak,
        newStreak: nextStats.currentStreak,
        todayCount: nextStats.todayCount,
        goldNights: nextStats.goldNights
      });
    } else if (prevStats.todayCount < 3 && nextStats.todayCount >= 3) {
      playGoldNightSound(soundOn);
      setCelebration({
        id: Date.now(),
        kind: 'gold_night',
        itemTitle: title,
        prevStreak: prevStats.currentStreak,
        newStreak: nextStats.currentStreak,
        todayCount: nextStats.todayCount,
        goldNights: nextStats.goldNights
      });
    } else {
      playStoryCompleteSound(soundOn);
      setCelebration({
        id: Date.now(),
        kind: 'story_complete',
        itemTitle: title,
        prevStreak: prevStats.currentStreak,
        newStreak: nextStats.currentStreak,
        todayCount: nextStats.todayCount,
        goldNights: nextStats.goldNights
      });
    }
    return true;
  }

  function handleShuffleQuartetAll() {
    playStepPopSound(soundEnabled);
    const nextOffsets = {
      poem: quartetOffsets.poem + 1,
      story: quartetOffsets.story + 1,
      essay: quartetOffsets.essay + 1,
      personal: quartetOffsets.personal + 1
    };
    setQuartetOffsets(nextOffsets);
    const nextDeal = dealTonightQuartet(
      allItemsByCategory,
      userState.completedItems,
      nextOffsets
    );
    setLockedQuartetIds(
      Object.fromEntries(nextDeal.map((entry) => [entry.categoryKey, entry.item.id]))
    );
    showToastMessage('Dealt four fresh unread picks across all pillars.');
  }

  function handleShuffleQuartetSlot(categoryKey) {
    playStepPopSound(soundEnabled);
    const nextOffsets = {
      ...quartetOffsets,
      [categoryKey]: (quartetOffsets[categoryKey] || 0) + 1
    };
    setQuartetOffsets(nextOffsets);
    const nextDeal = dealTonightQuartet(
      allItemsByCategory,
      userState.completedItems,
      nextOffsets
    );
    const updatedSlot = nextDeal.find((e) => e.categoryKey === categoryKey);
    if (updatedSlot?.item) {
      setLockedQuartetIds((prev) => ({
        ...prev,
        [categoryKey]: updatedSlot.item.id
      }));
    }
  }

  function openReader(item) {
    if (!item) return;
    navigateTo(itemPath(item));
  }

  function closeReader() {
    if (activeReader && window.history.state?.fromApp) {
      window.history.back();
      return;
    }
    const cat = activeReader?.categoryKey || selectedCategory;
    navigateTo(shelfPath(cat, 'All'), { replace: true });
  }

  function handleOpenSurpriseFromQuartet() {
    const unreadInQuartet = quartetEntries.filter(
      (e) => !userState.completedItems[e.item.id]?.completed
    );
    const recommendedEntry = unreadInQuartet.find((e) => e.isRecommendedNext);
    const chosen =
      recommendedEntry?.item ||
      unreadInQuartet[0]?.item ||
      quartetEntries[0]?.item ||
      pickSurpriseItem(allItemsByCategory, userState.completedItems);
    if (chosen) {
      openReader(chosen);
    }
  }

  function toggleItemCompleted(item) {
    const prev = userStateRef.current;
    const wasDone = Boolean(prev.completedItems[item.id]?.completed);
    const nextDone = !wasDone;
    const nowIso = new Date().toISOString();
    const updatedCompleted = {
      ...prev.completedItems,
      [item.id]: {
        completed: nextDone,
        completedAt: nextDone ? nowIso : null,
        categoryKey: item.categoryKey,
        updatedAt: nowIso
      }
    };

    const nextState = {
      ...prev,
      completedItems: updatedCompleted
    };
    userStateRef.current = nextState;
    setUserState(nextState);

    if (nextDone) {
      celebrateNewCompletion(prev, updatedCompleted, prev.externalLogs, item.title);
    } else {
      setCelebration(null);
      playUndoSound(prev.profile.soundEnabled !== false);
      showToastMessage(`Moved "${item.title}" back to unread.`);
    }
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
    showToastMessage(`Downloaded "${item.title}.epub" (with analysis) for ElevenReader!`);
  }

  function handleDownloadQuartetBundle(customEntries = null) {
    const entries = customEntries || quartetEntries;
    const chapters = entries
      .filter((e) => e?.item)
      .map((e) => ({
        slotLabel:
          e.categoryKey === 'personal'
            ? `Personal (${e.item.region})`
            : e.categoryLabel || e.item.slotLabel,
        item: e.item
      }));

    if (chapters.length === 0) return;

    const personalItem = entries.find((e) => e.categoryKey === 'personal')?.item;
    const blob = buildEpubBlob({
      title: `Bradbury 1000 — Tonight's Curated Quartet (.epub)`,
      subtitle: `1 Poem, 1 Short Story, 1 Essay & 1 ${
        personalItem?.region || 'Personal'
      } Chronicle + Analyses`,
      author: 'Bradbury 1000 Curated Anthology',
      uid: `urn:bradbury1000:next-quartet-${Date.now()}`,
      includeAnalysis: userState.profile.includeAnalysisInEpub !== false,
      chapters
    });
    downloadEpubBlob(blob, `bradbury-1000-tonights-quartet.epub`);
    showToastMessage(`Bundled Tonight's Quartet into one .epub for ElevenReader!`);
  }

  function markItemCompleted(item, source = 'elevenreader') {
    const prev = userStateRef.current;
    const updatedCompleted = markItemCompletedState(prev.completedItems, item, source);
    const nextState = {
      ...prev,
      completedItems: updatedCompleted
    };
    userStateRef.current = nextState;
    saveState(nextState);
    setUserState(nextState);
    return celebrateNewCompletion(prev, updatedCompleted, prev.externalLogs, item.title);
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
          const celebrated = markItemCompleted(item, 'elevenreader-epub');
          await sharePromise;
          if (!celebrated) {
            showToastMessage(`Shared "${item.title}.epub" to ElevenReader!`);
          }
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
        const celebrated = markItemCompleted(item, 'elevenreader');
        await sharePromise;
        if (!celebrated) {
          showToastMessage(`Sent "${item.title}" to ElevenReader!`);
        }
        return;
      } catch {
        markItemCompleted(item, 'elevenreader');
      }
    }

    const celebrated = markItemCompleted(item, 'elevenreader');

    try {
      await navigator.clipboard.writeText(fullTextPayload);
      if (!celebrated) {
        showToastMessage(`Copied "${item.title}" full text for ElevenReader!`);
      }
    } catch {
      const cleanUrl = `${window.location.origin}${item.staticUrl || ''}`;
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
      if (!celebrated) {
        showToastMessage(`Opened "${item.title}" for ElevenReader!`);
      }
    }
  }

  function logExternalReading({ title, author, slotKey }) {
    if (!title || !title.trim()) return;
    const prev = userStateRef.current;
    const entry = {
      id: `ext-${Date.now()}`,
      slotKey,
      title: title.trim(),
      author: (author || 'External Anthology').trim(),
      loggedAt: new Date().toISOString()
    };
    const nextExternalLogs = [entry, ...prev.externalLogs];
    const nextState = {
      ...prev,
      externalLogs: nextExternalLogs
    };
    userStateRef.current = nextState;
    setUserState(nextState);
    setShowExternalModal(false);
    celebrateNewCompletion(prev, prev.completedItems, nextExternalLogs, entry.title);
  }

  function handleToggleSound() {
    setUserState((prev) => {
      const nextSound = prev.profile.soundEnabled === false;
      if (nextSound) {
        playMascotChirpSound(true);
      }
      return {
        ...prev,
        profile: {
          ...prev.profile,
          soundEnabled: nextSound
        }
      };
    });
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

  return (
    <div className="app-root">
      <TopBar
        currentView={activeReader ? 'reader' : currentView}
        streakStats={streakStats}
        theme={userState.profile.theme}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onToggleTheme={handleToggleTheme}
        onNavigateHome={() => navigateTo(homePath())}
        onNavigateTonight={() => navigateTo(tonightPath(), { playPop: true })}
        onNavigateExplore={() => navigateTo(chooseTypePath(), { playPop: true })}
        onNavigateJournal={() => navigateTo(journalPath())}
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
        ) : currentView === 'tonight' ? (
          <TonightQuartetView
            quartetEntries={quartetEntries}
            completedItems={userState.completedItems}
            streakStats={streakStats}
            soundEnabled={soundEnabled}
            onBackHome={() => navigateTo(homePath())}
            onShuffleAll={handleShuffleQuartetAll}
            onShuffleSingleSlot={handleShuffleQuartetSlot}
            onOpenSurpriseFromQuartet={handleOpenSurpriseFromQuartet}
            onDownloadQuartetEpub={() => handleDownloadQuartetBundle(quartetEntries)}
            onOpenReader={openReader}
            onToggleComplete={toggleItemCompleted}
            onDownloadSingleEpub={handleDownloadSingleEpub}
            onShareElevenReader={handleElevenReaderShare}
            onSelectGenreInShelf={(catKey, genre) =>
              navigateTo(shelfPath(catKey, genre), { playPop: true })
            }
          />
        ) : currentView === 'choose-type' ? (
          <ChooseTypeView
            allItemsByCategory={allItemsByCategory}
            completedItems={userState.completedItems}
            streakStats={streakStats}
            soundEnabled={soundEnabled}
            onBackHome={() => navigateTo(homePath())}
            onSelectType={(catKey) =>
              navigateTo(chooseGenrePath(catKey), { playPop: true })
            }
          />
        ) : currentView === 'choose-genre' ? (
          <ChooseGenreView
            categoryKey={selectedCategory}
            subcategories={subcategories}
            streakStats={streakStats}
            soundEnabled={soundEnabled}
            onBackToTypes={() => navigateTo(chooseTypePath())}
            onSelectGenre={(genreId) =>
              navigateTo(shelfPath(selectedCategory, genreId), { playPop: true })
            }
            onSurpriseInCategory={() => {
              const pick = pickSurpriseItem(allItemsByCategory, userState.completedItems, {
                categoryKey: selectedCategory
              });
              if (pick) openReader(pick);
            }}
          />
        ) : currentView === 'shelf' ? (
          <ShelfView
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            subcategories={subcategories}
            unreadItems={unreadItems}
            completedCategoryItems={completedCategoryItems}
            onBackToGenres={() => navigateTo(chooseGenrePath(selectedCategory))}
            onChangeType={() => navigateTo(chooseTypePath())}
            onSelectSubcategory={(subId) =>
              navigateTo(shelfPath(selectedCategory, subId), { replace: true })
            }
            onSurpriseFromShelf={() => {
              const pick = pickSurpriseItem(allItemsByCategory, userState.completedItems, {
                categoryKey: selectedCategory,
                subcategory: selectedSubcategory
              });
              if (pick) openReader(pick);
            }}
            onOpenReader={openReader}
            onToggleComplete={toggleItemCompleted}
            onDownloadEpub={handleDownloadSingleEpub}
            onShareElevenReader={handleElevenReaderShare}
          />
        ) : currentView === 'journal' ? (
          <JournalView
            streakStats={streakStats}
            allItemsByCategory={allItemsByCategory}
            completedItems={userState.completedItems}
            externalLogs={userState.externalLogs}
            soundEnabled={soundEnabled}
            onBackHome={() => navigateTo(homePath())}
            onSelectType={(catKey) =>
              navigateTo(chooseGenrePath(catKey), { playPop: true })
            }
            onOpenReader={openReader}
            onToggleComplete={toggleItemCompleted}
            onOpenExternalModal={() => setShowExternalModal(true)}
            onDownloadUnreadBundle={() => handleDownloadQuartetBundle()}
            onOpenPwaModal={() => setShowPwaModal(true)}
          />
        ) : (
          <HomeFunnelView
            streakStats={streakStats}
            unreadCounts={unreadCounts}
            nextRecommendation={nextRecommendation}
            soundEnabled={soundEnabled}
            onChooseTonightQuartet={() => navigateTo(tonightPath(), { playPop: true })}
            onChooseCustomPath={() => navigateTo(chooseTypePath(), { playPop: true })}
            onOpenSurpriseNow={() => {
              const pick =
                nextRecommendation?.item ||
                pickSurpriseItem(allItemsByCategory, userState.completedItems);
              if (pick) openReader(pick);
            }}
            onJumpToRecommendation={(rec) => {
              if (rec?.item) {
                openReader(rec.item);
              } else if (rec?.categoryKey) {
                navigateTo(chooseGenrePath(rec.categoryKey), { playPop: true });
              }
            }}
            onDownloadUnreadBundle={() => handleDownloadQuartetBundle()}
            onOpenExternalModal={() => setShowExternalModal(true)}
            onOpenPwaModal={() => setShowPwaModal(true)}
            onOpenJournal={() => navigateTo(journalPath())}
          />
        )}
      </main>

      {!activeReader && (
        <BottomNav
          currentView={currentView}
          totalCompleted={streakStats.totalCompleted}
          onNavigateHome={() => navigateTo(homePath())}
          onNavigateTonight={() => navigateTo(tonightPath(), { playPop: true })}
          onNavigateExplore={() => navigateTo(chooseTypePath(), { playPop: true })}
          onNavigateJournal={() => navigateTo(journalPath())}
        />
      )}

      <StreakCelebrationOverlay
        celebration={celebration}
        streakStats={streakStats}
        onDismiss={dismissCelebration}
      />

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
