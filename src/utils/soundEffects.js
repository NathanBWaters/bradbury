/**
 * Delightful Duolingo-Inspired Polyphonic Web Audio Sound Synthesizer
 *
 * Zero external audio files required — synthesizes warm marimba/bell/harp harmonics,
 * tactile wooden percussive transients, ember whooshes, and playful owl chirps
 * using the browser's native Web Audio API. Gracefully no-ops in headless/SSR or when muted.
 */

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Plays a warm bell/marimba-like musical tone with a soft overtone shimmer.
 */
function scheduleWarmNote(
  ctx,
  {
    freq,
    startTime,
    duration = 0.28,
    gain = 0.16,
    type = 'triangle',
    overtoneRatio = 2,
    overtoneGain = 0.045,
    glideToFreq = null
  }
) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, startTime);
  master.gain.linearRampToValueAtTime(gain, startTime + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (glideToFreq) {
    osc.frequency.exponentialRampToValueAtTime(glideToFreq, startTime + duration * 0.85);
  }
  osc.connect(master);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);

  if (overtoneGain > 0) {
    const overMaster = ctx.createGain();
    overMaster.gain.setValueAtTime(0.0001, startTime);
    overMaster.gain.linearRampToValueAtTime(overtoneGain, startTime + 0.008);
    overMaster.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.65);
    overMaster.connect(ctx.destination);

    const overOsc = ctx.createOscillator();
    overOsc.type = 'sine';
    overOsc.frequency.setValueAtTime(freq * overtoneRatio, startTime);
    overOsc.connect(overMaster);
    overOsc.start(startTime);
    overOsc.stop(startTime + duration * 0.7);
  }
}

/**
 * Soft filtered noise burst to evoke a warm flame "whoosh" when a daily streak ignites.
 */
function scheduleFlameWhoosh(ctx, startTime, duration = 0.26, peakGain = 0.07) {
  try {
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / sampleCount);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, startTime);
    filter.frequency.exponentialRampToValueAtTime(1450, startTime + duration);
    filter.Q.value = 1.8;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + duration * 0.35);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration + 0.02);
  } catch {
    // ignore if buffer creation fails
  }
}

/**
 * 1. Story / Poem / Essay Completed Chime (Duolingo "Check Complete" bright major triad + 9th)
 * Notes: C5 -> E5 -> G5 -> C6 (+ D6 sparkle)
 */
export function playStoryCompleteSound(enabled = true) {
  if (!enabled) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const t = ctx.currentTime + 0.01;
  scheduleWarmNote(ctx, { freq: 523.25, startTime: t, duration: 0.22, gain: 0.14 }); // C5
  scheduleWarmNote(ctx, { freq: 659.25, startTime: t + 0.075, duration: 0.24, gain: 0.15 }); // E5
  scheduleWarmNote(ctx, { freq: 783.99, startTime: t + 0.15, duration: 0.28, gain: 0.16 }); // G5
  scheduleWarmNote(ctx, {
    freq: 1046.5,
    startTime: t + 0.23,
    duration: 0.48,
    gain: 0.19,
    overtoneRatio: 2,
    overtoneGain: 0.06
  }); // C6
  scheduleWarmNote(ctx, {
    freq: 1174.66,
    startTime: t + 0.27,
    duration: 0.38,
    gain: 0.07,
    type: 'sine',
    overtoneGain: 0
  }); // D6 shimmer
  return true;
}

/**
 * 2. Daily Streak Ignited / Extended Fanfare! (Duolingo Flame Ignition + Rising F-Major Hero Cadence)
 * Notes: Flame Whoosh + F4 -> A4 -> C5 -> F5 -> G5 -> A5 (warm triumphant chord)
 */
