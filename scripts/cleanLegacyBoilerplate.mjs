import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditStoryItem } from './auditStoryQuality.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const spPath = path.join(rootDir, 'src/data/storiesAndPlaces.json');

const KOREA_1_TO_10_META = {
  'korea-1': { category: 'Linguistics, Royal Innovation & Hangul', era: 'Joseon Dynasty (1443–1446)' },
  'korea-2': { category: 'Maritime Strategy & Naval Engineering', era: 'Imjin War, Joseon Dynasty (1592–1598)' },
  'korea-3': { category: 'Marine Ecology & Women Free-Divers', era: 'Traditional Maritime Culture to Present' },
  'korea-4': { category: 'Urban Design & Ecological Restoration', era: 'Joseon Dynasty to 2005 Restoration' },
  'korea-5': { category: 'Ancient Silk Road & Royal Astronomy', era: 'Silla Kingdom (4th–9th Century CE)' },
  'korea-6': { category: 'Fermentation Science & Earthenware Craft', era: 'Traditional Culinary Craft to Present' },
  'korea-7': { category: 'Printing Revolution & Woodblock Preservation', era: 'Goryeo Dynasty (1236–1377)' },
  'korea-8': { category: 'Industrial Craft & Urban Memory', era: 'Postwar Industrial Seoul (1960s–Present)' },
  'korea-9': { category: 'Vocal Narrative & Korean Cinema', era: 'Joseon Folk Theater to Contemporary Cinema' },
  'korea-10': { category: 'Traditional Architecture & Thermal Engineering', era: 'Joseon Dynasty to Present' }
};

const BOILERPLATE_SENTENCE_PATTERNS = [
  /^When field historians and architectural conservators arrive at\b/i,
  /^Nothing in this setting is accidental:/i,
  /^In the broader geopolitical and cultural timeline of\b/i,
  /^Across the Korean peninsula, court chroniclers and regional guilds\b/i,
  /^Behind the surviving monuments and archival records of\b/i,
  /^Whether working with calloused hands on\b/i,
  /^At the philosophical core of this achievement lay a distinctively Korean\b/i,
  /^Rather than forcing nature into rigid, abstract templates,/i,
  /^Material selection proved decisive at every stage\b/i,
  /^Every raw element gathered near\b/i,
  /^Closer inspection of the primary mechanism reveals a level of quantitative precision\b/i,
  /^By calibrating the tolerances of\b/i,
  /^Just as importantly, the secondary subsystems of\b/i,
  /^When temperature, airflow, or human movement shifted around\b/i,
  /^That mastery was never achieved overnight;/i,
  /^Whenever an early prototype or seasonal cycle threatened to derail\b/i,
  /^Primary documentary evidence from the\b/i,
  /^Scholars examining the surviving texts and inscriptions associated with\b/i,
  /^From the tactile grain of\b/i,
  /^To experience .* at the height of its historical operation was to be immersed/i,
  /^Yet history repeatedly tested the survival of\b/i,
  /^When external upheavals swept across\b/i,
  /^That .* survived those dark decades is a testament to\b/i,
  /^Ordinary guardians, local families, and dedicated researchers risked their livelihoods\b/i,
  /^When modern laboratory scientists and conservation specialists finally examined\b/i,
  /^Measurements of .* and structural modeling of\b/i,
  /^Today at .*, a new generation of practitioners and cultural stewards\b/i,
  /^By honoring the authentic craft protocols of\b/i,
  /^Long before parallel developments appeared elsewhere, Korean innovators\b/i,
  /^Placed in comparative global perspective, the story of\b/i,
  /^As evening shadows lengthen across\b/i,
  /^Across the centuries, the marriage of\b/i,
  /^Every detail preserved at\b/i,
  // SF body wrappers
  /^Standing today at\b.*beneath the hum of Muni buses/i,
  /^Every curbstone, cast-iron utility cover, and weathered timber\b/i,
  /^To understand why .* emerged precisely where it did, one must first examine\b/i,
  /^In a port city bounded on three sides by deep tidal waters\b/i,
  /^The documentary record preserved in the San Francisco History Center\b/i,
  /^Contemporary observers who walked past\b/i,
  /^At the center of this unfolding drama stood\b/i,
  /^Colleagues and skeptics alike remarked on the relentless attention to physical detail\b/i,
  /^The material and engineering realities of\b/i,
  /^Whether dealing with the corrosive salt mist rolling off the Pacific\b/i,
  /^As the work progressed through\b/i,
  /^Newspaper dispatches of the era captured the sensory intensity of the scene:/i,
  /^Yet no major transformation in San Francisco history ever unfolded without\b/i,
  /^Behind closed doors in City Hall and inside the merchant exchanges downtown,/i,
  /^A pivotal turning point arrived when theoretical plans collided\b/i,
  /^In that crucible, the margin between catastrophic failure and lasting triumph\b/i,
  /^Inside the workshops, drafting rooms, and field stations\b/i,
  /^Precise empirical measurements, hand-built instruments, and hard-won field protocols\b/i,
  /^The human texture of .* was equally defined by the ordinary men and women\b/i,
  /^Their oral histories, family photographs, union cards, and handwritten letters\b/i,
  /^When the defining moment of completion or confrontation arrived in\b/i,
  /^What had once been dismissed by doubters as an impractical dream\b/i,
  /^In the decades that followed\b/i,
  /^While other nineteenth- and twentieth-century structures across the peninsula\b/i,
  /^Seismic shocks, coastal storms, and rapid urban densification provided further proof\b/i,
  /^Each time the ground trembled or political priorities shifted,/i,
  /^By the late twentieth and early twenty-first centuries, a new generation of preservationists,/i,
  /^Through painstaking archival recovery/i,
  /^Walking the perimeter of .* today at\b/i,
  /^Walking .* today at \d+\.\d+°/i,
  /^Walking the\b.*\btoday at \d+\.\d+°/i,
  /^From the weathered textures of\b/i,
  /^Ultimately, the story of .* endures because it captures the quintessential San Francisco paradox:/i,
  /^Long after the last footsteps fade\b/i,
  /^Long after dusk settles over\b/i,
  // Analysis wrappers
  /^Close examination of .* highlights how primary historical records/i,
  /^Visitors and historians studying .* can still trace how physical geography/i,
  /^Studying the structural interplay between .* demonstrates how/i,
  /^Taken together, these insights from .* deepen our appreciation/i,
  /^Without these primary archival records and archaeological strata/i,
  /^Mastering these three .* equips any traveler or reader/i,
  /^Walking these exact coordinates at .* transforms abstract chronology/i,
  /this synthesis of .* and civic memory remains visible at every turn\.$/i,
  /reinforces how closely .* was woven into daily life/i,
  /became an open-air theater where working-class laborers/i,
  /turned its eyes toward .* in .*$/i
];

