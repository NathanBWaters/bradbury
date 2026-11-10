# Bradbury 1000 — Canonical Content & Audio Architecture Rules

## 1. The "100 of Everything" Catalog Standard (400 Total Works)

Every category in Bradbury 1000 contains **100 complete works** (`400` works total across the 4 pillars):
- **Poems (`poems`)**: `100` works (`poem-1` .. `poem-100`) in [`src/data/poemsAndEssays.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/poemsAndEssays.json).
- **Short Stories (`stories`)**: `100` works (`story-1` .. `story-100`) in [`src/data/storiesAndPlaces.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/storiesAndPlaces.json).
- **Essays (`essays`)**: `100` works (`essay-1` .. `essay-100`) in [`src/data/poemsAndEssays.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/poemsAndEssays.json).
- **Personal — Korea & San Francisco (`koreaStories` + `sfStories`)**: `100` works (`50` Korea `korea-1`..`korea-50` + `50` San Francisco `sf-1`..`sf-50`) in [`src/data/storiesAndPlaces.json`](file:///home/antigravity/NathanBWaters/bradbury/src/data/storiesAndPlaces.json).

---

## 2. Mandatory Key Context & 5-Paragraph Literary Analysis (All 400 Works)

Every single work across **Poems**, **Short Stories**, **Essays**, and **Personal (Korea & San Francisco)** MUST include:
1. **Key Context (`keyContext`)**:
   - A rich `100–165 word` (`>= 180 characters`) pre-reading historical, biographical, and literary briefing explaining the work's publication origin, cultural moment, and why it matters.
   - Displayed prominently in the `#key-context-card` callout box at the top of [`ReaderView.jsx`](file:///home/antigravity/NathanBWaters/bradbury/src/components/ReaderView.jsx), included in ElevenReader plain-text exports ([`plainTextFormatter.js`](file:///home/antigravity/NathanBWaters/bradbury/src/utils/plainTextFormatter.js)), `.epub` downloads ([`epubGenerator.js`](file:///home/antigravity/NathanBWaters/bradbury/src/utils/epubGenerator.js)), and pre-baked static HTML pages ([`prebakeStaticPages.mjs`](file:///home/antigravity/NathanBWaters/bradbury/scripts/prebakeStaticPages.mjs)).
2. **5-Paragraph Post-Reading Analysis (`analysis`)**:
   - Exactly `5` structured analytical sections (`title` + `body` of `100–150 words` each):
     - `I. Historical & Biographical Context` (or *Historical & Archival Context*)
     - `II. Core Themes & Central Metaphor` (or *Narrative Architecture & Dramatic Tension*)
     - `III. Craft, Form & Literary/Narrative Technique`
     - `IV. Critical Reception & Enduring Legacy`
     - `V. Bradbury Metaphor Collision & Nightly Reflection`

---

## 3. The 20-Minute Audio Rule for Personal (Korea & San Francisco) Stories

Every **Korea** (`korea-1`..`korea-50`) and **San Francisco** (`sf-1`..`sf-50`) story in the **Personal** pillar is designed specifically for a **~20-minute audio narration session** (e.g., via ElevenReader or night-walk / bedtime listening).

### Quantitative Specification
- **Standard Narration Speaking Rate**: `150 words per minute (WPM)` (ElevenReader / audiobook literary narration pace).
- **Target Audio Duration**: **~20 minutes of audio** (`18–22 minutes`).
- **Required Word Count per Story**:
  - **Total Narrated Words (`paragraphs` + 5-paragraph `analysis`)**: **`2,750 – 3,300 words`** (target `~3,000 words`).
  - **Narrative Body (`paragraphs`)**: **`2,150 – 2,600 words`** structured across `14–18` richly detailed longform narrative non-fiction paragraphs.
  - **5-Paragraph Cultural & Historical Analysis (`analysis`)**: **`600 – 750 words`** across `5` titled analytical sections (`I` through `V`).
- **Metadata Fields**:
  - `readingTimeMinutes`: `20`
  - `audioDurationMinutes`: `20`
- **Historical & Primary Source Grounding**:
  - Every Korea and San Francisco story must include at least **4 verified Primary & Historical Sources** (`title`, `author`, `year`, `url`) from archival, scholarly, or institutional repositories.

---

## 4. Verbatim Canonical Literature Rule (Poems, Short Stories, Essays)

- **Poems (`poems`)**: 100% real, verbatim, unabridged canonical poems + `keyContext` + 5-paragraph literary analysis.
- **Short Stories (`stories`)**: 100% real, verbatim, unabridged canonical short stories + `keyContext` + 5-paragraph literary analysis.
- **Essays (`essays`)**: 100% real, verbatim, unabridged classical essays + `keyContext` + 5-paragraph critical commentary.

---

## 5. Automated Enforcement

These rules are codified and enforced in:
- [`src/utils/catalogEngine.js`](file:///home/antigravity/NathanBWaters/bradbury/src/utils/catalogEngine.js) (`PERSONAL_STORY_AUDIO_RULE` and `computeStoryAudioMetrics`)
- [`tests/unit/bradbury.test.mjs`](file:///home/antigravity/NathanBWaters/bradbury/tests/unit/bradbury.test.mjs) (automated unit tests verifying all 400 works, `keyContext`, 5-paragraph `analysis`, and the 20-minute audio word count threshold on all 100 Personal stories)
