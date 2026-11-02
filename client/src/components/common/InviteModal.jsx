import React, { useState } from 'react';
import { X, Copy, Check, UserPlus, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import { useProject } from '../../context/ProjectContext';

export default function InviteModal({ isOpen, onClose }) {
  const { currentProject, setCurrentProject } = useProject();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isOpen || !currentProject) return null;

  const projectUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(projectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setMsg('');
    try {
      const res = await api.post(`/projects/${currentProject._id}/collaborators`, {
        email: email.trim(),
        role
      });
      setCurrentProject(res.project);
      setMsg(`Success: ${res.message}`);
      setEmail('');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <span className="font-semibold text-sm text-neutral-900">Project Collaboration</span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Share Link */}
          <div className="space-y-1.5">
            <label className="text-neutral-700 text-[11px] font-medium">Direct Project Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={projectUrl}
                className="flex-1 bg-neutral-50 border border-neutral-300 rounded px-3 py-1.5 text-xs text-neutral-800 font-mono truncate outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded flex items-center space-x-1.5 transition font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Open this URL in another tab or send it to teammates for synchronized real-time editing.
            </p>
          </div>

          {/* Direct Invite Form */}
          <form onSubmit={handleInvite} className="pt-3 border-t border-neutral-200 space-y-3">
            <label className="text-neutral-700 text-[11px] font-medium block">Invite by Email</label>
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="colleague@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white border border-neutral-300 rounded px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 outline-none"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className={`w-full py-2 rounded-lg font-medium flex items-center justify-center space-x-1.5 transition text-xs ${
                email.trim()
                  ? 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              <span>Add Collaborator</span>
            </button>

            {msg && (
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-700">
                {msg}
              </div>
            )}
          </form>

          {/* Collaborator List */}
          <div className="pt-2 border-t border-neutral-200 space-y-2">
            <span className="text-neutral-700 text-[11px] font-medium block">Team Members</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              <div className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200 text-xs">
                <span className="text-neutral-900 font-medium">{currentProject.owner?.username || 'Owner'}</span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700">
                  Owner
                </span>
              </div>
              {(currentProject.collaborators || []).map((collab, idx) => (
                <div
                  key={collab.user?._id || idx}
                  className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200 text-xs"
                >
                  <span className="text-neutral-700">{collab.user?.username || collab.user?.email || 'Collaborator'}</span>
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200">
                    {collab.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
