const path = require('path');
const fs = require('fs');
const dataStore = require('../models/dataStore');
const { generateSampleAudio, generateSampleVideo, runFFmpeg } = require('./ffmpegService');

async function seedSamplesAndTemplates(defaultUser) {
  try {
    const samplesDir = path.resolve(__dirname, '../samples');
    if (!fs.existsSync(samplesDir)) {
      fs.mkdirSync(samplesDir, { recursive: true });
    }

    const sampleImagePath = path.join(samplesDir, 'sample-image.jpg');
    const sampleAudioPath = path.join(samplesDir, 'sample-audio.mp3');
    const sampleVideoPath = path.join(samplesDir, 'sample-video.mp4');

    // 1. Ensure files exist
    if (!fs.existsSync(sampleImagePath)) {
      await runFFmpeg(['-y', '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=1', '-vframes', '1', sampleImagePath]);
    }
    if (!fs.existsSync(sampleAudioPath)) {
      await generateSampleAudio({ outputPath: sampleAudioPath, durationSeconds: 8, toneHz: 440 });
    }
    if (!fs.existsSync(sampleVideoPath)) {
      await generateSampleVideo({ outputPath: sampleVideoPath, durationSeconds: 6 });
    }

    // 2. Check if assets are already seeded
    const existingAssets = await dataStore.findAssets({ isSample: true });
    if (existingAssets.length === 0) {
      console.log('[SampleSeeder] Seeding sample multimedia assets...');

      await dataStore.createAsset({
        name: 'Nature Horizon (Sample Image)',
        originalName: 'sample-image.jpg',
        type: 'image',
        url: '/samples/sample-image.jpg',
        filePath: sampleImagePath,
        size: fs.statSync(sampleImagePath).size,
        mimeType: 'image/jpeg',
        dimensions: { width: 1280, height: 720 },
        isSample: true
      });

      await dataStore.createAsset({
        name: 'Melodic Chime (Sample Audio)',
        originalName: 'sample-audio.mp3',
        type: 'audio',
        url: '/samples/sample-audio.mp3',
        filePath: sampleAudioPath,
        size: fs.statSync(sampleAudioPath).size,
        mimeType: 'audio/mpeg',
        duration: 8.0,
        isSample: true
      });

      await dataStore.createAsset({
        name: 'Dynamic Motion Test (Sample Video)',
        originalName: 'sample-video.mp4',
        type: 'video',
        url: '/samples/sample-video.mp4',
        filePath: sampleVideoPath,
        size: fs.statSync(sampleVideoPath).size,
        mimeType: 'video/mp4',
        duration: 6.0,
        dimensions: { width: 1280, height: 720 },
        isSample: true
      });
    }

    // 3. Check if default templates exist
    const existingProjects = await dataStore.findProjects();
    if (existingProjects.length === 0 && defaultUser) {
      console.log('[SampleSeeder] Seeding default template projects...');

      // Template 1: Image Editor Project
      await dataStore.createProject({
        title: 'Minimalist Poster Project',
        description: 'Interactive image composition with text overlays and adjustments.',
        type: 'image',
        owner: defaultUser._id,
        thumbnail: '/samples/sample-image.jpg',
        state: {
          imageSrc: '/samples/sample-image.jpg',
          originalDimensions: { width: 1280, height: 720 },
          adjustments: {
            brightness: 5,
            contrast: 1.1,
            saturation: 1.15,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            invert: 0,
            vignette: 15
          },
          crop: { x: 0, y: 0, width: 1280, height: 720, aspect: 'free' },
          layers: [
            {
              id: 'layer-text-1',
              type: 'text',
              text: 'CREATIVE WORKFLOW',
              x: 180,
              y: 220,
              fontSize: 48,
              fontWeight: '700',
              fontFamily: 'Inter',
              color: '#ffffff',
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: 12,
              borderRadius: 6
            },
            {
              id: 'layer-text-2',
              type: 'text',
              text: 'Unified Real-Time Studio',
              x: 180,
              y: 310,
              fontSize: 24,
              fontWeight: '400',
              fontFamily: 'Inter',
              color: '#93c5fd',
              backgroundColor: 'transparent',
              padding: 6,
              borderRadius: 4
            }
          ]
        },
        isPublic: true
      });

      // Template 2: Audio Editor Project
      await dataStore.createProject({
        title: 'Podcast Intro Trim',
        description: 'Audio trimming, gain level adjustment, and waveform inspection.',
        type: 'audio',
        owner: defaultUser._id,
        state: {
          audioSrc: '/samples/sample-audio.mp3',
          originalDuration: 8.0,
          trim: { start: 1.0, end: 6.5 },
          volume: 1.25,
          pan: 0,
          playbackSpeed: 1.0,
          mute: false,
          loop: false,
          markers: [
            { id: 'marker-1', time: 1.0, label: 'Intro In' },
            { id: 'marker-2', time: 4.0, label: 'Voice Start' },
            { id: 'marker-3', time: 6.5, label: 'Fade Out' }
          ]
        },
        isPublic: true
      });

      // Template 3: Video Editor Project
      await dataStore.createProject({
        title: 'Cinematic Teaser Montage',
        description: 'Multi-track timeline with clip trimming, text overlays, and audio track.',
        type: 'video',
        owner: defaultUser._id,
        thumbnail: '/samples/sample-image.jpg',
        state: {
          duration: 10.0,
          resolution: { width: 1280, height: 720 },
          fps: 30,
          tracks: [
            {
              id: 'track-video-1',
              name: 'Video Track 1',
              type: 'video',
              clips: [
                {
                  id: 'clip-v1',
                  name: 'Intro Pattern',
                  src: '/samples/sample-video.mp4',
                  filePath: sampleVideoPath,
                  start: 0,
                  duration: 5.0,
                  trimStart: 0,
                  trimEnd: 5.0,
                  volume: 1.0,
                  color: '#3b82f6'
                },
                {
                  id: 'clip-v2',
                  name: 'Outro Segment',
                  src: '/samples/sample-video.mp4',
                  filePath: sampleVideoPath,
                  start: 5.0,
                  duration: 5.0,
                  trimStart: 1.0,
                  trimEnd: 6.0,
                  volume: 0.8,
                  color: '#8b5cf6'
                }
              ]
            },
            {
              id: 'track-text-1',
              name: 'Text & Titles',
              type: 'text',
              clips: [
                {
                  id: 'clip-t1',
                  name: 'Title Card',
                  text: 'OMNIMEDIA 2026',
                  start: 0.5,
                  duration: 3.5,
                  fontSize: 44,
                  color: '#ffffff',
                  position: 'center'
                }
              ]
            },
            {
              id: 'track-audio-1',
              name: 'BGM Track',
              type: 'audio',
              clips: [
                {
                  id: 'clip-a1',
                  name: 'Background Theme',
                  src: '/samples/sample-audio.mp3',
                  filePath: sampleAudioPath,
                  start: 0,
                  duration: 8.0,
                  volume: 0.7,
                  color: '#10b981'
                }
              ]
            }
          ]
        },
        isPublic: true
      });
    }
  } catch (err) {
    console.error('[SampleSeeder] Error during seeding:', err);
  }
}

module.exports = { seedSamplesAndTemplates };

