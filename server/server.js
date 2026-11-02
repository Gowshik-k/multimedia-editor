const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { setupSocketIO } = require('./sockets/socketHandler');
const dataStore = require('./models/dataStore');
const { seedSamplesAndTemplates } = require('./services/sampleSeeder');

// Route imports
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const assetRoutes = require('./routes/assets');
const processRoutes = require('./routes/process');

const app = express();
const server = http.createServer(app);

// CORS configuration for both local Vite (5173) and any other host
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file hosting for uploads and samples
const uploadsPath = path.resolve(__dirname, 'uploads');
const samplesPath = path.resolve(__dirname, 'samples');

if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
if (!fs.existsSync(samplesPath)) fs.mkdirSync(samplesPath, { recursive: true });

app.use('/uploads', express.static(uploadsPath));
app.use('/samples', express.static(samplesPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/process', processRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dataStore.isMongoConnected() ? 'mongodb' : 'local_store',
    uptime: process.uptime()
  });
});

// Serve frontend build in production
const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

setupSocketIO(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect MongoDB or initialize store
  const mongoConnected = await connectDB();
  console.log(`[OmniMedia Server] Storage engine: ${mongoConnected ? 'MongoDB (connected)' : 'Local File/Memory Store'}`);

  // Create default admin/demo user if not present
  let defaultUser = await dataStore.findUserByEmail('demo@omnimedia.studio');
  if (!defaultUser) {
    defaultUser = await dataStore.createUser({
      username: 'Creative Director',
      email: 'demo@omnimedia.studio',
      password: 'password123',
      role: 'creator',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CreativeDirector'
    });
    console.log('[OmniMedia Server] Default demo user created: demo@omnimedia.studio / password123');
  }

  // Seed sample templates & assets
  await seedSamplesAndTemplates(defaultUser);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` OmniMedia Studio API Server running on port ${PORT}`);
    console.log(` Health: http://localhost:${PORT}/api/health`);
    console.log(` Media static paths: /uploads, /samples`);
    console.log(` Socket.IO active and listening`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('[Fatal Server Startup Error]:', err);
});

