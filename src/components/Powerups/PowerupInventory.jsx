import { useState } from 'react';
import { useGame, applyPowerup } from '../../hooks/useGameState';
import { usePvP } from '../../hooks/usePvPSync';
import { sfx } from '../../utils/sounds';


export default function PowerupInventory({ onShowGuide }) {
  const { state, dispatch } = useGame();
  const pvp = usePvP();
  const player = state.players.find(p => p.id === state.humanPlayerId);
  const [showTargetPicker, setShowTargetPicker] = useState(null);

  if (!player) return null;

  const handleUsePowerup = (index) => {
    const powerup = player.powerups[index];
    if (!powerup) return;

    if (powerup.type === 'attack') {
      sfx.powerupActivate();
      setShowTargetPicker(index);
    } else {
      sfx.powerupActivate();
      dispatch({ type: 'REMOVE_POWERUP', playerId: player.id, index });
      if (state.isPvP && pvp) {
        pvp.sendUsePowerup(powerup.id, null);
      } else {
        applyPowerup(powerup, player.id, null, dispatch, state);
      }
      dispatch({ type: 'ADD_NOTIFICATION', notification: { text: `Used ${powerup.name}!`, type: 'success' } });
    }
  };

  const handleTarget = (targetId) => {
    const powerup = player.powerups[showTargetPicker];
    dispatch({ type: 'REMOVE_POWERUP', playerId: player.id, index: showTargetPicker });
    if (state.isPvP && pvp) {
      pvp.sendUsePowerup(powerup.id, targetId);
    } else {
      applyPowerup(powerup, player.id, targetId, dispatch, state);
    }
    setShowTargetPicker(null);
  };

  const targets = state.players.filter(p => !p.eliminated && p.id !== player.id);

  return (
    <div className="relative">
      <div className="flex gap-2 items-center">
        {[0, 1].map(slot => {
          const powerup = player.powerups[slot];
          return (
            <button
              key={slot}
              onClick={() => powerup && handleUsePowerup(slot)}
              className={`w-12 h-12 rounded flex items-center justify-center text-lg
                ${powerup ? `rarity-${powerup.rarity} cursor-pointer hover:scale-110 transition-transform` : 'border border-gray-700 opacity-30'}`}
              style={{
                background: powerup ? 'rgba(10, 15, 30, 0.8)' : 'rgba(10, 15, 30, 0.3)',
              }}
              title={powerup ? `${powerup.name}: ${powerup.description}` : 'Empty slot'}
            >
              {powerup ? powerup.icon : '?'}
            </button>
          );
        })}

        {/* Info button */}
        <button
          onClick={onShowGuide}
          className="flex items-center justify-center rounded-full text-gray-500 hover:text-white transition-colors"
          style={{
            width: 16,
            height: 16,
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: 9,
            fontFamily: 'Press Start 2P',
            background: 'rgba(10,15,30,0.6)',
            flexShrink: 0,
          }}
          title="View all power-ups"
        >
          ?
        </button>
      </div>

      {/* Active effects */}
      {player.activeEffects.length > 0 && (
        <div className="flex gap-1 mt-1">
          {player.activeEffects.map((effect, i) => (
            <div
              key={i}
              className="text-[6px] px-1 rounded"
              style={{
                background: effect.type === 'buff' ? 'rgba(184, 215, 103, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                border: `1px solid ${effect.type === 'buff' ? 'rgba(184, 215, 103, 0.4)' : 'rgba(255, 68, 68, 0.4)'}`,
                color: effect.type === 'buff' ? '#b8d767' : '#ff4444',
              }}
            >
              {effect.name}
            </div>
          ))}
        </div>
      )}

      {/* Target picker */}
      {showTargetPicker !== null && (
        <div className="absolute top-14 right-0 game-panel p-2 z-50 min-w-[160px]">
          <div className="text-[7px] text-gray-400 mb-2">SELECT TARGET:</div>
          {targets.map(t => (
            <button
              key={t.id}
              className="block w-full text-left text-[8px] px-2 py-1.5 hover:bg-white/5 rounded"
              onClick={() => handleTarget(t.id)}
            >
              {t.name} (${t.bankroll})
            </button>
          ))}
          <button
            className="block w-full text-left text-[7px] text-gray-500 px-2 py-1 mt-1"
            onClick={() => setShowTargetPicker(null)}
          >
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}
