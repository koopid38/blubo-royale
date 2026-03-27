import { useGame } from '../../hooks/useGameState';
import BluboAvatar from '../UI/BluboAvatar';
import FloatingPlus from '../UI/FloatingPlus';

function PodiumSlot({ player, rank, prize, isHuman, delay }) {
  const heights = { 1: 100, 2: 72, 3: 52 };
  const colors = {
    1: { border: '#ffd700', bg: 'rgba(255,215,0,0.08)', text: '#ffd700', label: '1ST' },
    2: { border: '#c0c0c0', bg: 'rgba(192,192,192,0.06)', text: '#c0c0c0', label: '2ND' },
    3: { border: '#cd7f32', bg: 'rgba(205,127,50,0.06)', text: '#cd7f32', label: '3RD' },
  };
  const c = colors[rank];
  const avatarSize = rank === 1 ? 64 : 50;

  return (
    <div
      className="flex flex-col items-center gap-1 fade-up"
      style={{ animationDelay: `${delay}ms`, flex: 1 }}
    >
      {/* Avatar + name above podium */}
      <div className="flex flex-col items-center gap-1 mb-1">
        {rank === 1 && (
          <div className="text-2xl crown-drop" style={{ animationDelay: `${delay + 200}ms` }}>👑</div>
        )}
        <div style={{ position: 'relative' }}>
          <BluboAvatar
            iconIndex={player.iconIndex}
            size={avatarSize}
            glow={rank === 1}
          />
          {isHuman && (
            <div
              className="absolute -top-1 -right-1 text-[5px] px-1 rounded"
              style={{ background: '#00bfff', color: '#000', fontFamily: 'Press Start 2P' }}
            >
              YOU
            </div>
          )}
        </div>
        <div
          className="text-[7px] text-center max-w-[80px] truncate"
          style={{ color: isHuman ? '#00bfff' : c.text }}
        >
          {player.name}
        </div>
        {prize != null && (
          <div className="text-[9px] font-bold" style={{ color: '#b8d767' }}>
            ${prize.toLocaleString()}
          </div>
        )}
      </div>

      {/* Podium block */}
      <div
        className="w-full flex items-center justify-center rounded-t-md"
        style={{
          height: heights[rank],
          background: c.bg,
          border: `2px solid ${c.border}`,
          borderBottom: 'none',
          boxShadow: `0 0 12px ${c.border}44`,
        }}
      >
        <div className="text-[18px] font-bold" style={{ color: c.text, fontFamily: 'Press Start 2P' }}>
          {rank === 1 ? '1' : rank === 2 ? '2' : '3'}
        </div>
      </div>
    </div>
  );
}

export default function Results() {
  const { state, dispatch } = useGame();

  const alive = state.players.filter(p => !p.eliminated).sort((a, b) => b.bankroll - a.bankroll);
  const eliminated = state.players.filter(p => p.eliminated).sort((a, b) => (b.eliminatedAt || 0) - (a.eliminatedAt || 0));
  const rankings = [...alive, ...eliminated];

  const firstPrize = Math.floor(state.prizePool * 0.7);
  const secondPrize = state.prizePool - firstPrize;

  const top3 = [rankings[1], rankings[0], rankings[2]]; // 2nd, 1st, 3rd for podium layout
  const prizes = { 0: secondPrize, 1: firstPrize, 2: null };
  const podiumRanks = { 0: 2, 1: 1, 2: 3 };

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <FloatingPlus />

      <div className="z-10 w-full max-w-lg px-4 flex flex-col gap-6">

        {/* Title */}
        <div className="text-center fade-up" style={{ animationDelay: '0ms' }}>
          <div
            className="text-3xl title-flicker mb-1"
            style={{ color: '#ffd700', letterSpacing: '0.15em' }}
          >
            GAME OVER
          </div>
          <div className="text-[8px] text-gray-500 tracking-widest">FINAL STANDINGS</div>
        </div>

        {/* Podium */}
        <div className="flex items-end gap-2 px-2" style={{ minHeight: 220 }}>
          {top3.map((player, i) => player ? (
            <PodiumSlot
              key={player.id}
              player={player}
              rank={podiumRanks[i]}
              prize={prizes[i]}
              isHuman={player.id === state.humanPlayerId}
              delay={200 + i * 120}
            />
          ) : (
            <div key={i} style={{ flex: 1 }} />
          ))}
        </div>

        {/* Rest of standings */}
        {rankings.length > 3 && (
          <div className="game-panel p-3 fade-up" style={{ animationDelay: '600ms' }}>
            <div className="text-[7px] text-gray-600 text-center mb-2 tracking-widest">REST OF FIELD</div>
            {rankings.slice(3).map((player, idx) => {
              const isHuman = player.id === state.humanPlayerId;
              const rank = idx + 4;
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded mb-0.5"
                  style={{
                    background: isHuman ? 'rgba(0,191,255,0.08)' : 'transparent',
                    border: isHuman ? '1px solid rgba(0,191,255,0.25)' : '1px solid transparent',
                  }}
                >
                  <div className="text-[8px] w-5 text-center text-gray-600">#{rank}</div>
                  <BluboAvatar iconIndex={player.iconIndex} size={22} glow={false} />
                  <div className="flex-1 text-[7px] truncate" style={{ color: isHuman ? '#00bfff' : '#888' }}>
                    {player.name}
                  </div>
                  <div className="text-[7px] text-gray-600">ELIM</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Play again */}
        <div className="text-center fade-up" style={{ animationDelay: '700ms' }}>
          <button
            className="game-btn game-btn-green text-sm px-10 py-4"
            onClick={() => dispatch({ type: 'RESET' })}
          >
            PLAY AGAIN
          </button>
        </div>

      </div>
    </div>
  );
}
