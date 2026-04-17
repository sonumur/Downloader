const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Mocking server.js logic
const isWindows = process.platform === 'win32';
const ytDlpBin = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const localYtDlp = path.join(__dirname, 'yt-dlp.exe');
const ffmpeg = 'ffmpeg'; // dummy

async function testExtraction(url) {
  const args = [
    '--no-check-certificates',
    '--no-warnings',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--extractor-args', 'youtube:player_client=android,ios;player_skip=web,mweb',
    '--cookies-from-browser', 'firefox',
    '-F',
    url
  ];

  return new Promise((resolve) => {
    console.log(`Running yt-dlp with absolute path: ${localYtDlp}`);
    const child = spawn(localYtDlp, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => stdout += d.toString());
    child.stderr.on('data', (d) => stderr += d.toString());
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

testExtraction('https://youtu.be/4F0Hvcd5qNc').then(res => {
  console.log('Exit Code:', res.code);
  if (res.code === 0) {
    try {
      const data = JSON.parse(res.stdout);
      console.log('Success! Title:', data.title);
    } catch (e) {
      console.log('Success, but JSON parse failed');
    }
  } else {
    console.log('Failed. Stderr:', res.stderr.slice(0, 500));
  }
});
