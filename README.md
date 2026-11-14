# OmniMedia Studio: Unified Multimedia Editing System with Real-Time Collaboration & Synchronization

A full-stack MERN platform designed to streamline digital media creation for students, content creators, and small teams. Traditional workflows require users to juggle fragmented applications for image, audio, and video editing. **OmniMedia Studio** unifies image transformation, audio waveform trimming, and multi-track video timeline editing into a single browser environment with real-time state synchronization powered by Socket.IO and backend media processing powered by FFmpeg.

---

## 🌟 Key Features

### 1. Minimalist & Intuitive Studio Interface (White Theme)
- Designed with a clean, high-contrast white aesthetic inspired by Apple, Notion, and Linear.
- Stripped of visual noise, unnecessary decorative icons, and heavy gradients for maximum clarity and focus.
- Fully mobile-responsive layout with touch-friendly scrubbing on waveforms and video timelines, responsive drawers, and adaptive toolbars.
- One-click instant module switching between **Image**, **Audio**, and **Video**.

### 2. Dedicated Multimedia Workspaces
- **Image Editor**:
  - Interactive HTML5 canvas with zoom and pan.
  - Basic transformations: Cropping with aspect presets (Free, 1:1, 16:9, 4:3, 9:16), resizing, and orientation.
  - Adjustments: Brightness, contrast, saturation, blur, grayscale, sepia, invert, and vignette.
  - Draggable & editable text overlays with custom fonts, colors, and background pills.
  - Layer hierarchy management (reorder, toggle, delete).
  - Client-side download (PNG/JPEG) and server-side FFmpeg processing.

- **Audio Editor**:
  - Interactive visual audio waveform with draggable playhead scrubber.
  - Precise In-Point (start trim) and Out-Point (end trim) handles with timecode readout (`00:00.000`).
  - Gain/Volume slider (0% to 200%), stereo Pan control (Left 100% to Right 100%), and Mute toggle.
  - Playback speed control (0.5x, 1x, 1.5x, 2x) and seamless looping.
  - Cue marker tagging with timestamped notes.
  - Server-side FFmpeg audio processing and instant trimmed MP3 download.

- **Video Editor**:
  - Multi-track timeline: Video Track, Text & Title Track, and Background Audio Track.
  - Clip trimming, reordering, and splitting at playhead (`Split Clip`).
  - Synchronized Canvas Preview player displaying active video clips with dynamic timed text overlays and audio playback.
  - Timecode ruler with zoom in/out (`20px/s` to `120px/s`).
  - Server-side FFmpeg rendering engine that stitches and exports multi-clip video sequences into unified MP4 files.

### 3. Real-Time Collaboration & Synchronization (Socket.IO)
- **Room-based project collaboration**: Authorized team members join project rooms automatically.
- **Live collaborator presence**: Color-coded collaborator avatars and active module pills.
- **Live cursor broadcasting**: See team members' cursor movements in real time.
- **Instant state synchronization**: Image filter changes, audio trim markers, and video timeline updates appear instantly across peers without page reloads.
- **Team project chat**: Integrated real-time messaging within the project studio.
- **Live activity feed**: Real-time log of team actions (*"Alex adjusted brightness"*, *"Jordan trimmed video clip"*).
- **Snapshot versioning**: Create and restore point-in-time project versions.

### 4. Robust Backend & Media Processing Services
- **MERN Stack**: MongoDB, Express.js, React.js, Node.js.
- **Dual-mode storage**: Connects directly to MongoDB when available with an automatic persistent local JSON fallback store.
- **FFmpeg Integration**: Powered by `ffmpeg-static` for server-side audio trimming, volume normalization, video concatenation, and thumbnail extraction.
- **Asset Library**: Multer media uploads with preloaded royalty-free demo images, audio tracks, and video clips.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
Clone the repository and install all dependencies:
```bash
# Install root, backend, and frontend dependencies
npm run install-all
```

### Running the Application

#### Option A: Unified Full-Stack Server (Recommended)
Builds the client and serves both API and frontend on port `5000`:
```bash
# 1. Build the frontend
npm run build

# 2. Start the server
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

#### Option B: Development Mode with Vite HMR
Run the backend server and Vite dev server simultaneously:

1. **Terminal 1 (Backend)**:
   ```bash
   cd server
   npm start
   ```
   *Runs on port 5000.*

2. **Terminal 2 (Frontend)**:
   ```bash
   cd client
   npm run dev
   ```
   *Runs on port 5173 with Vite hot module replacement.*

---

## ⚙️ Environment Variables (.env)

Both `server/` and `client/` have dedicated `.env` and `.env.example` configuration files:

### Backend (`server/.env`)
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/multimedia_editor
MONGO_PORT=27017
JWT_SECRET=omnimedia_jwt_secret_key_2026_production_ready_hash_token
CORS_ORIGIN=http://localhost:5173,http://localhost:5000
MAX_UPLOAD_SIZE_MB=100
```

