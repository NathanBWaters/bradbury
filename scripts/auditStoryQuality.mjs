import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const TIER_BOUNDS = {
  compact: { minTotal: 2050, maxTotal: 2900, minBody: 1600, minAnalysis: 420, maxAnalysis: 700 },
  standard: { minTotal: 2950, maxTotal: 3950, minBody: 2450, minAnalysis: 420, maxAnalysis: 700 },
  epic: { minTotal: 3975, maxTotal: 5250, minBody: 3450, minAnalysis: 420, maxAnalysis: 700 },
  legacy: { minTotal: 900, maxTotal: 4000, minBody: 550, minAnalysis: 200, maxAnalysis: 900 }
};

const MAD_LIBS_MARKERS = [
  'field historians and architectural conservators',
  'hum of Muni buses',
  'court chroniclers and regional guilds',
  'Every curbstone, cast-iron utility cover',
  'Korean Historical & Cultural Era',
  'Nothing in this setting is accidental',
  'flesh-and-blood practitioners whose daily discipline',
  'At the philosophical core of this achievement lay a distinctively Korean synthesis',
  'Material selection proved decisive at every stage',
  'Closer inspection of the primary mechanism reveals a level of quantitative precision',
  'In a port city bounded on three sides by deep tidal waters',
  'transforming an improbably steep and seismically restless peninsula into an enduring laboratory',
  'Contemporary observers who walked past',
  'Colleagues and skeptics alike remarked on the relentless attention to physical detail',
  'imposed unforgiving constraints on every phase of the work',
  'primary historical records, physical craftsmanship, and enduring local geography',
  'Taken together, these insights from',
  'Walking these exact coordinates at',
  'archival documentation, and civic memory converge at this site'
];

const BANNED_AI_PHRASES = [
  /\btestament to\b/i,
  /\bindelible\b/i,
  /\btapestry\b/i,
  /\bdelve\b/i,
  /\bbeacon of\b/i,
  /\bnot merely\b/i,
  /\bnot just\b[^.!?]{0,50}\bbut\b/i,
  /\bmore than just\b/i,
  /\bit is worth noting\b/i,
  /\bit is important to note\b/i,
  /\bin conclusion\b/i,
  /\bpivotal role\b/i,
  /\bunderscores the\b/i,
  /\bserves as a reminder\b/i,
  /\bcrucible of\b/i,
  /\bprofound impact\b/i,
  /\bforever changed\b/i,
  /\bfurthermore\b/i,
  /\bmoreover\b/i,
  /\bultimately,/i,
  /\bfaussian bargain\b/i,
  /\bparadox\b/i,
  /\bdidn'?t know the word impossible\b/i,
  /\bto understand\b[^.!?]{0,60}\btravel back\b/i,
  /\bcracked the nation'?s moral\b/i,
  /\bthis (?:documentary|essay) traces\b/i,
  /\bdesigned for listeners\b/i,
  /\billuminated beacons\b/i,
  /\bbroke the internet\b/i,
  /\bmeanwhile,/i,
  /\byou have to rewind\b/i
];

const REQUIRED_NEW_ANALYSIS_HEADINGS = [
  '1. The Unresolved Debate',
  '2. The Road Not Taken',
  '3. How It Shapes Daily Life Today',
  '4. Essential Books, Films & Places to Go Deeper'
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'of', 'to', 'in', 'on', 'at', 'by',
  'for', 'with', 'as', 'from', 'into', 'that', 'this', 'these', 'those', 'it', 'its',
  'is', 'was', 'were', 'be', 'been', 'being', 'are', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'not', 'no', 'nor',
  'he', 'she', 'they', 'we', 'you', 'his', 'her', 'their', 'our', 'who', 'whom', 'which',
  'what', 'when', 'where', 'why', 'how', 'so', 'than', 'too', 'very', 'just', 'only',
  'also', 'even', 'all', 'more', 'most', 'other', 'some', 'such', 'one', 'two', 'over',
  'under', 'between', 'through', 'during', 'before', 'after', 'about', 'against', 'out'
]);

function countWords(text = '') {
  const clean = String(text || '').trim();
  return clean ? clean.split(/\s+/).length : 0;
}

