import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const activeProjectIdRef = useRef(null);

  // Subscribed state listener callback
  const onRemoteStateUpdateRef = useRef(null);

  useEffect(() => {
    // Connect to server (using relative path or current host)
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to server, id:', socket.id);
      setConnected(true);
      // Rejoin project room if was previously inside one
      if (activeProjectIdRef.current && user) {
        socket.emit('project:join', {
          projectId: activeProjectIdRef.current,
          user
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setConnected(false);
    });

    // Collaborators list sync
    socket.on('project:collaborators', ({ collaborators }) => {
      setCollaborators(collaborators || []);
    });

    socket.on('project:user-joined', ({ user: newUser, collaborators }) => {
      setCollaborators(collaborators || []);
      setActivityLogs(prev => [
        {
          id: Date.now().toString(),
          user: newUser.username,
          action: 'joined the studio',
          timestamp: new Date().toISOString()
        },
        ...prev.slice(0, 49)
      ]);
    });

    socket.on('project:user-left', ({ user: leftUser, collaborators }) => {
      setCollaborators(collaborators || []);
      if (leftUser) {
        setRemoteCursors(prev => {
          const next = { ...prev };
          delete next[leftUser.socketId];
          return next;
        });
        setActivityLogs(prev => [
          {
            id: Date.now().toString(),
            user: leftUser.username,
            action: 'left the studio',
            timestamp: new Date().toISOString()
          },
          ...prev.slice(0, 49)
        ]);
      }
    });

    // Remote collaborator cursor movement
    socket.on('project:cursor-update', ({ socketId, user: sender, cursor, activeModule }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: { user: sender, cursor, activeModule, updatedAt: Date.now() }
      }));
    });

    // Real-time project state update received from another collaborator
    socket.on('project:state-synced', (data) => {
      if (onRemoteStateUpdateRef.current) {
        onRemoteStateUpdateRef.current(data);
      }
    });

    // Activity log event
    socket.on('project:activity', (activity) => {
      setActivityLogs(prev => [activity, ...prev.slice(0, 49)]);
    });

    // Chat message received
    socket.on('project:chat-received', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const joinProject = useCallback((projectId, activeModule = 'video') => {
    if (!socketRef.current || !projectId || !user) return;
    activeProjectIdRef.current = projectId;
    setChatMessages([]);
    setActivityLogs([]);
    setRemoteCursors({});
    socketRef.current.emit('project:join', { projectId, user, activeModule });
  }, [user]);

  const leaveProject = useCallback((projectId) => {
    if (!socketRef.current || !projectId) return;
    socketRef.current.emit('project:leave', { projectId });
    activeProjectIdRef.current = null;
    setCollaborators([]);
    setRemoteCursors({});
  }, []);

  const sendCursorMove = useCallback((projectId, cursor, activeModule) => {
    if (!socketRef.current || !projectId) return;
    socketRef.current.emit('project:cursor-move', { projectId, cursor, activeModule });
  }, []);

  const sendStateUpdate = useCallback((projectId, state, actionType, description) => {
    if (!socketRef.current || !projectId) return;
    socketRef.current.emit('project:state-update', {
      projectId,
      state,
      actionType,
      description
    });
  }, []);

  const sendChatMessage = useCallback((projectId, message) => {
    if (!socketRef.current || !projectId || !message.trim()) return;
    socketRef.current.emit('project:chat-message', { projectId, message });
  }, []);

  const registerRemoteStateListener = useCallback((fn) => {
    onRemoteStateUpdateRef.current = fn;
    return () => {
      if (onRemoteStateUpdateRef.current === fn) {
        onRemoteStateUpdateRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        connected,
        collaborators,
        chatMessages,
        activityLogs,
        remoteCursors,
        joinProject,
        leaveProject,
        sendCursorMove,
        sendStateUpdate,
        sendChatMessage,
        registerRemoteStateListener
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}

