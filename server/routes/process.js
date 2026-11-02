const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpegService = require('../services/ffmpegService');
const { optionalAuth } = require('../middleware/auth');
const dataStore = require('../models/dataStore');

function resolveLocalPath(webUrl) {
  if (!webUrl) return null;
  // If webUrl is absolute URL like http://localhost:5000/samples/foo.mp3
  let cleanPath = webUrl;
  try {
    if (webUrl.startsWith('http://') || webUrl.startsWith('https://')) {
      const parsed = new URL(webUrl);
      cleanPath = parsed.pathname;
    }
  } catch (e) {}

  if (cleanPath.startsWith('/samples/')) {
    return path.resolve(__dirname, '../samples', cleanPath.replace('/samples/', ''));
  }
  if (cleanPath.startsWith('/uploads/')) {
    return path.resolve(__dirname, '../uploads', cleanPath.replace('/uploads/', ''));
  }
  return path.resolve(__dirname, '..', cleanPath.replace(/^\//, ''));
}

// ---------------- AUDIO PROCESSING ----------------
router.post('/audio/trim', optionalAuth, async (req, res) => {
  try {
    const { audioUrl, startTime = 0, endTime, volume = 1.0 } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ message: 'audioUrl is required' });
    }

    const inputPath = resolveLocalPath(audioUrl);
    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(404).json({ message: `Source audio file not found: ${audioUrl}` });
    }

    const exportFilename = `audio_export_${Date.now()}_${Math.round(Math.random() * 1000)}.mp3`;
    const outputPath = path.resolve(__dirname, '../uploads/exports', exportFilename);

    await ffmpegService.processAudio({
      inputPath,
      outputPath,
      startTime: parseFloat(startTime) || 0,
      endTime: endTime !== undefined ? parseFloat(endTime) : undefined,
      volume: parseFloat(volume) || 1.0
    });

    const webUrl = `/uploads/exports/${exportFilename}`;

    // Register as export asset
    await dataStore.createAsset({
      name: `Trimmed Audio (${new Date().toLocaleTimeString()})`,
      originalName: exportFilename,
      type: 'audio',
      url: webUrl,
      filePath: outputPath,
      size: fs.statSync(outputPath).size,
      mimeType: 'audio/mpeg',
      isSample: false
    });

    return res.json({
      message: 'Audio processed successfully with FFmpeg',
      url: webUrl,
      filename: exportFilename,
      fileSize: fs.statSync(outputPath).size
    });
  } catch (err) {
    console.error('[Audio Process Error]', err);
    return res.status(500).json({ message: 'Audio processing failed', error: err.message });
  }
});

// ---------------- VIDEO RENDERING ----------------
router.post('/video/render', optionalAuth, async (req, res) => {
  try {
    const { clips, resolution = { width: 1280, height: 720 }, fps = 30 } = req.body;
    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ message: 'clips array is required' });
    }

    const resolvedClips = [];
    for (const clip of clips) {
      const resolved = resolveLocalPath(clip.src);
      if (resolved && fs.existsSync(resolved)) {
        resolvedClips.push({
          ...clip,
          filePath: resolved,
          trimStart: parseFloat(clip.trimStart || clip.start || 0),
          duration: parseFloat(clip.duration || 0),
          volume: parseFloat(clip.volume !== undefined ? clip.volume : 1.0),
          speed: parseFloat(clip.speed || 1.0)
        });
      }
    }

    if (resolvedClips.length === 0) {
      return res.status(400).json({ message: 'None of the provided video clips exist on the server' });
    }

    const exportFilename = `video_render_${Date.now()}_${Math.round(Math.random() * 1000)}.mp4`;
    const outputPath = path.resolve(__dirname, '../uploads/exports', exportFilename);

    await ffmpegService.renderVideoSequence({
      clips: resolvedClips,
      outputPath,
      resolution,
      fps
    });

    const webUrl = `/uploads/exports/${exportFilename}`;

    await dataStore.createAsset({
      name: `Rendered Video (${new Date().toLocaleTimeString()})`,
      originalName: exportFilename,
      type: 'video',
      url: webUrl,
      filePath: outputPath,
      size: fs.statSync(outputPath).size,
      mimeType: 'video/mp4',
      dimensions: resolution,
      isSample: false
    });

    return res.json({
      message: 'Video rendered successfully with FFmpeg',
      url: webUrl,
      filename: exportFilename,
      fileSize: fs.statSync(outputPath).size
    });
  } catch (err) {
    console.error('[Video Render Error]', err);
    return res.status(500).json({ message: 'Video rendering failed', error: err.message });
  }
});

// ---------------- IMAGE PROCESSING ----------------
router.post('/image/export', optionalAuth, async (req, res) => {
  try {
    const { imageUrl, crop, resize, brightness = 0, contrast = 1.0 } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }

    const inputPath = resolveLocalPath(imageUrl);
    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(404).json({ message: `Source image file not found: ${imageUrl}` });
    }

    const exportFilename = `image_export_${Date.now()}_${Math.round(Math.random() * 1000)}.jpg`;
    const outputPath = path.resolve(__dirname, '../uploads/exports', exportFilename);

    await ffmpegService.processImage({
      inputPath,
      outputPath,
      crop,
      resize,
      brightness: parseFloat(brightness) || 0,
      contrast: parseFloat(contrast) || 1.0
    });

    const webUrl = `/uploads/exports/${exportFilename}`;

    return res.json({
      message: 'Image exported successfully with FFmpeg',
      url: webUrl,
      filename: exportFilename,
      fileSize: fs.statSync(outputPath).size
    });
  } catch (err) {
    console.error('[Image Process Error]', err);
    return res.status(500).json({ message: 'Image export failed', error: err.message });
  }
});

// ---------------- FFmpeg STATUS & HEALTH ----------------
router.get('/status', (req, res) => {
  const binaryPath = ffmpegService.getFFmpegPath();
  const available = fs.existsSync(binaryPath);
  return res.json({
    status: 'online',
    ffmpegAvailable: available,
    ffmpegPath: binaryPath,
    supportedFormats: ['mp4', 'mp3', 'wav', 'png', 'jpg', 'webp']
  });
});

module.exports = router;

