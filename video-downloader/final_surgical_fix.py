import os
import re

def final_surgical_fix(filepath):
    print(f"Surgical fix in {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Temporarily remove ALL </section> tags that are misplaced
    # We want to identify the hero section area.
    # From <section class="hero-section"> to <div class="promo-card">
    
    parts = content.split('<section class="hero-section">')
    if len(parts) > 1:
        # We have the content after hero starts
        hero_and_rest = parts[1]
        promo_pos = hero_and_rest.find('<div class="promo-card">')
        if promo_pos != -1:
            hero_inner = hero_and_rest[:promo_pos]
            rest = hero_and_rest[promo_pos:]
            
            # Remove all </section> from hero_inner
            hero_inner = hero_inner.replace('</section>', '')
            
            # Reconstruct
            content = parts[0] + '<section class="hero-section">' + hero_inner + '</section>\n\n    ' + rest

    # 2. Cleanup double </section> at the very end of promo-card or after
    content = content.replace('</section>\n\n    </section>', '</section>')
    content = re.sub(r'</section>\s*</section>', '</section>', content)

    # 3. Specific fix for the promo-card inner error
    content = re.sub(r'<div class="promo-icon">\s*<img src="green-tick-icon-0.png" alt="Checkmark">\s*</div>\s*</section>', '<div class="promo-icon">\n                <img src="green-tick-icon-0.png" alt="Checkmark">\n            </div>', content)

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
        final_surgical_fix(f)
