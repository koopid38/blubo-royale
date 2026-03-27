import { useState, useEffect, useRef } from 'react';
import { useGame } from '../../hooks/useGameState';
import { usePvP } from '../../hooks/usePvPSync';
import { GAME_PHASES } from '../../utils/constants';
import BluboAvatar from '../UI/BluboAvatar';
import FloatingPlus from '../UI/FloatingPlus';

export default function Showdown() {
  const { state, dispatch } = useGame();
  const pvp = usePvP();
  const [phase, setPhase] = useState('countdown'); // countdown, flipping, result
  const [countdown, setCountdown] = useState(5);
  const [winner, setWinner] = useState(null);
  const [flipAngle, setFlipAngle] = useState(0);
  const flippedRef = useRef(false); // prevent double-trigger

  const finalists = state.players.filter(p => !p.eliminated).sort((a, b) => b.bankroll - a.bankroll);
  const player1 = finalists[0];
  const player2 = finalists[1];

  if (!player1 || !player2) return null;

  const total = player1.bankroll + player2.bankroll;
  const p1Chance = Math.round((player1.bankroll / total) * 100);
  const p2Chance = 100 - p1Chance;

  // ── Animate the coin flip and reveal winner ──────────────────────────────
  const animateFlip = (winnerPlayer) => {
    if (flippedRef.current) return;
    flippedRef.current = true;
    setPhase('flipping');
    let angle = 0;
    const flipInterval = setInterval(() => {
      angle += 30;
      setFlipAngle(angle);
      if (angle >= 1800) {
        clearInterval(flipInterval);
        setWinner(winnerPlayer);
        setPhase('result');
      }
    }, 50);
  };

  // ── Auto-countdown then trigger flip ────────────────────────────────────
  useEffect(() => {
    let count = 5;
    setCountdown(count);

    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        if (state.isPvP) {
          // Server decides winner — send request, wait for pvpShowdownWinnerId
          pvp.sendRequestFlip();
        } else {
          // VS AI: local RNG
          const roll = Math.random() * 100;
          animateFlip(roll < p1Chance ? player1 : player2);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []); // run once on mount

  // ── PvP: receive winner from server and animate for ALL players ──────────
  useEffect(() => {
    if (!state.isPvP || !state.pvpShowdownWinnerId) return;
    const winnerPlayer = [player1, player2].find(p => p.id === state.pvpShowdownWinnerId);
    if (winnerPlayer) animateFlip(winnerPlayer);
  }, [state.pvpShowdownWinnerId]);

  // ── After result: eliminate loser and go to results screen ──────────────
  useEffect(() => {
    if (phase !== 'result' || !winner) return;

    const timer = setTimeout(() => {
      if (!state.isPvP) {
        // VS AI: handle elimination locally
        const loser = [player1, player2].find(p => p.id !== winner.id);
        if (loser) dispatch({ type: 'ELIMINATE_PLAYER', playerId: loser.id });
      }
      // Both modes: go to results
      dispatch({ type: 'SET_PHASE', phase: GAME_PHASES.RESULTS });
    }, 5000);

    return () => clearTimeout(timer);
  }, [phase, winner]);

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <FloatingPlus />

      <div className="text-center z-10">
        {/* Title */}
        <div className="text-lg neon-text mb-6" style={{ color: '#ff4444' }}>
          FINAL SHOWDOWN
        </div>

        {/* Finalists */}
        <div className="flex items-center gap-8 md:gap-16 mb-8">
          {/* Player 1 */}
          <div className={`text-center transition-all ${winner?.id === player1.id ? 'neon-glow-strong rounded-lg p-4' : 'p-4'}`}>
            <BluboAvatar iconIndex={player1.iconIndex} size={80} />
            <div className="text-[9px] mt-3" style={{ color: player1.id === state.humanPlayerId ? '#00bfff' : '#ccc' }}>
              {player1.name}
            </div>
            <div className="text-sm mt-1" style={{ color: '#b8d767' }}>
              ${player1.bankroll.toLocaleString()}
            </div>
            <div className="text-lg mt-2" style={{
              color: p1Chance >= 50 ? '#b8d767' : '#ff4444',
              textShadow: `0 0 10px ${p1Chance >= 50 ? 'rgba(184,215,103,0.5)' : 'rgba(255,68,68,0.5)'}`,
            }}>
              {p1Chance}%
            </div>
          </div>

          {/* Centre: countdown / coin / crown */}
          <div className="flex flex-col items-center gap-3" style={{ minWidth: 100 }}>
            {phase === 'countdown' && (
              <>
                <div className="text-[9px] text-gray-400 mb-1">FLIPPING IN</div>
                <div
                  style={{
                    fontSize: 64,
                    fontFamily: 'Press Start 2P',
                    color: countdown <= 2 ? '#ff4444' : '#ffd700',
                    textShadow: `0 0 30px ${countdown <= 2 ? 'rgba(255,68,68,0.8)' : 'rgba(255,215,0,0.8)'}`,
                    lineHeight: 1,
                    animation: 'bounce-in 0.3s ease-out',
                    key: countdown,
                  }}
                >
                  {countdown}
                </div>
                <div className="text-2xl mt-1" style={{ color: '#ff4444', textShadow: '0 0 20px rgba(255,68,68,0.5)' }}>
                  VS
                </div>
              </>
            )}

            {phase === 'flipping' && (
              <div
                style={{
                  width: 96, height: 96,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                  border: '3px solid #fff',
                  boxShadow: '0 0 30px rgba(255,215,0,0.6)',
                  transform: `rotateY(${flipAngle}deg)`,
                  transition: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36,
                }}
              >
                {Math.floor(flipAngle / 180) % 2 === 0 ? '🎲' : '🎰'}
              </div>
            )}

            {phase === 'result' && winner && (
              <div className="bounce-in flex flex-col items-center gap-2">
                <div style={{ fontSize: 48 }}>👑</div>
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className={`text-center transition-all ${winner?.id === player2.id ? 'neon-glow-strong rounded-lg p-4' : 'p-4'}`}>
            <BluboAvatar iconIndex={player2.iconIndex} size={80} />
            <div className="text-[9px] mt-3" style={{ color: player2.id === state.humanPlayerId ? '#00bfff' : '#ccc' }}>
              {player2.name}
            </div>
            <div className="text-sm mt-1" style={{ color: '#b8d767' }}>
              ${player2.bankroll.toLocaleString()}
            </div>
            <div className="text-lg mt-2" style={{
              color: p2Chance >= 50 ? '#b8d767' : '#ff4444',
              textShadow: `0 0 10px ${p2Chance >= 50 ? 'rgba(184,215,103,0.5)' : 'rgba(255,68,68,0.5)'}`,
            }}>
              {p2Chance}%
            </div>
          </div>
        </div>

        {/* Prize pool */}
        <div className="game-panel px-6 py-3 inline-block mb-6">
          <div className="text-[7px] text-gray-400 mb-2">PRIZE POOL ${state.prizePool}</div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-[6px] text-gray-500">1ST (70%)</div>
              <div className="text-[9px]" style={{ color: '#ffd700' }}>${Math.floor(state.prizePool * 0.7)}</div>
            </div>
            <div className="text-center">
              <div className="text-[6px] text-gray-500">2ND (30%)</div>
              <div className="text-[9px]" style={{ color: '#00bfff' }}>${state.prizePool - Math.floor(state.prizePool * 0.7)}</div>
            </div>
          </div>
        </div>

        {/* Odds label */}
        {phase === 'countdown' && (
          <div className="text-[7px] text-gray-400">Odds based on chip count ratio</div>
        )}

        {/* Winner announcement */}
        {phase === 'result' && winner && (
          <div className="bounce-in">
            <div className="text-xl mb-2" style={{
              color: '#ffd700',
              textShadow: '0 0 20px rgba(255,215,0,0.5)',
            }}>
              {winner.name} WINS!
            </div>
            <div className="text-[9px] text-gray-400">
              Takes home ${Math.floor(state.prizePool * 0.7).toLocaleString()}
            </div>
            <div className="text-[7px] text-gray-500 mt-2">
              Going to results...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
