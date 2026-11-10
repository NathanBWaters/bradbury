/**
 * Formats a complete reading item (Poem, Short Story, Essay, or Korea/SF story)
 * including its 5-paragraph literary/cultural analysis and primary sources
 * into clean plain text for immediate narration in ElevenReader.
 */
export function formatFullPlainTextForElevenReader(item, includeAnalysis = true) {
  if (!item) return '';

  const headerLines = [
    `${item.title}`,
    item.author
      ? `By ${item.author} (${item.year} • ${item.era})`
      : `${item.region} — ${item.subtitle} (${item.era})`,
    ''
  ];

  if (item.epigraph) {
    headerLines.push(item.epigraph, '');
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
    sections.push('', '---', 'Five-Paragraph Literary and Historical Analysis', '');
    item.analysis.forEach((sec) => {
      sections.push(`${sec.heading}\n${sec.paragraph}`, '');
    });
  }

  if (Array.isArray(item.sources) && item.sources.length > 0) {
    sections.push('Primary and Historical Sources:');
    item.sources.forEach((src) => {
      sections.push(`• ${src.title} — ${src.author || ''} (${src.year || ''})`);
    });
  }

  return sections.join('\n');
}
