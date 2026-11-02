const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = require('./User');
const Project = require('./Project');
const Asset = require('./Asset');

const STORE_PATH = path.resolve(__dirname, '../data/local_store.json');

// In-memory cache when MongoDB is offline
let localData = {
  users: [],
  projects: [],
  assets: []
};

// Load saved local data if exists
function loadLocalStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      localData = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[DataStore] Error loading local store:', err.message);
  }
}

function saveLocalStore() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(localData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DataStore] Error saving local store:', err.message);
  }
}

loadLocalStore();

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// ---------------- USER OPERATIONS ----------------

async function createUser({ username, email, password, role = 'creator', avatar = '' }) {
  if (isMongoConnected()) {
    const user = new User({ username, email, password, role, avatar });
    await user.save();
    return user.toObject();
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: uuidv4(),
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      createdAt: new Date().toISOString()
    };
    localData.users.push(user);
    saveLocalStore();
    return user;
  }
}

async function findUserByEmail(email) {
  if (isMongoConnected()) {
    return await User.findOne({ email: email.toLowerCase() });
  } else {
    return localData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
}

async function findUserById(id) {
  if (isMongoConnected()) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await User.findById(id).select('-password');
    }
    return null;
  } else {
    const u = localData.users.find(u => String(u._id) === String(id));
    if (u) {
      const { password, ...safeUser } = u;
      return safeUser;
    }
    return null;
  }
}

async function comparePassword(candidate, hash) {
  return bcrypt.compare(candidate, hash);
}

// ---------------- PROJECT OPERATIONS ----------------

async function createProject(projectData) {
  if (isMongoConnected()) {
    const project = new Project(projectData);
    await project.save();
    return project.toObject();
  } else {
    const project = {
      _id: uuidv4(),
      title: projectData.title || 'Untitled Project',
      description: projectData.description || '',
      type: projectData.type || 'video',
      owner: projectData.owner,
      collaborators: projectData.collaborators || [],
      thumbnail: projectData.thumbnail || '',
      state: projectData.state || {},
      versions: projectData.versions || [],
      activityLog: [
        {
          id: uuidv4(),
          user: 'System',
          action: 'Project created',
          timestamp: new Date().toISOString()
        }
      ],
      isPublic: !!projectData.isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localData.projects.push(project);
    saveLocalStore();
    return project;
  }
}

async function findProjects({ userId, type } = {}) {
  if (isMongoConnected()) {
    const filter = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.$or = [
        { owner: userId },
        { 'collaborators.user': userId },
        { isPublic: true }
      ];
    }
    if (type) filter.type = type;
    return await Project.find(filter).sort({ updatedAt: -1 }).populate('owner', 'username email avatar');
  } else {
    let list = [...localData.projects];
    if (userId) {
      list = list.filter(p => {
        const ownerId = typeof p.owner === 'object' ? p.owner._id : p.owner;
        const isOwner = String(ownerId) === String(userId);
        const isCollab = p.collaborators && p.collaborators.some(c => String(c.user?._id || c.user) === String(userId));
        return isOwner || isCollab || p.isPublic;
      });
    }
    if (type) {
      list = list.filter(p => p.type === type);
    }
    // populate owner mock
    return list.map(p => {
      const ownerId = typeof p.owner === 'object' ? p.owner._id : p.owner;
      const ownerObj = localData.users.find(u => String(u._id) === String(ownerId));
      return {
        ...p,
        owner: ownerObj ? { _id: ownerObj._id, username: ownerObj.username, email: ownerObj.email, avatar: ownerObj.avatar } : { _id: ownerId, username: 'User' }
      };
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

async function findProjectById(id) {
  if (isMongoConnected()) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await Project.findById(id)
        .populate('owner', 'username email avatar')
        .populate('collaborators.user', 'username email avatar');
    }
    return null;
  } else {
    const p = localData.projects.find(p => String(p._id) === String(id));
    if (!p) return null;
    const ownerId = typeof p.owner === 'object' ? p.owner._id : p.owner;
    const ownerObj = localData.users.find(u => String(u._id) === String(ownerId));
    
    const populatedCollaborators = (p.collaborators || []).map(c => {
      const cId = typeof c.user === 'object' ? c.user._id : c.user;
      const cUser = localData.users.find(u => String(u._id) === String(cId));
      return {
        ...c,
        user: cUser ? { _id: cUser._id, username: cUser.username, email: cUser.email, avatar: cUser.avatar } : { _id: cId, username: 'Collaborator' }
      };
    });

    return {
      ...p,
      owner: ownerObj ? { _id: ownerObj._id, username: ownerObj.username, email: ownerObj.email, avatar: ownerObj.avatar } : { _id: ownerId, username: 'User' },
      collaborators: populatedCollaborators
    };
  }
}

async function updateProject(id, updateData) {
  if (isMongoConnected()) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await Project.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: Date.now() },
        { new: true }
      );
    }
    return null;
  } else {
    const idx = localData.projects.findIndex(p => String(p._id) === String(id));
    if (idx === -1) return null;
    localData.projects[idx] = {
      ...localData.projects[idx],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    saveLocalStore();
    return localData.projects[idx];
  }
}

