# Bradbury 1000 — Nocturnal Literary & Cultural Habit App

Inspired by Ray Bradbury's famous lecture on creativity — **1 Poem, 1 Short Story, and 1 Essay every night for 1,000 nights** — expanded with **Korea, U.S. & San Francisco Chronicles & Long-Form Audio Series**, **Key Context Briefings**, and **Post-Reading Historical & Literary Analysis** across **442 works**.

## What’s Included in the Catalog (442 Works)

1. **100 Complete Verbatim Poems (`poem-1`..`poem-100`) + Key Context + 5-Paragraph Literary Analysis**:
   - Spanning Romantic Ode & Lyric, Elizabethan & Metaphysical, Modernist & Symbolist, American Lyric & Visionary, and Victorian Dramatic & Elegiac poetry (Shelley, Dickinson, Frost, Blake, Yeats, Coleridge, Poe, Keats, Whitman, Arnold, Shakespeare, Donne, Herbert, Marvell, Milton, Wordsworth, Byron, Browning, Tennyson, Hardy, Wilde, Housman, Eliot, Sandburg, Millay, Dunbar, Claude McKay, Langston Hughes, Georgia Douglas Johnson, and more).
   - Every poem includes a dedicated **"Key Context & Why It Matters"** historical/biographical briefing before the poem and **5 structured paragraphs of literary analysis** at the end:
     1. *Historical & Biographical Context*
     2. *Core Themes & Central Metaphor*
     3. *Craft, Form & Poetic Technique*
     4. *Critical Reception & Literary Legacy*
     5. *Bradbury Metaphor Collision & Nightly Reflection*

2. **100 Complete Verbatim Short Stories (`story-1`..`story-100`) + Key Context + 5-Paragraph Literary Analysis**:
   - Features **16 verbatim Ray Bradbury stories** (*Zero Hour*, *A Little Journey*, *The Monster Maker*, *Morgue Ship*, *Lazarus Come Forth*, *Defense Mech*, *Rocket Summer*, *Jonah of the Jove-Run*, *Asleep in Armageddon*, *The Creatures That Time Forgot*, *Lorelei of the Red Mist*, *The Million Year Picnic*, *The Irritated People*, *Referent*, *King of the Gray Spaces*, *Final Victim*) alongside sci-fi and speculative classics by Philip K. Dick, H. G. Wells, Fritz Leiber, and H. P. Lovecraft, plus world fiction masterpieces by Chekhov, Poe, Maupassant, Chopin, O. Henry, Kafka, Bierce, Woolf, Saki, Hawthorne, Melville, Gogol, Tolstoy, Turgenev, Joyce, Mansfield, Wharton, Fitzgerald, Hemingway, Conan Doyle, and Chesterton.
   - Every short story includes both a **"Key Context & Why It Matters"** pre-reading briefing (`keyContext`) and a full **5-Paragraph Literary Analysis** (`analysis`).

3. **100 Complete Verbatim Essays (`essay-1`..`essay-100`) + Key Context + 5-Paragraph Critical Commentary**:
   - Unabridged classical, philosophical, scientific, and civic essays by Francis Bacon, Michel de Montaigne, Ralph Waldo Emerson, Henry David Thoreau, William James, Virginia Woolf, Thomas Henry Huxley, G. K. Chesterton, Bertrand Russell, Edgar Allan Poe, W. E. B. Du Bois, Robert Louis Stevenson, John Stuart Mill, Thomas Paine, Epictetus, Marcus Aurelius, Samuel Johnson, Jonathan Swift, Joseph Addison, Charles Lamb, William Hazlitt, Thomas De Quincey, Matthew Arnold, Walter Pater, and Oscar Wilde.
   - Every essay includes a **"Key Context & Why It Matters"** briefing (`keyContext`) and a **5-Paragraph Critical Commentary** (`analysis`).

