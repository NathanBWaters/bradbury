/**
 * Formats a complete reading item (Poem, Short Story, Essay, or Korea/SF story)
 * including its 5-paragraph literary/cultural analysis and primary sources
 * into clean plain text for immediate narration in ElevenReader.
 */
export function formatFullPlainTextForElevenReader(item, includeAnalysis = true, options = {}) {
  if (!item) return '';

  const isPersonalOrSeries =
    !item.author || item.categoryKey === 'personal' || Boolean(item.seriesId);
  const headerLines = [
    item.seriesTitle ? `${item.seriesTitle}\n${item.title}` : `${item.title}`,
    item.author
      ? `By ${item.author} (${item.year} • ${item.era})`
      : `${item.region} — ${item.subtitle} (${item.era})`,
    ''
  ];

  if (item.epigraph) {
    headerLines.push(item.epigraph, '');
  }

  // Personal & historical audio documentaries begin inside their hook without spoiling later events
  if (includeAnalysis && item.keyContext && !isPersonalOrSeries) {
    headerLines.push('Key Context & Why It Matters:', item.keyContext, '', '---', '');
  }

  let bodyText = '';
  if (Array.isArray(item.fullText)) {
    bodyText = item.fullText.join('\n\n');
  } else if (typeof item.fullText === 'string') {
    bodyText = item.fullText;
  } else if (Array.isArray(item.paragraphs)) {
    bodyText = item.paragraphs.join('\n\n');
  }

  const sections = [...headerLines, bodyText];

  if (includeAnalysis && Array.isArray(item.analysis) && item.analysis.length > 0) {
    if (isPersonalOrSeries) {
      sections.push('', 'Post-Story Historical Analysis', '');
    } else {
      sections.push('', '---', 'Literary and Historical Analysis', '');
    }
    item.analysis.forEach((sec) => {
      sections.push(`${sec.heading}\n${sec.paragraph}`, '');
    });
  }

  const includeSources =
    options.includeSources !== undefined ? options.includeSources : !isPersonalOrSeries;
  if (includeSources && Array.isArray(item.sources) && item.sources.length > 0) {
    sections.push('Primary and Historical Sources:');
    item.sources.forEach((src) => {
      sections.push(`• ${src.title} — ${src.author || ''} (${src.year || ''})`);
    });
  }

  return sections.join('\n');
}
