import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { MAIN_CATEGORIES } from '../utils/catalogEngine.js';
import ReadingOptionCard from './ReadingOptionCard.jsx';
import { FolioMascot } from './FolioMascot.jsx';

export default function ShelfView({
  selectedCategory,
  selectedSubcategory,
  subcategories,
  unreadItems,
  completedCategoryItems,
  onBackToGenres,
  onChangeType,
  onSelectSubcategory,
  onSurpriseFromShelf,
  onOpenReader,
  onToggleComplete,
  onDownloadEpub,
  onShareElevenReader
}) {
  const categoryMeta =
    MAIN_CATEGORIES.find((c) => c.key === selectedCategory) || MAIN_CATEGORIES[1];

  const activeGenreLabel =
    selectedSubcategory && selectedSubcategory !== 'All'
      ? selectedSubcategory
      : `All ${categoryMeta.pluralLabel || categoryMeta.shortLabel}`;

  return (
    <div className="funnel-page shelf-page" id="shelf-view">
      <nav className="funnel-breadcrumb-bar with-progress" aria-label="Shelf breadcrumb">
        <div className="funnel-breadcrumb-row">
          <button
            type="button"
            id="shelf-back-genres-btn"
            className="funnel-back-btn"
            onClick={onBackToGenres}
          >
            <ArrowLeft size={15} />
            <span>{selectedCategory === 'personal' ? 'Places & Themes' : 'Genres'}</span>
          </button>

          <div className="shelf-breadcrumb-trail">
            <button
              type="button"
              id="shelf-change-type-btn"
              className="breadcrumb-link-btn"
              onClick={onChangeType}
            >
              {categoryMeta.shortLabel}
            </button>
            <span aria-hidden="true">/</span>
            <span className="breadcrumb-current">
              {selectedSubcategory === 'All' ? 'All' : selectedSubcategory}
            </span>
          </div>
        </div>
        <div className="funnel-step-progress-track" aria-hidden="true">
          <div className="funnel-step-progress-fill" style={{ width: '100%' }} />
        </div>
      </nav>

      <header className="shelf-header">
        <div className="shelf-header-top">
          <div>
            <p className="funnel-eyebrow">
              {categoryMeta.label} • {unreadItems.length} Unread
              {completedCategoryItems.length > 0
                ? ` • ${completedCategoryItems.length} Completed`
                : ''}
            </p>
            <h1 className="funnel-title section-heading-title">{activeGenreLabel}</h1>
          </div>

          {unreadItems.length > 1 && (
            <button
              type="button"
              id="shelf-surprise-btn"
              className="btn-secondary shelf-surprise-btn"
              onClick={onSurpriseFromShelf}
            >
              <Sparkles size={14} />
              <span>Pick One For Me</span>
            </button>
          )}
        </div>

        {/* Compact sibling genre strip for effortless switching while browsing */}
        <div
          className="genre-filter-strip shelf-filter-strip"
          role="tablist"
          aria-label="Switch genre within this category"
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
                <span>{sub.id === 'All' ? 'All' : sub.label}</span>
                <span className="chip-count">{sub.unreadCount ?? sub.count}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* UNREAD OPTIONS SECTION */}
      <section className="options-section" aria-label="Unread Reading Options">
        {unreadItems.length === 0 ? (
          <div className="empty-filter-card">
            <div className="empty-mascot-center">
              <FolioMascot mood="royal" lit={true} size={86} />
            </div>
            <p>
              Bravo! You&rsquo;ve read every work in <strong>{activeGenreLabel}</strong>!
            </p>
            <div className="empty-filter-actions">
              {selectedSubcategory !== 'All' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onSelectSubcategory('All')}
                >
                  Show All {categoryMeta.shortLabel}
                </button>
              )}
              <button type="button" className="btn-primary" onClick={onChangeType}>
                Choose Another Form
              </button>
            </div>
          </div>
        ) : (
          <div className="quartet-grid" id="unread-options-grid">
            {unreadItems.map((item) => (
              <ReadingOptionCard
                key={item.id}
                item={item}
                completed={false}
                onOpenReader={() => onOpenReader(item)}
                onToggleComplete={() => onToggleComplete(item)}
                onDownloadEpub={() => onDownloadEpub(item)}
                onShareElevenReader={() => onShareElevenReader(item)}
                onSelectGenre={(g) => onSelectSubcategory(g)}
              />
            ))}
          </div>
        )}
      </section>

      {/* COMPLETED ARCHIVE SECTION */}
      {completedCategoryItems.length > 0 && (
        <section
          className="completed-section"
          id="completed-options-section"
          aria-label="Completed Reading Options"
        >
          <div className="section-heading-row">
            <h2 className="section-heading-title muted">
              Completed in this shelf ({completedCategoryItems.length})
            </h2>
            <span className="completed-hint">Tap any work to re-read or unmark</span>
          </div>

          <div className="quartet-grid">
            {completedCategoryItems.map((item) => (
              <ReadingOptionCard
                key={item.id}
                item={item}
                completed={true}
                onOpenReader={() => onOpenReader(item)}
                onToggleComplete={() => onToggleComplete(item)}
                onDownloadEpub={() => onDownloadEpub(item)}
                onShareElevenReader={() => onShareElevenReader(item)}
                onSelectGenre={(g) => onSelectSubcategory(g)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
