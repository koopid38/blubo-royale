import { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import useWebSocket from './useWebSocket';
import { SERVER_URL } from '../utils/constants';

const PvPContext = createContext(null);

export function PvPProvider({ children }) {
  const ws = useWebSocket(SERVER_URL);
  const dispatchRef = useRef(null);
  const stateRef = useRef(null);
  const [roomList, setRoomList] = useState([]);

  // Called by GameProvider to register its dispatch
  const registerDispatch = useCallback((dispatch, state) => {
    dispatchRef.current = dispatch;
    stateRef.current = state;
  }, []);

  // Process incoming messages
  useEffect(() => {
    if (!ws.lastMessage) return;
    const msg = ws.lastMessage;
    const dispatch = dispatchRef.current;

    // Room list can arrive before game dispatch is registered
    if (msg.type === 'room_list') {
      setRoomList(msg.rooms || []);
      return;
    }

    if (!dispatch) return;

    switch (msg.type) {
      case 'room_joined':
        // Server sends initial player list when we join/host
        dispatch({ type: 'PVP_PLAYER_LIST', players: msg.players || [] });
        break;

      case 'player_list':
        dispatch({ type: 'PVP_PLAYER_LIST', players: msg.players });
        break;

      case 'phase_change':
        if (msg.phase === 'countdown' && msg.players) {
          dispatch({
            type: 'START_PVP',
            playerId: ws.playerId,
            players: msg.players,
          });
          dispatch({ type: 'PVP_COUNTDOWN', count: msg.count });
        } else if (msg.phase === 'countdown') {
          dispatch({ type: 'PVP_COUNTDOWN', count: msg.count });
        } else if (msg.phase === 'playing') {
          dispatch({ type: 'SET_PHASE', phase: 'playing' });
        } else if (msg.phase === 'showdown') {
          dispatch({ type: 'SET_PHASE', phase: 'showdown' });
        } else if (msg.phase === 'showdown_result') {
          dispatch({ type: 'PVP_SHOWDOWN_RESULT', winnerId: msg.winnerId });
        } else if (msg.phase === 'results') {
          // Only transition to results if we're not mid-showdown animation
          // The Showdown component handles its own transition after the wheel stops
          const currentState = stateRef.current;
          if (currentState?.phase !== 'showdown') {
            dispatch({ type: 'SET_PHASE', phase: 'results' });
          }
          // If in showdown, the Showdown component will dispatch SET_PHASE(RESULTS) itself
        }
        break;

      case 'state_sync': {
        // Destructure out msg.type to prevent it overwriting the action type
        const { type: _, ...payload } = msg;
        dispatch({ type: 'SYNC_PVP_STATE', ...payload });
        break;
      }

      case 'player_eliminated':
        dispatch({ type: 'PVP_PLAYER_ELIMINATED', playerId: msg.playerId });
        break;

      case 'powerup_effect': {
        const state = stateRef.current;
        const humanId = state?.humanPlayerId;
        if (msg.targetId === humanId) {
          if (msg.powerup?.id === 'screen_scramble') {
            dispatch({ type: 'SET_SCRAMBLE', scrambled: true });
          } else if (msg.powerup?.id === 'bankroll_freeze') {
            dispatch({ type: 'SET_BANKROLL_FREEZE', frozen: true });
          }
          dispatch({ type: 'SCREEN_SHAKE' });
          setTimeout(() => dispatch({ type: 'CLEAR_SHAKE' }), 400);
        }
        dispatch({
          type: 'ADD_NOTIFICATION',
          notification: {
            text: msg.powerup ? `${msg.powerup.name} used!` : 'Power-up activated!',
            type: msg.targetId === humanId ? 'attack' : 'info',
          },
        });
        break;
      }

      case 'rebuy_prompt':
        dispatch({ type: 'SHOW_REBUY_PROMPT', show: true });
        break;

      case 'notification':
        dispatch({
          type: 'ADD_NOTIFICATION',
          notification: { text: msg.text, type: msg.notificationType || 'info' },
        });
        break;

      case 'error':
        dispatch({
          type: 'ADD_NOTIFICATION',
          notification: { text: msg.message || 'Error', type: 'warning' },
        });
        break;
    }
  }, [ws.lastMessage, ws.playerId]);

  // Helpers for sending messages
  const sendBetResult = useCallback((amount) => {
    ws.send('bet_result', { amount });
  }, [ws.send]);

  const sendRecordBet = useCallback(() => {
    ws.send('record_bet');
  }, [ws.send]);

  const sendRebuy = useCallback(() => {
    ws.send('rebuy');
  }, [ws.send]);

  const sendDeclineRebuy = useCallback(() => {
    ws.send('decline_rebuy');
  }, [ws.send]);

  const sendUsePowerup = useCallback((powerupId, targetId) => {
    ws.send('use_powerup', { powerupId, targetId });
  }, [ws.send]);

  const sendPowerupDrop = useCallback((powerup) => {
    ws.send('powerup_drop', { powerup });
  }, [ws.send]);

  const sendReady = useCallback(() => {
    ws.send('ready');
  }, [ws.send]);

  const sendRequestFlip = useCallback(() => {
    ws.send('request_flip');
  }, [ws.send]);

  // Connect to server and request room list (for browsing)
  const connectAndBrowse = useCallback(() => {
    ws.connect(() => {
      ws.send('list_rooms');
    });
  }, [ws]);

  // Host a new room
  const hostRoom = useCallback((name, iconIndex) => {
    ws.send('host', { name, iconIndex });
  }, [ws.send]);

  // Join a specific room by ID
  const joinRoom = useCallback((roomId, name, iconIndex) => {
    ws.send('join', { roomId, name, iconIndex });
  }, [ws.send]);

  // Leave room (back to browsing or disconnect)
  const leaveRoom = useCallback(() => {
    ws.send('leave');
  }, [ws.send]);

  // Full disconnect
  const disconnect = useCallback(() => {
    ws.disconnect();
  }, [ws.disconnect]);

  // Refresh room list
  const refreshRooms = useCallback(() => {
    ws.send('list_rooms');
  }, [ws.send]);

  const value = {
    connected: ws.connected,
    roomId: ws.roomId,
    playerId: ws.playerId,
    roomList,
    registerDispatch,
    sendBetResult,
    sendRecordBet,
    sendRebuy,
    sendDeclineRebuy,
    sendUsePowerup,
    sendPowerupDrop,
    sendReady,
    sendRequestFlip,
    connectAndBrowse,
    hostRoom,
    joinRoom,
    leaveRoom,
    disconnect,
    refreshRooms,
  };

  return <PvPContext.Provider value={value}>{children}</PvPContext.Provider>;
}

export function usePvP() {
  return useContext(PvPContext);
}
