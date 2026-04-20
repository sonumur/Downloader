import os
import re

html_loading_snippet = """
            <div id="loadingContainer" class="loading-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p id="loadingText">Analyzing video...</p>
            </div>"""

def final_cleanup(filepath):
    print(f"Final cleanup of {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Highly aggressive removal of anything that looks like loadingContainer
    # We find '<div id="loadingContainer"' and skip to the next major block
    while '<div id="loadingContainer"' in content:
        start = content.find('<div id="loadingContainer"')
        # Find </p> and then the next </div>
        next_p = content.find('</p>', start)
        if next_p != -1:
            next_div = content.find('</div>', next_p)
            if next_div != -1:
                 content = content[:start] + content[next_div+6:]
            else:
                 content = content[:start] + content[start+100:] # fallback
        else:
            content = content[:start] + content[start+100:] # fallback

    # Re-insert cleanly after search-wrapper
    search_wrapper_end = '</div>\n            </div>'
    if search_wrapper_end in content:
        content = content.replace(search_wrapper_end, search_wrapper_end + html_loading_snippet)
    else:
        search_wrapper_pattern = r'(<div class="search-wrapper">.*?</div>\s*</div>)'
        content = re.sub(search_wrapper_pattern, r'\1' + html_loading_snippet, content, flags=re.DOTALL)

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
        final_cleanup(f)
