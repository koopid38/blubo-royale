import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../../hooks/useGameState';
import { PLINKO_MULTIPLIERS } from '../../utils/constants';
import { dropPlinko } from '../../utils/gameLogic';
import MysteryBox from '../Powerups/MysteryBox';
import { sfx } from '../../utils/sounds';

const ROWS = 16;
const BOARD_WIDTH = 420;
const BOARD_HEIGHT = 340;
const NUM_SLOTS = PLINKO_MULTIPLIERS.length;
const ANIM_DURATION = 2200; // ms for ball to fall
const STEP_INTERVAL = 20; // ms between frame updates

export default function Plinko() {
  const { state, dispatch, checkPowerupDrop } = useGame();
  const player = state.players.find(p => p.id === state.humanPlayerId);
  const [balls, setBalls] = useState([]);
  const [results, setResults] = useState([]);
  const [droppedPowerup, setDroppedPowerup] = useState(null);
  const ballIdRef = useRef(0);
  const animFrames = useRef({});
  const activeBallCount = useRef(0);

  const MAX_BALLS = 10;
  const activeBalls = balls.filter(b => !b.landed).length;
  const canDrop = player && !player.eliminated && player.bankroll >= state.minBet && !state.bankrollFrozen && activeBalls < MAX_BALLS;
  const canDrop10 = player && !player.eliminated && player.bankroll >= state.minBet * 10 && !state.bankrollFrozen && activeBalls === 0;

  const boardToPixel = useCallback((normX, normY) => {
    const padX = 30;
    const padTop = 15;
    const padBot = 45;
    return {
      x: padX + normX / (NUM_SLOTS - 1) * (BOARD_WIDTH - padX * 2),
      y: padTop + normY * (BOARD_HEIGHT - padTop - padBot),
    };
  }, []);

  const launchBall = useCallback(() => {
    if (!canDrop) return;

    dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: -state.minBet });
    dispatch({ type: 'RECORD_BET', playerId: player.id });
    if (activeBallCount.current === 0) {
      dispatch({ type: 'SET_MID_HAND', midHand: true });
    }
    activeBallCount.current += 1;
    sfx.plinkoLaunch();

    const outcome = dropPlinko(ROWS);
    const id = ++ballIdRef.current;
    const path = outcome.path;
    const totalSteps = path.length;
    const stepsPerFrame = totalSteps / (ANIM_DURATION / STEP_INTERVAL);

    // Add ball at start position
    const startPixel = boardToPixel(path[0].x, path[0].y);
    setBalls(prev => [...prev, { id, x: startPixel.x, y: startPixel.y, landed: false }]);

    let frameIdx = 0;
    let lastRow = -1;
    const animate = () => {
      frameIdx += stepsPerFrame;
      const idx = Math.min(Math.floor(frameIdx), totalSteps - 1);
      const step = path[idx];
      const pixel = boardToPixel(step.x, step.y);

      // Play a peg-hit tick each time the ball enters a new row
      const currentRow = Math.floor(step.y * ROWS);
      if (currentRow !== lastRow && currentRow > 0) {
        lastRow = currentRow;
        sfx.plinkoHit();
      }

      if (idx >= totalSteps - 1) {
        // Ball landed
        const finalPixel = boardToPixel(path[totalSteps - 1].x, path[totalSteps - 1].y);
        setBalls(prev => prev.map(b => b.id === id ? { ...b, x: finalPixel.x, y: finalPixel.y, landed: true } : b));
        sfx.plinkoLand(outcome.multiplier);

        const winnings = Math.floor(state.minBet * outcome.multiplier);
        if (winnings > 0) {
          dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: winnings });
          if (outcome.multiplier >= 4) {
            dispatch({ type: 'SCREEN_SHAKE' });
            setTimeout(() => dispatch({ type: 'CLEAR_SHAKE' }), 400);
          }
        }

        setResults(prev => [...prev.slice(-9), { id, multiplier: outcome.multiplier, slot: outcome.slot, winnings }]);

        const drop = checkPowerupDrop();
        if (drop) setDroppedPowerup(drop);

        // Remove ball after fade
        setTimeout(() => {
          setBalls(prev => prev.filter(b => b.id !== id));
        }, 1500);

        activeBallCount.current -= 1;
        if (activeBallCount.current === 0) {
          dispatch({ type: 'SET_MID_HAND', midHand: false });
        }

        delete animFrames.current[id];
        return;
      }

      setBalls(prev => prev.map(b => b.id === id ? { ...b, x: pixel.x, y: pixel.y } : b));
      animFrames.current[id] = setTimeout(animate, STEP_INTERVAL);
    };

    animFrames.current[id] = setTimeout(animate, STEP_INTERVAL);
  }, [canDrop, player, state.minBet, dispatch, checkPowerupDrop, boardToPixel]);

  const launchBurst = useCallback(() => {
    if (!canDrop10) return;
    for (let i = 0; i < 10; i++) {
      setTimeout(() => launchBall(), i * 120);
    }
  }, [canDrop10, launchBall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(animFrames.current).forEach(clearTimeout);
      if (activeBallCount.current > 0) {
        dispatch({ type: 'SET_MID_HAND', midHand: false });
      }
    };
  }, []);

  // Generate peg positions — triangle shape expanding from top center
  const pegs = [];
  for (let row = 0; row < ROWS; row++) {
    const numPegs = row + 3;
    const center = (NUM_SLOTS - 1) / 2;
    // Row width grows linearly from narrow at top to full width at bottom
    const spread = ((row + 1) / ROWS) * (NUM_SLOTS - 1) / 2;
    for (let col = 0; col < numPegs; col++) {
      const t = numPegs > 1 ? col / (numPegs - 1) : 0.5;
      const normX = center - spread + t * spread * 2;
      const normY = (row + 0.5) / ROWS;
      const pixel = boardToPixel(normX, normY);
      pegs.push(pixel);
    }
  }

  // Latest result for slot highlight
  const latestResult = results[results.length - 1];

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <h3 className="text-[10px] neon-text" style={{ color: '#00bfff' }}>PLINKO</h3>

      {/* Plinko board */}
      <div
        className="game-panel relative"
        style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, overflow: 'hidden' }}
      >
        {/* Pegs */}
        {pegs.map((peg, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: peg.x - 3,
              top: peg.y - 3,
              width: 6,
              height: 6,
              background: 'rgba(0, 191, 255, 0.5)',
              boxShadow: '0 0 3px rgba(0, 191, 255, 0.3)',
            }}
          />
        ))}

        {/* Balls */}
        {balls.map(ball => (
          <div
            key={ball.id}
            className="plinko-chip"
            style={{
              left: ball.x - 6,
              top: ball.y - 6,
              opacity: ball.landed ? 0 : 1,
              transition: `left ${STEP_INTERVAL}ms linear, top ${STEP_INTERVAL}ms linear, opacity 1s ease-out`,
            }}
          />
        ))}

        {/* Multiplier slots at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex">
          {PLINKO_MULTIPLIERS.map((mult, i) => {
            const bgColor = mult >= 4 ? 'rgba(255, 68, 68, 0.3)' :
              mult >= 2 ? 'rgba(255, 165, 0, 0.3)' :
              mult >= 1 ? 'rgba(0, 191, 255, 0.2)' :
              'rgba(100, 100, 100, 0.2)';

            const isHit = latestResult?.slot === i;

            return (
              <div
                key={i}
                className="flex-1 text-center py-2 text-[6px]"
                style={{
                  background: isHit ? 'rgba(184, 215, 103, 0.5)' : bgColor,
                  borderTop: '1px solid rgba(0, 191, 255, 0.3)',
                  borderRight: i < NUM_SLOTS - 1 ? '1px solid rgba(0, 191, 255, 0.1)' : 'none',
                  color: mult >= 4 ? '#ff4444' : mult >= 2 ? '#ffa500' : '#00bfff',
                  transition: 'background 0.3s',
                }}
              >
                {mult}x
              </div>
            );
          })}
        </div>
      </div>

      {/* Results feed */}
      {results.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center max-w-md">
          {results.slice(-5).map(r => (
            <span
              key={r.id}
              className="text-[7px] px-2 py-0.5 rounded"
              style={{
                color: r.multiplier >= 2 ? '#b8d767' : r.multiplier >= 1 ? '#00bfff' : '#ff4444',
                background: r.multiplier >= 2 ? 'rgba(184,215,103,0.15)' : 'rgba(0,191,255,0.1)',
                border: `1px solid ${r.multiplier >= 2 ? 'rgba(184,215,103,0.3)' : 'rgba(0,191,255,0.2)'}`,
              }}
            >
              {r.multiplier}x = ${r.winnings}
            </span>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-[7px] text-gray-400">DROP COST: ${state.minBet}</div>
        <div className="flex gap-3">
          <button
            className="game-btn game-btn-green text-[9px] px-5 py-2"
            onClick={launchBall}
            disabled={!canDrop}
            style={{ opacity: canDrop ? 1 : 0.5 }}
          >
            DROP 1
          </button>
          <button
            className="game-btn text-[9px] px-5 py-2"
            onClick={launchBurst}
            disabled={!canDrop10}
            style={{
              opacity: canDrop10 ? 1 : 0.5,
              borderColor: '#ffa500',
              background: 'rgba(255,165,0,0.1)',
            }}
          >
            DROP 10
          </button>
        </div>
        {activeBalls > 0 && (
          <div className="text-[7px] text-gray-500">{activeBalls} ball{activeBalls !== 1 ? 's' : ''} in play</div>
        )}
      </div>

      {droppedPowerup && (
        <MysteryBox powerup={droppedPowerup} onClose={() => setDroppedPowerup(null)} />
      )}
    </div>
  );
}
