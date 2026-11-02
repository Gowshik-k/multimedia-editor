import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Bookmark,
  Download,
  Loader2
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export default function AudioEditor() {
  const { audioState, updateAudioState, renderAudioFFmpeg } = useProject();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(8.0);
  const [waveformPeaks, setWaveformPeaks] = useState([]);
  const [exportResult, setExportResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mobileTab, setMobileTab] = useState('waveform'); // 'waveform' | 'inspector'

  const audioRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const isDraggingScrubber = useRef(false);

  // Decode audio or generate peaks
  useEffect(() => {
    if (!audioState?.audioSrc) return;

    const audio = audioRef.current;
    if (audio) {
      audio.src = audioState.audioSrc;
      audio.volume = Math.min(1.0, (audioState.volume !== undefined ? audioState.volume : 1.0));
      audio.playbackRate = audioState.playbackSpeed || 1.0;
    }

    let audioCtx = null;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      fetch(audioState.audioSrc)
        .then(res => res.arrayBuffer())
        .then(buffer => audioCtx.decodeAudioData(buffer))
        .then(decodedData => {
          setDuration(decodedData.duration);
          const channelData = decodedData.getChannelData(0);
          const samples = 180;
          const blockSize = Math.floor(channelData.length / samples);
          const peaks = [];
          for (let i = 0; i < samples; i++) {
            let max = 0;
            for (let j = 0; j < blockSize; j++) {
              const val = Math.abs(channelData[i * blockSize + j]);
              if (val > max) max = val;
            }
            peaks.push(max);
          }
          setWaveformPeaks(peaks);

          if (!audioState.trim || !audioState.trim.end) {
            updateAudioState({
              originalDuration: decodedData.duration,
              trim: { start: 0, end: decodedData.duration }
            }, 'Initialized audio duration');
          }
        })
        .catch(err => {
          console.warn('[AudioContext] Waveform synthetic fallback:', err.message);
          const syntheticPeaks = Array.from({ length: 180 }, (_, i) => {
            return 0.2 + 0.6 * Math.abs(Math.sin(i / 10) * Math.cos(i / 5));
          });
          setWaveformPeaks(syntheticPeaks);
        });
    } catch (e) {
      console.warn('[AudioContext] Blocked:', e);
    }

    return () => {
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [audioState?.audioSrc]);

  // Audio playback loop tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!isDraggingScrubber.current) {
        setCurrentTime(audio.currentTime);

        const trimEnd = audioState?.trim?.end;
        if (trimEnd && audio.currentTime >= trimEnd) {
          if (audioState.loop) {
            audio.currentTime = audioState.trim.start || 0;
            audio.play();
          } else {
            audio.pause();
            setIsPlaying(false);
          }
        }
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audioState?.trim?.start || 0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioState]);

  // Render Waveform Canvas in Light Mode
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 160;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const peaks = waveformPeaks.length > 0 ? waveformPeaks : Array.from({ length: 140 }, () => 0.4);
    const barWidth = width / peaks.length;
    const trimStart = audioState?.trim?.start || 0;
    const trimEnd = audioState?.trim?.end || duration;

    // Center guideline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform bars
    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const timeAtBar = (i / peaks.length) * duration;
      const barHeight = Math.max(4, peak * (height * 0.8));
      const y = (height - barHeight) / 2;

      const isInTrim = timeAtBar >= trimStart && timeAtBar <= trimEnd;
      const isPastPlayhead = timeAtBar <= currentTime;

      if (isInTrim) {
        if (isPastPlayhead) {
          ctx.fillStyle = '#1d4ed8'; // Darker blue
        } else {
          ctx.fillStyle = '#3b82f6'; // Bright blue
        }
      } else {
        ctx.fillStyle = '#cbd5e1'; // Soft gray
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(1, barWidth - 2), barHeight, 2);
      ctx.fill();
    });

    // Markers
    const markers = audioState?.markers || [];
    markers.forEach(m => {
      const markerX = (m.time / duration) * width;
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, height);
      ctx.stroke();

      ctx.fillStyle = '#ea580c';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(m.label, markerX + 4, 14);
    });

    // Playhead line
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(playheadX, 5, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [waveformPeaks, currentTime, duration, audioState]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const trimStart = audioState?.trim?.start || 0;
      const trimEnd = audioState?.trim?.end || duration;
      if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart;
      }
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (time) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(duration, time));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleScrubClientX = (clientX) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    handleSeek(ratio * duration);
  };

  const handleSetInPoint = () => {
    const start = currentTime;
    const end = Math.max(start + 0.5, audioState?.trim?.end || duration);
    updateAudioState(prev => ({
      ...prev,
      trim: { start, end }
    }), `Set in-point to ${formatTime(start)}`);
  };

  const handleSetOutPoint = () => {
    const end = currentTime;
    const start = Math.min(end - 0.5, audioState?.trim?.start || 0);
    updateAudioState(prev => ({
      ...prev,
      trim: { start: Math.max(0, start), end }
    }), `Set out-point to ${formatTime(end)}`);
  };

  const handleVolumeChange = (val) => {
    const num = parseFloat(val);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = Math.min(1.0, num);
    }
    updateAudioState(prev => ({ ...prev, volume: num }), `Adjusted volume to ${Math.round(num * 100)}%`);
  };

  const handlePanChange = (val) => {
    const num = parseFloat(val);
    updateAudioState(prev => ({ ...prev, pan: num }), `Adjusted pan to ${num}`);
  };

  const handleSpeedChange = (speed) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
    updateAudioState(prev => ({ ...prev, playbackSpeed: speed }), `Changed speed to ${speed}x`);
  };

  const handleAddMarker = () => {
    const newMarker = {
      id: 'marker-' + Date.now(),
      time: currentTime,
      label: `Cue ${formatTime(currentTime)}`
    };
    updateAudioState(prev => ({
      ...prev,
      markers: [...(prev.markers || []), newMarker]
    }), `Added cue at ${formatTime(currentTime)}`);
  };

  const handleDeleteMarker = (id) => {
    updateAudioState(prev => ({
      ...prev,
      markers: (prev.markers || []).filter(m => m.id !== id)
    }), 'Deleted cue');
  };

  const handleFFmpegExport = async () => {
    setIsExporting(true);
    setExportResult(null);
    try {
      const res = await renderAudioFFmpeg({
        startTime: audioState?.trim?.start || 0,
        endTime: audioState?.trim?.end || duration,
        volume: audioState?.volume || 1.0
      });
      setExportResult(res);
    } catch (err) {
      alert('Audio processing failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (secs = 0) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const trimDuration = Math.max(0, (audioState?.trim?.end || duration) - (audioState?.trim?.start || 0));

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden select-none bg-neutral-100">
      <audio ref={audioRef} />

      {/* Mobile Top View Switcher */}
      <div className="flex md:hidden bg-white border-b border-neutral-200 p-1">
        <button
          onClick={() => setMobileTab('waveform')}
          className={`flex-1 py-1.5 text-xs font-medium rounded ${
            mobileTab === 'waveform' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
          }`}
        >
          Waveform & Controls
        </button>
        <button
          onClick={() => setMobileTab('inspector')}
          className={`flex-1 py-1.5 text-xs font-medium rounded ${
            mobileTab === 'inspector' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
          }`}
        >
          Inspector & Levels
        </button>
      </div>

      {/* Left Control Panel */}
      <div
        className={`${
          mobileTab === 'inspector' ? 'flex' : 'hidden md:flex'
        } w-full md:w-80 bg-white border-r border-neutral-200 flex-col h-full z-10 text-xs`}
      >
        <div className="p-3.5 border-b border-neutral-200 font-semibold text-neutral-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
          <span>Audio Inspector</span>
          <span className="font-mono text-[10px] text-neutral-600">
            {formatTime(currentTime)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Trim */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-700 uppercase tracking-wider text-[10px]">
                Trim & Boundary
              </span>
              <span className="font-mono text-neutral-500 text-[11px]">
                Span: {trimDuration.toFixed(2)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSetInPoint}
                className="py-2 px-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded text-left transition"
              >
                <div className="text-[10px] text-neutral-500">Mark In [ [</div>
                <div className="font-mono text-neutral-900 font-semibold mt-0.5">
                  {formatTime(audioState?.trim?.start || 0)}
                </div>
              </button>

              <button
                onClick={handleSetOutPoint}
                className="py-2 px-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded text-left transition"
              >
                <div className="text-[10px] text-neutral-500">Mark Out ] ]</div>
                <div className="font-mono text-neutral-900 font-semibold mt-0.5">
                  {formatTime(audioState?.trim?.end || duration)}
                </div>
              </button>
            </div>

            <button
              onClick={() => updateAudioState(prev => ({
                ...prev,
                trim: { start: 0, end: duration }
              }), 'Reset trim boundaries')}
              className="text-[10px] text-neutral-500 hover:text-neutral-900 transition underline"
            >
              Reset Boundaries to Full Audio
            </button>
          </div>

          {/* Gain & Pan */}
          <div className="space-y-3 pt-3 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-700 uppercase tracking-wider text-[10px]">
                Volume & Gain
              </span>
              <span className="font-mono text-neutral-600 text-[11px]">
                {Math.round((audioState?.volume !== undefined ? audioState.volume : 1.0) * 100)}%
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-neutral-500" />
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={audioState?.volume !== undefined ? audioState.volume : 1.0}
                onChange={(e) => handleVolumeChange(e.target.value)}
                className="flex-1 cursor-pointer"
              />
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-neutral-500 text-[10px]">
                <span>Stereo Pan</span>
                <span className="font-mono">
                  {audioState?.pan === 0 ? 'Center' : (audioState?.pan < 0 ? `L ${Math.abs(audioState.pan)}` : `R ${audioState?.pan}`)}
                </span>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.1"
                value={audioState?.pan || 0}
                onChange={(e) => handlePanChange(e.target.value)}
                className="w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Speed */}
          <div className="space-y-2 pt-3 border-t border-neutral-200">
            <span className="font-semibold text-neutral-700 uppercase tracking-wider text-[10px] block">
              Speed
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 1.5, 2.0].map(s => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`py-1 rounded border text-[11px] font-mono transition ${
                    (audioState?.playbackSpeed || 1.0) === s
                      ? 'bg-neutral-900 border-neutral-900 text-white font-semibold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Markers */}
          <div className="space-y-2.5 pt-3 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-700 uppercase tracking-wider text-[10px]">
                Cue Markers
              </span>
              <button
                onClick={handleAddMarker}
                className="text-[10px] bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded border border-neutral-300 transition flex items-center space-x-1"
              >
                <Bookmark className="w-3 h-3" />
                <span>Add Marker</span>
              </button>
            </div>

            {(audioState?.markers || []).length === 0 ? (
              <div className="text-neutral-400 text-[11px] py-1">No markers placed. Tap "Add Marker" to pin current playhead.</div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(audioState?.markers || []).map(m => (
                  <div
                    key={m.id}
                    onClick={() => handleSeek(m.time)}
                    className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 flex items-center justify-between cursor-pointer group text-[11px]"
                  >
                    <span className="font-mono text-neutral-800 font-medium">{formatTime(m.time)}</span>
                    <span className="text-neutral-500 truncate max-w-[90px]">{m.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMarker(m.id);
                      }}
                      className="text-neutral-400 hover:text-rose-600 p-0.5"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Waveform & Transport Area */}
      <div
        className={`${
          mobileTab === 'waveform' ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col items-center justify-between p-3 sm:p-6 overflow-hidden bg-neutral-50`}
      >
        {/* Info */}
        <div className="w-full max-w-4xl flex items-center justify-between text-xs text-neutral-600 pb-2">
          <div className="truncate max-w-[200px] sm:max-w-md font-medium text-neutral-900">
            {audioState?.audioSrc?.split('/').pop() || 'Track Audio'}
          </div>

          <div className="font-mono text-sm text-neutral-800">
            <span className="font-semibold text-neutral-950">{formatTime(currentTime)}</span>
            <span className="text-neutral-400"> / {formatTime(duration)}</span>
          </div>
        </div>

        {/* Waveform Card */}
        <div className="w-full max-w-4xl bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-sm relative">
          <div
            onClick={(e) => handleScrubClientX(e.clientX)}
            onTouchStart={(e) => {
              if (e.touches[0]) handleScrubClientX(e.touches[0].clientX);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handleScrubClientX(e.touches[0].clientX);
            }}
            className="w-full h-36 sm:h-44 rounded-lg bg-neutral-50 border border-neutral-200 cursor-pointer relative overflow-hidden flex items-center"
          >
            <canvas ref={waveformCanvasRef} className="w-full h-full block" />
          </div>

          {/* In/Out Tags */}
          <div className="flex justify-between items-center text-[11px] font-mono text-neutral-500 mt-3 px-1">
            <span>In: {formatTime(audioState?.trim?.start || 0)}</span>
            <span className="text-neutral-400">Active: {trimDuration.toFixed(2)}s</span>
            <span>Out: {formatTime(audioState?.trim?.end || duration)}</span>
          </div>
        </div>

        {/* Transport Bar */}
        <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-neutral-200 p-3 rounded-xl shadow-xs mt-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleSeek(audioState?.trim?.start || 0)}
              className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition"
              title="Return to In-point"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center shadow-sm transition hover:scale-105"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => updateAudioState(prev => ({ ...prev, loop: !prev.loop }), 'Toggled audio loop')}
              className={`p-2 rounded-lg border text-xs font-medium transition ${
                audioState?.loop
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Loop
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {exportResult && (
              <a
                href={exportResult.url}
                download={exportResult.filename}
                className="flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-medium shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Download ({Math.round((exportResult.fileSize || 0) / 1024)} KB)</span>
              </a>
            )}

            <button
              onClick={handleFFmpegExport}
              disabled={isExporting}
              className="flex items-center space-x-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-2 rounded-lg font-medium shadow-xs transition"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Processing...' : 'Export Trimmed (FFmpeg)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
