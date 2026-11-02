import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  LogOut,
  User
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Project Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('video');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.get('/projects');
      setProjects(data.projects || []);
    } catch (err) {
      console.error('[Dashboard] Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await api.post('/projects', {
        title: newTitle.trim(),
        description: newDesc.trim(),
        type: newType
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      navigate(`/project/${res.project._id}`);
    } catch (err) {
      alert('Failed to create project: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p._id !== projectId));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleQuickDemoLaunch = (type) => {
    const matching = projects.find(p => p.type === type);
    if (matching) {
      navigate(`/project/${matching._id}`);
    } else {
      setNewType(type);
      setNewTitle(`Demo ${type.charAt(0).toUpperCase() + type.slice(1)} Project`);
      setShowCreateModal(true);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-16 border-b border-neutral-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded bg-neutral-900 flex items-center justify-center text-white font-mono text-xs font-bold">
            O
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-neutral-900">
              Omni<span className="font-normal text-neutral-500">Media Studio</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>

          <div className="flex items-center space-x-2 pl-2 border-l border-neutral-200">
            <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-neutral-600" />
              )}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-medium text-neutral-900 truncate max-w-[120px]">{user?.username || 'Guest'}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-neutral-50 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Minimalist Overview Card */}
        <div className="p-5 sm:p-6 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
              Unified Multimedia Workspaces
            </h1>
            <p className="text-xs text-neutral-600 max-w-2xl leading-relaxed">
              Image adjustments and crop, audio waveform trimming, and multi-track video timeline editing synchronized in real time with backend FFmpeg rendering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => handleQuickDemoLaunch('image')}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-md text-xs font-medium transition shadow-2xs"
            >
              Image Studio
            </button>

            <button
              onClick={() => handleQuickDemoLaunch('audio')}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-md text-xs font-medium transition shadow-2xs"
            >
              Audio Studio
            </button>

            <button
              onClick={() => handleQuickDemoLaunch('video')}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-md text-xs font-medium transition shadow-2xs"
            >
              Video Timeline
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
          {/* Segmented Tabs */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 overflow-x-auto">
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'video', label: 'Video' },
              { id: 'audio', label: 'Audio' },
              { id: 'image', label: 'Image' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-900 transition"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-800" />
            <span className="text-xs">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center bg-neutral-50 rounded-xl border border-neutral-200 p-8 space-y-3">
            <div className="text-neutral-700 font-medium text-xs">No projects found in this category</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition"
            >
              Create New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredProjects.map(proj => (
              <div
                key={proj._id}
                onClick={() => navigate(`/project/${proj._id}`)}
                className="group bg-white hover:bg-neutral-50/80 border border-neutral-200 hover:border-neutral-300 rounded-xl p-4 transition duration-150 cursor-pointer shadow-2xs flex flex-col justify-between space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {proj.type}
                  </span>

                  <button
                    onClick={(e) => handleDeleteProject(e, proj._id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-600 p-1 rounded transition"
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-sm text-neutral-900 truncate">
                    {proj.title}
                  </div>
                  <div className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {proj.description || 'No description added.'}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}</span>
                  <span>{(proj.collaborators?.length || 0) + 1} member(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/30 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden flex flex-col text-xs">
            <div className="p-4 border-b border-neutral-200 font-semibold text-sm text-neutral-900">
              Create Project
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-neutral-700 text-[11px] font-medium">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Creative Promo Sequence"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-700 text-[11px] font-medium">Workspace Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'video', label: 'Video Timeline' },
                    { id: 'audio', label: 'Audio Studio' },
                    { id: 'image', label: 'Image Editor' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewType(t.id)}
                      className={`py-2 px-1 rounded-md border text-center transition ${
                        newType === t.id
                          ? 'bg-neutral-900 border-neutral-900 text-white font-medium'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-700 text-[11px] font-medium">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief notes about this project..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition shadow-xs"
                >
                  {isCreating ? 'Creating...' : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
