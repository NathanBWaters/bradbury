import React, { useEffect } from 'react';
import { Flame, Award, Sparkles, X } from 'lucide-react';
import { FolioMascot, DuolingoWeekStrip } from './FolioMascot.jsx';

// Deterministic radial burst vectors so particles explode symmetrically at 60fps
const PARTICLES = [
  { dx: '-130px', dy: '-145px', rot: '-35deg', color: '#F59E0B', delay: '0ms', size: 9 },
  { dx: '-85px', dy: '-175px', rot: '25deg', color: '#EA580C', delay: '35ms', size: 11 },
  { dx: '-25px', dy: '-190px', rot: '-15deg', color: '#FBBF24', delay: '20ms', size: 10 },
  { dx: '32px', dy: '-188px', rot: '40deg', color: '#F59E0B', delay: '45ms', size: 11 },
  { dx: '92px', dy: '-170px', rot: '-28deg', color: '#EA580C', delay: '15ms', size: 9 },
  { dx: '138px', dy: '-140px', rot: '50deg', color: '#FBBF24', delay: '55ms', size: 10 },
  { dx: '-160px', dy: '-75px', rot: '-60deg', color: '#10B981', delay: '40ms', size: 8 },
  { dx: '162px', dy: '-72px', rot: '65deg', color: '#10B981', delay: '25ms', size: 8 },
  { dx: '-115px', dy: '-105px', rot: '18deg', color: '#FB923C', delay: '70ms', size: 7 },
  { dx: '115px', dy: '-108px', rot: '-22deg', color: '#FB923C', delay: '65ms', size: 7 },
  { dx: '-58px', dy: '-132px', rot: '45deg', color: '#FDE047', delay: '80ms', size: 8 },
  { dx: '60px', dy: '-130px', rot: '-45deg', color: '#FDE047', delay: '75ms', size: 8 }
];

/**
 * Brilliant Duolingo-Inspired Celebration Stage & Confetti/Ember Burst
 * Non-blocking floating stage: outer container is `pointer-events: none` so the user can
 * either admire Folio's celebration & tap "Continue" OR keep tapping cards/navigation seamlessly.
 */
export default function StreakCelebrationOverlay({ celebration, streakStats, onDismiss }) {
  useEffect(() => {
    if (!celebration) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    const timer = setTimeout(() => {
      onDismiss();
    }, 4800);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [celebration, onDismiss]);

  if (!celebration) return null;

  const {
    kind = 'story_complete', // 'streak_extended' | 'gold_night' | 'story_complete'
    itemTitle = '',
    prevStreak = 0,
    newStreak = 1,
    todayCount = 1,
    goldNights = 0
  } = celebration;

  const isStreakIgnition = kind === 'streak_extended';
  const isGoldNight = kind === 'gold_night';

  let kicker = 'Work Completed';
  let headline = `Finished “${itemTitle}”!`;
  let subtitle = '';

  if (isGoldNight) {
    kicker = 'Gold Bradbury Night Unlocked';
    headline = `Gold Night #${Math.max(1, goldNights)} Complete!`;
    subtitle = `3 works completed today — your ${newStreak}-day flame & 1,000-Night Ledger shine in gold!`;
  } else if (isStreakIgnition) {
    kicker = newStreak === 1 ? 'Streak Ignited!' : 'Daily Streak Extended!';
    headline = `${newStreak}-Day Reading Streak!`;
    subtitle = `“${itemTitle}” lit tonight’s lantern! Read ${Math.max(
      1,
      3 - todayCount
    )} more tonight for a Gold Bradbury Night.`;
  } else {
    const remaining = 3 - todayCount;
    kicker = todayCount > 3 ? 'Bonus Nightly Read!' : `Daily Ritual • ${todayCount} of 3`;
    headline =
      remaining === 1
        ? 'Almost Gold! Just 1 Read Away!'
        : `Bravo! ${todayCount} Works Read Tonight!`;
    subtitle =
      remaining > 0
        ? `“${itemTitle}” is in your ledger — ${remaining} more ${
            remaining === 1 ? 'work unlocks' : 'works unlock'
          } tonight’s Gold Bradbury Night.`
        : `“${itemTitle}” added to an extraordinary ${todayCount}-work Bradbury evening!`;
  }

  return (
    <div
      className="duo-celebration-layer"
      key={celebration.id}
      aria-live="polite"
      role="status"
    >
      {/* Radial Confetti & Ember Burst */}
      <div className="duo-particles-origin" aria-hidden="true">
        {PARTICLES.map((p, idx) => (
          <span
            key={idx}
            className="duo-particle"
            style={{
              '--dx': p.dx,
              '--dy': p.dy,
              '--rot': p.rot,
              '--p-color': p.color,
              '--p-delay': p.delay,
              width: `${p.size}px`,
              height: `${p.size}px`
            }}
          />
        ))}
      </div>

      {/* Floating Celebration Stage Card */}
      <div
        className={`duo-celebration-card kind-${kind}`}
        id="duolingo-celebration-card"
      >
        <button
          type="button"
          className="duo-celebration-close"
          id="celebration-dismiss-btn"
          onClick={onDismiss}
          aria-label="Dismiss celebration"
        >
          <X size={15} />
        </button>

        <div className="duo-celebration-top">
          <div className="duo-celebration-mascot-col">
            <FolioMascot
              mood={isGoldNight ? 'royal' : 'celebrating'}
              lit={true}
              size={84}
            />
          </div>

          <div className="duo-celebration-copy">
            <div className="duo-celebration-kicker">
              {isGoldNight ? (
                <Award size={14} />
              ) : isStreakIgnition ? (
                <Flame size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              <span>{kicker}</span>
            </div>

            {isStreakIgnition ? (
              <div className="duo-streak-roll-row">
                <span className="duo-streak-old" aria-hidden="true">
                  {prevStreak}
                </span>
                <span className="duo-streak-arrow" aria-hidden="true">
                  →
                </span>
                <span className="duo-streak-new">{newStreak}</span>
                <span className="duo-streak-unit">
                  {newStreak === 1 ? 'Day Lit!' : 'Days!'}
                </span>
              </div>
            ) : (
              <h3 className="duo-celebration-title">{headline}</h3>
            )}

            <p className="duo-celebration-sub">{subtitle}</p>
          </div>
        </div>

        {(isStreakIgnition || isGoldNight) && streakStats?.weekDays && (
          <div className="duo-celebration-week">
            <DuolingoWeekStrip weekDays={streakStats.weekDays} compact={true} />
          </div>
        )}
      </div>
    </div>
  );
}
