import { useState, useEffect } from 'react';
import { useGame } from '../../hooks/useGameState';
import { usePvP } from '../../hooks/usePvPSync';
import { CASINO_GAMES, GAME_CONFIG } from '../../utils/constants';
import Blackjack from '../Games/Blackjack';
import Slots from '../Games/Slots';
import Roulette from '../Games/Roulette';
import Plinko from '../Games/Plinko';
import Horses from '../Games/Horses';
import Leaderboard from '../Leaderboard/Leaderboard';
import PowerupInventory from '../Powerups/PowerupInventory';
import PowerupGuide from '../Powerups/PowerupGuide';
import BluboAvatar from '../UI/BluboAvatar';
import FloatingPlus from '../UI/FloatingPlus';
import ScrambleOverlay from '../UI/ScrambleOverlay';

const GAME_TABS = [
  { id: CASINO_GAMES.BLACKJACK, label: 'BLACKJACK', icon: '🃏' },
  { id: CASINO_GAMES.SLOTS, label: 'SLOTS', icon: '🎰' },
  { id: CASINO_GAMES.ROULETTE, label: 'ROULETTE', icon: '🎡' },
  { id: CASINO_GAMES.PLINKO, label: 'PLINKO', icon: '📌' },
  { id: CASINO_GAMES.HORSES, label: 'HORSES', icon: '🏇' },
];

