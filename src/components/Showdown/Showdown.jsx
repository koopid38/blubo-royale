import { useState, useEffect, useRef } from 'react';
import { useGame } from '../../hooks/useGameState';
import { usePvP } from '../../hooks/usePvPSync';
import { GAME_PHASES } from '../../utils/constants';
import BluboAvatar from '../UI/BluboAvatar';

// ── Helpers ──────────────────────────────────────────────────────────────────
function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

// ── Spin Wheel ────────────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#00bfff', '#ff4444', '#b8d767', '#ffd700', '#ff69b4', '#aa44ff'];

function SpinWheel({ player1, player2, p1Fraction, winnerId, spinning, finalRotation }) {
  const SIZE = 280;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE / 2 - 18;
  const TICK_R = R + 8;

  const p1Deg = p1Fraction * 360;
  const p2Deg = 360 - p1Deg;

  const p1Color = PLAYER_COLORS[player1.iconIndex % PLAYER_COLORS.length] || '#00bfff';
  const p2Color = PLAYER_COLORS[(player2.iconIndex + 3) % PLAYER_COLORS.length] || '#ff4444';

  // Label positions (middle of each arc)
  const p1LabelAngle = p1Deg / 2;
  const p2LabelAngle = p1Deg + p2Deg / 2;
  const labelR = R * 0.62;
  const p1Label = polarToXY(CX, CY, labelR, p1LabelAngle);
  const p2Label = polarToXY(CX, CY, labelR, p2LabelAngle);

  // Tick marks every 10 degrees
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Pointer triangle – stays fixed */}
      <div style={{
        position: 'absolute',
        top: -2,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        width: 0, height: 0,
        borderLeft: '12px solid transparent',
        borderRight: '12px solid transparent',
        borderTop: '28px solid #ffd700',
        filter: 'drop-shadow(0 0 10px rgba(255,215,0,1))',
      }} />

      {/* Wheel */}
      <div style={{
        transform: `rotate(${finalRotation}deg)`,
        transition: spinning
          ? 'transform 5.5s cubic-bezier(0.12, 0.8, 0.2, 1)'
          : 'none',
        borderRadius: '50%',
      }}>
        <svg width={SIZE} height={SIZE}>
          {/* Shadow ring */}
          <circle cx={CX} cy={CY} r={R + 4} fill="rgba(0,0,0,0.5)" />

          {/* P1 segment */}
          <path d={arcPath(CX, CY, R, 0, p1Deg)} fill={p1Color} opacity={0.85} />
          {/* P2 segment */}
          <path d={arcPath(CX, CY, R, p1Deg, 360)} fill={p2Color} opacity={0.85} />

          {/* Segment dividers */}
          {[0, p1Deg].map((a, i) => {
            const pt = polarToXY(CX, CY, R, a);
            return <line key={i} x1={CX} y1={CY} x2={pt.x} y2={pt.y} stroke="#1a1a2e" strokeWidth={3} />;
          })}

          {/* Tick marks */}
          {ticks.map(deg => {
            const inner = polarToXY(CX, CY, R, deg);
            const outer = polarToXY(CX, CY, TICK_R, deg);
            const isMajor = deg % 30 === 0;
            return (
              <line key={deg}
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={isMajor ? 2.5 : 1}
              />
            );
          })}

          {/* Outer ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
          <circle cx={CX} cy={CY} r={TICK_R + 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

          {/* P1 label */}
          {p1Deg > 30 && (
            <text x={p1Label.x} y={p1Label.y}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={p1Deg > 80 ? 11 : 9}
              fontFamily="'Press Start 2P', monospace"
              style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 3 }}
            >
              {Math.round(p1Fraction * 100)}%
            </text>
          )}

          {/* P2 label */}
          {p2Deg > 30 && (
            <text x={p2Label.x} y={p2Label.y}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={p2Deg > 80 ? 11 : 9}
              fontFamily="'Press Start 2P', monospace"
              style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 3 }}
            >
              {Math.round((1 - p1Fraction) * 100)}%
            </text>
          )}

          {/* Center hub */}
          <circle cx={CX} cy={CY} r={16} fill="#1a1a2e" stroke="#ffd700" strokeWidth={3} />
          <circle cx={CX} cy={CY} r={6} fill="#ffd700" />
        </svg>
      </div>

      {/* Player color labels below wheel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: p1Color }} />
          <span style={{ color: '#aaa', fontSize: 7, fontFamily: 'Press Start 2P' }}>
            {player1.name.slice(0, 8)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#aaa', fontSize: 7, fontFamily: 'Press Start 2P' }}>
            {player2.name.slice(0, 8)}
          </span>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: p2Color }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Showdown ─────────────────────────────────────────────────────────────
export default function Showdown() {
  const { state, dispatch } = useGame();
  const pvp = usePvP();

  const [phase, setPhase] = useState('countdown'); // countdown | spinning | result
  const [countdown, setCountdown] = useState(5);
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [finalRotation, setFinalRotation] = useState(0);
  const [flash, setFlash] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const flippedRef = useRef(false);

  const finalists = state.players.filter(p => !p.eliminated).sort((a, b) => b.bankroll - a.bankroll);
  const player1 = finalists[0];
  const player2 = finalists[1];

  if (!player1 || !player2) return null;

  const total = player1.bankroll + player2.bankroll;
  const p1Fraction = player1.bankroll / total;
  const p1Chance = Math.round(p1Fraction * 100);
  const p2Chance = 100 - p1Chance;

  // ── Spin the wheel and land on winner ────────────────────────────────────
  const spinWheel = (winnerPlayer) => {
    if (flippedRef.current) return;
    flippedRef.current = true;

    const p1Deg = p1Fraction * 360;
    const margin = 12; // degrees away from segment edge

    let targetAngle;
    if (winnerPlayer.id === player1.id) {
      // Land in P1's segment (0° → p1Deg), avoid edges
      const safeRange = Math.max(p1Deg - 2 * margin, 1);
      targetAngle = margin + Math.random() * safeRange;
    } else {
      // Land in P2's segment (p1Deg → 360°), avoid edges
      const safeRange = Math.max((360 - p1Deg) - 2 * margin, 1);
      targetAngle = p1Deg + margin + Math.random() * safeRange;
    }

    // 8 full spins + landing angle
    const totalDeg = 8 * 360 + targetAngle;

    setPhase('spinning');
    setSpinning(true);
    setFinalRotation(totalDeg);

    // After spin animation completes (5.5s), show result
    setTimeout(() => {
      setSpinning(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      setWinner(winnerPlayer);
      setPhase('result');
    }, 5700);
  };

  // ── Auto-countdown then request flip ─────────────────────────────────────
  useEffect(() => {
    let count = 5;
    setCountdown(count);

    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      setPulseIntensity(5 - count); // 0→4 increasingly intense
      if (count <= 0) {
        clearInterval(interval);
        if (state.isPvP) {
          pvp.sendRequestFlip();
          // Show wheel immediately while waiting for server response
          setPhase('waiting');
        } else {
          const roll = Math.random();
          spinWheel(roll < p1Fraction ? player1 : player2);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ── PvP: receive winner from server ──────────────────────────────────────
  useEffect(() => {
    if (!state.isPvP || !state.pvpShowdownWinnerId) return;
    const winnerPlayer = [player1, player2].find(p => p.id === state.pvpShowdownWinnerId);
    if (winnerPlayer) spinWheel(winnerPlayer);
  }, [state.pvpShowdownWinnerId]);

  // ── After result: transition to results screen ────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || !winner) return;
    const timer = setTimeout(() => {
      if (!state.isPvP) {
        const loser = [player1, player2].find(p => p.id !== winner.id);
        if (loser) dispatch({ type: 'ELIMINATE_PLAYER', playerId: loser.id });
      }
      dispatch({ type: 'SET_PHASE', phase: GAME_PHASES.RESULTS });
    }, 5000);
    return () => clearTimeout(timer);
  }, [phase, winner]);

  const showWheel = phase === 'spinning' || phase === 'waiting' || phase === 'result';

  return (
    <div
      className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        // Border flash on winner reveal
        boxShadow: flash
          ? 'inset 0 0 80px 40px rgba(255,215,0,0.35)'
          : phase === 'spinning'
            ? `inset 0 0 ${40 + Math.random() * 20}px rgba(255,68,68,0.08)`
            : 'none',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Scanline overlay for drama */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />

      {/* Red vignette during spinning */}
      {phase === 'spinning' && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,30,30,0.12) 100%)',
          animation: 'showdown-vignette 0.8s ease-in-out infinite alternate',
        }} />
      )}

      <div className="text-center z-10 flex flex-col items-center gap-4 px-4">

        {/* Title */}
        <div style={{
          color: '#ff4444',
          fontFamily: 'Press Start 2P',
          fontSize: phase === 'countdown' ? 14 : 11,
          letterSpacing: '0.15em',
          textShadow: `0 0 ${20 + pulseIntensity * 8}px rgba(255,68,68,${0.6 + pulseIntensity * 0.1})`,
          animation: phase === 'spinning' ? 'showdown-title-pulse 0.5s ease-in-out infinite alternate' : 'none',
          transition: 'all 0.3s',
          marginBottom: 4,
        }}>
          ⚡ FINAL SHOWDOWN ⚡
        </div>

        {/* Finalists row */}
        <div className="flex items-center gap-4 md:gap-10">
          {/* Player 1 */}
          <div style={{
            textAlign: 'center',
            padding: 12,
            borderRadius: 10,
            transition: 'all 0.6s',
            background: phase === 'result' && winner?.id === player1.id
              ? 'rgba(0,191,255,0.15)' : 'transparent',
            border: phase === 'result' && winner?.id === player1.id
              ? '2px solid rgba(0,191,255,0.6)' : '2px solid transparent',
            boxShadow: phase === 'result' && winner?.id === player1.id
              ? '0 0 30px rgba(0,191,255,0.4)' : 'none',
            opacity: phase === 'result' && winner && winner.id !== player1.id ? 0.35 : 1,
          }}>
            <BluboAvatar iconIndex={player1.iconIndex} size={70} />
            <div style={{ fontSize: 8, marginTop: 8, color: player1.id === state.humanPlayerId ? '#00bfff' : '#ccc', fontFamily: 'Press Start 2P' }}>
              {player1.name}
            </div>
            <div style={{ fontSize: 10, marginTop: 4, color: '#b8d767', fontFamily: 'Press Start 2P' }}>
              ${player1.bankroll.toLocaleString()}
            </div>
            <div style={{
              fontSize: 14, marginTop: 4,
              color: p1Chance >= 50 ? '#b8d767' : '#ff8844',
              textShadow: `0 0 8px ${p1Chance >= 50 ? 'rgba(184,215,103,0.5)' : 'rgba(255,136,68,0.5)'}`,
              fontFamily: 'Press Start 2P',
            }}>
              {p1Chance}%
            </div>
          </div>

          {/* Centre content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: showWheel ? 310 : 80 }}>

            {/* Countdown */}
            {phase === 'countdown' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 8, color: '#888', fontFamily: 'Press Start 2P', marginBottom: 8,
                  letterSpacing: '0.2em',
                }}>
                  SPINNING IN
                </div>
                <div
                  key={countdown}
                  style={{
                    fontSize: countdown <= 2 ? 96 : 72,
                    fontFamily: 'Press Start 2P',
                    color: countdown <= 1 ? '#ff4444' : countdown <= 2 ? '#ff8844' : '#ffd700',
                    textShadow: `0 0 ${30 + (5 - countdown) * 15}px ${countdown <= 2 ? 'rgba(255,68,68,0.9)' : 'rgba(255,215,0,0.9)'}`,
                    lineHeight: 1,
                    animation: 'countdown-pop 0.25s ease-out',
                    display: 'block',
                  }}
                >
                  {countdown}
                </div>
                <div style={{
                  fontSize: 18, marginTop: 8,
                  color: '#ff4444',
                  textShadow: '0 0 20px rgba(255,68,68,0.6)',
                  fontFamily: 'Press Start 2P',
                  animation: 'vs-pulse 0.8s ease-in-out infinite alternate',
                }}>
                  VS
                </div>
              </div>
            )}

            {/* Waiting for server */}
            {phase === 'waiting' && (
              <div style={{ fontSize: 8, color: '#888', fontFamily: 'Press Start 2P', animation: 'vs-pulse 0.6s ease-in-out infinite alternate' }}>
                DECIDING FATE...
              </div>
            )}

            {/* Spin wheel */}
            {showWheel && (
              <div style={{ position: 'relative' }}>
                {/* Outer glow ring */}
                <div style={{
                  position: 'absolute', inset: -12,
                  borderRadius: '50%',
                  boxShadow: spinning
                    ? '0 0 40px 10px rgba(255,215,0,0.3), 0 0 80px 20px rgba(255,68,68,0.15)'
                    : phase === 'result'
                      ? '0 0 60px 20px rgba(255,215,0,0.5)'
                      : '0 0 20px 5px rgba(255,215,0,0.15)',
                  transition: 'box-shadow 0.5s',
                  pointerEvents: 'none',
                }} />
                <SpinWheel
                  player1={player1}
                  player2={player2}
                  p1Fraction={p1Fraction}
                  winnerId={winner?.id}
                  spinning={spinning}
                  finalRotation={finalRotation}
                />
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div style={{
            textAlign: 'center',
            padding: 12,
            borderRadius: 10,
            transition: 'all 0.6s',
            background: phase === 'result' && winner?.id === player2.id
              ? 'rgba(255,68,68,0.12)' : 'transparent',
            border: phase === 'result' && winner?.id === player2.id
              ? '2px solid rgba(255,68,68,0.6)' : '2px solid transparent',
            boxShadow: phase === 'result' && winner?.id === player2.id
              ? '0 0 30px rgba(255,68,68,0.4)' : 'none',
            opacity: phase === 'result' && winner && winner.id !== player2.id ? 0.35 : 1,
          }}>
            <BluboAvatar iconIndex={player2.iconIndex} size={70} />
            <div style={{ fontSize: 8, marginTop: 8, color: player2.id === state.humanPlayerId ? '#00bfff' : '#ccc', fontFamily: 'Press Start 2P' }}>
              {player2.name}
            </div>
            <div style={{ fontSize: 10, marginTop: 4, color: '#b8d767', fontFamily: 'Press Start 2P' }}>
              ${player2.bankroll.toLocaleString()}
            </div>
            <div style={{
              fontSize: 14, marginTop: 4,
              color: p2Chance >= 50 ? '#b8d767' : '#ff8844',
              textShadow: `0 0 8px ${p2Chance >= 50 ? 'rgba(184,215,103,0.5)' : 'rgba(255,136,68,0.5)'}`,
              fontFamily: 'Press Start 2P',
            }}>
              {p2Chance}%
            </div>
          </div>
        </div>

        {/* Prize pool */}
        <div className="game-panel px-6 py-3 inline-block" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 7, color: '#666', marginBottom: 6, fontFamily: 'Press Start 2P', letterSpacing: '0.1em' }}>
            PRIZE POOL ${state.prizePool.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 6, color: '#555', fontFamily: 'Press Start 2P' }}>1ST (70%)</div>
              <div style={{ fontSize: 10, color: '#ffd700', fontFamily: 'Press Start 2P', marginTop: 2 }}>
                ${Math.floor(state.prizePool * 0.7).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 6, color: '#555', fontFamily: 'Press Start 2P' }}>2ND (30%)</div>
              <div style={{ fontSize: 10, color: '#00bfff', fontFamily: 'Press Start 2P', marginTop: 2 }}>
                ${(state.prizePool - Math.floor(state.prizePool * 0.7)).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Winner announcement */}
        {phase === 'result' && winner && (
          <div className="bounce-in" style={{ textAlign: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>👑</div>
            <div style={{
              fontSize: 16,
              color: '#ffd700',
              textShadow: '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4)',
              fontFamily: 'Press Start 2P',
              animation: 'winner-glow 0.6s ease-in-out infinite alternate',
              marginBottom: 8,
            }}>
              {winner.name} WINS!
            </div>
            <div style={{ fontSize: 9, color: '#b8d767', fontFamily: 'Press Start 2P' }}>
              Takes home ${Math.floor(state.prizePool * 0.7).toLocaleString()}
            </div>
            <div style={{ fontSize: 7, color: '#555', fontFamily: 'Press Start 2P', marginTop: 8 }}>
              Loading results...
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div style={{ fontSize: 7, color: '#555', fontFamily: 'Press Start 2P', marginTop: 4 }}>
            Odds based on chip count
          </div>
        )}

        {phase === 'spinning' && (
          <div style={{
            fontSize: 8, color: '#ff4444', fontFamily: 'Press Start 2P',
            animation: 'vs-pulse 0.4s ease-in-out infinite alternate',
            letterSpacing: '0.2em',
          }}>
            SPINNING...
          </div>
        )}
      </div>
    </div>
  );
}
