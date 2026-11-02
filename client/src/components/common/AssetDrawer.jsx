import React, { useState, useEffect } from 'react';
import {
  Upload,
  Plus,
  Play,
  Pause,
  Loader2,
  X
} from 'lucide-react';
import { api } from '../../utils/api';
import { useProject } from '../../context/ProjectContext';

export default function AssetDrawer({ isOpen, onClose }) {
  const { currentProject, activeModule, updateImageState, updateAudioState, updateVideoState } = useProject();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [isUploading, setIsUploading] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioAudioObj, setAudioAudioObj] = useState(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await api.get('/assets');
      setAssets(data.assets || []);
    } catch (err) {
      console.error('[AssetDrawer] Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
    return () => {
      if (audioAudioObj) {
        audioAudioObj.pause();
      }
    };
  }, [isOpen]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await api.uploadFile(file, {
        projectId: currentProject?._id
      });
      setAssets(prev => [res.asset, ...prev]);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddAssetToCurrentProject = (asset) => {
    if (asset.type === 'image') {
      updateImageState({ imageSrc: asset.url }, `Added image "${asset.name}"`);
    } else if (asset.type === 'audio') {
      if (activeModule === 'audio') {
        updateAudioState({ audioSrc: asset.url }, `Switched project audio to "${asset.name}"`);
      } else {
        updateVideoState(prev => {
          const tracks = [...(prev.tracks || [])];
          let audioTrack = tracks.find(t => t.type === 'audio');
          if (!audioTrack) {
            audioTrack = { id: 'track-audio-' + Date.now(), name: 'BGM Track', type: 'audio', clips: [] };
            tracks.push(audioTrack);
          }
          audioTrack.clips.push({
            id: 'clip-audio-' + Date.now(),
            name: asset.name,
            src: asset.url,
            filePath: asset.filePath,
            start: 0,
            duration: asset.duration || 6.0,
            volume: 0.8,
            color: '#059669'
          });
          return { ...prev, tracks };
        }, `Added audio "${asset.name}" to timeline`);
      }
    } else if (asset.type === 'video') {
      updateVideoState(prev => {
        const tracks = [...(prev.tracks || [])];
        let videoTrack = tracks.find(t => t.type === 'video');
        if (!videoTrack) {
          videoTrack = { id: 'track-v-' + Date.now(), name: 'Video Track 1', type: 'video', clips: [] };
          tracks.push(videoTrack);
        }
        const lastClip = videoTrack.clips[videoTrack.clips.length - 1];
        const nextStart = lastClip ? (lastClip.start + lastClip.duration) : 0;
        videoTrack.clips.push({
          id: 'clip-v-' + Date.now(),
          name: asset.name,
          src: asset.url,
          filePath: asset.filePath,
          start: nextStart,
          duration: asset.duration || 5.0,
          trimStart: 0,
          trimEnd: asset.duration || 5.0,
          volume: 1.0,
          color: '#2563eb'
        });
        const totalDuration = Math.max(prev.duration || 10, nextStart + (asset.duration || 5.0));
        return { ...prev, tracks, duration: totalDuration };
      }, `Added video clip "${asset.name}" to timeline`);
    }
  };

  const toggleAudioPreview = (asset) => {
    if (playingAudioId === asset._id) {
      if (audioAudioObj) {
        audioAudioObj.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioAudioObj) {
        audioAudioObj.pause();
      }
      const sound = new Audio(asset.url);
      sound.play();
      sound.onended = () => setPlayingAudioId(null);
      setAudioAudioObj(sound);
      setPlayingAudioId(asset._id);
    }
  };

  const filteredAssets = assets.filter(a => filterType === 'all' || a.type === filterType);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/20 backdrop-blur-xs z-40 sm:hidden"
      />

      <div className="fixed inset-y-0 left-0 w-full sm:w-80 bg-white border-r border-neutral-200 shadow-xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              Media Assets
            </span>
            <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 font-mono">
              {filteredAssets.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Upload */}
        <div className="p-3 border-b border-neutral-200 space-y-2.5">
          <label className="flex items-center justify-center space-x-2 w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md cursor-pointer transition text-xs font-medium shadow-sm">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isUploading ? 'Uploading Media...' : 'Upload Media File'}</span>
            <input
              type="file"
              className="hidden"
              accept="image/*,audio/*,video/*"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>

          <div className="grid grid-cols-4 gap-1 bg-neutral-100 p-1 rounded-md border border-neutral-200">
            {[
              { id: 'all', label: 'All' },
              { id: 'image', label: 'Images' },
              { id: 'audio', label: 'Audio' },
              { id: 'video', label: 'Video' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`py-1 text-[11px] rounded transition font-medium ${
                  filterType === t.id
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400 space-y-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading media assets...</span>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs">
              No media assets found in this filter.
            </div>
          ) : (
            filteredAssets.map(asset => (
              <div
                key={asset._id}
                className="group p-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100/90 border border-neutral-200 transition flex items-center justify-between space-x-2"
              >
                {/* Thumbnail / Preview */}
                <div className="w-10 h-10 rounded bg-neutral-200 border border-neutral-300/80 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  {asset.type === 'image' && (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  )}
                  {asset.type === 'video' && (
                    <video src={asset.url} className="w-full h-full object-cover" muted />
                  )}
                  {asset.type === 'audio' && (
                    <button
                      onClick={() => toggleAudioPreview(asset)}
                      className="w-full h-full flex items-center justify-center text-neutral-700 hover:text-neutral-900 transition"
                    >
                      {playingAudioId === asset._id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-neutral-900 truncate" title={asset.name}>
                    {asset.name}
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-neutral-500 mt-0.5">
                    <span className="uppercase font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-200/80 text-neutral-700">
                      {asset.type}
                    </span>
                    {asset.duration ? <span>{asset.duration.toFixed(1)}s</span> : null}
                  </div>
                </div>

                {/* Insert */}
                <button
                  onClick={() => handleAddAssetToCurrentProject(asset)}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-900 hover:text-white text-neutral-700 border border-neutral-300 rounded text-[11px] font-medium transition flex items-center space-x-1 shadow-2xs"
                  title="Add to project"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
