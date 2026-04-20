import os
import re

standard_script = """
        const urlInput = document.getElementById('url');
        const downloadBtn = document.getElementById('downloadBtn');
        const statusEl = document.getElementById('status');
        const videoCard = document.getElementById('videoCard');
        const thumbnail = document.getElementById('thumbnail');
        const videoTitle = document.getElementById('videoTitle');
        const videoDuration = document.getElementById('videoDuration');
        const formatSelect = document.getElementById('formatSelect');
        const finalDownloadBtn = document.getElementById('finalDownloadBtn');

        let currentVideoData = null;

        function showStatus(msg, isError = false) {
            statusEl.textContent = msg;
            statusEl.className = isError ? 'status error' : 'status';
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

        async function fetchFormats() {
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

            // Populate formats
            formatSelect.innerHTML = '';
            const allFormats = [...data.formats.video, ...data.formats.audio];

            allFormats.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.dataset.type = f.type; // Store type
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

        async function startDownload() {
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
        }

        downloadBtn.addEventListener('click', fetchFormats);
        finalDownloadBtn.addEventListener('click', startDownload);

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fetchFormats();
        });
"""

html_loading_snippet = """
            <div id="loadingContainer" class="loading-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p id="loadingText">Analyzing video...</p>
            </div>"""

def clean_file(filepath):
    print(f"Surgical cleaning of {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. CLEAN HTML: Remove ALL traces of loadingContainer
    # We find the start and end of the loadingContainer block
    while 'id="loadingContainer"' in content:
        start_idx = content.find('<div id="loadingContainer"')
        # Find the 3rd closing </div> after this
        count = 0
        current_pos = start_idx
        while count < 3:
            end_div = content.find('</div>', current_pos)
            if end_div == -1: break
            current_pos = end_div + 6
            count += 1
        # Also clean up the <p> tag if it's there
        p_end = content.find('</p>', current_pos)
        if p_end != -1 and p_end < current_pos + 100:
             current_pos = p_end + 4
        
        # Finally find the LAST </div> of the container
        last_div = content.find('</div>', current_pos)
        content = content[:start_idx] + content[last_div+6:]

    # Re-insert HTML correctly
    search_wrapper_end = '</div>\n            </div>'
    if search_wrapper_end in content:
        content = content.replace(search_wrapper_end, search_wrapper_end + html_loading_snippet)
    else:
        # Fallback
        search_wrapper_pattern = r'(<div class="search-wrapper">.*?</div>\s*</div>)'
        content = re.sub(search_wrapper_pattern, r'\1' + html_loading_snippet, content, flags=re.DOTALL)

    # 2. CLEAN JS: Standardize the script tag
    # Find <script> ... </script> but ONLY the one that has urlInput
    scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
    for s in scripts:
        if 'urlInput' in s:
            content = content.replace(s, standard_script)
            break

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
