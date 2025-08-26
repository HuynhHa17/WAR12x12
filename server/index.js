import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ====== Game config ======
const BOARD_SIZE = 12;
const PLACE_MS = 120_000;
const SPIN_MS = 15_000;
const FIRE_MS = 60_000;
const GAME_MS = 15 * 60_000;

const AMMO_POOL = ['1x1', '1x2', '2x2', '1x3', 'burst', 'radar'];
const TERRAIN_TYPES = ['desert', 'jungle', 'prairie', 'ice'];

// ====== Room store ======
const rooms = new Map(); // code -> room
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

function mkEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => ({
    o: false, // obstacle
    h: false, // hit (was fired at)
    u: null   // unit type if any ('commander', 'radar', ...)
  })));
}

function genObstacles(terrain) {
  const target = { desert: 0.10, jungle: 0.20, prairie: 0.12, ice: 0.08 }[terrain] || 0.12;
  const cells = BOARD_SIZE * BOARD_SIZE;
  const count = Math.round(cells * target);
  const board = mkEmptyBoard();
  let placed = 0;
  while (placed < count) {
    const x = Math.floor(Math.random() * BOARD_SIZE);
    const y = Math.floor(Math.random() * BOARD_SIZE);
    if (!board[y][x].o) { board[y][x].o = true; placed++; }
  }
  return board;
}

// -------- placement helpers ----------
function rot(dx, dy, dir) {
  switch (dir) {
    case 'N': return [dx, dy];
    case 'E': return [dy, -dx];
    case 'S': return [-dx, -dy];
    case 'W': return [-dy, dx];
    default: return [dx, dy];
  }
}
function cellsFor(type, x, y, dir) {
  const out = [];
  const stamp = (w, h) => {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const [rx, ry] = rot(xx, yy, dir || 'N');
        out.push({ x: x + rx, y: y + ry });
      }
  };
  if (type === 'commander') stamp(1, 1);
  else if (type === 'artillery') stamp(1, 2);
  else if (type === 'armor') stamp(2, 2);
  else if (type === 'missile') stamp(1, 4);
  else if (type === 'radar') stamp(2, 2);
  return out;
}
function placeUnitsOnBoard(board, units) {
  for (const u of (units || [])) {
    const cells = cellsFor(u.type, u.x, u.y, u.dir);
    for (const c of cells) {
      if (c.x < 0 || c.y < 0 || c.x >= BOARD_SIZE || c.y >= BOARD_SIZE) continue;
      board[c.y][c.x].u = u.type;
    }
  }
}

// ---------- public state ----------
function roomPublicState(room, forSocketId) {
  return {
    code: room.code,
    phase: room.phase, // waiting | placing | coin | playing | ended
    players: room.players.map(p => ({
      id: p.id, name: p.name, ready: !!p.ready, me: p.id === forSocketId
    })),
    timers: {
      placingEndsAt: room.timers.placingEndsAt || null,
      spinEndsAt: room.timers.spinEndsAt || null,
      fireEndsAt: room.timers.fireEndsAt || null,
      gameEndsAt: room.gameEndsAt || null,
    },
    turn: room.turn ? { current: room.turn.current } : null,
    winnerId: room.winnerId || null,
    reason: room.reason || null,
  };
}

function mkRoom() {
  const code = genCode();
  const room = {
    code,
    createdAt: Date.now(),
    phase: 'waiting',
    players: [], // {id, name, ready, mapType, board, placed, aliveRadar, skips, rematch}
    timers: {},
    turn: null,  // { current, ammo, spun, fired }
    gameEndsAt: null,
    _spinTO: null,
    _fireTO: null,
    winnerId: null,
    reason: null,
  };
  rooms.set(code, room);
  return room;
}

function getRoomBySocket(socketId) {
  for (const r of rooms.values()) {
    if (r.players.some(p => p.id === socketId)) return r;
  }
  return null;
}
function getOpponent(room, id) { return room.players.find(p => p.id !== id); }

function broadcast(room) {
  room.players.forEach(p => {
    io.to(p.id).emit('room:update', roomPublicState(room, p.id));
  });
}





