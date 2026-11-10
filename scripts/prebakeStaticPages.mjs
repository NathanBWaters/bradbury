import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const poemsAndEssaysPath = path.join(rootDir, 'src/data/poemsAndEssays.json');
const storiesAndPlacesPath = path.join(rootDir, 'src/data/storiesAndPlaces.json');

if (!fs.existsSync(poemsAndEssaysPath) || !fs.existsSync(storiesAndPlacesPath)) {
  console.log('Data files not yet present; skipping static reader page generation.');
  process.exit(0);
}

const poemsAndEssays = JSON.parse(fs.readFileSync(poemsAndEssaysPath, 'utf8'));
const storiesAndPlaces = JSON.parse(fs.readFileSync(storiesAndPlacesPath, 'utf8'));

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStaticArticleHtml({ night, slotKey, slotLabel, item }) {
  let bodyContent = '';
  if (Array.isArray(item.fullText)) {
    bodyContent = item.fullText
      .map(
        (stanza) =>
          `<div class="stanza">${escapeHtml(stanza)
            .split('\n')
            .map((l) => `<p class="poem-line">${l}</p>`)
            .join('')}</div>`
      )
      .join('\n');
  } else if (typeof item.fullText === 'string') {
    bodyContent = item.fullText
      .split(/\n\s*\n/)
      .map(
        (stanza) =>
          `<div class="stanza">${escapeHtml(stanza)
            .split('\n')
            .map((l) => `<p class="poem-line">${l}</p>`)
            .join('')}</div>`
      )
      .join('\n');
  } else if (Array.isArray(item.paragraphs)) {
    bodyContent = item.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
  }

  const analysisContent = Array.isArray(item.analysis)
    ? `
    <hr />
    <section class="analysis">
      <h2>Literary &amp; Historical Analysis</h2>
      ${item.analysis
        .map(
          (sec) => `
        <div class="analysis-item">
          <h3>${escapeHtml(sec.heading)}</h3>
          <p>${escapeHtml(sec.paragraph)}</p>
        </div>`
        )
        .join('\n')}
    </section>`
    : '';

  const sourcesContent = Array.isArray(item.sources)
    ? `
    <hr />
    <section class="analysis">
      <h2>Primary &amp; Historical Sources</h2>
      ${item.sources
        .map(
          (src) => `
        <div class="analysis-item">
          <h3>${escapeHtml(src.title)}</h3>
          <p>${escapeHtml(src.author || '')} ${src.year ? `(${escapeHtml(src.year)})` : ''} ${
            src.url ? `— <a href="${escapeHtml(src.url)}">${escapeHtml(src.url)}</a>` : ''
          }</p>
        </div>`
        )
        .join('\n')}
    </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(item.title)} — ${escapeHtml(
    item.author || item.region || 'Bradbury 1000'
  )}</title>
  <meta name="author" content="${escapeHtml(item.author || item.region || 'Bradbury 1000')}" />
  <meta name="description" content="${escapeHtml(
    item.epigraph || `${slotLabel}: ${item.title}`
  )}" />
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #fbf8f1;
      color: #1f1a16;
      line-height: 1.78;
      margin: 0;
      padding: 2rem 1.25rem 4rem;
    }
    main, article {
      max-width: 68ch;
      margin: 0 auto;
    }
    .nav-back {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 0.85rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2dac9;
      padding-bottom: 0.75rem;
    }
    .nav-back a {
      color: #b45309;
      text-decoration: none;
      font-weight: 600;
    }
    .kicker {
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.78rem;
      color: #b45309;
      margin-bottom: 0.35rem;
    }
    h1 {
      font-size: 2.25rem;
      line-height: 1.18;
      margin: 0 0 0.35rem;
    }
    .byline {
      font-style: italic;
      color: #57534e;
      margin-bottom: 1.5rem;
    }
    blockquote.epigraph {
      border-left: 3px solid #d97706;
      padding-left: 1rem;
      margin: 0 0 2rem;
      font-style: italic;
      color: #44403c;
    }
    .stanza {
      margin-bottom: 1.4rem;
    }
    .poem-line {
      margin: 0.15rem 0;
    }
    hr {
      border: 0;
      border-top: 2px solid #d6cec2;
      margin: 2.5rem 0;
    }
    .analysis h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    .analysis-item {
      background: #f4efe4;
      border: 1px solid #e2dac9;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .analysis-item h3 {
      font-size: 0.92rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #92400e;
      margin: 0 0 0.4rem;
    }
    .analysis-item p {
      margin: 0;
    }
  </style>
</head>
<body>
  <main>
    <div class="nav-back">
      <a href="/#/read/day-${night}/${slotKey}">← Open in Bradbury 1000 Interactive App</a>
      <span>ElevenReader Clean Import View</span>
    </div>
    <article>
      <div class="kicker">${escapeHtml(slotLabel)} • ${escapeHtml(item.genre || item.category || '')}</div>
      <h1>${escapeHtml(item.title)}</h1>
      <p class="byline">
        ${escapeHtml(item.author || `${item.region} — ${item.subtitle}`)} (${escapeHtml(
    item.year || item.era || ''
  )}) • ${item.readingTimeMinutes} min read
      </p>
      ${item.epigraph ? `<blockquote class="epigraph">${escapeHtml(item.epigraph)}</blockquote>` : ''}
      ${
        item.keyContext || item.analysis?.[0]?.paragraph
          ? `<div class="analysis-item"><h3>Key Context &amp; Why It Matters</h3><p>${escapeHtml(
              item.keyContext || item.analysis?.[0]?.paragraph
            )}</p></div>`
          : ''
      }
      <div class="article-body">
        ${bodyContent}
      </div>
      ${analysisContent}
      ${sourcesContent}
    </article>
  </main>
</body>
</html>`;
}

let count = 0;
for (let n = 1; n <= 100; n++) {
  const poem = poemsAndEssays.poems.find((p) => p.night === n);
  const story = storiesAndPlaces.stories.find((s) => s.night === n);
  const essay = poemsAndEssays.essays.find((e) => e.night === n);
  const korea = storiesAndPlaces.koreaStories.find((k) => k.night === n);
  const sf = storiesAndPlaces.sfStories.find((s) => s.night === n);

  const slots = [
    { slotKey: 'poem', slotLabel: 'Nightly Poem', item: poem },
    { slotKey: 'story', slotLabel: 'Nightly Short Story', item: story },
    { slotKey: 'essay', slotLabel: 'Nightly Essay', item: essay },
    { slotKey: 'korea', slotLabel: 'Korea Deep-Dive Story', item: korea },
    { slotKey: 'sf', slotLabel: 'San Francisco Deep-Dive Story', item: sf }
  ];

  for (const s of slots) {
    if (!s.item) continue;
    const outDir = path.join(rootDir, 'public', 'read', `day-${n}`, s.slotKey);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'index.html'),
      renderStaticArticleHtml({ night: n, ...s }),
      'utf8'
    );
    count++;
  }
}

console.log(`Pre-baked ${count} distraction-free static reader pages under public/read/day-1..100/`);

