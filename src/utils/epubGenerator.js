/**
 * Pure-JS Spec-Compliant EPUB 2.0.1 / 3.0 Generator
 * Builds an uncompressed ZIP archive with `mimetype` as the first entry
 * (no extra field, stored method 0) so ElevenReader Chrome Extension,
 * ElevenReader iOS/Android, Apple Books, and Kindle import it cleanly.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createZipArchive(files) {
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, 0, true); // compression method: 0 (STORE)
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0x21, true); // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length MUST be 0 for mimetype
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, dataBytes);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // store
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  let centralSize = 0;
  for (const c of centralChunks) centralSize += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localChunks, ...centralChunks, eocd], {
    type: 'application/epub+zip'
  });
}

function renderItemBodyHtml(item, slotLabel, includeAnalysis = true) {
  let bodyHtml = '';

  if (Array.isArray(item.fullText)) {
    bodyHtml = item.fullText
      .map(
        (stanza) =>
          `<div class="stanza">${escapeXml(stanza)
            .split('\n')
            .map((line) => `<p class="poem-line">${line}</p>`)
            .join('')}</div>`
      )
      .join('\n');
  } else if (typeof item.fullText === 'string') {
    bodyHtml = item.fullText
      .split(/\n\s*\n/)
      .map(
        (stanza) =>
          `<div class="stanza">${escapeXml(stanza)
            .split('\n')
            .map((line) => `<p class="poem-line">${line}</p>`)
            .join('')}</div>`
      )
      .join('\n');
  } else if (Array.isArray(item.paragraphs)) {
    bodyHtml = item.paragraphs
      .map((p) => `<p class="prose-para">${escapeXml(p)}</p>`)
      .join('\n');
  }

  let analysisHtml = '';
  if (includeAnalysis && Array.isArray(item.analysis) && item.analysis.length > 0) {
    analysisHtml = `
      <hr class="divider" />
      <section class="analysis-section">
        <h2>Literary &amp; Historical Analysis</h2>
        ${item.analysis
          .map(
            (sec) => `
          <div class="analysis-block">
            <h3>${escapeXml(sec.heading)}</h3>
            <p>${escapeXml(sec.paragraph)}</p>
          </div>
        `
          )
          .join('\n')}
      </section>
    `;
  }

  let sourcesHtml = '';
  if (Array.isArray(item.sources) && item.sources.length > 0) {
    sourcesHtml = `
      <hr class="divider" />
      <section class="sources-section">
        <h2>Primary &amp; Historical Sources</h2>
        <ul>
          ${item.sources
            .map(
              (src) =>
                `<li><strong>${escapeXml(src.title)}</strong> — ${escapeXml(src.author || '')} (${escapeXml(
                  src.year || ''
                )})</li>`
            )
            .join('\n')}
        </ul>
      </section>
    `;
  }

  const keyContextText = item.keyContext || item.analysis?.[0]?.paragraph || '';
  const keyContextHtml =
    includeAnalysis && keyContextText
      ? `<div class="analysis-block"><h3>Key Context &amp; Why It Matters</h3><p>${escapeXml(
          keyContextText
        )}</p></div>`
      : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <title>${escapeXml(item.title)} — ${escapeXml(item.author || item.region || '')}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <div class="chapter">
    <p class="kicker">${escapeXml(slotLabel)} • ${escapeXml(item.genre || item.category || '')} • ${escapeXml(
    item.year || item.era || ''
  )}</p>
    <h1>${escapeXml(item.title)}</h1>
    <p class="byline">By ${escapeXml(item.author || `${item.region} Cultural Chronicle`)}</p>
    ${item.epigraph ? `<blockquote class="epigraph">${escapeXml(item.epigraph)}</blockquote>` : ''}
    ${keyContextHtml}
    <div class="content-body">
      ${bodyHtml}
    </div>
    ${analysisHtml}
    ${sourcesHtml}
  </div>
</body>
</html>`;
}

export function buildEpubBlob({ title, subtitle, author, uid, chapters, includeAnalysis = true }) {
  const files = [
    {
      name: 'mimetype',
      content: 'application/epub+zip'
    },
    {
      name: 'META-INF/container.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    },
    {
      name: 'OEBPS/style.css',
      content: `
body { font-family: Georgia, serif; line-height: 1.65; margin: 5%; color: #1c1917; }
h1 { font-size: 1.8em; margin-bottom: 0.2em; line-height: 1.25; }
h2 { font-size: 1.35em; margin-top: 1.8em; border-top: 1px solid #d6d3d1; padding-top: 1em; }
h3 { font-size: 1.05em; margin-top: 1.2em; margin-bottom: 0.3em; color: #44403c; }
.kicker { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; margin-bottom: 0.3em; }
.byline { font-style: italic; color: #57534e; margin-top: 0; margin-bottom: 1.5em; }
.epigraph { font-style: italic; border-left: 3px solid #d97706; padding-left: 1em; margin: 1.2em 0; color: #44403c; }
.stanza { margin-bottom: 1.2em; }
.poem-line { margin: 0.15em 0; }
.prose-para { margin-bottom: 1.1em; text-align: justify; }
.divider { margin: 2.5em 0; border: 0; border-top: 1px solid #e7e5e4; }
.analysis-intro { font-style: italic; color: #57534e; }
`
    }
  ];

  const manifestItems = [
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="css" href="style.css" media-type="text/css"/>`
  ];
  const spineItems = [];
  const navPoints = [];

  chapters.forEach((ch, idx) => {
    const id = `chapter_${idx + 1}`;
    const filename = `${id}.xhtml`;
    files.push({
      name: `OEBPS/${filename}`,
      content: renderItemBodyHtml(ch.item, ch.slotLabel, includeAnalysis)
    });
    manifestItems.push(
      `<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`<itemref idref="${id}"/>`);
    navPoints.push(`
      <navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}">
        <navLabel><text>${escapeXml(ch.slotLabel)}: ${escapeXml(ch.item.title)}</text></navLabel>
        <content src="${filename}"/>
      </navPoint>`);
  });

  files.push({
    name: 'OEBPS/content.opf',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(author || 'Bradbury 1000 Curated Anthology')}</dc:creator>
    <dc:language>en</dc:language>
    <dc:description>${escapeXml(subtitle || '')}</dc:description>
    <dc:identifier id="BookId" opf:scheme="URI">${escapeXml(uid || `urn:uuid:bradbury-1000-${Date.now()}`)}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`
  });

  files.push({
    name: 'OEBPS/toc.ncx',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(uid || 'bradbury-1000')}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    ${navPoints.join('\n')}
  </navMap>
</ncx>`
  });

  return createZipArchive(files);
}

export function downloadEpubBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.epub') ? filename : `${filename}.epub`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}
