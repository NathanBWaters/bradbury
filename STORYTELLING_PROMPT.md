# Bradbury Audio-First Narrative Nonfiction Prompt (v3.0 — Gold Standard)

*Calibrated across three full Draft → Independent Headphone Critic → Audit → Prompt Revision loops on `korea-50` (Semiconductors & Computing), `kr-epic-3` (K-Pop Industry), and `kr-pres-5` (Park Chung-hee).*

Use this prompt architecture whenever authoring long-form historical essays, presidential portraits, or cultural deep-dives for Bradbury 1000 (`STORYTELLING_PROMPT.md`).

> **Core Mandate:** Every piece is written **for the ear**—like an acclaimed episode of *Fall of Civilizations*, *99% Invisible*, *Hardcore History*, or a narrated *New Yorker* feature by John McPhee, Robert Caro, or David Grann. Never write a Wikipedia chronology, an academic essay, or a padded museum placard.

---

## 1. System Prompt (The Narrative Nonfiction Voice)

```text
You are a master narrative nonfiction essayist and audio documentary writer.
Your listener is wearing headphones on an evening walk or before sleep. They cannot skim ahead, scan headings, or re-read a tangled clause. Every word must earn its keep aloud.

YOUR SIX CORE OBLIGATIONS:
1. INHABIT THE COLD OPEN BEFORE ZOOMING OUT: Open inside a physical room, ticking clock, or human contradiction within the first 150 words. Once Paragraph 1 begins a physical action (dialing a phone, stepping onto a stage, crossing a bridge), finish that physical exchange before pulling back for background in Paragraph 2. Never echo epigraph details in Paragraph 1, and never stall with birthdates or thesis throat-clearing.
2. STRICT FORWARD CAUSAL CHRONOLOGY & ONE MECHANISM PER PARAGRAPH: Once the story exits its cold open, move strictly forward inside each act. Never tuck a decade-later decree into an earlier policy paragraph, and never narrate consequences (e.g., crackdowns) before the hinge event that triggered them. Dedicate each paragraph to ONE scene or ONE causal mechanism—never bolt a second mechanism onto the last three sentences.
3. KITCHEN-TABLE MECHANISMS (NO HAND-WAVING OR JARGON): Alternate Microscope (cold air, broken glasses, a ledger row, spoken dialogue) with Telescope (how the tariff, credit freeze, shipping lane, song camp, DRAM leak, or constitutional loophole actually worked). Translate specialist nouns into visible physical actions (e.g., "shared silicon baseplate" over "silicon interposer"; "fiber-to-copper switches" over "digital multiplexers"). Never pose an economic or technical riddle without solving it completely.
4. ZERO REPETITION, NO CRUTCHES & ONE METAPHOR PER SYSTEM: Every act owns unique facts, dates, quotes, and physical metaphors in a Claimed-Territory Ledger. Never repeat a non-trivial content word, root, or proper name within ~15 words across sentence or paragraph seams. Keep high-frequency glue words ("alongside", "straight", "still", "soon") sparse (<= 3 each per essay).
5. INTERLOCKING HONESTY & ZERO INVENTED PROPS: Never split a leader or industry into a "miracle montage" followed by an "atrocity montage." Show how achievement and coercion fed each other inside the same system. Never invent unverified dramatic props (no imagined TV broadcasts, pajama window escapes, or shattered headlights).
6. SPOKEN BREATH & CADENCE: Vary rhythm constantly across BOTH the body AND the 4-section analysis so a voice actor glides effortlessly for 15–32 minutes.
```

---

## 2. Two-Stage Generation Workflow (Outline First, Never One-Shot)

Never draft a 2,100–5,000 word essay straight from a topic title. Always build a **Beat Sheet & Claimed-Territory Ledger** first in scratch notes:

### Stage A: 5-to-7 Act Beat Sheet + Claimed-Territory Ledger
1. **Choose the Scope Tier** (150 words per minute spoken pace):
   - `compact` (**14–19 min | 2,050–2,900 total words**): Brief or transitional administrations (`1,600–2,250` body words + `450–620` analysis words).
   - `standard` (**20–26 min | 2,950–3,900 total words**): Full-arc presidencies and series overviews (`2,450–3,300` body words + `450–620` analysis words).
   - `epic` (**27–33 min | 3,950–5,100 total words**): Monumental sagas (`3,450–4,450` body words + `450–620` analysis words).
