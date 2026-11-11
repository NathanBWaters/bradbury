import React, { useState, useId } from 'react';
import { Flame, Snowflake, Award, Check } from 'lucide-react';
import { playMascotChirpSound } from '../utils/soundEffects.js';

/**
 * Original SVG Mascot Design: "Folio the Lantern Owl"
 * Keeper of Ray Bradbury's 1,000-Night Bedside Library.
 *
 * Moods:
 * - 'encouraging': gentle bob, natural blink, waving wing, waiting ember in brass lantern
 * - 'at_risk': alert perked ear-tufts, waving wing urging tonight's read before midnight
 * - 'happy': cheerful bounce, blazing golden lantern flame, warm eyes
 * - 'celebrating': joyful Duolingo jump + raised wings + open smiling beak + star sparkles
 * - 'royal': golden laurels + blazing lantern + proud smile (3+ reads Gold Bradbury Night!)
 * - 'frozen': cozy frosted cerulean scarf + crystalline shield glow (saved by Streak Freeze!)
 * - 'curious': head tilt + peeking with lantern (used on guided funnel steps)
 */
export function FolioMascot({
  mood = 'encouraging',
  size = 84,
  lit = false,
  className = '',
  onClick,
  interactive = false,
  label = 'Folio the Lantern Owl'
}) {
  const uid = useId().replace(/:/g, '');
  const isLit = lit || mood === 'happy' || mood === 'celebrating' || mood === 'royal';
  const isFrozen = mood === 'frozen';
  const isCelebrating = mood === 'celebrating';
  const isRoyal = mood === 'royal';

  const Wrapper = interactive ? 'button' : 'div';
  const wrapperProps = interactive
    ? {
        type: 'button',
        onClick,
        'aria-label': `${label} — tap for encouragement`,
        title: 'Tap Folio for a literary pep talk!'
      }
    : {
        role: 'img',
        'aria-label': label
      };

  return (
    <Wrapper
      {...wrapperProps}
      className={`folio-mascot-wrap mood-${mood} ${isLit ? 'is-lit' : 'is-unlit'} ${
        interactive ? 'is-interactive' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="folio-svg"
      >
        <defs>
          <radialGradient id={`aura-${uid}`} cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={isFrozen ? '#67C6F5' : isLit ? '#FFB830' : '#E5C899'}
              stopOpacity={isCelebrating || isRoyal ? '0.42' : isLit ? '0.28' : '0.16'}
            />
            <stop offset="100%" stopColor="#FFB830" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`plumage-${uid}`} x1="70" y1="28" x2="70" y2="122" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#B86635" />
            <stop offset="55%" stopColor="#964C22" />
            <stop offset="100%" stopColor="#773A18" />
          </linearGradient>

          <linearGradient id={`belly-${uid}`} x1="70" y1="66" x2="70" y2="118" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF8EA" />
            <stop offset="100%" stopColor="#F0DFC0" />
          </linearGradient>

          <linearGradient id={`flame-${uid}`} x1="115" y1="74" x2="115" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF59D" />
            <stop offset="48%" stopColor="#FF9800" />
            <stop offset="100%" stopColor="#E65100" />
          </linearGradient>
        </defs>

        {/* Ambient Halo */}
        <circle cx="70" cy="72" r="62" fill={`url(#aura-${uid})`} className="folio-aura" />

        {/* Ground Shadow (squashes & stretches in sync with bounce) */}
        <ellipse
          cx="68"
          cy="128"
          rx="30"
          ry="5.5"
          fill="currentColor"
          opacity="0.13"
          className="folio-ground-shadow"
        />

        {/* Floating Literary Sparkles (visible when lit, celebrating, or royal) */}
        {(isLit || isFrozen) && (
          <g className="folio-sparkles">
            <path
              d="M22 34 L24.2 39.8 L30 42 L24.2 44.2 L22 50 L19.8 44.2 L14 42 L19.8 39.8 Z"
              fill={isFrozen ? '#5BC0F8' : '#F59E0B'}
              className="sparkle-1"
            />
            <path
              d="M116 24 L117.6 28.4 L122 30 L117.6 31.6 L116 36 L114.4 31.6 L110 30 L114.4 28.4 Z"
              fill={isFrozen ? '#93DCFF' : '#FBBF24'}
              className="sparkle-2"
            />
            <circle
              cx="28"
              cy="20"
              r="2.6"
              fill={isFrozen ? '#67C6F5' : '#FB923C'}
              className="sparkle-3"
            />
          </g>
        )}

        {/* Whole Animated Owl Character Group */}
        <g className="folio-character">
          {/* Talons / Feet */}
          <g className="folio-feet" stroke="#D9821E" strokeWidth="3.2" strokeLinecap="round">
            <path d="M54 118 L50 125 M57 118 L57 126 M60 118 L63 125" />
            <path d="M77 118 L74 125 M80 118 L80 126 M83 118 L87 125" />
          </g>

          {/* Left Wing (Viewer's Left — waves / cheers!) */}
          <g className="folio-wing-left">
            <path
              d="M38 72 C22 76, 18 96, 29 107 C35 112, 43 106, 44 96 Z"
              fill={`url(#plumage-${uid})`}
              stroke="#5E2C11"
              strokeWidth="1.6"
            />
            <path
              d="M29 88 C26 93, 28 99, 33 102"
              stroke="#D58E5C"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>

          {/* Plump Owl Torso */}
          <ellipse
            cx="68"
            cy="91"
            rx="31"
            ry="30"
            fill={`url(#plumage-${uid})`}
            stroke="#5E2C11"
            strokeWidth="1.8"
          />

          {/* Cream Parchment Scalloped Belly + Feather Chevrons */}
          <ellipse cx="68" cy="95" rx="21.5" ry="22.5" fill={`url(#belly-${uid})`} />
          <g stroke="#B88B58" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.65">
            <path d="M58 88 L62 92 L66 88" />
            <path d="M70 88 L74 92 L78 88" />
            <path d="M64 98 L68 102 L72 98" />
            <path d="M56 105 L60 108.5 L64 105" />
            <path d="M72 105 L76 108.5 L80 105" />
          </g>

          {/* Head + Facial Disc + Glasses + Ear Tufts */}
          <g className="folio-head">
            {/* Perky Owl Ear-Tufts */}
            <path
              d="M42 42 L33 23 L53 33 Z"
              fill="#8F471E"
              stroke="#5E2C11"
              strokeWidth="1.6"
              strokeLinejoin="round"
              className="folio-tuft-left"
            />
            <path
              d="M94 42 L103 23 L83 33 Z"
              fill="#8F471E"
              stroke="#5E2C11"
              strokeWidth="1.6"
              strokeLinejoin="round"
              className="folio-tuft-right"
            />

            {/* Outer Head Dome */}
            <ellipse
              cx="68"
              cy="54"
              rx="32"
              ry="27"
              fill={`url(#plumage-${uid})`}
              stroke="#5E2C11"
              strokeWidth="1.8"
            />

            {/* Heart-Shaped Barn Owl Cream Facial Disc */}
            <path
              d="M68 38 C59 31, 41 35, 41 53 C41 67, 54 75, 68 75 C82 75, 95 67, 95 53 C95 35, 77 31, 68 38 Z"
              fill="#FFF9EC"
              stroke="#C9A87C"
              strokeWidth="1.6"
            />

            {/* Warm Rosy Cheeks */}
            <ellipse cx="48" cy="62" rx="4.8" ry="2.8" fill="#F29B7E" opacity="0.48" />
            <ellipse cx="88" cy="62" rx="4.8" ry="2.8" fill="#F29B7E" opacity="0.48" />

            {/* Big Expressive Owl Eyes */}
            <g className="folio-eyes">
              <circle cx="55.5" cy="53.5" r="9.5" fill="#FFFDF8" stroke="#6E4726" strokeWidth="1.5" />
              <circle cx="80.5" cy="53.5" r="9.5" fill="#FFFDF8" stroke="#6E4726" strokeWidth="1.5" />

              {isCelebrating ? (
                /* Joyful Happy Arc Eyes when celebrating! */
                <g stroke="#281A11" strokeWidth="2.8" strokeLinecap="round" fill="none">
                  <path d="M49.5 55 C52 49, 59 49, 61.5 55" />
                  <path d="M74.5 55 C77 49, 84 49, 86.5 55" />
                </g>
              ) : (
                /* Rich Espresso Pupils + Dual Glossy Catchlights */
                <g className="folio-pupils">
                  <circle cx="56" cy="53.5" r="5.8" fill="#261810" />
                  <circle cx="54" cy="51.2" r="2.2" fill="#FFFFFF" />
                  <circle cx="58.2" cy="55.6" r="1.1" fill="#FFFFFF" opacity="0.85" />

                  <circle cx="81" cy="53.5" r="5.8" fill="#261810" />
                  <circle cx="79" cy="51.2" r="2.2" fill="#FFFFFF" />
                  <circle cx="83.2" cy="55.6" r="1.1" fill="#FFFFFF" opacity="0.85" />
                </g>
              )}

              {/* Natural Blinking Eyelids */}
              {!isCelebrating && (
                <g className="folio-eyelids">
                  <ellipse cx="55.5" cy="53.5" rx="9.6" ry="9.6" fill="#D9B488" />
                  <ellipse cx="80.5" cy="53.5" rx="9.6" ry="9.6" fill="#D9B488" />
                </g>
              )}
            </g>

            {/* Brass Scholar Spectacles */}
            <g stroke="#C28426" strokeWidth="1.8" fill="none">
              <circle cx="55.5" cy="53.5" r="11.4" />
              <circle cx="80.5" cy="53.5" r="11.4" />
              <path d="M66.9 52.5 Q68 50.5 69.1 52.5" strokeWidth="2" />
            </g>

            {/* Golden Owl Beak (opens cheerfully when celebrating!) */}
            {isCelebrating || isRoyal ? (
              <g>
                <path
                  d="M63.5 60 L68 56.5 L72.5 60 L68 68.5 Z"
                  fill="#B43C2B"
                  stroke="#6E2419"
                  strokeWidth="1.2"
                />
                <path
                  d="M63 60 L68 56 L73 60 L68 63.5 Z"
                  fill="#EDA029"
                  stroke="#8C540B"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </g>
            ) : (
              <path
                d="M64 59.5 L68 56.2 L72 59.5 L68 66 Z"
                fill="#EDA029"
                stroke="#8C540B"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            )}

            {/* Royal Gold Bradbury Laurel Crown when Gold Night / Quartet is achieved */}
            {isRoyal && (
              <g className="folio-crown" transform="translate(0, -3)">
                <path
                  d="M52 29 L57 18 L64 25 L68 15 L72 25 L79 18 L84 29 Z"
                  fill="#FBBF24"
                  stroke="#B45309"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="68" cy="23" r="2" fill="#FFFBEB" />
              </g>
            )}
          </g>

          {/* Cozy Frosted Scarf (when Streak Freeze saved yesterday!) OR Scholar's Bowtie */}
          {isFrozen ? (
            <g className="folio-scarf">
              <path
                d="M45 73 Q68 81 91 73 Q93 80 88 82 Q68 88 48 82 Q43 80 45 73 Z"
                fill="#38BDF8"
                stroke="#0284C7"
                strokeWidth="1.5"
              />
              <path
                d="M74 81 L80 99 L71 100 L68 83 Z"
                fill="#7DD3FC"
                stroke="#0284C7"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </g>
          ) : (
            <g className="folio-bowtie">
              <path
                d="M57 73 L68 77.5 L57 82 Z"
                fill="#B83B2A"
                stroke="#6E1E14"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M79 73 L68 77.5 L79 82 Z"
                fill="#B83B2A"
                stroke="#6E1E14"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <circle cx="68" cy="77.5" r="2.8" fill="#E5A235" stroke="#6E1E14" strokeWidth="1.1" />
            </g>
          )}

          {/* Right Wing Holding Folio's Brass Bedside Lantern */}
          <g className="folio-wing-right">
            <path
              d="M96 73 C109 76, 113 91, 103 101 C98 106, 91 101, 91 92 Z"
              fill={`url(#plumage-${uid})`}
              stroke="#5E2C11"
              strokeWidth="1.6"
            />

            {/* Brass Reading Lantern */}
            <g className="folio-lantern">
              {/* Handle Ring */}
              <path
                d="M108 82 C108 75, 120 75, 120 82"
                stroke="#C5892B"
                strokeWidth="2"
                fill="none"
              />
              {/* Lantern Cap */}
              <path d="M105 84 L123 84 L120 80 L108 80 Z" fill="#B7791F" stroke="#6E440B" strokeWidth="1.2" />
              {/* Glass Chamber */}
              <rect
                x="107"
                y="84"
                width="14"
                height="18"
                rx="3"
                fill={isFrozen ? '#E0F2FE' : isLit ? '#FFFBEB' : '#F5EFE4'}
                fillOpacity="0.9"
                stroke="#975A16"
                strokeWidth="1.4"
              />
              {/* Lantern Flame or Waiting Ember */}
              {isFrozen ? (
                <path
                  d="M114 87 C118 91, 118 97, 114 99 C110 97, 110 91, 114 87 Z"
                  fill="#0EA5E9"
                  className="folio-lantern-flame"
                />
              ) : isLit ? (
                <g className="folio-lantern-flame">
                  <path
                    d="M114 86 C118.5 91, 118.5 97.5, 114 100 C109.5 97.5, 109.5 91, 114 86 Z"
                    fill={`url(#flame-${uid})`}
                  />
                  <ellipse cx="114" cy="95.5" rx="2.1" ry="3" fill="#FFFDE7" />
                </g>
              ) : (
                <circle
                  cx="114"
                  cy="96.5"
                  r="2.4"
                  fill="#EA580C"
                  opacity="0.7"
                  className="folio-waiting-ember"
                />
              )}
              {/* Lantern Base */}
              <rect x="105" y="102" width="18" height="3.5" rx="1.5" fill="#B7791F" stroke="#6E440B" strokeWidth="1.1" />
            </g>
          </g>
        </g>
      </svg>
    </Wrapper>
  );
}

/**
 * 7-Day Duolingo Flame & Freeze Calendar Strip (`S M T W T F S`)
 */
export function DuolingoWeekStrip({ weekDays = [], compact = false }) {
  if (!Array.isArray(weekDays) || weekDays.length === 0) return null;

  return (
    <div
      className={`duo-week-strip ${compact ? 'compact' : ''}`}
      aria-label="Last 7 days streak calendar"
    >
      {weekDays.map((day) => {
        const isLit = day.status === 'lit' || day.status === 'gold';
        const isGold = day.status === 'gold';
        const isFrozen = day.status === 'frozen';

        return (
          <div
            key={day.dateKey}
            className={`duo-day-col ${day.isToday ? 'is-today' : ''} status-${day.status}`}
            title={`${day.dayShort} (${day.dateKey}): ${
              isGold
                ? `${day.count} works read — Gold Bradbury Night!`
                : isLit
                ? `${day.count} work${day.count === 1 ? '' : 's'} read — Streak lit`
                : isFrozen
                ? 'Saved by Streak Freeze'
                : day.isToday
                ? 'Not lit yet tonight'
                : 'No reading logged'
            }`}
          >
            <span className="duo-day-letter">{day.dayLetter}</span>
            <span className={`duo-day-node status-${day.status}`}>
              {isGold ? (
                <Award size={compact ? 12 : 14} />
              ) : isLit ? (
                <Check size={compact ? 12 : 14} strokeWidth={3} />
              ) : isFrozen ? (
                <Snowflake size={compact ? 12 : 13} />
              ) : (
                <span className="duo-day-empty-dot" />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const PEP_TALKS = [
  '“Stuff your eyes with wonder,” said Ray Bradbury. Even one short poem tonight lights your lantern!',
  'Hoo-hoot! One poem, one story, one essay—1,000 nights of wonder, one quiet evening at a time.',
  'Consistency beats marathons! Reading just 1 work before sleep protects and extends your daily flame.',
  'Three works in a single day unlocks a Gold Bradbury Night—and every 7-day streak earns a Streak Freeze!',
  'Listening in ElevenReader with your eyes closed counts toward tonight’s flame too!'
];

/**
 * Interactive Step-by-Step Mascot Encouragement Coach Banner
 */
export function MascotCoachBanner({
  streakStats,
  stepContext = 'home', // 'home' | 'tonight' | 'choose-type' | 'choose-genre' | 'shelf' | 'journal'
  categoryLabel = '',
  soundEnabled = true,
  showWeekStrip = false,
  actionButton = null
}) {
  const [tapCount, setTapCount] = useState(0);
  const [isHopping, setIsHopping] = useState(false);

  const {
    currentStreak = 0,
    completedToday = false,
    todayCount = 0,
    streakState = 'unstarted',
    freezeTokens = 1,
    nextMilestone = 3,
    weekDays = []
  } = streakStats || {};

  function handleMascotTap() {
    playMascotChirpSound(soundEnabled);
    setTapCount((c) => c + 1);
    setIsHopping(true);
    setTimeout(() => setIsHopping(false), 650);
  }

  // Determine Folio's animated mood
  let mood = 'encouraging';
  if (isHopping) {
    mood = 'celebrating';
  } else if (todayCount >= 3) {
    mood = 'royal';
  } else if (completedToday) {
    mood = 'happy';
  } else if (streakState === 'frozen_saved') {
    mood = 'frozen';
  } else if (streakState === 'at_risk') {
    mood = 'at_risk';
  } else if (stepContext === 'choose-type' || stepContext === 'choose-genre' || stepContext === 'tonight') {
    mood = 'curious';
  }

  // Context-aware step-by-step coaching headline & message
  let headline = '';
  let message = '';

  if (tapCount > 0) {
    headline = `Folio says • ${completedToday ? `Day ${currentStreak} Lit!` : 'Bedside Pep Talk'}`;
    message = PEP_TALKS[(tapCount - 1) % PEP_TALKS.length];
  } else if (stepContext === 'tonight') {
    headline = completedToday
      ? `Day ${currentStreak} flame is burning bright!`
      : currentStreak > 0
      ? `Extend your ${currentStreak}-day streak to ${currentStreak + 1}!`
      : 'Your freshly dealt hand of four!';
    message =
      todayCount >= 3
        ? 'You already unlocked tonight’s Gold Bradbury Night! Enjoy a bonus read whenever you’re ready.'
        : completedToday
        ? `You’ve read ${todayCount} of 3 toward tonight’s Gold Bradbury Night. Pick another pillar or swap any slot!`
        : 'Tap any of the four cards below—or hit “Open One For Me”—to ignite tonight’s reading flame.';
  } else if (stepContext === 'choose-type') {
    headline = 'Step 1 of 2 • Pick your literary form';
    message = completedToday
      ? `Nice momentum! Choose another pillar to move closer to tonight’s Gold Bradbury Night (${Math.min(3, todayCount)}/3).`
      : 'Short on time? Poems take ~4–10 minutes and immediately light tonight’s streak!';
  } else if (stepContext === 'choose-genre') {
    headline = `Step 2 of 2 • Narrow down ${categoryLabel || 'your mood'}`;
    message =
      'Pick a tradition or place below—or tap “Surprise” at the top if you want me to choose for you!';
  } else if (stepContext === 'shelf') {
    headline = completedToday
      ? `${todayCount >= 3 ? 'Gold Night Complete!' : `${Math.min(3, todayCount)}/3 toward Gold Night`}`
      : 'Pick one work to light tonight’s lantern';
    message =
      'Tap any title to read in-app, or tap Listen to send the full text + analysis to ElevenReader.';
  } else if (stepContext === 'journal') {
    headline =
      currentStreak > 0
        ? `${currentStreak}-day streak • ${nextMilestone - currentStreak} days to your ${nextMilestone}-day milestone!`
        : 'Every great library starts with Night 1';
    message = `You have ${freezeTokens} Streak Freeze${
      freezeTokens === 1 ? '' : 's'
    } equipped to protect your streak if life ever gets busy.`;
  } else {
    // 'home'
    if (todayCount >= 3) {
      headline = `Gold Bradbury Night Unlocked! • ${currentStreak}-Day Streak`;
      message = `Bravo! You completed ${todayCount} works today and lit your ${currentStreak}-day flame.`;
    } else if (completedToday) {
      const rem = 3 - todayCount;
      headline = `Day ${currentStreak} Streak Lit! • ${todayCount}/3 Daily Ritual`;
      message = `Your streak is safe for today! Read ${rem} more ${
        rem === 1 ? 'work' : 'works'
      } tonight to unlock a Gold Bradbury Night.`;
    } else if (streakState === 'frozen_saved') {
      headline = `Phew! A Streak Freeze saved your ${currentStreak}-day streak!`;
      message = `You have ${freezeTokens} Freeze${
        freezeTokens === 1 ? '' : 's'
      } left. Read 1 work tonight to re-ignite your flame to Day ${currentStreak + 1}!`;
    } else if (streakState === 'at_risk') {
      headline = `Keep your ${currentStreak}-day streak alive tonight!`;
      message = `Your lantern isn’t lit yet today—finish 1 poem, story, or essay before midnight to reach Day ${
        currentStreak + 1
      }.`;
    } else if (streakState === 'broken') {
      headline = 'Welcome back to your bedside ritual!';
      message =
        'Streaks reset, but every work you’ve read stays in your ledger forever. Let’s spark Day 1 tonight!';
    } else {
      headline = 'Meet Folio • Ready to spark Night 1?';
      message =
        'Complete 1 work each day to build your streak, or 3 in a day for a Gold Bradbury Night. Tap me anytime!';
    }
  }

  // Daily 3-pip Bradbury ritual meter
  const dailyGoalPips = [1, 2, 3];

  return (
    <section
      className={`mascot-coach-banner state-${streakState} ${completedToday ? 'is-lit-today' : ''}`}
      id="mascot-coach-banner"
      aria-label="Folio streak coach"
    >
      <div className="mascot-coach-main">
        <FolioMascot
          mood={mood}
          lit={completedToday}
          size={showWeekStrip ? 82 : 68}
          interactive={true}
          onClick={handleMascotTap}
          className={isHopping ? 'tap-hop' : ''}
        />

        <div className="mascot-speech-bubble">
          <div className="mascot-speech-top">
            <span className="mascot-headline">
              {completedToday ? (
                <Flame size={15} className="inline-flame lit" />
              ) : streakState === 'frozen_saved' ? (
                <Snowflake size={15} className="inline-flame frozen" />
              ) : null}
              <span>{headline}</span>
            </span>

            <span
              className="daily-pips-pill"
              title="Today's 3-read Gold Bradbury Night progress"
              aria-label={`${Math.min(3, todayCount)} of 3 daily works read`}
            >
              {dailyGoalPips.map((n) => (
                <span
                  key={n}
                  className={`daily-pip ${todayCount >= n ? 'filled' : ''} ${
                    n === 3 && todayCount >= 3 ? 'gold' : ''
                  }`}
                />
              ))}
              <span className="daily-pips-label">{Math.min(3, todayCount)}/3 Today</span>
            </span>
          </div>

          <p className="mascot-message">{message}</p>

          {actionButton && <div className="mascot-action-slot">{actionButton}</div>}
        </div>
      </div>

      {showWeekStrip && (
        <div className="mascot-week-footer">
          <DuolingoWeekStrip weekDays={weekDays} />
        </div>
      )}
    </section>
  );
}
