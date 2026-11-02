const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[FFmpeg Service] Using binary at:', ffmpegPath);

/**
 * Execute FFmpeg command with arguments
 */
function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        console.error('[FFmpeg Error] Args:', args.join(' '));
        console.error('[FFmpeg Error] Stderr:', stderr);
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Trim and adjust volume for audio file
 */
async function processAudio({ inputPath, outputPath, startTime = 0, endTime, volume = 1.0 }) {
  const args = ['-y'];

  if (startTime > 0) {
    args.push('-ss', startTime.toFixed(3));
  }

  args.push('-i', inputPath);

  if (endTime && endTime > startTime) {
    const duration = endTime - startTime;
    args.push('-t', duration.toFixed(3));
  }

  const audioFilters = [];
  if (volume !== 1.0 && volume >= 0) {
    audioFilters.push(`volume=${volume.toFixed(2)}`);
  }

  if (audioFilters.length > 0) {
    args.push('-af', audioFilters.join(','));
  }

  args.push('-c:a', 'libmp3lame', '-b:a', '192k', outputPath);

  await runFFmpeg(args);
  return outputPath;
}

/**
 * Trim and process a single video clip
 */
async function processVideoClip({ inputPath, outputPath, startTime = 0, duration, volume = 1.0, speed = 1.0, width, height }) {
  const args = ['-y'];

  if (startTime > 0) {
    args.push('-ss', startTime.toFixed(3));
  }

  args.push('-i', inputPath);

  if (duration && duration > 0) {
    args.push('-t', duration.toFixed(3));
  }

  const vf = [];
  const af = [];

  if (speed !== 1.0 && speed > 0) {
    vf.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
    // atempo supports 0.5 to 2.0
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
    af.push(`atempo=${clampedSpeed.toFixed(2)}`);
  }

  if (width && height) {
    vf.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
  }

  if (volume !== 1.0) {
    af.push(`volume=${volume.toFixed(2)}`);
  }

  if (vf.length > 0) {
    args.push('-vf', vf.join(','));
  }

  if (af.length > 0) {
    args.push('-af', af.join(','));
  }

  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-c:a', 'aac', '-b:a', '128k', outputPath);

  await runFFmpeg(args);
  return outputPath;
}

/**
 * Render multi-clip video sequence using concat demuxer
 */
async function renderVideoSequence({ clips, outputPath, resolution = { width: 1280, height: 720 }, fps = 30 }) {
  if (!clips || clips.length === 0) {
    throw new Error('No clips to render');
  }

  const tempDir = path.dirname(outputPath);
  const tempFiles = [];

  try {
    // 1. Normalize each clip first to uniform format & resolution
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const tempClipOut = path.join(tempDir, `temp_clip_${Date.now()}_${i}.mp4`);
      tempFiles.push(tempClipOut);

      await processVideoClip({
        inputPath: clip.filePath,
        outputPath: tempClipOut,
        startTime: clip.trimStart || 0,
        duration: clip.duration || undefined,
        volume: clip.volume !== undefined ? clip.volume : 1.0,
        speed: clip.speed || 1.0,
        width: resolution.width,
        height: resolution.height
      });
    }

    // 2. Concat files
    if (tempFiles.length === 1) {
      fs.copyFileSync(tempFiles[0], outputPath);
      return outputPath;
    }

    const listPath = path.join(tempDir, `concat_${Date.now()}.txt`);
    const listContent = tempFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listPath, listContent, 'utf-8');
    tempFiles.push(listPath);

    const concatArgs = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      outputPath
    ];

    await runFFmpeg(concatArgs);
    return outputPath;
  } finally {
    // Clean up temp files
    tempFiles.forEach(f => {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (e) {}
    });
  }
}

/**
 * Extract a frame from video to create a thumbnail
 */
async function extractThumbnail({ inputPath, outputPath, time = '00:00:01' }) {
  const args = [
    '-y',
    '-ss', String(time),
    '-i', inputPath,
    '-vframes', '1',
    '-q:v', '2',
    outputPath
  ];
  await runFFmpeg(args);
  return outputPath;
}

/**
 * Process image with crop, resize, filters
 */
async function processImage({ inputPath, outputPath, crop, resize, brightness = 0, contrast = 1.0 }) {
  const args = ['-y', '-i', inputPath];
  const vf = [];

  if (crop && crop.width && crop.height) {
    vf.push(`crop=${Math.round(crop.width)}:${Math.round(crop.height)}:${Math.round(crop.x || 0)}:${Math.round(crop.y || 0)}`);
  }

  if (resize && resize.width && resize.height) {
    vf.push(`scale=${Math.round(resize.width)}:${Math.round(resize.height)}`);
  }

  if (brightness !== 0 || contrast !== 1.0) {
    vf.push(`eq=brightness=${(brightness / 100).toFixed(2)}:contrast=${contrast.toFixed(2)}`);
  }

  if (vf.length > 0) {
    args.push('-vf', vf.join(','));
  }

  args.push(outputPath);
  await runFFmpeg(args);
  return outputPath;
}

/**
 * Generate a clean synthetic test audio file (.wav / .mp3) with a melodic chime
 */
async function generateSampleAudio({ outputPath, durationSeconds = 10, toneHz = 440 }) {
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `sine=frequency=${toneHz}:duration=${durationSeconds}`,
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    outputPath
  ];
  await runFFmpeg(args);
  return outputPath;
}

/**
 * Generate a clean synthetic test video file (.mp4) with animated color test pattern
 */
async function generateSampleVideo({ outputPath, durationSeconds = 5, text = 'OmniMedia Studio Sample' }) {
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `testsrc=duration=${durationSeconds}:size=1280x720:rate=30`,
    '-f', 'lavfi',
    '-i', `sine=frequency=440:duration=${durationSeconds}`,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    outputPath
  ];
  await runFFmpeg(args);
  return outputPath;
}

module.exports = {
  runFFmpeg,
  processAudio,
  processVideoClip,
  renderVideoSequence,
  extractThumbnail,
  processImage,
  generateSampleAudio,
  generateSampleVideo,
  getFFmpegPath: () => ffmpegPath
};

