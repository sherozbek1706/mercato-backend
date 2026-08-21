const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const winston = require('winston');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://mercato.sherozbek.uz',
      'http://mercato.sherozbek.uz',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('New WebSocket connection:', socket.id);
  
  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined room user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const marketRoutes = require('./routes/marketRoutes');
const workRoutes = require('./routes/workRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const db = require('./config/db');

app.use(cors({
  origin: [
    'https://mercato.sherozbek.uz',
    'http://mercato.sherozbek.uz',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/work', workRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);

// Public endpoints for registration & display
app.get('/api/professions', async (req, res) => {
  try {
    const professions = await db('professions').orderBy('id', 'asc');
    res.json(professions);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await db('items').orderBy('id', 'asc');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const topUsers = await db('users')
      .leftJoin('professions', 'users.profession_id', 'professions.id')
      .select('users.id', 'users.username', 'users.balance', 'professions.name as profession_name')
      .orderBy('users.balance', 'desc')
      .limit(20);
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Mercato API ishlamoqda' });
});

const ip = require('ip');
const { startBotBuyer } = require('./services/botBuyer');

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Network URL: http://${ip.address()}:${PORT}`);
  
  // Bot buyer xizmatini ishga tushirish (har 3 daqiqada foydalanuvchilardan narsa sotib oladi)
  startBotBuyer(io);
});
