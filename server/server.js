require('dotenv').config();
const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { Pool } = require('pg');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'https://mikveh-system.vercel.app',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const USE_IN_MEMORY_DB = process.env.USE_IN_MEMORY_DB === 'true';

if (!USE_IN_MEMORY_DB && !DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

let pool = null;
if (!USE_IN_MEMORY_DB) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((error) => error.msg) });
  }
  next();
}

const memoryStore = {
  mikvehs: [],
  users: [],
  rooms: [],
  nextId: {
    mikvehs: 1,
    users: 1,
    rooms: 1,
  },
};

async function query(text, params) {
  if (USE_IN_MEMORY_DB) {
    throw new Error('Direct SQL query is not supported in in-memory mode.');
  }
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  if (USE_IN_MEMORY_DB) {
    memoryStore.mikvehs = memoryStore.mikvehs || [];
    memoryStore.users = memoryStore.users || [];
    memoryStore.rooms = memoryStore.rooms || [];
    memoryStore.nextId = memoryStore.nextId || { mikvehs: 1, users: 1, rooms: 1 };
    return;
  }
  await query(`
    CREATE TABLE IF NOT EXISTS mikvehs (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      rooms_count INT NOT NULL DEFAULT 6,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      mikveh_id INT NOT NULL REFERENCES mikvehs(id) ON DELETE CASCADE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      mikveh_id INT NOT NULL REFERENCES mikvehs(id) ON DELETE CASCADE,
      room_number INT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('idle', 'ready', 'help')),
      last_update BIGINT NOT NULL,
      UNIQUE(mikveh_id, room_number)
    );
  `);
}

async function getRoomsForMikveh(mikvehId) {
  if (USE_IN_MEMORY_DB) {
    return memoryStore.rooms
      .filter((room) => room.mikveh_id === mikvehId)
      .sort((a, b) => a.room_number - b.room_number)
      .map((room) => ({
        id: room.room_number,
        status: room.status,
        lastUpdated: Number(room.last_update),
      }));
  }

  const result = await query(
    'SELECT room_number AS id, status, last_update AS "lastUpdated" FROM rooms WHERE mikveh_id = $1 ORDER BY room_number ASC',
    [mikvehId],
  );
  return result.rows.map((room) => ({
    ...room,
    lastUpdated: Number(room.lastUpdated),
  }));
}

async function getRoomByNumber(mikvehId, roomNumber) {
  if (USE_IN_MEMORY_DB) {
    return memoryStore.rooms.find((room) => room.mikveh_id === mikvehId && room.room_number === roomNumber) || null;
  }

  const result = await query(
    'SELECT id, room_number, status, last_update FROM rooms WHERE mikveh_id = $1 AND room_number = $2 LIMIT 1',
    [mikvehId, roomNumber],
  );
  return result.rows[0] || null;
}

async function getRoomByNumberGlobal(roomNumber) {
  if (USE_IN_MEMORY_DB) {
    return memoryStore.rooms.find((room) => room.room_number === roomNumber) || null;
  }

  const result = await query(
    'SELECT id, mikveh_id, room_number, status, last_update FROM rooms WHERE room_number = $1 LIMIT 1',
    [roomNumber],
  );
  return result.rows[0] || null;
}

async function ensureRoomsForMikveh(mikvehId, roomsCount) {
  if (USE_IN_MEMORY_DB) {
    const existingRooms = memoryStore.rooms.filter((room) => room.mikveh_id === mikvehId);
    const existingNumbers = existingRooms.map((room) => room.room_number);

    for (let number = 1; number <= roomsCount; number += 1) {
      if (!existingNumbers.includes(number)) {
        memoryStore.rooms.push({
          id: memoryStore.nextId.rooms++,
          mikveh_id: mikvehId,
          room_number: number,
          status: 'idle',
          last_update: Date.now(),
        });
      }
    }

    memoryStore.rooms = memoryStore.rooms.filter(
      (room) => room.mikveh_id !== mikvehId || room.room_number <= roomsCount,
    );
    return getRoomsForMikveh(mikvehId);
  }

  const existing = await query('SELECT room_number FROM rooms WHERE mikveh_id = $1 ORDER BY room_number ASC', [mikvehId]);
  const existingNumbers = existing.rows.map((row) => row.room_number);

  const promises = [];

  for (let number = 1; number <= roomsCount; number += 1) {
    if (!existingNumbers.includes(number)) {
      promises.push(
        query(
          'INSERT INTO rooms (mikveh_id, room_number, status, last_update) VALUES ($1, $2, $3, $4)',
          [mikvehId, number, 'idle', Date.now()],
        ),
      );
    }
  }

  if (existingNumbers.length > roomsCount) {
    promises.push(query('DELETE FROM rooms WHERE mikveh_id = $1 AND room_number > $2', [mikvehId, roomsCount]));
  }

  await Promise.all(promises);
  return getRoomsForMikveh(mikvehId);
}

