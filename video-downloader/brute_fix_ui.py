import os
import re

def fix_misplaced_section(filepath):
    print(f"Fixing misplaced section in {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. REMOVE the misplaced </section> (especially if it's inside promo-card)
    # Pattern: </section> followed shortly by <div class="promo-text"> or similar
    content = re.sub(r'</section>\s*<div class="promo-text">', '<div class="promo-text">', content)
    
    # Also handle the specific case I saw in index.html
    # </div>\s*</section>\s*<div class="promo-text">
    content = re.sub(r'</div>\s*</section>\s*<div class="promo-text">', '</div>\n            <div class="promo-text">', content)

    # 2. Add the </section> in the CORRECT place IF IT'S MISSING
    # It should be after trust-container's closing </div>
    # trust-container block: <div class="trust-container">...</div>
    if '<div class="trust-container">' in content and '</section>' not in content.split('<div class="trust-container">')[1][:500]:
         # Find the trust-container closing tag
         # We'll just look for trust-badges closing </div> followed by one more closing </div>
         badges_end = '</div>\n            </div>'
         if badges_end in content:
             # This is tricky if there are multiple. 
             # We want the one that is inside trust-container.
             content = content.replace(badges_end, badges_end + '\n    </section>', 1)

    # 3. Final cleanup to ensure NO DUPLICATE </section> before info-section
    # The hero-section is at the top. The info-section is at the bottom.
    # We only want ONE </section> between them.
    sections = content.split('<section class="hero-section">')
    if len(sections) > 1:
        hero_content = sections[1]
        halfway = hero_content.find('<section class="info-section">')
        if halfway != -1:
            pre_info = hero_content[:halfway]
            # Replace all </section> with empty, except the last one?
            # Or just ensure it's closed correctly.
            pass

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Actually, let's use a simpler and safer approach:
# Replace the whole </div>...</div> sequence with a known good one.

def brute_force_fix(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Remove ALL </section> tags from hero area
    # We define hero area as everything from <h1 to promo-card
    if 'hero-title' in content and 'promo-card' in content:
        start = content.find('hero-title')
        end = content.find('promo-card')
        hero_part = content[start:end]
        hero_part = hero_part.replace('</section>', '')
        content = content[:start] + hero_part + content[end:]
        
    # 2. Add </section> exactly before promo-card
    if '<div class="promo-card">' in content:
        content = content.replace('<div class="promo-card">', '</section>\n\n    <div class="promo-card">', 1)
    
    # 3. Handle duplicated </section> if any
    content = content.replace('</section>\n\n    </section>', '</section>')
    
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
        brute_force_fix(f)
