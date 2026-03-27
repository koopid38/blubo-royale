import { WebSocketServer } from 'ws';
import crypto from 'crypto';

const PORT = process.env.PORT || 3001;

// ---- Game constants (mirror client-side) ----
const GAME_CONFIG = {
  STARTING_BANKROLL: 1000,
  STARTING_MIN_BET: 10,
  BET_ESCALATION_INTERVAL: 60000,
  BET_MULTIPLIER: 2,
  INACTIVITY_TIMEOUT: 30000,
  INACTIVITY_DRAIN_RATE: 5,
  MAX_REBUYS: 3,
  REBUY_BANKROLL: 1000,
  REBUY_COST: 10,
  REBUY_MAX_MIN_BET: 320,
  BUYIN_AMOUNT: 10,
  MAX_PLAYERS: 10,
  MIN_PLAYERS: 2,
  POWERUP_MAX_INVENTORY: 2,
  REBUY_TIMEOUT: 10000,
  DISCONNECT_TIMEOUT: 15000,
};

// ---- Room & Player ----
const rooms = new Map();

function createRoom(hostName) {
  const id = crypto.randomBytes(3).toString('hex').toUpperCase();
  const room = {
    id,
    hostName,
    players: new Map(),
    phase: 'waiting',
    locked: false,
    minBet: GAME_CONFIG.STARTING_MIN_BET,
    matchTimer: 0,
    nextEscalation: GAME_CONFIG.BET_ESCALATION_INTERVAL,
    prizePool: 0,
    timeFrozen: false,
    timeFreezeEnd: 0,
    timerInterval: null,
    countdownTimer: null,
    showdownWinner: null,
  };
  rooms.set(id, room);
  return room;
}

function createPlayer(id, name, iconIndex, ws) {
  return {
    id,
    name,
    iconIndex,
    ws,
    ready: false,
    bankroll: GAME_CONFIG.STARTING_BANKROLL,
    rebuysLeft: GAME_CONFIG.MAX_REBUYS,
    rebuysUsed: 0,
    eliminated: false,
    eliminatedAt: null,
    lastBetTime: Date.now(),
    powerups: [],
    activeEffects: [],
    rebuyPromptSentAt: null,
  };
}

function getOpenRooms() {
  const list = [];
  for (const room of rooms.values()) {
    if (!room.locked && room.phase === 'waiting' && room.players.size < GAME_CONFIG.MAX_PLAYERS) {
      list.push({
        id: room.id,
        hostName: room.hostName,
        playerCount: room.players.size,
        maxPlayers: GAME_CONFIG.MAX_PLAYERS,
      });
    }
  }
  return list;
}

// ---- Serialization (strip ws refs before sending) ----
function serializePlayers(room) {
  return Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    iconIndex: p.iconIndex,
    ready: p.ready,
    bankroll: p.bankroll,
    rebuysLeft: p.rebuysLeft,
    rebuysUsed: p.rebuysUsed,
    eliminated: p.eliminated,
    eliminatedAt: p.eliminatedAt,
    lastBetTime: p.lastBetTime,
    powerups: p.powerups,
    activeEffects: p.activeEffects,
  }));
}

function stateSync(room) {
  return {
    type: 'state_sync',
    players: serializePlayers(room),
    minBet: room.minBet,
    matchTimer: room.matchTimer,
    nextEscalation: room.nextEscalation,
    prizePool: room.prizePool,
    timeFrozen: room.timeFrozen,
    timeFreezeEnd: room.timeFreezeEnd,
  };
}

// ---- Broadcasting ----
function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const player of room.players.values()) {
    if (player.ws?.readyState === 1) {
      player.ws.send(data);
    }
  }
}

function sendTo(player, msg) {
  if (player.ws?.readyState === 1) {
    player.ws.send(JSON.stringify(msg));
  }
}

function sendToWs(ws, msg) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

// Broadcast room list to all connected clients not in a room
const browsingSockets = new Set();

function broadcastRoomList() {
  const list = getOpenRooms();
  const data = JSON.stringify({ type: 'room_list', rooms: list });
  for (const ws of browsingSockets) {
    if (ws.readyState === 1) {
      ws.send(data);
    }
  }
}

