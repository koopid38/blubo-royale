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

      {/* Target picker — full-screen modal */}
      {showTargetPicker !== null && (() => {
        const activePowerup = player.powerups[showTargetPicker];
        return (
          <div
            className="fixed inset-0 flex items-center justify-center z-[200]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
            onClick={() => setShowTargetPicker(null)}
          >
            <div
              className="game-panel flex flex-col"
              style={{
                width: 300,
                maxHeight: '75vh',
                border: '1px solid rgba(255,68,68,0.6)',
                boxShadow: '0 0 30px rgba(255,68,68,0.25)',
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Fixed header */}
              <div className="text-center shrink-0" style={{ padding: '16px 20px 12px' }}>
                {activePowerup && (
                  <div className="text-2xl mb-1">{activePowerup.icon}</div>
                )}
                <div className="text-[8px]" style={{ color: '#ff4444', fontFamily: 'Press Start 2P' }}>
                  {activePowerup?.name ?? 'ATTACK'}
                </div>
                <div className="text-[6px] mt-1" style={{ color: '#aaa', fontFamily: 'Press Start 2P' }}>
                  SELECT TARGET
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,68,68,0.25)', margin: '0 16px' }} />

              {/* Scrollable player list */}
              <div
                className="flex flex-col gap-1.5 overflow-y-auto"
                style={{ padding: '10px 16px', flex: 1 }}
              >
                {targets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTarget(t.id)}
                    className="flex items-center justify-between rounded-lg"
                    style={{
                      padding: '9px 12px',
                      background: 'rgba(255,68,68,0.06)',
                      border: '1px solid rgba(255,68,68,0.25)',
                      fontFamily: 'Press Start 2P',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,68,68,0.18)';
                      e.currentTarget.style.borderColor = 'rgba(255,68,68,0.7)';
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(255,68,68,0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,68,68,0.06)';
                      e.currentTarget.style.borderColor = 'rgba(255,68,68,0.25)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span className="text-[9px]" style={{ color: '#fff' }}>{t.name}</span>
                    <span className="text-[8px]" style={{ color: '#b8d767' }}>${t.bankroll.toLocaleString()}</span>
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0 16px' }} />

              {/* Fixed cancel */}
              <div className="shrink-0" style={{ padding: '10px 16px' }}>
                <button
                  onClick={() => setShowTargetPicker(null)}
                  className="w-full rounded-lg"
                  style={{
                    padding: '8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#888',
                    fontFamily: 'Press Start 2P',
                    fontSize: 8,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
