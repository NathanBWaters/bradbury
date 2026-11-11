import React from 'react';
import {
  Clock,
  BookOpen,
  Headphones,
  Download,
  CheckCircle2,
  Circle
} from 'lucide-react';

export default function ReadingOptionCard({
  item,
  completed,
  onOpenReader,
  onToggleComplete,
  onDownloadEpub,
  onShareElevenReader,
  onSelectGenre
}) {
  if (!item) return null;

  const isKorea = item.region === 'Korea';
  const isSF = item.region === 'San Francisco';
  const filterTarget = isKorea
    ? 'Korea'
    : isSF
    ? 'San Francisco'
    : item.genre || item.category;

  const badgeLabel = isKorea
    ? `Korea • ${item.themeGroup || item.category}`
    : isSF
    ? `San Francisco • ${item.themeGroup || item.category}`
    : item.genre || item.category;

  const previewText =
    item.epigraph ||
    (item.keyContext ? `${item.keyContext.split('. ').slice(0, 2).join('. ')}.` : '');

  return (
    <article
      className={`slot-card ${completed ? 'completed-grayed' : ''}`}
      data-testid={`reading-card-${item.id}`}
    >
      <div className="slot-card-body">
        <div className="slot-header">
          <button
            type="button"
            className={`slot-badge ${isKorea ? 'korea' : isSF ? 'sf' : ''}`}
            onClick={() => onSelectGenre && onSelectGenre(filterTarget)}
            title={`Filter by ${filterTarget}`}
          >
            {badgeLabel}
          </button>

          <div className="slot-meta-row">
            <Clock size={12} />
            <span>{item.readingTimeMinutes} min</span>
          </div>
        </div>

        <button
          type="button"
          className="slot-card-open-area"
          onClick={onOpenReader}
          aria-label={`Read ${item.title}`}
        >
          <h3 className={`slot-title ${completed ? 'strikethrough' : ''}`}>
            {item.title}
          </h3>

          <p className="slot-author">
            {item.author ? (
              <>
                {item.author}
                {item.year ? ` · ${item.year}` : ''}
              </>
            ) : (
              <>
                {item.location || item.subtitle}
                {item.era ? ` · ${item.era}` : ''}
              </>
            )}
          </p>

          {previewText && <p className="slot-epigraph">{previewText}</p>}
        </button>
      </div>

      <div className="slot-footer">
        <div className="slot-actions">
          <button
            type="button"
            className="btn-primary card-read-btn"
            onClick={onOpenReader}
          >
            <BookOpen size={14} />
            <span>{completed ? 'Re-Read' : 'Read'}</span>
          </button>

          <button
            type="button"
            className="icon-btn card-eleven-btn"
            onClick={onShareElevenReader}
            title="Listen in ElevenReader (shares full text + analysis & marks read)"
          >
            <Headphones size={14} />
            <span>Listen</span>
          </button>

          <button
            type="button"
            className="icon-btn card-epub-btn"
            onClick={onDownloadEpub}
            title="Download .epub with analysis"
            aria-label={`Download ${item.title} as EPUB`}
          >
            <Download size={14} />
            <span className="epub-btn-text">.epub</span>
          </button>
        </div>

        <button
          type="button"
          className={`check-btn ${completed ? 'done' : ''}`}
          onClick={onToggleComplete}
          aria-pressed={completed}
          aria-label={completed ? `Unmark ${item.title} as read` : `Mark ${item.title} as read`}
        >
          {completed ? (
            <>
              <CheckCircle2 size={15} />
              <span>Done</span>
            </>
          ) : (
            <>
              <Circle size={15} />
              <span>Done</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

