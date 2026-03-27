import { useState, useEffect } from 'react';

const CHARS = '!@#$%^&*?<>{}[]|\\/~0123456789ABCDEFX$£¥€±§';
const COLS = 24;
const ROWS = 12;
const TOTAL = COLS * ROWS;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function ScrambleOverlay() {
  const [cells, setCells] = useState(() => Array.from({ length: TOTAL }, randomChar));

  useEffect(() => {
    const interval = setInterval(() => {
      setCells(prev => prev.map(() => Math.random() < 0.6 ? randomChar() : ' '));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          width: '100%',
          height: '100%',
          opacity: 0.45,
        }}
      >
        {cells.map((ch, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: Math.random() < 0.3 ? '#ff4444' : '#00bfff',
            }}
          >
            {ch}
          </div>
        ))}
      </div>
    </div>
  );
}