// ====== turn engine ======
function clearTurnTimers(room) {
  if (room._spinTO) { clearTimeout(room._spinTO); room._spinTO = null; }
  if (room._fireTO) { clearTimeout(room._fireTO); room._fireTO = null; }
}
function startPlaying(room, firstId) {
  room.phase = 'playing';
  room.gameEndsAt = Date.now() + GAME_MS;
  room.turn = { current: firstId, ammo: null, spun: false, fired: false };
  room.timers.spinEndsAt = null;
  room.timers.fireEndsAt = null;
  room.winnerId = null;
  room.reason = null;
  room.players.forEach(p => p.rematch = false);
  broadcast(room);
  beginSpinWindow(room);
}
function beginSpinWindow(room) {
  if (room.phase !== 'playing' || !room.turn) return;
  clearTurnTimers(room);




  const shooterId = room.turn.current;
  room.timers.spinEndsAt = Date.now() + SPIN_MS;
  room.timers.fireEndsAt = null;

  io.to(shooterId).emit('turn:begin', { deadline: room.timers.spinEndsAt });
  broadcast(room);

  room._spinTO = setTimeout(() => {
    if (room.phase !== 'playing' || room.turn.current !== shooterId || room.turn.spun) return;
    doSpin(room, shooterId, /*auto*/true);
  }, SPIN_MS + 25);
}
function doSpin(room, shooterId, auto = false) {
  if (room.phase !== 'playing' || room.turn.current !== shooterId) return;
  if (room.turn.spun) return;

  const ammo = AMMO_POOL[Math.floor(Math.random() * AMMO_POOL.length)];
  room.turn.spun = true;
  room.turn.ammo = ammo;
  room.timers.fireEndsAt = Date.now() + FIRE_MS;
  room.timers.spinEndsAt = null;

  io.to(shooterId).emit('spin:result', { ammo, fireEndsAt: room.timers.fireEndsAt });




  room._fireTO = setTimeout(() => {
    if (room.phase !== 'playing' || room.turn.current !== shooterId || room.turn.fired) return;
    const me = room.players.find(p => p.id === shooterId);
    const opp = getOpponent(room, shooterId);
    me.skips = (me.skips || 0) + 1;
    if (me.skips >= 3) {
      endGame(room, opp?.id || null, 'three_skips');
      return;
    }
    switchTurn(room);
  }, FIRE_MS + 50);
}
function switchTurn(room) {
  clearTurnTimers(room);
  if (room.phase !== 'playing' || !room.turn) return;

  const shooter = room.players.find(p => p.id === room.turn.current);
  const opp = getOpponent(room, shooter.id);
  room.turn = { current: opp.id, ammo: null, spun: false, fired: false };
  room.timers.spinEndsAt = null;
  room.timers.fireEndsAt = null;

  if (Date.now() > room.gameEndsAt) {
    endGame(room, null, 'timeout');
    return;
  }
  broadcast(room);
  beginSpinWindow(room);
}
function endGame(room, winnerId, reason) {
  clearTurnTimers(room);
  room.phase = 'ended';
  room.winnerId = winnerId || null;
  room.reason = reason || null;
  room.timers.spinEndsAt = null;
  room.timers.fireEndsAt = null;
  room.players.forEach(p => io.to(p.id).emit('game:over', { winnerId, reason }));
  broadcast(room);
}

function resetToWaiting(room) {
  clearTurnTimers(room);
  room.phase = 'waiting';
  room.turn = null;
  room.timers = {};
  room.gameEndsAt = null;
  room.winnerId = null;
  room.reason = null;
  room.players.forEach(p => {
    p.ready = false;
    p.placed = false;
    p.board = null;
    p.mapType = null;
    p.aliveRadar = true;
    p.skips = 0;
    p.rematch = false;
  });
  broadcast(room);
  room.players.forEach(p => io.to(p.id).emit('room:reset'));
}

