# Bradbury 1000 — Nocturnal Literary & Cultural Habit App

Inspired by Ray Bradbury's famous lecture on creativity — **1 Poem, 1 Short Story, and 1 Essay every night for 1,000 nights** — expanded with an equal **Korea & San Francisco Cultural Chronicle** and **5-Paragraph Post-Reading Literary Analysis**.

## What’s Included in This Pre-Baked Prototype ("10 of Everything")

1. **10 Complete Unabridged Poems + 5-Paragraph Literary Analysis** (+ 4 pre-baked Swap Poems):
   - *Ozymandias* (Shelley), *Because I could not stop for Death* (Dickinson), *Stopping by Woods on a Snowy Evening* (Frost), *The Tyger* (Blake), *The Second Coming* (Yeats), *Kubla Khan* (Coleridge — Boss Night), *The Raven* (Poe — Boss Night), *Ode on a Grecian Urn* (Keats), *When I Heard the Learn'd Astronomer & O Me! O Life!* (Whitman), *Dover Beach* (Arnold).
   - Every poem ends with **5 structured paragraphs of literary analysis**:
     1. *Historical & Biographical Context*
     2. *Core Themes & Central Metaphor*
     3. *Craft, Form & Poetic Technique*
     4. *Critical Reception & Literary Legacy*
     5. *Bradbury Metaphor Collision & Nightly Reflection*

2. **10 Complete Short Stories + 5-Paragraph Literary Analysis** (+ 4 pre-baked Swap Stories):
   - *The Bet* (Chekhov), *The Story of an Hour* (Chopin), *The Tell-Tale Heart* (Poe), *The Necklace* (Maupassant), *The Gift of the Magi* (O. Henry), *The Star* (H. G. Wells — Boss Night), *A Hunger Artist & Before the Law* (Kafka — Boss Night), *An Occurrence at Owl Creek Bridge* (Bierce), *A Haunted House* (Woolf), *The Open Window* (Saki).

3. **10 Complete Essays + 5-Paragraph Critical Commentary** (+ 4 pre-baked Swap Essays):
   - Francis Bacon, Ralph Waldo Emerson, Michel de Montaigne, William James, Virginia Woolf, Henry David Thoreau, Thomas Henry Huxley, G. K. Chesterton, Bertrand Russell, and Edgar Allan Poe.

4. **10 Pre-Baked Korea Stories & 10 Pre-Baked San Francisco Stories**:
   - **Korea (10)**: King Sejong's Secret Hangul Lab (1443), Admiral Yi Sun-sin at Myeongnyang (1597), The Haenyeo of Jeju Island, Daylighting Seoul's Cheonggyecheon Stream, Gyeongju & Silla's Silk Road Golden Crowns, Onggi Breathing Jars & Gimjang Microbiology, Jikji (1377) & the Tripitaka Koreana, Euljiro's Metalwork & Print Alleys, Pansori / Han / Heung & Chungmuro Cinema, Bukchon Hanok's Ondol & Maru Thermodynamics.
   - **San Francisco (10)**: The Buried Gold Rush Fleet of Yerba Buena Cove (1849), Emperor Norton I, Andrew Hallidie's 1873 Cable Car Physics, The 1906 Earthquake & Giannini's Barrel-Top Bank, City Lights & the *Howl* Trial in North Beach, Bridging the Golden Gate in International Orange, Adolph Sutro's Glass Baths at Lands End, Look Tin Eli & Chinatown's Architectural Reinvention, Gold Rush Sourdough Microbiology & Mission Murals, Karl the Fog & the Golden Gate Wind Tunnel.

5. **ElevenReader Audio Handoff & On-the-Fly `.epub` Bundler**:
   - **Clean Distraction-Free Reader URLs** (`/read/day-1/poem`, `/read/day-1/story`, etc.) pre-rendered as static semantic HTML for 2-tap Mobile Web Share (`navigator.share`) into ElevenReader on iOS and Android.
   - **Pure-JS Spec-Compliant `.epub` Generator**: Download individual `.epub` files (including the 5-paragraph analysis at the end) or click **"Bundle Tonight's Quartet (.epub)"** to package all of tonight's readings into a single bedtime `.epub` for the ElevenReader Chrome Extension or mobile app.

6. **2-Tier Duolingo-Style Streak Architecture**:
   - **Tier 1 ("Lit Flame")**: Complete at least **1 of 4** nightly pillars to keep your daily reading streak alive.
   - **Tier 2 ("Gold Bradbury Night")**: Complete **3 of 4** pillars to advance your 1,000 Nights counter and earn **Streak Freeze** tokens (1 token every 7 Gold Nights, max 2 held).
   - **Tier 3 ("Diamond Quartet")**: Complete **all 4 of 4** pillars (Poem, Short Story, Essay, and Korea/SF Lore).

## Running Locally & Deploying to Vercel

```bash
npm install
npm run dev
```

To build the production bundle (including all 50 pre-baked static `/read/day-N/[slot]` HTML pages for ElevenReader):

```bash
npm run build
```