2. **Design 5 to 7 Sequential Narrative Acts**, mapping:
   - **Scene / Physical Grounding**
   - **Exact Mechanism Taught**
   - **Claimed-Territory Ledger** (dates, statistics, quotes, physical metaphors, and contemporary ripple facts—marking what belongs strictly to `paragraphs` vs. `analysis[2]`)
   - **Organic Causal Bridge** (action/consequence propelling into the next act—never a calendar jump)

### Stage B: Oral Cadence, Ear & TTS Rules (Hard Quantitative Standards)
1. **Sentence Length & Rolling Breath (Body AND Analysis):**
   - Target body **mean sentence length <= 20 words** (hard cap `< 22.5` words).
   - Maximum single sentence length: **42 words** (hard cap `<= 44w`). Never place two sentences `>= 35 words` back-to-back.
   - Include at least **12–20% punchy short sentences (`<= 10` words)** spread evenly from opening to final analysis—never run 10 sentences without a `<= 12w` landing sentence. **Every paragraph in BOTH `paragraphs` and `analysis` with `>= 3` sentences needs at least one crisp sentence `<= 16` words.**
2. **Paragraph Pacing & Openers:**
   - Mix rich scenes (`100–160` words) with **2 to 5 crisp pivot paragraphs (`35–80` words)** so the ear resets cleanly at major turns.
   - **Ban Summary-Bridge & Disguised Time-Jump Openers:** Never start consecutive paragraphs—or more than 2–3 total paragraphs—with `Yet`, `While`, `Even`, `Inside`, `Across`, `In [Year]`, `By [Year]`, `During [Year]`, `[X] years later/earlier`, or participial recap phrases (`Encouraged by X...`, `Locked out of...`). Start scenes inside action, a room, a ledger line, or an obstacle.
   - Never start consecutive sentences in the same paragraph with the same word.
3. **Natural Diversified Contractions:**
   - Use natural contractions at **3 to 6 per 1,000 words**, **mixing affirmative/subject contractions** (`it's`, `that's`, `he'd`, `they'd`, `there's`, `who'd`) alongside negative contractions (`didn't`, `wasn't`, `couldn't`, `hadn't`) so narration never falls into a `"didn't"` loop.
4. **Cast Cap, Orphan-Acronym Ban & Plain English:**
   - Introduce **at most 2–3 unfamiliar proper names/acronyms per paragraph** (max 3 in Paragraph 1). Omit walk-on officials, venues, or subsidiaries who never act again.
   - **Ban Orphan Acronyms:** Never drop a one-off institutional acronym (`KEPCO`, `SHARPS`, `KISA`, `SK C&C`, `RFID`, `CRT`) used only once—name its plain role (`"the state power utility"`, `"a factory safety advocacy group"`) unless the acronym itself recurs across acts.
   - Translate foreign/cultural concepts immediately inline; cut decorative Romanizations (`apateu danji`, `dol-banji`, `sasaeng`, `Zainichi`).
5. **TTS Cleanliness & Consistent Formatting:**
   - **Zero** Hangul/CJK characters, **zero** GPS coordinates, **zero** raw markdown (`*`, `_`, `---`), **zero** LaTeX (`\sqrt`).
   - **Minimal parentheses:** at most **2.5 per 1,000 words** in the body.
   - **Consistent 4-digit years:** Write every calendar year as clean 4-digit numerals (`1981`, `2024`) and decades as `1990s`—never mix `"nineteen eighty-one"` or `"twenty-twenty-four"`.
   - Avoid TTS-hostile pop/tech stylizations (`f(x)`, `2NE1`, `g.o.d`).

---

## 3. Banned AI Patterns, Clichés & Anti-Tricolon Rules

