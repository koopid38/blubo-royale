// Auto-detect WebSocket URL: same host in production, localhost:3001 in dev
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const SERVER_URL = import.meta.env.VITE_WS_SERVER ||
  (isLocal ? 'ws://localhost:3001' : `${wsProtocol}//${window.location.host}`);

export const GAME_CONFIG = {
  STARTING_BANKROLL: 1000,
  STARTING_MIN_BET: 10,
  BET_ESCALATION_INTERVAL: 60000, // 1 minute in ms
  BET_MULTIPLIER: 2,
  INACTIVITY_TIMEOUT: 30000, // 30 seconds
  INACTIVITY_DRAIN_RATE: 5, // $ per second base
  MAX_REBUYS: 3,
  REBUY_COST: 10,
  REBUY_BANKROLL: 1000,
  REBUY_MAX_MIN_BET: 320,
  MAX_PLAYERS: 10,
  BUYIN_AMOUNT: 10,
  POWERUP_MAX_INVENTORY: 2,
  AI_CYCLE_MIN: 3000,
  AI_CYCLE_MAX: 8000,
};

export const GAME_PHASES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  SHOWDOWN: 'showdown',
  RESULTS: 'results',
};

export const CASINO_GAMES = {
  BLACKJACK: 'blackjack',
  SLOTS: 'slots',
  ROULETTE: 'roulette',
  PLINKO: 'plinko',
  HORSES: 'horses',
};

export const AI_PLAYERS = [
  { id: 'ai-1', name: 'High Roller Hank', style: 'aggressive', preferredGame: 'roulette', betRange: [0.3, 0.5], rebuyPolicy: 'always', expression: 'angry', iconIndex: 1 },
  { id: 'ai-2', name: 'Cautious Carl', style: 'conservative', preferredGame: 'blackjack', betRange: [1.0, 1.0], rebuyPolicy: 'once', expression: 'neutral', iconIndex: 5 },
  { id: 'ai-3', name: 'Slot Queen Sally', style: 'slots-addict', preferredGame: 'slots', betRange: [1.0, 2.0], rebuyPolicy: 'always', expression: 'excited', iconIndex: 3 },
  { id: 'ai-4', name: 'Lucky Lucy', style: 'balanced', preferredGame: null, betRange: [1.0, 3.0], rebuyPolicy: 'always', expression: 'happy', iconIndex: 4 },
  { id: 'ai-5', name: 'Bluff Master Boris', style: 'erratic', preferredGame: null, betRange: [0.5, 5.0], rebuyPolicy: 'twice', expression: 'angry', iconIndex: 6 },
  { id: 'ai-6', name: 'Plinko Pete', style: 'plinko-fan', preferredGame: 'plinko', betRange: [1.0, 2.0], rebuyPolicy: 'always', expression: 'excited', iconIndex: 9 },
  { id: 'ai-7', name: 'Shark Shelly', style: 'calculated', preferredGame: 'blackjack', betRange: [1.5, 3.0], rebuyPolicy: 'twice', expression: 'neutral', iconIndex: 7 },
  { id: 'ai-8', name: 'Newbie Nate', style: 'timid', preferredGame: 'blackjack', betRange: [1.0, 1.2], rebuyPolicy: 'never', expression: 'sad', iconIndex: 10 },
  { id: 'ai-9', name: 'Whale Wendy', style: 'big-spender', preferredGame: 'roulette', betRange: [0.2, 0.6], rebuyPolicy: 'always', expression: 'happy', iconIndex: 8 },
];

export const POWERUPS = {
  // Boost (self-targeting)
  LUCKY_STREAK: { id: 'lucky_streak', name: 'Lucky Streak', rarity: 'common', type: 'boost', icon: '🍀', description: 'Next 3 bets have +20% win chance' },
  DOUBLE_DOWN_SHIELD: { id: 'double_down_shield', name: 'DD Shield', rarity: 'common', type: 'boost', icon: '🛡️', description: 'Next loss refunded (one-time)' },
  BLUBOS_BLESSING: { id: 'blubos_blessing', name: "Blubo's Blessing", rarity: 'rare', type: 'boost', icon: '✨', description: '+25% of min bet to bankroll' },
  HOT_HAND: { id: 'hot_hand', name: 'Hot Hand', rarity: 'rare', type: 'boost', icon: '🔥', description: 'Double winnings for 60 seconds' },
  TIME_FREEZE: { id: 'time_freeze', name: 'Time Freeze', rarity: 'epic', type: 'boost', icon: '❄️', description: 'Pause min bet timer 30 seconds' },
  // Attack (target another player)
  JINX: { id: 'jinx', name: 'Jinx', rarity: 'common', type: 'attack', icon: '👁️', description: "Target's next bet -20% win chance" },
  CHIP_SWIPE: { id: 'chip_swipe', name: 'Chip Swipe', rarity: 'rare', type: 'attack', icon: '💰', description: 'Steal 10% of target bankroll (max $500)' },
  SCREEN_SCRAMBLE: { id: 'screen_scramble', name: 'Scramble', rarity: 'rare', type: 'attack', icon: '📺', description: "Scramble target's screen 15s" },
  BANKROLL_FREEZE: { id: 'bankroll_freeze', name: 'Bankroll Freeze', rarity: 'epic', type: 'attack', icon: '🧊', description: 'Target cannot bet for 15s' },
  BLUBOS_WRATH: { id: 'blubos_wrath', name: "Blubo's Wrath", rarity: 'epic', type: 'attack', icon: '⚡', description: "Target's next loss is doubled" },
};