export default function CasinoFloor() {
  const { state, dispatch } = useGame();
  const pvp = usePvP();
  const [activeGame, setActiveGame] = useState(CASINO_GAMES.BLACKJACK);
  const [showPowerupGuide, setShowPowerupGuide] = useState(false);
  const player = state.players.find(p => p.id === state.humanPlayerId);

  const timeToEscalation = Math.max(0, Math.ceil(state.nextEscalation / 1000));
  const isWarning = timeToEscalation <= 30;

  // Notifications auto-dismiss
  useEffect(() => {
    if (state.notifications.length > 0) {
      const timer = setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', id: state.notifications[0]?.id });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notifications]);

  const renderGame = () => {
    switch (activeGame) {
      case CASINO_GAMES.BLACKJACK: return <Blackjack />;
      case CASINO_GAMES.SLOTS: return <Slots />;
      case CASINO_GAMES.ROULETTE: return <Roulette />;
      case CASINO_GAMES.PLINKO: return <Plinko />;
      case CASINO_GAMES.HORSES: return <Horses />;
      default: return <Blackjack />;
    }
  };

  if (!player) return null;

  // Human eliminated while game is still ongoing — show finishing position
  if (player.eliminated && state.phase === 'playing') {
    const alive = state.players.filter(p => !p.eliminated).sort((a, b) => b.bankroll - a.bankroll);
    const eliminated = state.players.filter(p => p.eliminated).sort((a, b) => (b.eliminatedAt || 0) - (a.eliminatedAt || 0));
    const rankings = [...alive, ...eliminated];
    const finishPosition = rankings.findIndex(p => p.id === player.id) + 1;
    const totalPlayers = state.players.length;
    const medal = finishPosition === 1 ? '🥇' : finishPosition === 2 ? '🥈' : finishPosition === 3 ? '🥉' : null;

    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <FloatingPlus />
        <div className="game-panel p-8 text-center neon-glow-strong z-10" style={{ maxWidth: 320 }}>
          <BluboAvatar iconIndex={player?.iconIndex ?? 0} size={70} className="mx-auto mb-4" />
          <div className="text-sm mb-1" style={{ color: '#ff4444' }}>ELIMINATED!</div>
          <div className="text-[8px] text-gray-400 mb-6">Better luck next time</div>
          <div className="mb-2 text-[7px] text-gray-400">YOU FINISHED</div>
          <div className="text-2xl mb-1" style={{ color: '#00bfff' }}>
            {medal && <span className="mr-2">{medal}</span>}#{finishPosition}
          </div>
          <div className="text-[8px] text-gray-500 mb-6">out of {totalPlayers} players</div>
          <button
            className="game-btn game-btn-red text-[9px] px-6 py-3"
            onClick={() => dispatch({ type: 'RESET' })}
          >
            BACK TO LOBBY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen grid-bg flex flex-col ${state.screenShake ? 'screen-shake' : ''} ${state.scrambled ? 'screen-scramble' : ''}`}>
      {showPowerupGuide && <PowerupGuide onClose={() => setShowPowerupGuide(false)} />}

      {/* Screen scramble symbol overlay */}
      {state.scrambled && <ScrambleOverlay />}

      {/* Bankroll frozen ice overlay */}
      {state.bankrollFrozen && (
        <div
          className="fixed inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,191,255,0.08) 0%, rgba(0,120,200,0.18) 60%, rgba(0,60,140,0.32) 100%)',
            boxShadow: 'inset 0 0 80px rgba(0,191,255,0.25)',
            border: '3px solid rgba(0,191,255,0.35)',
          }}
        />
      )}
      <FloatingPlus />

      {/* Top bar */}
      <div className="game-panel flex items-center justify-between px-4 py-2 z-20 relative">
        {/* Left: Timer + Min Bet */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[6px] text-gray-400">MATCH TIME</div>
            <div className="text-[9px]" style={{ color: '#00bfff' }}>
              {Math.floor(state.matchTimer / 60000)}:{String(Math.floor((state.matchTimer % 60000) / 1000)).padStart(2, '0')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[6px] text-gray-400">MIN BET</div>
            <div className="text-[9px]" style={{ color: '#b8d767' }}>${state.minBet}</div>
          </div>
          <div className="text-center">
            <div className="text-[6px] text-gray-400">NEXT ↑</div>
            <div className={`text-[9px] ${isWarning ? 'pulse-red' : ''}`}
              style={{ color: isWarning ? '#ff4444' : '#888' }}>
              {Math.floor(timeToEscalation / 60)}:{String(timeToEscalation % 60).padStart(2, '0')}
              {state.timeFrozen && <span className="ml-1" style={{ color: '#00bfff' }}>❄️</span>}
            </div>
          </div>
        </div>

        {/* Center: Player info */}
        <div className="flex items-center gap-3">
          <BluboAvatar iconIndex={player.iconIndex} size={28} glow={false} />
          <div>
            <div className="text-[7px] text-gray-400">{player.name}</div>
            <div className={`text-sm ${player.bankroll < state.minBet ? 'pulse-red' : 'neon-text-green'}`}
              style={{ color: player.bankroll < state.minBet ? '#ff4444' : '#b8d767' }}>
              ${player.bankroll.toLocaleString()}
            </div>
          </div>
          {/* Re-buy hearts — hidden once min bet makes rebuys unavailable */}
          {state.minBet < GAME_CONFIG.REBUY_MAX_MIN_BET && (
            <div className="flex gap-0.5">
              {[...Array(GAME_CONFIG.MAX_REBUYS)].map((_, i) => (
                <span key={i} className="text-xs" style={{ color: i < player.rebuysLeft ? '#ff4444' : '#333' }}>♥</span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Powerups */}
        <PowerupInventory onShowGuide={() => setShowPowerupGuide(true)} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game area */}
        <div className="flex-1 flex flex-col">
          {/* Game tabs */}
          <div className="flex gap-1 px-4 pt-3">
            {GAME_TABS.map(tab => (
              <button
                key={tab.id}
                className={`game-tab ${activeGame === tab.id ? 'active' : ''}`}
                onClick={() => setActiveGame(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Active game */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-2">
            {state.bankrollFrozen && (
              <div className="text-center py-2">
                <div className="text-sm" style={{ color: '#00bfff' }}>🧊 BANKROLL FROZEN 🧊</div>
                <div className="text-[8px] text-gray-400 mt-1">You cannot place bets!</div>
              </div>
            )}
            {renderGame()}
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <div className="w-64 border-l border-gray-800 overflow-hidden">
          <Leaderboard />
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {state.notifications.map(n => (
          <div
            key={n.id}
            className="slide-in-right game-panel px-4 py-2 text-[9px] text-center"
            style={{
              borderColor: n.type === 'attack' ? '#ff4444' : n.type === 'success' ? '#b8d767' : n.type === 'warning' ? '#ffa500' : '#00bfff',
              color: n.type === 'attack' ? '#ff4444' : n.type === 'success' ? '#b8d767' : n.type === 'warning' ? '#ffa500' : '#00bfff',
            }}
          >
            {n.text}
          </div>
        ))}
      </div>

      {/* Rebuy prompt */}
      {state.showRebuyprompt && player.rebuysLeft > 0 && state.minBet < GAME_CONFIG.REBUY_MAX_MIN_BET && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="game-panel p-8 text-center neon-glow-strong">
            <BluboAvatar iconIndex={player.iconIndex} size={60} className="mx-auto mb-4" />
            <div className="text-sm mb-2" style={{ color: '#ff4444' }}>YOU'RE BROKE!</div>
            <div className="text-[8px] text-gray-400 mb-4">
              Bankroll below minimum bet (${state.minBet})
            </div>
            <div className="text-[8px] text-gray-400 mb-4">
              Re-buys remaining: {player.rebuysLeft}/{GAME_CONFIG.MAX_REBUYS}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                className="game-btn game-btn-green text-[9px] px-6 py-3"
                onClick={() => dispatch({ type: 'REBUY', playerId: player.id })}
              >
                RE-BUY (1,000)
              </button>
              <button
                className="game-btn game-btn-red text-[9px] px-6 py-3"
                onClick={() => {
                  dispatch({ type: 'SHOW_REBUY_PROMPT', show: false });
                  if (state.isPvP && pvp) {
                    pvp.sendDeclineRebuy();
                  } else {
                    dispatch({ type: 'ELIMINATE_PLAYER', playerId: player.id });
                  }
                }}
              >
                CASH OUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No rebuys left or min bet too high */}
      {state.showRebuyprompt && (player.rebuysLeft <= 0 || state.minBet >= GAME_CONFIG.REBUY_MAX_MIN_BET) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="game-panel p-8 text-center neon-glow-strong">
            <BluboAvatar iconIndex={player.iconIndex} size={60} className="mx-auto mb-4" />
            <div className="text-sm mb-2" style={{ color: '#ff4444' }}>ELIMINATED!</div>
            <div className="text-[8px] text-gray-400 mb-4">
              Re-Buys not available
            </div>
            <button
              className="game-btn game-btn-red text-[9px] px-6 py-3"
              onClick={() => {
                dispatch({ type: 'SHOW_REBUY_PROMPT', show: false });
                if (state.isPvP && pvp) {
                  pvp.sendDeclineRebuy();
                } else {
                  dispatch({ type: 'ELIMINATE_PLAYER', playerId: player.id });
                }
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