// ---- Game Timer (runs every 1s during playing phase) ----
function startGameTimer(room) {
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    if (room.phase !== 'playing') {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      return;
    }

    room.matchTimer += 1000;

    // Bet escalation
    if (!room.timeFrozen) {
      room.nextEscalation -= 1000;
    }
    if (room.nextEscalation <= 0 && !room.timeFrozen) {
      room.minBet *= GAME_CONFIG.BET_MULTIPLIER;
      room.nextEscalation = GAME_CONFIG.BET_ESCALATION_INTERVAL;
      broadcast(room, { type: 'notification', text: `MIN BET NOW $${room.minBet}!`, notificationType: 'warning' });
    }

    // Time freeze expiry
    if (room.timeFrozen && Date.now() > room.timeFreezeEnd) {
      room.timeFrozen = false;
      room.timeFreezeEnd = 0;
    }

    // Clear expired effects
    const now = Date.now();
    for (const player of room.players.values()) {
      player.activeEffects = player.activeEffects.filter(e => !e.expiresAt || e.expiresAt > now);
    }

    // Idle drain for all players
    for (const player of room.players.values()) {
      if (player.eliminated) continue;
      const idleMs = now - player.lastBetTime;
      if (idleMs > GAME_CONFIG.INACTIVITY_TIMEOUT) {
        const idleBeyondGrace = Math.floor((idleMs - GAME_CONFIG.INACTIVITY_TIMEOUT) / 1000);
        const drainRate = GAME_CONFIG.INACTIVITY_DRAIN_RATE * (1 + Math.floor(idleBeyondGrace / 10));
        player.bankroll = Math.max(0, player.bankroll - drainRate);
        if (idleBeyondGrace < 1) {
          sendTo(player, { type: 'notification', text: 'IDLE DRAIN STARTED!', notificationType: 'warning' });
        }
      }
    }

    // Check eliminations
    for (const player of room.players.values()) {
      if (player.eliminated) continue;
      if (player.bankroll < room.minBet) {
        const canRebuy = player.rebuysLeft > 0 && room.minBet < GAME_CONFIG.REBUY_MAX_MIN_BET;
        if (canRebuy && !player.rebuyPromptSentAt) {
          player.rebuyPromptSentAt = now;
          sendTo(player, { type: 'rebuy_prompt' });
        } else if (canRebuy && player.rebuyPromptSentAt && (now - player.rebuyPromptSentAt > GAME_CONFIG.REBUY_TIMEOUT)) {
          eliminatePlayer(room, player.id);
        } else if (!canRebuy) {
          eliminatePlayer(room, player.id);
        }
      }
    }

    // Check showdown condition (2 or fewer alive)
    const alive = Array.from(room.players.values()).filter(p => !p.eliminated);
    if (alive.length <= 2 && room.phase === 'playing') {
      room.phase = 'showdown';
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      broadcast(room, { type: 'phase_change', phase: 'showdown' });
      broadcast(room, stateSync(room));
      return;
    }

    // Broadcast state
    broadcast(room, stateSync(room));
  }, 1000);
}

function eliminatePlayer(room, playerId) {
  const player = room.players.get(playerId);
  if (!player || player.eliminated) return;
  player.eliminated = true;
  player.eliminatedAt = Date.now();
  player.rebuyPromptSentAt = null;
  broadcast(room, { type: 'player_eliminated', playerId });
  broadcast(room, { type: 'notification', text: `${player.name} eliminated!`, notificationType: 'attack' });
}

// ---- Countdown ----
function startCountdown(room) {
  room.phase = 'countdown';
  room.locked = true;
  room.prizePool = room.players.size * GAME_CONFIG.BUYIN_AMOUNT;

  // Initialize all player bankrolls
  for (const player of room.players.values()) {
    player.bankroll = GAME_CONFIG.STARTING_BANKROLL;
    player.lastBetTime = Date.now();
  }

  broadcast(room, { type: 'phase_change', phase: 'countdown', count: 5, players: serializePlayers(room) });
  broadcastRoomList(); // Room is now locked, update browsers

  let count = 5;
  room.countdownTimer = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
      room.phase = 'playing';
      broadcast(room, { type: 'phase_change', phase: 'playing' });
      startGameTimer(room);
    } else {
      broadcast(room, { type: 'phase_change', phase: 'countdown', count });
    }
  }, 1000);
}

// ---- Check if all players ready ----
function checkAllReady(room) {
  if (room.phase !== 'waiting') return;
  if (room.players.size < GAME_CONFIG.MIN_PLAYERS) return;
  const allReady = Array.from(room.players.values()).every(p => p.ready);
  if (allReady) {
    startCountdown(room);
  }
}

// ---- Handle showdown flip ----
function handleShowdownFlip(room) {
  const finalists = Array.from(room.players.values())
    .filter(p => !p.eliminated)
    .sort((a, b) => b.bankroll - a.bankroll);

  if (finalists.length < 2) return;

  const [p1, p2] = finalists;
  const total = p1.bankroll + p2.bankroll;
  const p1Chance = p1.bankroll / total;
  const winnerId = Math.random() < p1Chance ? p1.id : p2.id;
  const loserId = winnerId === p1.id ? p2.id : p1.id;

  room.showdownWinner = winnerId;
  broadcast(room, { type: 'phase_change', phase: 'showdown_result', winnerId });

  setTimeout(() => {
    eliminatePlayer(room, loserId);
    room.phase = 'results';
    broadcast(room, { type: 'phase_change', phase: 'results' });
    broadcast(room, stateSync(room));

    setTimeout(() => {
      rooms.delete(room.id);
      broadcastRoomList();
    }, 30000);
  }, 5000);
}

