const { URL } = require('url');

function isSupportedUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const supported = [
      'tiktok.com', 'facebook.com', 'fb.watch', 'instagram.com',
      'twitter.com', 'x.com', 'cdninstagram.com', 'fbcdn.net',
      'twimg.com', 't.co', 'pinterest.com', 'pin.it'
    ];
    return supported.some(s => host.includes(s));
  } catch (e) { 
    console.error('URL Parsing Error:', e.message);
    return false; 
  }
}

const testUrl = 'https://www.instagram.com/p/DZKHK9aE4Nun6JjLBEfJzrASMjiwXEZ-sPh2Gw0/?img_index=1&igsh=MXVycGdkcmZoazlhYQ==';
console.log(`Testing URL: ${testUrl}`);
console.log(`Is Supported: ${isSupportedUrl(testUrl)}`);
console.log(`Hostname: ${new URL(testUrl).hostname}`);
