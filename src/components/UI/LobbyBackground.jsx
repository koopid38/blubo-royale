import { useEffect, useState, useMemo } from 'react';

// ─── Glowing grid cells ───────────────────────────────────────────────────────
const GRID_SIZE = 40; // matches .grid-bg background-size
const MAX_GLOW = 7;   // max simultaneous glowing cells

function GridGlow() {
  const [glows, setGlows] = useState([]);

  useEffect(() => {
    const cols = Math.ceil(window.innerWidth / GRID_SIZE) + 1;
    const rows = Math.ceil(window.innerHeight / GRID_SIZE) + 1;

    const addGlow = () => {
      const col = Math.floor(Math.random() * cols);
      const row = Math.floor(Math.random() * rows);
      const id = `${col}-${row}-${Date.now()}`;
      const color = Math.random() > 0.6
        ? 'rgba(0,191,255,0.55)'
        : Math.random() > 0.5
          ? 'rgba(184,215,103,0.45)'
          : 'rgba(255,105,180,0.4)';

      setGlows(g => [
        ...g.slice(-(MAX_GLOW - 1)),
        { id, x: col * GRID_SIZE, y: row * GRID_SIZE, color },
      ]);

      // Remove this glow after its animation
      setTimeout(() => setGlows(g => g.filter(gl => gl.id !== id)), 2200);
    };

    const interval = setInterval(addGlow, 280);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {glows.map(g => (
        <div
          key={g.id}
          style={{
            position: 'fixed',
            left: g.x,
            top: g.y,
            width: GRID_SIZE,
            height: GRID_SIZE,
            pointerEvents: 'none',
            zIndex: 0,
            background: g.color,
            boxShadow: `0 0 18px 6px ${g.color}`,
            animation: 'grid-glow-pulse 2.2s ease-out forwards',
          }}
        />
      ))}
    </>
  );
}

// ─── Pixelated poker chips ────────────────────────────────────────────────────
const CHIP_COLORS = [
  { outer: '#e22', inner: '#fff', accent: '#e22' },  // red
  { outer: '#22c', inner: '#fff', accent: '#22c' },  // blue
  { outer: '#0a0', inner: '#fff', accent: '#0a0' },  // green
  { outer: '#888', inner: '#fff', accent: '#666' },  // grey/black
  { outer: '#c80', inner: '#fff', accent: '#c80' },  // gold
];

function PixelChip({ x, y, size, color, duration, delay, driftX, driftY, rotate }) {
  const s = size;
  const border = Math.max(2, Math.round(s * 0.1));
  const notch = Math.max(2, Math.round(s * 0.14));

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: s,
        height: s,
        pointerEvents: 'none',
        zIndex: 0,
        animation: `chip-float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        '--chip-drift-x': `${driftX}px`,
        '--chip-drift-y': `${driftY}px`,
        '--chip-rotate': `${rotate}deg`,
        imageRendering: 'pixelated',
      }}
    >
      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: color.outer,
        imageRendering: 'pixelated',
      }} />
      {/* Notch marks at cardinal points */}
      {[0, 90, 180, 270].map(deg => (
        <div key={deg} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: notch, height: border * 2,
          background: '#fff',
          transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(${-s / 2 + border}px)`,
          imageRendering: 'pixelated',
        }} />
      ))}
      {/* Inner circle */}
      <div style={{
        position: 'absolute',
        inset: s * 0.22,
        borderRadius: '50%',
        background: color.inner,
        border: `${border}px solid ${color.accent}`,
        imageRendering: 'pixelated',
      }} />
      {/* Center dot */}
      <div style={{
        position: 'absolute',
        inset: s * 0.38,
        borderRadius: '50%',
        background: color.accent,
        imageRendering: 'pixelated',
      }} />
    </div>
  );
}

const CHIP_COUNT = 12;

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function FloatingChips() {
  const chips = useMemo(() => {
    const rng = seededRng(99);
    return Array.from({ length: CHIP_COUNT }, (_, i) => ({
      id: i,
      x: `${rng() * 92}%`,
      y: `${rng() * 92}%`,
      size: 16 + Math.floor(rng() * 20),  // 16–36px
      color: CHIP_COLORS[Math.floor(rng() * CHIP_COLORS.length)],
      opacity: 0.18 + rng() * 0.28,
      duration: 5 + rng() * 9,
      delay: rng() * -14,
      driftX: (rng() - 0.5) * 50,
      driftY: -(15 + rng() * 45),
      rotate: (rng() - 0.5) * 80,
    }));
  }, []);

  return (
    <>
      {chips.map(c => (
        <div key={c.id} style={{ opacity: c.opacity }}>
          <PixelChip
            x={c.x} y={c.y} size={c.size}
            color={c.color}
            duration={c.duration} delay={c.delay}
            driftX={c.driftX} driftY={c.driftY}
            rotate={c.rotate}
          />
        </div>
      ))}
    </>
  );
}

// ─── Combined export ──────────────────────────────────────────────────────────
export default function LobbyBackground() {
  return <FloatingChips />;
}
