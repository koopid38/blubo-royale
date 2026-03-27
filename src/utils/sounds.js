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

// ── Lobby Music Sequencer ─────────────────────────────────────────────────────
// Pixel retro casino loop — A minor, 132 BPM, 16-step (2 bars of 1/8 notes).

const LOBBY_BPM = 132;
const STEP_DUR = 60 / LOBBY_BPM / 2; // ~0.227s per 1/8-note

// Note frequencies
const N = {
  E2: 82.41,  F2: 87.31,  A2: 110.00,
  C3: 130.81, E3: 164.81, F3: 174.61,
  A3: 220.00, B3: 246.94,
  C4: 261.63, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 784.00, A5: 880.00,
};

// ── Composition ──
// Melody: A minor casino vibe — ascending then gracefully descending
const MEL = [
  N.A4, 0,    N.C5, N.E5, N.A5, 0,    N.G5, 0,
  N.F5, N.E5, 0,    N.D5, N.E5, 0,    N.C5, 0,
];
// Arpeggio fills (fast triangle chords): Am / Am / F / Em
const ARP = [
  N.A3, N.C4, N.E4, N.A4, N.C4, N.E4, N.C4, N.A3,
  N.F3, N.A3, N.C4, N.F4, N.A3, N.E4, N.B3, N.E3,
];
// Bass notes (hold for 4 steps each)
const BAS = [
  N.A2, 0, 0, 0, N.A2, 0, 0, 0,
  N.F2, 0, 0, 0, N.E2, 0, 0, 0,
];
const KICK  = new Set([0, 8]);
const SNARE = new Set([4, 12]);

// Master gain node (shared across all music oscillators)
let lobbyMaster = null;
function getLobbyMaster() {
  const c = getCtx();
  if (!lobbyMaster || lobbyMaster.context !== c) {
    lobbyMaster = c.createGain();
    lobbyMaster.gain.value = 0;
    lobbyMaster.connect(c.destination);
  }
  return lobbyMaster;
}

let lobbyRunning = false;
let lobbyTimer   = null;
let lobbyNextTime = 0;
let lobbyStepIdx  = 0;

function scheduleStep(when, si) {
  const c = getCtx();
  const m = getLobbyMaster();
  const s = si % 16;

  // Melody — square wave (classic chiptune)
  if (MEL[s]) {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'square';
    osc.frequency.value = MEL[s];
    osc.connect(g); g.connect(m);
    g.gain.setValueAtTime(0.065, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + STEP_DUR * 0.78);
    osc.start(when); osc.stop(when + STEP_DUR * 0.82);
  }

  // Arpeggio fills — triangle wave
  if (ARP[s]) {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = ARP[s];
    osc.connect(g); g.connect(m);
    g.gain.setValueAtTime(0.038, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + STEP_DUR * 0.58);
    osc.start(when); osc.stop(when + STEP_DUR * 0.62);
  }

  // Bass — triangle, sustains across the beat
  if (BAS[s]) {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = BAS[s];
    osc.connect(g); g.connect(m);
    g.gain.setValueAtTime(0.08, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + STEP_DUR * 3.6);
    osc.start(when); osc.stop(when + STEP_DUR * 4);
  }

  // Kick — sine sweep (punch) + noise click
  if (KICK.has(s)) {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, when);
    osc.frequency.exponentialRampToValueAtTime(50, when + 0.12);
    osc.connect(g); g.connect(m);
    g.gain.setValueAtTime(0.32, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    osc.start(when); osc.stop(when + 0.16);
    // Transient click
    const sz = Math.ceil(c.sampleRate * 0.06);
    const buf = c.createBuffer(1, sz, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / sz);
    const src = c.createBufferSource(), ng = c.createGain();
    src.buffer = buf; src.connect(ng); ng.connect(m);
    ng.gain.setValueAtTime(0.05, when);
    ng.gain.exponentialRampToValueAtTime(0.001, when + 0.055);
    src.start(when);
  }

  // Snare — shaped noise burst
  if (SNARE.has(s)) {
    const dur = 0.12;
    const sz = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, sz, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sz, 1.4);
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; src.connect(g); g.connect(m);
    g.gain.setValueAtTime(0.1, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.start(when);
  }

  // Hi-hat — highpass noise, every step
  {
    const dur = 0.028;
    const sz = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, sz, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'highpass'; filt.frequency.value = 7500;
    const g = c.createGain();
    src.connect(filt); filt.connect(g); g.connect(m);
    g.gain.setValueAtTime(0.02, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.start(when);
  }
}

function runLobbyScheduler() {
  if (!lobbyRunning) return;
  const c = getCtx();
  // Schedule all steps that fall within the next 150ms lookahead window
  while (lobbyNextTime < c.currentTime + 0.15) {
    scheduleStep(lobbyNextTime, lobbyStepIdx);
    lobbyStepIdx = (lobbyStepIdx + 1) % 16;
    lobbyNextTime += STEP_DUR;
  }
  lobbyTimer = setTimeout(runLobbyScheduler, 60);
}

function startLobbyMusic() {
  if (lobbyRunning) return;

  const doStart = () => {
    if (lobbyRunning) return;
    const c = getCtx();
    const m = getLobbyMaster();
    // Fade in over 1.5 s
    m.gain.cancelScheduledValues(c.currentTime);
    m.gain.setValueAtTime(0, c.currentTime);
    m.gain.linearRampToValueAtTime(0.9, c.currentTime + 1.5);
    lobbyRunning  = true;
    lobbyStepIdx  = 0;
    lobbyNextTime = c.currentTime + 0.05;
    runLobbyScheduler();
  };

  const c = getCtx();
  if (c.state === 'suspended') {
    // Try to resume now; also hook first user touch as a fallback
    c.resume().then(doStart).catch(() => {});
    document.addEventListener('pointerdown', function h() {
      document.removeEventListener('pointerdown', h);
      if (!lobbyRunning) c.resume().then(doStart).catch(() => {});
    }, { once: true });
  } else {
    doStart();
  }
}

function stopLobbyMusic() {
  if (!lobbyRunning) return;
  lobbyRunning = false;
  if (lobbyTimer) { clearTimeout(lobbyTimer); lobbyTimer = null; }
  // Fade out over 0.5 s
  const c = getCtx();
  const m = getLobbyMaster();
  m.gain.cancelScheduledValues(c.currentTime);
  m.gain.setValueAtTime(m.gain.value, c.currentTime);
  m.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
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

  // ── Lobby Background Music ─────────────────────────────────────────────────
  startLobbyMusic,
  stopLobbyMusic,
};
