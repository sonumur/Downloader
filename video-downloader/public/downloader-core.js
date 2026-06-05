/**
 * downloader-core.js
 * Shared logic for the video downloader platform
 */

const statusEl = document.getElementById('status');
const videoCard = document.getElementById('videoCard');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoDuration = document.getElementById('videoDuration');
const formatSelect = document.getElementById('formatSelect');
const finalDownloadBtn = document.getElementById('finalDownloadBtn');
const animBarFill = document.getElementById('animBarFill');
const loadingContainer = document.getElementById('loadingContainer');
const loadingText = document.getElementById('loadingText');

let currentVideoData = null;

function setBar(pct) {
    if (animBarFill) animBarFill.style.width = pct + '%';
}

function showStatus(msg, isError = false) {
    if (!msg) {
        statusEl.style.display = 'none';
        return;
    }
    statusEl.textContent = msg;
    statusEl.className = isError ? 'status error' : 'status';
    statusEl.style.display = 'block';
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
        .filter((v, i) => v > 0 || i > 0)
        .map(v => v.toString().padStart(2, '0'))
        .join(':');
}

function displayVideoInfo(data) {
    if (data.thumbnail) {
        thumbnail.src = data.thumbnail;
        thumbnail.style.display = 'block';
    } else {
        thumbnail.style.display = 'none';
    }
    videoTitle.textContent = data.title || "Video Download";
    videoDuration.textContent = data.duration ? formatTime(data.duration) : '';

    formatSelect.innerHTML = '';
    const allFormats = [...data.formats.video, ...data.formats.audio];

    allFormats.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.dataset.type = f.type;
        let typeLabel = 'MP4';
        if (f.type === 'audio') typeLabel = 'MP3';
        if (f.type === 'photo') typeLabel = 'PHOTO';

        const qualityLabel = f.quality || f.resolution || 'Unknown';
        const sizeLabel = f.size ? ` (${(f.size / (1024 * 1024)).toFixed(1)}MB)` : '';
        opt.textContent = `${typeLabel} ${qualityLabel} ${f.note || ''}${sizeLabel}`;
        formatSelect.appendChild(opt);
    });

    videoCard.style.display = 'block';
}

async function fetchFormats(url) {
    if (!url) {
        showStatus('Please paste a video URL.', true);
        return;
    }

    try {
        const searchWrapper = document.querySelector('.search-wrapper');
        searchWrapper.classList.add('hidden');
        loadingContainer.style.display = 'block';
        videoCard.style.display = 'none';
        loadingText.textContent = 'Analyzing Link...';
        showStatus('');
        setBar(0);
        setTimeout(() => setBar(65), 100);

        const res = await fetch('/formats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await res.json();
        setBar(100);

        if (!data.success) {
            showStatus(data.message, true);
            searchWrapper.classList.remove('hidden');
            loadingContainer.style.display = 'none';
            return;
        }

        currentVideoData = data;
        displayVideoInfo(data);

        setTimeout(() => { loadingContainer.style.display = 'none'; }, 400);
    } catch (err) {
        showStatus('Failed to connect to server.', true);
        document.querySelector('.search-wrapper').classList.remove('hidden');
        loadingContainer.style.display = 'none';
    }
}

async function startDownload(url, formatId, formatType) {
    if (!formatId) {
        showStatus('Please select a format.', true);
        return;
    }

    try {
        document.querySelector('.search-wrapper').classList.add('hidden');
        loadingText.textContent = 'Processing Download...';
        loadingContainer.style.display = 'block';
        videoCard.style.display = 'none';
        showStatus('');
        finalDownloadBtn.disabled = true;
        setBar(30);

        const res = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                formatId: formatId,
                type: formatType,
                videoId: currentVideoData?.videoId,
                title: currentVideoData?.title,
                photoUrl: currentVideoData?.formats?.video?.find(f => f.id === formatId)?.url || currentVideoData?.photoUrl
            })
        });

        const data = await res.json();
        setBar(100);

        if (!data.success) {
            showStatus(data.message, true);
            return;
        }

        setTimeout(() => {
            loadingContainer.style.display = 'none';
            showStatus('Download ready!');
            window.location.href = data.video;
        }, 400);
    } catch (err) {
        loadingContainer.style.display = 'none';
        showStatus('Download failed.', true);
    } finally {
        finalDownloadBtn.disabled = false;
    }
}

// Global Event Listeners initialization
function initDownloader() {
    const urlInput = document.getElementById('url');
    const downloadBtn = document.getElementById('downloadBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => fetchFormats(urlInput.value.trim()));
    }

    if (finalDownloadBtn) {
        finalDownloadBtn.addEventListener('click', () => {
            const formatId = formatSelect.value;
            const formatType = formatSelect.options[formatSelect.selectedIndex].dataset.type;
            startDownload(urlInput.value.trim(), formatId, formatType);
        });
    }

    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fetchFormats(urlInput.value.trim());
        });
    }
}

document.addEventListener('DOMContentLoaded', initDownloader);
