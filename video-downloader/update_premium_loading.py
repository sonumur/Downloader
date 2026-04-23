import os
import re

html_snippet = """            <!-- ANIMATION PROGRESS BAR -->
            <div id="loadingContainer" class="loading-container" style="display: none;">
                <div class="anim-bar-wrapper">
                    <div class="anim-bar-track">
                        <div id="animBarFill" class="anim-bar-fill"></div>
                    </div>
                    <div class="anim-bar-glow"></div>
                </div>
                <p id="loadingText">Analyzing Link...</p>
            </div>"""

js_globals = """        const animBarFill = document.getElementById('animBarFill');

        let currentVideoData = null;

        function setBar(pct) {
            if (animBarFill) animBarFill.style.width = pct + '%';
        }"""

new_fetch_formats = """        async function fetchFormats() {
            const url = urlInput.value.trim();
            if (!url) {
                showStatus('Please paste a video URL.', true);
                return;
            }

            try {
                const searchWrapper = document.querySelector('.search-wrapper');
                const loadingContainer = document.getElementById('loadingContainer');

                searchWrapper.classList.add('hidden');
                loadingContainer.style.display = 'block';
                videoCard.style.display = 'none';
                document.getElementById('loadingText').textContent = 'Analyzing Link...';
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
                document.getElementById('loadingContainer').style.display = 'none';
            } finally {
                downloadBtn.disabled = false;
            }
        }"""

new_start_download = """        async function startDownload() {
            const formatId = formatSelect.value;
            if (!formatId) {
                showStatus('Please select a format.', true);
                return;
            }

            try {
                document.querySelector('.search-wrapper').classList.add('hidden');
                document.getElementById('loadingText').textContent = 'Processing Download...';
                document.getElementById('loadingContainer').style.display = 'block';
                videoCard.style.display = 'none';
                showStatus('');
                finalDownloadBtn.disabled = true;
                setBar(30);

                const formatType = formatSelect.options[formatSelect.selectedIndex].dataset.type;

                const res = await fetch('/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: urlInput.value.trim(),
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
                    document.getElementById('loadingContainer').style.display = 'none';
                    showStatus('Download ready!');
                    window.location.href = data.video;
                }, 400);
            } catch (err) {
                document.getElementById('loadingContainer').style.display = 'none';
                showStatus('Download failed.', true);
            } finally {
                finalDownloadBtn.disabled = false;
            }
        }"""

def update_file(filepath):
    if 'index.html' in filepath:
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update HTML
    html_pattern = r'<div id="loadingContainer".*?</div>\s*</div>\s*<p id="loadingText">.*?</p>\s*</div>'
    if 'anim-bar-wrapper' not in content:
        content = re.sub(html_pattern, html_snippet, content, flags=re.DOTALL)

    # Update JS Globals
    global_pattern = r'let currentVideoData = null;'
    if 'function setBar' not in content:
        content = re.sub(global_pattern, js_globals, content)

    # Update fetchFormats
    fetch_pattern = r'async function fetchFormats\(\) \{.*?\}'
    content = re.sub(fetch_pattern, new_fetch_formats, content, flags=re.DOTALL)

    # Update startDownload
    download_pattern = r'async function startDownload\(\) \{.*?\}'
    content = re.sub(download_pattern, new_start_download, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

files = [
    'public/instagram-reels-downloader.html',
    'public/instagram-photo-downloader.html',
    'public/instagram-stories-downloader.html',
    'public/video-downloader.html',
    'public/audio-downloader.html',
    'public/instagram-downloader.html',
    'public/facebook-downloader.html',
    'public/tiktok-downloader.html',
    'public/twitter-downloader.html'
]

for f in files:
    if os.path.exists(f):
        update_file(f)
    else:
        print(f"File not found: {f}")
