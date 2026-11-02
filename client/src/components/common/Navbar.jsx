import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Save,
  Download,
  Share2,
  Undo2,
  Redo2,
  MessageSquare,
  User,
  LogOut,
  Loader2,
  FolderOpen,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useProject } from '../../context/ProjectContext';

export default function Navbar({
  onToggleChat,
  onToggleAssets,
  showAssets,
  showChat,
  onOpenExportModal,
  onOpenInviteModal
}) {
  const { user, logout } = useAuth();
  const { collaborators } = useSocket();
  const {
    currentProject,
    activeModule,
    setActiveModule,
    isSaving,
    saveProject,
    canUndo,
    canRedo,
    undo,
    redo
  } = useProject();

  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(currentProject?.title || '');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleText.trim() && titleText !== currentProject?.title) {
      saveProject(`Renamed project to "${titleText.trim()}"`);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-3 sm:px-4 select-none z-30 relative shadow-sm">
      {/* Left: Brand + Project Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <Link
          to="/"
          className="flex items-center space-x-2 text-neutral-900 hover:text-neutral-600 transition flex-shrink-0"
          title="Return to Dashboard"
        >
          <div className="w-6 h-6 rounded bg-neutral-900 flex items-center justify-center text-white font-mono text-xs font-bold">
            O
          </div>
          <span className="font-semibold text-sm tracking-tight hidden sm:inline text-neutral-900">
            Omni<span className="font-normal text-neutral-500">Media</span>
          </span>
        </Link>

        {currentProject && <span className="text-neutral-300 hidden sm:inline">/</span>}

        {/* Project Title (Inline Editable) */}
        {currentProject && (
          <div className="flex items-center space-x-1.5 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="bg-neutral-50 text-xs text-neutral-900 px-2 py-1 rounded border border-neutral-400 outline-none w-32 sm:w-44 font-medium"
              />
            ) : (
              <button
                onClick={() => {
                  setTitleText(currentProject.title);
                  setIsEditingTitle(true);
                }}
                className="text-xs font-medium text-neutral-800 hover:text-neutral-950 px-1.5 py-0.5 rounded hover:bg-neutral-100 transition truncate max-w-[110px] sm:max-w-[200px]"
                title="Click to rename"
              >
                {currentProject.title}
              </button>
            )}

            <span className="hidden md:inline text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200">
              {currentProject.type}
            </span>
          </div>
        )}

        {/* Media Asset Drawer Toggle (Desktop) */}
        <button
          onClick={onToggleAssets}
          className={`hidden md:flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md border transition ${
            showAssets
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
          title="Open Media Library"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Assets</span>
        </button>
      </div>

      {/* Center: Module Switcher (Image / Audio / Video) */}
      {currentProject && (
        <div className="flex items-center bg-neutral-100 p-0.5 sm:p-1 rounded-lg border border-neutral-200/80">
          {[
            { id: 'image', label: 'Image' },
            { id: 'audio', label: 'Audio' },
            { id: 'video', label: 'Video' }
          ].map(mod => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition ${
                activeModule === mod.id
                  ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {mod.label}
            </button>
          ))}
        </div>
      )}

      {/* Right: Actions & Collaborators */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
        {/* Undo / Redo (hidden on small mobile) */}
        <div className="hidden lg:flex items-center space-x-0.5 mr-1 border-r border-neutral-200 pr-1.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded hover:bg-neutral-100 transition ${
              canUndo ? 'text-neutral-700' : 'text-neutral-300 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded hover:bg-neutral-100 transition ${
              canRedo ? 'text-neutral-700' : 'text-neutral-300 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Collaborators Avatar Cluster */}
        {collaborators.length > 0 && (
          <div
            className="flex items-center -space-x-1.5 cursor-pointer"
            onClick={onToggleChat}
            title={`${collaborators.length} online`}
          >
            {collaborators.slice(0, 3).map((c, i) => (
              <div
                key={c.socketId || i}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-neutral-200"
                style={{ backgroundColor: c.color || '#2563eb' }}
                title={`${c.username} (${c.activeModule || 'editing'})`}
              >
                {c.avatar ? (
                  <img src={c.avatar} alt={c.username} className="w-full h-full object-cover" />
                ) : (
                  c.username?.charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {collaborators.length > 3 && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[9px] font-mono text-neutral-600 font-semibold ring-1 ring-neutral-200">
                +{collaborators.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        {currentProject && (
          <button
            onClick={() => saveProject()}
            disabled={isSaving}
            className="flex items-center space-x-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-2 sm:px-2.5 py-1.5 rounded-md border border-neutral-300 transition"
            title="Save changes"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-600" />
            ) : (
              <Save className="w-3.5 h-3.5 text-neutral-600" />
            )}
            <span className="hidden sm:inline">{isSaving ? 'Saving' : 'Save'}</span>
          </button>
        )}

        {/* Export Button */}
        {currentProject && (
          <button
            onClick={onOpenExportModal}
            className="flex items-center space-x-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-white px-2.5 sm:px-3 py-1.5 rounded-md font-medium shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Export</span>
          </button>
        )}

        {/* Share / Invite (Desktop) */}
        {currentProject && (
          <button
            onClick={onOpenInviteModal}
            className="hidden sm:flex p-1.5 rounded-md bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200 transition"
            title="Share & Invite"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Chat Drawer Toggle (Desktop) */}
        <button
          onClick={onToggleChat}
          className={`hidden sm:flex p-1.5 rounded-md border transition relative ${
            showChat
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
          title="Team Chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {collaborators.length > 1 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </button>

        {/* Mobile Menu Toggle (Small screens) */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="sm:hidden p-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
          title="Open mobile menu"
        >
          {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* User Account Dropdown */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-neutral-700 hover:text-neutral-900 transition overflow-hidden"
            title={user ? user.username : 'Account'}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50 text-xs animate-in fade-in duration-100">
              <div className="px-3 py-2 border-b border-neutral-100">
                <div className="font-medium text-neutral-900 truncate">{user?.username || 'Guest'}</div>
                <div className="text-[11px] text-neutral-500 truncate">{user?.email || 'Not logged in'}</div>
              </div>
              <Link
                to="/"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 transition"
              >
                <span>Dashboard</span>
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left flex items-center space-x-2 px-3 py-2 text-rose-600 hover:bg-neutral-50 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {showMobileMenu && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b border-neutral-200 p-3 shadow-lg z-50 sm:hidden flex flex-col space-y-2 text-xs">
          <button
            onClick={() => {
              setShowMobileMenu(false);
              onToggleAssets();
            }}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 text-neutral-800 text-left font-medium"
          >
            <FolderOpen className="w-4 h-4 text-neutral-600" />
            <span>Open Media Library</span>
          </button>

          <button
            onClick={() => {
              setShowMobileMenu(false);
              onToggleChat();
            }}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-100 text-neutral-800 text-left font-medium"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-neutral-600" />
              <span>Team Chat & Activity</span>
            </div>
            {collaborators.length > 0 && (
              <span className="text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded font-mono">
                {collaborators.length} online
              </span>
            )}
          </button>

          {currentProject && (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                onOpenInviteModal();
              }}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 text-neutral-800 text-left font-medium"
            >
              <Share2 className="w-4 h-4 text-neutral-600" />
              <span>Share & Invite Team</span>
            </button>
          )}

          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-neutral-500">{user?.username || 'Guest User'}</span>
            <button
              onClick={() => {
                setShowMobileMenu(false);
                logout();
                navigate('/login');
              }}
              className="text-rose-600 font-medium py-1 px-2 rounded hover:bg-rose-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
