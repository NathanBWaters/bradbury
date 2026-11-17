# Bradbury 1000 — Canonical Content & Audio Architecture Rules

## 1. Catalog Standard (442 Total Works)

Bradbury 1000 spans 4 curated pillars totaling **442 works**:
- **Poems (`poems`)**: `100` verbatim works (`poem-1` .. `poem-100`) in [`src/data/poemsAndEssays.json`](file:///Users/nathan/repo/bradbury/src/data/poemsAndEssays.json).
- **Short Stories (`stories`)**: `100` verbatim works (`story-1` .. `story-100`) in [`src/data/storiesAndPlaces.json`](file:///Users/nathan/repo/bradbury/src/data/storiesAndPlaces.json).
- **Essays (`essays`)**: `100` verbatim works (`essay-1` .. `essay-100`) in [`src/data/poemsAndEssays.json`](file:///Users/nathan/repo/bradbury/src/data/poemsAndEssays.json).
- **Chronicles & Historical Series (`koreaStories` + `sfStories` + `narrativeSeries`)**: `142` works total:
  - `50` Korea Chronicles (`korea-1`..`korea-50`) and `50` San Francisco Chronicles (`sf-1`..`sf-50`) in [`src/data/storiesAndPlaces.json`](file:///Users/nathan/repo/bradbury/src/data/storiesAndPlaces.json).
  - `42` net-new long-form narrative essays in [`src/data/narrativeSeries.json`](file:///Users/nathan/repo/bradbury/src/data/narrativeSeries.json) (built from `src/data/series/*.json`), organized across three ordered listening series:
    - **Series: Korean Presidents (1900–Present)** (`kr-pres-0`..`kr-pres-16`, `17` episodes)
    - **Series: U.S. Presidents (1900–Present)** (`us-pres-0`..`us-pres-22`, `23` episodes)
    - **Series: Modern Korea Deep-Dives** (`kr-epic-1` Korean War, `korea-50` Semiconductor & Computing Rise, `kr-epic-3` K-Pop Industry, `3` episodes)

---

## 2. Single-Text Focus for Key Context & Analysis (No Bundle Wrap-Ups)

Because listeners read and listen to works in any order, **every work's Key Context and Literary/Historical Analysis MUST focus exclusively on that single text**:
- **Never** include a "bundle analysis" wrap-up, "Bradbury Metaphor Collision", "Night N", or cross-references assuming the user read a specific other poem, story, or essay that night.
- Every single work includes a **Key Context (`keyContext`)** briefing and an **analysis (`analysis`)**.

### 2a. Poems, Short Stories & Essays (300 works) — Plain-Prose Deep Dive
Written for a smart non-specialist listener (often via text-to-speech): warm, plain spoken prose, no unexplained jargon, no bullet points.
1. **Key Context (`keyContext`)** — about **1 minute spoken** (`130–175` words, enforced `120–190`): why the work is important, the history behind it (author, date, what was happening), and its overall meaning.
2. **6-Section Deep-Dive Analysis (`analysis`)** — (`~2,500–2,800` words, enforced `>= 2,300`), `~400–480` words per section, with paragraphs separated by `\n\n` inside each section's `paragraph` string. Headings, exactly and in order:
   - `I. What It Really Means`
   - `II. How Well It Works: A Critique`
   - `III. The Impact It Had`
   - `IV. What Readers Loved`
   - `V. What Critics Pushed Back On`
   - `VI. Its Place in the Bigger Picture`
   - Never invent quotations, reviewers or dates; where reception is thinly documented (e.g. early pulp stories), say so.

### 2b. Chronicles & Historical Series (142 works) — Audio-First Standard
All authoring rules, banned AI cliché constraints, and oral-cadence guidelines live in [`STORYTELLING_PROMPT.md`](file:///Users/nathan/repo/bradbury/STORYTELLING_PROMPT.md).
1. **Zero Print Clutter**: No inline CJK/Hangul parentheticals, no GPS coordinates, no raw markdown `*`/`---`, and no math/LaTeX symbols in spoken prose.
2. **Zero Mad-Libs Padding & Zero Repetition**: Every scene owns non-overlapping territory; neither `keyContext` nor `analysis` may re-summarize narrative beats from the body.
3. **Key Context (`keyContext`)**:
   - New Series & Epic essays: `70–125` words (`>= 200` chars) spoiler-free framing question ("Before You Listen"); omitted by default from ElevenReader TTS export so audio begins directly on the cold open.
   - Legacy Place Vignettes (`korea-1..49`, `sf-1..50`): `>= 180` characters.
4. **4-Section Analysis (`analysis`)**:
   - New Series & Epic essays (`450–650` words total, strictly additive):
     1. `1. The Unresolved Debate`
     2. `2. The Road Not Taken`
     3. `3. How It Shapes Daily Life Today`
     4. `4. Essential Books, Films & Places to Go Deeper`

---

## 3. Topic-Calibrated Audio Duration Rule (150 WPM)

Every Chronicle and Series essay scales naturally to the weight of its subject at **150 words per minute (WPM)**, without artificial padding or truncation:
- **Legacy Place Vignettes (`korea-1..49`, `sf-1..50`)**: `~8–17` minutes (`~1,200–2,600` authentic words after boilerplate removal).
- **Compact Portrait (`compact`)**: `14–19` minutes (`2,050–2,900` total words) — brief or transitional administrations.
- **Standard Deep-Dive (`standard`)**: `20–26` minutes (`2,950–3,950` total words) — full-arc presidencies and series overviews.
- **Epic Feature (`epic`)**: `27–33+` minutes (`3,950–5,250` total words) — monumental multi-act histories (Korean War, Korea Computing & Semiconductors, K-Pop Industry, transformative presidencies).
- **Honest Metadata**: `wordCount === bodyWords + analysisWords`, and `readingTimeMinutes === audioDurationMinutes === Math.max(6, Math.round(totalWords / 150))`.
- **Historical Grounding**: Every Chronicle and Series essay cites at least **4 Primary & Historical Sources** (`title`, `author`, `year`, `url`).

---

## 4. Automated Enforcement

These rules are codified and enforced in:
- [`STORYTELLING_PROMPT.md`](file:///Users/nathan/repo/bradbury/STORYTELLING_PROMPT.md) (Audio-First Narrative System Prompt, Blueprint & Critic Rubric)
- [`scripts/auditStoryQuality.mjs`](file:///Users/nathan/repo/bradbury/scripts/auditStoryQuality.mjs) (Automated repetition, TTS-safety, AI-slop, Jaccard similarity, and word-count gate)
- [`src/utils/catalogEngine.js`](file:///Users/nathan/repo/bradbury/src/utils/catalogEngine.js) (`PERSONAL_STORY_AUDIO_RULE`, `SERIES_DEFINITIONS`, and `computeStoryAudioMetrics`)
- [`tests/unit/bradbury.test.mjs`](file:///Users/nathan/repo/bradbury/tests/unit/bradbury.test.mjs) (Unit test suite verifying all 442 works, ordered series metadata, audio duration calibration, and zero-boilerplate integrity)