async function getMikvehById(mikvehId) {
  if (USE_IN_MEMORY_DB) {
    return memoryStore.mikvehs.find((mikveh) => mikveh.id === mikvehId) || null;
  }
  const result = await query('SELECT id, name, rooms_count FROM mikvehs WHERE id = $1 LIMIT 1', [mikvehId]);
  return result.rows[0] || null;
}

async function seedDefaultTenant() {
  if (USE_IN_MEMORY_DB) {
    if (memoryStore.mikvehs.length > 0) {
      return;
    }

    const username = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const password = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const mikvehId = memoryStore.nextId.mikvehs++;
    memoryStore.mikvehs.push({
      id: mikvehId,
      name: process.env.INITIAL_MIKVEH_NAME || 'Default Mikveh',
      rooms_count: 6,
      created_at: new Date().toISOString(),
    });

    const userId = memoryStore.nextId.users++;
    memoryStore.users.push({
      id: userId,
      mikveh_id: mikvehId,
      username,
      password_hash: hashedPassword,
      role: 'admin',
      created_at: new Date().toISOString(),
    });

    await ensureRoomsForMikveh(mikvehId, 6);
    console.log(`Seeded default mikveh ${mikvehId} and admin user ${username}`);
    return;
  }

  const existing = await query('SELECT id FROM mikvehs LIMIT 1');
  if (existing.rowCount > 0) {
    return;
  }

  const username = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const insertMikveh = await query('INSERT INTO mikvehs (name, rooms_count) VALUES ($1, $2) RETURNING id', [
    process.env.INITIAL_MIKVEH_NAME || 'Default Mikveh',
    6,
  ]);

  const mikvehId = insertMikveh.rows[0].id;
  await query(
    'INSERT INTO users (mikveh_id, username, password_hash, role) VALUES ($1, $2, $3, $4)',
    [mikvehId, username, hashedPassword, 'admin'],
  );
  await ensureRoomsForMikveh(mikvehId, 6);
  console.log(`Seeded default mikveh ${mikvehId} and admin user ${username}`);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    next();
  };
}

app.use('/api/', apiLimiter);

app.get('/', (req, res) => {
  res.send('Mikveh backend running');
});

app.post(
  '/api/auth/login',
  authLimiter,
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { username, password } = req.body;
      let user;
      if (USE_IN_MEMORY_DB) {
        user = memoryStore.users.find((item) => item.username === username);
      } else {
        const result = await query('SELECT id, mikveh_id, password_hash, role FROM users WHERE username = $1 LIMIT 1', [username]);
        user = result.rows[0];
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        { userId: user.id, mikveh_id: user.mikveh_id, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' },
      );

      return res.json({ token });
    } catch (error) {
      next(error);
    }
  },
);

app.get('/api/rooms', authenticateToken, async (req, res, next) => {
  try {
    const mikveh = await getMikvehById(req.user.mikveh_id);
    if (!mikveh) return res.status(404).json({ error: 'Mikveh not found.' });

    const rooms = await ensureRoomsForMikveh(req.user.mikveh_id, mikveh.rooms_count);
    return res.json(rooms);
  } catch (error) {
    next(error);
  }
});

