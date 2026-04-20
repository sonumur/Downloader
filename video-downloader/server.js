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
  fs.appendFile(path.join(__dirname, 'server.log'), logMsg, (err) => {
    if (err) console.error('Failed to write to server.log:', err);
  });
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
async function runYtDlpAsync(args, timeoutMs = 30000) {
  const finalArgs = [
    '--ffmpeg-location', ffmpeg,
    '--no-check-certificates',
    '--no-warnings',
    '--ignore-config',
    '--no-playlist',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--extractor-args', 'youtube:player_client=android,ios;player_skip=web,mweb',
    ...args
  ];

  const strategies = [];

  // 1. Manual cookies.txt (Highest priority / Power user bypass)
  const cookiesPath = path.join(__dirname, 'cookies.txt');
  if (fs.existsSync(cookiesPath)) {
    strategies.push({ name: 'manual-cookies', args: ['--cookies', cookiesPath, ...finalArgs] });
  }

  // On server environments (Production), browser profiles usually lack DPAPI keys or permissions.
  // We prioritize manual cookies.txt and fall back to plain or limited strategies.
  if (process.env.NODE_ENV !== 'production') {
    strategies.push(
      { name: 'firefox-cookies', args: ['--cookies-from-browser', 'firefox', ...finalArgs] },
      { name: 'chrome-cookies', args: ['--cookies-from-browser', 'chrome', ...finalArgs] },
      { name: 'edge-cookies', args: ['--cookies-from-browser', 'edge', ...finalArgs] },
      { name: 'opera-cookies', args: ['--cookies-from-browser', 'opera', ...finalArgs] }
    );
  }

  strategies.push({ name: 'plain', args: finalArgs });

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
      const logStderr = result.stderr ? result.stderr.slice(0, 500).replace(/\n/g, ' ') : 'none';
      logToFile(`Strategy ${strategy.name} result: status ${result.status}, stderr: ${logStderr}`);
      console.log(`Strategy ${strategy.name} finished with status ${result.status}`);

      if (result.status === 0) {
        // If listing formats, ensure we got valid JSON from yt-dlp
        if (args.includes('--dump-json')) {
          try {
            const data = JSON.parse(result.stdout);
            // Accept if we have an id (valid media) even with no formats (e.g. photo posts)
            if (data.id) return result;
            console.log(`Strategy ${strategy.name} returned invalid/empty JSON, trying fallback...`);
          } catch (e) { /* ignore parse error, try next strategy */ }
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
const publicDir = path.join(__dirname, "public");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const logoPath = path.join(publicDir, "logo.svg");
const faviconPath = path.join(publicDir, "favicon.svg");

app.set("trust proxy", true);

// ─── Security & CSP Headers ────────────────────────────────────────────────
app.use((req, res, next) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.gstatic.com https://www.google.com https://*.adtrafficquality.google",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "frame-src https://*.adtrafficquality.google https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://www.googletagmanager.com https://www.googletagservices.com",
    "connect-src 'self' https://*.adtrafficquality.google https://firestore.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://partner.googleadservices.com https://www.googletagmanager.com https://www.googletagservices.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Robots-Tag', 'index, follow');
  next();
});

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

// Redirect trailing slashes to clean URLs (except root)
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    const safepath = req.path.slice(0, -1).replace(/\/+/g, '/');
    return res.redirect(301, safepath + query);
  }
  next();
});

// Make sure crawlers and users land on the canonical HTTPS URL.
app.use((req, res, next) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (process.env.NODE_ENV === "production" && forwardedProto && forwardedProto !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Serve sitemap explicitly so it never falls through to an HTML page.
app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  res.set("Cache-Control", "public, max-age=3600");
  res.sendFile(sitemapPath);
});

// Browsers often request /favicon.ico directly and cache it aggressively.
// Serve the main brand logo here so the tab icon matches the site logo.
app.get("/favicon.ico", (req, res) => {
  res.type("image/svg+xml");
  res.set("Cache-Control", "public, max-age=3600");
  res.sendFile(faviconPath);
});

// Redirect .html requests to clean URLs
app.use((req, res, next) => {
  if (req.path.endsWith('.html') && !req.path.includes('/admin/')) {
    const newPath = req.path.slice(0, -5);
    if (newPath === '/index') return res.redirect(301, '/');
    return res.redirect(301, newPath);
  }
  next();
});

