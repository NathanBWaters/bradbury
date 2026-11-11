import React, { useState } from 'react';
import {
  Sparkles,
  Compass,
  ArrowRight,
  Shuffle,
  Download,
  PlusCircle,
  Smartphone,
  Flame,
  Award,
  Snowflake
} from 'lucide-react';
import { MAIN_CATEGORIES } from '../utils/catalogEngine.js';
import { FolioMascot, DuolingoWeekStrip } from './FolioMascot.jsx';
import { playMascotChirpSound } from '../utils/soundEffects.js';

const HERO_QUIPS = [
  '“Stuff your eyes with wonder!” Tap either path below to spark tonight’s lantern.',
  'Hoo-hoot! Just 1 read before sleep keeps your daily streak glowing!',
  '3 reads in a single day unlocks a Gold Bradbury Night—and every 7-day streak earns a Freeze!'
];

export default function HomeFunnelView({
  streakStats,
  unreadCounts,
  nextRecommendation,
  soundEnabled = true,
  onChooseTonightQuartet,
  onChooseCustomPath,
  onOpenSurpriseNow,
  onJumpToRecommendation,
  onDownloadUnreadBundle,
  onOpenExternalModal,
  onOpenPwaModal,
  onOpenJournal
}) {
  const [quipIndex, setQuipIndex] = useState(-1);
  const [mascotHop, setMascotHop] = useState(false);

  const totalUnread =
    (unreadCounts.poem || 0) +
    (unreadCounts.story || 0) +
    (unreadCounts.essay || 0) +
    (unreadCounts.personal || 0);

  const {
    currentStreak = 0,
    completedToday = false,
    todayCount = 0,
    streakState = 'unstarted',
    freezeTokens = 1,
    weekDays = []
  } = streakStats;

  let folioMood = 'encouraging';
  if (mascotHop) {
    folioMood = 'celebrating';
  } else if (todayCount >= 3) {
    folioMood = 'royal';
  } else if (completedToday) {
    folioMood = 'happy';
  } else if (streakState === 'frozen_saved') {
    folioMood = 'frozen';
  } else if (streakState === 'at_risk') {
    folioMood = 'at_risk';
  }

  function handleTapHeroFolio() {
    playMascotChirpSound(soundEnabled);
    setQuipIndex((i) => (i + 1) % HERO_QUIPS.length);
    setMascotHop(true);
    setTimeout(() => setMascotHop(false), 650);
  }

  // Dynamic Duolingo status line for Folio's hero speech pill
  let statusSpeech = '';
  if (quipIndex >= 0) {
    statusSpeech = HERO_QUIPS[quipIndex];
  } else if (todayCount >= 3) {
    statusSpeech = `Gold Bradbury Night unlocked! Your ${currentStreak}-day streak is shining.`;
  } else if (completedToday) {
    const rem = 3 - todayCount;
    statusSpeech = `Day ${currentStreak} streak lit! Read ${rem} more tonight for a Gold Bradbury Night.`;
  } else if (streakState === 'frozen_saved') {
    statusSpeech = `Streak Freeze saved your ${currentStreak}-day streak! Read 1 work tonight to reach Day ${
      currentStreak + 1
    }.`;
  } else if (streakState === 'at_risk') {
    statusSpeech = `Your ${currentStreak}-day streak isn’t lit yet today—1 read tonight reaches Day ${
      currentStreak + 1
    }!`;
  } else {
    statusSpeech =
      'One poem, one story, one essay before sleep—paired with Korea & San Francisco chronicles.';
  }

  return (
    <div className="funnel-page home-funnel-page" id="home-funnel-view">
      <header className="funnel-hero home-hero-with-mascot">
        <div className="home-hero-copy">
          <p className="funnel-eyebrow">
            Ray Bradbury&rsquo;s 1,000-Night Ritual • {totalUnread} Unread Works
          </p>
          <h1 className="funnel-title">How would you like to read tonight?</h1>
          <p className="funnel-lead">{statusSpeech}</p>
        </div>

        <div className="home-hero-mascot-box">
          <FolioMascot
            mood={folioMood}
            lit={completedToday}
            size={78}
            interactive={true}
            onClick={handleTapHeroFolio}
            className={mascotHop ? 'tap-hop' : ''}
            label="Folio the Lantern Owl mascot"
          />
          <span className="folio-tap-badge">
            {completedToday ? `Day ${currentStreak} 🔥` : 'Tap Folio'}
          </span>
        </div>
      </header>

      {/* Primary 2-Path Choose-Your-Adventure Decision */}
      <section className="adventure-choice-grid" aria-label="Choose your reading path">
        <div className="adventure-card primary-path">
          <button
            type="button"
            id="adventure-auto-btn"
            className="adventure-card-main-btn"
            onClick={onChooseTonightQuartet}
          >
            <div className="adventure-card-top">
              <span className="adventure-kicker">Option I • Automatic Deal</span>
              <span className="adventure-icon-wrap" aria-hidden="true">
                <Sparkles size={18} />
              </span>
            </div>
            <h2 className="adventure-card-title">Pick One of Four For Me</h2>
            <p className="adventure-card-desc">
              We pull one unread Poem, Short Story, Essay, and Korea/SF dispatch for tonight.
              Tap whichever speaks to you—or shuffle for a fresh hand.
            </p>
            <div className="adventure-pillar-pills" aria-hidden="true">
              <span>1 Poem</span>
              <span>1 Story</span>
              <span>1 Essay</span>
              <span>1 Korea / SF</span>
            </div>
            <span className="adventure-cta-row">
              <span>See Tonight&rsquo;s Four Picks</span>
              <ArrowRight size={16} />
            </span>
          </button>

          <div className="adventure-card-subaction">
            <button
              type="button"
              id="home-instant-surprise-btn"
              className="quiet-inline-btn"
              onClick={onOpenSurpriseNow}
            >
              <Shuffle size={13} />
              <span>Zero-choice mode: open 1 surprise work immediately</span>
            </button>
          </div>
        </div>

        <div className="adventure-card secondary-path">
          <button
            type="button"
            id="adventure-custom-btn"
            className="adventure-card-main-btn"
            onClick={onChooseCustomPath}
          >
            <div className="adventure-card-top">
              <span className="adventure-kicker">Option II • Guided Shelf</span>
              <span className="adventure-icon-wrap" aria-hidden="true">
                <Compass size={18} />
              </span>
            </div>
            <h2 className="adventure-card-title">Choose a Type &amp; Genre</h2>
            <p className="adventure-card-desc">
              Pick a literary form first, then narrow down to a specific genre, era, or city
              before browsing a calm, focused reading shelf.
            </p>
            <div className="adventure-pillar-pills" aria-hidden="true">
              <span>4 Forms</span>
              <span>20+ Genres</span>
              <span>Korea &amp; SF</span>
            </div>
            <span className="adventure-cta-row">
              <span>Pick Type &amp; Genre</span>
              <ArrowRight size={16} />
            </span>
          </button>

          <div className="adventure-card-subaction">
            <span className="adventure-subnote">
              Step-by-step • Poems, Stories, Essays &amp; Place Chronicles
            </span>
          </div>
        </div>
      </section>

      {/* Duolingo 7-Day Streak & Daily Ritual Card */}
      <section
        className={`ledger-momentum-card duo-home-streak-card ${
          completedToday ? 'is-lit-today' : ''
        }`}
        id={streakStats.totalCompleted > 0 ? 'streak-celebration-banner' : 'home-streak-preview'}
        aria-label="Daily streak and 7-day calendar"
      >
        <div className="duo-home-streak-top">
          <div className="momentum-copy">
            <div className="momentum-title">
              {todayCount >= 3 ? (
                <>
                  <Award size={17} className="momentum-icon gold" />
                  <span>
                    Gold Bradbury Night #{Math.max(1, streakStats.goldNights)} Unlocked!
                  </span>
                </>
              ) : completedToday ? (
                <>
                  <Flame size={17} fill="currentColor" className="momentum-icon flame" />
                  <span>
                    {currentStreak}-Day Streak Lit! • {todayCount} of 3 Today
                  </span>
                </>
              ) : streakState === 'frozen_saved' ? (
                <>
                  <Snowflake size={17} className="momentum-icon freeze" />
                  <span>
                    Streak Freeze Protected Your {currentStreak}-Day Streak
                  </span>
                </>
              ) : currentStreak > 0 ? (
                <>
                  <Flame size={17} className="momentum-icon flame" />
                  <span>
                    {currentStreak}-Day Streak • Read 1 Tonight for Day {currentStreak + 1}
                  </span>
                </>
              ) : (
                <>
                  <Flame size={17} className="momentum-icon muted" />
                  <span>0-Day Streak • Complete 1 Work Tonight to Spark Day 1</span>
                </>
              )}
            </div>
            <p className="momentum-sub">
              {completedToday
                ? todayCount >= 3
                  ? `All 3 daily ritual steps complete • ${freezeTokens}/${streakStats.maxFreezeTokens} Streak Freezes equipped.`
                  : `${3 - todayCount} more ${
                      3 - todayCount === 1 ? 'read' : 'reads'
                    } today unlocks a Gold Bradbury Night • ${freezeTokens} Freeze${
                      freezeTokens === 1 ? '' : 's'
                    } ready.`
                : `1 read lights today’s flame • 3 reads in a day earns a Gold Night • ${freezeTokens} Streak Freeze${
                    freezeTokens === 1 ? '' : 's'
                  } equipped.`}
            </p>
          </div>

          {nextRecommendation && (
            <button
              type="button"
              id="up-next-recommendation-btn"
              className="btn-secondary momentum-next-btn"
              onClick={() => onJumpToRecommendation(nextRecommendation)}
            >
              <span>
                {completedToday
                  ? `Up Next: ${nextRecommendation.categoryLabel}`
                  : `Light Streak: ${nextRecommendation.categoryLabel}`}
              </span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        <DuolingoWeekStrip weekDays={weekDays} />
      </section>

      {/* Quiet Nightly Ledger Summary & Secondary Utilities */}
      <section className="home-ledger-strip" aria-label="Reading progress summary">
        <div className="home-ledger-header">
          <span className="home-ledger-label">Your Four Pillars</span>
          <button
            type="button"
            id="home-open-journal-btn"
            className="text-link-btn"
            onClick={onOpenJournal}
          >
            <span>
              {streakStats.totalCompleted} Read • {streakStats.goldNights} Gold • View Ledger →
            </span>
          </button>
        </div>

        <div className="home-pillar-summary-row">
          {MAIN_CATEGORIES.map((cat) => {
            const doneKey =
              cat.key === 'poem'
                ? streakStats.poemsDone
                : cat.key === 'story'
                ? streakStats.storiesDone
                : cat.key === 'essay'
                ? streakStats.essaysDone
                : streakStats.personalDone;
            return (
              <div key={cat.key} className="home-pillar-stat">
                <span className="home-pillar-name">{cat.shortLabel}</span>
                <span className="home-pillar-count">{doneKey} / 100</span>
              </div>
            );
          })}
        </div>

        <div className="home-utility-bar">
          <button
            type="button"
            id="home-bundle-epub-btn"
            className="quiet-utility-btn"
            onClick={onDownloadUnreadBundle}
          >
            <Download size={14} />
            <span>Night Quartet (.epub)</span>
          </button>

          <button
            type="button"
            id="home-log-book-btn"
            className="quiet-utility-btn"
            onClick={onOpenExternalModal}
          >
            <PlusCircle size={14} />
            <span>Log External Book</span>
          </button>

          <button
            type="button"
            id="pwa-offline-badge-btn"
            className="quiet-utility-btn"
            onClick={onOpenPwaModal}
          >
            <Smartphone size={14} />
            <span>Offline App</span>
          </button>
        </div>
      </section>
    </div>
  );
}
