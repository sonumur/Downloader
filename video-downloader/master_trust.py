import os
import re

master_trust_html = """
            <div class="trust-container">
                <p class="terms">By using our service you accept our <a href="/terms-of-service">Terms of Service</a>
                    and agree to use this tool only for content you own or have permission to download.</p>
                <div class="trust-badges">
                    <div class="badge-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span>Safe & Secure</span>
                    </div>
                    <div class="badge-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m5 12 5 5L20 7"></path>
                        </svg>
                        <span>No Watermark</span>
                    </div>
                    <div class="badge-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>HD Quality</span>
                    </div>
                </div>
            </div>"""

def update_page_trust(filepath):
    print(f"Standardizing trust elements in {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. REMOVE ANY EXISTING BUT INCORRECT TRACES
    # Remove terms
    content = re.sub(r'<p class="terms">.*?</p>', '', content, flags=re.DOTALL)
    # Remove badges (trying various patterns)
    content = re.sub(r'<div class="trust-badges">.*?</div>\s*</div>\s*</div>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div class="trust-badges">.*?</div>\s*</div>', '', content, flags=re.DOTALL) # simple
    
    # Remove old trust-containers if any
    content = re.sub(r'<div class="trust-container">.*?</div>\s*</div>\s*</div>', '', content, flags=re.DOTALL)

    # 2. Re-insert after videoCard
    video_card_end_pattern = r'(<div id="videoCard" class="video-card">.*?</div>\s*</div>)'
    if re.search(video_card_end_pattern, content, re.DOTALL):
        content = re.sub(video_card_end_pattern, r'\1' + master_trust_html, content, flags=re.DOTALL)
    else:
        # Fallback: after search-wrapper or hero-section end
        if '</section>' in content:
             content = content.replace('</section>', '</section>' + master_trust_html, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    'public/index.html',
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
        update_page_trust(f)
