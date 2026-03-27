import { useEffect } from 'react';

export default function MysteryBox({ powerup, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!powerup) return null;

  const rarityColor = powerup.rarity === 'epic' ? '#aa44ff' : powerup.rarity === 'rare' ? '#4488ff' : '#888';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 pointer-events-auto" onClick={onClose}>
      <div className="mystery-box-anim game-panel p-6 text-center neon-glow-strong" style={{ borderColor: rarityColor }}>
        <div className="text-[7px] text-gray-400 mb-2">POWERUP DROP!</div>
        <div className="text-4xl mb-3">{powerup.icon}</div>
        <div className="text-[9px] mb-1" style={{ color: rarityColor }}>
          {powerup.rarity.toUpperCase()}
        </div>
        <div className="text-[10px] mb-1" style={{ color: '#00bfff' }}>{powerup.name}</div>
        <div className="text-[7px] text-gray-400">{powerup.description}</div>
        <div className="text-[6px] text-gray-600 mt-2">CLICK TO DISMISS</div>
      </div>
    </div>
  );
}
