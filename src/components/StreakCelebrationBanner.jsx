import React from 'react';
import { Flame, Award, Sparkles, ArrowRight } from 'lucide-react';

export default function StreakCelebrationBanner({
  streakStats,
  nextRecommendation,
  onJumpToRecommendation
}) {
  if (!streakStats || streakStats.totalCompleted === 0) return null;

  const isGoldUnlocked = streakStats.goldNights > 0 && streakStats.nextGoldProgress === 0;
  const stepsToNextGold = 3 - streakStats.nextGoldProgress;

  return (
    <div
      className={`streak-celebration-banner ${isGoldUnlocked ? 'gold-tier' : 'flame-tier'}`}
      id="streak-celebration-banner"
      role="status"
    >
      <div className="celebration-left">
        <div className="celebration-badge-icon">
          {isGoldUnlocked ? <Award size={18} /> : <Flame size={18} />}
        </div>
        <div className="celebration-copy">
          <div className="celebration-title">
            {isGoldUnlocked ? (
              <>
                Gold Bradbury Night #{streakStats.goldNights} Unlocked!
              </>
            ) : (
              <>
                Nightly Flame Lit! ({streakStats.nextGoldProgress}/3 toward Gold Night)
              </>
            )}
          </div>
          <div className="celebration-sub">
            {isGoldUnlocked
              ? `You’ve completed ${streakStats.totalCompleted} works and earned ${streakStats.goldNights} Gold Night(s) toward 1,000.`
              : `Read ${stepsToNextGold} more ${stepsToNextGold === 1 ? 'work' : 'works'} tonight to earn a Gold Bradbury Night!`}
          </div>
        </div>
      </div>

      {nextRecommendation && (
        <button
          type="button"
          id="up-next-recommendation-btn"
          className="celebration-next-btn"
          onClick={() => onJumpToRecommendation(nextRecommendation)}
        >
          <Sparkles size={13} />
          <span>Up Next: {nextRecommendation.categoryLabel}</span>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
