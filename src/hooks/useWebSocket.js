import { useState, useEffect, useRef, useCallback } from 'react';

export default function useWebSocket(serverUrl) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnects = 5;
  const intentionalClose = useRef(false);
  const onOpenCallbacks = useRef([]);

  // Keep roomId/playerId in refs so reconnect logic can access them
  // without depending on React state (which may be stale in the closure)
  const roomIdRef = useRef(null);
  const playerIdRef = useRef(null);

  const connect = useCallback((onOpen) => {
    intentionalClose.current = false;
    onOpenCallbacks.current = onOpen ? [onOpen] : [];

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      onOpenCallbacks.current.forEach(cb => cb());
      onOpenCallbacks.current = [];
      return;
    }

    // Close any existing connection first
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return; // stale
      setConnected(true);
      reconnectAttempts.current = 0;

      // If we have a room/player from a previous session, auto-rejoin
      if (roomIdRef.current && playerIdRef.current) {
        ws.send(JSON.stringify({
          type: 'rejoin',
          roomId: roomIdRef.current,
          playerId: playerIdRef.current,
        }));
      }

      onOpenCallbacks.current.forEach(cb => cb());
      onOpenCallbacks.current = [];
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return; // stale
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room_joined' || msg.type === 'rejoin_ok') {
          roomIdRef.current = msg.roomId;
          playerIdRef.current = msg.playerId;
          setRoomId(msg.roomId);
          setPlayerId(msg.playerId);
        }
        setLastMessage(msg);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return; // stale
      setConnected(false);
      wsRef.current = null;

      if (!intentionalClose.current && reconnectAttempts.current < maxReconnects) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 8000);
        setTimeout(() => connect(), delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    onOpenCallbacks.current = [];
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'leave' })); } catch {}
      wsRef.current.close();
    }
    wsRef.current = null;
    roomIdRef.current = null;
    playerIdRef.current = null;
    setConnected(false);
    setRoomId(null);
    setPlayerId(null);
    setLastMessage(null);
  }, []);

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalClose.current = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { connected, roomId, playerId, connect, disconnect, send, lastMessage };
}
