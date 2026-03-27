import { useState } from 'react';
import { useGame } from '../../hooks/useGameState';
import { spinRoulette, resolveRouletteBets } from '../../utils/gameLogic';
import MysteryBox from '../Powerups/MysteryBox';
import { sfx } from '../../utils/sounds';

const BET_TYPES = [
  { type: 'red', label: 'RED', multiplier: 2, color: '#cc2222' },
  { type: 'black', label: 'BLACK', multiplier: 2, color: '#333' },
  { type: 'odd', label: 'ODD', multiplier: 2, color: '#666' },
  { type: 'even', label: 'EVEN', multiplier: 2, color: '#666' },
  { type: '1-12', label: '1-12', multiplier: 3, color: '#444' },
  { type: '13-24', label: '13-24', multiplier: 3, color: '#444' },
  { type: '25-36', label: '25-36', multiplier: 3, color: '#444' },
];

export default function Roulette() {
  const { state, dispatch, checkPowerupDrop } = useGame();
  const player = state.players.find(p => p.id === state.humanPlayerId);
  const [bets, setBets] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [payout, setPayout] = useState(null);
  const [betAmount, setBetAmount] = useState(state.minBet);
  const [numberBet, setNumberBet] = useState('');
  const [droppedPowerup, setDroppedPowerup] = useState(null);

  const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);
  const canBet = player && !player.eliminated && !spinning && !state.bankrollFrozen;

  const addBet = (type, multiplier) => {
    if (!canBet || betAmount + totalBets > player.bankroll || betAmount < state.minBet) return;
    sfx.betPlace();
    setBets([...bets, { type, amount: betAmount, multiplier }]);
  };

  const addNumberBet = () => {
    const num = parseInt(numberBet);
    if (isNaN(num) || num < 0 || num > 36) return;
    if (!canBet || betAmount + totalBets > player.bankroll || betAmount < state.minBet) return;
    sfx.betPlace();
    setBets([...bets, { type: 'number', number: num, amount: betAmount, multiplier: 35 }]);
    setNumberBet('');
  };

  const handleSpin = () => {
    if (bets.length === 0 || spinning) return;

    // Deduct total bets
    dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: -totalBets });
    dispatch({ type: 'RECORD_BET', playerId: player.id });
    dispatch({ type: 'SET_MID_HAND', midHand: true });
    setSpinning(true);
    sfx.rouletteSpin();

    // Animate: show random numbers rapidly
    const spinDuration = 3000;
    const interval = setInterval(() => {
      const randomResult = spinRoulette();
      setResult(randomResult);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const finalResult = spinRoulette();
      setResult(finalResult);
      setSpinning(false);
      dispatch({ type: 'SET_MID_HAND', midHand: false });

      const totalPayout = resolveRouletteBets(bets, finalResult);
      setPayout(totalPayout);

      if (totalPayout > 0) {
        dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: totalPayout + totalBets });
        sfx.win();
        dispatch({ type: 'SCREEN_SHAKE' });
        setTimeout(() => dispatch({ type: 'CLEAR_SHAKE' }), 400);
      } else {
        sfx.lose();
      }

      // Check for powerup drop
      const drop = checkPowerupDrop();
      if (drop) setDroppedPowerup(drop);
    }, spinDuration);
  };

  const clearBets = () => {
    setBets([]);
    setPayout(null);
    setResult(null);
    setDroppedPowerup(null);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-[10px] neon-text" style={{ color: '#00bfff' }}>ROULETTE</h3>

      {/* Wheel display */}
      <div className="game-panel p-6 text-center" style={{ minWidth: 200 }}>
        <div
          className="w-32 h-32 rounded-full mx-auto flex items-center justify-center mb-3"
          style={{
            background: result
              ? result.color === 'red' ? 'radial-gradient(circle, #cc2222, #661111)'
              : result.color === 'green' ? 'radial-gradient(circle, #22aa22, #115511)'
              : 'radial-gradient(circle, #333, #111)'
              : 'radial-gradient(circle, #1a1a2e, #0a0a1a)',
            border: '3px solid rgba(0, 191, 255, 0.5)',
            boxShadow: spinning ? '0 0 30px rgba(0, 191, 255, 0.5)' : '0 0 15px rgba(0, 191, 255, 0.2)',
            transition: spinning ? 'none' : 'all 0.3s',
          }}
        >
          {result ? (
            <div>
              <div className="text-2xl font-bold">{result.num}</div>
              <div className="text-[7px] mt-1">{result.color.toUpperCase()}</div>
            </div>
          ) : (
            <div className="text-[8px] text-gray-400">PLACE BETS</div>
          )}
        </div>

        {/* Result */}
        {payout !== null && !spinning && (
          <div className={`text-sm bounce-in mb-2 ${payout > 0 ? 'neon-text-green' : ''}`}
            style={{ color: payout > 0 ? '#b8d767' : '#ff4444' }}>
            {payout > 0 ? `WIN +$${payout}` : payout === 0 ? 'PUSH' : `LOSE -$${totalBets}`}
          </div>
        )}
      </div>

      {/* Bet amount selector */}
      <div className="flex items-center gap-3">
        <button className="game-btn text-[8px] px-2 py-1" onClick={() => setBetAmount(Math.max(state.minBet, betAmount - state.minBet))}>-</button>
        <div className="text-[10px] neon-text" style={{ color: '#00bfff', minWidth: 50, textAlign: 'center' }}>${betAmount}</div>
        <button className="game-btn text-[8px] px-2 py-1" onClick={() => setBetAmount(Math.min(player?.bankroll || 0, state.minBet * 10, betAmount + state.minBet))}>+</button>
        <button className="game-btn text-[7px] px-2 py-1" onClick={() => setBetAmount(Math.min(player?.bankroll || 0, state.minBet * 5))}>HALF</button>
        <button className="game-btn text-[7px] px-2 py-1" onClick={() => setBetAmount(Math.min(player?.bankroll || 0, state.minBet * 10))}>MAX</button>
      </div>

      {/* Bet options */}
      <div className="grid grid-cols-4 gap-2 max-w-md">
        {BET_TYPES.map(bt => (
          <button
            key={bt.type}
            className="game-btn text-[7px] px-3 py-2"
            style={{ borderColor: bt.color, background: `${bt.color}22` }}
            onClick={() => addBet(bt.type, bt.multiplier)}
            disabled={!canBet}
          >
            {bt.label}
            <div className="text-[6px] text-gray-400">{bt.multiplier}x</div>
          </button>
        ))}

        {/* Number bet */}
        <div className="flex gap-1">
          <input
            type="number"
            min="0"
            max="36"
            value={numberBet}
            onChange={(e) => setNumberBet(e.target.value)}
            placeholder="#"
            className="w-10 text-center text-[8px] bg-black/50 border border-gray-600 rounded px-1 py-1"
            style={{ fontFamily: 'Press Start 2P', color: '#00bfff' }}
          />
          <button className="game-btn text-[6px] px-2 py-1" onClick={addNumberBet} disabled={!canBet}>
            35x
          </button>
        </div>
      </div>

      {/* Current bets */}
      {bets.length > 0 && (
        <div className="game-panel p-2 text-[7px] w-full max-w-md">
          <div className="text-gray-400 mb-1">YOUR BETS (Total: ${totalBets})</div>
          <div className="flex flex-wrap gap-1">
            {bets.map((b, i) => (
              <span key={i} className="px-2 py-1 rounded" style={{ background: 'rgba(0, 191, 255, 0.1)', border: '1px solid rgba(0, 191, 255, 0.2)' }}>
                {b.type === 'number' ? `#${b.number}` : b.type.toUpperCase()} ${b.amount}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {bets.length > 0 && !spinning && payout === null && (
          <button className="game-btn game-btn-green text-[9px] px-6 py-2" onClick={handleSpin}>
            SPIN
          </button>
        )}
        {!spinning && (
          <button className="game-btn game-btn-red text-[8px] px-4 py-2" onClick={clearBets}>
            {payout !== null ? 'NEW ROUND' : 'CLEAR'}
          </button>
        )}
        {spinning && (
          <div className="text-[8px] text-gray-400 py-2">Spinning...</div>
        )}
      </div>

      {droppedPowerup && (
        <MysteryBox powerup={droppedPowerup} onClose={() => setDroppedPowerup(null)} />
      )}
    </div>
  );
}
