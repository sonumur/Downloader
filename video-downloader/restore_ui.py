import os
import re

def restore_hero_structure(filepath):
    print(f"Restoring structure in {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. FIND sections and blocks
    # We want to move </section> from where it is to after the trust-container
    
    # Remove the misplaced closing section tag if it's right after loadingContainer
    content = re.sub(r'Analyzing video\.\.\.</p>\s*</section>', 'Analyzing video...</p>', content)
    
    # Also handle cases where I might have left it after a div
    content = re.sub(r'</div>\s*</section>\s*</div>\s*</div>', '</div>\n            </div>\n        </div>', content)

    # 2. FIND trust-container and insert </section> after it
    if '<div class="trust-container">' in content:
        # Find the end of trust-container
        # It has trust-badges inside
        pos = content.find('</div>\n            </div>') # end of badges then container
        # Actually safer: find the last </div> of the trust-container block
        # The structure is:
        # <div trust-container>
        #   <p></p>
        #   <div badges>
        #     <div badge-item></div> x 3
        #   </div>
        # </div>
        # That's 5 inner </div> tags.
        
        start_tc = content.find('<div class="trust-container">')
        count = 0
        p = start_tc
        while count < 6: # trust-badges(1) + 3*badge-item(3) + 1*badges-end(1) + 1*container-end(1) = 6? 
             # No, badge-item has 0 </div> inside because they use SVG. 
             # Wait, badge-item is <div class="badge-item">...</div>. So it has one </div>.
             # Total </div>: 3 (badge-items) + 1 (trust-badges) + 1 (trust-container) = 5.
             p = content.find('</div>', p + 1)
             if p == -1: break
             count += 1
        
        if p != -1:
             # Insert </section> after the closing </div> of trust-container
             content = content[:p+6] + '\n        </section>' + content[p+6:]

    # 3. CLEANUP: Ensure only ONE hero-section is closed
    # If there are multiple </section> tags before the info-section, fix them.
    # Actually, the above should be enough if the initial state was what I saw.

    # 4. RESTORE promo-card if missing (especially in index)
    if '<!-- Promo Area -->' in content and '<div class="promo-card">' not in content:
        promo_html = """
        <div class="promo-card">
            <div class="promo-icon">
                <img src="green-tick-icon-0.png" alt="Checkmark">
            </div>
            <div class="promo-text">
                <h4>downloader.online Features</h4>
                <p>100% Free, Secure, and fast high quality video ripper.</p>
            </div>
        </div>"""
        content = content.replace('<!-- Promo Area -->', '<!-- Promo Area -->' + promo_html)

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
        restore_hero_structure(f)