const BOILERPLATE_SUBSTRINGS = [
  'field historians and architectural conservators',
  'beneath the hum of Muni buses',
  'court chroniclers and regional guilds',
  'Every curbstone, cast-iron utility cover',
  'Nothing in this setting is accidental:',
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
  'archival documentation, and civic memory converge at this site',
  'reinforced every detail of this',
  'became an open-air theater where working-class laborers',
  'turned its eyes toward the',
  'what appeared at first glance to be a localized technical or civic experiment',
  'continues to anchor the moral and material bedrock of',
  'continues to shape the moral and material bedrock of',
  'discovering anew how deeply its design was tuned to the unique rhythms',
  'demonstrating how the principles of',
  'could be translated directly into enduring physical form',
  'proved indispensable when conventional wisdom faltered',
  'and the collective resolve of every worker who refused to abandon the post',
  'produced innovations that soon radiated far beyond',
  'reads like an open manuscript in which every chapter',
  'taiko bashi drum bridge and tsujiura senbei confectionery',
  'Taiko Bashi Drum Bridge, and tsujiura senbei confectionery.',
  'Korean Historical & Cultural Era',
  'Neo-Confucian spatial seclusion in the Anchae',
  'Placed in comparative global perspective, the story of',
  'equips any traveler or reader to decode the deeper cultural grammar',
  'this dispatch traces how traditional korean innovation and historical memory',
  'confirms the extraordinary care devoted to recording these breakthroughs',
  'can trace every physical milestone of this transformation firsthand',
  'empirical data validated centuries of traditional wisdom'
];

