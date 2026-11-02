import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import AssetDrawer from '../components/common/AssetDrawer';
import LiveChatDrawer from '../components/collaboration/LiveChatDrawer';
import ExportModal from '../components/common/ExportModal';
import InviteModal from '../components/common/InviteModal';

import ImageEditor from '../components/image/ImageEditor';
import AudioEditor from '../components/audio/AudioEditor';
import VideoEditor from '../components/video/VideoEditor';

import { useProject } from '../context/ProjectContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function EditorWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinProject, leaveProject, sendCursorMove, remoteCursors } = useSocket();
  const {
    currentProject,
    loadProject,
    activeModule,
    saveProject,
    undo,
    redo
  } = useProject();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer & modal states
  const [showAssets, setShowAssets] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        await loadProject(id);
      } catch (err) {
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, loadProject]);

  useEffect(() => {
    if (id && user) {
      joinProject(id, activeModule);
    }
    return () => {
      if (id) leaveProject(id);
    };
  }, [id, user, joinProject, leaveProject, activeModule]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProject, undo, redo]);

  const handleMouseMove = (e) => {
    if (!id) return;
    const cursor = { x: e.clientX, y: e.clientY };
    sendCursorMove(id, cursor, activeModule);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-3 text-neutral-500">
        <Loader2 className="w-7 h-7 animate-spin text-neutral-900" />
        <span className="text-xs font-medium text-neutral-600">Loading studio workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="text-neutral-900 text-sm font-semibold">{error}</div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="h-screen w-screen flex flex-col bg-white overflow-hidden relative select-none"
    >
      <Navbar
        onToggleAssets={() => setShowAssets(!showAssets)}
        onToggleChat={() => setShowChat(!showChat)}
        showAssets={showAssets}
        showChat={showChat}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenInviteModal={() => setShowInviteModal(true)}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {activeModule === 'image' && <ImageEditor />}
        {activeModule === 'audio' && <AudioEditor />}
        {activeModule === 'video' && <VideoEditor />}
      </main>

      <AssetDrawer
        isOpen={showAssets}
        onClose={() => setShowAssets(false)}
      />

      <LiveChatDrawer
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onOpenInviteModal={() => setShowInviteModal(true)}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Floating Remote Collaborator Cursors */}
      {Object.entries(remoteCursors).map(([socketId, remote]) => {
        if (!remote?.cursor) return null;
        return (
          <div
            key={socketId}
            className="fixed pointer-events-none z-50 transition-all duration-75 flex items-center space-x-1"
            style={{
              left: `${remote.cursor.x}px`,
              top: `${remote.cursor.y}px`
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full border border-white shadow-xs transform -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: remote.user?.color || '#2563eb' }}
            />
            <div
              className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white shadow-sm whitespace-nowrap"
              style={{ backgroundColor: remote.user?.color || '#2563eb' }}
            >
              {remote.user?.username || 'Collaborator'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
