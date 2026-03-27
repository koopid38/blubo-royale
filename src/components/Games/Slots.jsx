import { useState, useRef } from 'react';
import { useGame } from '../../hooks/useGameState';
import { SLOT_SYMBOLS } from '../../utils/constants';
import { spinSlots } from '../../utils/gameLogic';
import MysteryBox from '../Powerups/MysteryBox';
import { sfx } from '../../utils/sounds';

export default function Slots() {
  const { state, dispatch, checkPowerupDrop } = useGame();
  const player = state.players.find(p => p.id === state.humanPlayerId);
  const [reels, setReels] = useState(['🎲', '🎲', '🎲']);
  const [spinning, setSpinning] = useState(false);
  const [droppedPowerup, setDroppedPowerup] = useState(null);
  const [result, setResult] = useState(null);
  const [displayReels, setDisplayReels] = useState(['🎲', '🎲', '🎲']);
  const spinTimers = useRef([]);

  const canSpin = player && !player.eliminated && player.bankroll >= state.minBet && !spinning && !state.bankrollFrozen;

  const handleSpin = () => {
    if (!canSpin) return;

    dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: -state.minBet });
    dispatch({ type: 'RECORD_BET', playerId: player.id });
    setSpinning(true);
    setResult(null);
    sfx.slotSpin();

    const outcome = spinSlots();

    // Animate spinning
    const spinDuration = [800, 1200, 1600];
    const intervals = [];

    for (let r = 0; r < 3; r++) {
      const interval = setInterval(() => {
        setDisplayReels(prev => {
          const next = [...prev];
          next[r] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          return next;
        });
      }, 80);
      intervals.push(interval);

      setTimeout(() => {
        sfx.reelStop();
        clearInterval(intervals[r]);
        setDisplayReels(prev => {
          const next = [...prev];
          next[r] = outcome.reels[r];
          return next;
        });

        if (r === 2) {
          setReels(outcome.reels);
          setSpinning(false);

          if (outcome.isWin) {
            const winnings = Math.floor(state.minBet * outcome.multiplier);
            dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: winnings + state.minBet });
            setResult({ win: true, amount: winnings, multiplier: outcome.multiplier });
            outcome.multiplier >= 5 ? sfx.bigWin() : sfx.win();
            dispatch({ type: 'SCREEN_SHAKE' });
            setTimeout(() => dispatch({ type: 'CLEAR_SHAKE' }), 400);
          } else if (outcome.isPair) {
            dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: state.minBet });
            setResult({ win: false, isPair: true, amount: 0 });
            sfx.push();
          } else {
            setResult({ win: false, isPair: false, amount: -state.minBet });
            sfx.lose();
          }

          // Check for powerup drop
          const drop = checkPowerupDrop();
          if (drop) setDroppedPowerup(drop);
        }
      }, spinDuration[r]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-[10px] neon-text" style={{ color: '#00bfff' }}>SLOTS</h3>

      {/* Slot machine */}
      <div className="game-panel p-8" style={{ background: 'rgba(10, 15, 30, 0.9)' }}>
        {/* Top decoration */}
        <div className="text-center mb-5">
          <div className="text-[10px]" style={{ color: '#ffd700' }}>★ BLUBO SLOTS ★</div>
        </div>

        {/* Reels */}
        <div className="flex gap-4 justify-center mb-5">
          {displayReels.map((symbol, i) => (
            <div
              key={i}
              className="w-28 h-28 flex items-center justify-center rounded-lg"
              style={{
                background: 'rgba(0, 10, 30, 0.8)',
                border: '2px solid rgba(0, 191, 255, 0.4)',
                boxShadow: spinning ? '0 0 20px rgba(0, 191, 255, 0.4)' : 'none',
                fontSize: 52,
                transition: spinning ? 'none' : 'all 0.3s',
              }}
            >
              {symbol}
            </div>
          ))}
        </div>

        {/* Result */}
        {result && (
          <div className={`text-center mb-3 bounce-in text-sm`}
            style={{ color: result.win ? '#b8d767' : result.isPair ? '#ffa500' : '#ff4444' }}>
            {result.win ? `WIN! ${result.multiplier}x (+$${result.amount})` : result.isPair ? 'PAIR — BET RETURNED' : 'NO MATCH'}
          </div>
        )}

        {/* Spin cost */}
        <div className="text-center text-[7px] text-gray-400 mb-3">
          SPIN COST: ${state.minBet}
        </div>

        {/* Spin button */}
        <div className="text-center">
          <button
            className="game-btn game-btn-green text-sm px-8 py-3"
            onClick={handleSpin}
            disabled={!canSpin}
            style={{ opacity: canSpin ? 1 : 0.5 }}
          >
            {spinning ? 'SPINNING...' : 'SPIN'}
          </button>
        </div>
      </div>

      {/* Paytable */}
      <div className="game-panel p-4 text-[8px]">
        <div className="text-center text-gray-400 mb-3">PAYTABLE</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div className="flex items-center gap-2"><span style={{ fontSize: 16 }}>🎲🎲🎲</span><span style={{ color: '#ff4444' }}>= 10x</span></div>
          <div className="flex items-center gap-2"><span style={{ fontSize: 16 }}>💎💎💎</span><span style={{ color: '#ffd700' }}>= 8x</span></div>
          <div className="flex items-center gap-2"><span style={{ fontSize: 16 }}>7️⃣7️⃣7️⃣</span><span style={{ color: '#ffa500' }}>= 5x</span></div>
          <div className="flex items-center gap-2"><span style={{ fontSize: 16 }}>⭐⭐⭐</span><span style={{ color: '#ffd700' }}>= 4x</span></div>
          <div className="flex items-center gap-2"><span style={{ fontSize: 16 }}>🎰🎰🎰</span><span style={{ color: '#00bfff' }}>= 3x</span></div>
          <div className="flex items-center gap-2"><span style={{ fontSize: 16 }}>🍒🍒🍒</span><span style={{ color: '#b8d767' }}>= 2x</span></div>
          <div className="flex items-center gap-2 col-span-2"><span style={{ fontSize: 16 }}>Any Pair</span><span style={{ color: '#ffa500' }}>= Bet returned</span></div>
        </div>
      </div>

      {droppedPowerup && (
        <MysteryBox powerup={droppedPowerup} onClose={() => setDroppedPowerup(null)} />
      )}
    </div>
  );
}