function splitSentencesSafe(p) {
  let s = String(p || '');
  // Protect dots inside parentheses so citations like (Wong Wai v. Williamson) or (Dr. Foo) never break mid-wrapper
  s = s.replace(/\(([^()]*)\)/g, (m) => m.replace(/\./g, '<DOT>'));
  // Protect abbreviations
  s = s.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|Gen|Col|Lt|Capt|Maj|Sgt|Rev|Hon|St|Mt|Ft|Jr|Sr|vs|U\.S|No|Vol|Co|Inc|Ltd|Calif|Exec|Dist|Dept|Ave|Blvd|Jan|Feb|Mar|Apr|Aug|Sept|Oct|Nov|Dec|v|b|d|c|pp|B\.J\.S|J\.H\.S|A\.P|W\.E\.B|C\.E|a\.m|p\.m|[A-Z])\./gi,
    '$1<DOT>'
  );
  s = s.replace(/(\d)\.(\d)/g, '$1<DOT>$2');
  return s
    .split(/(?<=[.!?]['’"”)]*)\s+(?=[A-Z“"'\*])|(?<=\([^()]{1,40}\))\s+(?=[A-Z])/)
    .map((part) => part.replace(/<DOT>/g, '.').trim())
    .filter(Boolean);
}

function isBoilerplateSentence(sent) {
  if (BOILERPLATE_SENTENCE_PATTERNS.some((rx) => rx.test(sent))) return true;
  const low = sent.toLowerCase();
  return BOILERPLATE_SUBSTRINGS.some((sub) => low.includes(sub.toLowerCase()));
}

