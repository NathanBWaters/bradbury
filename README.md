# Bradbury 1000 — Nocturnal Literary & Cultural Habit App

Inspired by Ray Bradbury's famous lecture on creativity — **1 Poem, 1 Short Story, and 1 Essay every night for 1,000 nights** — expanded with an equal **Korea & San Francisco Cultural Chronicle**, **Key Context Briefings**, and **5-Paragraph Post-Reading Literary Analysis** across all **400 works**.

## What’s Included in the "100 of Everything" Catalog (400 Complete Works)

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

4. **100 Personal Stories: 50 Korea & 50 San Francisco (`korea-1`..`korea-50` & `sf-1`..`sf-50`) — 20-Minute Audio Rule (~3,000 Words Each @ 150 WPM)**:
   - **Rule Specification ([`CONTENT_RULES.md`](./CONTENT_RULES.md))**: Every Korea and San Francisco story is crafted for **~20 minutes of audio narration** (`2,750–3,300` total words at `150 WPM`: `16–18` longform narrative paragraphs + `Key Context` briefing + `5-paragraph` cultural & historical analysis + `4` verified archival/primary sources).
   - **Korea (50 Stories)**: Deep history, architecture, culinary microbiology, maritime feats, printing revolutions, cinema, and urban ecology across Seoul, Gyeongju, Jeju, Busan, Andong, Suwon, DMZ, and Haeinsa.
   - **San Francisco (50 Stories)**: Gold Rush maritime archaeology, cable car physics, 1906 earthquake recovery, North Beach & Harlem of the West arts, Golden Gate structural engineering, Lands End ruins, Chinatown architecture, sourdough & Anchor Steam microbiology, and natural history.

5. **ElevenReader Audio Handoff (with Auto-Complete) & On-the-Fly `.epub` Bundler**:
   - **Clean Distraction-Free Reader URLs** (`/read/day-1/poem` .. `/read/day-100/sf`) — all **400** pages pre-rendered as static semantic HTML (including Key Context and 5-Paragraph Analysis) for 2-tap Mobile Web Share (`navigator.share`) into ElevenReader on iOS and Android.
   - **Auto-Complete on ElevenReader Share**: Sending any work to ElevenReader automatically marks it as completed and moves it to the Completed section.
   - **Pure-JS Spec-Compliant `.epub` Generator**: Download individual `.epub` files (including Key Context and 5-paragraph analysis) or bundle tonight's readings into a single bedtime `.epub`.

6. **2-Tier Duolingo-Style Streak Architecture**:
   - **Tier 1 ("Lit Flame")**: Complete at least **1 of 4** nightly pillars to keep your daily reading streak alive.
   - **Tier 2 ("Gold Bradbury Night")**: Complete **3 of 4** pillars to advance your 1,000 Nights counter and earn **Streak Freeze** tokens (1 token every 7 Gold Nights, max 2 held).
   - **Tier 3 ("Diamond Quartet")**: Complete **all 4 of 4** pillars (Poem, Short Story, Essay, and Korea/SF Lore).

## Running Locally & Testing

```bash
npm install
npm run dev
```

To build the production bundle (including all **400** pre-baked static `/read/day-N/[slot]` HTML pages for ElevenReader) and run the unit & headless Chromium E2E test suites:

```bash
npm run build
npm test
npm run test:e2e
```