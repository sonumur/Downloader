import os
import re

def final_polish(filepath):
    print(f"Polishing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Correct section closing tags
    # Usually the hero-section is the first section.
    # We find '<section class="hero-section">' and its first closing </div> or </section>
    if '<section class="hero-section">' in content:
        start = content.find('<section class="hero-section">')
        # Find the next </div> or </section> that is at the same indentation level
        # Actually, simpler: find the </div> at the end of the hero-section block.
        # It's usually after the loadingContainer.
        if '<div id="loadingContainer"' in content:
             lc_start = content.find('<div id="loadingContainer"')
             # Skip the loadingContainer block (3 divs)
             pos = lc_start
             count = 0
             while count < 3:
                 pos = content.find('</div>', pos + 1)
                 count += 1
             # Now find the next closing tag
             next_tag = re.search(r'</div>|</section>', content[pos:])
             if next_tag:
                 tag_start = pos + next_tag.start()
                 content = content[:tag_start] + '</section>' + content[tag_start + len(next_tag.group(0)):]

    # 2. Cleanup empty lines and isolated comments
    content = re.sub(r'<!-- Trust Badges -->\s*</div>', '</div>', content)
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content) # reduce multiple newlines

    # 3. Ensure trust-container is after videoCard
    # If it's already there, leave it. If not, the previous script might have botched it.
    
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
        final_polish(f)
