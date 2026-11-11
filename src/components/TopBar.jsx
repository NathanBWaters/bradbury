import React from 'react';
import {
  Flame,
  Award,
  Snowflake,
  Search,
  PlusCircle,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  User,
  LogIn,
  Cloud,
  CloudOff
} from 'lucide-react';

export default function TopBar({
  currentView,
  streakStats,
  theme,
  soundEnabled = true,
  onToggleSound,
  onToggleTheme,
  onOpenSearch,
  onNavigateHome,
  onNavigateTonight,
  onNavigateExplore,
  onNavigateJournal,
  onOpenExternalModal,
  onOpenProfileModal,
  authUser,
  syncStatus,
  onSignIn
}) {
  const firstName =
    authUser?.displayName?.split(' ')[0] || authUser?.email?.split('@')[0] || 'Account';
  const isExploreActive =
    currentView === 'choose-type' ||
    currentView === 'choose-genre' ||
    currentView === 'shelf';

  const isLitToday = Boolean(streakStats.completedToday);
  const isFrozenSaved = streakStats.streakState === 'frozen_saved';
  const isAtRisk = streakStats.streakState === 'at_risk';

  const pillStateClass = isLitToday
    ? 'is-lit-today'
    : isFrozenSaved
    ? 'is-frozen-saved'
    : isAtRisk
    ? 'is-at-risk'
    : 'is-unlit';

  const streakTooltip = isLitToday
    ? `${streakStats.litFlameStreak}-day streak lit today! (${streakStats.todayCount}/3 toward Gold Night)`
    : isFrozenSaved
    ? `Streak Freeze saved your ${streakStats.litFlameStreak}-day streak! Read 1 work tonight to keep it going.`
    : isAtRisk
    ? `Your ${streakStats.litFlameStreak}-day streak is unlit today — read 1 work before midnight!`
    : 'Start your daily reading streak tonight!';

  return (
    <header className="masthead" role="banner">
      <div className="masthead-inner">
        <div className="brand-group">
          <button
            type="button"
            className="brand-title-btn"
            id="brand-home-link"
            onClick={onNavigateHome}
            aria-label="Bradbury 1000 Home"
          >
            <span className="brand-title">Bradbury 1000</span>
          </button>

          <nav className="desktop-masthead-nav hide-on-mobile" aria-label="Main sections">
            <button
              type="button"
              id="nav-desktop-home"
              className={`desktop-nav-link ${currentView === 'home' ? 'active' : ''}`}
              onClick={onNavigateHome}
            >
              Ritual
            </button>
            <button
              type="button"
              id="nav-desktop-tonight"
              className={`desktop-nav-link ${currentView === 'tonight' ? 'active' : ''}`}
              onClick={onNavigateTonight}
            >
              Tonight&rsquo;s Four
            </button>
            <button
              type="button"
              id="nav-desktop-explore"
              className={`desktop-nav-link ${isExploreActive ? 'active' : ''}`}
              onClick={onNavigateExplore}
            >
              Type &amp; Genre
            </button>
            <button
              type="button"
              id="nav-desktop-journal"
              className={`desktop-nav-link ${currentView === 'journal' ? 'active' : ''}`}
              onClick={onNavigateJournal}
            >
              Ledger
            </button>
          </nav>
        </div>

        <div className="streak-cluster">
          <button
            type="button"
            id="topbar-search-btn"
            className="icon-btn touch-target topbar-search-btn"
            onClick={onOpenSearch}
            title="Search for a specific title, author, or place (⌘K / Ctrl+K)"
            aria-label="Search titles"
          >
            <Search size={15} />
            <span className="hide-on-mobile">Search</span>
            <kbd className="topbar-kbd hide-on-mobile" aria-hidden="true">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            id="topbar-ledger-btn"
            key={`streak-${streakStats.litFlameStreak}-${isLitToday ? 'lit' : 'dim'}`}
            className={`streak-ledger-pill ${pillStateClass}`}
            onClick={onNavigateJournal}
            title={streakTooltip}
            aria-label={`${streakStats.litFlameStreak}-day streak (${
              isLitToday ? 'lit today' : 'unlit today'
            }), ${streakStats.goldNights} Gold Nights. Open ledger.`}
          >
            <span className={`ledger-pill-part ${isFrozenSaved ? 'freeze' : isLitToday ? 'flame-lit' : 'flame-unlit'}`}>
              {isFrozenSaved ? (
                <Snowflake size={14} />
              ) : (
                <Flame
                  size={14}
                  fill={isLitToday ? 'currentColor' : 'none'}
                  strokeWidth={isLitToday ? 2.2 : 1.9}
                  className={isLitToday ? 'topbar-flame-icon lit' : 'topbar-flame-icon'}
                />
              )}
              <span>{streakStats.litFlameStreak}</span>
            </span>
            <span className="ledger-pill-divider" aria-hidden="true">
              •
            </span>
            <span className="ledger-pill-part gold">
              <Award size={13} />
              <span>{streakStats.goldNights}</span>
              <span className="hide-on-mobile">Gold</span>
            </span>
          </button>

          <button
            type="button"
            id="log-external-book-btn"
            className="icon-btn touch-target hide-on-mobile"
            onClick={onOpenExternalModal}
            title="Log an external book or story"
            aria-label="Log external book"
          >
            <PlusCircle size={15} />
            <span>Log Book</span>
          </button>

          <button
            type="button"
            id="sound-toggle-btn"
            className="icon-btn touch-target"
            onClick={onToggleSound}
            title={
              soundEnabled
                ? 'Celebration sounds ON (click to mute)'
                : 'Celebration sounds MUTED (click to unmute)'
            }
            aria-label={soundEnabled ? 'Mute celebration sounds' : 'Unmute celebration sounds'}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            id="theme-toggle-btn"
            className="icon-btn touch-target"
            onClick={onToggleTheme}
            title="Toggle Reading Theme (Parchment / Nocturnal)"
            aria-label="Toggle reading theme"
          >
            {theme === 'nocturnal' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {authUser === null ? (
            <button
              type="button"
              id="sign-in-btn"
              className="icon-btn touch-target sign-in-compact-btn"
              onClick={onSignIn}
              title="Sign in with Google to sync your progress across devices"
              aria-label="Sign in"
            >
              <LogIn size={15} />
              <span className="sign-in-label">Sign in</span>
            </button>
          ) : (
            <button
              type="button"
              id="profile-settings-btn"
              className="icon-btn touch-target"
              onClick={onOpenProfileModal}
              title={
                authUser
                  ? `Signed in as ${authUser.email} — ${
                      syncStatus === 'error' ? 'sync problem' : 'progress synced'
                    }`
                  : 'Profile & settings'
              }
              aria-label="Account and settings"
            >
              {authUser?.photoURL ? (
                <img
                  src={authUser.photoURL}
                  alt=""
                  className="avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={16} />
              )}
              <span className="hide-on-mobile">{authUser ? firstName : '…'}</span>
              {authUser &&
                (syncStatus === 'error' ? (
                  <CloudOff size={13} className="sync-icon error" aria-label="Sync problem" />
                ) : (
                  <Cloud size={13} className={`sync-icon ${syncStatus}`} aria-label="Synced" />
                ))}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
