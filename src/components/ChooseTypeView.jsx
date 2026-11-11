import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Feather,
  BookOpen,
  ScrollText,
  Compass
} from 'lucide-react';
import { MAIN_CATEGORIES, getSubcategoriesForCategory } from '../utils/catalogEngine.js';
import { MascotCoachBanner } from './FolioMascot.jsx';

const ICON_MAP = {
  poem: Feather,
  story: BookOpen,
  essay: ScrollText,
  personal: Compass
};

export default function ChooseTypeView({
  allItemsByCategory,
  completedItems,
  streakStats,
  soundEnabled = true,
  onBackHome,
  onSelectType
}) {
  return (
    <div className="funnel-page choose-type-page" id="choose-type-view">
      <nav className="funnel-breadcrumb-bar with-progress" aria-label="Funnel navigation">
        <div className="funnel-breadcrumb-row">
          <button
            type="button"
            id="choose-type-back-btn"
            className="funnel-back-btn"
            onClick={onBackHome}
          >
            <ArrowLeft size={15} />
            <span>Change Path</span>
          </button>
          <span className="funnel-step-indicator">Step 1 of 3 • Choose Form</span>
        </div>
        <div className="funnel-step-progress-track" aria-hidden="true">
          <div className="funnel-step-progress-fill" style={{ width: '33%' }} />
        </div>
      </nav>

      <header className="funnel-header-compact">
        <p className="funnel-eyebrow">Guided Exploration</p>
        <h1 className="funnel-title">What form are you in the mood for?</h1>
        <p className="funnel-lead">
          Choose one of the four literary pillars first. On the next screen, you&rsquo;ll pick a
          genre, era, or city.
        </p>
      </header>

      <MascotCoachBanner
        streakStats={streakStats}
        stepContext="choose-type"
        soundEnabled={soundEnabled}
      />

      <section className="type-choice-grid" aria-label="Literary types">
        {MAIN_CATEGORIES.map((cat) => {
          const IconComp = ICON_MAP[cat.key] || BookOpen;
          const catItems = allItemsByCategory[cat.key] || [];
          const unreadCount = catItems.filter((i) => !completedItems[i.id]?.completed).length;
          const subcats = getSubcategoriesForCategory(
            allItemsByCategory,
            cat.key,
            completedItems
          );
          const filterCount = Math.max(1, subcats.length - 1);

          return (
            <button
              key={cat.key}
              type="button"
              id={`choose-type-${cat.key}`}
              className="type-choice-card"
              onClick={() => onSelectType(cat.key)}
            >
              <div className="type-choice-top">
                <span className="type-choice-icon" aria-hidden="true">
                  <IconComp size={19} />
                </span>
                <span className="type-choice-duration">{cat.typicalDuration}</span>
              </div>

              <h2 className="type-choice-title">{cat.pluralLabel || cat.label}</h2>
              <p className="type-choice-desc">{cat.description}</p>

              <div className="type-choice-footer">
                <span className="type-choice-meta">
                  {unreadCount} unread •{' '}
                  {cat.key === 'personal' ? '2 places + 5 themes' : `${filterCount} genres`}
                </span>
                <span className="type-choice-cta">
                  <span>{cat.key === 'personal' ? 'Pick Place' : 'Pick Genre'}</span>
                  <ArrowRight size={15} />
                </span>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
