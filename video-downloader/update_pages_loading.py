import os
import re

html_snippet = """
            <div id="loadingContainer" class="loading-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p id="loadingText">Analyzing video...</p>
            </div>"""

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

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False
    # Update HTML if missing
    if 'id="loadingContainer"' not in content:
        # Target the closing </div> of search-wrapper
        # We look for <div class="search-wrapper"> ... </div> </div>
        search_wrapper_pattern = r'(<div class="search-wrapper">.*?</div>\s*</div>)'
        new_content = re.sub(search_wrapper_pattern, r'\1' + html_snippet, content, flags=re.DOTALL)
        if new_content != content:
            content = new_content
            changed = True
            print(f"Updated HTML in {filepath}")
        else:
            print(f"Fails to find HTML target in {filepath}")

    # Update JS if old version exists
    if 'showStatus(\'Analyzing video...\');' in content or 'showStatus("Analyzing video...");' in content or 'showStatus(\'Analyzing video...\')' in content:
        fetch_pattern = r'async function fetchFormats\(\) \{.*?\}'
        new_content = re.sub(fetch_pattern, new_fetch_formats, content, flags=re.DOTALL)
        if new_content != content:
            content = new_content
            changed = True
            print(f"Updated JS in {filepath}")
    else:
        print(f"JS already updated or target mismatch in {filepath}")

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f"No changes needed for {filepath}")

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
