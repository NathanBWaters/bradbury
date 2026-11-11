import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Check,
  Feather,
  BookOpen,
  ScrollText,
  Compass,
  PlusCircle
} from 'lucide-react';
import { MAIN_CATEGORIES, searchCatalog } from '../utils/catalogEngine.js';

const ICON_MAP = {
  poem: Feather,
  story: BookOpen,
  essay: ScrollText,
  personal: Compass
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  ...MAIN_CATEGORIES.map((c) => ({ key: c.key, label: c.shortLabel }))
];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights matched query fragments inside a literary title without harsh colors.
 */
function renderHighlightedTitle(title, rawQuery) {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed || !title) return title;

  // Build alternation from full trimmed phrase + individual >=2-char tokens
  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter((t) => t.length >= 2);

  const candidates = [trimmed, ...tokens]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((part) => escapeRegExp(part).replace(/['’]/g, "['’]"));

  if (candidates.length === 0) return title;

  try {
    const rx = new RegExp(`(${candidates.join('|')})`, 'gi');
    const parts = String(title).split(rx);
    if (parts.length <= 1) return title;
    return parts.map((part, idx) =>
      idx % 2 === 1 ? (
        <mark key={idx} className="catalog-search-mark">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return title;
  }
}

function getDisplayDuration(item) {
  const mins = item.audioDurationMinutes || item.readingTimeMinutes;
  if (mins) return `${mins} min`;
  if (item.categoryKey === 'poem') return '~11 min';
  if (item.categoryKey === 'personal') return '20 min';
  return '~16 min';
}

export default function SearchModal({
  isOpen,
  initialCategory = 'all',
  allItemsByCategory,
  completedItems = {},
  onClose,
  onSelectItem,
  onOpenExternalWithTitle
}) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory || 'all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCategoryFilter(initialCategory || 'all');
      setActiveIndex(0);
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen, initialCategory]);

  // Lock background scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const searchState = useMemo(
    () =>
      searchCatalog(allItemsByCategory, query, {
        categoryKey: categoryFilter,
        completedItems,
        limit: 40
      }),
    [allItemsByCategory, query, categoryFilter, completedItems]
  );

  const { results, isQueryEmpty, totalMatches, totalAllCategories, countsByCategory } =
    searchState;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, categoryFilter]);

  // Keep keyboard-selected row visible inside the scroll container
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-search-idx="${activeIndex}"]`);
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev + 1) % results.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      }
      return;
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      onSelectItem(results[activeIndex]);
    }
  }

  return (
    <div
      className="catalog-search-backdrop"
      id="catalog-search-modal"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="catalog-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-search-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="catalog-search-heading" className="sr-only">
          Search the Bradbury 1000 Library
        </h2>

        {/* Top Input Row */}
        <div className="catalog-search-header">
          <Search size={18} className="catalog-search-leading-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id="catalog-search-input"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="catalog-search-input"
            placeholder="Search by title, author, or place…"
            aria-label="Search by title, author, or place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {query && (
            <button
              type="button"
              id="catalog-search-clear-btn"
              className="catalog-search-clear-btn"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            id="catalog-search-close-btn"
            className="catalog-search-close-btn"
            onClick={onClose}
            aria-label="Close search"
            title="Close (Esc)"
          >
            <span className="hide-on-mobile catalog-esc-label">Esc</span>
            <span className="show-on-mobile-only catalog-cancel-label">Cancel</span>
          </button>
        </div>

        {/* Category Filter Strip with Live Match Counts */}
        <div
          className="catalog-search-filters"
          role="tablist"
          aria-label="Filter search results by form"
        >
          {FILTER_TABS.map((tab) => {
            const count = countsByCategory?.[tab.key] ?? 0;
            const isActive = categoryFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                id={`search-filter-${tab.key}`}
                role="tab"
                aria-selected={isActive}
                className={`catalog-filter-pill ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setCategoryFilter(tab.key);
                  inputRef.current?.focus();
                }}
              >
                <span>{tab.label}</span>
                <span className="catalog-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Results / Quick Index Body */}
        <div className="catalog-search-body" ref={listRef}>
          <div className="catalog-search-section-bar">
            <span>
              {isQueryEmpty
                ? categoryFilter === 'all'
                  ? 'Suggested Unread Titles Across All 4 Pillars'
                  : `Suggested Unread in ${
                      FILTER_TABS.find((t) => t.key === categoryFilter)?.label || 'Shelf'
                    }`
                : totalMatches === 0
                ? '0 Matches'
                : totalMatches > results.length
                ? `Showing Top ${results.length} of ${totalMatches} Matches`
                : `${totalMatches} ${totalMatches === 1 ? 'Match' : 'Matches'}`}
            </span>
            <span className="hide-on-mobile catalog-kbd-hint">↑↓ Navigate • ↵ Open</span>
          </div>

          {results.length === 0 ? (
            <div className="catalog-search-empty" id="catalog-search-empty">
              <p className="catalog-empty-title">
                No titles matching <strong>&ldquo;{query.trim()}&rdquo;</strong>
                {categoryFilter !== 'all'
                  ? ` in ${FILTER_TABS.find((t) => t.key === categoryFilter)?.label}`
                  : ' in the 400-work library'}
                .
              </p>

              <div className="catalog-empty-actions">
                {categoryFilter !== 'all' && totalAllCategories > 0 && (
                  <button
                    type="button"
                    id="catalog-search-widen-btn"
                    className="btn-primary"
                    onClick={() => setCategoryFilter('all')}
                  >
                    Show {totalAllCategories}{' '}
                    {totalAllCategories === 1 ? 'match' : 'matches'} across all 400 works
                  </button>
                )}

                {onOpenExternalWithTitle && query.trim().length > 0 && (
                  <button
                    type="button"
                    id="catalog-search-log-external-btn"
                    className="btn-secondary"
                    onClick={() => onOpenExternalWithTitle(query.trim())}
                  >
                    <PlusCircle size={15} />
                    <span>Log &ldquo;{query.trim().slice(0, 32)}&rdquo; as an outside read</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="catalog-search-list" role="listbox" aria-label="Matching titles">
              {results.map((item, idx) => {
                const IconComp = ICON_MAP[item.categoryKey] || BookOpen;
                const isDone = Boolean(completedItems[item.id]?.completed);
                const isSelected = idx === activeIndex;
                const byline = item.author || item.regionGroup || item.region || item.slotLabel;
                const genreText =
                  item.categoryKey === 'personal'
                    ? item.category || item.themeGroup
                    : item.genre || item.subcategory;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-search-idx={idx}
                    data-testid={`search-result-${item.id}`}
                    className={`catalog-search-row ${isSelected ? 'is-active' : ''} ${
                      isDone ? 'is-completed' : ''
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => onSelectItem(item)}
                  >
                    <span className="catalog-row-icon" aria-hidden="true">
                      <IconComp size={16} />
                    </span>

                    <span className="catalog-row-main">
                      <span className="catalog-row-title">
                        {renderHighlightedTitle(item.title, query)}
                      </span>
                      <span className="catalog-row-meta">
                        <span>{byline}</span>
                        <span aria-hidden="true">•</span>
                        <span>{genreText}</span>
                        <span aria-hidden="true">•</span>
                        <span>{getDisplayDuration(item)}</span>
                      </span>
                    </span>

                    <span className="catalog-row-trailing">
                      {isDone ? (
                        <span className="catalog-done-pill">
                          <Check size={12} strokeWidth={2.6} />
                          <span>Read</span>
                        </span>
                      ) : (
                        <ArrowRight size={15} className="catalog-open-arrow" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
