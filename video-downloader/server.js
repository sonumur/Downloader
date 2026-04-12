const express = require("express");
require("dotenv").config();
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const fs = require('fs');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// Auto-detect yt-dlp binary for Windows (.exe) or Linux/Mac (no extension)
const isWindows = process.platform === 'win32';
const ytDlpBin = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const localYtDlp = path.join(__dirname, ytDlpBin);
const packageYtDlpWin = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
const packageYtDlpLinux = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
const packageYtDlp = fs.existsSync(packageYtDlpWin) ? packageYtDlpWin : packageYtDlpLinux;
const ytDlpPath = fs.existsSync(localYtDlp) ? localYtDlp : packageYtDlp;

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

console.log('Using yt-dlp binary:', ytDlpPath);

function logToFile(msg) {
  const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.join(__dirname, 'server.log'), logMsg);
}
logToFile('Server starting...');

// Check for ffmpeg
let hasFfmpeg = false;
try {
  require('child_process').execSync(`"${ffmpeg}" -version`, { stdio: 'ignore' });
  hasFfmpeg = true;
  console.log('ffmpeg found, high quality downloads enabled.');
} catch (e) {
  console.warn('ffmpeg not found, only pre-combined (audio+video) formats available at full quality.');
}

// Try to detect which browser has cookies available
const BROWSERS = ['chrome', 'edge', 'firefox', 'opera', 'brave', 'vivaldi'];


function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Robust async version of yt-dlp execution with timeouts
 */
async function runYtDlpAsync(args, timeoutMs = 15000) {
  const finalArgs = [
    '--ffmpeg-location', ffmpeg,
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    ...args
  ];
  
  const strategies = [];
  
  // 1. Manual cookies.txt (Highest priority / Power user bypass)
  const cookiesPath = path.join(__dirname, 'cookies.txt');
  if (fs.existsSync(cookiesPath)) {
    strategies.push({ name: 'manual-cookies', args: ['--cookies', cookiesPath, ...finalArgs] });
  }

  strategies.push(
    { name: 'edge-cookies', args: ['--cookies-from-browser', 'edge', ...finalArgs] },
    { name: 'chrome-cookies', args: ['--cookies-from-browser', 'chrome', ...finalArgs] },
    { name: 'plain', args: finalArgs }
  );

  const { spawn } = require('child_process');
  let lastResult = { status: -1, stderr: 'No strategies tried.' };

  for (const strategy of strategies) {
    try {
      console.log(`Trying strategy: ${strategy.name}...`);
      const result = await new Promise((resolve) => {
        const child = spawn(ytDlpPath, strategy.args, { maxBuffer: 100 * 1024 * 1024 });
        let stdout = '';
        let stderr = '';
        
        const timer = setTimeout(() => {
          child.kill();
          resolve({ status: -1, stderr: 'Timeout', stdout });
        }, timeoutMs);

        child.stdout.on('data', (d) => stdout += d.toString());
        child.stderr.on('data', (d) => stderr += d.toString());
        child.on('close', (code) => {
          clearTimeout(timer);
          resolve({ status: code, stdout, stderr });
        });
        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({ status: -1, error: err, stderr: err.message });
        });
      });

      lastResult = result;
      logToFile(`Strategy ${strategy.name} result: status ${result.status}, stderr: ${result.stderr ? result.stderr.slice(0, 200).replace(/\n/g, ' ') : 'none'}`);

      if (result.status === 0) {
        // If listing formats, ensure we got more than just storyboards
        if (args.includes('--dump-json')) {
           try {
             const data = JSON.parse(result.stdout);
             if (data.formats && data.formats.length > 5) return result;
             console.log(`Strategy ${strategy.name} returned limited formats (${data.formats.length}), trying fallback...`);
           } catch(e) { /* ignore parse error */ }
        } else {
          return result;
        }
      } else {
        console.log(`Strategy ${strategy.name} failed or blocked.`);
      }
    } catch (e) {
      console.error(`Strategy ${strategy.name} exception:`, e);
    }
  }
  return lastResult;
}

// Removed old sync runYtDlp

const app = express();
const PORT = process.env.PORT || 3000;

// Serve Firebase Config Dynamically
app.get("/admin/js/firebase-config.js", (req, res) => {
  res.type("application/javascript");
  res.send(`
    const firebaseConfig = {
      apiKey: "${process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY_HERE"}",
      authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || "YOUR_FIREBASE_AUTH_DOMAIN_HERE"}",
      projectId: "${process.env.FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID_HERE"}",
      storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET_HERE"}",
      messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE"}",
      appId: "${process.env.FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID_HERE"}"
    };
    if (window.firebase && !firebase.apps.length && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY_HERE") {
      firebase.initializeApp(firebaseConfig);
    }
    window.db = (window.firebase && firebase.apps.length) ? firebase.firestore() : null;
  `);
});

