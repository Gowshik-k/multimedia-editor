const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dataStore = require('../models/dataStore');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// List projects
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { type } = req.query;
    const projects = await dataStore.findProjects({ userId, type });
    return res.json({ projects });
  } catch (err) {
    console.error('[Get Projects Error]', err);
    return res.status(500).json({ message: 'Error retrieving projects', error: err.message });
  }
});

// Get single project
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const project = await dataStore.findProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.json({ project });
  } catch (err) {
    console.error('[Get Project Error]', err);
    return res.status(500).json({ message: 'Error retrieving project', error: err.message });
  }
});

// Create new project
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, type, template } = req.body;
    const projectType = type || 'video';

    // Default states for each module type
    let initialState = {};

    if (projectType === 'image') {
      initialState = {
        imageSrc: '/samples/sample-image.jpg',
        originalDimensions: { width: 1280, height: 720 },
        adjustments: {
          brightness: 0,
          contrast: 1.0,
          saturation: 1.0,
          blur: 0,
          grayscale: 0,
          sepia: 0,
          invert: 0,
          vignette: 0
        },
        crop: { x: 0, y: 0, width: 1280, height: 720, aspect: 'free' },
        layers: [
          {
            id: 'layer-' + Date.now(),
            type: 'text',
            text: 'Your Creative Headline',
            x: 200,
            y: 200,
            fontSize: 42,
            fontWeight: '600',
            fontFamily: 'Inter',
            color: '#ffffff',
            backgroundColor: 'rgba(15,23,42,0.7)',
            padding: 10,
            borderRadius: 6
          }
        ]
      };
    } else if (projectType === 'audio') {
      initialState = {
        audioSrc: '/samples/sample-audio.mp3',
        originalDuration: 8.0,
        trim: { start: 0, end: 8.0 },
        volume: 1.0,
        pan: 0,
        playbackSpeed: 1.0,
        mute: false,
        loop: false,
        markers: []
      };
    } else {
      // Video / Unified
      initialState = {
        duration: 10.0,
        resolution: { width: 1280, height: 720 },
        fps: 30,
        tracks: [
          {
            id: 'track-v1',
            name: 'Video Track 1',
            type: 'video',
            clips: [
              {
                id: 'clip-' + Date.now(),
                name: 'Main Video',
                src: '/samples/sample-video.mp4',
                start: 0,
                duration: 6.0,
                trimStart: 0,
                trimEnd: 6.0,
                volume: 1.0,
                color: '#3b82f6'
              }
            ]
          },
          {
            id: 'track-t1',
            name: 'Text Overlay',
            type: 'text',
            clips: [
              {
                id: 'clip-text-' + Date.now(),
                name: 'Intro Title',
                text: 'New Project',
                start: 0.5,
                duration: 4.0,
                fontSize: 48,
                color: '#ffffff',
                position: 'center'
              }
            ]
          },
          {
            id: 'track-a1',
            name: 'Audio Track',
            type: 'audio',
            clips: [
              {
                id: 'clip-audio-' + Date.now(),
                name: 'Background Tone',
                src: '/samples/sample-audio.mp3',
                start: 0,
                duration: 8.0,
                volume: 0.8,
                color: '#10b981'
              }
            ]
          }
        ]
      };
    }

    const project = await dataStore.createProject({
      title: title || `Untitled ${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Project`,
      description: description || '',
      type: projectType,
      owner: req.user._id,
      thumbnail: projectType === 'image' ? '/samples/sample-image.jpg' : (projectType === 'video' ? '/samples/sample-image.jpg' : ''),
      state: initialState,
      collaborators: [],
      isPublic: false
    });

    return res.status(201).json({ message: 'Project created successfully', project });
  } catch (err) {
    console.error('[Create Project Error]', err);
    return res.status(500).json({ message: 'Error creating project', error: err.message });
  }
});