// ---- Powerup application on server ----
function applyPowerupServer(room, userId, targetId, powerup) {
  const user = room.players.get(userId);
  const target = targetId ? room.players.get(targetId) : null;

  switch (powerup.id) {
    case 'lucky_streak':
      if (user) user.activeEffects.push({ id: 'lucky_streak', name: 'Lucky Streak', type: 'buff', betsRemaining: 3 });
      break;
    case 'double_down_shield':
      if (user) user.activeEffects.push({ id: 'double_down_shield', name: 'DD Shield', type: 'buff' });
      break;
    case 'blubos_blessing': {
      const bonus = Math.floor(room.minBet * 0.25);
      if (user) user.bankroll += bonus;
      break;
    }
    case 'hot_hand':
      if (user) user.activeEffects.push({ id: 'hot_hand', name: 'Hot Hand', type: 'buff', expiresAt: Date.now() + 60000 });
      break;
    case 'time_freeze':
      room.timeFrozen = true;
      room.timeFreezeEnd = Date.now() + 30000;
      broadcast(room, { type: 'notification', text: 'TIME FROZEN!', notificationType: 'info' });
      break;
    case 'jinx':
      if (target) target.activeEffects.push({ id: 'jinx', name: 'Jinx', type: 'debuff', betsRemaining: 1 });
      break;
    case 'chip_swipe': {
      if (target && user) {
        const amount = Math.min(Math.floor(target.bankroll * 0.1), 500);
        target.bankroll = Math.max(0, target.bankroll - amount);
        user.bankroll += amount;
      }
      break;
    }
    case 'screen_scramble':
      break;
    case 'bankroll_freeze':
      break;
    case 'blubos_wrath':
      if (target) target.activeEffects.push({ id: 'blubos_wrath', name: "Blubo's Wrath", type: 'debuff', betsRemaining: 1 });
      break;
  }
}

// ---- Handle disconnect ----
function handleDisconnect(room, playerId, ws) {
  const player = room.players.get(playerId);
  if (!player) return;

  if (room.phase === 'waiting') {
    room.players.delete(playerId);
    broadcast(room, { type: 'player_list', players: serializePlayers(room) });
    if (room.players.size === 0) {
      rooms.delete(room.id);
    }
    broadcastRoomList();
  } else if (room.phase === 'playing' || room.phase === 'showdown') {
    player.ws = null;
    setTimeout(() => {
      if (!player.ws && !player.eliminated) {
        eliminatePlayer(room, playerId);
      }
    }, GAME_CONFIG.DISCONNECT_TIMEOUT);
  }

  // Remove from browsing set if present
  if (ws) browsingSockets.delete(ws);
}

// ---- WebSocket Server ----
const wss = new WebSocketServer({ port: PORT });

// Ping/pong heartbeat
const HEARTBEAT_INTERVAL = 25000;
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);
wss.on('close', () => clearInterval(heartbeat));

