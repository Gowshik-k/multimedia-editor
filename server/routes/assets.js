const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const dataStore = require('../models/dataStore');
const { upload } = require('../services/storageService');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// Upload asset (image, audio, or video)
router.post('/upload', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded' });
    }

    const { projectId, type } = req.body;
    let detectedType = type;
    if (!detectedType) {
      if (req.file.mimetype.startsWith('image/')) detectedType = 'image';
      else if (req.file.mimetype.startsWith('audio/')) detectedType = 'audio';
      else if (req.file.mimetype.startsWith('video/')) detectedType = 'video';
      else detectedType = 'image';
    }

    // Relative web URL
    const relativeSubdir = detectedType === 'image' ? 'images' : (detectedType === 'audio' ? 'audio' : 'video');
    const webUrl = `/uploads/${relativeSubdir}/${req.file.filename}`;

    const asset = await dataStore.createAsset({
      name: req.file.originalname,
      originalName: req.file.originalname,
      type: detectedType,
      url: webUrl,
      filePath: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      project: projectId || null,
      uploadedBy: req.user ? req.user._id : null,
      isSample: false
    });

    return res.status(201).json({
      message: 'Asset uploaded successfully',
      asset
    });
  } catch (err) {
    console.error('[Upload Asset Error]', err);
    return res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// List assets
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { projectId, type, isSample } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (type) filter.type = type;
    if (isSample !== undefined) filter.isSample = isSample === 'true';

    const assets = await dataStore.findAssets(filter);
    return res.json({ assets });
  } catch (err) {
    console.error('[Get Assets Error]', err);
    return res.status(500).json({ message: 'Error retrieving assets', error: err.message });
  }
});

// Delete asset
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const asset = await dataStore.deleteAsset(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.filePath && fs.existsSync(asset.filePath) && !asset.isSample) {
      try {
        fs.unlinkSync(asset.filePath);
      } catch (e) {}
    }

    return res.json({ message: 'Asset deleted' });
  } catch (err) {
    console.error('[Delete Asset Error]', err);
    return res.status(500).json({ message: 'Error deleting asset', error: err.message });
  }
});

module.exports = router;