// Update project (metadata and/or state)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, thumbnail, state, isPublic, activityDescription } = req.body;
    const project = await dataStore.findProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permission: owner or editor collaborator
    const ownerId = typeof project.owner === 'object' ? project.owner._id : project.owner;
    const isOwner = String(ownerId) === String(req.user._id);
    const isCollaborator = project.collaborators && project.collaborators.some(
      c => String(c.user?._id || c.user) === String(req.user._id) && c.role === 'editor'
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Permission denied to edit this project' });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (thumbnail !== undefined) updateFields.thumbnail = thumbnail;
    if (state !== undefined) updateFields.state = state;
    if (isPublic !== undefined) updateFields.isPublic = isPublic;

    if (activityDescription) {
      const activityLog = project.activityLog || [];
      activityLog.unshift({
        id: uuidv4(),
        user: req.user.username,
        action: activityDescription,
        timestamp: new Date().toISOString()
      });
      // Keep only last 50 activities
      updateFields.activityLog = activityLog.slice(0, 50);
    }

    const updated = await dataStore.updateProject(req.params.id, updateFields);
    return res.json({ message: 'Project updated', project: updated });
  } catch (err) {
    console.error('[Update Project Error]', err);
    return res.status(500).json({ message: 'Error updating project', error: err.message });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await dataStore.findProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const ownerId = typeof project.owner === 'object' ? project.owner._id : project.owner;
    if (String(ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only project owner can delete this project' });
    }

    await dataStore.deleteProject(req.params.id);
    return res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('[Delete Project Error]', err);
    return res.status(500).json({ message: 'Error deleting project', error: err.message });
  }
});

// Add collaborator to project
router.post('/:id/collaborators', authMiddleware, async (req, res) => {
  try {
    const { email, role = 'editor' } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Collaborator email is required' });
    }

    const project = await dataStore.findProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const ownerId = typeof project.owner === 'object' ? project.owner._id : project.owner;
    if (String(ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only project owner can add collaborators' });
    }

    let targetUser = await dataStore.findUserByEmail(email);
    if (!targetUser) {
      // Auto-create a collaborator user invitation placeholder if they don't have an account yet!
      const fallbackName = email.split('@')[0];
      targetUser = await dataStore.createUser({
        username: fallbackName,
        email: email.toLowerCase(),
        password: 'invitedUser123',
        role: 'collaborator'
      });
    }

    const updated = await dataStore.addCollaborator(req.params.id, {
      userId: targetUser._id,
      role
    });

    return res.json({
      message: `User ${targetUser.username} added as ${role}`,
      project: updated,
      collaborator: {
        _id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        role
      }
    });
  } catch (err) {
    console.error('[Add Collaborator Error]', err);
    return res.status(500).json({ message: 'Error adding collaborator', error: err.message });
  }
});

// Save snapshot version
router.post('/:id/versions', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const project = await dataStore.findProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const versions = project.versions || [];
    const newVersion = {
      id: uuidv4(),
      name: name || `Snapshot v${versions.length + 1}`,
      state: project.state,
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };
    versions.unshift(newVersion);

    const updated = await dataStore.updateProject(req.params.id, { versions });
    return res.json({ message: 'Version snapshot saved', version: newVersion });
  } catch (err) {
    console.error('[Save Version Error]', err);
    return res.status(500).json({ message: 'Error saving version', error: err.message });
  }
});

// Restore snapshot version
router.post('/:id/versions/:versionId/restore', authMiddleware, async (req, res) => {
  try {
    const project = await dataStore.findProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const version = (project.versions || []).find(v => v.id === req.params.versionId);
    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const updated = await dataStore.updateProject(req.params.id, {
      state: version.state,
      activityDescription: `Restored to version: ${version.name}`
    });

    return res.json({ message: `Project restored to ${version.name}`, project: updated });
  } catch (err) {
    console.error('[Restore Version Error]', err);
    return res.status(500).json({ message: 'Error restoring version', error: err.message });
  }
});

module.exports = router;

