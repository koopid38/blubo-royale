import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { GAME_CONFIG, GAME_PHASES, AI_PLAYERS, POWERUPS, POWERUP_DROP_RATES } from '../utils/constants';
import { simulateAIBet } from '../utils/gameLogic';
import { usePvP } from './usePvPSync';

const GameContext = createContext(null);

function createPlayer(id, name, isAI = false, aiConfig = null, iconIndex = 0) {
  return {
    id,
    name,
    isAI,
    aiConfig,
    bankroll: GAME_CONFIG.STARTING_BANKROLL,
    rebuysLeft: GAME_CONFIG.MAX_REBUYS,
    rebuysUsed: 0,
    eliminated: false,
    eliminatedAt: null,
    currentGame: null,
    powerups: [],
    activeEffects: [],
    lastBetTime: Date.now(),
    expression: aiConfig?.expression || 'happy',
    iconIndex: aiConfig?.iconIndex ?? iconIndex,
  };
}

const initialState = {
  phase: GAME_PHASES.LOBBY,
  players: [],
  humanPlayerId: null,
  minBet: GAME_CONFIG.STARTING_MIN_BET,
  matchTimer: 0,
  nextEscalation: GAME_CONFIG.BET_ESCALATION_INTERVAL,
  prizePool: 0,
  timeFrozen: false,
  timeFreezeEnd: 0,
  notifications: [],
  showRebuyprompt: false,
  midHand: false,
  screenShake: false,
  scrambled: false,
  scrambleEnd: 0,
  bankrollFrozen: false,
  bankrollFreezeEnd: 0,
  isPvP: false,
  pvpLobbyPlayers: [],
  pvpCountdown: null,
  pvpShowdownWinnerId: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_VS_AI': {
      const humanPlayer = createPlayer('human', action.playerName, false, null, action.iconIndex ?? 0);
      const aiPlayers = AI_PLAYERS.map(ai => createPlayer(ai.id, ai.name, true, ai));
      const players = [humanPlayer, ...aiPlayers];
      return {
        ...state,
        phase: GAME_PHASES.COUNTDOWN,
        players,
        humanPlayerId: 'human',
        prizePool: players.length * GAME_CONFIG.BUYIN_AMOUNT,
        minBet: GAME_CONFIG.STARTING_MIN_BET,
        matchTimer: 0,
        nextEscalation: GAME_CONFIG.BET_ESCALATION_INTERVAL,
      };
    }

    case 'UPDATE_BANKROLL': {
      const players = state.players.map(p =>
        p.id === action.playerId && !p.eliminated ? { ...p, bankroll: Math.max(0, p.bankroll + action.amount) } : p
      );
      return { ...state, players };
    }

    case 'SET_BANKROLL': {
      const players = state.players.map(p =>
        p.id === action.playerId ? { ...p, bankroll: action.amount } : p
      );
      return { ...state, players };
    }

    case 'RECORD_BET': {
      const players = state.players.map(p =>
        p.id === action.playerId ? { ...p, lastBetTime: Date.now() } : p
      );
      return { ...state, players };
    }

    case 'ESCALATE_BET': {
      const newMin = state.minBet * GAME_CONFIG.BET_MULTIPLIER;
      return {
        ...state,
        minBet: newMin,
        nextEscalation: GAME_CONFIG.BET_ESCALATION_INTERVAL,
        notifications: [...state.notifications, { id: Date.now(), text: `MIN BET NOW $${newMin}!`, type: 'warning' }],
      };
    }

    case 'TICK_TIMER': {
      return {
        ...state,
        matchTimer: state.matchTimer + action.delta,
        nextEscalation: state.timeFrozen ? state.nextEscalation : state.nextEscalation - action.delta,
      };
    }

    case 'ELIMINATE_PLAYER': {
      const alive = state.players.filter(p => !p.eliminated && p.id !== action.playerId);
      const players = state.players.map(p =>
        p.id === action.playerId ? { ...p, eliminated: true, eliminatedAt: Date.now(), expression: 'sad' } : p
      );

      // Check if only 2 players remain
      const alivePlayers = players.filter(p => !p.eliminated);
      const newPhase = alivePlayers.length <= 2 ? GAME_PHASES.SHOWDOWN : state.phase;

      return { ...state, players, phase: newPhase };
    }

    case 'REBUY': {
      const players = state.players.map(p =>
        p.id === action.playerId ? {
          ...p,
          bankroll: GAME_CONFIG.REBUY_BANKROLL,
          rebuysLeft: p.rebuysLeft - 1,
          rebuysUsed: p.rebuysUsed + 1,
        } : p
      );
      return {
        ...state,
        players,
        prizePool: state.prizePool + GAME_CONFIG.REBUY_COST,
        showRebuyprompt: false,
      };
    }

    case 'SHOW_REBUY_PROMPT':
      return { ...state, showRebuyprompt: action.show };

    case 'SET_MID_HAND':
      return { ...state, midHand: action.midHand };

    case 'ADD_POWERUP': {
      const players = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        if (p.powerups.length >= GAME_CONFIG.POWERUP_MAX_INVENTORY) return p;
        return { ...p, powerups: [...p.powerups, action.powerup] };
      });
      return { ...state, players };
    }

    case 'REMOVE_POWERUP': {
      const players = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        return { ...p, powerups: p.powerups.filter((_, i) => i !== action.index) };
      });
      return { ...state, players };
    }

    case 'ADD_EFFECT': {
      const players = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        return { ...p, activeEffects: [...p.activeEffects, { ...action.effect, expiresAt: Date.now() + (action.effect.duration || 0) }] };
      });
      return { ...state, players };
    }

    case 'CLEAR_EXPIRED_EFFECTS': {
      const now = Date.now();
      const players = state.players.map(p => ({
        ...p,
        activeEffects: p.activeEffects.filter(e => !e.expiresAt || e.expiresAt > now),
      }));
      return { ...state, players };
    }

    case 'SET_TIME_FREEZE':
      return { ...state, timeFrozen: action.frozen, timeFreezeEnd: action.frozen ? Date.now() + 30000 : 0 };

    case 'SET_SCRAMBLE':
      return { ...state, scrambled: action.scrambled, scrambleEnd: action.scrambled ? Date.now() + 15000 : 0 };

    case 'SET_BANKROLL_FREEZE':
      return { ...state, bankrollFrozen: action.frozen, bankrollFreezeEnd: action.frozen ? Date.now() + 15000 : 0 };

    case 'SCREEN_SHAKE':
      return { ...state, screenShake: true };

    case 'CLEAR_SHAKE':
      return { ...state, screenShake: false };

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications.slice(-4), { id: Date.now(), ...action.notification }] };

    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.id) };

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_EXPRESSION': {
      const players = state.players.map(p =>
        p.id === action.playerId ? { ...p, expression: action.expression } : p
      );
      return { ...state, players };
    }

    case 'RESET':
      return { ...initialState };

    // ---- PvP-specific actions ----
    case 'PVP_PLAYER_LIST':
      return { ...state, pvpLobbyPlayers: action.players };

    case 'START_PVP': {
      const allPlayers = action.players.map(p => createPlayer(p.id, p.name, false, null, p.iconIndex));
      return {
        ...state,
        phase: GAME_PHASES.COUNTDOWN,
        players: allPlayers,
        humanPlayerId: action.playerId,
        prizePool: allPlayers.length * GAME_CONFIG.BUYIN_AMOUNT,
        minBet: GAME_CONFIG.STARTING_MIN_BET,
        matchTimer: 0,
        nextEscalation: GAME_CONFIG.BET_ESCALATION_INTERVAL,
        isPvP: true,
        pvpLobbyPlayers: [],
      };
    }

    case 'PVP_COUNTDOWN':
      return { ...state, pvpCountdown: action.count };

    case 'SYNC_PVP_STATE': {
      const mergedPlayers = action.players.map(sp => {
        const local = state.players.find(p => p.id === sp.id);
        return {
          ...(local || createPlayer(sp.id, sp.name, false, null, sp.iconIndex)),
          bankroll: sp.bankroll,
          rebuysLeft: sp.rebuysLeft,
          rebuysUsed: sp.rebuysUsed,
          eliminated: sp.eliminated,
          eliminatedAt: sp.eliminatedAt,
          powerups: sp.powerups || [],
          activeEffects: sp.activeEffects || [],
          lastBetTime: sp.lastBetTime,
          name: sp.name,
          iconIndex: sp.iconIndex,
        };
      });
      return {
        ...state,
        players: mergedPlayers,
        minBet: action.minBet,
        matchTimer: action.matchTimer,
        nextEscalation: action.nextEscalation,
        prizePool: action.prizePool,
        timeFrozen: action.timeFrozen,
        timeFreezeEnd: action.timeFreezeEnd || 0,
      };
    }

    case 'PVP_PLAYER_ELIMINATED': {
      const players = state.players.map(p =>
        p.id === action.playerId ? { ...p, eliminated: true, eliminatedAt: Date.now() } : p
      );
      return { ...state, players };
    }

    case 'PVP_SHOWDOWN_RESULT':
      return { ...state, pvpShowdownWinnerId: action.winnerId };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const aiIntervals = useRef([]);
  const timerRef = useRef(null);
  const escalationRef = useRef(null);

  // AI behavior loop — skip in PvP mode
  useEffect(() => {
    if (state.isPvP) return;
    if (state.phase !== GAME_PHASES.PLAYING) {
      aiIntervals.current.forEach(clearInterval);
      aiIntervals.current = [];
      return;
    }

    const aiPlayers = state.players.filter(p => p.isAI && !p.eliminated);
    aiIntervals.current = aiPlayers.map(ai => {
      const cycle = GAME_CONFIG.AI_CYCLE_MIN + Math.random() * (GAME_CONFIG.AI_CYCLE_MAX - GAME_CONFIG.AI_CYCLE_MIN);
      return setInterval(() => {
        const currentAI = state.players.find(p => p.id === ai.id);
        if (!currentAI || currentAI.eliminated || currentAI.bankroll < state.minBet) return;

        const { payout } = simulateAIBet(state.minBet, currentAI.bankroll, currentAI.aiConfig.style);
        dispatch({ type: 'UPDATE_BANKROLL', playerId: ai.id, amount: payout });
        dispatch({ type: 'RECORD_BET', playerId: ai.id });

        // Check for powerup drop
        const rank = getPlayerRank(state.players, ai.id);
        const totalAlive = state.players.filter(p => !p.eliminated).length;
        const powerup = rollForPowerupLocal(rank, totalAlive);
        if (powerup && currentAI.powerups.length < GAME_CONFIG.POWERUP_MAX_INVENTORY) {
          dispatch({ type: 'ADD_POWERUP', playerId: ai.id, powerup });
          // AI auto-uses attack powerups
          if (powerup.type === 'attack' && currentAI.aiConfig.style === 'calculated') {
            // Target the leader
            const leader = state.players.filter(p => !p.eliminated && p.id !== ai.id)
              .sort((a, b) => b.bankroll - a.bankroll)[0];
            if (leader) {
              handleAIPowerup(ai.id, powerup, leader.id, dispatch, state);
            }
          }
        }
      }, cycle);
    });

    return () => {
      aiIntervals.current.forEach(clearInterval);
      aiIntervals.current = [];
    };
  }, [state.phase, state.isPvP, state.players.filter(p => !p.eliminated).length]);

  // Main game timer — skip in PvP mode (server owns the timer)
  useEffect(() => {
    if (state.isPvP) return;
    if (state.phase !== GAME_PHASES.PLAYING) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      dispatch({ type: 'TICK_TIMER', delta: 1000 });

      // Check bet escalation
      if (state.nextEscalation <= 1000 && !state.timeFrozen) {
        dispatch({ type: 'ESCALATE_BET' });
      }

      // Check eliminations for AI
      state.players.forEach(p => {
        if (p.eliminated || p.id === state.humanPlayerId) return;
        if (p.bankroll < state.minBet) {
          if (p.isAI) {
            const shouldRebuy = p.rebuysLeft > 0 && (
              p.aiConfig.rebuyPolicy === 'always' ||
              (p.aiConfig.rebuyPolicy === 'once' && p.rebuysUsed < 1) ||
              (p.aiConfig.rebuyPolicy === 'twice' && p.rebuysUsed < 2)
            );
            if (shouldRebuy) {
              dispatch({ type: 'REBUY', playerId: p.id });
            } else {
              dispatch({ type: 'ELIMINATE_PLAYER', playerId: p.id });
            }
          }
        }
      });

      // Check human player (but not while mid-hand in Blackjack)
      const human = state.players.find(p => p.id === state.humanPlayerId);
      if (human && !human.eliminated && human.bankroll < state.minBet && !state.showRebuyprompt && !state.midHand) {
        dispatch({ type: 'SHOW_REBUY_PROMPT', show: true });
      }

      // Idle drain: human bankroll drains if not betting
      if (human && !human.eliminated && !state.bankrollFrozen) {
        const idleMs = Date.now() - human.lastBetTime;
        if (idleMs > GAME_CONFIG.INACTIVITY_TIMEOUT) {
          const idleBeyondGrace = Math.floor((idleMs - GAME_CONFIG.INACTIVITY_TIMEOUT) / 1000);
          const drainRate = GAME_CONFIG.INACTIVITY_DRAIN_RATE * (1 + Math.floor(idleBeyondGrace / 10));
          dispatch({ type: 'UPDATE_BANKROLL', playerId: human.id, amount: -drainRate });
          // Notify once when drain kicks in
          if (idleBeyondGrace < 1) {
            dispatch({ type: 'ADD_NOTIFICATION', notification: { text: 'IDLE DRAIN STARTED!', type: 'warning' } });
          }
        }
      }

      // Clear expired effects
      dispatch({ type: 'CLEAR_EXPIRED_EFFECTS' });

      // Time freeze check
      if (state.timeFrozen && Date.now() > state.timeFreezeEnd) {
        dispatch({ type: 'SET_TIME_FREEZE', frozen: false });
      }

      // Scramble check
      if (state.scrambled && Date.now() > state.scrambleEnd) {
        dispatch({ type: 'SET_SCRAMBLE', scrambled: false });
      }

      // Bankroll freeze check
      if (state.bankrollFrozen && Date.now() > state.bankrollFreezeEnd) {
        dispatch({ type: 'SET_BANKROLL_FREEZE', frozen: false });
      }

      // Check showdown condition
      const alive = state.players.filter(p => !p.eliminated);
      if (alive.length <= 2 && state.phase === GAME_PHASES.PLAYING) {
        dispatch({ type: 'SET_PHASE', phase: GAME_PHASES.SHOWDOWN });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [state.phase, state.minBet, state.nextEscalation, state.timeFrozen, state.showRebuyprompt, state.midHand]);

  const checkPowerupDrop = useCallback(() => {
    // Use ref to always read current state, preventing stale closures when
    // multiple balls/games resolve simultaneously (e.g. Plinko DROP 10)
    const current = stateRef.current;
    const player = current.players.find(p => p.id === current.humanPlayerId);
    if (!player || player.eliminated || player.powerups.length >= GAME_CONFIG.POWERUP_MAX_INVENTORY) return null;

    const rank = getPlayerRank(current.players, player.id);
    const totalAlive = current.players.filter(p => !p.eliminated).length;
    const powerup = rollForPowerupLocal(rank, totalAlive);
    if (powerup) {
      dispatch({ type: 'ADD_POWERUP', playerId: player.id, powerup });
      // In PvP, notify server about the drop
      if (pvpRef.current && current.isPvP) {
        pvpRef.current.sendPowerupDrop(powerup);
      }
      return powerup;
    }
    return null;
  }, []);

  // PvP integration: register dispatch with PvP sync, create dispatch proxy
  const pvp = usePvP();
  const pvpRef = useRef(pvp);
  pvpRef.current = pvp;

  useEffect(() => {
    if (pvp?.registerDispatch) {
      pvp.registerDispatch(dispatch, state);
    }
  }, [pvp?.registerDispatch, state]);

  // Dispatch proxy: in PvP, forward relevant actions to server
  const pvpDispatch = useCallback((action) => {
    dispatch(action); // local state update for instant feedback

    const current = stateRef.current;
    const pvpSync = pvpRef.current;
    if (!current.isPvP || !pvpSync) return;

    // Forward own bankroll changes to server
    if (action.type === 'UPDATE_BANKROLL' && action.playerId === current.humanPlayerId) {
      pvpSync.sendBetResult(action.amount);
    }
    if (action.type === 'RECORD_BET' && action.playerId === current.humanPlayerId) {
      pvpSync.sendRecordBet();
    }
    if (action.type === 'REBUY' && action.playerId === current.humanPlayerId) {
      pvpSync.sendRebuy();
    }
  }, []);

  const activeDispatch = state.isPvP ? pvpDispatch : dispatch;

  const value = { state, dispatch: activeDispatch, checkPowerupDrop };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

function getPlayerRank(players, playerId) {
  const alive = players.filter(p => !p.eliminated).sort((a, b) => b.bankroll - a.bankroll);
  return alive.findIndex(p => p.id === playerId) + 1;
}

function rollForPowerupLocal(rank, totalPlayers) {
  const tier = rank <= Math.ceil(totalPlayers * 0.3) ? 'top' :
    rank <= Math.ceil(totalPlayers * 0.6) ? 'mid' : 'bottom';

  const { rate, weights } = POWERUP_DROP_RATES[tier];
  if (Math.random() > rate) return null;

  const rarityRoll = Math.random();
  let rarity;
  if (rarityRoll < weights.common) rarity = 'common';
  else if (rarityRoll < weights.common + weights.rare) rarity = 'rare';
  else rarity = 'epic';

  const available = Object.values(POWERUPS).filter(p => p.rarity === rarity);
  return available[Math.floor(Math.random() * available.length)];
}

function handleAIPowerup(aiId, powerup, targetId, dispatch, state) {
  dispatch({ type: 'REMOVE_POWERUP', playerId: aiId, index: 0 });
  applyPowerup(powerup, aiId, targetId, dispatch, state);
}

export function applyPowerup(powerup, userId, targetId, dispatch, state) {
  switch (powerup.id) {
    case 'lucky_streak':
      dispatch({ type: 'ADD_EFFECT', playerId: userId, effect: { id: 'lucky_streak', name: 'Lucky Streak', type: 'buff', betsRemaining: 3 } });
      break;
    case 'double_down_shield':
      dispatch({ type: 'ADD_EFFECT', playerId: userId, effect: { id: 'double_down_shield', name: 'DD Shield', type: 'buff' } });
      break;
    case 'blubos_blessing': {
      const bonus = Math.floor(state.minBet * 0.25);
      dispatch({ type: 'UPDATE_BANKROLL', playerId: userId, amount: bonus });
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: `+$${bonus} Blubo's Blessing!`, type: 'success' } });
      break;
    }
    case 'hot_hand':
      dispatch({ type: 'ADD_EFFECT', playerId: userId, effect: { id: 'hot_hand', name: 'Hot Hand', type: 'buff', duration: 60000 } });
      break;
    case 'time_freeze':
      dispatch({ type: 'SET_TIME_FREEZE', frozen: true });
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: 'TIME FROZEN!', type: 'info' } });
      break;
    case 'jinx':
      dispatch({ type: 'ADD_EFFECT', playerId: targetId, effect: { id: 'jinx', name: 'Jinx', type: 'debuff', betsRemaining: 1 } });
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: `Jinxed ${state.players.find(p => p.id === targetId)?.name}!`, type: 'attack' } });
      break;
    case 'chip_swipe': {
      const target = state.players.find(p => p.id === targetId);
      const amount = Math.min(Math.floor(target.bankroll * 0.1), 500);
      dispatch({ type: 'UPDATE_BANKROLL', playerId: targetId, amount: -amount });
      dispatch({ type: 'UPDATE_BANKROLL', playerId: userId, amount });
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: `Stole $${amount}!`, type: 'attack' } });
      break;
    }
    case 'screen_scramble':
      if (targetId === state.humanPlayerId) {
        dispatch({ type: 'SET_SCRAMBLE', scrambled: true });
      }
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: `Scrambled ${state.players.find(p => p.id === targetId)?.name}!`, type: 'attack' } });
      break;
    case 'bankroll_freeze':
      if (targetId === state.humanPlayerId) {
        dispatch({ type: 'SET_BANKROLL_FREEZE', frozen: true });
      }
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: `Froze ${state.players.find(p => p.id === targetId)?.name}'s bankroll!`, type: 'attack' } });
      break;
    case 'blubos_wrath':
      dispatch({ type: 'ADD_EFFECT', playerId: targetId, effect: { id: 'blubos_wrath', name: "Blubo's Wrath", type: 'debuff', betsRemaining: 1 } });
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: `Blubo's Wrath on ${state.players.find(p => p.id === targetId)?.name}!`, type: 'attack' } });
      break;
  }
}