app.get('/api/rooms/:roomId', authenticateToken, async (req, res, next) => {
  try {
    const roomNumber = parseInt(req.params.roomId, 10);
    if (Number.isNaN(roomNumber)) {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }

    if (USE_IN_MEMORY_DB) {
      const room = memoryStore.rooms.find(
        (item) => item.mikveh_id === req.user.mikveh_id && item.room_number === roomNumber
      );
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      return res.json({
        id: room.room_number,
        status: room.status,
        lastUpdated: new Date(room.last_update),
      });
    }

    const result = await query(
      'SELECT room_number AS id, status, last_update AS "lastUpdated" FROM rooms WHERE mikveh_id = $1 AND room_number = $2 LIMIT 1',
      [req.user.mikveh_id, roomNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const room = result.rows[0];
    return res.json({
      id: room.id,
      status: room.status,
      lastUpdated: new Date(room.lastUpdated),
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/rooms/:roomId', authenticateToken, async (req, res, next) => {
  try {
    const roomNumber = parseInt(req.params.roomId, 10);
    const { status } = req.body;

    if (Number.isNaN(roomNumber) || !['idle', 'ready', 'help'].includes(status)) {
      return res.status(400).json({ error: 'Invalid room ID or status.' });
    }

    if (USE_IN_MEMORY_DB) {
      const room = memoryStore.rooms.find(
        (item) => item.mikveh_id === req.user.mikveh_id && item.room_number === roomNumber
      );
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      room.status = status;
      room.last_update = Date.now();

      // Emit real-time update
      io.to(`mikveh_${req.user.mikveh_id}`).emit('roomStatusChanged', {
        roomId: roomNumber,
        status,
        timestamp: new Date(),
      });

      return res.json({
        id: room.room_number,
        status: room.status,
        lastUpdated: new Date(room.last_update),
      });
    }

    const checkResult = await query(
      'SELECT id FROM rooms WHERE mikveh_id = $1 AND room_number = $2',
      [req.user.mikveh_id, roomNumber]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    await query(
      'UPDATE rooms SET status = $1, last_update = $2 WHERE mikveh_id = $3 AND room_number = $4',
      [status, Date.now(), req.user.mikveh_id, roomNumber]
    );

    // Emit real-time update
    io.to(`mikveh_${req.user.mikveh_id}`).emit('roomStatusChanged', {
      roomId: roomNumber,
      status,
      timestamp: new Date(),
    });

    const result = await query(
      'SELECT room_number AS id, status, last_update AS "lastUpdated" FROM rooms WHERE mikveh_id = $1 AND room_number = $2',
      [req.user.mikveh_id, roomNumber]
    );

    const room = result.rows[0];
    return res.json({
      id: room.id,
      status: room.status,
      lastUpdated: new Date(room.lastUpdated),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/rooms/:roomId/reset', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const roomNumber = parseInt(req.params.roomId, 10);
    if (Number.isNaN(roomNumber)) {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }

    if (USE_IN_MEMORY_DB) {
      const room = memoryStore.rooms.find(
        (item) => item.mikveh_id === req.user.mikveh_id && item.room_number === roomNumber
      );
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      room.status = 'idle';
      room.last_update = Date.now();

      // Emit reset event
      io.to(`mikveh_${req.user.mikveh_id}`).emit('roomReset', {
        roomId: roomNumber,
        timestamp: new Date(),
      });

      return res.json({
        id: room.room_number,
        status: room.status,
        lastUpdated: new Date(room.last_update),
      });
    }

    const checkResult = await query(
      'SELECT id FROM rooms WHERE mikveh_id = $1 AND room_number = $2',
      [req.user.mikveh_id, roomNumber]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    await query(
      'UPDATE rooms SET status = $1, last_update = $2 WHERE mikveh_id = $3 AND room_number = $4',
      ['idle', Date.now(), req.user.mikveh_id, roomNumber]
    );

    // Emit reset event
    io.to(`mikveh_${req.user.mikveh_id}`).emit('roomReset', {
      roomId: roomNumber,
      timestamp: new Date(),
    });

    const result = await query(
      'SELECT room_number AS id, status, last_update AS "lastUpdated" FROM rooms WHERE mikveh_id = $1 AND room_number = $2',
      [req.user.mikveh_id, roomNumber]
    );

    const room = result.rows[0];
    return res.json({
      id: room.id,
      status: room.status,
      lastUpdated: new Date(room.lastUpdated),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/config', authenticateToken, async (req, res, next) => {
  try {
    const mikveh = await getMikvehById(req.user.mikveh_id);
    if (!mikveh) return res.status(404).json({ error: 'Mikveh not found.' });
    return res.json({ roomsCount: mikveh.rooms_count });
  } catch (error) {
    next(error);
  }
});

app.put(
  '/api/settings/rooms-count',
  authenticateToken,
  authorizeRoles('admin'),
  body('roomsCount').isInt({ min: 1, max: 50 }).withMessage('roomsCount must be between 1 and 50.'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { roomsCount } = req.body;
      if (USE_IN_MEMORY_DB) {
        const mikveh = memoryStore.mikvehs.find((item) => item.id === req.user.mikveh_id);
        if (mikveh) {
          mikveh.rooms_count = roomsCount;
        }
      } else {
        await query('UPDATE mikvehs SET rooms_count = $1 WHERE id = $2', [roomsCount, req.user.mikveh_id]);
      }
      const rooms = await ensureRoomsForMikveh(req.user.mikveh_id, roomsCount);
      io.to(`mikveh_${req.user.mikveh_id}`).emit('roomsUpdate', rooms);
      return res.json({ success: true, roomsCount });
    } catch (error) {
      next(error);
    }
  },
);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const roomNumber = parseInt(socket.handshake.auth?.roomNumber, 10);

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, payload) => {
      if (err) {
        return next(new Error('Invalid token'));
      }
      socket.user = payload;
      socket.mikveh_id = payload.mikveh_id;
      socket.join(`mikveh_${payload.mikveh_id}`);
      return next();
    });
    return;
  }

  if (!Number.isNaN(roomNumber)) {
    try {
      const room = await getRoomByNumberGlobal(roomNumber);
      if (!room) {
        return next(new Error('Room not found'));
      }
      socket.mikveh_id = room.mikveh_id;
      socket.roomNumber = roomNumber;
      socket.join(`mikveh_${room.mikveh_id}`);
      return next();
    } catch (error) {
      return next(new Error('Socket authentication failed'));
    }
  }

  return next(new Error('Authentication required'));
});

io.on('connection', async (socket) => {
  const tenantRoom = `mikveh_${socket.mikveh_id}`;
  try {
    const rooms = await getRoomsForMikveh(socket.mikveh_id);
    socket.emit('roomsUpdate', rooms);
  } catch (error) {
    console.error('Failed to send initial rooms', error);
  }

  socket.on('updateRoom', async (payload) => {
    try {
      const roomNumber = Number(payload.roomId);
      const status = payload.status;
      if (!Number.isInteger(roomNumber) || !['idle', 'ready', 'help'].includes(status)) {
        return;
      }

      const room = await getRoomByNumber(socket.mikveh_id, roomNumber);
      if (!room) {
        return;
      }

      if (USE_IN_MEMORY_DB) {
        const storedRoom = memoryStore.rooms.find(
          (item) => item.mikveh_id === socket.mikveh_id && item.room_number === roomNumber,
        );
        if (storedRoom) {
          storedRoom.status = status;
          storedRoom.last_update = Date.now();
        }
      } else {
        await query('UPDATE rooms SET status = $1, last_update = $2 WHERE mikveh_id = $3 AND room_number = $4', [
          status,
          Date.now(),
          socket.mikveh_id,
          roomNumber,
        ]);
      }

      const rooms = await getRoomsForMikveh(socket.mikveh_id);
      io.to(tenantRoom).emit('roomsUpdate', rooms);
    } catch (error) {
      console.error('Failed to update room', error);
    }
  });

  socket.on('roomStatusChanged', async (payload) => {
    try {
      const roomNumber = Number(payload.roomId);
      const status = payload.status;
      if (!Number.isInteger(roomNumber) || !['idle', 'ready', 'help'].includes(status)) {
        return;
      }

      const room = await getRoomByNumber(socket.mikveh_id, roomNumber);
      if (!room) {
        return;
      }

      if (USE_IN_MEMORY_DB) {
        const storedRoom = memoryStore.rooms.find(
          (item) => item.mikveh_id === socket.mikveh_id && item.room_number === roomNumber,
        );
        if (storedRoom) {
          storedRoom.status = status;
          storedRoom.last_update = Date.now();
        }
      } else {
        await query('UPDATE rooms SET status = $1, last_update = $2 WHERE mikveh_id = $3 AND room_number = $4', [
          status,
          Date.now(),
          socket.mikveh_id,
          roomNumber,
        ]);
      }

      // Broadcast the status change to all clients in the mikveh room
      io.to(tenantRoom).emit('roomStatusChanged', {
        roomId: roomNumber,
        status,
        timestamp: new Date(),
      });

      // Also emit roomUpdated for single room subscriptions
      io.to(tenantRoom).emit('roomUpdated', {
        id: roomNumber,
        status,
        lastUpdated: new Date(),
      });

      const rooms = await getRoomsForMikveh(socket.mikveh_id);
      io.to(tenantRoom).emit('roomsUpdate', rooms);
    } catch (error) {
      console.error('Failed to handle room status change', error);
    }
  });

  socket.on('resetRoom', async (payload) => {
    try {
      const roomNumber = Number(payload.roomId);
      if (!Number.isInteger(roomNumber)) {
        return;
      }

      const room = await getRoomByNumber(socket.mikveh_id, roomNumber);
      if (!room) {
        return;
      }

      if (USE_IN_MEMORY_DB) {
        const storedRoom = memoryStore.rooms.find(
          (item) => item.mikveh_id === socket.mikveh_id && item.room_number === roomNumber,
        );
        if (storedRoom) {
          storedRoom.status = 'idle';
          storedRoom.last_update = Date.now();
        }
      } else {
        await query('UPDATE rooms SET status = $1, last_update = $2 WHERE mikveh_id = $3 AND room_number = $4', [
          'idle',
          Date.now(),
          socket.mikveh_id,
          roomNumber,
        ]);
      }

      const rooms = await getRoomsForMikveh(socket.mikveh_id);
      io.to(tenantRoom).emit('roomsUpdate', rooms);
    } catch (error) {
      console.error('Failed to reset room', error);
    }
  });

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ error: 'Internal server error.' });
});

async function startServer() {
  try {
    await ensureSchema();
    if (process.env.INITIAL_ADMIN_USERNAME && process.env.INITIAL_ADMIN_PASSWORD) {
      await seedDefaultTenant();
    }
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();