/**
 * Production server — serves the Vite build + WebSocket on a single port.
 * Usage: npm run build && npm run serve
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces for LAN access

// MIME types for static file serving
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

// ---- Static file server ----
const httpServer = http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // If file doesn't exist, serve index.html (SPA fallback)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ---- WebSocket server (import game logic from index.js) ----
// We inline the WS setup here, attaching to the same HTTP server
import { WebSocketServer } from 'ws';
import crypto from 'crypto';

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

const rooms = new Map();

function createRoom(hostName) {
  const id = crypto.randomBytes(3).toString('hex').toUpperCase();
  const room = {
    id, hostName,
    players: new Map(),
    phase: 'waiting', locked: false,
    minBet: GAME_CONFIG.STARTING_MIN_BET,
    matchTimer: 0,
    nextEscalation: GAME_CONFIG.BET_ESCALATION_INTERVAL,
    prizePool: 0,
    timeFrozen: false, timeFreezeEnd: 0,
    timerInterval: null, countdownTimer: null, showdownWinner: null,
  };
  rooms.set(id, room);
  return room;
}

function createPlayer(id, name, iconIndex, ws) {
  return {
    id, name, iconIndex, ws,
    ready: false,
    bankroll: GAME_CONFIG.STARTING_BANKROLL,
    rebuysLeft: GAME_CONFIG.MAX_REBUYS, rebuysUsed: 0,
    eliminated: false, eliminatedAt: null,
    lastBetTime: Date.now(),
    powerups: [], activeEffects: [],
    rebuyPromptSentAt: null,
  };
}

function getOpenRooms() {
  const list = [];
  for (const room of rooms.values()) {
    if (!room.locked && room.phase === 'waiting' && room.players.size < GAME_CONFIG.MAX_PLAYERS) {
      list.push({ id: room.id, hostName: room.hostName, playerCount: room.players.size, maxPlayers: GAME_CONFIG.MAX_PLAYERS });
    }
  }
  return list;
}

function serializePlayers(room) {
  return Array.from(room.players.values()).map(p => ({
    id: p.id, name: p.name, iconIndex: p.iconIndex, ready: p.ready,
    bankroll: p.bankroll, rebuysLeft: p.rebuysLeft, rebuysUsed: p.rebuysUsed,
    eliminated: p.eliminated, eliminatedAt: p.eliminatedAt,
    lastBetTime: p.lastBetTime, powerups: p.powerups, activeEffects: p.activeEffects,
  }));
}

function stateSync(room) {
  return {
    type: 'state_sync', players: serializePlayers(room),
    minBet: room.minBet, matchTimer: room.matchTimer,
    nextEscalation: room.nextEscalation, prizePool: room.prizePool,
    timeFrozen: room.timeFrozen, timeFreezeEnd: room.timeFreezeEnd,
  };
}

function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const player of room.players.values()) {
    if (player.ws?.readyState === 1) player.ws.send(data);
  }
}
function sendTo(player, msg) { if (player.ws?.readyState === 1) player.ws.send(JSON.stringify(msg)); }
function sendToWs(ws, msg) { if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); }

const browsingSockets = new Set();
function broadcastRoomList() {
  const list = getOpenRooms();
  const data = JSON.stringify({ type: 'room_list', rooms: list });
  for (const ws of browsingSockets) { if (ws.readyState === 1) ws.send(data); }
}

function startGameTimer(room) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  room.timerInterval = setInterval(() => {
    if (room.phase !== 'playing') { clearInterval(room.timerInterval); room.timerInterval = null; return; }
    room.matchTimer += 1000;
    if (!room.timeFrozen) room.nextEscalation -= 1000;
    if (room.nextEscalation <= 0 && !room.timeFrozen) {
      room.minBet *= GAME_CONFIG.BET_MULTIPLIER;
      room.nextEscalation = GAME_CONFIG.BET_ESCALATION_INTERVAL;
      broadcast(room, { type: 'notification', text: `MIN BET NOW $${room.minBet}!`, notificationType: 'warning' });
    }
    if (room.timeFrozen && Date.now() > room.timeFreezeEnd) { room.timeFrozen = false; room.timeFreezeEnd = 0; }
    const now = Date.now();
    for (const player of room.players.values()) player.activeEffects = player.activeEffects.filter(e => !e.expiresAt || e.expiresAt > now);
    for (const player of room.players.values()) {
      if (player.eliminated) continue;
      const idleMs = now - player.lastBetTime;
      if (idleMs > GAME_CONFIG.INACTIVITY_TIMEOUT) {
        const idleBeyondGrace = Math.floor((idleMs - GAME_CONFIG.INACTIVITY_TIMEOUT) / 1000);
        const drainRate = GAME_CONFIG.INACTIVITY_DRAIN_RATE * (1 + Math.floor(idleBeyondGrace / 10));
        player.bankroll = Math.max(0, player.bankroll - drainRate);
        if (idleBeyondGrace < 1) sendTo(player, { type: 'notification', text: 'IDLE DRAIN STARTED!', notificationType: 'warning' });
      }
    }
    for (const player of room.players.values()) {
      if (player.eliminated) continue;
      if (player.bankroll < room.minBet) {
        const canRebuy = player.rebuysLeft > 0 && room.minBet < GAME_CONFIG.REBUY_MAX_MIN_BET;
        if (canRebuy && !player.rebuyPromptSentAt) { player.rebuyPromptSentAt = now; sendTo(player, { type: 'rebuy_prompt' }); }
        else if (canRebuy && player.rebuyPromptSentAt && (now - player.rebuyPromptSentAt > GAME_CONFIG.REBUY_TIMEOUT)) eliminatePlayer(room, player.id);
        else if (!canRebuy) eliminatePlayer(room, player.id);
      }
    }
    const alive = Array.from(room.players.values()).filter(p => !p.eliminated);
    if (alive.length <= 2 && room.phase === 'playing') {
      room.phase = 'showdown'; clearInterval(room.timerInterval); room.timerInterval = null;
      broadcast(room, { type: 'phase_change', phase: 'showdown' });
      broadcast(room, stateSync(room));
      return;
    }
    broadcast(room, stateSync(room));
  }, 1000);
}

function eliminatePlayer(room, playerId) {
  const player = room.players.get(playerId);
  if (!player || player.eliminated) return;
  player.eliminated = true; player.eliminatedAt = Date.now(); player.rebuyPromptSentAt = null;
  broadcast(room, { type: 'player_eliminated', playerId });
  broadcast(room, { type: 'notification', text: `${player.name} eliminated!`, notificationType: 'attack' });
}

function startCountdown(room) {
  room.phase = 'countdown'; room.locked = true;
  room.prizePool = room.players.size * GAME_CONFIG.BUYIN_AMOUNT;
  for (const player of room.players.values()) { player.bankroll = GAME_CONFIG.STARTING_BANKROLL; player.lastBetTime = Date.now(); }
  broadcast(room, { type: 'phase_change', phase: 'countdown', count: 5, players: serializePlayers(room) });
  broadcastRoomList();
  let count = 5;
  room.countdownTimer = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(room.countdownTimer); room.countdownTimer = null;
      room.phase = 'playing';
      broadcast(room, { type: 'phase_change', phase: 'playing' });
      startGameTimer(room);
    } else {
      broadcast(room, { type: 'phase_change', phase: 'countdown', count });
    }
  }, 1000);
}

function checkAllReady(room) {
  if (room.phase !== 'waiting' || room.players.size < GAME_CONFIG.MIN_PLAYERS) return;
  if (Array.from(room.players.values()).every(p => p.ready)) startCountdown(room);
}

function handleShowdownFlip(room) {
  const finalists = Array.from(room.players.values()).filter(p => !p.eliminated).sort((a, b) => b.bankroll - a.bankroll);
  if (finalists.length < 2) return;
  const [p1, p2] = finalists;
  const total = p1.bankroll + p2.bankroll;
  const winnerId = Math.random() < (p1.bankroll / total) ? p1.id : p2.id;
  const loserId = winnerId === p1.id ? p2.id : p1.id;
  room.showdownWinner = winnerId;
  broadcast(room, { type: 'phase_change', phase: 'showdown_result', winnerId });
  setTimeout(() => {
    eliminatePlayer(room, loserId);
    room.phase = 'results';
    broadcast(room, { type: 'phase_change', phase: 'results' });
    broadcast(room, stateSync(room));
    setTimeout(() => { rooms.delete(room.id); broadcastRoomList(); }, 30000);
  }, 5000);
}

function applyPowerupServer(room, userId, targetId, powerup) {
  const user = room.players.get(userId);
  const target = targetId ? room.players.get(targetId) : null;
  switch (powerup.id) {
    case 'lucky_streak': if (user) user.activeEffects.push({ id: 'lucky_streak', name: 'Lucky Streak', type: 'buff', betsRemaining: 3 }); break;
    case 'double_down_shield': if (user) user.activeEffects.push({ id: 'double_down_shield', name: 'DD Shield', type: 'buff' }); break;
    case 'blubos_blessing': { const bonus = Math.floor(room.minBet * 0.25); if (user) user.bankroll += bonus; break; }
    case 'hot_hand': if (user) user.activeEffects.push({ id: 'hot_hand', name: 'Hot Hand', type: 'buff', expiresAt: Date.now() + 60000 }); break;
    case 'time_freeze': room.timeFrozen = true; room.timeFreezeEnd = Date.now() + 30000; broadcast(room, { type: 'notification', text: 'TIME FROZEN!', notificationType: 'info' }); break;
    case 'jinx': if (target) target.activeEffects.push({ id: 'jinx', name: 'Jinx', type: 'debuff', betsRemaining: 1 }); break;
    case 'chip_swipe': { if (target && user) { const amt = Math.min(Math.floor(target.bankroll * 0.1), 500); target.bankroll = Math.max(0, target.bankroll - amt); user.bankroll += amt; } break; }
    case 'blubos_wrath': if (target) target.activeEffects.push({ id: 'blubos_wrath', name: "Blubo's Wrath", type: 'debuff', betsRemaining: 1 }); break;
  }
}

function handleDisconnect(room, playerId, ws) {
  const player = room.players.get(playerId);
  if (!player) return;
  if (room.phase === 'waiting') {
    room.players.delete(playerId);
    broadcast(room, { type: 'player_list', players: serializePlayers(room) });
    if (room.players.size === 0) rooms.delete(room.id);
    broadcastRoomList();
  } else if (room.phase === 'playing' || room.phase === 'showdown') {
    player.ws = null;
    setTimeout(() => { if (!player.ws && !player.eliminated) eliminatePlayer(room, playerId); }, GAME_CONFIG.DISCONNECT_TIMEOUT);
  }
  if (ws) browsingSockets.delete(ws);
}

// ---- Attach WebSocket to HTTP server ----
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentPlayerId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'list_rooms': {
        browsingSockets.add(ws);
        sendToWs(ws, { type: 'room_list', rooms: getOpenRooms() });
        break;
      }
      case 'host': {
        browsingSockets.delete(ws);
        const room = createRoom(msg.name || 'Player');
        const playerId = crypto.randomUUID();
        const player = createPlayer(playerId, msg.name || 'Player', msg.iconIndex ?? 0, ws);
        room.players.set(playerId, player);
        currentRoom = room; currentPlayerId = playerId;
        sendTo(player, { type: 'room_joined', roomId: room.id, playerId, players: serializePlayers(room) });
        broadcastRoomList();
        break;
      }
      case 'join': {
        const room = rooms.get(msg.roomId);
        if (!room || room.locked || room.phase !== 'waiting' || room.players.size >= GAME_CONFIG.MAX_PLAYERS) {
          sendToWs(ws, { type: 'error', message: 'Room not available' });
          sendToWs(ws, { type: 'room_list', rooms: getOpenRooms() });
          return;
        }
        browsingSockets.delete(ws);
        const playerId = crypto.randomUUID();
        const player = createPlayer(playerId, msg.name || 'Player', msg.iconIndex ?? 0, ws);
        room.players.set(playerId, player);
        currentRoom = room; currentPlayerId = playerId;
        sendTo(player, { type: 'room_joined', roomId: room.id, playerId, players: serializePlayers(room) });
        broadcast(room, { type: 'player_list', players: serializePlayers(room) });
        broadcastRoomList();
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
        if (player) player.lastBetTime = Date.now();
        break;
      }
      case 'rebuy': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player || player.eliminated || player.rebuysLeft <= 0 || currentRoom.minBet >= GAME_CONFIG.REBUY_MAX_MIN_BET) return;
        player.bankroll = GAME_CONFIG.REBUY_BANKROLL; player.rebuysLeft--; player.rebuysUsed++; player.rebuyPromptSentAt = null;
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
        broadcast(currentRoom, { type: 'powerup_effect', userId: currentPlayerId, targetId: msg.targetId, powerup });
        const targetName = msg.targetId ? currentRoom.players.get(msg.targetId)?.name : null;
        if (targetName) broadcast(currentRoom, { type: 'notification', text: `${player.name} used ${powerup.name} on ${targetName}!`, notificationType: 'attack' });
        else broadcast(currentRoom, { type: 'notification', text: `${player.name} used ${powerup.name}!`, notificationType: 'success' });
        break;
      }
      case 'powerup_drop': {
        if (!currentRoom || !currentPlayerId) return;
        const player = currentRoom.players.get(currentPlayerId);
        if (!player || player.eliminated || player.powerups.length >= GAME_CONFIG.POWERUP_MAX_INVENTORY) return;
        if (msg.powerup) player.powerups.push(msg.powerup);
        break;
      }
      case 'request_flip': {
        if (!currentRoom || currentRoom.phase !== 'showdown' || currentRoom.showdownWinner) return;
        handleShowdownFlip(currentRoom);
        break;
      }
      case 'leave': {
        if (currentRoom && currentPlayerId) {
          handleDisconnect(currentRoom, currentPlayerId, ws);
          currentRoom = null; currentPlayerId = null;
        }
        browsingSockets.add(ws);
        sendToWs(ws, { type: 'room_list', rooms: getOpenRooms() });
        break;
      }
    }
  });

  ws.on('close', () => {
    browsingSockets.delete(ws);
    if (currentRoom && currentPlayerId) handleDisconnect(currentRoom, currentPlayerId, ws);
  });
});

// ---- Start ----
httpServer.listen(PORT, HOST, () => {
  console.log(`\n  Blubo Royale is live!\n`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Domain:  http://bluboroyale:${PORT}`);
  console.log(`  Network: http://${getLocalIP()}:${PORT}\n`);
});

function getLocalIP() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  } catch {}
  return '0.0.0.0';
}
