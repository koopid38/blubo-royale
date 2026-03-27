import { useEffect, useState } from 'react';
import { usePvP } from '../../hooks/usePvPSync';
import { useGame } from '../../hooks/useGameState';
import BluboAvatar from '../UI/BluboAvatar';
import FloatingPlus from '../UI/FloatingPlus';
import { GAME_CONFIG } from '../../utils/constants';

export default function PvPLobby({ playerName, iconIndex, onBack }) {
  const pvp = usePvP();
  const { state, dispatch } = useGame();
  const [view, setView] = useState('menu'); // menu, browse, room

  // Connect to server on mount for browsing
  useEffect(() => {
    pvp.connectAndBrowse();
    // NOTE: Do NOT disconnect on unmount — the game transitioning to countdown/playing
    // unmounts this component but the WebSocket must stay alive for state_sync.
    // Disconnection is handled explicitly by BACK/LEAVE buttons.
  }, []);

  // When we get a roomId, we're in a room
  useEffect(() => {
    if (pvp.roomId) {
      dispatch({ type: 'PVP_PLAYER_LIST', players: [] });
      setView('room');
    }
  }, [pvp.roomId]);

  const players = state.pvpLobbyPlayers || [];
  const myPlayer = players.find(p => p.id === pvp.playerId);
  const isReady = myPlayer?.ready || false;

  const handleHost = () => {
    pvp.hostRoom(playerName, iconIndex);
  };

  const handleJoin = (roomId) => {
    pvp.joinRoom(roomId, playerName, iconIndex);
  };

  const handleLeaveRoom = () => {
    pvp.leaveRoom();
    setView('browse');
  };

  const handleBack = () => {
    pvp.disconnect();
    onBack();
  };

  // --- Room view (in a lobby waiting for game) ---
  if (view === 'room' && pvp.roomId) {
    return (
      <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
        <FloatingPlus />
        <div className="flex flex-col items-center gap-6 z-10">
          <div className="text-center">
            <div className="text-[10px] neon-text mb-2" style={{ color: '#00bfff' }}>PVP LOBBY</div>
            <div className="game-panel px-4 py-2 text-center">
              <div className="text-[7px] text-gray-400 mb-1">ROOM CODE</div>
              <div className="text-lg" style={{ color: '#ffd700', fontFamily: 'Press Start 2P' }}>
                {pvp.roomId}
              </div>
            </div>
          </div>

          <div className="game-panel p-4" style={{ minWidth: 320, maxWidth: 400, width: '90%' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[8px] text-gray-400">PLAYERS</div>
              <div className="text-[8px]" style={{ color: '#00bfff' }}>
                {players.length}/{GAME_CONFIG.MAX_PLAYERS}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {players.length === 0 && (
                <div className="text-[8px] text-gray-500 text-center py-4">
                  Waiting for players...
                </div>
              )}
              {players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded"
                  style={{
                    background: p.id === pvp.playerId ? 'rgba(0,191,255,0.1)' : 'rgba(10,15,30,0.6)',
                    border: p.id === pvp.playerId ? '1px solid rgba(0,191,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <BluboAvatar iconIndex={p.iconIndex} size={32} glow={false} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] truncate" style={{ color: p.id === pvp.playerId ? '#00bfff' : '#ccc' }}>
                      {p.name} {p.id === pvp.playerId && '(YOU)'}
                    </div>
                  </div>
                  <div
                    className="text-[7px] px-2 py-0.5 rounded"
                    style={{
                      background: p.ready ? 'rgba(184,215,103,0.2)' : 'rgba(255,255,255,0.05)',
                      color: p.ready ? '#b8d767' : '#666',
                      border: `1px solid ${p.ready ? 'rgba(184,215,103,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {p.ready ? 'READY' : 'NOT READY'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[7px] text-center" style={{
            color: players.length < 3 ? '#ff8844' : '#b8d767'
          }}>
            {players.length < 3
              ? `Need ${3 - players.length} more player${3 - players.length === 1 ? '' : 's'} to start (min 3)`
              : 'Waiting for all players to ready up...'}
          </div>

          <div className="flex gap-4">
            <button
              className="game-btn text-[9px] px-6 py-3"
              style={{ borderColor: '#666', color: '#666' }}
              onClick={handleLeaveRoom}
            >
              LEAVE
            </button>
            <button
              className={`game-btn text-[9px] px-6 py-3 ${isReady ? 'game-btn-red' : 'game-btn-green'}`}
              onClick={() => pvp.sendReady()}
              disabled={!pvp.connected || players.length < 3}
              style={{ opacity: (pvp.connected && players.length >= 3) ? 1 : 0.4 }}
            >
              {isReady ? 'UNREADY' : 'READY'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Browse / Menu view ---
  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <FloatingPlus />
      <div className="flex flex-col items-center gap-6 z-10">
        <div className="text-[10px] neon-text mb-2" style={{ color: '#00bfff' }}>PVP MODE</div>

        {!pvp.connected && (
          <div className="text-[8px]" style={{ color: '#ff4444' }}>
            CONNECTING TO SERVER...
          </div>
        )}

        {pvp.connected && (
          <>
            {/* Host button */}
            <button
              className="game-btn game-btn-green text-sm px-8 py-4"
              onClick={handleHost}
              style={{ minWidth: 260 }}
            >
              HOST GAME
            </button>

            {/* Available rooms */}
            <div className="game-panel p-4" style={{ minWidth: 320, maxWidth: 420, width: '90%' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[8px] text-gray-400">OPEN LOBBIES</div>
                <button
                  className="text-[7px] px-2 py-0.5 rounded"
                  style={{ color: '#00bfff', border: '1px solid rgba(0,191,255,0.3)', background: 'transparent' }}
                  onClick={() => pvp.refreshRooms()}
                >
                  REFRESH
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {pvp.roomList.length === 0 && (
                  <div className="text-[8px] text-gray-500 text-center py-4">
                    No open lobbies — be the first to host!
                  </div>
                )}
                {pvp.roomList.map(room => (
                  <button
                    key={room.id}
                    className="flex items-center justify-between px-3 py-3 rounded transition-colors hover:bg-white/5"
                    style={{
                      background: 'rgba(10,15,30,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onClick={() => handleJoin(room.id)}
                  >
                    <div className="text-left">
                      <div className="text-[8px]" style={{ color: '#ffd700' }}>
                        {room.hostName}'s Lobby
                      </div>
                      <div className="text-[6px] text-gray-500 mt-0.5">
                        Room {room.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px]" style={{ color: '#00bfff' }}>
                        {room.playerCount}/{room.maxPlayers}
                      </div>
                      <div className="text-[6px]" style={{ color: '#b8d767' }}>
                        JOIN
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button
          className="game-btn text-[9px] px-6 py-3"
          style={{ borderColor: '#666', color: '#666' }}
          onClick={handleBack}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