function normalizeTokens(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function contentWordSet(text = '') {
  return new Set(
    normalizeTokens(text).filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

function jaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union > 0 ? inter / union : 0;
}

function splitSentences(text = '') {
  const cleaned = String(text || '')
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Gen|Lt|Maj|Col|Capt|Sgt|Sen|Rep|Gov|Pres|Rev|Hon|St|Jr|Sr|Inc|Co|Corp|v|vs|U\.S|U\.K|S\.K|D\.C|H\.R|S\.R|a\.m|p\.m|No|Vol|pp)\./gi, '$1<DOT>')
    .replace(/\b([A-Z])\.(?=\s+[A-Z])/g, '$1<DOT>')
    .replace(/\b([A-Z])\.([A-Z])\./g, '$1<DOT>$2<DOT>')
    .replace(/(\d)\.(\d)/g, '$1<DOT>$2');
  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“‘'])/)
    .map((s) => s.replace(/<DOT>/g, '.').trim())
    .filter(Boolean);
}

function checkNgrams(tokens, n) {
  const counts = new Map();
  for (let i = 0; i <= tokens.length - n; i++) {
    const slice = tokens.slice(i, i + n);
    const nonStop = slice.filter((w) => !STOPWORDS.has(w)).length;
    if (nonStop < 2) continue;
    const key = slice.join(' ');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function countVerbContractions(text = '') {
  const matches = String(text || '').match(
    /\b(?:[a-z]+n't|[a-z]+'(?:re|ve|ll|d|m)|(?:it|that|there|here|what|who|where|when|why|how|he|she)'s)\b/gi
  );
  return matches ? matches.length : 0;
}

function countTricolons(text = '') {
  const matches = String(text || '').match(/,\s+[^,.;!?]{2,55},\s+(?:and|or)\s+[^,.;!?]{2,55}/g);
  return matches ? matches.length : 0;
}

export function auditStoryItem(item, { sourceFile = 'unknown', isNewSeries = null } = {}) {
  const errors = [];
  const warnings = [];
  const label = `${item?.id || 'MISSING_ID'} (${sourceFile})`;

  const newEssay =
    isNewSeries !== null
      ? isNewSeries
      : Boolean(item?.seriesId || item?.scopeTier || sourceFile.includes('/series/'));

  const requiredStrings = [
    'id', 'region', 'category', 'title', 'subtitle', 'era', 'location', 'epigraph', 'keyContext'
  ];
  for (const field of requiredStrings) {
    if (!item?.[field] || String(item[field]).trim().length < 2) {
      errors.push(`[${label}] Missing or empty required field: ${field}`);
    }
  }

  if (!Array.isArray(item?.paragraphs) || item.paragraphs.length < 6) {
    errors.push(`[${label}] paragraphs must be an array with at least 6 paragraphs`);
  }
  if (!Array.isArray(item?.analysis) || item.analysis.length !== 4) {
    errors.push(`[${label}] analysis must have exactly 4 sections`);
  }
  if (!Array.isArray(item?.sources) || item.sources.length < 4) {
    errors.push(`[${label}] sources must have at least 4 verified sources`);
  } else {
    item.sources.forEach((src, i) => {
      if (!src?.title || !(src?.author || src?.authorOrOrg) || !src?.year || !src?.url) {
        errors.push(`[${label}] source[${i}] incomplete (requires title, author, year, url)`);
      } else if (newEssay) {
        try {
          const parsedUrl = new URL(src.url);
          if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
            errors.push(`[${label}] source[${i}] uses bare homepage root URL "${src.url}"; link specific page/catalog`);
          }
        } catch {
          errors.push(`[${label}] source[${i}] invalid URL "${src.url}"`);
        }
      }
    });
  }

  const paragraphs = Array.isArray(item?.paragraphs) ? item.paragraphs : [];
  const analysis = Array.isArray(item?.analysis) ? item.analysis : [];
  const keyContext = String(item?.keyContext || '');

  const bodyWords = paragraphs.reduce((sum, p) => sum + countWords(p), 0);
  const analysisWords = analysis.reduce(
    (sum, sec) => sum + countWords(sec?.heading) + countWords(sec?.paragraph),
    0
  );
  const totalWords = bodyWords + analysisWords;
  const expectedMinutes = Math.max(6, Math.round(totalWords / 150));

  if (item?.wordCount !== totalWords) {
    errors.push(`[${label}] wordCount (${item?.wordCount}) !== computed totalWords (${totalWords})`);
  }
  if (item?.readingTimeMinutes !== expectedMinutes) {
    errors.push(
      `[${label}] readingTimeMinutes (${item?.readingTimeMinutes}) !== expected (${expectedMinutes} @ 150 WPM)`
    );
  }
  if (item?.audioDurationMinutes !== expectedMinutes) {
    errors.push(
      `[${label}] audioDurationMinutes (${item?.audioDurationMinutes}) !== expected (${expectedMinutes} @ 150 WPM)`
    );
  }

  const tierKey = newEssay ? item?.scopeTier || 'standard' : 'legacy';
  const bounds = TIER_BOUNDS[tierKey];
  if (!bounds) {
    errors.push(`[${label}] Invalid scopeTier "${tierKey}"`);
  } else {
    if (totalWords < bounds.minTotal || totalWords > bounds.maxTotal) {
      errors.push(
        `[${label}] totalWords (${totalWords}) outside ${tierKey} bounds [${bounds.minTotal}..${bounds.maxTotal}]`
      );
    }
    if (bodyWords < bounds.minBody) {
      errors.push(`[${label}] bodyWords (${bodyWords}) below ${tierKey} minBody (${bounds.minBody})`);
    }
    if (newEssay && (analysisWords < bounds.minAnalysis || analysisWords > bounds.maxAnalysis)) {
      errors.push(
        `[${label}] analysisWords (${analysisWords}) outside [${bounds.minAnalysis}..${bounds.maxAnalysis}]`
      );
    }
  }

  if (newEssay) {
    const kcWords = countWords(keyContext);
    if (kcWords < 70 || kcWords > 125 || keyContext.length < 200) {
      errors.push(
        `[${label}] keyContext must be 70-125 words and >=200 chars (got ${kcWords}w, ${keyContext.length} chars)`
      );
    }
    if (analysis.length === 4) {
      const headings = analysis.map((s) => s?.heading);
      if (JSON.stringify(headings) !== JSON.stringify(REQUIRED_NEW_ANALYSIS_HEADINGS)) {
        errors.push(
          `[${label}] New essay analysis headings must exactly match required 4 headings; got ${JSON.stringify(headings)}`
        );
      }
    }
  } else if (keyContext.length < 180) {
    errors.push(`[${label}] keyContext must be >=180 chars (got ${keyContext.length})`);
  }

  const allTextFields = [
    { name: 'keyContext', text: keyContext },
    ...paragraphs.map((p, i) => ({ name: `paragraphs[${i}]`, text: p })),
    ...analysis.map((a, i) => ({ name: `analysis[${i}]`, text: `${a?.heading || ''} ${a?.paragraph || ''}` }))
  ];
  const fullNarration = allTextFields.map((f) => f.text).join('\n');

  // Mad-Libs markers
  for (const marker of MAD_LIBS_MARKERS) {
    if (fullNarration.toLowerCase().includes(marker.toLowerCase())) {
      errors.push(`[${label}] Contains Mad-Libs template marker: "${marker}"`);
    }
  }

  // TTS / Print clutter checks
  const fieldsToSanityCheck = [
    ...allTextFields,
    { name: 'location', text: String(item?.location || '') },
    { name: 'subtitle', text: String(item?.subtitle || '') }
  ];
  for (const f of fieldsToSanityCheck) {
    const t = String(f.text || '');
    if (/[*_]/.test(t)) {
      errors.push(`[${label}] Raw markdown * or _ found in ${f.name}`);
    }
    if (/---/.test(t)) {
      errors.push(`[${label}] Raw divider --- found in ${f.name}`);
    }
    if (/\\sqrt|\\frac|\\times|\\mathbf|\\text\{|\$[^0-9\s]|\$[^$\n]*\\/.test(t)) {
      errors.push(`[${label}] Raw LaTeX/math syntax found in ${f.name}`);
    }
    if (/\d+\.\d+°\s*[NSEW]\s*[,/;]?\s*\d+\.\d+°\s*[NSEW]/i.test(t) || /\(\s*\d+\.\d+°\s*[NSEW]/i.test(t)) {
      errors.push(`[${label}] GPS coordinates found in ${f.name}`);
    }
    if (/[\u3131-\uD79D\u4E00-\u9FFF]/.test(t)) {
      errors.push(`[${label}] CJK/Hangul characters found in ${f.name} (TTS hazard)`);
    }
  }

  // Parentheses rate in body
  const bodyFull = paragraphs.join('\n');
  const parenCount = (bodyFull.match(/\(/g) || []).length;
  const parenPer1k = bodyWords > 0 ? (parenCount / bodyWords) * 1000 : 0;
  if (newEssay && parenPer1k > 2.6) {
    errors.push(
      `[${label}] Too many parentheses in body (${parenCount} in ${bodyWords}w = ${parenPer1k.toFixed(1)}/1k words; max 2.5)`
    );
  }

  // v2 Strict New-Essay Ear, Rhythm, Tricolon, Year, & AI-Tell Checks
  if (newEssay) {
    const bodySentences = paragraphs.flatMap(splitSentences);
    const analysisSentences = analysis.flatMap((a) => splitSentences(a?.paragraph || ''));
    const sentences = [...bodySentences, ...analysisSentences];
    const bodyLengths = bodySentences.map((s) => countWords(s)).filter((n) => n > 0);
    const lengths = sentences.map((s) => countWords(s)).filter((n) => n > 0);

    const maxLen = lengths.length ? Math.max(...lengths) : 0;
    const bodyMean = bodyLengths.length
      ? bodyLengths.reduce((a, b) => a + b, 0) / bodyLengths.length
      : 0;
    const mean = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    const variance =
      lengths.length > 1
        ? lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length
        : 0;
    const stdDev = Math.sqrt(variance);

    if (maxLen > 44) {
      const offender = sentences.find((s) => countWords(s) === maxLen) || '';
      errors.push(
        `[${label}] Sentence exceeds 44 words (${maxLen}w): "${offender.slice(0, 90)}..."`
      );
    }
    if (bodyMean > 22.5) {
      errors.push(
        `[${label}] Body mean sentence length too heavy (${bodyMean.toFixed(2)}w > 22.5w); break up long clauses`
      );
    }
    if (stdDev < 7.0) {
      errors.push(
        `[${label}] Sentence-length std dev too flat (${stdDev.toFixed(2)}w < 7.0w); vary rhythm more`
      );
    }

    // Check short-sentence punch ratio (>= 8% of body sentences <= 10 words)
    const shortBodyCount = bodyLengths.filter((n) => n <= 10).length;
    const shortRatio = bodyLengths.length ? shortBodyCount / bodyLengths.length : 0;
    if (shortRatio < 0.08) {
      errors.push(
        `[${label}] Insufficient short punch sentences <=10w (${shortBodyCount}/${bodyLengths.length} = ${(shortRatio * 100).toFixed(1)}%, need >=8%)`
      );
    }

    // Back-to-back >=34w sentence walls
    for (let i = 0; i < bodyLengths.length - 1; i++) {
      if (bodyLengths[i] >= 35 && bodyLengths[i + 1] >= 35) {
        errors.push(
          `[${label}] Back-to-back >=35w marathon sentences (${bodyLengths[i]}w + ${bodyLengths[i + 1]}w): "${bodySentences[i].slice(0, 60)}..."`
        );
        break;
      }
    }

    // Sliding 10-sentence window with zero <=12w breath
    for (let i = 0; i <= bodyLengths.length - 10; i++) {
      const win = bodyLengths.slice(i, i + 10);
      if (win.every((n) => n > 12)) {
        errors.push(
          `[${label}] 10-sentence wall with no <=12w breath starting at: "${bodySentences[i].slice(0, 60)}..."`
        );
        break;
      }
    }

    // Per-paragraph breath + duplicate opener check (body AND analysis)
    paragraphs.forEach((p, idx) => {
      const pSents = splitSentences(p);
      const pLens = pSents.map(countWords);
      if (pLens.length >= 4 && pLens.every((n) => n > 16)) {
        errors.push(
          `[${label}] paragraphs[${idx}] has ${pLens.length} sentences and none <=16w (needs a breath break)`
        );
      }
      for (let k = 0; k < pSents.length - 1; k++) {
        const w1 = normalizeTokens(pSents[k])[0];
        const w2 = normalizeTokens(pSents[k + 1])[0];
        if (w1 && w1 === w2 && !['he', 'she', 'they', 'the', 'it'].includes(w1)) {
          errors.push(`[${label}] paragraphs[${idx}] starts consecutive sentences with "${w1}"`);
        }
      }
    });
    analysis.forEach((sec, idx) => {
      const aSents = splitSentences(sec?.paragraph || '');
      const aLens = aSents.map(countWords);
      if (aLens.length >= 3 && aLens.every((n) => n > 16)) {
        errors.push(
          `[${label}] analysis[${idx}] has ${aLens.length} sentences and none <=16w (needs a breath break)`
        );
      }
    });

    // Glue/crutch word caps (Loop 2 findings)
    const straightHits = (bodyFull.match(/\bstraight\b/gi) || []).length;
    if (straightHits > 3) {
      errors.push(`[${label}] Glue word "straight" overused (${straightHits}x; max 3)`);
    }
    const alongsideHits = (bodyFull.match(/\balongside\b/gi) || []).length;
    if (alongsideHits > 3) {
      errors.push(`[${label}] Glue word "alongside" overused (${alongsideHits}x; max 3)`);
    }
    const soonHits = (bodyFull.match(/\bsoon\b/gi) || []).length;
    if (soonHits > 4) {
      errors.push(`[${label}] Glue word "soon" overused (${soonHits}x; max 4)`);
    }

    // Paragraph pacing (at least 1 short pivot paragraph <85w in >=15-paragraph essays)
    if (paragraphs.length >= 15) {
      const shortParas = paragraphs.filter((p) => countWords(p) < 85).length;
      if (shortParas === 0) {
        errors.push(
          `[${label}] Monotonous brick pacing: ${paragraphs.length} paragraphs and 0 under 85 words; add 2-3 crisp pivot paragraphs`
        );
      }
    }

    // Spoken contractions floor (>= 2.0 per 1,000 body words)
    const contractions = countVerbContractions(bodyFull);
    const contractionPer1k = bodyWords > 0 ? (contractions / bodyWords) * 1000 : 0;
    if (contractionPer1k < 2.0) {
      errors.push(
        `[${label}] Too stiff/unspoken: only ${contractions} verb contractions (${contractionPer1k.toFixed(1)}/1k words, need >=2.0/1k)`
      );
    }

    // Anti-Tricolon check
    const bodyTricolons = countTricolons(bodyFull);
    const tricolonMax = Math.max(4, Math.round((totalWords / 1000) * 3.0));
    if (bodyTricolons > tricolonMax) {
      errors.push(
        `[${label}] Tricolon overuse: ${bodyTricolons} "X, Y, and Z" lists in body (max ${tricolonMax}); vary rhythm`
      );
    }

    // Year consistency & TTS brand hazards
    const spelledYears = fullNarration.match(
      /\b(?:nineteen|twenty)[-\s]+(?:hundred|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|[a-z]+teen)\b/gi
    );
    if (spelledYears && spelledYears.length > 0 && /\b(?:19|20)\d{2}\b/.test(fullNarration)) {
      errors.push(
        `[${label}] Mixed year format (uses both numeric years and spelled-out "${spelledYears[0]}")`
      );
    }
    if (/\bf\(x\)|\b2NE1\b|\bg\.o\.d\b/i.test(fullNarration)) {
      errors.push(`[${label}] Contains TTS-hostile pop stylization (f(x), 2NE1, or g.o.d)`);
    }

    // Paragraph opener diversity (Yet / While / Even / Inside / Across / In YYYY / By YYYY / Disguised time jumps)
    const pivotOpeners = paragraphs.filter((p) =>
      /^(Yet|While|Even|Inside|Across|In\s+\d{4}|By\s+\d{4}|After\s+\d{4}|During\s+\d{4}|[A-Z][a-z-]+\s+years\s+(?:later|earlier|after))\b/.test(
        p.trim()
      )
    ).length;
    if (pivotOpeners > 4) {
      errors.push(
        `[${label}] Formulaic/calendar paragraph openers: ${pivotOpeners} paragraphs start with Yet/While/Even/Inside/Across/In-YYYY/X-years-later (max 4)`
      );
    }

    // Drone outro check
    const lastPara = paragraphs[paragraphs.length - 1] || '';
    if (/^(Across|Standing today|Long after)\b/i.test(lastPara.trim())) {
      errors.push(`[${label}] Closing paragraph opens with drone-outro cliché ("${lastPara.slice(0, 40)}...")`);
    }

    // Mood word & banned phrase checks
    for (const rx of BANNED_AI_PHRASES) {
      const m = fullNarration.match(rx);
      if (m) {
        errors.push(`[${label}] Banned AI phrase detected: "${m[0]}"`);
      }
    }
    const overnightHits = (fullNarration.match(/\bovernight\b/gi) || []).length;
    if (overnightHits >= 3) {
      errors.push(`[${label}] Word "overnight" overused (${overnightHits}x; max 2)`);
    }
    const quietlyHits = (fullNarration.match(/\bquiet(?:ly)?\b/gi) || []).length;
    if (quietlyHits >= 5) {
      errors.push(`[${label}] Word "quiet/quietly" overused (${quietlyHits}x; max 4)`);
    }
  }

  // Intra-story N-gram checks (full narration minus fixed boilerplate section headings for cross-story comparisons)
  const allTokens = normalizeTokens(fullNarration);
  const crossTokens = normalizeTokens(
    [keyContext, ...paragraphs, ...analysis.map((a) => a?.paragraph || '')].join('\n')
  );
  const sixGrams = checkNgrams(allTokens, 6);
  const sixThreshold = newEssay ? 3 : 7;
  for (const [phrase, count] of sixGrams) {
    if (count >= sixThreshold) {
      errors.push(`[${label}] 6-gram repeated ${count} times: "${phrase}"`);
    }
  }
  const eightGrams = checkNgrams(allTokens, 8);
  const eightThreshold = newEssay ? 2 : 6;
  for (const [phrase, count] of eightGrams) {
    if (count >= eightThreshold) {
      errors.push(`[${label}] 8-gram repeated ${count} times: "${phrase}"`);
    }
  }

  // Jaccard similarity checks (all paragraphs + keyContext + analysis)
  const paraSets = paragraphs.map(contentWordSet);
  const kcSet = contentWordSet(keyContext);
  const analysisSets = analysis.map((a) => contentWordSet(a?.paragraph || ''));
  const jaccardLimit = newEssay ? 0.36 : 0.43;

  for (let i = 0; i < paraSets.length; i++) {
    const kcSim = jaccard(kcSet, paraSets[i]);
    if (kcSim > jaccardLimit) {
      errors.push(
        `[${label}] keyContext Jaccard similarity with paragraphs[${i}] is ${kcSim.toFixed(2)} (> ${jaccardLimit})`
      );
    }
    for (let j = i + 1; j < paraSets.length; j++) {
      const sim = jaccard(paraSets[i], paraSets[j]);
      if (sim > jaccardLimit) {
        errors.push(
          `[${label}] High Jaccard similarity (${sim.toFixed(2)}) between paragraphs[${i}] and paragraphs[${j}]`
        );
      }
    }
    for (let k = 0; k < analysisSets.length; k++) {
      const sim = jaccard(paraSets[i], analysisSets[k]);
      if (sim > jaccardLimit) {
        errors.push(
          `[${label}] High Jaccard similarity (${sim.toFixed(2)}) between paragraphs[${i}] and analysis[${k}]`
        );
      }
    }
  }

  return {
    id: item?.id,
    title: item?.title,
    isNewEssay: newEssay,
    scopeTier: tierKey,
    totalWords,
    bodyWords,
    analysisWords,
    expectedMinutes,
    opening: splitSentences(paragraphs[0] || '')[0] || '',
    tokens: crossTokens,
    errors,
    warnings
  };
}

function loadAllItems() {
  const spPath = path.join(rootDir, 'src/data/storiesAndPlaces.json');
  const sp = JSON.parse(fs.readFileSync(spPath, 'utf8'));
  const seriesDir = path.join(rootDir, 'src/data/series');
  const entries = [];

  const seriesFiles = fs.existsSync(seriesDir)
    ? fs.readdirSync(seriesDir).filter((f) => f.endsWith('.json')).sort()
    : [];
  const seriesMap = new Map();
  for (const f of seriesFiles) {
    const fullPath = path.join(seriesDir, f);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    seriesMap.set(data.id, { item: data, sourceFile: `src/data/series/${f}`, isNewSeries: true });
  }

  for (const item of sp.koreaStories || []) {
    if (item.id === 'korea-50' && seriesMap.has('korea-50')) {
      entries.push(seriesMap.get('korea-50'));
      continue;
    }
    entries.push({ item, sourceFile: 'src/data/storiesAndPlaces.json', isNewSeries: false });
  }
  for (const item of sp.sfStories || []) {
    entries.push({ item, sourceFile: 'src/data/storiesAndPlaces.json', isNewSeries: false });
  }
  for (const [id, entry] of seriesMap) {
    if (id === 'korea-50') continue;
    entries.push(entry);
  }
  return entries;
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/auditStoryQuality.mjs <file.json...> | --all');
    process.exit(1);
  }

  let targets = [];
  const isAllMode = args.includes('--all');
  if (isAllMode) {
    targets = loadAllItems();
  } else {
    for (const arg of args) {
      const resolved = path.resolve(process.cwd(), arg);
      const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.items)
        ? parsed.items
        : [parsed];
      for (const item of list) {
        targets.push({ item, sourceFile: arg, isNewSeries: true });
      }
    }
  }

  let allErrors = [];
  const seenIds = new Set();
  const crossEightGrams = new Map();
  const openingStarts = new Map();
  const results = [];

  for (const t of targets) {
    const res = auditStoryItem(t.item, {
      sourceFile: t.sourceFile,
      isNewSeries: t.isNewSeries
    });
    results.push(res);
    allErrors.push(...res.errors);

    if (res.id) {
      if (seenIds.has(res.id)) {
        allErrors.push(`[CROSS-STORY] Duplicate story ID: ${res.id}`);
      }
      seenIds.add(res.id);
    }

    const uniqueEight = new Set();
    for (let i = 0; i <= res.tokens.length - 8; i++) {
      const slice = res.tokens.slice(i, i + 8);
      if (slice.filter((w) => !STOPWORDS.has(w)).length < 3) continue;
      uniqueEight.add(slice.join(' '));
    }
    for (const phrase of uniqueEight) {
      if (!crossEightGrams.has(phrase)) crossEightGrams.set(phrase, []);
      crossEightGrams.get(phrase).push(res.id);
    }

    const openPrefix = normalizeTokens(res.opening).slice(0, 4).join(' ');
    if (openPrefix) {
      openingStarts.set(openPrefix, (openingStarts.get(openPrefix) || 0) + 1);
    }
  }

  if (isAllMode) {
    const CROSS_PROPER_NOUN_ALLOWLIST = [
      'national museum of korea in',
      'october 17 1989 loma prieta earthquake'
    ];
    for (const [phrase, ids] of crossEightGrams) {
      if (ids.length >= 3) {
        if (CROSS_PROPER_NOUN_ALLOWLIST.some((allowed) => phrase.includes(allowed))) continue;
        allErrors.push(
          `[CROSS-STORY] 8-gram repeated across ${ids.length} stories (${ids.slice(0, 5).join(', ')}): "${phrase}"`
        );
      }
    }
  }

  for (const res of results) {
    const status = res.errors.length === 0 ? 'PASS' : 'FAIL';
    console.log(
      `${status} | ${res.id} | ${res.scopeTier} | ${res.totalWords}w (${res.expectedMinutes}m) | errors=${res.errors.length}`
    );
  }

  if (isAllMode) {
    const repeatedOpeners = [...openingStarts.entries()].filter(([, c]) => c >= 3);
    console.log(
      `\nSummary: Audited ${results.length} stories. Repeated 4-word opening prefixes (>=3 stories): ${repeatedOpeners.length}`
    );
    repeatedOpeners.forEach(([p, c]) => console.log(`  Opening "${p}..." x${c}`));
  }

  if (allErrors.length > 0) {
    console.error(`\nFAILED with ${allErrors.length} error(s):`);
    allErrors.slice(0, 80).forEach((e) => console.error(' - ' + e));
    if (allErrors.length > 80) {
      console.error(` ... and ${allErrors.length - 80} more error(s).`);
    }
    process.exit(1);
  }

  console.log(`\nALL ${results.length} STORY QUALITY CHECKS PASSED WITH 0 ERRORS.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
