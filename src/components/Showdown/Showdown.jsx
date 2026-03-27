import { useState, useEffect } from 'react';
import { useGame } from '../../hooks/useGameState';
import { usePvP } from '../../hooks/usePvPSync';
import { GAME_PHASES } from '../../utils/constants';
import BluboAvatar from '../UI/BluboAvatar';
import FloatingPlus from '../UI/FloatingPlus';

export default function Showdown() {
  const { state, dispatch } = useGame();
  const pvp = usePvP();
  const [phase, setPhase] = useState('intro'); // intro, flipping, result
  const [winner, setWinner] = useState(null);
  const [flipAngle, setFlipAngle] = useState(0);

  const finalists = state.players.filter(p => !p.eliminated).sort((a, b) => b.bankroll - a.bankroll);
  const player1 = finalists[0];
  const player2 = finalists[1];

  if (!player1 || !player2) return null;

  const total = player1.bankroll + player2.bankroll;
  const p1Chance = Math.round((player1.bankroll / total) * 100);
  const p2Chance = 100 - p1Chance;

  const animateFlip = (winnerPlayer) => {
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

  const handleFlip = () => {
    setPhase('flipping');

    if (state.isPvP) {
      // In PvP, ask server to determine winner
      pvp.sendRequestFlip();
    } else {
      // VS AI: local coin flip
      const roll = Math.random() * 100;
      const winnerPlayer = roll < p1Chance ? player1 : player2;
      animateFlip(winnerPlayer);
    }
  };

  // PvP: receive showdown result from server
  useEffect(() => {
    if (state.isPvP && state.pvpShowdownWinnerId && phase === 'flipping' && !winner) {
      const winnerPlayer = [player1, player2].find(p => p.id === state.pvpShowdownWinnerId);
      if (winnerPlayer) {
        animateFlip(winnerPlayer);
      }
    }
  }, [state.pvpShowdownWinnerId, state.isPvP, phase]);

  useEffect(() => {
    if (phase === 'result' && winner) {
      // In PvP, server handles elimination and phase transition
      if (state.isPvP) return;
      const timer = setTimeout(() => {
        const loser = [player1, player2].find(p => p.id !== winner.id);
        if (loser) dispatch({ type: 'ELIMINATE_PLAYER', playerId: loser.id });
        dispatch({ type: 'SET_PHASE', phase: GAME_PHASES.RESULTS });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [phase, winner, state.isPvP]);

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <FloatingPlus />

      <div className="text-center z-10">
        {/* Title */}
        <div className="text-lg neon-text mb-8" style={{ color: '#ff4444' }}>
          FINAL SHOWDOWN
        </div>

        {/* Finalists */}
        <div className="flex items-center gap-8 md:gap-16 mb-8">
          {/* Player 1 */}
          <div className={`text-center ${winner?.id === player1.id ? 'neon-glow-strong rounded-lg p-4' : 'p-4'}`}>
            <BluboAvatar
              iconIndex={player1.iconIndex}
              size={80}
            />
            <div className="text-[9px] mt-3" style={{ color: player1.id === state.humanPlayerId ? '#00bfff' : '#ccc' }}>
              {player1.name}
            </div>
            <div className="text-sm neon-text-green mt-1" style={{ color: '#b8d767' }}>
              ${player1.bankroll.toLocaleString()}
            </div>
            <div className="text-lg mt-2" style={{
              color: p1Chance >= 50 ? '#b8d767' : '#ff4444',
              textShadow: `0 0 10px ${p1Chance >= 50 ? 'rgba(184,215,103,0.5)' : 'rgba(255,68,68,0.5)'}`,
            }}>
              {p1Chance}%
            </div>
          </div>

          {/* VS / Coin */}
          <div className="flex flex-col items-center">
            {phase === 'intro' && (
              <div className="text-2xl" style={{ color: '#ff4444', textShadow: '0 0 20px rgba(255,68,68,0.5)' }}>
                VS
              </div>
            )}

            {phase === 'flipping' && (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                  border: '3px solid #fff',
                  boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
                  transform: `rotateY(${flipAngle}deg)`,
                  transition: 'none',
                }}
              >
                <div className="text-2xl">
                  {Math.floor(flipAngle / 180) % 2 === 0 ? '🎲' : '🎲'}
                </div>
              </div>
            )}

            {phase === 'result' && winner && (
              <div className="bounce-in">
                <div className="text-3xl mb-2">👑</div>
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className={`text-center ${winner?.id === player2.id ? 'neon-glow-strong rounded-lg p-4' : 'p-4'}`}>
            <BluboAvatar
              iconIndex={player2.iconIndex}
              size={80}
            />
            <div className="text-[9px] mt-3" style={{ color: player2.id === state.humanPlayerId ? '#00bfff' : '#ccc' }}>
              {player2.name}
            </div>
            <div className="text-sm neon-text-green mt-1" style={{ color: '#b8d767' }}>
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

        {/* Flip button */}
        {phase === 'intro' && (
          <div>
            <button
              className="game-btn text-sm px-8 py-4"
              style={{ borderColor: '#ffd700', color: '#ffd700' }}
              onClick={handleFlip}
            >
              FLIP THE COIN
            </button>
            <div className="text-[7px] text-gray-400 mt-3">
              Odds based on chip count ratio
            </div>
          </div>
        )}

        {/* Winner announcement */}
        {phase === 'result' && winner && (
          <div className="bounce-in">
            <div className="text-xl mb-2" style={{
              color: '#ffd700',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
            }}>
              {winner.name} WINS!
            </div>
            <div className="text-[9px] text-gray-400">
              Takes home ${state.prizePool}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