export const POWERUP_DROP_RATES = {
  top: { rate: 0.10, weights: { common: 0.7, rare: 0.25, epic: 0.05 } },
  mid: { rate: 0.20, weights: { common: 0.5, rare: 0.35, epic: 0.15 } },
  bottom: { rate: 0.30, weights: { common: 0.3, rare: 0.4, epic: 0.3 } },
};

export const SLOT_SYMBOLS = ['🎲', '🎰', '💎', '7️⃣', '🍒', '⭐', '🃏'];
export const SLOT_PAYOUTS = {
  '🎲🎲🎲': 10,
  '💎💎💎': 8,
  '7️⃣7️⃣7️⃣': 5,
  '⭐⭐⭐': 4,
  '🎰🎰🎰': 3,
  '🍒🍒🍒': 2,
  '🃏🃏🃏': 1.5,
};

export const ROULETTE_NUMBERS = [
  { num: 0, color: 'green' },
  { num: 1, color: 'red' }, { num: 2, color: 'black' }, { num: 3, color: 'red' },
  { num: 4, color: 'black' }, { num: 5, color: 'red' }, { num: 6, color: 'black' },
  { num: 7, color: 'red' }, { num: 8, color: 'black' }, { num: 9, color: 'red' },
  { num: 10, color: 'black' }, { num: 11, color: 'black' }, { num: 12, color: 'red' },
  { num: 13, color: 'black' }, { num: 14, color: 'red' }, { num: 15, color: 'black' },
  { num: 16, color: 'red' }, { num: 17, color: 'black' }, { num: 18, color: 'red' },
  { num: 19, color: 'red' }, { num: 20, color: 'black' }, { num: 21, color: 'red' },
  { num: 22, color: 'black' }, { num: 23, color: 'red' }, { num: 24, color: 'black' },
  { num: 25, color: 'red' }, { num: 26, color: 'black' }, { num: 27, color: 'red' },
  { num: 28, color: 'black' }, { num: 29, color: 'black' }, { num: 30, color: 'red' },
  { num: 31, color: 'black' }, { num: 32, color: 'red' }, { num: 33, color: 'black' },
  { num: 34, color: 'red' }, { num: 35, color: 'black' }, { num: 36, color: 'red' },
];

// Multipliers — center slots raised so near-center hits are closer to break-even
export const PLINKO_MULTIPLIERS = [8, 4, 2, 1.2, 1.0, 0.8, 0.6, 0.5, 0.6, 0.8, 1.0, 1.2, 2, 4, 8];

export const HORSES = [
  { id: 0, name: 'Thunder', color: '#ff4444', odds: 2.0 },
  { id: 1, name: 'Lightning', color: '#ffd700', odds: 3.0 },
  { id: 2, name: 'Shadow', color: '#b44fff', odds: 4.0 },
  { id: 3, name: 'Comet', color: '#00bfff', odds: 5.0 },
  { id: 4, name: 'Blaze', color: '#ff8c00', odds: 7.0 },
  { id: 5, name: 'Phantom', color: '#b8d767', odds: 10.0 },
];

export const BLUBO_EXPRESSIONS = {
  happy: { eyes: '◠ ◠', mouth: '‿' },
  excited: { eyes: '★ ★', mouth: 'D' },
  angry: { eyes: '▼ ▼', mouth: '︵' },
  sad: { eyes: '╥ ╥', mouth: '﹏' },
  neutral: { eyes: '● ●', mouth: '—' },
  worried: { eyes: '⊙ ⊙', mouth: '～' },
};
