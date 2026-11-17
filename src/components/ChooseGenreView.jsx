import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles, MapPin, Layers, Headphones } from 'lucide-react';
import { MAIN_CATEGORIES } from '../utils/catalogEngine.js';
import { MascotCoachBanner } from './FolioMascot.jsx';

export default function ChooseGenreView({
  categoryKey,
  subcategories,
  streakStats,
  soundEnabled = true,
  onBackToTypes,
  onSelectGenre,
  onSurpriseInCategory
}) {
  const categoryMeta =
    MAIN_CATEGORIES.find((c) => c.key === categoryKey) || MAIN_CATEGORIES[1];
  const allEntry = subcategories.find((s) => s.id === 'All') || {
    count: 100,
    unreadCount: 100
  };
  const specificEntries = subcategories.filter((s) => s.id !== 'All');
  const seriesEntries = specificEntries.filter((s) => s.kind === 'series');
  const regionEntries = specificEntries.filter((s) => s.kind === 'region');
  const themeOrGenreEntries = specificEntries.filter(
    (s) => s.kind !== 'region' && s.kind !== 'series'
  );

  return (
    <div className="funnel-page choose-genre-page" id="choose-genre-view">
      <nav className="funnel-breadcrumb-bar with-progress" aria-label="Funnel navigation">
        <div className="funnel-breadcrumb-row">
          <button
            type="button"
            id="choose-genre-back-btn"
            className="funnel-back-btn"
            onClick={onBackToTypes}
          >
            <ArrowLeft size={15} />
            <span>All Forms</span>
          </button>
          <span className="funnel-step-indicator">
            Step 2 of 3 • {categoryMeta.shortLabel}
          </span>
        </div>
        <div className="funnel-step-progress-track" aria-hidden="true">
          <div className="funnel-step-progress-fill" style={{ width: '66%' }} />
        </div>
      </nav>

      <header className="funnel-header-compact">
        <p className="funnel-eyebrow">
          {categoryMeta.pluralLabel || categoryMeta.label} • {allEntry.unreadCount} Unread
        </p>
        <h1 className="funnel-title">
          {categoryKey === 'personal'
            ? 'Choose a series, place, or theme'
            : `Pick a ${categoryMeta.label.toLowerCase()} genre`}
        </h1>
        <p className="funnel-lead">
          {categoryKey === 'personal'
            ? 'Follow chronological audio series across Korean and U.S. leaders (1900–Present), or explore city chronicles by place or theme.'
            : 'Open a focused reading shelf with just the mood or tradition you want tonight.'}
        </p>

        <div className="genre-quick-actions">
          <button
            type="button"
            id="surprise-category-btn"
            className="btn-primary"
            onClick={onSurpriseInCategory}
          >
            <Sparkles size={15} />
            <span>
              {categoryKey === 'personal'
                ? 'Surprise Chronicle'
                : `Surprise ${categoryMeta.label}`}
            </span>
          </button>

          <button
            type="button"
            id="view-all-category-btn"
            className="btn-secondary"
            onClick={() => onSelectGenre('All')}
          >
            <Layers size={15} />
            <span>All {categoryMeta.shortLabel} ({allEntry.unreadCount} unread)</span>
          </button>
        </div>
      </header>

      <MascotCoachBanner
        streakStats={streakStats}
        stepContext="choose-genre"
        categoryLabel={categoryMeta.shortLabel.toLowerCase()}
        soundEnabled={soundEnabled}
      />

      {seriesEntries.length > 0 && (
        <section className="genre-section-block" aria-label="Featured audio series">
          <h2 className="genre-section-subheading">Featured Audio Series (Listen in Order)</h2>
          <div className="series-choice-grid">
            {seriesEntries.map((ser) => (
              <button
                key={ser.id}
                type="button"
                id={`choose-genre-${ser.id}`}
                className="series-choice-card"
                onClick={() => onSelectGenre(ser.id)}
              >
                <div className="region-choice-top">
                  <span className="region-pin-label">
                    <Headphones size={14} />
                    <span>{ser.region} • Ordered Series</span>
                  </span>
                  <span className="genre-unread-pill">{ser.unreadCount} unread</span>
                </div>
                <h3 className="series-choice-title">{ser.label}</h3>
                {ser.blurb && <p className="region-choice-blurb">{ser.blurb}</p>}
                <div className="genre-card-footer">
                  <span className="genre-sample-voices">
                    {ser.count} episodes • 14–32 min
                  </span>
                  <ArrowRight size={15} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {regionEntries.length > 0 && (
        <section className="genre-section-block" aria-label="Choose a city or country">
          <h2 className="genre-section-subheading">By Place</h2>
          <div className="region-choice-grid">
            {regionEntries.map((reg) => (
              <button
                key={reg.id}
                type="button"
                id={`choose-genre-${reg.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="region-choice-card"
                onClick={() => onSelectGenre(reg.id)}
              >
                <div className="region-choice-top">
                  <span className="region-pin-label">
                    <MapPin size={14} />
                    <span>
                      {reg.id === 'United States'
                        ? 'Presidential Audio Series'
                        : '14–32 Min Chronicles'}
                    </span>
                  </span>
                  <span className="genre-unread-pill">{reg.unreadCount} unread</span>
                </div>
                <h3 className="region-choice-title">{reg.label}</h3>
                {reg.blurb && <p className="region-choice-blurb">{reg.blurb}</p>}
                <div className="genre-card-footer">
                  <span className="genre-sample-voices">{reg.sampleVoices}</span>
                  <ArrowRight size={15} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section
        className="genre-section-block"
        aria-label={categoryKey === 'personal' ? 'Cross-Pacific Themes' : 'Literary Genres'}
      >
        {categoryKey === 'personal' && (
          <h2 className="genre-section-subheading">Or By Cross-Pacific Theme</h2>
        )}

        <div className="genre-choice-grid">
          {themeOrGenreEntries.map((sub) => (
            <button
              key={sub.id}
              type="button"
              id={`choose-genre-${sub.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="genre-choice-card"
              onClick={() => onSelectGenre(sub.id)}
            >
              <div className="genre-card-top">
                <h3 className="genre-card-title">{sub.label}</h3>
                <span className="genre-unread-pill">
                  {sub.unreadCount > 0 ? `${sub.unreadCount} unread` : `${sub.count} read`}
                </span>
              </div>
              <div className="genre-card-footer">
                <span className="genre-sample-voices">
                  {sub.sampleVoices || `${sub.count} works`}
                </span>
                <ArrowRight size={15} />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
