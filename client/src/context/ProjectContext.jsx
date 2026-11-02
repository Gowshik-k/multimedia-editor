import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { useSocket } from './SocketContext';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { sendStateUpdate, registerRemoteStateListener, sendCursorMove } = useSocket();

  const [currentProject, setCurrentProject] = useState(null);
  const [activeModule, setActiveModule] = useState('video'); // 'image' | 'audio' | 'video'
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Editing states
  const [imageState, setImageState] = useState(null);
  const [audioState, setAudioState] = useState(null);
  const [videoState, setVideoState] = useState(null);

  // Undo/Redo stacks
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Avoid circular updates when receiving remote socket events
  const isApplyingRemoteRef = useRef(false);

  const pushHistory = useCallback((stateSnapshot) => {
    if (isApplyingRemoteRef.current) return;
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    history.push(JSON.parse(JSON.stringify(stateSnapshot)));
    if (history.length > 30) history.shift();
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < history.length - 1);
  }, []);

  // Initialize or switch project
  const loadProject = useCallback(async (projectId) => {
    try {
      const data = await api.get(`/projects/${projectId}`);
      const proj = data.project;
      setCurrentProject(proj);
      setActiveModule(proj.type === 'unified' ? 'video' : proj.type);

      const state = proj.state || {};

      if (proj.type === 'image' || state.imageSrc) {
        setImageState(state.imageSrc ? state : {
          imageSrc: '/samples/sample-image.jpg',
          originalDimensions: { width: 1280, height: 720 },
          adjustments: { brightness: 0, contrast: 1.0, saturation: 1.0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0 },
          crop: { x: 0, y: 0, width: 1280, height: 720, aspect: 'free' },
          layers: []
        });
      }

      if (proj.type === 'audio' || state.audioSrc) {
        setAudioState(state.audioSrc ? state : {
          audioSrc: '/samples/sample-audio.mp3',
          originalDuration: 8.0,
          trim: { start: 0, end: 8.0 },
          volume: 1.0,
          pan: 0,
          playbackSpeed: 1.0,
          mute: false,
          loop: false,
          markers: []
        });
      }

      if (proj.type === 'video' || proj.type === 'unified' || state.tracks) {
        setVideoState(state.tracks ? state : {
          duration: 10.0,
          resolution: { width: 1280, height: 720 },
          fps: 30,
          tracks: []
        });
      }

      // Initialize history with initial state
      historyRef.current = [JSON.parse(JSON.stringify(state))];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);

      return proj;
    } catch (err) {
      console.error('[ProjectContext] Failed to load project:', err);
      throw err;
    }
  }, []);

  // Handle remote state updates via Socket.IO
  useEffect(() => {
    const unregister = registerRemoteStateListener(({ state, actionType, by }) => {
      if (!state) return;
      isApplyingRemoteRef.current = true;
      try {
        if (state.imageSrc !== undefined || state.layers !== undefined) {
          setImageState(prev => ({ ...prev, ...state }));
        }
        if (state.audioSrc !== undefined || state.trim !== undefined) {
          setAudioState(prev => ({ ...prev, ...state }));
        }
        if (state.tracks !== undefined || state.duration !== undefined) {
          setVideoState(prev => ({ ...prev, ...state }));
        }
      } finally {
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 50);
      }
    });

    return unregister;
  }, [registerRemoteStateListener]);

  // Update Image State
  const updateImageState = useCallback((updater, actionDescription = 'Updated image') => {
    setImageState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (!isApplyingRemoteRef.current && currentProject) {
        pushHistory(next);
        sendStateUpdate(currentProject._id, next, 'IMAGE_UPDATE', actionDescription);
      }
      return next;
    });
  }, [currentProject, sendStateUpdate, pushHistory]);

  // Update Audio State
  const updateAudioState = useCallback((updater, actionDescription = 'Updated audio') => {
    setAudioState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (!isApplyingRemoteRef.current && currentProject) {
        pushHistory(next);
        sendStateUpdate(currentProject._id, next, 'AUDIO_UPDATE', actionDescription);
      }
      return next;
    });
  }, [currentProject, sendStateUpdate, pushHistory]);

  // Update Video State
  const updateVideoState = useCallback((updater, actionDescription = 'Updated timeline') => {
    setVideoState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (!isApplyingRemoteRef.current && currentProject) {
        pushHistory(next);
        sendStateUpdate(currentProject._id, next, 'VIDEO_UPDATE', actionDescription);
      }
      return next;
    });
  }, [currentProject, sendStateUpdate, pushHistory]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      isApplyingRemoteRef.current = true;

      if (activeModule === 'image') setImageState(targetState);
      else if (activeModule === 'audio') setAudioState(targetState);
      else setVideoState(targetState);

      if (currentProject) {
        sendStateUpdate(currentProject._id, targetState, 'UNDO', 'Undid last change');
      }

      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 50);
    }
  }, [activeModule, currentProject, sendStateUpdate]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      isApplyingRemoteRef.current = true;

      if (activeModule === 'image') setImageState(targetState);
      else if (activeModule === 'audio') setAudioState(targetState);
      else setVideoState(targetState);

      if (currentProject) {
        sendStateUpdate(currentProject._id, targetState, 'REDO', 'Redid change');
      }

      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 50);
    }
  }, [activeModule, currentProject, sendStateUpdate]);

  // Persist project state to backend
  const saveProject = useCallback(async (customDescription) => {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      let combinedState = {};
      if (currentProject.type === 'image' || activeModule === 'image') combinedState = imageState;
      else if (currentProject.type === 'audio' || activeModule === 'audio') combinedState = audioState;
      else combinedState = videoState;

      const res = await api.put(`/projects/${currentProject._id}`, {
        state: combinedState,
        activityDescription: customDescription || 'Saved project changes'
      });

      setCurrentProject(res.project);
      setLastSavedTime(new Date());
    } catch (err) {
      console.error('[Project Save Error]', err);
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, activeModule, imageState, audioState, videoState]);

  // Server-side FFmpeg processing helper
  const renderAudioFFmpeg = async ({ startTime, endTime, volume }) => {
    if (!audioState?.audioSrc) throw new Error('No audio source loaded');
    setIsProcessing(true);
    setProcessingStatus('Processing audio trim and volume via FFmpeg...');
    try {
      const res = await api.post('/process/audio/trim', {
        audioUrl: audioState.audioSrc,
        startTime: startTime !== undefined ? startTime : audioState.trim?.start,
        endTime: endTime !== undefined ? endTime : audioState.trim?.end,
        volume: volume !== undefined ? volume : audioState.volume
      });
      return res;
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const renderVideoFFmpeg = async () => {
    if (!videoState?.tracks) throw new Error('No video tracks loaded');
    setIsProcessing(true);
    setProcessingStatus('Stitching and rendering video clips via server FFmpeg...');
    try {
      // Collect video track clips
      const videoTrack = videoState.tracks.find(t => t.type === 'video');
      const clips = videoTrack ? videoTrack.clips : [];
      if (!clips || clips.length === 0) {
        throw new Error('No video clips present on the video track');
      }

      const res = await api.post('/process/video/render', {
        clips,
        resolution: videoState.resolution || { width: 1280, height: 720 },
        fps: videoState.fps || 30
      });
      return res;
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const exportImageFFmpeg = async () => {
    if (!imageState?.imageSrc) throw new Error('No image loaded');
    setIsProcessing(true);
    setProcessingStatus('Rendering image transformations via FFmpeg...');
    try {
      const res = await api.post('/process/image/export', {
        imageUrl: imageState.imageSrc,
        crop: imageState.crop,
        brightness: imageState.adjustments?.brightness || 0,
        contrast: imageState.adjustments?.contrast || 1.0
      });
      return res;
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        activeModule,
        setActiveModule,
        loadProject,
        imageState,
        setImageState,
        updateImageState,
        audioState,
        setAudioState,
        updateAudioState,
        videoState,
        setVideoState,
        updateVideoState,
        undo,
        redo,
        canUndo,
        canRedo,
        isSaving,
        lastSavedTime,
        saveProject,
        isProcessing,
        processingStatus,
        renderAudioFFmpeg,
        renderVideoFFmpeg,
        exportImageFFmpeg
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
}

