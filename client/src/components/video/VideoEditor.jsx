import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Download,
  Film,
  Type,
  Music,
  Loader2
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export default function VideoEditor() {
  const { videoState, updateVideoState, renderVideoFFmpeg } = useProject();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState(null);
  const [mobileSection, setMobileSection] = useState('preview'); // 'preview' | 'properties'

  const videoPlayerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isScrubbingRef = useRef(false);

  const totalDuration = videoState?.duration || 10.0;
  const tracks = videoState?.tracks || [];

  const videoTrack = tracks.find(t => t.type === 'video');
  const activeVideoClip = videoTrack?.clips?.find(
    c => currentTime >= c.start && currentTime <= (c.start + c.duration)
  );

  const textTrack = tracks.find(t => t.type === 'text');
  const activeTextClip = textTrack?.clips?.find(
    c => currentTime >= c.start && currentTime <= (c.start + c.duration)
  );

  const audioTrack = tracks.find(t => t.type === 'audio');
  const activeAudioClip = audioTrack?.clips?.find(
    c => currentTime >= c.start && currentTime <= (c.start + c.duration)
  );

  // Sync video element with activeVideoClip
  useEffect(() => {
    const videoEl = videoPlayerRef.current;
    if (!videoEl) return;

    if (activeVideoClip) {
      if (!videoEl.src.includes(activeVideoClip.src)) {
        videoEl.src = activeVideoClip.src;
      }
      const clipLocalOffset = (currentTime - activeVideoClip.start) + (activeVideoClip.trimStart || 0);
      if (Math.abs(videoEl.currentTime - clipLocalOffset) > 0.3) {
        videoEl.currentTime = clipLocalOffset;
      }
      videoEl.volume = activeVideoClip.volume !== undefined ? activeVideoClip.volume : 1.0;
      videoEl.playbackRate = activeVideoClip.speed || 1.0;

      if (isPlaying && videoEl.paused) {
        videoEl.play().catch(() => {});
      } else if (!isPlaying && !videoEl.paused) {
        videoEl.pause();
      }
    } else {
      if (!videoEl.paused) videoEl.pause();
    }
  }, [activeVideoClip, currentTime, isPlaying]);

  // Sync background audio
  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl) return;

    if (activeAudioClip) {
      if (!audioEl.src.includes(activeAudioClip.src)) {
        audioEl.src = activeAudioClip.src;
      }
      const clipLocalOffset = (currentTime - activeAudioClip.start);
      if (Math.abs(audioEl.currentTime - clipLocalOffset) > 0.3) {
        audioEl.currentTime = clipLocalOffset;
      }
      audioEl.volume = activeAudioClip.volume !== undefined ? activeAudioClip.volume : 0.8;

      if (isPlaying && audioEl.paused) {
        audioEl.play().catch(() => {});
      } else if (!isPlaying && !audioEl.paused) {
        audioEl.pause();
      }
    } else {
      if (!audioEl.paused) audioEl.pause();
    }
  }, [activeAudioClip, currentTime, isPlaying]);

  // Main playback tick animation frame
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (timestamp) => {
      const delta = (timestamp - lastStamp) / 1000;
      lastStamp = timestamp;

      if (isPlaying && !isScrubbingRef.current) {
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleSeek = (targetTime) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetTime));
    setCurrentTime(clamped);
  };

  const handleScrubAtClientX = (containerEl, clientX) => {
    const rect = containerEl.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const seekTime = Math.max(0, clickX / zoomLevel);
    handleSeek(seekTime);
  };

  const handleTimelineMouseDown = (e) => {
    const target = e.currentTarget;
    isScrubbingRef.current = true;
    handleScrubAtClientX(target, e.clientX);

    const onMouseMove = (moveEvent) => {
      handleScrubAtClientX(target, moveEvent.clientX);
    };

    const onMouseUp = () => {
      isScrubbingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTimelineTouch = (e) => {
    const target = e.currentTarget;
    if (e.touches[0]) {
      isScrubbingRef.current = true;
      handleScrubAtClientX(target, e.touches[0].clientX);
    }
  };

  const handleSplitClipAtPlayhead = () => {
    if (!activeVideoClip) return;
    const splitOffset = currentTime - activeVideoClip.start;
    if (splitOffset <= 0.3 || splitOffset >= activeVideoClip.duration - 0.3) return;

    updateVideoState(prev => {
      const tracks = [...prev.tracks];
      const vTrack = tracks.find(t => t.type === 'video');
      if (!vTrack) return prev;

      const clipIdx = vTrack.clips.findIndex(c => c.id === activeVideoClip.id);
      if (clipIdx === -1) return prev;

      const origClip = vTrack.clips[clipIdx];
      const part1Duration = splitOffset;
      const part2Duration = origClip.duration - splitOffset;

      const part1 = { ...origClip, duration: part1Duration };
      const part2 = {
        ...origClip,
        id: 'clip-v-' + Date.now(),
        name: origClip.name + ' (Part 2)',
        start: origClip.start + part1Duration,
        duration: part2Duration,
        trimStart: (origClip.trimStart || 0) + part1Duration
      };

      vTrack.clips.splice(clipIdx, 1, part1, part2);
      return { ...prev, tracks };
    }, `Split clip at ${formatTime(currentTime)}`);
  };

  const handleDeleteSelectedClip = () => {
    if (!selectedClipId) return;
    updateVideoState(prev => {
      const tracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(c => c.id !== selectedClipId)
      }));
      return { ...prev, tracks };
    }, 'Deleted timeline clip');
    setSelectedClipId(null);
  };

  const handleAddTextOverlay = () => {
    updateVideoState(prev => {
      const tracks = [...prev.tracks];
      let tTrack = tracks.find(t => t.type === 'text');
      if (!tTrack) {
        tTrack = { id: 'track-text-' + Date.now(), name: 'Text & Titles', type: 'text', clips: [] };
        tracks.push(tTrack);
      }
      tTrack.clips.push({
        id: 'clip-text-' + Date.now(),
        name: 'Title Card',
        text: 'Headline Title',
        start: currentTime,
        duration: 3.0,
        fontSize: 36,
        color: '#ffffff',
        position: 'center'
      });
      return { ...prev, tracks };
    }, `Added text overlay at ${formatTime(currentTime)}`);
  };

  const handleUpdateSelectedClip = (updates) => {
    if (!selectedClipId) return;
    updateVideoState(prev => {
      const tracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(c => c.id === selectedClipId ? { ...c, ...updates } : c)
      }));
      return { ...prev, tracks };
    }, 'Updated clip properties');
  };

  const handleFFmpegRender = async () => {
    setIsRendering(true);
    setRenderResult(null);
    try {
      const res = await renderVideoFFmpeg();
      setRenderResult(res);
    } catch (err) {
      alert('Video rendering failed: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const formatTime = (secs = 0) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  let selectedClip = null;
  let selectedClipTrack = null;
  for (const track of tracks) {
    const found = track.clips.find(c => c.id === selectedClipId);
    if (found) {
      selectedClip = found;
      selectedClipTrack = track;
      break;
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-neutral-100">
      <audio ref={audioPlayerRef} />

      {/* Mobile Top View Switcher */}
      <div className="flex lg:hidden bg-white border-b border-neutral-200 p-1">
        <button
          onClick={() => setMobileSection('preview')}
          className={`flex-1 py-1.5 text-xs font-medium rounded ${
            mobileSection === 'preview' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
          }`}
        >
          Video Preview
        </button>
        <button
          onClick={() => setMobileSection('properties')}
          className={`flex-1 py-1.5 text-xs font-medium rounded ${
            mobileSection === 'properties' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
          }`}
        >
          Clip Properties
        </button>
      </div>

      {/* Top Section: Video Preview + Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row border-b border-neutral-200 overflow-hidden min-h-[260px]">
        {/* Video Canvas Preview */}
        <div
          className={`${
            mobileSection === 'preview' ? 'flex' : 'hidden lg:flex'
          } flex-1 flex-col items-center justify-center p-3 sm:p-5 bg-neutral-100 relative`}
        >
          <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden shadow-sm border border-neutral-300 flex items-center justify-center">
            <video
              ref={videoPlayerRef}
              playsInline
              className="w-full h-full object-contain"
            />

            {/* Dynamic Text Overlay */}
            {activeTextClip && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 text-center">
                <div
                  className="font-bold tracking-tight px-3 py-1.5 rounded"
                  style={{
                    fontSize: `${activeTextClip.fontSize || 36}px`,
                    color: activeTextClip.color || '#ffffff',
                    backgroundColor: 'rgba(0,0,0,0.65)'
                  }}
                >
                  {activeTextClip.text}
                </div>
              </div>
            )}

            {!activeVideoClip && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 space-y-1.5 bg-neutral-900/80">
                <Film className="w-6 h-6 opacity-40 text-white" />
                <span className="text-xs text-neutral-300">No clip active at current playhead position</span>
              </div>
            )}
          </div>

          {/* Quick Player Bar */}
          <div className="flex items-center space-x-3 mt-3">
            <button
              onClick={() => handleSeek(0)}
              className="p-1.5 rounded bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-300 transition"
              title="Return to start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center shadow-xs transition hover:scale-105"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <span className="font-mono text-xs text-neutral-800">
              <span className="font-semibold">{formatTime(currentTime)}</span>
              <span className="text-neutral-500"> / {formatTime(totalDuration)}</span>
            </span>
          </div>
        </div>

        {/* Clip Properties Inspector */}
        <div
          className={`${
            mobileSection === 'properties' ? 'flex' : 'hidden lg:flex'
          } w-full lg:w-72 bg-white border-l border-neutral-200 p-4 flex-col overflow-y-auto text-xs space-y-4`}
        >
          <div className="font-semibold text-neutral-800 uppercase tracking-wider text-[11px] pb-1 border-b border-neutral-200 flex items-center justify-between">
            <span>Clip Properties</span>
            {selectedClip && (
              <button
                onClick={handleDeleteSelectedClip}
                className="text-neutral-400 hover:text-rose-600 p-1"
                title="Delete Clip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedClip ? (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase tracking-wider">Clip Title</label>
                <input
                  type="text"
                  value={selectedClip.name || ''}
                  onChange={(e) => handleUpdateSelectedClip({ name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>

              {selectedClipTrack?.type === 'text' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wider">Text</label>
                    <input
                      type="text"
                      value={selectedClip.text || ''}
                      onChange={(e) => handleUpdateSelectedClip({ text: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>Font Size</span>
                      <span className="font-mono">{selectedClip.fontSize || 36}px</span>
                    </div>
                    <input
                      type="range"
                      min="18"
                      max="72"
                      value={selectedClip.fontSize || 36}
                      onChange={(e) => handleUpdateSelectedClip({ fontSize: parseInt(e.target.value) })}
                      className="w-full cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {(selectedClipTrack?.type === 'video' || selectedClipTrack?.type === 'audio') && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-neutral-600">
                    <span>Clip Volume</span>
                    <span className="font-mono">{Math.round((selectedClip.volume !== undefined ? selectedClip.volume : 1.0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={selectedClip.volume !== undefined ? selectedClip.volume : 1.0}
                    onChange={(e) => handleUpdateSelectedClip({ volume: parseFloat(e.target.value) })}
                    className="w-full cursor-pointer"
                  />
                </div>
              )}

              {selectedClipTrack?.type === 'video' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Playback Speed</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.5, 1.0, 1.5, 2.0].map(s => (
                      <button
                        key={s}
                        onClick={() => handleUpdateSelectedClip({ speed: s })}
                        className={`py-1 rounded border text-[11px] font-mono transition ${
                          (selectedClip.speed || 1.0) === s
                            ? 'bg-neutral-900 border-neutral-900 text-white font-semibold'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-600 pt-1">
                <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                  Start: {formatTime(selectedClip.start)}
                </div>
                <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                  Length: {selectedClip.duration.toFixed(1)}s
                </div>
              </div>
            </div>
          ) : (
            <div className="text-neutral-400 text-[11px] py-6 text-center">
              Tap any clip on the timeline to edit its properties.
            </div>
          )}

          {/* Export Action */}
          <div className="pt-4 border-t border-neutral-200 space-y-2 mt-auto">
            {renderResult && (
              <a
                href={renderResult.url}
                download={renderResult.filename}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium shadow-xs transition text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Video ({Math.round((renderResult.fileSize || 0) / 1024)} KB)</span>
              </a>
            )}

            <button
              onClick={handleFFmpegRender}
              disabled={isRendering}
              className="w-full flex items-center justify-center space-x-1.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-medium shadow-xs transition text-xs"
            >
              {isRendering ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isRendering ? 'Rendering...' : 'Export Video (FFmpeg)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="h-60 sm:h-64 bg-white border-t border-neutral-200 flex flex-col z-20">
        {/* Timeline Actions Bar */}
        <div className="h-10 px-3 sm:px-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSplitClipAtPlayhead}
              disabled={!activeVideoClip}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition ${
                activeVideoClip
                  ? 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-900'
                  : 'border-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
              title="Split at playhead"
            >
              <Scissors className="w-3 h-3" />
              <span>Split Clip</span>
            </button>

            <button
              onClick={handleAddTextOverlay}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white border border-neutral-300 text-neutral-800 hover:border-neutral-900 transition"
              title="Add text overlay"
            >
              <Type className="w-3 h-3" />
              <span>Add Text</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-neutral-600">
            <button
              onClick={() => setZoomLevel(prev => Math.max(20, prev - 10))}
              className="p-1 hover:text-neutral-950 transition"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px]">{zoomLevel}px/s</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(120, prev + 10))}
              className="p-1 hover:text-neutral-950 transition"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Headers */}
          <div className="w-24 sm:w-32 bg-neutral-50 border-r border-neutral-200 flex flex-col flex-shrink-0 text-xs">
            <div className="h-6 border-b border-neutral-200 bg-neutral-100 px-2 sm:px-3 flex items-center text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Tracks
            </div>
            {tracks.map(track => (
              <div
                key={track.id}
                className="h-14 border-b border-neutral-200 px-2 sm:px-3 flex items-center text-neutral-800 font-medium"
              >
                <div className="flex items-center space-x-1.5 truncate text-[11px]">
                  {track.type === 'video' && <Film className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                  {track.type === 'text' && <Type className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                  {track.type === 'audio' && <Music className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                  <span className="truncate">{track.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Lanes */}
          <div
            ref={timelineContainerRef}
            className="flex-1 overflow-x-auto overflow-y-hidden relative timeline-track-grid bg-white"
          >
            <div
              className="relative min-w-full h-full"
              style={{ width: `${Math.max(totalDuration * zoomLevel + 200, 600)}px` }}
            >
              {/* Ruler */}
              <div
                onMouseDown={handleTimelineMouseDown}
                onTouchStart={handleTimelineTouch}
                onTouchMove={handleTimelineTouch}
                className="h-6 border-b border-neutral-200 bg-neutral-100/90 cursor-pointer relative flex items-center select-none"
              >
                {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => (
                  <div
                    key={sec}
                    className="absolute border-l border-neutral-300 text-[9px] font-mono text-neutral-500 pl-1 h-full flex items-center"
                    style={{ left: `${sec * zoomLevel}px` }}
                  >
                    {formatTime(sec)}
                  </div>
                ))}
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-30"
                style={{ left: `${currentTime * zoomLevel}px` }}
              >
                <div className="w-2.5 h-2.5 -ml-1 bg-neutral-900 rounded-xs shadow-xs" />
                <div className="w-[1.5px] h-full bg-neutral-900 shadow-xs" />
              </div>

              {/* Clips */}
              {tracks.map(track => (
                <div
                  key={track.id}
                  className="h-14 border-b border-neutral-200/80 relative flex items-center px-1"
                >
                  {track.clips.map(clip => {
                    const isSelected = clip.id === selectedClipId;
                    const left = clip.start * zoomLevel;
                    const width = Math.max(30, clip.duration * zoomLevel);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setMobileSection('properties');
                        }}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          backgroundColor: clip.color || (track.type === 'video' ? '#2563eb' : (track.type === 'text' ? '#7c3aed' : '#059669'))
                        }}
                        className={`absolute h-10 rounded-md text-xs px-2.5 flex items-center justify-between cursor-pointer transition shadow-2xs ${
                          isSelected
                            ? 'ring-2 ring-neutral-900 ring-offset-1'
                            : 'hover:opacity-95'
                        }`}
                      >
                        <div className="truncate font-medium text-white text-[11px]">
                          {clip.name}
                        </div>
                        <span className="font-mono text-[9px] text-white/90 ml-1">
                          {clip.duration.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
