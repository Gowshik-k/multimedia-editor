const dataStore = require('../models/dataStore');

// Map of active rooms: projectId -> Map of socketId -> userInfo
const activeRooms = new Map();

// Helper to get random avatar colors for collaborators
const AVATAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'
];

function getRandomColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    let currentProjectId = null;
    let currentUser = null;

    // Join a project room
    socket.on('project:join', async ({ projectId, user, activeModule = 'video' }) => {
      if (!projectId || !user) return;

      currentProjectId = projectId;
      currentUser = {
        socketId: socket.id,
        _id: user._id || socket.id,
        username: user.username || 'Anonymous Creator',
        avatar: user.avatar || '',
        role: user.role || 'editor',
        color: getRandomColor(user.username || socket.id),
        activeModule: activeModule,
        cursor: { x: 0, y: 0 },
        joinedAt: new Date().toISOString()
      };

      socket.join(`project:${projectId}`);

      if (!activeRooms.has(projectId)) {
        activeRooms.set(projectId, new Map());
      }
      const roomMap = activeRooms.get(projectId);
      roomMap.set(socket.id, currentUser);

      // Notify the joining user of current room state
      const collaborators = Array.from(roomMap.values());
      socket.emit('project:collaborators', { collaborators });

      // Notify other collaborators
      socket.to(`project:${projectId}`).emit('project:user-joined', {
        user: currentUser,
        collaborators
      });

      console.log(`[Socket.IO] User ${currentUser.username} (${socket.id}) joined project ${projectId}. Total: ${collaborators.length}`);
    });

    // Update collaborator cursor or active tool/module
    socket.on('project:cursor-move', ({ projectId, cursor, activeModule }) => {
      if (!projectId || !currentUser) return;
      
      const roomMap = activeRooms.get(projectId);
      if (roomMap && roomMap.has(socket.id)) {
        const u = roomMap.get(socket.id);
        if (cursor) u.cursor = cursor;
        if (activeModule) u.activeModule = activeModule;
      }

      socket.to(`project:${projectId}`).emit('project:cursor-update', {
        socketId: socket.id,
        user: currentUser,
        cursor,
        activeModule
      });
    });

    // Real-time state synchronization
    socket.on('project:state-update', async ({ projectId, state, actionType, description }) => {
      if (!projectId || !state) return;

      // Broadcast immediately to all other collaborators in the room
      socket.to(`project:${projectId}`).emit('project:state-synced', {
        state,
        actionType,
        by: currentUser ? currentUser.username : 'Collaborator',
        timestamp: new Date().toISOString()
      });

      // Optionally record activity log in the project
      try {
        if (description && currentUser) {
          const activity = {
            id: Date.now().toString(),
            user: currentUser.username,
            action: description,
            timestamp: new Date().toISOString()
          };
          io.to(`project:${projectId}`).emit('project:activity', activity);
        }
      } catch (err) {
        console.error('[Socket.IO] Error recording activity:', err.message);
      }
    });

    // Synchronized playhead / preview playback
    socket.on('project:playhead-sync', ({ projectId, currentTime, isPlaying }) => {
      if (!projectId) return;
      socket.to(`project:${projectId}`).emit('project:playhead-update', {
        currentTime,
        isPlaying,
        by: currentUser ? currentUser.username : 'User'
      });
    });

    // Project chat message
    socket.on('project:chat-message', ({ projectId, message }) => {
      if (!projectId || !message || !currentUser) return;

      const chatMsg = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5),
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          color: currentUser.color
        },
        message: message.trim(),
        timestamp: new Date().toISOString()
      };

      io.to(`project:${projectId}`).emit('project:chat-received', chatMsg);
    });

    // Leave project
    socket.on('project:leave', ({ projectId }) => {
      leaveCurrentProject();
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      leaveCurrentProject();
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });

    function leaveCurrentProject() {
      if (currentProjectId && activeRooms.has(currentProjectId)) {
        const roomMap = activeRooms.get(currentProjectId);
        roomMap.delete(socket.id);
        const collaborators = Array.from(roomMap.values());

        socket.to(`project:${currentProjectId}`).emit('project:user-left', {
          socketId: socket.id,
          user: currentUser,
          collaborators
        });

        if (roomMap.size === 0) {
          activeRooms.delete(currentProjectId);
        }

        socket.leave(`project:${currentProjectId}`);
        currentProjectId = null;
      }
    }
  });
}

module.exports = { setupSocketIO };

