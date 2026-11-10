import React from 'react';
import {
  Clock,
  MapPin,
  BookOpen,
  Share2,
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
  const genreOrCategory = item.genre || item.category;

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
            onClick={() => onSelectGenre && onSelectGenre(genreOrCategory)}
            title="Filter by this genre"
          >
            {isKorea
              ? `🇰🇷 Korea • ${item.category}`
              : isSF
              ? `🌉 SF • ${item.category}`
              : genreOrCategory}
          </button>

          <div className="slot-meta-row">
            <Clock size={12} />
            <span>{item.readingTimeMinutes}m</span>
            {item.wordCount ? <span>• {item.wordCount.toLocaleString()}w</span> : null}
            {item.lineCount ? <span>• {item.lineCount}L</span> : null}
          </div>
        </div>

        <h3
          className={`slot-title ${completed ? 'strikethrough' : ''}`}
          onClick={onOpenReader}
        >
          {item.title}
        </h3>

        <p className="slot-author">
          {item.author ? (
            <>
              {item.author} • {item.year} ({item.era})
            </>
          ) : (
            <>
              {item.subtitle} • {item.era}
            </>
          )}
        </p>

        {item.epigraph && <p className="slot-epigraph">{item.epigraph}</p>}

        <div className="slot-tags">
          {item.author ? (
            <span className="slot-tag">Verbatim Unabridged</span>
          ) : (
            item.location && (
              <span className="slot-tag location-tag">
                <MapPin size={11} />
                {item.location}
              </span>
            )
          )}
          <span className="slot-tag">
            +Key Context &amp; {item.analysis?.length || 5}-Para Analysis
          </span>
          {Array.isArray(item.sources) && item.sources.length > 0 && (
            <span className="slot-tag sources-tag">{item.sources.length} Sources Cited</span>
          )}
        </div>
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
            title="Share full unabridged text & 5-paragraph analysis to ElevenReader"
          >
            <Share2 size={14} />
            <span>ElevenReader</span>
          </button>

          <button
            type="button"
            className="icon-btn card-epub-btn"
            onClick={onDownloadEpub}
            title="Download .epub with 5-paragraph analysis for ElevenReader"
          >
            <Download size={14} />
            <span>.epub</span>
          </button>
        </div>

        <button
          type="button"
          className={`check-btn ${completed ? 'done' : ''}`}
          onClick={onToggleComplete}
          aria-pressed={completed}
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
