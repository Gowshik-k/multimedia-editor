const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.resolve(__dirname, '../uploads');
const dirs = {
  image: path.join(uploadsDir, 'images'),
  audio: path.join(uploadsDir, 'audio'),
  video: path.join(uploadsDir, 'video'),
  exports: path.join(uploadsDir, 'exports')
};

// Ensure directories exist
Object.values(dirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = dirs.exports;
    if (file.mimetype.startsWith('image/')) {
      dest = dirs.image;
    } else if (file.mimetype.startsWith('audio/')) {
      dest = dirs.audio;
    } else if (file.mimetype.startsWith('video/')) {
      dest = dirs.video;
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
  ];
  if (allowedTypes.some(type => file.mimetype.startsWith(type.split('/')[0]) || file.mimetype === type)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

module.exports = {
  upload,
  dirs,
  uploadsDir
};

