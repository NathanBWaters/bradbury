import React from 'react';
import {
  Flame,
  Award,
  Snowflake,
  Download,
  PlusCircle,
  Sun,
  Moon,
  User
} from 'lucide-react';

export default function TopBar({
  streakStats,
  theme,
  onToggleTheme,
  onCloseReader,
  onDownloadUnreadBundle,
  onOpenExternalModal,
  onOpenProfileModal
}) {
  return (
    <header className="masthead" role="banner">
      <div className="masthead-inner">
        <div className="brand-group">
          <button
            type="button"
            className="brand-title-btn"
            id="brand-home-link"
            onClick={onCloseReader}
            aria-label="Bradbury 1000 Home"
          >
            <span className="brand-title">Bradbury 1000</span>
          </button>
          <span className="brand-subtitle hide-on-mobile">
            Poem • Short Story • Essay • Personal (Korea &amp; SF)
          </span>
        </div>

        {/* Compact 2-Tier Duolingo Streak Strip + Quick Actions */}
        <div className="streak-cluster">
          <div
            className="streak-pill flame"
            title="Lit Flame Streak: Complete at least 1 reading to keep your daily flame lit"
            aria-label={`${streakStats.litFlameStreak} day flame streak`}
          >
            <Flame size={14} className="streak-icon" />
            <span className="streak-val">{streakStats.litFlameStreak}</span>
            <span className="streak-label hide-on-mobile">Flame Streak</span>
          </div>

          <div
            className="streak-pill gold"
            title="Gold Bradbury Nights: Every 3 completed readings earns a Gold Night toward 1,000"
            aria-label={`${streakStats.goldNights} of 1000 Gold Nights`}
          >
            <Award size={13} className="streak-icon" />
            <span className="streak-val">{streakStats.goldNights}</span>
            <span className="streak-label hide-on-mobile">/ 1000 Gold</span>
          </div>

          <div
            className="streak-pill freeze"
            title="Streak Freeze Vault (max 2 held, +1 every 7 Gold Nights)"
            aria-label={`${streakStats.freezeTokens} of ${streakStats.maxFreezeTokens} Streak Freezes`}
          >
            <Snowflake size={12} className="streak-icon" />
            <span className="streak-val">
              {streakStats.freezeTokens}/{streakStats.maxFreezeTokens}
            </span>
            <span className="streak-label hide-on-mobile">Freezes</span>
          </div>

          <button
            type="button"
            id="bundle-next-quartet-btn"
            className="btn-secondary hide-on-mobile"
            onClick={onDownloadUnreadBundle}
            title="Bundle your next unread Poem, Short Story, Essay & Personal Story into one .epub for ElevenReader"
          >
            <Download size={14} />
            <span>Bundle Quartet (.epub)</span>
          </button>

          <button
            type="button"
            id="log-external-book-btn"
            className="icon-btn touch-target"
            onClick={onOpenExternalModal}
            title="Log an external book or story"
            aria-label="Log external book"
          >
            <PlusCircle size={16} />
            <span className="hide-on-mobile">Log Book</span>
          </button>

          <button
            type="button"
            id="theme-toggle-btn"
            className="icon-btn touch-target"
            onClick={onToggleTheme}
            title="Toggle Reading Theme (Parchment / Sepia / Nocturnal)"
            aria-label="Toggle reading theme"
          >
            {theme === 'nocturnal' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            id="profile-settings-btn"
            className="icon-btn touch-target"
            onClick={onOpenProfileModal}
            title="Profile & ElevenReader Settings"
            aria-label="Reader profile and settings"
          >
            <User size={16} />
            <span className="hide-on-mobile">Nathan</span>
          </button>
        </div>
      </div>
    </header>
  );
}
