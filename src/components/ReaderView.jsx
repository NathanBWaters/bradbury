import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Headphones,
  Download,
  ExternalLink,
  CheckCircle2,
  Circle,
  BookOpen,
  Check,
  Type,
  Sparkles,
  Sun,
  Moon,
  Scroll
} from 'lucide-react';

const FONT_SCALES = [
  { value: 92, label: 'Small' },
  { value: 100, label: 'Default' },
  { value: 112, label: 'Large' },
  { value: 125, label: 'XL' }
];

const LINE_HEIGHTS = [
  { id: 'compact', value: 1.58, label: 'Compact' },
  { id: 'relaxed', value: 1.8, label: 'Relaxed' },
  { id: 'spacious', value: 2.0, label: 'Spacious' }
];

const READER_THEMES = [
  { id: 'parchment', label: 'Parchment', icon: Sun },
  { id: 'sepia', label: 'Sepia', icon: Scroll },
  { id: 'nocturnal', label: 'Nocturnal', icon: Moon }
];

export default function ReaderView({
  activeReader,
  isCompleted,
  profile,
  onUpdateProfile,
  onCloseReader,
  onShareElevenReader,
  onDownloadEpub,
  onToggleComplete
}) {
  const { item, slotLabel } = activeReader;
  const [showAaMenu, setShowAaMenu] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const fontScale = profile?.readerFontScale || 100;
  const lineHeightMode = profile?.readerLineHeight || 'relaxed';
  const currentTheme = profile?.theme || 'parchment';

  const lineHeightObj =
    LINE_HEIGHTS.find((l) => l.id === lineHeightMode) || LINE_HEIGHTS[1];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setScrollProgress(100);
        return;
      }
      const pct = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
      setScrollProgress(pct);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [item.id]);

  function scrollToAnalysis() {
    const el = document.getElementById('five-paragraph-analysis');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="reader-container" id="reader-view-container">
      {/* Live Reading Progress Bar */}
      <div className="reader-progress-track" aria-hidden="true">
        <div
          className="reader-progress-fill"
          id="reader-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Single-Row Sticky Mobile & Desktop Reader Toolbar */}
      <div className="reader-toolbar">
        <button
          type="button"
          id="reader-back-btn"
          className="btn-secondary reader-nav-back"
          onClick={onCloseReader}
        >
          <ArrowLeft size={15} />
          <span>{slotLabel}</span>
        </button>

        <div className="reader-toolbar-center">
          <span className="reader-pct-badge" id="reader-scroll-pct">
            {scrollProgress}%
          </span>
          {Array.isArray(item.analysis) && item.analysis.length > 0 && (
            <button
              type="button"
              id="jump-to-analysis-btn"
              className="reader-jump-pill"
              onClick={scrollToAnalysis}
              title="Jump directly to the 5-Paragraph Literary Analysis"
            >
              <Sparkles size={12} />
              <span>5-Para Analysis ↓</span>
            </button>
          )}
        </div>

        <div className="reader-toolbar-right">
          <button
            type="button"
            id="reader-aa-toggle-btn"
            className={`icon-btn aa-trigger-btn ${showAaMenu ? 'active' : ''}`}
            onClick={() => setShowAaMenu((prev) => !prev)}
            aria-expanded={showAaMenu}
            title="Typography, Font Size & Reading Theme"
          >
            <Type size={15} />
            <span>Aa</span>
          </button>

          <div className="slot-actions hide-on-mobile">
            <button
              type="button"
              id="reader-elevenreader-share-btn"
              className="btn-secondary"
              onClick={() => onShareElevenReader(item)}
            >
              <Headphones size={15} />
              <span>ElevenReader</span>
            </button>

            <button
              type="button"
              id="reader-download-epub-btn"
              className="btn-secondary"
              onClick={() => onDownloadEpub(item)}
            >
              <Download size={15} />
              <span>.EPUB</span>
            </button>

            {item.staticUrl && (
              <a
                href={item.staticUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                title="Open raw static HTML Reader URL for ElevenReader URL Import"
              >
                <ExternalLink size={14} />
                <span>Static URL</span>
              </a>
            )}

            <button
              type="button"
              id="reader-mark-complete-btn"
              className={`check-btn ${isCompleted ? 'done' : ''}`}
              onClick={() => onToggleComplete(item)}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Completed</span>
                </>
              ) : (
                <>
                  <Circle size={15} />
                  <span>Mark Read</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Apple Books / Readwise Style Aa Typography & Theme Drawer */}
      {showAaMenu && (
        <div
          className="aa-typography-drawer"
          id="aa-typography-drawer"
          role="region"
          aria-label="Typography and Theme Controls"
        >
          <div className="aa-control-row">
            <span className="aa-control-label">Paper Theme</span>
            <div className="aa-segmented-group">
              {READER_THEMES.map((t) => {
                const IconComp = t.icon;
                const active = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    id={`aa-theme-${t.id}`}
                    className={`aa-seg-btn theme-swatch-${t.id} ${active ? 'active' : ''}`}
                    onClick={() => onUpdateProfile && onUpdateProfile({ theme: t.id })}
                  >
                    <IconComp size={13} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="aa-control-row">
            <span className="aa-control-label">Type Size ({fontScale}%)</span>
            <div className="aa-segmented-group">
              {FONT_SCALES.map((fs) => (
                <button
                  key={fs.value}
                  type="button"
                  id={`aa-font-${fs.value}`}
                  className={`aa-seg-btn ${fontScale === fs.value ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateProfile && onUpdateProfile({ readerFontScale: fs.value })
                  }
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </div>

          <div className="aa-control-row">
            <span className="aa-control-label">Line Spacing</span>
            <div className="aa-segmented-group">
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.id}
                  type="button"
                  id={`aa-lh-${lh.id}`}
                  className={`aa-seg-btn ${lineHeightMode === lh.id ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateProfile && onUpdateProfile({ readerLineHeight: lh.id })
                  }
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <article>
        <div className="reader-kicker">
          {slotLabel} • {item.genre || item.category}
        </div>
        <h1 className="reader-title">{item.title}</h1>
        <p className="reader-byline">
          {item.author ? (
            <>
              By <strong>{item.author}</strong> ({item.year} • {item.era})
            </>
          ) : (
            <>
              <strong>{item.region}</strong> — {item.subtitle} ({item.era} • {item.location})
            </>
          )}{' '}
          • {item.readingTimeMinutes} min read
        </p>

        {item.epigraph && <blockquote className="reader-epigraph">{item.epigraph}</blockquote>}

        {/* Verbatim Full Text with Dynamic Font Scaling & Line Spacing */}
        <div
          className="reader-body"
          id="reader-body-content"
          style={{
            fontSize: `${(1.08 * fontScale) / 100}rem`,
            lineHeight: lineHeightObj.value
          }}
        >
          {Array.isArray(item.fullText) ? (
            item.fullText.map((stanza, sIdx) => (
              <div key={sIdx} className="poem-stanza">
                {stanza.split('\n').map((line, lIdx) => (
                  <p
                    key={lIdx}
                    className="poem-line"
                    style={{
                      fontSize: `${(1.08 * fontScale) / 100}rem`,
                      lineHeight: lineHeightObj.value - 0.1
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            ))
          ) : typeof item.fullText === 'string' ? (
            item.fullText.split(/\n\s*\n/).map((stanza, sIdx) => (
              <div key={sIdx} className="poem-stanza">
                {stanza.split('\n').map((line, lIdx) => (
                  <p
                    key={lIdx}
                    className="poem-line"
                    style={{
                      fontSize: `${(1.08 * fontScale) / 100}rem`,
                      lineHeight: lineHeightObj.value - 0.1
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            ))
          ) : (
            (item.paragraphs || []).map((para, pIdx) => <p key={pIdx}>{para}</p>)
          )}
        </div>

        {/* 5-Paragraph Literary / Cultural Analysis at the End */}
        {Array.isArray(item.analysis) && item.analysis.length > 0 && (
          <section className="analysis-panel" id="five-paragraph-analysis">
            <div className="analysis-header">
              <div>
                <div className="reader-kicker">Post-Reading Critical Companion</div>
                <h2 className="analysis-title">
                  Five-Paragraph Literary &amp; Historical Analysis
                </h2>
              </div>
              <span className="slot-tag">{item.analysis.length} Paragraphs Pre-Baked</span>
            </div>

            {item.analysis.map((sec, idx) => (
              <div key={idx} className="analysis-paragraph-card">
                <h3>{sec.heading}</h3>
                <p
                  style={{
                    fontSize: `${(0.96 * fontScale) / 100}rem`,
                    lineHeight: lineHeightObj.value - 0.08
                  }}
                >
                  {sec.paragraph}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Primary & Historical Sources for Korea & San Francisco Deep-Dives */}
        {Array.isArray(item.sources) && item.sources.length > 0 && (
          <section
            className="analysis-panel"
            id="historical-sources-panel"
            style={{ marginTop: '2rem', paddingTop: '1.75rem' }}
          >
            <div className="analysis-header">
              <div>
                <div className="reader-kicker">Verified Archival &amp; Scholarly Citations</div>
                <h2 className="analysis-title">Primary &amp; Historical Sources</h2>
              </div>
              <span className="slot-tag">{item.sources.length} Real Sources Cited</span>
            </div>

            <div className="sources-list-grid">
              {item.sources.map((src, sIdx) => (
                <div key={sIdx} className="analysis-paragraph-card source-card">
                  <div className="source-card-top">
                    <strong>{src.title}</strong>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-ref-link"
                      >
                        Source Reference ↗
                      </a>
                    )}
                  </div>
                  <div className="source-card-meta">
                    {src.author} {src.year ? `• ${src.year}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="reader-bottom-bar">
          <div className="slot-actions">
            {item.standardEbooksUrl && (
              <a
                href={item.standardEbooksUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <BookOpen size={14} />
                <span>Standard Ebooks</span>
              </a>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <ExternalLink size={14} />
                <span>Source Archive</span>
              </a>
            )}
          </div>

          <button
            type="button"
            id="reader-finish-and-return-btn"
            className="btn-primary"
            onClick={() => {
              if (!isCompleted) {
                onToggleComplete(item);
              }
              onCloseReader();
            }}
          >
            <Check size={16} />
            <span>
              {isCompleted ? 'Completed — Back to Queue' : 'Mark Read & Credit Streak'}
            </span>
          </button>
        </div>
      </article>

      {/* Fixed Thumb-Zone Mobile Reader Action Bar */}
      <div className="mobile-reader-action-bar" aria-label="Mobile Reader Actions">
        <button
          type="button"
          id="mobile-reader-eleven-btn"
          className="reader-bar-btn"
          onClick={() => onShareElevenReader(item)}
        >
          <Headphones size={17} />
          <span>ElevenReader</span>
        </button>

        <button
          type="button"
          id="mobile-reader-epub-btn"
          className="reader-bar-btn"
          onClick={() => onDownloadEpub(item)}
        >
          <Download size={17} />
          <span>.EPUB</span>
        </button>

        <button
          type="button"
          id="mobile-reader-analysis-btn"
          className="reader-bar-btn"
          onClick={scrollToAnalysis}
        >
          <Sparkles size={17} />
          <span>Analysis</span>
        </button>

        <button
          type="button"
          id="mobile-reader-done-btn"
          className={`reader-bar-btn primary-done ${isCompleted ? 'done' : ''}`}
          onClick={() => onToggleComplete(item)}
        >
          {isCompleted ? <CheckCircle2 size={17} /> : <Circle size={17} />}
          <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
        </button>
      </div>
    </div>
  );
}
