import os
import re

def move_trust_elements(filepath):
    print(f"Moving trust elements in {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Extract the elements
    terms_pattern = r'<p class="terms">.*?</p>'
    badges_pattern = r'<div class="trust-badges">.*?</div>\s*</div>\s*</div>'
    
    terms_match = re.search(terms_pattern, content, re.DOTALL)
    badges_match = re.search(badges_pattern, content, re.DOTALL)
    
    if not terms_match or not badges_match:
        print(f"  Missing elements in {filepath}")
        return

    terms_html = terms_match.group(0)
    badges_html = badges_match.group(0)

    # 2. Remove them
    content = content.replace(terms_html, '')
    content = content.replace(badges_html, '')

    # 3. Wrap in trust-container
    new_html = f'\n            <div class="trust-container">\n                {terms_html.strip()}\n                {badges_html.strip()}\n            </div>'

    # 4. Find videoCard and insert after it
    # <div id="videoCard" class="video-card">...</div>
    # Usually it ends with many closing divs. We find the one that corresponds to it.
    video_card_end_pattern = r'(<div id="videoCard" class="video-card">.*?</div>\s*</div>\s*</div>)'
    if re.search(video_card_end_pattern, content, re.DOTALL):
        content = re.sub(video_card_end_pattern, r'\1' + new_html, content, flags=re.DOTALL)
    else:
        # Fallback: find video-info end or promo-card start
        if '<div class="promo-card">' in content:
            content = content.replace('<div class="promo-card">', new_html + '\n\n        <div class="promo-card">')
        else:
            print(f"  Could not find insertion point for {filepath}")

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
        move_trust_elements(f)
    else:
        print(f"File not found: {f}")
