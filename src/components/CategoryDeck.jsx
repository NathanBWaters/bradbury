import React from 'react';
import { Feather, BookOpen, ScrollText, Compass, Smartphone } from 'lucide-react';
import { MAIN_CATEGORIES } from '../utils/catalogEngine.js';

const ICON_MAP = {
  poem: Feather,
  story: BookOpen,
  essay: ScrollText,
  personal: Compass
};

export default function CategoryDeck({
  selectedCategory,
  selectedSubcategory,
  subcategories,
  allItemsByCategory,
  completedItems,
  streakStats,
  onSelectCategory,
  onSelectSubcategory,
  onOpenPwaModal
}) {
  return (
    <section className="ritual-hero" aria-label="Nightly Reading Selector">
      <div className="ritual-hero-top">
        <div className="ritual-copy">
          <div className="night-eyebrow-row">
            <span className="night-eyebrow">
              Bradbury 1,000 Nights • {streakStats.totalCompleted} Read •{' '}
              {3 - streakStats.nextGoldProgress} to Gold Night
            </span>
            <button
              type="button"
              id="pwa-offline-badge-btn"
              className="pwa-badge-btn"
              onClick={onOpenPwaModal}
              title="Install Bradbury 1000 as a standalone offline PWA"
            >
              <Smartphone size={11} />
              <span>Offline PWA</span>
            </button>
          </div>
          <h2 className="ritual-headline">What would you like to read tonight?</h2>
          <p className="ritual-quote">
            Pick a pillar—<strong>Poem</strong>, <strong>Short Story</strong>,{' '}
            <strong>Essay</strong>, or <strong>Personal (Korea &amp; SF)</strong>—and filter by
            genre. Unread works appear first; completed ones are archived at the bottom.
          </p>
        </div>

        {/* Duolingo 4-Pillar Progress Meter */}
        <div className="tier-meter-card">
          <div className="tier-meter-header">
            <span>
              🔥 {streakStats.litFlameStreak}d Streak • {streakStats.goldNights} Gold
            </span>
            <span>{streakStats.totalCompleted} Total</span>
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

      {/* 4-Pillar Selector Grid (2x2 compact grid on mobile, 4-col on desktop) */}
      <div className="pillar-selector-grid" role="tablist" aria-label="Choose reading category">
        {MAIN_CATEGORIES.map((cat) => {
          const IconComp = ICON_MAP[cat.key] || BookOpen;
          const isActive = selectedCategory === cat.key;
          const catItems = allItemsByCategory[cat.key] || [];
          const unreadCount = catItems.filter((i) => !completedItems[i.id]?.completed).length;
          const doneCount = catItems.length - unreadCount;

          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`pick-category-${cat.key}`}
              className={`pillar-card-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.key)}
            >
              <div className="pillar-card-top">
                <span className="pillar-card-title">
                  <IconComp size={16} />
                  <span className="pillar-full-label">{cat.label}</span>
                  <span className="pillar-short-label">{cat.shortLabel}</span>
                </span>
                <span className={`pillar-unread-pill ${isActive ? 'active' : ''}`}>
                  {unreadCount} left
                </span>
              </div>
              <div className="pillar-card-subtitle">{cat.subtitle}</div>
              <div className="pillar-card-meta">
                {doneCount} done • {catItems.length} total
              </div>
            </button>
          );
        })}
      </div>

      {/* Horizontal Scroll-Snap Genre / Subcategory Filter Strip */}
      <div
        className="genre-filter-strip"
        role="tablist"
        aria-label="Filter by Genre or Subcategory"
      >
        {subcategories.map((sub) => {
          const isActive = selectedSubcategory === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`night-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSubcategory(sub.id)}
            >
              <span>{sub.label}</span>
              <span className="chip-count">{sub.count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