// ====== Apply a shot ======
function applyShot(board, target, shape) {
  const hits = [];
  function hit(x, y) {
    if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return;
    const cell = board[y][x];
    cell.h = true;
    hits.push({ x, y, unit: cell.u });
  }
  const { x, y, dir } = target;
  const D = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[dir || 'N'];
  if (shape === '1x1') { hit(x, y); }
  else if (shape === '1x2') { hit(x, y); hit(x + D[0], y + D[1]); }
  else if (shape === '1x3') { hit(x, y); hit(x + D[0], y + D[1]); hit(x + 2 * D[0], y + 2 * D[1]); }
  else if (shape === '2x2') { hit(x, y); hit(x + 1, y); hit(x, y + 1); hit(x + 1, y + 1); }
  else if (shape === 'burst') {
    for (let i = 0; i < 5; i++) {
      hit(Math.floor(Math.random() * BOARD_SIZE), Math.floor(Math.random() * BOARD_SIZE));
    }
  }
  else if (shape === 'radar') {
    hit(x, y);
    for (let i = -2; i <= 2; i++) {
      if (dir === 'E' || dir === 'W') { hit(x + i, y); } else { hit(x, y + i); }
    }
  }
  return hits;
}

// ====== Socket handlers ======
io.on('connection', (socket) => {
  let myName = 'Player-' + nanoid(4);

  socket.on('player:setName', ({ name }) => {
    myName = String(name || '').slice(0, 24) || myName;
  });

  socket.on('room:create', () => {
    const room = mkRoom();
    room.players.push({ id: socket.id, name: myName, ready: false, placed: false, rematch: false });
    socket.join(room.code);
    socket.emit('room:created', { code: room.code });
    broadcast(room);
  });

  socket.on('room:join', ({ code }) => {
    const room = rooms.get(String(code));
    if (!room) { socket.emit('room:error', { message: 'Phòng không tồn tại' }); return; }
    if (room.players.length >= 2) { socket.emit('room:error', { message: 'Phòng đã đủ' }); return; }
    room.players.push({ id: socket.id, name: myName, ready: false, placed: false, rematch: false });
    socket.join(room.code);
    socket.emit('room:joined', { code: room.code });
    broadcast(room);
  });

  socket.on('player:ready', ({ ready }) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.phase !== 'waiting') return;
    const me = room.players.find(p => p.id === socket.id);
    me.ready = !!ready;

    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      room.phase = 'placing';
      const now = Date.now();
      room.timers.placingEndsAt = now + PLACE_MS;
      room.players.forEach(p => {
        p.board = genObstacles(p.mapType = TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)]);
        p.aliveRadar = true;
        p.skips = 0;
        p.placed = false;
        io.to(p.id).emit('placement:start', {
          mapType: p.mapType,
          board: p.board,
          deadline: room.timers.placingEndsAt
        });
      });

      setTimeout(() => {
        if (room.phase !== 'placing') return;
        proceedAfterPlacing(room);
      }, PLACE_MS + 200);
    }

    broadcast(room);
  });

  // đặt xong (v1: gửi kèm units)
  socket.on('placement:done', ({ units }) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.phase !== 'placing') return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me.board) { me.board = genObstacles(me.mapType || 'desert'); }
    placeUnitsOnBoard(me.board, units);
    me.placed = true;
    if (room.players.length === 2 && room.players.every(p => p.placed)) {
      proceedAfterPlacing(room);
    }
    broadcast(room);
  });

  // đặt xong (v2: không gửi units – tuỳ client)
  socket.on('placement:finalize', ({ units } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.phase !== 'placing') return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me.board) { me.board = genObstacles(me.mapType || 'desert'); }
    if (Array.isArray(units) && units.length) placeUnitsOnBoard(me.board, units);
    me.placed = true;
    if (room.players.length === 2 && room.players.every(p => p.placed)) {
      proceedAfterPlacing(room);
    }
    broadcast(room);
  });

  function proceedAfterPlacing(room) {
    room.phase = 'coin';
    const first = Math.random() < 0.5 ? room.players[0] : room.players[1];
    io.to(room.players[0].id).emit('turn:coin', { first: first.id });
    io.to(room.players[1].id).emit('turn:coin', { first: first.id });
    startPlaying(room, first.id);
  }

  // người đến lượt bấm quay
  socket.on('spin:roll', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.phase !== 'playing' || !room.turn) return;
    if (room.turn.current !== socket.id) {
      io.to(socket.id).emit('fire:error', { message: 'Chưa đến lượt bạn' });
      return;
    }
    if (room.turn.spun) {
      io.to(socket.id).emit('fire:error', { message: 'Bạn đã quay xong' });
      return;
    }
    if (!room.timers.spinEndsAt || Date.now() > room.timers.spinEndsAt) {
      io.to(socket.id).emit('fire:error', { message: 'Hết thời gian quay' });
      return;
    }
    doSpin(room, socket.id, /*auto*/false);
  });

  // bắn
  socket.on('fire:shoot', ({ x, y, dir, ammo }) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.phase !== 'playing' || !room.turn) return;
    if (room.turn.current !== socket.id) { io.to(socket.id).emit('fire:error', { message: 'Không phải lượt của bạn' }); return; }
    if (!room.turn.spun) { io.to(socket.id).emit('fire:error', { message: 'Hãy quay đạn trước' }); return; }
    if (room.turn.fired) { io.to(socket.id).emit('fire:error', { message: 'Bạn đã bắn lượt này' }); return; }
    if (ammo !== room.turn.ammo) { io.to(socket.id).emit('fire:error', { message: 'Loại đạn không khớp' }); return; }
    if (!room.timers.fireEndsAt || Date.now() > room.timers.fireEndsAt) {
      io.to(socket.id).emit('fire:error', { message: 'Hết thời gian bắn' }); return;
    }

    const opp = getOpponent(room, socket.id);
    if (!opp) { endGame(room, socket.id, 'opponent_left'); return; }

    const hits = applyShot(opp.board, { x, y, dir }, ammo);

    // thắng ngay nếu trúng chỉ huy
    const commanderDown = hits.some(h => h.unit === 'commander');
    if (commanderDown) {
      io.to(socket.id).emit('fire:resolve', { hits });
      io.to(opp.id).emit('under:attack', { hits });
      endGame(room, socket.id, 'commander_down');
      return;
    }

    // radar bị phá hủy
    const radarDestroyed = hits.some(h => h.unit === 'radar');
    if (radarDestroyed) { opp.aliveRadar = false; }

    io.to(socket.id).emit('fire:resolve', { hits });
    io.to(opp.id).emit('under:attack', { hits });

    // ---- MỚI: thua khi bị hạ hết quân ----
    const oppHasAnyUnitAlive = opp.board.flat().some(c => c.u && !c.h);
    if (!oppHasAnyUnitAlive) {
      endGame(room, socket.id, 'all_units_down');
      return;
    }

    // (tuỳ chọn) loại bỏ luật ">=20 ô bị trúng" vì đã có all_units_down
    // const destroyedCount = opp.board.flat().filter(c=>c.h).length;
    // if(destroyedCount >= 20){ endGame(room, socket.id, 'eliminate'); return; }

    // đánh dấu đã bắn & reset skip
    room.turn.fired = true;
    const me = room.players.find(p => p.id === socket.id);
    me.skips = 0;

    switchTurn(room);
  });

  // ==== Rematch / Leave ====
  socket.on('room:rematch', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.phase !== 'ended') return;
    const me = room.players.find(p => p.id === socket.id);
    me.rematch = true;
    broadcast(room);
    if (room.players.length === 2 && room.players.every(p => p.rematch)) {
      resetToWaiting(room);
    }
  });

  socket.on('room:leave', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    io.to(socket.id).emit('room:left');
    if (room.players.length === 0) { rooms.delete(room.code); }
    else {
      if (room.phase === 'playing') {
        const remain = room.players[0];
        endGame(room, remain.id, 'opponent_left');
      } else {
        broadcast(room);
      }
    }
  });

  socket.on('chat:send', ({ text, emoji }) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const msg = { from: myName, text: String(text || '').slice(0, 300), emoji, ts: Date.now() };
    io.to(room.code).emit('chat:message', msg);
  });

  socket.on('disconnect', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) { rooms.delete(room.code); }
    else {
      if (room.phase === 'playing') {
        const remain = room.players[0];
        endGame(room, remain.id, 'opponent_left');
      } else {
        broadcast(room);
      }
    }
  });
});
//
// ====== Run server ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🚀 War12x12 server http://localhost:' + PORT);
});
