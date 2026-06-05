const express = require("express");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const fs = require('fs');

const app = express();

// Rate limiting: 500 requests per 15 minutes for the API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit to 500
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes." }
});

// Stricter rate limit for /formats and /download (15 requests per 15 minutes)
const downloaderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many download requests. Please wait a while before your next download." }
});

// Apply global limiter but skip it for the /admin area
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) return next();
  limiter(req, res, next);
});

app.use("/formats", downloaderLimiter);
app.use("/download", downloaderLimiter);

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
  try {
    fs.appendFileSync(path.join(__dirname, 'server_debug.log'), logMsg);
  } catch (err) {
    console.error('Failed to write to server_debug.log:', err);
  }
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

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const logoPath = path.join(publicDir, "logo.svg");
const faviconPath = path.join(publicDir, "favicon.svg");

app.set("trust proxy", true);

function getExtraCspSources() {
  return (process.env.MONETAG_CSP_SOURCES || '')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean)
    .join(' ');
}

// ─── Security & CSP Headers ────────────────────────────────────────────────
app.use((req, res, next) => {
  const extraCspSources = getExtraCspSources();
  const csp = [
    "default-src 'self'",
    // Monetag and base requirements
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.n6wxm.com https://n6wxm.com https://*.rtmk.net https://my.rtmk.net https://*.ldrus.com https://*.vauvany.com https://*.propush.me https://www.gstatic.com https://www.google.com https://www.googletagmanager.com ${extraCspSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    `frame-src https://*.n6wxm.com https://n6wxm.com https://*.rtmk.net https://my.rtmk.net https://*.ldrus.com https://*.vauvany.com https://*.propush.me https://www.google.com https://www.googletagmanager.com https://downloader-c5163.firebaseapp.com ${extraCspSources}`,
    `connect-src 'self' https://*.n6wxm.com https://n6wxm.com https://*.rtmk.net https://my.rtmk.net https://*.ldrus.com https://*.vauvany.com https://*.propush.me https://firestore.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://downloader-c5163.firebaseapp.com https://www.googletagmanager.com https://www.gstatic.com https://*.firebasejs.map ${extraCspSources}`,
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

// ─── Shared Public API ───────────────────────────────────────────────────
app.get("/api/settings", async (req, res) => {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!projectId || !apiKey) {
      return res.status(500).json({ success: false, message: "Missing Firebase configuration" });
    }
    
    // Fetch settings/site document from Firestore REST API
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/site?key=${apiKey}`;
    const response = await axios.get(url);
    
    const rawData = response.data.fields || {};
    // Extract values from Firestore REST format (e.g., { "stringValue": "..." })
    const settings = {};
    for (const key in rawData) {
      const val = rawData[key];
      if (val.stringValue !== undefined) settings[key] = val.stringValue;
      else if (val.integerValue !== undefined) settings[key] = parseInt(val.integerValue);
      else if (val.booleanValue !== undefined) settings[key] = val.booleanValue;
      else if (val.mapValue !== undefined) {
          // Handle simple JSON maps for Banner Zones
          const map = {};
          const fields = val.mapValue.fields || {};
          for (const mk in fields) map[mk] = fields[mk].stringValue || fields[mk].integerValue || fields[mk].booleanValue;
          settings[key] = map;
      }
    }
    
    res.json({ success: true, settings });
  } catch (err) {
    console.error("Error fetching settings:", err.message);
    res.status(500).json({ success: false, message: "Failed to load settings" });
  }
});

// Redirect trailing slashes to clean URLs (except root and admin)
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/') && !req.path.startsWith('/admin/')) {
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
      'twitter.com', 'x.com', 'cdninstagram.com', 'fbcdn.net',
      'twimg.com', 't.co', 'pinterest.com', 'pin.it'
    ];
    return supported.some(s => host.includes(s));
  } catch { return false; }
}



/**
 * Detects if a URL is a direct media file (image/video) from a CDN.
 * This allows us to skip yt-dlp entirely for already-resolved links.
 */
function isDirectMediaUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Broaden coverage for various IG/FB CDN variations
    const isCdn = host.includes('cdninstagram.com') || 
                  host.includes('fbcdn.net') || 
                  host.includes('abs.twimg.com') ||
                  host.includes('fb.watch') ||
                  (host.includes('instagram.com') && (parsed.pathname.includes('/cdn-cgi/') || parsed.pathname.includes('/v/')));
    
    // Check path for common media extensions — case insensitive, handle query params
    const hasExt = /\.(jpg|jpeg|png|webp|heic|mp4|webm|m4v|mov|mp3|m4a|ogg)(\?|$)/i.test(parsed.pathname);
    
    return isCdn && hasExt;
  } catch {
    return false;
  }
}

/**
 * Scrapes metadata directly from Instagram HTML when yt-dlp is blocked.
 * Prioritizes extracting full-resolution display_url from Instagram's embedded JSON data.
 * Falls back to og:image only as a last resort (og:image is often cropped/compressed).
 */
async function scrapeInstagramMetadata(url) {
  try {
    const userAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    ];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    console.log(`Starting HTML Scraper for: ${url} (UA: ${ua.slice(0, 30)}...)`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    const html = response.data;
    logToFile(`Scraper fetched HTML (${html.length} chars) for ${url}`);
    const media = [];

    // ── Priority 1: Extract full-res display_url from Instagram's embedded JSON ──
    // Instagram embeds post data in <script type="application/json"> or window.__additionalDataLoaded
    let fullResImageUrl = null;

    // Helper: recursively search JSON tree for display_resources or display_url (full resolution)
    const findImageUrlInJson = (obj, depth = 0) => {
      if (depth > 12 || !obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const item of obj) { const r = findImageUrlInJson(item, depth + 1); if (r) return r; }
        return null;
      }
      // display_resources: [{src, config_width, config_height}] - pick the largest width
      if (obj.display_resources && Array.isArray(obj.display_resources) && obj.display_resources.length > 0) {
        const largest = obj.display_resources.reduce((a, b) => ((b.config_width || 0) > (a.config_width || 0) ? b : a));
        if (largest.src) return largest.src;
      }
      // display_url is the direct full-resolution image URL
      if (obj.display_url && typeof obj.display_url === 'string' && obj.display_url.startsWith('http')) {
        return obj.display_url;
      }
      for (const key of Object.keys(obj)) {
        const r = findImageUrlInJson(obj[key], depth + 1);
        if (r) return r;
      }
      return null;
    };

    // Try window.__additionalDataLoaded JSON blob
    const additionalDataMatch = html.match(/window\.__additionalDataLoaded\s*\(\s*['"][^'"]+['"]\s*,\s*(\{[\s\S]+?\})\s*\)/);
    if (additionalDataMatch) {
      try {
        const jsonData = JSON.parse(additionalDataMatch[1]);
        const media_obj = jsonData && (jsonData.graphql && jsonData.graphql.shortcode_media) || (jsonData.items && jsonData.items[0]);
        if (media_obj) {
          if (media_obj.is_video && media_obj.video_url) {
            media.push({ url: media_obj.video_url.replace(/&amp;/g, '&'), type: 'video', quality: 'HD', note: 'Video' });
          }
          fullResImageUrl = fullResImageUrl || findImageUrlInJson(media_obj);
        }
      } catch (e) { /* ignore parse errors */ }
    }

    // Try <script type="application/json"> blocks (newer Instagram structure)
    if (!fullResImageUrl) {
      const scriptTagRe = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let scriptMatch;
      while ((scriptMatch = scriptTagRe.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(scriptMatch[1]);
          const found = findImageUrlInJson(jsonData);
          if (found) { fullResImageUrl = found; break; }
        } catch (e) { /* continue */ }
      }
    }

    // Try window._sharedData (older Instagram structure)
    if (!fullResImageUrl) {
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const postPage = sharedData && sharedData.entry_data && sharedData.entry_data.PostPage && sharedData.entry_data.PostPage[0];
          const media_obj = postPage && postPage.graphql && postPage.graphql.shortcode_media;
          if (media_obj) {
            if (media_obj.is_video && media_obj.video_url && media.length === 0) {
              media.push({ url: media_obj.video_url.replace(/&amp;/g, '&'), type: 'video', quality: 'HD', note: 'Video' });
            }
            fullResImageUrl = fullResImageUrl || findImageUrlInJson(media_obj);
          }
        } catch (e) { /* ignore */ }
      }
    }

    // Try JSON-LD structured data
    if (!fullResImageUrl) {
      const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const ldData = JSON.parse(jsonLdMatch[1]);
          const ldImage = ldData && (ldData.image || ldData.thumbnailUrl);
          if (ldImage && typeof ldImage === 'string' && ldImage.startsWith('http')) {
            fullResImageUrl = ldImage;
          } else if (Array.isArray(ldImage) && ldImage.length > 0) {
            fullResImageUrl = ldImage[0];
          }
        } catch (e) { /* ignore */ }
      }
    }

    if (fullResImageUrl) {
      console.log(`Scraper found FULL-RES image: ${fullResImageUrl.slice(0, 70)}...`);
      media.push({ url: fullResImageUrl.replace(/&amp;/g, '&'), type: 'photo', quality: 'HD', note: 'Photo' });
    }

    // ── Priority 2 (Fallback): OG Image ──
    // og:image is often cropped/compressed by Instagram, only use if nothing better was found
    // Extract OG Image
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || 
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImageMatch) {
      console.log(`Scraper found OG Image: ${ogImageMatch[1].slice(0, 50)}...`);
      let photoUrl = ogImageMatch[1].replace(/&amp;/g, '&');
      
      // Instagram heavily crops og:image to a square by appending path parameters.
      // Remove crop (/c0.135.1080.1080a/) and scale (/s1080x1080/ or /p1080x1080/) params to get the original aspect ratio.
      photoUrl = photoUrl.replace(/\/c[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+[a-zA-Z]?\//i, '/');
      photoUrl = photoUrl.replace(/\/[ps][0-9]+x[0-9]+\//i, '/');
      console.log(`De-cropped URL generated: ${photoUrl.slice(0, 50)}...`);

      media.push({ url: photoUrl, type: 'photo', quality: 'HD', note: 'Photo' });
    }

    // Extract OG Video (if no video was already found from JSON)
    if (media.filter(m => m.type === 'video').length === 0) {
      const ogVideoMatch = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video["']/i);
      if (ogVideoMatch) {
        console.log(`Scraper found OG Video: ${ogVideoMatch[1].slice(0, 50)}...`);
        media.push({ url: ogVideoMatch[1].replace(/&amp;/g, '&'), type: 'video', quality: 'HD', note: 'Video' });
      }
    }

    // Try to find titles
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' • Instagram photos and videos', '') : 'Instagram Post';

    return media.length > 0 ? { success: true, title, media } : null;
  } catch (err) {
    console.error('HTML Scraper Error:', err.message);
    return null;
  }
}




// ─── /formats ──────────────────────────────────────────────────────────────
app.post("/formats", async (req, res) => {
  let { url } = req.body ?? {};
  if (!url) return res.status(400).json({ success: false, message: "No URL provided." });

  // Auto-normalize protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  if (!isSupportedUrl(url)) {
    console.warn(`Rejected URL (400): [${url}]`);
    logToFile(`Rejected URL (400): ${url}`);
    return res.status(400).json({ success: false, message: "Invalid or unsupported URL. We support Instagram, TikTok, Facebook, and Twitter." });
  }



  try {
    console.log(`Analyzing formats for: ${url}`);

    // FAST-TRACK BYPASS: If it's a direct CDN link, don't bother with yt-dlp
    if (isDirectMediaUrl(url)) {
      console.log('Direct CDN link detected, bypassing yt-dlp.');
      const ext = url.includes('.mp4') || url.includes('.webm') ? 'mp4' : 'jpg';
      const type = ext === 'mp4' ? 'video' : 'photo';
      
      return res.json({
        success: true,
        videoId: 'cdn_' + Buffer.from(url).toString('base64').slice(0, 8),
        title: 'Direct Media Link',
        thumbnail: type === 'photo' ? '/proxy-image?url=' + encodeURIComponent(url) : '',
        formats: {
          video: [{ id: 'direct_link', quality: 'Original', format: ext, size: null, type: type, note: 'Direct CDN', url: url }],
          audio: []
        },
        photoUrl: type === 'photo' ? url : null
      });
    }

    const result = await runYtDlpAsync([
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--no-playlist',
      '--geo-bypass',
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      url
    ], 20000); // 20s timeout for formats


    logToFile(`Formats result for ${url}: status ${result.status}, stderr: ${result.stderr ? result.stderr.slice(0, 500) : 'none'}`);

    if (result.status !== 0) {
      const stderr = result.stderr || '';
      // Specific tolerance for Instagram errors that occur for photo-only posts
      const stderrLc = stderr.toLowerCase();
      const isIgPhotoError = url.includes('instagram.com') && (
        stderrLc.includes('no video formats found') || 
        stderrLc.includes('there is no video in this post') ||
        stderrLc.includes('no formats found')
      );

      if (!isIgPhotoError) {
        const clean = stderr.split('\n').find(l => l.includes('ERROR')) || stderr.slice(0, 300);
        throw new Error(clean.replace('ERROR: ', '').trim() || "Format analysis failed.");
      }
      console.log('Tolerating IG error for photo extraction fallback.');

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
    const rawFormats = data.formats || [];
    let videoFormats = [];
    const audioFormats = [];

    // IG Carousel support: extract from entries if available
    const allItems = [data];
    if (data.entries && Array.isArray(data.entries)) {
      allItems.push(...data.entries);
    }

    allItems.forEach(item => {
      const itemFormats = item.formats || [];
      itemFormats.forEach(f => {
        if (f.ext === 'mhtml') return;
        const hasVideo = f.vcodec && f.vcodec !== 'none';
        const hasAudio = f.acodec && f.acodec !== 'none';
        const quality = f.height ? `${f.height}p` : 'Standard';

        if (hasVideo && hasAudio) {
          videoFormats.push({ id: f.format_id, quality, format: f.ext, size: f.filesize || f.filesize_approx, type: 'video', note: '' });
        } else if (hasVideo && !hasAudio) {
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

      // Photo fallback for this specific item (thumbnails)
      if (videoFormats.filter(v => v.type === 'photo').length === 0 && item.thumbnails && item.thumbnails.length > 0) {
        const bestThumb = item.thumbnails.reduce((prev, current) => {
          const prevArea = (prev.width || 0) * (prev.height || 0);
          const currArea = (current.width || 0) * (current.height || 0);
          return prevArea >= currArea ? prev : current;
        });
        if (bestThumb.url) {
          videoFormats.push({ id: `photo_${item.id || 'res'}`, quality: 'Original', format: 'jpg', size: null, type: 'photo', note: 'HD Image', url: bestThumb.url });
        }
      }
    });

    // Special absolute fallback if still nothing
    if (videoFormats.length === 0 && url.includes('instagram.com/p/')) {
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

    // Final check: If no formats found, try the HTML Scraper as a last resort
    if (uniqueVideo.length === 0 && audioFormats.length === 0 && url.includes('instagram.com')) {
      console.log(`No formats found via yt-dlp, attempting HTML Scraper fallback for ${url}`);
      const scraped = await scrapeInstagramMetadata(url);
      if (scraped && scraped.media.length > 0) {
        console.log(`HTML Scraper salvaged ${scraped.media.length} items for ${url}`);
        logToFile(`HTML Scraper salvaged metadata for ${url}`);
        
        scraped.media.forEach((m, index) => {
          uniqueVideo.push({
            id: `scraped_${index}`,
            quality: m.quality,
            format: m.type === 'video' ? 'mp4' : 'jpg',
            type: m.type,
            note: m.note,
            url: m.url
          });
        });
        
        if (!data.title || data.title === 'Instagram Post') data.title = scraped.title;
        if (!data.thumbnail) data.thumbnail = scraped.media[0].url;
      }
    }

    // Final sanity check
    if (uniqueVideo.length === 0 && audioFormats.length === 0) {
      console.warn(`No formats found for successfully analyzed URL: ${url}`);
      logToFile(`Warning: No formats found for ${url}`);
      return res.status(422).json({ success: false, message: "No downloadable formats found for this post. It might be restricted or unsupported." });
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
    const errorMessage = err.message || 'Unknown error during extraction';
    console.error(`Formats Error for [${url}]:`, errorMessage);
    logToFile(`Formats Error for ${url}: ${errorMessage}`);

    // FINAL FALLBACK: HTML Scraper for IG links that failed yt-dlp
    if (url.includes('instagram.com')) {
      const scraped = await scrapeInstagramMetadata(url);
      if (scraped && scraped.media.length > 0) {
        console.log(`HTML Scraper salvaged ${scraped.media.length} items for ${url}`);
        logToFile(`HTML Scraper salvaged metadata for ${url}`);
        
        const videoItems = scraped.media.map((m, index) => ({
          id: `scraped_${index}`,
          quality: m.quality,
          format: m.type === 'video' ? 'mp4' : 'jpg',
          type: m.type,
          note: m.note,
          url: m.url
        }));

        return res.json({
          success: true,
          videoId: 'scraped_' + Buffer.from(url).toString('base64').slice(0, 6),
          title: scraped.title,
          thumbnail: '/proxy-image?url=' + encodeURIComponent(scraped.media[0].url),
          formats: { video: videoItems, audio: [] },
          photoUrl: scraped.media.find(m => m.type === 'photo')?.url || null
        });
      }
    }

    const isPhotoUrl = url.includes('photo') || url.includes('/p/');
    const typeLabel = isPhotoUrl ? "photo or post" : "video";
    
    let msg = `We were unable to analyze this ${typeLabel}. It might be private, restricted, or the platform is blocking our request.`;
    
    if (errorMessage.includes('Private')) msg = "This post is private. We can only download public content.";
    if (errorMessage.includes('Sign in') || errorMessage.includes('Login required')) msg = "Instagram is requiring a login for this post. Please try another link.";
    
    res.status(422).json({ success: false, message: msg, debug: errorMessage });
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

    console.log(`POST /download: url=${url.slice(0, 30)}... formatId=${formatId} videoId=${videoId}`);
    logToFile(`POST /download: url=${url} formatId=${formatId} videoId=${videoId}`);


    const fid = String(formatId).trim();
    console.log(`Checking formatId: "${fid}" against "photo_" or "scraped_"`);

    // Handle synthetic photo format (including scraped ones)
    if (fid.startsWith('photo_') || fid.startsWith('scraped_')) {
      console.log("-> Entering synthetic photo download branch");
      const photoUrl = req.body.photoUrl || url; // Fallback to url if photoUrl not provided
      const ext = photoUrl.includes('.png') ? 'png' : 'jpg';
      const filePath = path.join(tempDir, `photo_${vidId}.${ext}`);


      try {
        console.log(`Downloading photo from: ${photoUrl.slice(0, 50)}... for ${cleanTitle}`);
        const response = await axios({ 
          method: 'GET', 
          url: photoUrl, 
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Referer': 'https://www.instagram.com/'
          },
          timeout: 15000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
          response.data.on('error', reject);
        });
        console.log(`Successfully saved photo to ${filePath}`);
      } catch (dlErr) {
        console.error(`Salvage download failed: ${dlErr.message}`);
        logToFile(`Salvage download failed for ${cleanTitle}: ${dlErr.message}`);
        throw new Error(`Failed to fetch media from CDN: ${dlErr.message}`);
      }


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