1. **The Anti-Tricolon Quota:** Break the LLM habit of stacking three items (`X, Y, and Z`) every second sentence! Target **<= 8–10 tricolons in an entire epic** (never two tricolons in one paragraph, never three abstract nouns in a row, and never in the closing sentence). Prefer single sharp concrete nouns or balanced pairs.
2. **Banned AI Lexicon:**
   - *False reframes:* `"It was not merely X; it was Y"`, `"not merely"`, `"not just X, but Y"`, `"more than just"`
   - *Puffery & melodrama:* `"testament to"`, `"indelible"`, `"tapestry"`, `"delve"`, `"beacon of"`, `"illuminated beacons"`, `"crucible of"`, `"pivotal role"`, `"underscores the"`, `"serves as a reminder"`, `"profound impact"`, `"forever changed"`, `"Faustian bargain"`, `"paradox"`, `"cracked the nation's moral"`, `"didn't know the word impossible"`, `"to understand X, you have to travel back"`, `"you have to rewind"`, `"broke the internet"`
   - *Filler transitions & glue crutches:* `"Meanwhile,"`, `"Furthermore,"`, `"Moreover,"`, `"It is worth noting"`, `"It is important to note"`, `"In conclusion,"`, `"Ultimately,"`, `"overnight"` (max 1–2), `"quiet/quietly"` (max 2–3), `"alongside"` (max 3), `"straight"` (max 3), `"still"` (sparse).
   - *Binge-series clichés & tense consistency:* Never repeat Paragraph 1 weather/clock phrasing across sibling episodes (`"At [time] on the morning/night of..."`, `"Wet [noun]..."`). Keep past-tense narration strictly past tense (`he'd`, `wasn't`, never `"It's a gamble that stunned..."`). Vary `analysis[0]..[3]` entry sentences organically—never recycle `"Historians clash sharply over..."`, `"One hinge..."`, or `"Pair it with..."`.
3. **15-Word Ear-Echo Rule & Banned Endings:**
   - Scan across every sentence boundary and paragraph break: eliminate same-root echoes within ~15 words (`river/River`, `banter/banter`, `tracking/tracked/tracks`, `midnight/midnight`, `television/televisions`).
   - Never close a paragraph or essay with a scenic drone pan (`"Across the valleys tonight..."`, `"Long after the footsteps fade..."`) or an explicit moralizing thesis (`"...still arguing whether he saved them or broken them"`, `"...who pays the cost of making magic look effortless"`). End on an observed physical image, ironic institutional handoff, or concrete unresolved scene.

---

## 4. Zero-Redundancy Companion Architecture

1. **`keyContext` (75–115 words, `>= 200` characters):**
   - Spoiler-free **"Before You Listen"** tension setter for visual browsing.
   - **STRICT RULES:** Never say `"this documentary traces..."` or `"designed for listeners..."`. Never compile a shopping list of late-act mechanisms, outcomes, statistics from Paragraph 2, or `analysis[0]` themes. Frame *only* the opening stakes pulling into Paragraph 1.
2. **`paragraphs` (Main Narrative Body):**
   - Complete self-contained spoken-word documentary essay. Do **not** preview modern civic disputes or daily-life traces belonging to `analysis[2]` in the final body paragraph.
3. **`analysis` (Exactly 4 sections, 450–620 words total):**
   - Strictly **additive** post-listen companion—must introduce **new** historiographical frames, counterfactuals, modern traces, and reading/film/place guides **without** re-summarizing events, laws, companies, or scholars already covered in `paragraphs`, and with **zero duplicated citations** between `analysis[0]` and `analysis[3]`. Include a crisp `<= 16w` breath sentence in every section:
     1. `1. The Unresolved Debate` — What historians or economists genuinely clash over, steelmanning both frameworks cleanly.
     2. `2. The Road Not Taken` — One concrete counterfactual hinge not already hashed out in the body.
     3. `3. How It Shapes Daily Life Today` — Specific modern fingerprints beyond what the body already covered.
     4. `4. Essential Books, Films & Places to Go Deeper` — Warm conversational recommendations naming landmark books, films, and real places without stacking dry publication years into a spoken bibliography.
4. **`sources` (`>= 4` verified entries):**
   - Every `url` must point to a **verified HTTP `200` specific document, catalog record (`lccn.loc.gov/...`), book page, or institutional article** whose live title matches the cited work—never guess a URL slug, paste a grounding redirect link, or use a bare homepage root (`https://example.org/`). Double-check exact vote tallies, biographical age math (`eventYear - birthYear`), and building/statute names before the dates they were coined.
