import { useMemo } from 'react';

const PLUS_COUNT = 22;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function FloatingPlus() {
  const plusItems = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: PLUS_COUNT }, (_, i) => ({
      id: i,
      top: `${rng() * 95}%`,
      left: `${rng() * 95}%`,
      size: 10 + Math.floor(rng() * 28), // 10–38px
      color: rng() > 0.5 ? '#b8d767' : rng() > 0.5 ? '#00bfff' : '#ff69b4',
      opacity: 0.15 + rng() * 0.35,
      duration: 4 + rng() * 8, // 4–12s
      delay: rng() * -12,       // staggered start
      driftX: (rng() - 0.5) * 60, // -30 to +30px horizontal drift
      driftY: -(20 + rng() * 50),  // -20 to -70px upward drift
      rotate: (rng() - 0.5) * 60, // -30 to +30 deg
    }));
  }, []);

  return (
    <>
      {plusItems.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            top: p.top,
            left: p.left,
            fontSize: p.size,
            fontWeight: 'bold',
            color: p.color,
            opacity: p.opacity,
            pointerEvents: 'none',
            zIndex: 0,
            animation: `plus-drift ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            '--drift-x': `${p.driftX}px`,
            '--drift-y': `${p.driftY}px`,
            '--rotate': `${p.rotate}deg`,
            fontFamily: 'monospace',
            userSelect: 'none',
          }}
        >
          +
        </div>
      ))}
    </>
  );
}