wss.on('listening', () => {
  console.log(`Blubo Royale server running on ws://localhost:${PORT}`);
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  let currentRoom = null;
  let currentPlayerId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      // ---- Lobby browsing ----
      case 'list_rooms': {
        browsingSockets.add(ws);
        sendToWs(ws, { type: 'room_list', rooms: getOpenRooms() });
        break;
      }

      // Rejoin an active game after reconnect
      case 'rejoin': {
        const room = rooms.get(msg.roomId);
        if (!room) { sendToWs(ws, { type: 'error', message: 'Room no longer exists' }); return; }
        const player = room.players.get(msg.playerId);
        if (!player) { sendToWs(ws, { type: 'error', message: 'Player not found in room' }); return; }
        player.ws = ws;
        currentRoom = room;
        currentPlayerId = msg.playerId;
        browsingSockets.delete(ws);
        sendToWs(ws, { type: 'rejoin_ok', roomId: room.id, playerId: msg.playerId, phase: room.phase });
        sendToWs(ws, stateSync(room));
        console.log(`Player ${player.name} rejoined room ${room.id}`);
        break;
      }

      case 'host': {
        // Leave browsing mode
        browsingSockets.delete(ws);

        const room = createRoom(msg.name || 'Player');
        const playerId = crypto.randomUUID();
        const player = createPlayer(playerId, msg.name || 'Player', msg.iconIndex ?? 0, ws);
        room.players.set(playerId, player);

        currentRoom = room;
        currentPlayerId = playerId;

        sendTo(player, {
          type: 'room_joined',
          roomId: room.id,
          playerId,
          players: serializePlayers(room),
        });

        broadcastRoomList(); // New room available
        break;
      }

      case 'join': {
        // Join a specific room by ID
        const roomId = msg.roomId;
        const room = rooms.get(roomId);
        if (!room || room.locked || room.phase !== 'waiting' || room.players.size >= GAME_CONFIG.MAX_PLAYERS) {
          sendToWs(ws, { type: 'error', message: 'Room not available' });
          // Refresh their room list
          sendToWs(ws, { type: 'room_list', rooms: getOpenRooms() });
          return;
        }

        // Leave browsing mode
        browsingSockets.delete(ws);

        const playerId = crypto.randomUUID();
        const player = createPlayer(playerId, msg.name || 'Player', msg.iconIndex ?? 0, ws);
        room.players.set(playerId, player);

        currentRoom = room;
        currentPlayerId = playerId;

        sendTo(player, {
          type: 'room_joined',
          roomId: room.id,
          playerId,
          players: serializePlayers(room),
        });

        broadcast(room, { type: 'player_list', players: serializePlayers(room) });
        broadcastRoomList(); // Update player count
        break;
      }

      case 'ready': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player || currentRoom.phase !== 'waiting') return;
        player.ready = !player.ready;
        broadcast(currentRoom, { type: 'player_list', players: serializePlayers(currentRoom) });
        checkAllReady(currentRoom);
        break;
      }

      case 'bet_result': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player || player.eliminated) return;
        player.bankroll = Math.max(0, player.bankroll + (msg.amount || 0));
        break;
      }

      case 'record_bet': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player) return;
        player.lastBetTime = Date.now();
        break;
      }

      case 'rebuy': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player || player.eliminated) return;
        if (player.rebuysLeft <= 0 || currentRoom.minBet >= GAME_CONFIG.REBUY_MAX_MIN_BET) return;
        player.bankroll = GAME_CONFIG.REBUY_BANKROLL;
        player.rebuysLeft--;
        player.rebuysUsed++;
        player.rebuyPromptSentAt = null;
        currentRoom.prizePool += GAME_CONFIG.REBUY_COST;
        broadcast(currentRoom, { type: 'notification', text: `${player.name} re-bought!`, notificationType: 'info' });
        break;
      }

      case 'decline_rebuy': {
        if (!currentRoom || !currentPlayerId) return;
        eliminatePlayer(currentRoom, currentPlayerId);
        break;
      }

      case 'use_powerup': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player || player.eliminated) return;

        const idx = player.powerups.findIndex(p => p.id === msg.powerupId);
        if (idx === -1) return;
        const powerup = player.powerups[idx];
        player.powerups.splice(idx, 1);

        applyPowerupServer(currentRoom, currentPlayerId, msg.targetId, powerup);

        broadcast(currentRoom, {
          type: 'powerup_effect',
          userId: currentPlayerId,
          targetId: msg.targetId,
          powerup,
        });

        const targetName = msg.targetId ? currentRoom.players.get(msg.targetId)?.name : null;
        if (targetName) {
          broadcast(currentRoom, { type: 'notification', text: `${player.name} used ${powerup.name} on ${targetName}!`, notificationType: 'attack' });
        } else {
          broadcast(currentRoom, { type: 'notification', text: `${player.name} used ${powerup.name}!`, notificationType: 'success' });
        }
        break;
      }

      case 'powerup_drop': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player || player.eliminated) return;
        if (player.powerups.length >= GAME_CONFIG.POWERUP_MAX_INVENTORY) return;
        if (msg.powerup) {
          player.powerups.push(msg.powerup);
        }
        break;
      }

      case 'request_flip': {
        if (!currentRoom || currentRoom.phase !== 'showdown') return;
        if (currentRoom.showdownWinner) return;
        handleShowdownFlip(currentRoom);
        break;
      }

      case 'leave': {
        if (currentRoom && currentPlayerId) {
          handleDisconnect(currentRoom, currentPlayerId, ws);
          currentRoom = null;
          currentPlayerId = null;
        }
        // Go back to browsing
        browsingSockets.add(ws);
        sendToWs(ws, { type: 'room_list', rooms: getOpenRooms() });
        break;
      }
    }
  });

  ws.on('close', () => {
    browsingSockets.delete(ws);
    if (currentRoom && currentPlayerId) {
      handleDisconnect(currentRoom, currentPlayerId, ws);
    }
  });
});
