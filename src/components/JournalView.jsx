import React from 'react';
import {
  ArrowLeft,
  Flame,
  Award,
  Snowflake,
  PlusCircle,
  Download,
  Smartphone,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { MAIN_CATEGORIES } from '../utils/catalogEngine.js';
import { MascotCoachBanner } from './FolioMascot.jsx';

export default function JournalView({
  streakStats,
  allItemsByCategory,
  completedItems,
  externalLogs,
  soundEnabled = true,
  onBackHome,
  onSelectType,
  onOpenReader,
  onToggleComplete,
  onOpenExternalModal,
  onDownloadUnreadBundle,
  onOpenPwaModal
}) {
  const completedWorks = [];
  for (const cat of MAIN_CATEGORIES) {
    for (const item of allItemsByCategory[cat.key] || []) {
      if (completedItems[item.id]?.completed) {
        completedWorks.push({
          item,
          completedAt: completedItems[item.id]?.completedAt || null
        });
      }
    }
  }
  completedWorks.sort((a, b) =>
    String(b.completedAt || '').localeCompare(String(a.completedAt || ''))
  );

  return (
    <div className="funnel-page journal-page" id="journal-view">
      <nav className="funnel-breadcrumb-bar" aria-label="Journal navigation">
        <button
          type="button"
          id="journal-back-home-btn"
          className="funnel-back-btn"
          onClick={onBackHome}
        >
          <ArrowLeft size={15} />
          <span>Home</span>
        </button>
        <span className="funnel-step-indicator">Reading Ledger</span>
      </nav>

      <header className="funnel-header-compact">
        <p className="funnel-eyebrow">1,000-Night Progress</p>
        <h1 className="funnel-title">Your Reading Ledger</h1>
        <p className="funnel-lead">
          1 completed work each calendar day extends your daily streak. 3 works in a single day
          earns a Gold Bradbury Night—and every 7-day streak refills a Streak Freeze.
        </p>
      </header>

      <MascotCoachBanner
        streakStats={streakStats}
        stepContext="journal"
        soundEnabled={soundEnabled}
        showWeekStrip={true}
      />

      {/* Editorial Stat Trio */}
      <section className="journal-stats-row" aria-label="Streak metrics">
        <div className="journal-stat-box">
          <div className="journal-stat-label">
            <Flame
              size={15}
              fill={streakStats.completedToday ? 'currentColor' : 'none'}
              className="momentum-icon flame"
            />
            <span>Day Streak</span>
          </div>
          <div className="journal-stat-value">{streakStats.litFlameStreak}</div>
          <div className="journal-stat-note">
            {streakStats.completedToday
              ? `Lit today • Best: ${streakStats.longestStreak}d`
              : `Best: ${streakStats.longestStreak}d • Unlit today`}
          </div>
        </div>

        <div className="journal-stat-box">
          <div className="journal-stat-label">
            <Award size={15} className="momentum-icon gold" />
            <span>Gold Nights</span>
          </div>
          <div className="journal-stat-value">
            {streakStats.goldNights} <small>/ 1,000</small>
          </div>
          <div className="journal-stat-note">
            {streakStats.todayGoldUnlocked
              ? 'Gold unlocked today!'
              : `${3 - (streakStats.todayCount % 3)} more today for Gold`}
          </div>
        </div>

        <div className="journal-stat-box">
          <div className="journal-stat-label">
            <Snowflake size={15} className="momentum-icon freeze" />
            <span>Streak Freezes</span>
          </div>
          <div className="journal-stat-value">
            {streakStats.freezeTokens} <small>/ {streakStats.maxFreezeTokens}</small>
          </div>
          <div className="journal-stat-note">
            +1 in {streakStats.daysToNextFreeze} streak day
            {streakStats.daysToNextFreeze === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      {/* Four-Pillar Breakdown */}
      <section className="journal-pillars-section" aria-label="Progress by pillar">
        <h2 className="genre-section-subheading">By Literary Pillar</h2>
        <div className="journal-pillars-grid">
          {MAIN_CATEGORIES.map((cat) => {
            const done =
              cat.key === 'poem'
                ? streakStats.poemsDone
                : cat.key === 'story'
                ? streakStats.storiesDone
                : cat.key === 'essay'
                ? streakStats.essaysDone
                : streakStats.personalDone;
            return (
              <button
                key={cat.key}
                type="button"
                className="journal-pillar-card"
                onClick={() => onSelectType(cat.key)}
              >
                <div className="journal-pillar-top">
                  <strong>{cat.shortLabel}</strong>
                  <span>{done} / 100</span>
                </div>
                <div className="journal-progress-track" aria-hidden="true">
                  <div
                    className="journal-progress-fill"
                    style={{ width: `${Math.min(100, done)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="journal-actions-bar" aria-label="Ledger tools">
        <button
          type="button"
          id="journal-log-external-btn"
          className="btn-primary"
          onClick={onOpenExternalModal}
        >
          <PlusCircle size={15} />
          <span>Log External Book</span>
        </button>

        <button
          type="button"
          id="journal-bundle-epub-btn"
          className="btn-secondary"
          onClick={onDownloadUnreadBundle}
        >
          <Download size={15} />
          <span>Bundle Tonight&rsquo;s Quartet (.epub)</span>
        </button>

        <button
          type="button"
          id="journal-pwa-btn"
          className="btn-secondary"
          onClick={onOpenPwaModal}
        >
          <Smartphone size={15} />
          <span>Offline App Setup</span>
        </button>
      </section>

      {/* External Logged Books */}
      {Array.isArray(externalLogs) && externalLogs.length > 0 && (
        <section className="journal-archive-section" aria-label="Logged external books">
          <h2 className="genre-section-subheading">
            External Books Logged ({externalLogs.length})
          </h2>
          <div className="journal-archive-list">
            {externalLogs.map((entry) => (
              <div key={entry.id} className="journal-archive-item">
                <div>
                  <div className="journal-item-title">{entry.title}</div>
                  <div className="journal-item-meta">
                    {entry.author} • {entry.slotKey}
                  </div>
                </div>
                <span className="genre-unread-pill">Credited</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed Catalog Works */}
      <section className="journal-archive-section" aria-label="Completed catalog works">
        <h2 className="genre-section-subheading">
          Completed Works ({completedWorks.length})
        </h2>
        {completedWorks.length === 0 ? (
          <div className="empty-filter-card">
            <p>
              No catalog works marked read yet. Start with tonight&rsquo;s curated four or
              explore a genre shelf!
            </p>
          </div>
        ) : (
          <div className="journal-archive-list">
            {completedWorks.map(({ item }) => (
              <div key={item.id} className="journal-archive-item">
                <button
                  type="button"
                  className="journal-item-open-btn"
                  onClick={() => onOpenReader(item)}
                >
                  <BookOpen size={15} />
                  <div>
                    <div className="journal-item-title">{item.title}</div>
                    <div className="journal-item-meta">
                      {item.slotLabel} • {item.author || item.region}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="check-btn done"
                  onClick={() => onToggleComplete(item)}
                >
                  <CheckCircle2 size={14} />
                  <span>Read</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
