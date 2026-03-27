import { POWERUPS } from '../../utils/constants';

const RARITY_COLORS = {
  common: { color: '#aaa', label: 'COMMON' },
  rare: { color: '#4488ff', label: 'RARE' },
  epic: { color: '#b44fff', label: 'EPIC' },
};

export default function PowerupGuide({ onClose }) {
  const boosts = Object.values(POWERUPS).filter(p => p.type === 'boost');
  const attacks = Object.values(POWERUPS).filter(p => p.type === 'attack');

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="game-panel w-full max-w-md mx-4 flex flex-col"
        style={{ height: 'calc(100vh - 80px)', maxHeight: 560 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — sticky, never scrolls */}
        <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '16px 20px 12px' }}>
          <div className="text-[10px] neon-text" style={{ color: '#00bfff' }}>POWER-UP GUIDE</div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            style={{ fontFamily: 'Press Start 2P', fontSize: 10 }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="px-5 pb-5 overflow-y-auto">

        {/* Boosts */}
        <div className="mb-4">
          <div className="text-[7px] mb-2 tracking-widest" style={{ color: '#b8d767' }}>⬆ BOOSTS — affect yourself</div>
          <div className="flex flex-col gap-2">
            {boosts.map(p => (
              <div key={p.id} className="flex items-start gap-3 px-2 py-2 rounded"
                style={{ background: 'rgba(184,215,103,0.04)', border: '1px solid rgba(184,215,103,0.1)' }}>
                <div className="text-xl flex-shrink-0">{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px]" style={{ color: '#ddd' }}>{p.name}</span>
                    <span className="text-[6px] px-1 rounded"
                      style={{ color: RARITY_COLORS[p.rarity].color, border: `1px solid ${RARITY_COLORS[p.rarity].color}44` }}>
                      {RARITY_COLORS[p.rarity].label}
                    </span>
                  </div>
                  <div className="text-[7px] text-gray-400 mt-0.5">{p.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attacks */}
        <div>
          <div className="text-[7px] mb-2 tracking-widest" style={{ color: '#ff4444' }}>⚔ ATTACKS — target an opponent</div>
          <div className="flex flex-col gap-2">
            {attacks.map(p => (
              <div key={p.id} className="flex items-start gap-3 px-2 py-2 rounded"
                style={{ background: 'rgba(255,68,68,0.04)', border: '1px solid rgba(255,68,68,0.1)' }}>
                <div className="text-xl flex-shrink-0">{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px]" style={{ color: '#ddd' }}>{p.name}</span>
                    <span className="text-[6px] px-1 rounded"
                      style={{ color: RARITY_COLORS[p.rarity].color, border: `1px solid ${RARITY_COLORS[p.rarity].color}44` }}>
                      {RARITY_COLORS[p.rarity].label}
                    </span>
                  </div>
                  <div className="text-[7px] text-gray-400 mt-0.5">{p.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>{/* end scrollable */}
      </div>
    </div>
  );
}
