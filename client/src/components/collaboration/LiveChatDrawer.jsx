import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  UserPlus
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';

export default function LiveChatDrawer({ isOpen, onClose, onOpenInviteModal }) {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { collaborators, chatMessages, activityLogs, sendChatMessage } = useSocket();

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'activity' | 'team'
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentProject) return;
    sendChatMessage(currentProject._id, inputText.trim());
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/20 backdrop-blur-xs z-40 sm:hidden"
      />

      <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white border-l border-neutral-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              Collaboration
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-2 pt-1 text-xs">
          {[
            { id: 'chat', label: 'Chat' },
            { id: 'activity', label: 'Activity' },
            { id: 'team', label: `Team (${collaborators.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Live Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs space-y-1">
                  <div>No messages yet in this project.</div>
                  <div className="text-[11px] text-neutral-400">Share updates with your team.</div>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.sender?._id === user?._id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-neutral-500">
                        <span className="font-semibold text-neutral-700">
                          {isMe ? 'You' : msg.sender?.username}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`text-xs px-3 py-2 rounded-lg max-w-[85%] break-words ${
                          isMe
                            ? 'bg-neutral-900 text-white rounded-tr-none'
                            : 'bg-neutral-100 text-neutral-900 rounded-tl-none border border-neutral-200'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-2.5 border-t border-neutral-200 bg-white flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-neutral-50 border border-neutral-300 rounded-md px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-900"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2 rounded-md transition ${
                  inputText.trim()
                    ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Activity Log */}
        {activeTab === 'activity' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activityLogs.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                Live collaborator actions appear here in real time.
              </div>
            ) : (
              activityLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-2 rounded-md bg-neutral-50 border border-neutral-200 text-xs"
                >
                  <div className="text-neutral-800">
                    <span className="font-semibold text-neutral-900">{log.user}</span> {log.action}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Team */}
        {activeTab === 'team' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <button
              onClick={onOpenInviteModal}
              className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Teammate</span>
            </button>

            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-1 pt-1">
              Active in Project ({collaborators.length})
            </div>

            <div className="space-y-1.5">
              {collaborators.map((c, i) => (
                <div
                  key={c.socketId || i}
                  className="flex items-center justify-between p-2 rounded-md bg-neutral-50 border border-neutral-200 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white relative shadow-xs"
                      style={{ backgroundColor: c.color || '#2563eb' }}
                    >
                      {c.username?.charAt(0).toUpperCase()}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900 flex items-center space-x-1">
                        <span>{c.username}</span>
                        {c._id === user?._id && (
                          <span className="text-[10px] text-neutral-500 font-mono">(You)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 capitalize">
                        {c.activeModule || 'editing'} module
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200">
                    {c.role || 'editor'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
