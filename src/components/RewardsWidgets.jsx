import React, { useEffect, useState } from 'react';
import {
  Flame,
  BookOpen,
  Zap,
  Award,
  Gem,
  Target,
  Feather,
  ScrollText,
  PenLine,
  MapPin,
  Moon,
  Sunrise,
  Gift,
  Check,
  Clock,
  Trophy,
  CalendarDays
} from 'lucide-react';
import { formatCountdown } from '../utils/rewardsEngine.js';

const ICONS = {
  flame: Flame,
  book: BookOpen,
  zap: Zap,
  award: Award,
  gem: Gem,
  target: Target,
  feather: Feather,
  scroll: ScrollText,
  pen: PenLine,
  map: MapPin,
  moon: Moon,
  sunrise: Sunrise
};

export function RewardIcon({ name, size = 16 }) {
  const Icon = ICONS[name] || Award;
  return <Icon size={size} />;
}

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

function useMidnightCountdown() {
  const [ms, setMs] = useState(msUntilMidnight);
  useEffect(() => {
    const timer = setInterval(() => setMs(msUntilMidnight()), 30000);
    return () => clearInterval(timer);
  }, []);
  return ms;
}

function ProgressBar({ value, max, tone = 'flame' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`reward-bar tone-${tone}`} aria-hidden="true">
      <div className="reward-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Level badge + XP bar toward the next literary rank. */
export function LevelMeter({ rewards, compact = false }) {
  return (
    <div className={`level-meter ${compact ? 'compact' : ''}`} id="level-meter">
      <div className="level-badge" aria-hidden="true">
        <span>{rewards.level}</span>
      </div>
      <div className="level-meter-body">
        <div className="level-meter-top">
          <strong>
            Level {rewards.level} • {rewards.title}
          </strong>
          <span>
            {rewards.xpIntoLevel} / {rewards.xpForNextLevel} XP
          </span>
        </div>
        <ProgressBar value={rewards.xpIntoLevel} max={rewards.xpForNextLevel} tone="gold" />
        {!compact && (
          <div className="level-meter-note">
            {rewards.xpToNextLevel} XP to Level {rewards.level + 1} • {rewards.nextTitle}
          </div>
        )}
      </div>
    </div>
  );
}

/** Home card: three daily quests, a bonus chest and the midnight countdown. */
export function DailyQuestsCard({ rewards, streakStats }) {
  const ms = useMidnightCountdown();
  const countdown = formatCountdown(ms);
  const atRisk = !streakStats.completedToday && streakStats.currentStreak > 0;
  const allDone = rewards.chestOpenedToday;

  return (
    <section
      className={`daily-quests-card ${allDone ? 'is-complete' : ''}`}
      id="daily-quests-card"
      aria-label="Daily quests"
    >
      <div className="daily-quests-head">
        <div>
          <h2 className="daily-quests-title">
            <Target size={16} />
            <span>Daily Quests</span>
            <span className="daily-quests-count">
              {rewards.questsDoneToday}/{rewards.quests.length}
            </span>
          </h2>
          <p className={`daily-quests-timer ${atRisk ? 'urgent' : ''}`}>
            <Clock size={12} />
            <span>
              {atRisk
                ? `${countdown} left to save your ${streakStats.currentStreak}-day streak`
                : allDone
                ? `All done! New quests in ${countdown}`
                : `New quests in ${countdown}`}
            </span>
          </p>
        </div>
        <div className="today-xp-chip" title="XP earned today">
          <Zap size={13} fill="currentColor" />
          <span>{rewards.todayXp} XP today</span>
        </div>
      </div>

      <ul className="quest-list">
        {rewards.quests.map((quest) => (
          <li key={quest.id} className={`quest-row ${quest.done ? 'done' : ''}`}>
            <span className="quest-check" aria-hidden="true">
              {quest.done ? <Check size={13} strokeWidth={3} /> : null}
            </span>
            <div className="quest-body">
              <div className="quest-top">
                <span className="quest-title">{quest.title}</span>
                <span className="quest-reward">+{quest.rewardXp} XP</span>
              </div>
              <div className="quest-progress-row">
                <ProgressBar
                  value={quest.progress}
                  max={quest.target}
                  tone={quest.done ? 'success' : 'flame'}
                />
                <span className="quest-progress-num">
                  {quest.progress}/{quest.target}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className={`quest-chest-row ${allDone ? 'opened' : ''}`}>
        <span className="quest-chest-icon" aria-hidden="true">
          <Gift size={17} />
        </span>
        <span>
          {allDone
            ? `Lantern Chest opened — +${rewards.chestBonusXp} bonus XP banked!`
            : `Finish all 3 to open tonight’s Lantern Chest (+${rewards.chestBonusXp} XP)`}
        </span>
      </div>

      <LevelMeter rewards={rewards} compact={true} />
    </section>
  );
}

/** Ledger panel: level, monthly challenge and the tiered achievement shelf. */
export function TrophyCase({ rewards }) {
  const { monthly, achievements } = rewards;
  return (
    <section className="trophy-case" id="trophy-case" aria-label="Level and achievements">
      <div className="trophy-level-card">
        <LevelMeter rewards={rewards} />
        <div className="trophy-xp-total">
          <Zap size={14} fill="currentColor" />
          <span>{rewards.totalXp.toLocaleString()} total XP</span>
        </div>
      </div>

      <div className={`monthly-challenge-card ${monthly.done ? 'done' : ''}`} id="monthly-challenge">
        <div className="monthly-top">
          <strong>
            <CalendarDays size={15} />
            <span>{monthly.name}</span>
          </strong>
          <span>
            {monthly.done
              ? 'Badge earned!'
              : `${monthly.daysLeft} day${monthly.daysLeft === 1 ? '' : 's'} left`}
          </span>
        </div>
        <ProgressBar value={monthly.progress} max={monthly.target} tone="gold" />
        <div className="monthly-note">
          {monthly.progress} / {monthly.target} daily quests this month
          {monthly.badgesEarned > 0
            ? ` • ${monthly.badgesEarned} monthly badge${monthly.badgesEarned === 1 ? '' : 's'} won`
            : ''}
        </div>
      </div>

      <h2 className="genre-section-subheading">
        <Trophy size={14} /> Achievements ({rewards.achievementLevels} /{' '}
        {rewards.achievementLevelsMax})
      </h2>
      <div className="achievement-grid">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`achievement-tile ${a.level > 0 ? 'earned' : 'locked'} ${
              a.maxed ? 'maxed' : ''
            }`}
          >
            <div className="achievement-medal" aria-hidden="true">
              <RewardIcon name={a.icon} size={19} />
              {a.level > 0 && <span className="achievement-level">{a.level}</span>}
            </div>
            <div className="achievement-body">
              <div className="achievement-name">{a.name}</div>
              <ProgressBar value={a.progress} max={1} tone={a.maxed ? 'success' : 'gold'} />
              <div className="achievement-note">
                {a.maxed
                  ? `Maxed • ${a.value.toLocaleString()} ${a.unit}`
                  : `${a.value.toLocaleString()} / ${a.nextTarget.toLocaleString()} ${a.unit}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