const SPECIFIC_REPLACEMENTS = [
  // LaTeX chemistry / physics -> clean spoken forms (including unescaped \t tab cases)
  [/\$\s*\\sqrt\{2\}\s*\$/g, 'the square root of two'],
  [/\$(?:\\t|\t)ext\{O\}2\$/g, 'O2'],
  [/\$(?:\\t|\t)ext\{CO\}2\$/g, 'CO2'],
  [/\$CO2\$/g, 'CO2'],
  [/\$(?:\\t|\t)ext\{H\}2(?:\\t|\t)ext\{CO\}3\$/g, 'H2CO3'],
  [/\$(?:\\t|\t)ext\{Fe\}2(?:\\t|\t)ext\{O\}3\$/g, 'Fe2O3'],
  [/\$Fe2O3\$/g, 'Fe2O3'],
  [/\$(?:\\t|\t)ext\{Fe\}\^\{3\+\}\$/g, 'ferric ions'],
  [/\$(?:\\t|\t)ext\{Fe\}\^\{2\+\}\$/g, 'ferrous ions'],
  [/\$\\mathbf\{F\}\s*=\s*q\\mathbf\{v\}\s*\\times\s*\\mathbf\{B\}\$/g, 'F equals q times v cross B'],
  [/\$5'(?:\\t|\t)ext\{-GMP\}\$/g, '5-prime-GMP'],
  [/\$(?:\\t|\t)ext\{H\}2(?:\\t|\t)ext\{SO\}4\$/g, 'H2SO4'],
  [/\$v\s*=\s*\\sqrt\{2gh\}\$/g, 'v equals the square root of 2gh'],
  [/\$h\$/g, 'h'],
  [/\$(?:\\t|\t)ext\{CaCO\}3\$/g, 'CaCO3'],
  [/\$f\s*=\s*v\s*\/\s*4L\$/g, 'f equals v divided by 4L'],
  [/\$L\$/g, 'L'],
  [/\$SiO2\s*\\cdot\s*nH2O\$/g, 'hydrated silica'],
  [/\$Fr\s*=\s*v\s*\/\s*\\sqrt\{g D\}\$/g, 'the Froude number'],
  [/\(`\$`\)/g, '(a dollar sign)'],
  [/`\$\`/g, 'dollar sign'],
  // Specific CJK/Hangul items
  [/\bOgamdo Poem No\. 1\*\*:\s*\*?'13인의아해가도로로질주하오\.?\s*제1의아해도무섭다고그리오\.?\s*제2의아해도무섭다고그리오\.\.\.'\*/g,
    "Ogamdo Poem No. 1: 'Thirteen children rush down a road; the first child says it is frightened, the second child too says it is frightened.'"],
  [/\*?'13인의아해가도로로질주하오\.?\s*제1의아해도무섭다고그리오\.?\s*제2의아해도무섭다고그리오\.\.\.'\*/g,
    "'Thirteen children rush down a road; the first child says it is frightened, the second child too says it is frightened.'"],
  [/\*\*하늘과 바람과 별과 시\*\*\s*\(\*Haneul-gwa Baram-gwa Byeol-gwa Si\*, literally 'Sky, Wind, and Stars and Poem'\)/g,
    'Haneul-gwa Baram-gwa Byeol-gwa Si (literally Sky, Wind, and Stars and Poem)'],
  [/\*\*하늘과 바람과 별과 시\*\*/g, 'Haneul-gwa Baram-gwa Byeol-gwa Si'],
  [/\*\*잿물 \(jaetmul, natural wood-ash lye\)\*\*/g, 'jaetmul, natural wood-ash lye'],
  [/잿물\s*\(jaetmul,\s*natural wood-ash lye\)/g, 'jaetmul, natural wood-ash lye'],
  [/Mount 옥녀봉/g, 'Mount Ongnyeobong'],
  [/부산역 \(Busan Station\)/g, 'Busan Station'],
  [/탄금대 Tangeumdae Cliff/g, 'Tangeumdae Cliff'],
  [/娘성 \(Nangseong, modern Cheongju\)/g, 'Nangseong (modern Cheongju)'],
  [/영암 \(Yeongam\)/g, 'Yeongam'],
  [/Mount 고려산/g, 'Mount Goryeosan'],
  [/東宮 \(\*Donggung\*, Crown Prince[’']s Palace\)/g, "Donggung (the Crown Prince's Palace)"],
  [/배우성 \(Bae Woo-sung\)/g, 'Bae Woo-sung'],
  [/Yi Mun-열/g, 'Yi Mun-yeol'],
  [/King Seong \(성왕,\s*d\.\s*554 CE\)/g, 'King Seong (died 554 CE)'],
  [/붉은 벽돌 \(Bulgeun Byeokdol[^)]*\)/g, 'Bulgeun Byeokdol red brick'],
  [/\*h-a-n-g-u-l\*/g, 'h-a-n-g-u-l'],
  [/\*h-a-n\* into 한 and \*g-e-u-l\* into 글/g, 'h-a-n into the block han and g-e-u-l into geul'],
  [/shaped like the squared Chinese character 出 \(\*chul\*, 'sprouting forth'\)/g,
    "shaped like the squared classical character chul ('sprouting forth')"],
  [/shaped like the character 井/g, 'shaped like a square well lattice'],
  // Korea-1 Hangul letter lessons -> crisp English spoken forms
  [/consonant ㄱ \(\*giyeok\*,/g, 'consonant giyeok ('],
  [/ninety-degree angle, ㄱ\./g, 'ninety-degree angle.'],
  [/nasal ㄴ \(\*nieun\*,/g, 'nasal nieun ('],
  [/L-shaped contour ㄴ\./g, 'L-shaped contour.'],
  [/bilabial ㅁ \(\*mieum\*,/g, 'bilabial mieum ('],
  [/four-sided box, ㅁ\./g, 'four-sided box.'],
  [/sibilant ㅅ \(\*siot\*,/g, 'sibilant siot ('],
  [/edge of an incisor, ㅅ\./g, 'edge of an incisor.'],
  [/glottal ㅇ \(\*ieung\*\)/g, 'glottal ieung'],
  [/cross-section of the throat, ㅇ\./g, 'cross-section of the throat.'],
  [/five anatomical base glyphs \(ㄱ, ㄴ, ㅁ, ㅅ, ㅇ\)/g, 'five anatomical base consonants'],
  [/lingual base ㄴ \(\*n\*\)/g, 'lingual base nieun (n)'],
  [/plosive ㄷ \(\*d\/t\*, \*digeut\*\)/g, 'plosive digeut (d or t)'],
  [/producing ㅌ \(\*th\*, \*tieut\*\)/g, 'producing tieut (th)'],
  [/velar ㄱ \(\*k\/g\*\)/g, 'velar giyeok (k or g)'],
  [/aspirated ㅋ \(\*kh\*, \*kieuk\*\)/g, 'aspirated kieuk (kh)'],
  [/labial ㅁ \(\*m\*\)/g, 'labial mieum (m)'],
  [/plosive ㅂ \(\*b\/p\*, \*bieup\*\)/g, 'plosive bieup (b or p)'],
  [/aspirated ㅍ \(\*ph\*, \*pieup\*\)/g, 'aspirated pieup (ph)'],
  [/dental ㅅ \(\*s\*\)/g, 'dental siot (s)'],
  [/affricate ㅈ \(\*j\/ch\*, \*jieut\*\)/g, 'affricate jieut (j or ch)'],
  [/aspirated ㅊ \(\*chh\*, \*chieut\*\)/g, 'aspirated chieut (chh)'],
  [/throat glyph ㅇ/g, 'throat glyph ieung'],
  [/glottal stop ㆆ and the fricative ㅎ \(\*h\*, \*hieut\*\)/g, 'glottal stop glyph and the fricative hieut (h)'],
  [/liquid flap ㄹ \(\*rieul\*\), the voiced fricative ㅿ \(\*bansiot\*\), and the velar nasal ㆁ \(\*yesieung\*\)/g,
    'liquid flap rieul, the voiced fricative bansiot, and the velar nasal yesieung'],
  [/round dot \(ㆍ, \*arae-a\*,/g, 'round dot (arae-a,'],
  [/horizontal line \(ㅡ, \*eu\*,/g, 'horizontal line (eu,'],
  [/vertical line \(ㅣ, \*i\*,/g, 'vertical line (i,'],
  [/bright \*yang\* vowels: ㅗ \(\*o\*,/g, 'bright yang vowels: o ('],
  [/and ㅏ \(\*a\*,/g, 'and a ('],
  [/inward \*yin\* vowels: ㅜ \(\*u\*,/g, 'inward yin vowels: u ('],
  [/and ㅓ \(\*eo\*,/g, 'and eo ('],
  [/turning ㅏ \(\*a\*\) into ㅑ \(\*ya\*\), ㅓ \(\*eo\*\) into ㅕ \(\*yeo\*\), ㅗ \(\*o\*\) into ㅛ \(\*yo\*\), and ㅜ \(\*u\*\) into ㅠ \(\*yu\*\)/g,
    'turning a into ya, eo into yeo, o into yo, and u into yu'],
  [/base glyph: ㅁ \(m\), ㅂ \(b\/p\), and ㅍ \(ph\)/g, 'base glyph: m, b or p, and ph'],
  [/tongue forming ㄱ, ㄴ, and ㅁ\./g, 'tongue forming the consonant angles.']
];

function cleanTextForAudio(raw = '') {
  let text = String(raw || '');
  for (const [rx, rep] of SPECIFIC_REPLACEMENTS) {
    text = text.replace(rx, rep);
  }

  // Strip GPS coordinate pairs and parenthetical coordinate wrappers
  text = text
    .replace(/\s*\([^()\n]*\d+\.\d+°\s*[NSEW][^()\n]*\)/gi, '')
    .replace(/\s+at\s+\d+\.\d+°\s*[NSEW]\s*[,/;]?\s*\d+\.\d+°\s*[NSEW]/gi, '')
    .replace(/\b\d+\.\d+°\s*[NSEW]\s*[,/;]\s*\d+\.\d+°\s*[NSEW]/gi, '');

  // Strip raw markdown emphasis BEFORE CJK parenthetical cleanup so (*한글*, Roman) cleans without leaving "(, Roman)"
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  // Fix inline Mad-Libs seam if injected directly after "Dr." or ":"
  text = text
    .replace(/\bDr\.\s*Placed in comparative global perspective,\s*the story of Nae-oe-beop\s*/gi, 'Dr. ')
    .replace(/:\s*When modern laboratory scientists and conservation specialists finally examined[\s\S]*?validated centuries of traditional wisdom\./gi, '.');

  // Strip CJK/Hangul inside parenthetical glosses cleanly without unbalancing single quotes
  text = text.replace(/\(([^()\n]*[\u3131-\uD79D\u4E00-\u9FFF]+[^()\n]*)\)/g, (full, inner) => {
    let cleaned = inner
      .replace(/[\u3131-\uD79D\u4E00-\u9FFF]+/g, '')
      .replace(/\s*,\s*,+/g, ',')
      .replace(/^[\s,;./-]+|[\s,;:-]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (
      (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
      (cleaned.startsWith('‘') && cleaned.endsWith('’')) ||
      (cleaned.startsWith('"') && cleaned.endsWith('"'))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    } else if (!cleaned.startsWith("'") && cleaned.endsWith("'") && !cleaned.slice(0, -1).includes("'")) {
      cleaned = cleaned.slice(0, -1).trim();
    }
    if (!cleaned || !/[a-zA-Z0-9]/.test(cleaned) || cleaned.length <= 1) return '';
    return `(${cleaned})`;
  });

  text = text.replace(/[\u3131-\uD79D\u4E00-\u9FFF]+/g, '');

  // Catch any remaining inline LaTeX formulas ($...$) safely
  text = text.replace(/\$([^$\n]{1,60})\$/g, (full, inner) => {
    return inner
      .replace(/(?:\\t|\t)ext\{([^}]*)\}/g, '$1')
      .replace(/\\mathbf\{([^}]*)\}/g, '$1')
      .replace(/\\sqrt\{([^}]*)\}/g, 'square root of $1')
      .replace(/\\times/g, 'times')
      .replace(/\\cdot/g, 'times')
      .replace(/\^\{([^}]*)\}/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  });

  // Final cleanup
  text = text
    .replace(/[*_]/g, '')
    .replace(/---+/g, '—')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text;
}

function stripBoilerplateFromBlock(block) {
  const sents = splitSentencesSafe(block).filter((s) => !isBoilerplateSentence(s));
  return cleanTextForAudio(sents.join(' '));
}

function regroupShortParagraphs(paragraphs) {
  const result = [];
  let buffer = [];
  let bufferWords = 0;

  for (const p of paragraphs) {
    const clean = cleanTextForAudio(p);
    if (!clean) continue;
    const w = clean.split(/\s+/).filter(Boolean).length;
    buffer.push(clean);
    bufferWords += w;
    if (bufferWords >= 95) {
      result.push(buffer.join(' '));
      buffer = [];
      bufferWords = 0;
    }
  }
  if (buffer.length > 0) {
    if (bufferWords < 55 && result.length > 0) {
      result[result.length - 1] = `${result[result.length - 1]} ${buffer.join(' ')}`;
    } else {
      result.push(buffer.join(' '));
    }
  }
  return result;
}

function cleanLegacyStory(story, stripBodyBoilerplate = false) {
  if (KOREA_1_TO_10_META[story.id]) {
    story.category = KOREA_1_TO_10_META[story.id].category;
    story.era = KOREA_1_TO_10_META[story.id].era;
  }

  story.title = cleanTextForAudio(story.title);
  story.subtitle = cleanTextForAudio(story.subtitle);
  story.location = cleanTextForAudio(story.location);
  story.epigraph = cleanTextForAudio(story.epigraph);
  story.keyContext = stripBoilerplateFromBlock(story.keyContext);

  const rawParagraphs = Array.isArray(story.paragraphs) ? story.paragraphs : [];
  if (stripBodyBoilerplate) {
    const stripped = rawParagraphs.map(stripBoilerplateFromBlock).filter(Boolean);
    story.paragraphs = regroupShortParagraphs(stripped);
  } else {
    story.paragraphs = rawParagraphs.map(stripBoilerplateFromBlock).filter(Boolean);
  }

  if (Array.isArray(story.analysis)) {
    story.analysis = story.analysis.map((sec) => ({
      heading: cleanTextForAudio(sec.heading),
      paragraph: stripBoilerplateFromBlock(sec.paragraph)
    }));
  }

  const bodyWords = story.paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
  const analysisWords = (story.analysis || [])
    .map((a) => `${a.heading} ${a.paragraph}`)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const totalWords = bodyWords + analysisWords;
  const minutes = Math.max(6, Math.round(totalWords / 150));

  story.bodyWords = bodyWords;
  story.analysisWords = analysisWords;
  story.totalWords = totalWords;
  story.wordCount = totalWords;
  story.readingTimeMinutes = minutes;
  story.audioDurationMinutes = minutes;

  return story;
}

const sp = JSON.parse(fs.readFileSync(spPath, 'utf8'));

for (let i = 0; i < sp.koreaStories.length; i++) {
  const s = sp.koreaStories[i];
  if (s.id === 'korea-50') continue;
  sp.koreaStories[i] = cleanLegacyStory(s, i >= 10);
}
for (let i = 0; i < sp.sfStories.length; i++) {
  sp.sfStories[i] = cleanLegacyStory(sp.sfStories[i], i >= 10);
}

fs.writeFileSync(spPath, JSON.stringify(sp, null, 2) + '\n', 'utf8');

let errors = [];
const allLegacy = [...sp.koreaStories.slice(0, 49), ...sp.sfStories];
for (const item of allLegacy) {
  const res = auditStoryItem(item, { sourceFile: 'legacy-cleaned', isNewSeries: false });
  errors.push(...res.errors);
}

const wordCounts = allLegacy.map((s) => s.totalWords);
const minW = Math.min(...wordCounts);
const maxW = Math.max(...wordCounts);
const minItem = allLegacy.find((s) => s.totalWords === minW);

console.log(`Cleaned 99 legacy Personal stories (korea-1..49, sf-1..50).`);
console.log(`Word range: ${minW}w (${minItem.id}) .. ${maxW}w.`);
console.log(`Audit errors across 99 legacy stories: ${errors.length}`);
if (errors.length > 0) {
  errors.slice(0, 50).forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log('ALL 99 LEGACY STORIES PASSED CLEANUP & AUDIT!');
