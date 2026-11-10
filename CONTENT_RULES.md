# Bradbury 1000 — Canonical Content & Audio Architecture Rules

## 1. The "100 of Everything" Catalog Standard (400 Total Works)

Every category in Bradbury 1000 contains **100 complete works** (`400` works total across the 4 pillars):
- **Poems (`poems`)**: `100` works (`poem-1` .. `poem-100`) in [`src/data/poemsAndEssays.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/poemsAndEssays.json).
- **Short Stories (`stories`)**: `100` works (`story-1` .. `story-100`) in [`src/data/storiesAndPlaces.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/storiesAndPlaces.json).
- **Essays (`essays`)**: `100` works (`essay-1` .. `essay-100`) in [`src/data/poemsAndEssays.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/poemsAndEssays.json).
- **Personal — Korea & San Francisco (`koreaStories` + `sfStories`)**: `100` works (`50` Korea `korea-1`..`korea-50` + `50` San Francisco `sf-1`..`sf-50`) in [`src/data/storiesAndPlaces.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/storiesAndPlaces.json).

---

## 2. Single-Text Focus for Key Context & Analysis (No Bundle Wrap-Ups)

Because listeners read and listen to works in any order, **every work's Key Context and Literary/Historical Analysis MUST focus exclusively on that single text**:
- **Never** include a "bundle analysis" wrap-up, "Bradbury Metaphor Collision", "Night N", or cross-references assuming the user read a specific other poem, story, or essay that night.
- Every single work includes a **Key Context (`keyContext`)** briefing read *before* the text and an **analysis (`analysis`)** read *after* it.

### 2a. Poems, Short Stories & Essays (300 works) — Plain-Prose Deep Dive
Written for a smart non-specialist listener (often via text-to-speech): warm, plain spoken prose, no unexplained jargon, no bullet points.
1. **Key Context (`keyContext`)** — about **1 minute spoken** (`130–175` words, enforced `120–190`): why the work is important, the history behind it (author, date, what was happening), and its overall meaning.
2. **6-Section Deep-Dive Analysis (`analysis`)** — about **5x** the old 4-paragraph analysis (`~2,500–2,800` words, enforced `>= 2,300`), `~400–480` words per section, with paragraphs separated by `\n\n` inside each section's `paragraph` string. Headings, exactly and in order:
   - `I. What It Really Means` — deciphering the meaning
   - `II. How Well It Works: A Critique` — an honest critical assessment
   - `III. The Impact It Had` — influence on writers, culture, ideas, teaching
   - `IV. What Readers Loved`
   - `V. What Critics Pushed Back On`
   - `VI. Its Place in the Bigger Picture` — its tradition, ancestors and descendants
   - Never invent quotations, reviewers or dates; where reception is thinly documented (e.g. early pulp stories), say so.

### 2b. Personal (Korea & San Francisco) — 4-Section Analysis
1. **Key Context (`keyContext`)**: a `100–165 word` (`>= 180 characters`) briefing.
2. **4-Section Single-Text Analysis (`analysis`)**: `1. Historical/Scientific Deep-Dive`, `2. Technical/Cultural Deep-Dive`, `3. Key Concepts & Vocabulary/Landmarks to Remember`, `4. Where to Walk This Story Today`.

---

## 3. The 20-Minute Audio Rule for Personal (Korea & San Francisco) Stories

Every **Korea** (`korea-1`..`korea-50`) and **San Francisco** (`sf-1`..`sf-50`) story in the **Personal** pillar is designed specifically for a **~20-minute audio narration session** (e.g., via ElevenReader or night-walk / bedtime listening).

### Quantitative Specification
- **Standard Narration Speaking Rate**: `150 words per minute (WPM)` (ElevenReader / audiobook literary narration pace).
- **Target Audio Duration**: **~20 minutes of audio** (`18–22 minutes`).
- **Required Word Count per Story**:
  - **Total Narrated Words (`paragraphs` + `analysis`)**: **`2,750 – 3,300 words`** (target `~3,000 words`).
  - **Narrative Body (`paragraphs`)**: **`2,150 – 2,600 words`** structured across `14–18` richly detailed longform narrative non-fiction paragraphs.
  - **Single-Text Cultural & Historical Analysis (`analysis`)**: **`500 – 700 words`** across `4` titled analytical sections (`1` through `4`).
- **Metadata Fields**:
  - `readingTimeMinutes`: `20`
  - `audioDurationMinutes`: `20`
- **Historical & Primary Source Grounding**:
  - Every Korea and San Francisco story must include at least **4 verified Primary & Historical Sources** (`title`, `author`, `year`, `url`) from archival, scholarly, or institutional repositories.

---

## 4. Automated Enforcement

These rules are codified and enforced in:
- [`src/utils/catalogEngine.js`](file:///home/antigravity/NathanBWaters/bradbury/src/utils/catalogEngine.js) (`PERSONAL_STORY_AUDIO_RULE` and `computeStoryAudioMetrics`)
- [`tests/unit/bradbury.test.mjs`](file:///home/antigravity/NathanBWaters/bradbury/tests/unit/bradbury.test.mjs) (automated unit tests verifying all 400 works, `keyContext` length, 6-section literary / 4-section Personal `analysis` with zero bundle/collision wrap-ups, and the 20-minute audio word count threshold on all 100 Personal stories)