export function playStreakExtendedSound(enabled = true) {
  if (!enabled) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const t = ctx.currentTime + 0.01;
  scheduleFlameWhoosh(ctx, t, 0.28, 0.08);

  const notes = [
    { freq: 349.23, offset: 0.04, dur: 0.2, gain: 0.14 }, // F4
    { freq: 440.0, offset: 0.12, dur: 0.22, gain: 0.15 }, // A4
    { freq: 523.25, offset: 0.2, dur: 0.24, gain: 0.16 }, // C5
    { freq: 698.46, offset: 0.29, dur: 0.32, gain: 0.18 }, // F5
    { freq: 880.0, offset: 0.4, dur: 0.62, gain: 0.2 } // A5 triumphant sustain
  ];
  for (const n of notes) {
    scheduleWarmNote(ctx, {
      freq: n.freq,
      startTime: t + n.offset,
      duration: n.dur,
      gain: n.gain,
      overtoneRatio: 2,
      overtoneGain: 0.05
    });
  }
  // Warm underlying F5 + C6 harmony on the final beat
  scheduleWarmNote(ctx, {
    freq: 523.25,
    startTime: t + 0.4,
    duration: 0.58,
    gain: 0.09,
    type: 'sine',
    overtoneGain: 0
  });
  scheduleWarmNote(ctx, {
    freq: 1046.5,
    startTime: t + 0.44,
    duration: 0.52,
    gain: 0.08,
    type: 'sine',
    overtoneGain: 0
  });
  return true;
}

/**
 * 3. Gold Bradbury Night / 4-Pillar Quartet Unlocked! (Rich Celestial Harp Cascade)
 */
export function playGoldNightSound(enabled = true) {
  if (!enabled) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const t = ctx.currentTime + 0.01;
  scheduleFlameWhoosh(ctx, t, 0.32, 0.07);

  // C Major 9th ascending harp glissando: C5, E5, G5, B5, D6, G6
  const harp = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
  harp.forEach((freq, idx) => {
    scheduleWarmNote(ctx, {
      freq,
      startTime: t + 0.05 + idx * 0.07,
      duration: 0.45 + idx * 0.06,
      gain: idx === harp.length - 1 ? 0.19 : 0.13,
      overtoneRatio: 2,
      overtoneGain: 0.045
    });
  });

  // Warm root chord anchor
  scheduleWarmNote(ctx, {
    freq: 261.63,
    startTime: t + 0.38,
    duration: 0.72,
    gain: 0.11,
    type: 'sine',
    overtoneGain: 0
  });
  return true;
}

/**
 * 4. Playful Owl Chirp ("Hoo-hoot!") when tapping Folio the Lantern Owl mascot!
 */
export function playMascotChirpSound(enabled = true) {
  if (!enabled) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const t = ctx.currentTime + 0.01;
  // Soft flute-like "hoo - hoot!"
  scheduleWarmNote(ctx, {
    freq: 587.33, // D5
    glideToFreq: 523.25, // C5
    startTime: t,
    duration: 0.13,
    gain: 0.13,
    type: 'sine',
    overtoneGain: 0.02
  });
  scheduleWarmNote(ctx, {
    freq: 659.25, // E5
    glideToFreq: 783.99, // G5 perk-up!
    startTime: t + 0.15,
    duration: 0.19,
    gain: 0.15,
    type: 'sine',
    overtoneGain: 0.03
  });
  return true;
}

/**
 * 5. Subtle tactile paper/marimba riffle when shuffling cards or advancing a funnel step
 */
export function playStepPopSound(enabled = true) {
  if (!enabled) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const t = ctx.currentTime + 0.005;
  scheduleWarmNote(ctx, {
    freq: 440,
    glideToFreq: 587.33,
    startTime: t,
    duration: 0.09,
    gain: 0.07,
    type: 'sine',
    overtoneGain: 0
  });
  return true;
}

/**
 * 6. Gentle soft pluck when unmarking a work
 */
export function playUndoSound(enabled = true) {
  if (!enabled) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const t = ctx.currentTime + 0.005;
  scheduleWarmNote(ctx, {
    freq: 392.0,
    glideToFreq: 293.66,
    startTime: t,
    duration: 0.14,
    gain: 0.08,
    type: 'sine',
    overtoneGain: 0
  });
  return true;
}
