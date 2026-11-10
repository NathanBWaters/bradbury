# Bradbury 1000 — Canonical Content & Audio Architecture Rules

## 1. The 20-Minute Audio Rule for Personal (Korea & San Francisco) Stories

Every **Korea** and **San Francisco** story in the **Personal (`koreaStories` & `sfStories`)** pillar is designed specifically for a **~20-minute audio narration session** (e.g., via ElevenReader or night-walk / bedtime listening).

### Quantitative Specification
- **Standard Narration Speaking Rate**: `150 words per minute (WPM)` (ElevenReader / audiobook literary narration pace).
- **Target Audio Duration**: **~20 minutes of audio** (`18–22 minutes`).
- **Required Word Count per Story**:
  - **Total Narrated Words (`paragraphs` + 5-paragraph `analysis`)**: **`2,750 – 3,300 words`** (target `~3,000 words`).
  - **Narrative Body (`paragraphs`)**: **`2,150 – 2,600 words`** structured across `14–18` richly detailed longform narrative non-fiction paragraphs.
  - **5-Paragraph Cultural & Historical Analysis (`analysis`)**: **`600 – 750 words`** across exactly `5` titled analytical sections (`I` through `V`).
- **Metadata Fields**:
  - `readingTimeMinutes`: `20`
  - `audioDurationMinutes`: `20`
- **Historical & Primary Source Grounding**:
  - Every Korea and San Francisco story must include at least **4 verified Primary & Historical Sources** (`title`, `author`, `year`, `url`) from archival, scholarly, or institutional repositories.

---

## 2. Verbatim Canonical Literature Rule (Poems, Short Stories, Essays)

- **Poems (`poems`)**: 100% real, verbatim, unabridged canonical poems + 5-paragraph literary analysis.
- **Short Stories (`stories`)**: 100% real, verbatim, unabridged canonical short stories + 5-paragraph literary analysis.
- **Essays (`essays`)**: 100% real, verbatim, unabridged classical essays + 5-paragraph critical commentary.

---

## 3. Automated Enforcement

These rules are codified and enforced in:
- [`src/utils/catalogEngine.js`](file:///home/antigravity/NathanBWaters/bradbury/src/utils/catalogEngine.js) (`PERSONAL_STORY_AUDIO_RULE` and `computeStoryAudioMetrics`)
- [`tests/unit/bradbury.test.mjs`](file:///home/antigravity/NathanBWaters/bradbury/tests/unit/bradbury.test.mjs) (automated unit test verifying every Korea and SF story meets the 20-minute audio word count threshold)
