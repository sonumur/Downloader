/**
 * Batch fix script for AdSense compliance across all downloader pages
 * Run: node fix_adsense.js
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Files to fix aggregateRating (fake schema data)
const filesToFixRating = [
  'tiktok-downloader.html',
  'instagram-reels-downloader.html',
  'instagram-photo-downloader.html',
  'instagram-stories-downloader.html',
  'facebook-downloader.html',
  'twitter-downloader.html',
  'video-downloader.html',
  'audio-downloader.html',
  'instagram-downloader.html',
];

// Watermark language rewrites for TikTok ONLY (strongest policy risk)
const tiktokWatermarkFixes = [
  {
    from: 'TikTok Downloader - Best Free Online No Watermark Saver | downloader.online',
    to: 'TikTok Video Downloader — Save TikTok MP4 & MP3 Free | downloader.online'
  },
  {
    from: 'Free TikTok downloader at downloaderonline. Download TikTok videos without watermark in HD quality. Best SnapTik and SSSTik alternative tool to save TikTok MP4 or MP3.',
    to: 'Free TikTok video downloader. Save TikTok MP4 videos in HD quality for personal offline use. Best SnapTik and SSSTik alternative — no sign-up needed.'
  },
  {
    from: 'TikTok Downloader - Best Free Online No Watermark Saver | downloader.online',
    to: 'TikTok Video Downloader — Save TikTok MP4 & MP3 Free | downloader.online'
  },
  {
    from: 'Download TikTok videos without watermark in HD quality for free. Best SnapTik alternative to save TikTok MP4 or MP3 instantly.',
    to: 'Save TikTok videos in HD quality for free, for personal offline use. Best SnapTik alternative to download TikTok MP4 or MP3 instantly.'
  },
  {
    from: '<p class="hero-subtitle">Download TikTok videos without watermark for free. Save TikTok MP4 videos online effortlessly.</p>',
    to: '<p class="hero-subtitle">Save TikTok videos in HD quality — free, fast, and for personal offline use. No sign-up required.</p>'
  },
  {
    from: '<h2>Advanced TikTok Video Downloader Without Watermark</h2>',
    to: '<h2>Advanced TikTok Video Downloader — HD Quality</h2>'
  },
  {
    from: '<h2>How to Download no-watermark TikToks</h2>',
    to: '<h2>How to Download TikTok Videos in HD</h2>'
  },
  {
    from: '<li><strong>Watermark Removal:</strong> We actively bypass the standard TikTok branding engine, giving you access to the untouched, raw video exactly as the creator filmed it.</li>',
    to: '<li><strong>Original Quality:</strong> We retrieve the original HD source file available from the platform, delivering clean, high-quality video for personal offline viewing.</li>'
  },
  // TikTok hero text
  {
    from: 'and most importantly, absolutely <strong>without the TikTok watermark</strong>',
    to: 'for personal offline use, in the highest available quality'
  },
  {
    from: 'logo-free content',
    to: 'high-quality content for personal use'
  },
];

// "No Watermark" badge — change across ALL pages to "Original Quality"
const badgeFix = {
  from: '<span>No Watermark</span>',
  to: '<span>Original Quality</span>'
};

// Trust badge on index.html
const indexBadgeFix = {
  from: '                        <span>No Watermark</span>',
  to: '                        <span>Original Quality</span>'
};

// Sitemap: add lastmod to all entries
function fixSitemap() {
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  let content = fs.readFileSync(sitemapPath, 'utf8');
  const today = '2026-06-01';
  // Add <lastmod> after each <loc>...</loc> if not already present
  content = content.replace(/(<loc>[^<]+<\/loc>)(\s*)(?!<lastmod>)/g, `$1\n    <lastmod>${today}</lastmod>`);
  fs.writeFileSync(sitemapPath, content, 'utf8');
  console.log('✅ sitemap.xml — lastmod added');
}

// Fix aggregateRating in all downloader pages
function fixFakeRating(filename) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  ${filename} not found`); return; }
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove aggregateRating block
  const ratingRegex = /,\s*"aggregateRating":\s*\{[^}]+\}/g;
  const newContent = content.replace(ratingRegex, '');
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ ${filename} — fake aggregateRating removed`);
  } else {
    console.log(`ℹ️  ${filename} — no aggregateRating found (already clean)`);
  }
}

// Fix watermark language in tiktok-downloader.html
function fixTikTokWatermarkLanguage() {
  const filePath = path.join(publicDir, 'tiktok-downloader.html');
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const fix of tiktokWatermarkFixes) {
    if (content.includes(fix.from)) {
      content = content.split(fix.from).join(fix.to);
      console.log(`✅ tiktok-downloader.html — replaced: "${fix.from.substring(0, 60)}..."`);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fix "No Watermark" badge text across all files
function fixWatermarkBadges() {
  const allHtmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
  for (const filename of allHtmlFiles) {
    const filePath = path.join(publicDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(badgeFix.from)) {
      content = content.split(badgeFix.from).join(badgeFix.to);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filename} — "No Watermark" badge → "Original Quality"`);
    }
  }
}

// Fix extension.html — add noindex and a minimum of useful content
function fixExtensionPage() {
  const filePath = path.join(publicDir, 'extension.html');
  if (!fs.existsSync(filePath)) { console.log('⚠️  extension.html not found'); return; }
  let content = fs.readFileSync(filePath, 'utf8');
  // Add noindex if not already there
  if (!content.includes('noindex')) {
    content = content.replace('<meta name="robots"', '<meta name="robots" content="noindex, nofollow">\n    <meta name="robots-old"');
    if (!content.includes('noindex')) {
      // fallback: inject before </head>
      content = content.replace('</head>', '    <meta name="robots" content="noindex, nofollow">\n</head>');
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ extension.html — noindex added');
  } else {
    console.log('ℹ️  extension.html — already has noindex');
  }
}

// Standardize footer: add Contact Us link where missing, add Site Map where missing
function fixFooters() {
  const files = [
    'index.html',
    'contact.html',
    'dmca.html',
    'about.html',
    'faq.html',
    'privacy-policy.html',
    'tiktok-downloader.html',
    'instagram-reels-downloader.html',
    'instagram-photo-downloader.html',
    'instagram-stories-downloader.html',
    'instagram-downloader.html',
    'facebook-downloader.html',
    'twitter-downloader.html',
    'video-downloader.html',
    'audio-downloader.html',
    'how-to-use.html',
  ];
  
  for (const filename of files) {
    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Add Contact Us to footer if missing
    if (content.includes('footer-links') && !content.includes('href="/contact">Contact Us')) {
      content = content.replace(
        /<a href="\/terms-of-service">Terms of Service<\/a>\s*<\/div>/,
        `<a href="/terms-of-service">Terms of Service</a>\n                <a href="/contact">Contact Us</a>\n            </div>`
      );
      changed = true;
    }
    
    // Add Site Map to footer if missing
    if (content.includes('footer-links') && !content.includes('href="/site-map"')) {
      content = content.replace(
        /(<div class="footer-links">)/,
        `$1\n                <a href="/site-map">Site Map</a>`
      );
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filename} — footer links standardized`);
    }
  }
}

// --- Run all fixes ---
console.log('\n🔧 Running AdSense compliance fixes...\n');

console.log('--- Removing fake aggregateRating from all pages ---');
filesToFixRating.forEach(fixFakeRating);

console.log('\n--- Fixing TikTok watermark language ---');
fixTikTokWatermarkLanguage();

console.log('\n--- Changing "No Watermark" badges to "Original Quality" site-wide ---');
fixWatermarkBadges();

console.log('\n--- Fixing sitemap.xml (adding lastmod) ---');
fixSitemap();

console.log('\n--- Noindexing extension.html ---');
fixExtensionPage();

console.log('\n--- Standardizing footer links across all pages ---');
fixFooters();

console.log('\n✅ All AdSense compliance fixes applied!\n');
