import os
import re

html_loading_snippet = """
            <div id="loadingContainer" class="loading-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p id="loadingText">Analyzing video...</p>
            </div>"""

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

def normalize_page(filepath):
    print(f"Normalizing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. REMOVE ALL traces of loadingContainer
    while '<div id="loadingContainer"' in content:
        start = content.find('<div id="loadingContainer"')
        # Find </p> and then the next </div>
        next_p = content.find('</p>', start)
        if next_p != -1:
            next_div = content.find('</div>', next_p)
            if next_div != -1:
                 content = content[:start] + content[next_div+6:]
            else: content = content[:start] + content[start+100:]
        else: content = content[:start] + content[start+100:]

    # 2. REMOVE ALL traces of trust elements
    content = re.sub(r'<p class="terms">.*?</p>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div class="trust-badges">.*?</div>\s*</div>\s*</div>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div class="trust-badges">.*?</div>\s*</div>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div class="trust-container">.*?</div>\s*</div>\s*</div>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div class="trust-container">.*?</div>\s*</div>', '', content, flags=re.DOTALL)

    # 3. INSERT LOADING CONTAINER after search-wrapper
    search_wrapper_end = '</div>\n            </div>'
    if search_wrapper_end in content:
        content = content.replace(search_wrapper_end, search_wrapper_end + html_loading_snippet, 1)
    else:
        # Fallback for twitter
        content = re.sub(r'(<div class="search-wrapper">.*?</div>\s*</div>)', r'\1' + html_loading_snippet, content, flags=re.DOTALL, count=1)

    # 4. INSERT TRUST BLOCK after videoCard
    # We find videoCard closing div. 
    # It's usually <div id="videoCard" class="video-card"> ... </div>
    # But videoCard has nested divs. 
    if '<div id="videoCard" class="video-card">' in content:
        start_v = content.find('<div id="videoCard" class="video-card">')
        # Find the 6th closing </div> after this (rough estimate for videoCard structure)
        # Actually safer to look for the end of the videoCard section
        # The structure is: 
        # <div videoCard>
        #   <div card-content>
        #     <div thumb-wrapper><img></div>
        #     <div video-info>
        #        <h3></h3>
        #        <div duration></div>
        #        <div controls><div group><button></button><select></select></div></div>
        #     </div>
        #   </div>
        # </div>
        # Count divs:
        # 1: thumbnail-wrapper
        # 2: video-info
        # 3: video-duration
        # 4: download-controls
        # 5: download-group
        # 6: video-card-content
        # 7: video-card
        
        count = 0
        pos = start_v
        while count < 7:
            pos = content.find('</div>', pos + 1)
            if pos == -1: break
            count += 1
        
        if pos != -1:
            content = content[:pos+6] + master_trust_html + content[pos+6:]
        else:
            # Fallback
            content = content.replace('<div class="promo-card">', master_trust_html + '\n\n        <div class="promo-card">', 1)
    else:
        # Fallback
        if '<div class="promo-card">' in content:
             content = content.replace('<div class="promo-card">', master_trust_html + '\n\n        <div class="promo-card">', 1)

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
        normalize_page(f)