### Frontend (`client/.env`)
```ini
VITE_API_BASE_URL=/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=OmniMedia Studio
VITE_APP_VERSION=1.0.0
```

---

## 👥 How to Test Real-Time Collaboration

1. Open **[http://localhost:5000](http://localhost:5000)** in your primary browser.
2. Click **"1-Click Instant Demo Login"** (or use `demo@omnimedia.studio` / `password123`).
3. Click on any of the preloaded template projects (*Minimalist Poster Project*, *Podcast Intro Trim*, or *Cinematic Teaser Montage*).
4. Click the **Share** button in the top navbar and copy the project link.
5. Open an **Incognito Window** or a second browser and paste the link.
6. A guest collaborator session is instantly created. Notice both user avatars in the top navbar, move your mouse to see real-time cursor indicators, adjust filters or timeline clips, and see them sync instantly across both screens!

---

## 📁 Project Architecture

```
multimedia-editor/
├── server/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & fallback store
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Project.js            # Project schema with module states
│   │   ├── Asset.js              # Media asset schema
│   │   └── dataStore.js          # Resilient unified data access layer
│   ├── routes/
│   │   ├── auth.js               # JWT auth & demo login routes
│   │   ├── projects.js           # CRUD & collaboration routes
│   │   ├── assets.js             # Upload & media management
│   │   └── process.js            # FFmpeg audio/video processing routes
│   ├── services/
│   │   ├── ffmpegService.js      # FFmpeg command executions
│   │   ├── storageService.js     # Multer file storage
│   │   └── sampleSeeder.js       # Preloaded templates and demo media
│   ├── sockets/
│   │   └── socketHandler.js      # Socket.IO rooms, cursors, chat & sync
│   └── server.js                 # Express server & Socket.IO initialization
│
├── client/
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # Auth state & token management
│   │   │   ├── SocketContext.jsx # Socket.IO connection & listeners
│   │   │   └── ProjectContext.jsx# Project state, undo/redo & FFmpeg triggers
│   │   ├── components/
│   │   │   ├── common/           # Navbar, AssetDrawer, ExportModal, InviteModal
│   │   │   ├── image/            # ImageEditor, Canvas, Crop, Filter sliders, Layers
│   │   │   ├── audio/            # AudioEditor, Waveform canvas, Trim handles, Cues
│   │   │   ├── video/            # VideoEditor, Multi-track timeline, Preview player
│   │   │   └── collaboration/    # LiveChatDrawer, Activity feed, Team presence
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Project gallery, creation modal, quick demos
│   │   │   ├── EditorWorkspace.jsx# Studio workspace coordinating all modules
│   │   │   ├── LoginPage.jsx     # Login with 1-click demo creator
│   │   │   └── RegisterPage.jsx  # Registration page
│   │   └── utils/
│   │       └── api.js            # Fetch wrapper with auth headers
│   ├── vite.config.js            # Vite config with API proxy
│   └── tailwind.config.js        # Minimalist dark studio color palette
│
└── package.json                  # Root runner scripts
```

---

## 🛠️ API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Sign in with email & password |
| `POST` | `/api/auth/demo` | Instant 1-click test collaborator session |
| `GET` | `/api/auth/me` | Fetch current user session |
| `GET` | `/api/projects` | List projects (with optional type filtering) |
| `POST` | `/api/projects` | Create new multimedia project |
| `GET` | `/api/projects/:id` | Get project details and module state |
| `PUT` | `/api/projects/:id` | Update project metadata and editing state |
| `DELETE`| `/api/projects/:id` | Delete project |
| `POST` | `/api/projects/:id/collaborators` | Invite teammate by email |
| `POST` | `/api/projects/:id/versions` | Save snapshot version |
| `POST` | `/api/assets/upload` | Upload image, audio, or video file |
| `GET` | `/api/assets` | Retrieve media assets library |
| `POST` | `/api/process/audio/trim` | Trim audio and adjust gain with FFmpeg |
| `POST` | `/api/process/video/render` | Multi-clip video render & stitch with FFmpeg |
| `POST` | `/api/process/image/export`| Process image transformations with FFmpeg |
| `GET` | `/api/process/status` | FFmpeg service health & capabilities |