const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',')
  : ['http://localhost:3000', 'https://downloader.online'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), {
  extensions: ['html']
}));

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogg"];

function isValidHttpUrl(value) {
  try {
    const p = new URL(value);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch { return false; }
}

function isSupportedUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const supported = [
      'tiktok.com', 'facebook.com', 'fb.watch', 'instagram.com', 
      'twitter.com', 'x.com'
    ];
    return supported.some(s => host.includes(s));
  } catch { return false; }
}

// ─── /formats ──────────────────────────────────────────────────────────────
app.post("/formats", async (req, res) => {
  const { url } = req.body ?? {};
  if (!url || !isSupportedUrl(url))
    return res.status(400).json({ success: false, message: "Invalid or unsupported URL." });

  try {
    console.log(`Analyzing formats for: ${url}`);

    const result = await runYtDlpAsync([
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      url
    ], 20000); // 20s timeout for formats

    logToFile(`Formats result for ${url}: status ${result.status}, stderr: ${result.stderr ? result.stderr.slice(0, 500) : 'none'}`);

    if (result.status !== 0) {
      const stderr = result.stderr || '';
      const clean = stderr.split('\n').find(l => l.includes('ERROR')) || stderr.slice(0, 300);
      throw new Error(clean.replace('ERROR: ', '').trim() || "Format analysis failed.");
    }

    const data = JSON.parse(result.stdout.toString());
    const formats = data.formats || [];

    let videoFormats = [];
    const audioFormats = [];

    formats.forEach(f => {
      if (f.ext === 'mhtml') return;

      const hasVideo = f.vcodec && f.vcodec !== 'none';
      const hasAudio = f.acodec && f.acodec !== 'none';

      const quality = f.height ? `${f.height}p` : 'Standard';

      if (hasVideo && hasAudio) {
        // Combined stream — best option, plays everywhere
        videoFormats.push({ id: f.format_id, quality, format: f.ext, size: f.filesize || f.filesize_approx, type: 'video', note: '' });
      } else if (hasVideo && !hasAudio) {
        // Video-only stream
        videoFormats.push({
          id: hasFfmpeg ? `${f.format_id}+bestaudio` : f.format_id,
          quality,
          format: hasFfmpeg ? 'mp4' : f.ext,
          size: f.filesize || f.filesize_approx,
          type: 'video',
          note: hasFfmpeg ? 'HD' : '(no sound)'
        });
      } else if (!hasVideo && hasAudio) {
        audioFormats.push({ id: f.format_id, quality: f.abr ? `${Math.round(f.abr)}k` : 'Audio', format: f.ext, type: 'audio' });
      } else if (f.ext === 'jpg' || f.ext === 'png' || f.ext === 'webp' || f.ext === 'jpeg') {
        videoFormats.push({ id: f.format_id, quality: 'Original', format: f.ext, size: f.filesize, type: 'photo', note: 'Image', url: f.url });
      }
    });

    // Dedup by quality+format+note
    const seen = new Set();
    const uniqueVideo = videoFormats.filter(f => {
      const k = `${f.quality}_${f.format}_${f.note}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });

    // Sort: highest res first; combined before no-sound at same res
    uniqueVideo.sort((a, b) => {
      const diff = (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0);
      if (diff !== 0) return diff;
      if (a.note === '' && b.note !== '') return -1;
      if (b.note === '' && a.note !== '') return 1;
      return 0;
    });

    // Synthesis: If no audio formats found but video exists, add a high-quality audio option
    if (audioFormats.length === 0 && uniqueVideo.length > 0) {
      audioFormats.push({ id: 'bestaudio', quality: 'Best', format: 'mp3', type: 'audio', note: 'High Quality' });
    } else if (audioFormats.length > 0 && hasFfmpeg) {
      // Add an explicit MP3 conversion option if audio exists
      audioFormats.unshift({ id: 'bestaudio', quality: 'Best', format: 'mp3', type: 'audio', note: 'Converted' });
    }

    res.json({
      success: true,
      videoId: data.id,
      title: data.title,
      duration: data.duration,
      thumbnail: data.thumbnail ? '/proxy-image?url=' + encodeURIComponent(data.thumbnail) : '',
      formats: { video: uniqueVideo, audio: audioFormats },
      photoUrl: uniqueVideo.find(f => f.type === 'photo')?.url || null
    });

  } catch (err) {
    console.error('Formats Error:', err.message);
    const msg = "We were unable to analyze this video. It might be private, restricted, or the platform is blocking our request. Please check the URL and try again.";
    res.status(500).json({ success: false, message: msg });
  }
});

// ─── /download ─────────────────────────────────────────────────────────────
app.post("/download", async (req, res) => {
  const { url, formatId, videoId, title } = req.body ?? {};
  if (!url || !formatId)
    return res.status(400).json({ success: false, message: "Missing URL or formatId." });

  try {
    const vidId = videoId || Buffer.from(url).toString('base64').slice(0, 10).replace(/[^a-zA-Z0-9]/g, '');
    const cleanTitle = sanitizeFilename(title || 'video');
    
    // Handle synthetic photo format
    if (formatId.startsWith('photo_')) {
      const photoUrl = req.body.photoUrl || url; // Fallback to url if photoUrl not provided
      const ext = photoUrl.includes('.png') ? 'png' : 'jpg';
      const filePath = path.join(tempDir, `photo_${vidId}.${ext}`);
      
      console.log(`Downloading photo: ${cleanTitle}`);
      const response = await axios({ method: 'GET', url: photoUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      return res.json({ 
        success: true, 
        video: `/video/${vidId}?format=${ext}&title=${encodeURIComponent(cleanTitle)}&type=photo`, 
        message: "Photo download complete" 
      });
    }

    // Determine if it's an audio-only request
    const isAudioOnly = formatId === 'bestaudio' || formatId.includes('audio');
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    const filePath = path.join(tempDir, `${isAudioOnly ? 'audio' : 'video'}_${vidId}_${formatId.replace(/[^a-zA-Z0-9+]/g, '_')}.${ext}`);
    
    // If file exists and is recent (less than 1 hour old), reuse it
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const now = new Date().getTime();
      const endTime = stats.mtime.getTime() + (60 * 60 * 1000);
      if (now < endTime && stats.size > 10000) {
        console.log(`Reusing existing file: ${filePath}`);
        return res.json({ 
          success: true, 
          video: `/video/${vidId}?format=${encodeURIComponent(formatId)}&title=${encodeURIComponent(cleanTitle)}`, 
          message: "Download complete (reused)" 
        });
      }
      fs.unlinkSync(filePath);
    }

    console.log(`Downloading: ${cleanTitle} (${formatId})`);

    const ytDlpArgs = [
      '--no-check-certificates',
      '-o', filePath,
      url
    ];

    if (isAudioOnly) {
      ytDlpArgs.unshift('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      if (formatId !== 'bestaudio') {
        ytDlpArgs.unshift('-f', formatId);
      }
    } else {
      ytDlpArgs.unshift('-f', formatId, '--merge-output-format', 'mp4');
    }

    const result = await runYtDlpAsync(ytDlpArgs);

    if (result.status === 0 && fs.existsSync(filePath) && fs.statSync(filePath).size > 5000) {
      const downloadParam = isAudioOnly ? `format=mp3&type=audio` : `format=${encodeURIComponent(formatId)}`;
      return res.json({ 
        success: true, 
        video: `/video/${vidId}?${downloadParam}&title=${encodeURIComponent(cleanTitle)}`, 
        message: "Download complete" 
      });
    }

    const errorMsg = result.stderr ? (result.stderr.split('\n').find(l => l.includes('ERROR')) || "Download failed") : "Download process exited with error";
    throw new Error(errorMsg);

  } catch (error) {
    console.error('Download Error:', error.message);
    res.status(500).json({ success: false, message: "An error occurred while preparing your download. Please try again." });
  }
});

// ─── /proxy-image ──────────────────────────────────────────────────────────
const ALLOWED_IMAGE_HOSTS = ['instagram.com', 'cdninstagram.com', 'fbcdn.net', 'tiktokcdn.com', 'twimg.com', 'pbs.twimg.com', 'p16-sign.tiktokcdn.com', 'scontent'];

app.get("/proxy-image", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("No url");
    
    // SSRF protection: only allow known CDN domains
    let parsedUrl;
    try { parsedUrl = new URL(targetUrl); } catch { return res.status(400).send("Invalid URL"); }
    const isAllowed = ALLOWED_IMAGE_HOSTS.some(h => parsedUrl.hostname.includes(h));
    if (!isAllowed) return res.status(403).send("Forbidden host");
    
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/'
      }
    });
    res.set('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (err) {
    res.status(500).send("Error");
  }
});

// ─── /video/:videoId ───────────────────────────────────────────────────────
app.get("/video/:videoId", (req, res) => {
  const { videoId } = req.params;
  const format = req.query.format || 'mp4';
  const title = req.query.title || 'video';
  const type = req.query.type || 'video';
  
  const prefix = type === 'photo' ? 'photo' : 'video';
  const fileNameSuffix = type === 'photo' ? '' : `_${format.replace(/[^a-zA-Z0-9+]/g, '_')}`;
  const filePath = path.join(tempDir, `${prefix}_${videoId}${fileNameSuffix}.${format}`);

  if (fs.existsSync(filePath)) {
    let contentType = 'video/mp4';
    if (type === 'photo') {
      contentType = `image/${format === 'png' ? 'png' : 'jpeg'}`;
    } else if (type === 'audio' || format === 'mp3') {
      contentType = 'audio/mpeg';
    }
    
    res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);
    res.header('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ success: false, message: "File not found." });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
