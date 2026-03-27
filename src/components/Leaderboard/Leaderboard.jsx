import { useGame } from '../../hooks/useGameState';
import BluboAvatar from '../UI/BluboAvatar';
import { CASINO_GAMES, GAME_CONFIG } from '../../utils/constants';
import luckyLogicLogo from '../../assets/Lucky_Logic.png';

const gameIcons = {
  [CASINO_GAMES.BLACKJACK]: '🃏',
  [CASINO_GAMES.SLOTS]: '🎰',
  [CASINO_GAMES.ROULETTE]: '🎡',
  [CASINO_GAMES.PLINKO]: '📌',
};

export default function Leaderboard() {
  const { state } = useGame();
  const alive = state.players
    .filter(p => !p.eliminated)
    .sort((a, b) => b.bankroll - a.bankroll);
  const eliminated = state.players
    .filter(p => p.eliminated)
    .sort((a, b) => (b.eliminatedAt || 0) - (a.eliminatedAt || 0));

  const first = Math.floor(state.prizePool * 0.7);
  const second = state.prizePool - first;

  return (
    <div className="game-panel p-3 h-full flex flex-col" style={{ minWidth: 240 }}>
      <div className="text-[9px] text-center mb-2" style={{ color: '#00bfff' }}>
        LEADERBOARD
      </div>

      <div className="overflow-y-auto">
      {alive.map((player, idx) => {
        const isHuman = player.id === state.humanPlayerId;
        const hasDebuff = player.activeEffects.some(e => e.type === 'debuff');
        const hasBuff = player.activeEffects.some(e => e.type === 'buff');

        return (
          <div
            key={player.id}
            className={`flex items-center gap-2 p-1.5 mb-1 rounded ${isHuman ? 'pulse-glow' : ''}`}
            style={{
              background: isHuman ? 'rgba(0, 191, 255, 0.1)' : 'transparent',
              border: isHuman ? '1px solid rgba(0, 191, 255, 0.3)' : '1px solid transparent',
            }}
          >
            {/* Rank */}
            <div className="text-[9px] w-4 text-center" style={{ color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#666' }}>
              {idx + 1}
            </div>

            {/* Avatar */}
            <BluboAvatar
              iconIndex={player.iconIndex}
              size={26}
              glow={false}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[8px] truncate" style={{ color: isHuman ? '#00bfff' : '#ccc' }}>
                {player.name}
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] ${player.bankroll < state.minBet ? 'pulse-red' : ''}`}
                  style={{ color: player.bankroll < state.minBet * 2 ? '#ff4444' : '#b8d767' }}>
                  ${player.bankroll.toLocaleString()}
                </span>
                {hasBuff && <span className="text-[7px]" style={{ color: '#b8d767' }}>▲</span>}
                {hasDebuff && <span className="text-[7px]" style={{ color: '#ff4444' }}>▼</span>}
              </div>
            </div>

            {/* Re-buys as hearts — hidden once rebuys unavailable */}
            {state.minBet < GAME_CONFIG.REBUY_MAX_MIN_BET && (
              <div className="flex gap-0.5">
                {[...Array(player.rebuysLeft)].map((_, i) => (
                  <span key={i} className="text-[7px]" style={{ color: '#ff4444' }}>♥</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Eliminated */}
      {eliminated.length > 0 && (
        <>
          <div className="text-[7px] text-gray-600 text-center mt-2 mb-1">ELIMINATED</div>
          {eliminated.map((player, idx) => (
            <div key={player.id} className="flex items-center gap-2 p-1 mb-0.5 opacity-40">
              <div className="text-[7px] w-4 text-center text-gray-600">
                {alive.length + idx + 1}
              </div>
              <BluboAvatar iconIndex={player.iconIndex} size={18} glow={false} />
              <div className="text-[7px] text-gray-600 truncate flex-1">
                {player.name}
              </div>
            </div>
          ))}
        </>
      )}
      </div>

      {/* Prize breakdown — fills remaining space */}
      <div className="flex-1 flex flex-col mt-2 pt-4 border-t border-gray-800">
        <div className="text-[12px] text-center mb-5 neon-text" style={{ color: '#00bfff', letterSpacing: '0.2em' }}>PRIZES</div>
        {/* Total pool */}
        <div className="flex flex-col items-center gap-1 rounded-lg py-3 mx-2 mb-4" style={{ background: 'rgba(184,215,103,0.08)', border: '1px solid rgba(184,215,103,0.3)' }}>
          <div className="text-[8px] text-gray-400" style={{ letterSpacing: '0.1em' }}>TOTAL POOL</div>
          <div className="text-[22px] font-bold" style={{ color: '#b8d767' }}>${state.prizePool.toLocaleString()}</div>
        </div>
        {/* 1st and 2nd place */}
        <div className="flex gap-3 px-2">
          <div className="flex-1 flex flex-col items-center gap-1 rounded-lg py-3" style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.25)' }}>
            <div className="text-[8px]" style={{ color: '#ffd700', letterSpacing: '0.1em' }}>1ST</div>
            <div className="text-[15px] font-bold" style={{ color: '#ffd700' }}>${first.toLocaleString()}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1 rounded-lg py-3" style={{ background: 'rgba(192,192,192,0.07)', border: '1px solid rgba(192,192,192,0.25)' }}>
            <div className="text-[8px]" style={{ color: '#c0c0c0', letterSpacing: '0.1em' }}>2ND</div>
            <div className="text-[15px] font-bold" style={{ color: '#c0c0c0' }}>${second.toLocaleString()}</div>
          </div>
        </div>
        {/* Lucky Logic branding — centered in remaining space */}
        <div className="flex-1 flex items-center justify-center">
          <img src={luckyLogicLogo} alt="Lucky Logic" className="opacity-40 pointer-events-none" style={{ width: 120 }} />
        </div>
      </div>
    </div>
  );
}