app.use(express.static(publicDir, {
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
      // Specific tolerance for Instagram "No video formats found" which happens for photo posts
      const isIgPhotoError = url.includes('instagram.com') && stderr.includes('No video formats found');

      if (!isIgPhotoError) {
        const clean = stderr.split('\n').find(l => l.includes('ERROR')) || stderr.slice(0, 300);
        throw new Error(clean.replace('ERROR: ', '').trim() || "Format analysis failed.");
      }
      console.log('Tolerating IG "No video formats" error for photo extraction fallback.');
    }

    let data = {};
    try {
      data = JSON.parse(result.stdout.toString());
    } catch (e) {
      if (url.includes('instagram.com')) {
        // synthesize basic data if JSON parse fails but we suspect a photo post
        data = { id: 'ig_post', title: 'Instagram Post', formats: [], thumbnails: [] };
      } else {
        throw e;
      }
    }
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

    // If no formats were found (common for IG photos), fall back to thumbnails
    if (videoFormats.length === 0 && data.thumbnails && data.thumbnails.length > 0) {
      // Find the largest thumbnail
      const bestThumb = data.thumbnails.reduce((prev, current) => {
        const prevArea = (prev.width || 0) * (prev.height || 0);
        const currArea = (current.width || 0) * (current.height || 0);
        return prevArea >= currArea ? prev : current;
      });

      if (bestThumb.url) {
        videoFormats.push({
          id: 'photo_highres',
          quality: 'Original',
          format: 'jpg',
          size: null,
          type: 'photo',
          note: 'HD Image',
          url: bestThumb.url
        });
      }
    } else if (videoFormats.length === 0 && url.includes('instagram.com/p/')) {
      // Absolute fallback for IG posts: use the single 'url' if available from yt-dlp metadata
      if (data.url && !data.url.includes('instagram.com')) {
        videoFormats.push({ id: 'photo_direct', quality: 'Original', format: 'jpg', size: null, type: 'photo', note: 'Image', url: data.url });
      }
    }

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
    const isPhotoUrl = url.includes('photo') || url.includes('/p/');
    const typeLabel = isPhotoUrl ? "photo or post" : "video";
    const msg = `We were unable to analyze this ${typeLabel}. It might be private, restricted, or the platform is blocking our request. Please check the URL and try again.`;
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
    // IMPORTANT: Check if it's specifically an audio format OR if the user explicitly requested audio type
    const isAudioOnly = req.body.type === 'audio' || formatId === 'bestaudio' || (formatId.includes('audio') && !formatId.includes('video') && !formatId.includes('+'));
    const ext = isAudioOnly ? 'mp3' : 'mp4';

    const typeParam = isAudioOnly ? 'audio' : 'video';
    const formatSuffix = formatId.replace(/[^a-zA-Z0-9+]/g, '_');
    const filePath = path.join(tempDir, `${isAudioOnly ? 'audio' : 'video'}_${vidId}_${formatSuffix}.${ext}`);
    // Pass the sanitized formatSuffix (not raw formatId) so /video/:videoId can reconstruct exact filename
    const downloadUrl = `/video/${vidId}?format=${encodeURIComponent(formatSuffix)}&type=${typeParam}&title=${encodeURIComponent(cleanTitle)}`;

    // If file exists and is recent (less than 1 hour old), reuse it
    if (fs.existsSync(filePath)) {
      try {
        const stats = await fs.promises.stat(filePath);
        const now = new Date().getTime();
        const endTime = stats.mtime.getTime() + (60 * 60 * 1000);
        if (now < endTime && stats.size > 10000) {
          console.log(`Reusing existing file: ${filePath}`);
          return res.json({
            success: true,
            video: downloadUrl,
            message: "Download complete"
          });
        }
        await fs.promises.unlink(filePath);
      } catch (e) {
        // file might have been deleted by cleanup task already
      }
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
      const typeParam = isAudioOnly ? 'audio' : 'video';
      return res.json({
        success: true,
        video: downloadUrl,
        message: "Download complete"
      });
    }

    const errorMsg = result.stderr ? (result.stderr.split('\n').find(l => l.includes('ERROR')) || "Download failed") : "Download process exited with error";
    throw new Error(errorMsg);

  } catch (error) {
    const errorLogMsg = `Download Error: ${error.message}${error.stack ? '\n' + error.stack : ''}`;
    console.error(errorLogMsg);
    logToFile(errorLogMsg);
    res.status(500).json({ success: false, message: "An error occurred while preparing your download. Please try again." });
  }
});

// ─── /proxy-image ──────────────────────────────────────────────────────────
const ALLOWED_IMAGE_HOSTS = ['instagram.com', 'cdninstagram.com', 'fbcdn.net', 'tiktokcdn.com', 'twimg.com', 'pbs.twimg.com', 'p16-sign.tiktokcdn.com', 'scontent'];

