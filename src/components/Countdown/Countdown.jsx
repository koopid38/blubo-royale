import { useState, useEffect } from 'react';
import { useGame } from '../../hooks/useGameState';
import { GAME_PHASES } from '../../utils/constants';
import BluboAvatar from '../UI/BluboAvatar';
import FloatingPlus from '../UI/FloatingPlus';
import { sfx } from '../../utils/sounds';

export default function Countdown() {
  const { state, dispatch } = useGame();
  const [count, setCount] = useState(5);
  const humanPlayer = state.players.find(p => p.id === state.humanPlayerId);

  // Local countdown timer — runs in both VS AI and PvP mode
  useEffect(() => {
    if (count <= 0) {
      sfx.showdownTickFinal(); // launch sound on GO
      dispatch({ type: 'SET_PHASE', phase: GAME_PHASES.PLAYING });
      return;
    }
    count === 1 ? sfx.showdownTickFinal() : sfx.showdownTick();
    const timer = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <FloatingPlus />
      <div className="z-10 text-center">
        <BluboAvatar iconIndex={humanPlayer?.iconIndex ?? 0} size={80} className="mx-auto mb-6" />
        <div className="text-[10px] text-gray-400 mb-4 tracking-widest">GAME STARTING IN</div>
        <div
          key={count}
          className="bounce-in"
          style={{
            fontSize: '8rem',
            lineHeight: 1,
            color: count <= 2 ? '#ff4444' : '#00bfff',
            textShadow: `0 0 40px ${count <= 2 ? 'rgba(255,68,68,0.8)' : 'rgba(0,191,255,0.8)'}`,
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          {count}
        </div>
        <div className="text-[8px] text-gray-500 mt-6">GOOD LUCK!</div>
      </div>
    </div>
  );
}