async function deleteProject(id) {
  if (isMongoConnected()) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await Project.findByIdAndDelete(id);
    }
    return null;
  } else {
    const idx = localData.projects.findIndex(p => String(p._id) === String(id));
    if (idx === -1) return null;
    const deleted = localData.projects.splice(idx, 1)[0];
    saveLocalStore();
    return deleted;
  }
}

async function addCollaborator(projectId, { userId, role = 'editor' }) {
  if (isMongoConnected()) {
    return await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { collaborators: { user: userId, role, joinedAt: Date.now() } } },
      { new: true }
    );
  } else {
    const p = localData.projects.find(p => String(p._id) === String(projectId));
    if (!p) return null;
    if (!p.collaborators) p.collaborators = [];
    const exists = p.collaborators.some(c => String(c.user?._id || c.user) === String(userId));
    if (!exists) {
      p.collaborators.push({ user: userId, role, joinedAt: new Date().toISOString() });
      saveLocalStore();
    }
    return p;
  }
}

// ---------------- ASSET OPERATIONS ----------------

async function createAsset(assetData) {
  if (isMongoConnected()) {
    const asset = new Asset(assetData);
    await asset.save();
    return asset.toObject();
  } else {
    const asset = {
      _id: uuidv4(),
      ...assetData,
      createdAt: new Date().toISOString()
    };
    localData.assets.push(asset);
    saveLocalStore();
    return asset;
  }
}

async function findAssets({ projectId, type, isSample } = {}) {
  if (isMongoConnected()) {
    const filter = {};
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) filter.project = projectId;
    if (type) filter.type = type;
    if (typeof isSample === 'boolean') filter.isSample = isSample;
    return await Asset.find(filter).sort({ createdAt: -1 });
  } else {
    let list = [...localData.assets];
    if (projectId) {
      list = list.filter(a => String(a.project) === String(projectId));
    }
    if (type) {
      list = list.filter(a => a.type === type);
    }
    if (typeof isSample === 'boolean') {
      list = list.filter(a => !!a.isSample === isSample);
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function deleteAsset(id) {
  if (isMongoConnected()) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return await Asset.findByIdAndDelete(id);
    }
    return null;
  } else {
    const idx = localData.assets.findIndex(a => String(a._id) === String(id));
    if (idx === -1) return null;
    const deleted = localData.assets.splice(idx, 1)[0];
    saveLocalStore();
    return deleted;
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  comparePassword,
  createProject,
  findProjects,
  findProjectById,
  updateProject,
  deleteProject,
  addCollaborator,
  createAsset,
  findAssets,
  deleteAsset,
  isMongoConnected
};

