import { SLOT_SYMBOLS, SLOT_PAYOUTS, ROULETTE_NUMBERS, PLINKO_MULTIPLIERS } from './constants';

// ---- Deck / Card utilities ----
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: cardValue(rank), color: suit === '♥' || suit === '♦' ? 'red' : 'white' });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank);
}

export function handValue(cards) {
  let total = cards.reduce((sum, c) => sum + c.value, 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

// ---- Blackjack game ----
export function dealBlackjack(deck) {
  const d = [...deck];
  const playerCards = [d.pop(), d.pop()];
  const dealerCards = [d.pop(), d.pop()];
  return { playerCards, dealerCards, deck: d };
}

export function resolveBlackjack(playerCards, dealerCards, bet) {
  const pv = handValue(playerCards);
  const dv = handValue(dealerCards);
  const pBJ = isBlackjack(playerCards);
  const dBJ = isBlackjack(dealerCards);

  if (pBJ && dBJ) return { result: 'push', payout: 0 };
  if (pBJ) return { result: 'blackjack', payout: Math.floor(bet * 1.5) };
  if (dBJ) return { result: 'lose', payout: -bet };
  if (pv > 21) return { result: 'bust', payout: -bet };
  if (dv > 21) return { result: 'win', payout: bet };
  if (pv > dv) return { result: 'win', payout: bet };
  if (pv < dv) return { result: 'lose', payout: -bet };
  return { result: 'push', payout: 0 };
}

// ---- Slots ----
// Weighted reel: common symbols appear more often for better hit frequency
const WEIGHTED_REEL = [
  '🍒','🍒','🍒','🍒','🍒','🍒',  // 6x — most common (2x payout)
  '🃏','🃏','🃏','🃏',              // 4x (1.5x payout)
  '🎰','🎰','🎰',                    // 3x (3x payout)
  '⭐','⭐','⭐',                    // 3x (4x payout)
  '7️⃣','7️⃣',                       // 2x (5x payout)
  '💎',                              // 1x (8x payout)
  '🎲',                              // 1x (10x payout)
];

export function spinSlots() {
  const reels = [
    WEIGHTED_REEL[Math.floor(Math.random() * WEIGHTED_REEL.length)],
    WEIGHTED_REEL[Math.floor(Math.random() * WEIGHTED_REEL.length)],
    WEIGHTED_REEL[Math.floor(Math.random() * WEIGHTED_REEL.length)],
  ];
  const key = reels.join('');
  const multiplier = SLOT_PAYOUTS[key] || 0;

  if (multiplier > 0) return { reels, multiplier, isWin: true, isPair: false };

  // 2-of-a-kind: return the bet (net 0)
  const isPair = reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2];
  return { reels, multiplier: 0, isWin: false, isPair };
}

// ---- Roulette ----
export function spinRoulette() {
  const idx = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
  return ROULETTE_NUMBERS[idx];
}

export function resolveRouletteBets(bets, result) {
  let totalPayout = 0;
  for (const bet of bets) {
    const won = checkRouletteBet(bet, result);
    if (won) {
      totalPayout += bet.amount * bet.multiplier;
    } else {
      totalPayout -= bet.amount;
    }
  }
  return totalPayout;
}

function checkRouletteBet(bet, result) {
  switch (bet.type) {
    case 'red': return result.color === 'red';
    case 'black': return result.color === 'black';
    case 'odd': return result.num > 0 && result.num % 2 === 1;
    case 'even': return result.num > 0 && result.num % 2 === 0;
    case 'number': return result.num === bet.number;
    case '1-12': return result.num >= 1 && result.num <= 12;
    case '13-24': return result.num >= 13 && result.num <= 24;
    case '25-36': return result.num >= 25 && result.num <= 36;
    default: return false;
  }
}

// ---- Plinko ----
// Simulates a ball dropping through 16 rows of pegs with slight center bias for house edge.
// Returns fine-grained path steps for smooth animation.
export function dropPlinko(rows = 16) {
  const numSlots = PLINKO_MULTIPLIERS.length;
  const center = (numSlots - 1) / 2;
  // Start with small random offset from center
  let pos = center + (Math.random() - 0.5) * 1.5;
  const path = [];
  const stepsPerRow = 4; // sub-steps for smooth animation

  for (let row = 0; row < rows; row++) {
    // At each peg, ball bounces left or right with slight center bias (53/47)
    const bias = pos > center ? 0.47 : pos < center ? 0.53 : 0.5;
    const direction = Math.random() < bias ? 0.5 : -0.5;
    // Add some physics wobble
    const wobble = (Math.random() - 0.5) * 0.15;
    const targetPos = Math.max(0, Math.min(numSlots - 1, pos + direction + wobble));

    // Interpolate sub-steps for smooth motion
    for (let s = 0; s < stepsPerRow; s++) {
      const t = (s + 1) / stepsPerRow;
      const interpX = pos + (targetPos - pos) * t;
      const interpY = (row + t) / rows;
      path.push({ x: interpX, y: interpY });
    }
    pos = targetPos;
  }

  const slot = Math.round(Math.max(0, Math.min(numSlots - 1, pos)));
  const multiplier = PLINKO_MULTIPLIERS[slot];
  return { path, slot, multiplier };
}

// ---- Horse Racing ----
// 1. Winner is chosen upfront using inverse-odds probability weighting.
// 2. Each horse's finish time is derived from its odds (favourite = faster).
// 3. Winner is guaranteed to have the shortest finish time.
// 4. Paths are smooth ease-out curves with noise for realism.
export function simulateHorseRace(horses) {
  const TRACK_LENGTH = 100;
  const BASE_TICKS = 65;

  // Pick winner: probability proportional to 1/odds
  const weights = horses.map(h => 1 / h.odds);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let winner = 0;
  for (let i = 0; i < horses.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { winner = i; break; }
  }

  // Assign a finish tick to each horse.
  // Higher odds → higher base tick (longer to finish → visually slower).
  const finishTicks = horses.map(h =>
    BASE_TICKS * (0.75 + h.odds * 0.05) + (Math.random() - 0.5) * 12
  );

  // Guarantee winner has the lowest finish tick
  const minOther = Math.min(...finishTicks.filter((_, i) => i !== winner));
  if (finishTicks[winner] >= minOther) {
    finishTicks[winner] = minOther - 2 - Math.random() * 6;
  }
  finishTicks[winner] = Math.max(45, finishTicks[winner]);

  const totalTicks = Math.ceil(Math.max(...finishTicks)) + 3;

  // Build smooth paths using an ease-out curve + positional noise
  const positions = horses.map((_, i) => {
    const ft = finishTicks[i];
    return Array.from({ length: totalTicks + 1 }, (__, t) => {
      if (t >= ft) return TRACK_LENGTH;
      const progress = t / ft;
      // ease-out: fast start, gradual approach to finish
      const base = TRACK_LENGTH * (1 - Math.pow(1 - progress, 1.8));
      const noise = (Math.random() - 0.5) * 4 * Math.sin(progress * Math.PI);
      return Math.max(0, Math.min(TRACK_LENGTH - 0.1, base + noise));
    });
  });

  return { positions, winner, totalFrames: totalTicks + 1 };
}

// ---- AI game simulation ----
export function simulateAIBet(minBet, bankroll, style) {
  let betAmount;
  const betRangeMultiplier = style === 'aggressive' ? [3, 5] :
    style === 'big-spender' ? [2, 6] :
    style === 'erratic' ? [1, 8] :
    style === 'timid' ? [1, 1.2] :
    style === 'conservative' ? [1, 1] :
    [1, 3];

  betAmount = Math.floor(minBet * (betRangeMultiplier[0] + Math.random() * (betRangeMultiplier[1] - betRangeMultiplier[0])));
  betAmount = Math.min(betAmount, bankroll);
  betAmount = Math.max(betAmount, minBet);

  // Simulate game outcome: roughly 45% win rate for house edge
  const roll = Math.random();
  let payout;
  if (roll < 0.42) {
    // Win (1x-3x bet)
    payout = Math.floor(betAmount * (1 + Math.random() * 2));
  } else if (roll < 0.47) {
    // Big win
    payout = Math.floor(betAmount * (3 + Math.random() * 5));
  } else {
    // Lose
    payout = -betAmount;
  }

  return { betAmount, payout };
}

// ---- Powerup logic ----
export function rollForPowerup(playerRank, totalPlayers) {
  const { POWERUP_DROP_RATES, POWERUPS } = require('./constants');
  const tier = playerRank <= Math.ceil(totalPlayers * 0.3) ? 'top' :
    playerRank <= Math.ceil(totalPlayers * 0.6) ? 'mid' : 'bottom';

  const { rate, weights } = POWERUP_DROP_RATES[tier];
  if (Math.random() > rate) return null;

  // Pick rarity
  const rarityRoll = Math.random();
  let rarity;
  if (rarityRoll < weights.common) rarity = 'common';
  else if (rarityRoll < weights.common + weights.rare) rarity = 'rare';
  else rarity = 'epic';

  // Pick random powerup of that rarity
  const available = Object.values(POWERUPS).filter(p => p.rarity === rarity);
  return available[Math.floor(Math.random() * available.length)];
}
