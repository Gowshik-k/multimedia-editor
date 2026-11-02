const mongoose = require('mongoose');
const net = require('net');

function checkPort(port, host = '127.0.0.1', timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function connectDB() {
  const port = process.env.MONGO_PORT || 27017;
  const mongoURI = process.env.MONGODB_URI || `mongodb://127.0.0.1:${port}/multimedia_editor`;

  try {
    const isAvailable = await checkPort(port, '127.0.0.1', 500);
    if (!isAvailable) {
      console.log(`[Database] MongoDB not detected on port ${port}. Using resilient persistent local JSON store.`);
      return false;
    }

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] MongoDB connected successfully to ${mongoose.connection.host}/${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.log(`[Database] MongoDB connection bypassed (${error.message}). Using persistent local JSON store.`);
    return false;
  }
}

module.exports = { connectDB };
