import os
import re

# THE CLEAN JS BLOCKS
new_fetch_formats = """        async function fetchFormats() {
            const url = urlInput.value.trim();
            if (!url) {
                showStatus('Please paste a video URL.', true);
                return;
            }

            try {
                // UI Changes: Hide search, show loading
                const searchWrapper = document.querySelector('.search-wrapper');
                const loadingContainer = document.getElementById('loadingContainer');
                
                searchWrapper.classList.add('hidden');
                loadingContainer.style.display = 'block';
                videoCard.style.display = 'none';
                showStatus('');

                const res = await fetch('/formats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                const data = await res.json();
                if (!data.success) {
                    showStatus(data.message, true);
                    // Show search again on error
                    searchWrapper.classList.remove('hidden');
                    loadingContainer.style.display = 'none';
                    return;
                }

                currentVideoData = data;
                displayVideoInfo(data);
                
                // Hide loading, show results
                loadingContainer.style.display = 'none';
            } catch (err) {
                showStatus('Failed to connect to server.', true);
                // Show search again on error
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
                showStatus('Processing download... this may take a bit.');
                finalDownloadBtn.disabled = true;

                const formatId = formatSelect.value;
                const formatType = formatSelect.options[formatSelect.selectedIndex].dataset.type;

                const res = await fetch('/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: urlInput.value.trim(),
                        formatId: formatId,
                        type: formatType, // Pass type
                        videoId: currentVideoData?.videoId,
                        title: currentVideoData?.title,
                        photoUrl: currentVideoData?.formats?.video?.find(f => f.id === formatId)?.url || currentVideoData?.photoUrl
                    })
                });

                const data = await res.json();
                if (!data.success) {
                    showStatus(data.message, true);
                    return;
                }

                showStatus('Download ready!');
                // Trigger browser download
                window.location.href = data.video;
            } catch (err) {
                showStatus('Download failed.', true);
            } finally {
                finalDownloadBtn.disabled = false;
            }
        }"""

html_loading_snippet = """
            <div id="loadingContainer" class="loading-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p id="loadingText">Analyzing video...</p>
            </div>"""

def clean_file(filepath):
    print(f"Cleaning {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. CLEAN HTML: Remove ALL loadingContainers and insert exactly one
    content = re.sub(r'\s*<div id="loadingContainer".*?</div>\s*</div>\s*</div>', '', content, flags=re.DOTALL)
    # Re-insert after search-wrapper closing
    search_wrapper_pattern = r'(<div class="search-wrapper">.*?</div>\s*</div>)'
    content = re.sub(search_wrapper_pattern, r'\1' + html_loading_snippet, content, flags=re.DOTALL)

    # 2. CLEAN JS: Remove ALL fetchFormats and startDownload
    content = re.sub(r'async function fetchFormats\(\) \{.*?\}', '', content, flags=re.DOTALL)
    content = re.sub(r'async function startDownload\(\) \{.*?\}', '', content, flags=re.DOTALL)

    # 3. RE-INSERT JS: Find a spot. Before displayVideoInfo or start of script block
    # We find displayVideoInfo and insert before it
    if 'function displayVideoInfo' in content:
        content = content.replace('function displayVideoInfo', new_fetch_formats + "\n\n" + new_start_download + "\n\n        function displayVideoInfo")
    else:
        # Fallback to after formatTime
        content = content.replace('function formatTime', new_fetch_formats + "\n\n" + new_start_download + "\n\n        function formatTime")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

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
        clean_file(f)
    else:
        print(f"File not found: {f}")
