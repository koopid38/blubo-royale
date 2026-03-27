// Casino sound effects — all synthesized via Web Audio API, zero external files.

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Fundamental tone: frequency sweep from startFreq→endFreq over `dur` seconds.
function tone(startFreq, endFreq, type, gain, dur, when) {
  const c = getCtx();
  const t = when ?? c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(startFreq, 1), t);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + dur);
  }
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// White-noise burst.
function noise(gain, dur, when) {
  const c = getCtx();
  const t = when ?? c.currentTime;
  const size = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, size, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  src.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
}

// ── Public sound API ──────────────────────────────────────────────────────────

export const sfx = {
  // Generic UI button click
  click() {
    const c = getCtx(), now = c.currentTime;
    tone(900, 700, 'square', 0.05, 0.04, now);
  },

  // Bet chip placed — coin clink
  betPlace() {
    const c = getCtx(), now = c.currentTime;
    tone(1300, 950, 'triangle', 0.12, 0.06, now);
    tone(1900, 1300, 'triangle', 0.05, 0.04, now + 0.04);
  },

  // Card dealt — paper swipe + high tone
  cardDeal() {
    const c = getCtx(), now = c.currentTime;
    noise(0.07, 0.07, now);
    tone(1500, 500, 'triangle', 0.07, 0.09, now + 0.01);
  },

  // Blackjack (3:2) win — triumphant ascending run
  blackjackWin() {
    const c = getCtx(), now = c.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(f, f, 'sine', 0.18, 0.2, now + i * 0.09)
    );
  },

  // Generic win chime — three-note ascending
  win() {
    const c = getCtx(), now = c.currentTime;
    [440, 550, 660].forEach((f, i) => tone(f, f, 'sine', 0.16, 0.2, now + i * 0.1));
  },

  // Big win / jackpot — full fanfare
  bigWin() {
    const c = getCtx(), now = c.currentTime;
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone(f, f, 'sine', 0.2, 0.22, now + i * 0.1)
    );
    [659, 784, 988, 1319, 988, 1319, 1568].forEach((f, i) =>
      tone(f, f, 'sine', 0.08, 0.22, now + i * 0.1)
    );
  },

  // Generic loss — descending minor
  lose() {
    const c = getCtx(), now = c.currentTime;
    tone(330, 220, 'sawtooth', 0.1, 0.28, now);
    tone(220, 140, 'sawtooth', 0.08, 0.22, now + 0.24);
  },

  // Push / tie — neutral two-note
  push() {
    const c = getCtx(), now = c.currentTime;
    tone(440, 440, 'sine', 0.09, 0.14, now);
    tone(330, 330, 'sine', 0.07, 0.12, now + 0.18);
  },

  // Bust — dull thud
  bust() {
    const c = getCtx(), now = c.currentTime;
    tone(180, 80, 'square', 0.14, 0.28, now);
    noise(0.05, 0.12, now);
  },

  // ── Slots ────────────────────────────────────────────────────────────────────

  // Slot machine spinning — mechanical rattle
  slotSpin() {
    const c = getCtx(), now = c.currentTime;
    noise(0.08, 0.25, now);
    for (let i = 0; i < 5; i++) {
      tone(130 + i * 12, 90 + i * 8, 'square', 0.05, 0.07, now + i * 0.055);
    }
  },

  // Individual reel stopping — satisfying clunk
  reelStop() {
    const c = getCtx(), now = c.currentTime;
    tone(280, 180, 'square', 0.12, 0.08, now);
    noise(0.04, 0.05, now + 0.01);
  },

  // ── Roulette ─────────────────────────────────────────────────────────────────

  // Ball launched + rolling ticks for 3 seconds
  rouletteSpin() {
    const c = getCtx(), now = c.currentTime;
    // Initial launch whoosh
    tone(300, 150, 'sawtooth', 0.07, 0.3, now);
    // 28 ticks with gentle deceleration (evenly spaced, quick)
    for (let i = 0; i < 28; i++) {
      tone(900, 600, 'square', 0.035, 0.025, now + 0.1 + i * 0.104);
    }
    // Final landing thud
    tone(220, 100, 'triangle', 0.14, 0.18, now + 3.05);
  },

  // ── Plinko ────────────────────────────────────────────────────────────────────

  // Ball launched from the top
  plinkoLaunch() {
    const c = getCtx(), now = c.currentTime;
    tone(300, 700, 'sine', 0.09, 0.08, now);
    noise(0.04, 0.05, now);
  },

  // Peg hit tick (called periodically during fall)
  plinkoHit() {
    const c = getCtx(), now = c.currentTime;
    tone(700, 450, 'triangle', 0.04, 0.035, now);
  },

  // Ball lands in multiplier slot
  plinkoLand(multiplier) {
    const c = getCtx(), now = c.currentTime;
    // Always play a landing thud
    tone(220, 140, 'triangle', 0.09, 0.1, now);
    if (multiplier >= 8) {
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 'sine', 0.16, 0.22, now + i * 0.09));
    } else if (multiplier >= 4) {
      [523, 659, 784].forEach((f, i) => tone(f, f, 'sine', 0.14, 0.18, now + i * 0.09));
    } else if (multiplier >= 2) {
      [440, 550].forEach((f, i) => tone(f, f, 'sine', 0.11, 0.15, now + i * 0.09));
    } else if (multiplier === 0) {
      tone(120, 70, 'square', 0.1, 0.15, now);
    }
  },

  // ── Horse Racing ─────────────────────────────────────────────────────────────

  // Race starts — bugle-style fanfare
  raceStart() {
    const c = getCtx(), now = c.currentTime;
    [262, 392, 523, 659, 784, 1047].forEach((f, i) =>
      tone(f, f, 'sawtooth', 0.14, 0.13, now + i * 0.09)
    );
  },

  // Single gallop hoof beat
  horseGallop() {
    const c = getCtx(), now = c.currentTime;
    tone(130, 80, 'square', 0.07, 0.04, now);
    noise(0.025, 0.025, now + 0.015);
  },

  // ── Showdown ──────────────────────────────────────────────────────────────────

  // Countdown tick — deep, ominous
  showdownTick() {
    const c = getCtx(), now = c.currentTime;
    tone(110, 90, 'sine', 0.28, 0.18, now);
    noise(0.02, 0.08, now);
  },

  // Final countdown tick (last number) — louder + higher
  showdownTickFinal() {
    const c = getCtx(), now = c.currentTime;
    tone(220, 180, 'sine', 0.32, 0.22, now);
    tone(440, 330, 'triangle', 0.1, 0.2, now + 0.02);
    noise(0.03, 0.1, now);
  },

  // Wheel spinning starts — whoosh + deceleration clicks
  wheelSpin() {
    const c = getCtx(), now = c.currentTime;
    // Initial whoosh
    tone(80, 900, 'sawtooth', 0.1, 0.5, now);
    noise(0.07, 0.6, now);
    // Slowing click sequence in the last 2 seconds
    [0, 0.18, 0.4, 0.66, 0.96, 1.3, 1.68, 2.1, 2.56].forEach((dt, i) => {
      const f = 500 - i * 40;
      tone(f, f * 0.7, 'square', 0.06, 0.06, now + 3.5 + dt);
    });
  },

  // Winner announced — triumphant
  fanfare() {
    const c = getCtx(), now = c.currentTime;
    // Melody: short-short-short-long pattern (V for victory)
    const melody = [523, 523, 523, 659, 523, 659, 784];
    const durs =   [0.1,  0.1,  0.1,  0.16, 0.1, 0.16, 0.5];
    let t = now;
    melody.forEach((f, i) => {
      tone(f, f, 'sine', 0.2, durs[i], t);
      t += durs[i] + 0.02;
    });
    // Harmony layer
    const harmony = [659, 659, 659, 784, 659, 784, 988];
    t = now;
    harmony.forEach((f, i) => {
      tone(f, f, 'sine', 0.09, durs[i], t);
      t += durs[i] + 0.02;
    });
  },

  // ── Powerups ──────────────────────────────────────────────────────────────────

  // Powerup dropped — magical sparkle arpeggio
  powerupDrop() {
    const c = getCtx(), now = c.currentTime;
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) =>
      tone(f, f * 0.95, 'sine', 0.13, 0.14, now + i * 0.07)
    );
  },

  // Powerup activated — ascending power sweep
  powerupActivate() {
    const c = getCtx(), now = c.currentTime;
    tone(200, 1400, 'sine', 0.13, 0.35, now);
    tone(300, 2100, 'triangle', 0.06, 0.3, now + 0.04);
    noise(0.03, 0.2, now + 0.1);
  },

  // Player eliminated
  eliminate() {
    const c = getCtx(), now = c.currentTime;
    tone(440, 110, 'sawtooth', 0.14, 0.55, now);
    noise(0.04, 0.25, now + 0.1);
  },
};
