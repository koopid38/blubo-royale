import { useState, useEffect } from 'react';
import { useGame } from '../../hooks/useGameState';
import BluboAvatar from '../UI/BluboAvatar';
import FloatingPlus from '../UI/FloatingPlus';
import PvPLobby from './PvPLobby';
import luckyLogicLogo from '../../assets/Lucky_Logic.png';
import { BLUBO_ICONS } from '../../utils/bluboIcons';
import { sfx } from '../../utils/sounds';

export default function Lobby() {
  const { dispatch } = useGame();

  // Start lobby music; clean up when leaving lobby (game starts)
  useEffect(() => {
    sfx.startLobbyMusic();
    return () => sfx.stopLobbyMusic();
  }, []);
  const [playerName, setPlayerName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [mode, setMode] = useState(null); // null = main lobby, 'pvp' = PvP lobby

  const handleStart = () => {
    if (!playerName.trim()) return;
    dispatch({ type: 'START_VS_AI', playerName: playerName.trim(), iconIndex: selectedIcon });
  };

  if (mode === 'pvp') {
    return <PvPLobby playerName={playerName} iconIndex={selectedIcon} onBack={() => setMode(null)} />;
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <FloatingPlus />

      {/* Main content */}
      <div className="flex flex-col items-center gap-6 z-10">
        {/* Lucky Logic branding */}
        <img src={luckyLogicLogo} alt="Lucky Logic" style={{ height: 80 }} />

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl title-flicker mb-1" style={{ color: '#00bfff', lineHeight: 1.4 }}>
            BLUBO
          </h1>
          <h2 className="text-2xl md:text-3xl title-flicker-green" style={{ color: '#b8d767', lineHeight: 1.4 }}>
            ROYALE
          </h2>
        </div>

        {/* Icon selector */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[7px] text-gray-400 tracking-widest">CHOOSE YOUR BLUBO</div>

          {/* Selected icon — click to open picker */}
          <button
            onClick={() => setShowIconPicker(true)}
            className="flex flex-col items-center gap-1 transition-transform hover:scale-105"
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            <BluboAvatar iconIndex={selectedIcon} size={120} glow={false} />
            <div
              className="text-[6px] tracking-widest"
              style={{ color: '#00bfff', fontFamily: 'Press Start 2P' }}
            >
              EDIT
            </div>
          </button>
        </div>

        {/* Icon picker modal */}
        {showIconPicker && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', zIndex: 9999 }}
            onClick={() => setShowIconPicker(false)}
          >
            <div
              className="game-panel flex flex-col"
              style={{ padding: '20px 24px', maxWidth: 360, width: '90%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="text-[9px]" style={{ color: '#00bfff', fontFamily: 'Press Start 2P' }}>CHOOSE YOUR BLUBO</div>
                <button
                  onClick={() => setShowIconPicker(false)}
                  className="text-gray-400 hover:text-white"
                  style={{ fontFamily: 'Press Start 2P', fontSize: 10 }}
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {BLUBO_ICONS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedIcon(i); setShowIconPicker(false); }}
                    className="relative rounded-md transition-all hover:scale-110"
                    style={{
                      padding: 3,
                      border: selectedIcon === i ? '2px solid #00bfff' : '2px solid rgba(255,255,255,0.1)',
                      boxShadow: selectedIcon === i ? '0 0 14px rgba(0,191,255,0.6)' : 'none',
                      background: selectedIcon === i ? 'rgba(0,191,255,0.1)' : 'transparent',
                      cursor: 'pointer',
                      borderRadius: 8,
                    }}
                  >
                    <BluboAvatar iconIndex={i} size={52} glow={false} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Name input */}
        <div className="flex flex-col items-center gap-3">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="ENTER YOUR NAME"
            maxLength={16}
            className="game-panel px-4 py-3 text-center text-xs outline-none w-64"
            style={{
              fontFamily: 'Press Start 2P',
              color: '#00bfff',
              background: 'rgba(0, 20, 40, 0.8)',
              border: '1px solid rgba(0, 191, 255, 0.3)',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
        </div>

        {/* Mode buttons */}
        <div className="flex flex-col gap-4">
          <button
            className="game-btn game-btn-green text-sm px-8 py-4"
            onClick={handleStart}
            onMouseEnter={() => setHoveredBtn('ai')}
            onMouseLeave={() => setHoveredBtn(null)}
            disabled={!playerName.trim()}
            style={{ opacity: playerName.trim() ? 1 : 0.4, cursor: playerName.trim() ? 'pointer' : 'not-allowed' }}
          >
            VS AI
          </button>
          <button
            className="game-btn text-sm px-8 py-4"
            onClick={() => playerName.trim() && setMode('pvp')}
            disabled={!playerName.trim()}
            style={{
              borderColor: '#00bfff',
              color: '#00bfff',
              opacity: playerName.trim() ? 1 : 0.4,
              cursor: playerName.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            PVP MODE
          </button>
        </div>

      </div>
    </div>
  );
}
