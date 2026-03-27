import { useState, useRef, useEffect } from 'react';
import { useGame } from '../../hooks/useGameState';
import { HORSES } from '../../utils/constants';
import { simulateHorseRace } from '../../utils/gameLogic';
import MysteryBox from '../Powerups/MysteryBox';
import { sfx } from '../../utils/sounds';

export default function Horses() {
  const { state, dispatch, checkPowerupDrop } = useGame();
  const player = state.players.find(p => p.id === state.humanPlayerId);
  const [selectedHorse, setSelectedHorse] = useState(null);
  const [racing, setRacing] = useState(false);
  const [raceData, setRaceData] = useState(null);
  const [frame, setFrame] = useState(0);
  const [result, setResult] = useState(null);
  const [droppedPowerup, setDroppedPowerup] = useState(null);
  const animRef = useRef(null);

  const canBet = player && !player.eliminated && player.bankroll >= state.minBet && !racing && !state.bankrollFrozen;

  const handleRace = () => {
    if (!canBet || selectedHorse === null) return;

    dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: -state.minBet });
    dispatch({ type: 'RECORD_BET', playerId: player.id });
    setResult(null);
    setFrame(0);
    sfx.raceStart();

    const data = simulateHorseRace(HORSES);
    setRaceData(data);
    setRacing(true);
  };

  // Animate the race frame by frame
  useEffect(() => {
    if (!racing || !raceData) return;

    const speed = 40; // ms per frame
    let gallopFrame = 0;
    animRef.current = setInterval(() => {
      gallopFrame++;
      // Play hoof beat every 4 frames (~160ms) for a galloping rhythm
      if (gallopFrame % 4 === 0) sfx.horseGallop();

      setFrame(prev => {
        const next = prev + 1;
        if (next >= raceData.totalFrames) {
          clearInterval(animRef.current);
          // Race finished
          const won = raceData.winner === selectedHorse;
          if (won) {
            const winnings = Math.floor(state.minBet * HORSES[selectedHorse].odds);
            dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: winnings });
            sfx.win();
            dispatch({ type: 'SCREEN_SHAKE' });
            setTimeout(() => dispatch({ type: 'CLEAR_SHAKE' }), 400);
            setResult({ win: true, amount: winnings, winner: raceData.winner });
          } else {
            sfx.lose();
            setResult({ win: false, amount: -state.minBet, winner: raceData.winner });
          }
          setRacing(false);

          const drop = checkPowerupDrop();
          if (drop) setDroppedPowerup(drop);
        }
        return next;
      });
    }, speed);

    return () => clearInterval(animRef.current);
  }, [racing, raceData]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full" style={{ maxWidth: 640 }}>
      <h3 className="text-[10px] neon-text" style={{ color: '#00bfff' }}>HORSE RACING</h3>

      {/* Race track */}
      <div className="game-panel p-4 w-full" style={{ background: 'rgba(10, 15, 30, 0.9)' }}>
        <div className="text-center mb-3">
          <div className="text-[10px]" style={{ color: '#ffd700' }}>★ BLUBO DERBY ★</div>
        </div>

        {/* Track lanes */}
        <div className="flex flex-col gap-1.5 mb-4">
          {HORSES.map((horse, i) => {
            const progress = raceData && frame < raceData.totalFrames
              ? raceData.positions[i][Math.min(frame, raceData.positions[i].length - 1)]
              : raceData && result
                ? raceData.positions[i][raceData.positions[i].length - 1]
                : 0;

            const isSelected = selectedHorse === i;
            const isWinner = result && result.winner === i;

            return (
              <div key={horse.id} className="flex items-center gap-2">
                {/* Horse name */}
                <div
                  className="text-[7px] w-16 text-right truncate"
                  style={{ color: horse.color }}
                >
                  {horse.name}
                </div>

                {/* Lane */}
                <div
                  className="flex-1 relative rounded"
                  style={{
                    height: 28,
                    background: 'rgba(0, 10, 30, 0.8)',
                    border: isSelected
                      ? `1px solid ${horse.color}`
                      : '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Finish line */}
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      right: 0,
                      width: 3,
                      background: 'repeating-linear-gradient(0deg, #fff 0px, #fff 3px, #333 3px, #333 6px)',
                      opacity: 0.4,
                    }}
                  />

                  {/* Horse icon */}
                  <div
                    className="absolute top-0 bottom-0 flex items-center transition-none"
                    style={{
                      left: `${Math.min(progress, 100) * 0.92}%`,
                      fontSize: 18,
                      filter: isWinner ? 'drop-shadow(0 0 6px gold)' : 'none',
                    }}
                  >
                    🏇
                  </div>
                </div>

                {/* Odds */}
                <div
                  className="text-[7px] w-10 text-center"
                  style={{ color: horse.color }}
                >
                  {horse.odds}x
                </div>
              </div>
            );
          })}
        </div>

        {/* Result */}
        {result && (
          <div
            className="text-center mb-3 bounce-in text-sm"
            style={{ color: result.win ? '#b8d767' : '#ff4444' }}
          >
            {result.win
              ? `${HORSES[result.winner].name} WINS! +$${result.amount}`
              : `${HORSES[result.winner].name} wins — you lose $${state.minBet}`}
          </div>
        )}

        {/* Horse picker */}
        {!racing && (
          <div className="mb-3">
            <div className="text-[7px] text-gray-400 text-center mb-2">PICK YOUR HORSE</div>
            <div className="flex gap-2 justify-center flex-wrap">
              {HORSES.map((horse, i) => (
                <button
                  key={horse.id}
                  onClick={() => setSelectedHorse(i)}
                  className="px-3 py-1.5 rounded text-[8px] transition-all"
                  style={{
                    background: selectedHorse === i ? `${horse.color}22` : 'rgba(10,15,30,0.6)',
                    border: selectedHorse === i
                      ? `2px solid ${horse.color}`
                      : '1px solid rgba(255,255,255,0.1)',
                    color: horse.color,
                    boxShadow: selectedHorse === i ? `0 0 10px ${horse.color}44` : 'none',
                    fontFamily: 'Press Start 2P',
                  }}
                >
                  🏇 {horse.name} ({horse.odds}x)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bet cost */}
        <div className="text-center text-[7px] text-gray-400 mb-3">
          BET: ${state.minBet}
        </div>

        {/* Race button */}
        <div className="text-center">
          <button
            className="game-btn game-btn-green text-sm px-8 py-3"
            onClick={handleRace}
            disabled={!canBet || selectedHorse === null}
            style={{ opacity: canBet && selectedHorse !== null ? 1 : 0.5 }}
          >
            {racing ? 'RACING...' : 'RACE!'}
          </button>
        </div>
      </div>

      {droppedPowerup && (
        <MysteryBox powerup={droppedPowerup} onClose={() => setDroppedPowerup(null)} />
      )}
    </div>
  );
}