4. **142 Chronicles & Long-Form Audio Series (`korea-1`..`korea-50`, `sf-1`..`sf-50`, plus `42` Standalone Series Episodes) — Audio-First Standard (`150 WPM`)**:
   - **Editorial Craft & Calibration ([`STORYTELLING_PROMPT.md`](./STORYTELLING_PROMPT.md), [`CONTENT_RULES.md`](./CONTENT_RULES.md), [`scripts/auditStoryQuality.mjs`](./scripts/auditStoryQuality.mjs))**: Authoring pipeline built for natural headphone listening (`compact` 14–19 min, `standard` 20–26 min, `epic` 27–33 min at `150 WPM`) with zero template repetition, strict forward causality, varied sentence cadence, spoiler-free `keyContext`, 4 additive analysis essays, and verified historical sources.
   - **Series: Korean Presidents & Rulers (1900–Present)** (`kr-pres-0`..`kr-pres-16`, `17` episodes): From Emperor Gojong and Kim Koo's exile government through Syngman Rhee, Park Chung-hee, democratization, impeachment, and Lee Jae-myung.
   - **Series: U.S. Presidents (1900–Present)** (`us-pres-0`..`us-pres-22`, `23` episodes): Overview plus dedicated long-form portraits from William McKinley and Theodore Roosevelt through Joe Biden and Donald Trump (45th & 47th terms).
   - **Series: Modern Korea Deep-Dives** (`kr-epic-1`, `korea-50`, `kr-epic-3`, `3` episodes): *The Korean War (1950–1953)*, *How South Korea Engineered Semiconductors, Broadband & Modern Computing* (replaces legacy `korea-50`), and *How the K-Pop Industry Came About*.
   - **Korea & San Francisco City Chronicles (`99` Legacy Stories Audited & Cleaned)**: Free of robotic template wrappers and TTS clutter, covering Joseon craft, culinary microbiology, Gold Rush ships, 1906 earthquake recovery, and Pacific ecology.

5. **ElevenReader Audio Handoff (with Auto-Complete) & On-the-Fly `.epub` Bundler**:
   - **Clean Distraction-Free Reader URLs** (`/read/day-1/poem` .. `/read/day-100/sf` plus `/read/series/<id>`) — all **442** pages pre-rendered as static semantic HTML for 2-tap Mobile Web Share (`navigator.share`) into ElevenReader, with clean spoiler-free plain-text handoff.
   - **Auto-Complete on ElevenReader Share**: Sending any work to ElevenReader automatically marks it as completed and moves it to the Completed section.
   - **Pure-JS Spec-Compliant `.epub` Generator**: Download individual `.epub` files (including Key Context and 5-paragraph analysis) or bundle tonight's readings into a single bedtime `.epub`.

6. **2-Tier Duolingo-Style Streak Architecture**:
   - **Tier 1 ("Lit Flame")**: Complete at least **1 of 4** nightly pillars to keep your daily reading streak alive.
   - **Tier 2 ("Gold Bradbury Night")**: Complete **3 of 4** pillars to advance your 1,000 Nights counter and earn **Streak Freeze** tokens (1 token every 7 Gold Nights, max 2 held).
   - **Tier 3 ("Diamond Quartet")**: Complete **all 4 of 4** pillars (Poem, Short Story, Essay, and Korea/SF Lore).

7. **XP, Daily Quests & Trophy Case (`src/utils/rewardsEngine.js`)**:
   - **XP & Levels**: every read pays XP (poem 10, essay 15, story/chronicle 20) plus first-read, Gold Night and four-form bonuses, climbing literary ranks from *Candle Lighter* to *Bradbury Laureate*.
   - **Daily Quests + Lantern Chest**: three quests dealt per calendar day (same on every device); finishing all three opens a bonus-XP chest. A midnight countdown shows how long is left to save the streak.
   - **Monthly Lantern Challenge** (30 quests in a month) and **12 tiered achievements** in the Ledger.
   - All rewards are derived from synced reading history, so nothing extra is stored and un-marking a work returns its XP.

## Running Locally & Testing

```bash
npm install
npm run dev
```

To build the production bundle (including all **442** pre-baked static `/read/day-N/[slot]` and `/read/series/[id]` HTML pages for ElevenReader) and run the unit & headless Chromium E2E test suites:

```bash
npm run build
npm test
npm run test:e2e
```