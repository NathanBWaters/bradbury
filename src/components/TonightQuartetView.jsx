import React from 'react';
import {
  ArrowLeft,
  Shuffle,
  Sparkles,
  Download,
  RefreshCw
} from 'lucide-react';
import ReadingOptionCard from './ReadingOptionCard.jsx';
import { MascotCoachBanner } from './FolioMascot.jsx';

export default function TonightQuartetView({
  quartetEntries,
  completedItems,
  streakStats,
  soundEnabled = true,
  onBackHome,
  onShuffleAll,
  onShuffleSingleSlot,
  onOpenSurpriseFromQuartet,
  onDownloadQuartetEpub,
  onOpenReader,
  onToggleComplete,
  onDownloadSingleEpub,
  onShareElevenReader,
  onSelectGenreInShelf
}) {
  return (
    <div className="funnel-page tonight-quartet-page" id="tonight-quartet-view">
      <nav className="funnel-breadcrumb-bar with-progress" aria-label="Funnel navigation">
        <div className="funnel-breadcrumb-row">
          <button
            type="button"
            id="tonight-back-home-btn"
            className="funnel-back-btn"
            onClick={onBackHome}
          >
            <ArrowLeft size={15} />
            <span>Change Path</span>
          </button>
          <span className="funnel-step-indicator">Automatic Deal • 4 Pillars</span>
        </div>
        <div className="funnel-step-progress-track" aria-hidden="true">
          <div className="funnel-step-progress-fill" style={{ width: '100%' }} />
        </div>
      </nav>

      <header className="funnel-header-compact">
        <p className="funnel-eyebrow">Picked For You</p>
        <h1 className="funnel-title">Tonight&rsquo;s Curated Four</h1>
        <p className="funnel-lead">
          One unread work drawn from each of the four pillars. Pick whichever fits your mood
          tonight, swap any card, or open one at random.
        </p>

        <div className="quartet-toolbar">
          <button
            type="button"
            id="surprise-quartet-btn"
            className="btn-primary"
            onClick={onOpenSurpriseFromQuartet}
          >
            <Sparkles size={15} />
            <span>Open One For Me</span>
          </button>

          <button
            type="button"
            id="shuffle-quartet-btn"
            className="btn-secondary"
            onClick={onShuffleAll}
          >
            <Shuffle size={15} />
            <span>Shuffle All 4</span>
          </button>

          <button
            type="button"
            id="quartet-epub-btn"
            className="btn-secondary"
            onClick={onDownloadQuartetEpub}
            title="Bundle these four works into a single .epub for ElevenReader"
          >
            <Download size={15} />
            <span>Bundle .EPUB</span>
          </button>
        </div>
      </header>

      <MascotCoachBanner
        streakStats={streakStats}
        stepContext="tonight"
        soundEnabled={soundEnabled}
      />

      <section
        className="quartet-deal-grid"
        id="tonight-quartet-grid"
        aria-label="Tonight's four curated reading options"
      >
        {quartetEntries.map((entry, idx) => {
          const { item, categoryKey, shortLabel, isRecommendedNext, unreadRemaining } = entry;
          const isDone = Boolean(completedItems[item.id]?.completed);

          return (
            <div key={`${categoryKey}-${item.id}`} className="quartet-slot-wrapper">
              <div className="quartet-slot-topline">
                <div className="quartet-slot-label-group">
                  <span className="quartet-slot-num">0{idx + 1}</span>
                  <span className="quartet-slot-pillar">{shortLabel}</span>
                  {isRecommendedNext && !isDone && (
                    <span className="quartet-recommended-tag">Suggested Next</span>
                  )}
                </div>

                {unreadRemaining > 1 && (
                  <button
                    type="button"
                    id={`swap-slot-${categoryKey}`}
                    className="slot-swap-btn"
                    onClick={() => onShuffleSingleSlot(categoryKey)}
                    title={`Deal a different unread ${shortLabel.toLowerCase()} work`}
                  >
                    <RefreshCw size={12} />
                    <span>Swap</span>
                  </button>
                )}
              </div>

              <ReadingOptionCard
                item={item}
                completed={isDone}
                onOpenReader={() => onOpenReader(item)}
                onToggleComplete={() => onToggleComplete(item)}
                onDownloadEpub={() => onDownloadSingleEpub(item)}
                onShareElevenReader={() => onShareElevenReader(item)}
                onSelectGenre={(g) => onSelectGenreInShelf(categoryKey, g)}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