app.get("/proxy-image", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("No url");

    // SSRF protection: only allow known CDN domains with strict suffix matching
    let parsedUrl;
    try { parsedUrl = new URL(targetUrl); } catch { return res.status(400).send("Invalid URL"); }
    const isAllowed = ALLOWED_IMAGE_HOSTS.some(h =>
      parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h)
    );
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
  // Path Sanitization to prevent traversal
  const videoId = req.params.videoId.replace(/[^a-zA-Z0-9_-]/g, '');
  const format = (req.query.format || 'mp4').replace(/[^a-zA-Z0-9+_]/g, '');
  const title = sanitizeFilename(req.query.title || 'video');
  const type = (req.query.type || 'video').replace(/[^a-z]/g, '');

  let prefix = 'video';
  if (type === 'audio') prefix = 'audio';
  if (type === 'photo') prefix = 'photo';

  const formatIdClean = format.replace(/[^a-zA-Z0-9+]/g, '_');
  const fileNameSuffix = (type === 'photo') ? '' : `_${formatIdClean}`;

  // Determine actual file extension
  let ext = 'mp4';
  if (type === 'photo') {
    ext = format === 'png' ? 'png' : 'jpg';
  } else if (type === 'audio' || format === 'mp3') {
    ext = 'mp3';
  }

  const filePath = path.join(tempDir, `${prefix}_${videoId}${fileNameSuffix}.${ext}`);

  if (fs.existsSync(filePath)) {
    let contentType = 'video/mp4';
    if (type === 'photo') {
      contentType = `image/${format === 'png' ? 'png' : 'jpeg'}`;
    } else if (type === 'audio' || format === 'mp3') {
      contentType = 'audio/mpeg';
    }

    // iOS Safari saves MP4 videos with .mov extension — match the filename to what it saves
    const userAgent = req.headers['user-agent'] || '';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const downloadExt = (isIOS && type === 'video') ? 'mov' : ext;

    // Use RFC 5987 encoding for Content-Disposition to safely handle non-ASCII characters
    // (e.g. emojis or unicode in X/Twitter/Instagram video titles)
    const asciiTitle = title.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '_');
    const encodedTitle = encodeURIComponent(`${title}.${downloadExt}`);
    res.header('Content-Disposition', `attachment; filename="${asciiTitle}.${downloadExt}"; filename*=UTF-8''${encodedTitle}`);
    res.header('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ success: false, message: "File not found." });
  }
});

// ─── Keep-Alive Solution for Render ─────────────────────────────────────────
app.get("/ping", (req, res) => {
  res.status(200).send("OK");
});

/**
 * Self-ping logic to prevent Render free-tier from sleeping.
 * Pings the external URL if available, otherwise falls back to localhost.
 */
setInterval(async () => {
  try {
    // Try to determine the most reliable URL to ping
    // 1. RENDER_EXTERNAL_URL is specific to Render if configured
    // 2. Default to downloader.online for production
    // 3. Fallback to localhost
    let host = process.env.RENDER_EXTERNAL_URL || 'https://downloader.online';

    // In local development, always use localhost
    if (process.env.NODE_ENV !== 'production' && !process.env.RENDER_EXTERNAL_URL) {
      host = `http://localhost:${PORT}`;
    }

    const pingUrl = `${host}/ping`;
    await axios.get(pingUrl, {
      headers: { 'User-Agent': 'Render-Keep-Alive/1.0' },
      timeout: 10000
    });

    logToFile(`[Keep-Alive] Self-ping successful: ${pingUrl}`);
    console.log(`[Keep-Alive] Self-ping successful at ${new Date().toISOString()}`);
  } catch (err) {
    const errMsg = `[Keep-Alive] Self-ping failed: ${err.message}`;
    logToFile(errMsg);
    console.error(errMsg);
  }
}, 14 * 60 * 1000); // 14 minutes (Render sleep threshold is ~15 min)

/**
 * Temp directory cleanup task
 * Deletes files older than 24 hours every 6 hours
 */
setInterval(async () => {
  try {
    const now = Date.now();
    const files = await fs.promises.readdir(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.promises.stat(filePath);
      const ageMs = now - stats.mtimeMs;
      if (ageMs > 24 * 60 * 60 * 1000) {
        await fs.promises.unlink(filePath);
        logToFile(`[Cleanup] Deleted old file: ${file}`);
      }
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
  }
}, 6 * 60 * 60 * 1000);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
