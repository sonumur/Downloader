const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = [
    'index.html',
    'instagram-downloader.html',
    'facebook-downloader.html',
    'tiktok-downloader.html',
    'twitter-downloader.html',
    'video-downloader.html',
    'audio-downloader.html',
    'instagram-reels-downloader.html',
    'instagram-photo-downloader.html',
    'instagram-stories-downloader.html'
];

const ogTags = (title, description, url) => `
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://downloader.online/logo.png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${url}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="https://downloader.online/logo.png">
`;

files.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Remove existing AdSense to reposition it
    const adsenseRegex = /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-2207409421620882"\s+crossorigin="anonymous"><\/script>/g;
    content = content.replace(adsenseRegex, '');

    // Replace favicon link
    content = content.replace(/<link rel="icon" type="image\/png" href="\/logo\.png\?v=3">/g, '<link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/logo.png">');
    content = content.replace(/<link rel="icon" type="image\/png" href="\/logo\.png">/g, '<link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/logo.png">');

    // Extract title and description for OG tags
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const descMatch = content.match(/<meta name="description"\s+content="(.*?)"/);
    
    const title = titleMatch ? titleMatch[1] : 'downloader.online';
    const desc = descMatch ? descMatch[1] : 'Free Online Video Downloader';
    const pageUrl = 'https://downloader.online/' + (file === 'index.html' ? '' : file.replace('.html', ''));

    const tags = ogTags(title, desc, pageUrl);
    const adsense = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2207409421620882" crossorigin="anonymous"></script>';

    // Inject OG tags and AdSense before </head>
    if (content.includes('</head>')) {
        // First check if it already has OG tags to avoid duplication
        if (!content.includes('property="og:title"')) {
            content = content.replace('</head>', `${tags}\n    ${adsense}\n</head>`);
        }
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
