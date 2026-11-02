const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Untitled Project'
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['image', 'audio', 'video', 'unified'],
    required: true,
    default: 'video'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['editor', 'viewer'],
        default: 'editor'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  thumbnail: {
    type: String,
    default: ''
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  versions: [
    {
      id: { type: String, required: true },
      name: { type: String, default: 'Snapshot' },
      state: { type: mongoose.Schema.Types.Mixed },
      createdBy: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  activityLog: [
    {
      id: { type: String },
      user: { type: String },
      action: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);

