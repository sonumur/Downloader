import os
import re

DATA = {
    'index.html': {
        'title': 'Free Online Video Downloader',
        'subtitle': 'Online downloader.online downloader app platform allows you to download videos instantly from Instagram, TikTok, Facebook, Twitter, and more in HD quality.',
        'placeholder': 'Paste your video link here',
        'has_contact': False,
        'platform': 'Video',
        'platform_full': 'video',
        'use_visual_guide': True # ADDED FOR HOMEPAGE
    },
    'twitter-downloader.html': {
        'title': 'Twitter / X Video Downloader',
        'subtitle': 'The fastest way to download Twitter (X) videos and GIFs in HD quality. No watermark.',
        'placeholder': 'Paste Twitter link here',
        'has_contact': False,
        'platform': 'Twitter',
        'platform_full': 'Twitter (X) app or website',
        'use_visual_guide': False
    },
    'facebook-downloader.html': {
        'title': 'Facebook Video Downloader',
        'subtitle': 'Download Facebook videos online in high quality (MP4) for free. Simple and fast FB video saver.',
        'placeholder': 'Paste Facebook video link here',
        'has_contact': False,
        'platform': 'Facebook',
        'platform_full': 'Facebook app or website',
        'use_visual_guide': False
    },
    'tiktok-downloader.html': {
        'title': 'TikTok Video Downloader',
        'subtitle': 'Download TikTok videos without watermark for free. Save TikTok MP4 videos online effortlessly.',
        'placeholder': 'Paste TikTok link here',
        'has_contact': False,
        'platform': 'TikTok',
        'platform_full': 'TikTok app',
        'use_visual_guide': False
    },
    'instagram-downloader.html': {
        'title': 'Instagram Video Downloader',
        'subtitle': 'Download Instagram videos, Reels, and photos for free. Save IG content in high quality online.',
        'placeholder': 'Paste Instagram link here',
        'has_contact': False,
        'platform': 'Instagram',
        'platform_full': 'Instagram app',
        'use_visual_guide': False
    },
    'instagram-reels-downloader.html': {
        'title': 'Instagram Reels Downloader',
        'subtitle': 'Fast and free Instagram Reels downloader. Save IG Reels to your device in 1080p high quality.',
        'placeholder': 'Paste Instagram Reel link here',
        'has_contact': False,
        'platform': 'Reels',
        'platform_full': 'Instagram app',
        'use_visual_guide': True 
    },
    'instagram-photo-downloader.html': {
        'title': 'Instagram Photo Downloader',
        'subtitle': 'Save Instagram photos and images online for free. Download IG posts in high resolution.',
        'placeholder': 'Paste Instagram link here',
        'has_contact': False,
        'platform': 'Image',
        'platform_full': 'Instagram app',
        'use_visual_guide': False
    },
    'instagram-stories-downloader.html': {
        'title': 'Instagram Story Downloader',
        'subtitle': 'Download Instagram stories and highlights anonymously. Save IG stories as videos or photos.',
        'placeholder': 'Paste Instagram link here',
        'has_contact': False,
        'platform': 'Story',
        'platform_full': 'Instagram app',
        'use_visual_guide': False
    },
    'video-downloader.html': {
        'title': 'Free Video Downloader Online',
        'subtitle': 'Download videos from any popular platform online for free. Support for TikTok, FB, Twitter, and more.',
        'placeholder': 'Paste your video link here',
        'has_contact': False,
        'platform': 'Video',
        'platform_full': 'platform',
        'use_visual_guide': False
    },
    'audio-downloader.html': {
        'title': 'Video to MP3 Converter',
        'subtitle': 'Convert and download online videos to high-quality MP3 audio files for free. Fast and secure.',
        'placeholder': 'Paste video link here',
        'has_contact': False,
        'platform': 'Video',
        'platform_full': 'video',
        'use_visual_guide': False
    }
}

TEMPLATE_HERO = """
        <section class="hero-section">
            <h1 class="hero-title">{title}</h1>
            <p class="hero-subtitle">{subtitle}</p>

            <!-- Feature Icons -->
            <div class="feature-icons-container">
                <a href="/instagram-reels-downloader" class="feature-item">
                    <div class="icon-box icon-reels">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                            <line x1="7" y1="2" x2="7" y2="22"></line>
                            <line x1="17" y1="2" x2="17" y2="22"></line>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <line x1="2" y1="7" x2="7" y2="7"></line>
                            <line x1="2" y1="17" x2="7" y2="17"></line>
                            <line x1="17" y1="17" x2="22" y2="17"></line>
                            <line x1="17" y1="7" x2="22" y2="7"></line>
                        </svg>
                    </div>
                    <span class="feature-label">Reels</span>
                </a>
                <a href="/video-downloader" class="feature-item">
                    <div class="icon-box icon-video">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 7l-7 5 7 5V7z"></path>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                    </div>
                    <span class="feature-label">Video</span>
                </a>
                <a href="/audio-downloader" class="feature-item">
                    <div class="icon-box icon-audio">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                    </div>
                    <span class="feature-label">Audio</span>
                </a>
                <a href="/instagram-photo-downloader" class="feature-item">
                    <div class="icon-box icon-photo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                    <span class="feature-label">Photo</span>
                </a>
                <a href="/instagram-stories-downloader" class="feature-item">
                    <div class="icon-box icon-stories">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polygon points="10 8 16 12 10 16 10 8"></polygon>
                        </svg>
                    </div>
                    <span class="feature-label">Stories</span>
                </a>
                <a href="/facebook-downloader" class="feature-item">
                    <div class="icon-box icon-fb">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                    </div>
                    <span class="feature-label">fb video</span>
                </a>
                <a href="/tiktok-downloader" class="feature-item">
                    <div class="icon-box icon-tiktok">
                        <svg viewBox="0 0 16 16" fill="currentColor" stroke="none">
                            <path
                                d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" />
                        </svg>
                    </div>
                    <span class="feature-label">TikTok</span>
                </a>
                <a href="/twitter-downloader" class="feature-item">
                    <div class="icon-box icon-twitter">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 4l11.733 16h4.267l-11.733-16z"></path>
                            <path d="M4 20l6.768-6.768m2.464-2.464l6.768-6.768"></path>
                        </svg>
                    </div>
                    <span class="feature-label">Twitter / X</span>
                </a>

            </div>

            <div class="search-wrapper">
                <div class="search-box">
                    <input type="text" id="url" placeholder="{placeholder}" autofocus>
                    <button class="btn-primary" id="downloadBtn">Download</button>
                </div>
            </div>
            <div id="loadingContainer" class="loading-container" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p id="loadingText">Analyzing Link...</p>
            </div>

            <!-- Status Message -->
            <div id="status" class="status"></div>

            <!-- Video metadata Card -->
            <div id="videoCard" class="video-card" style="display: none;">
                <div class="video-card-content">
                    <div class="thumbnail-wrapper">
                        <img id="thumbnail" src="" alt="Thumbnail" style="display: none;">
                    </div>
                    <div class="video-info">
                        <h3 id="videoTitle" class="video-title"></h3>
                        <div id="videoDuration" class="video-duration"></div>
                        <div class="download-controls">
                            <div class="download-group">
                                <button id="finalDownloadBtn" class="btn-download">Download</button>
                                <select id="formatSelect" class="format-select">
                                    <option value="">Loading formats...</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
            </div>
        </section>

        <!-- Promo Area -->
        <div class="promo-card">
            <div class="promo-icon">
                <img src="green-tick-icon-0.png" alt="Checkmark">
            </div>
            <div class="promo-text">
                <h4>downloader.online Features</h4>
                <p>100% Free, Secure, and fast high quality video ripper.</p>
            </div>
        </div>
"""

TEMPLATE_STEPS = """
                <h2>How to download online videos?</h2>
                <div class="steps-grid">
                    <div class="step-card">
                        <div class="step-num">1</div>
                        <h3>Copy the {platform} URL</h3>
                        <p>Copy the link from the {platform_full} (Share > Copy Link).</p>
                    </div>
                    <div class="step-card">
                        <div class="step-num">2</div>
                        <h3>Paste the Link</h3>
                        <p>Paste the copied link into our search box above and click "Download".</p>
                    </div>
                    <div class="step-card">
                        <div class="step-num">3</div>
                        <h3>Save the Content</h3>
                        <p>Choose your preferred quality format (MP4 or MP3) and the download will start!</p>
                    </div>
                </div>

                <div class="features-divider"></div>
"""

TEMPLATE_VISUAL_GUIDE_REELS = """
                <h2>How to download Instagram Reels?</h2>
                <div class="visual-guide">
                    <div class="guide-step">
                        <div class="guide-info">
                            <div class="step-badge">Step 1</div>
                            <h3>Copy the Reels URL</h3>
                            <p>Open the Instagram app and find the Reel you want to download. Tap on the <strong>Share</strong> button and select <strong>Copy Link</strong> to save the URL to your clipboard.</p>
                        </div>
                        <div class="guide-image">
                            <img src="reels1.png" alt="Step 1: Copy Reels Link">
                        </div>
                    </div>

                    <div class="guide-step reverse">
                        <div class="guide-info">
                            <div class="step-badge">Step 2</div>
                            <h3>Paste the Link</h3>
                            <p>Head over to <strong>downloader.online</strong> and paste the copied link into the search bar at the top of the page. Click the <strong>Download</strong> button to start processing.</p>
                        </div>
                        <div class="guide-image">
                            <img src="reels2.png" alt="Step 2: Paste Link">
                        </div>
                    </div>

                    <div class="guide-step">
                        <div class="guide-info">
                            <div class="step-badge">Step 3</div>
                            <h3>Save & Download</h3>
                            <p>Once the processing is complete, select your desired resolution (e.g., 1080p HD) and click the final <strong>Download</strong> button to save the Reel to your device.</p>
                        </div>
                        <div class="guide-image">
                            <img src="reels3.png" alt="Step 3: Save Reel">
                        </div>
                    </div>
                </div>

                <div class="features-divider"></div>
"""

# GENERIC VERSION FOR HOMEPAGE
TEMPLATE_VISUAL_GUIDE_GENERIC = """
                <h2>How to download online videos?</h2>
                <div class="visual-guide">
                    <div class="guide-step">
                        <div class="guide-info">
                            <div class="step-badge">Step 1</div>
                            <h3>Copy the Video URL</h3>
                            <p>Browse your favorite social media platforms (Instagram, TikTok, FB, or Twitter) and find the content you love. Tap <strong>Share</strong> and then <strong>Copy Link</strong>.</p>
                        </div>
                        <div class="guide-image">
                            <img src="reels1.png" alt="Step 1: Copy Link">
                        </div>
                    </div>

                    <div class="guide-step reverse">
                        <div class="guide-info">
                            <div class="step-badge">Step 2</div>
                            <h3>Paste the Link</h3>
                            <p>Head to <strong>downloader.online</strong> and paste your link into the input field at the top. Click <strong>Download</strong> and wait for our high-speed engine to analyze the content.</p>
                        </div>
                        <div class="guide-image">
                            <img src="reels2.png" alt="Step 2: Paste Link">
                        </div>
                    </div>

                    <div class="guide-step">
                        <div class="guide-info">
                            <div class="step-badge">Step 3</div>
                            <h3>Choose Format & Save</h3>
                            <p>Choose from multiple qualities (like 720p, 1080p, or 4K) and click the download button. Your file will be saved instantly with **No Watermarks**.</p>
                        </div>
                        <div class="guide-image">
                            <img src="reels3.png" alt="Step 3: Save Content">
                        </div>
                    </div>
                </div>

                <div class="features-divider"></div>
"""

TEMPLATE_INFO_START = """
        <section class="info-section">
            <div class="info-content">
"""

TEMPLATE_CONTACT = """
        <section id="contact" style="background:#f9fafb; padding:4rem 1rem;">
            <div style="max-width:600px; margin:0 auto; padding:2rem; background:white; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="text-align:center; margin-bottom:2rem;">
                    <h2 style="font-size:1.875rem; color:#111827; margin-bottom:0.5rem;">Contact Us</h2>
                    <p style="color:#6b7280;">Have a question or feedback? We'd love to hear from you.</p>
                </div>
                <form id="contactForm">
                    <div style="margin-bottom:1rem;">
                        <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.4rem; color:#374151;">Name <span style="color:#dc2626;">*</span></label>
                        <input type="text" id="contactName" placeholder="Your name" required style="width:100%; padding:0.65rem 1rem; border:1px solid #d1d5db; border-radius:8px; font-size:0.95rem; outline:none; font-family:inherit; box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1rem;">
                        <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.4rem; color:#374151;">Email <span style="color:#dc2626;">*</span></label>
                        <input type="email" id="contactEmail" placeholder="your@email.com" required style="width:100%; padding:0.65rem 1rem; border:1px solid #d1d5db; border-radius:8px; font-size:0.95rem; outline:none; font-family:inherit; box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1rem;">
                        <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.4rem; color:#374151;">Subject</label>
                        <input type="text" id="contactSubject" placeholder="What is this about?" style="width:100%; padding:0.65rem 1rem; border:1px solid #d1d5db; border-radius:8px; font-size:0.95rem; outline:none; font-family:inherit; box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.4rem; color:#374151;">Message <span style="color:#dc2626;">*</span></label>
                        <textarea id="contactMessage" placeholder="Describe your question or issue..." required rows="5" style="width:100%; padding:0.65rem 1rem; border:1px solid #d1d5db; border-radius:8px; font-size:0.95rem; outline:none; font-family:inherit; resize:vertical; box-sizing:border-box;"></textarea>
                    </div>
                    <button type="submit" id="contactSubmitBtn" style="width:100%; background:#000; color:white; border:none; padding:0.875rem; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; transition:background 0.2s;">Send Message</button>
                </form>
            </div>
        </section>
"""

def rebuild_page(filename):
    print(f"Rebuilding {filename}...")
    filepath = os.path.join('public', filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} (not found)")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Extract Top (until <main>)
    top_match = re.search(r'([\s\S]*?<main class="main-content">)', content)
    if not top_match: return
    top = top_match.group(1)

    # 2. Extract Bottom (from first script tag after content)
    bottom_match = re.search(r'(<script>[\s\S]*?</html>)', content)
    if not bottom_match:
         bottom_match = re.search(r'(<footer[\s\S]*?</html>)', content)
    
    if not bottom_match: return
    bottom = bottom_match.group(1)

    # 3. Extract SEO Content
    seo_content_match = re.search(r'<h2>The Best([\s\S]*?)</div>\s*</div>\s*</section>', content)
    if not seo_content_match:
        seo_content_match = re.search(r'<h2>The Best([\s\S]*?)</div>\s*</div>', content)
    
    if not seo_content_match:
        seo_content_match = re.search(r'<h2>The Best([\s\S]*?)</section>', content)

    if seo_content_match:
        seo_inner = "<h2>The Best" + seo_content_match.group(1).rstrip()
        seo_inner = re.sub(r'</div>\s*</div>$', '', seo_inner)
        seo_inner = re.sub(r'</div>\s*$', '', seo_inner)
    else:
        seo_inner_match = re.search(r'<h2>(?!How to download)([\s\S]*?)</div>\s*</div>', content)
        seo_inner = "<h2>" + seo_inner_match.group(1) if seo_inner_match else "<!-- SEO Content Missing -->"

    # 5. Assemble
    if filename == 'instagram-reels-downloader.html':
        steps = TEMPLATE_VISUAL_GUIDE_REELS
    elif DATA[filename].get('use_visual_guide'):
        steps = TEMPLATE_VISUAL_GUIDE_GENERIC
    else:
        steps = TEMPLATE_STEPS.format(
            platform=DATA[filename]['platform'],
            platform_full=DATA[filename]['platform_full']
        )
    
    info_section = TEMPLATE_INFO_START + steps + '<div class="seo-content">' + seo_inner + '</div>' + "\n            </div>\n        </section>"
    
    hero = TEMPLATE_HERO.format(
        title=DATA[filename]['title'],
        subtitle=DATA[filename]['subtitle'],
        placeholder=DATA[filename]['placeholder']
    )
    
    contact = TEMPLATE_CONTACT if DATA[filename]['has_contact'] else ""
    
    footer_part = """
    <footer class="footer">
        <div class="footer-content">
            <p>&copy; 2026 downloader.online. All rights reserved.</p>
            <div class="footer-links">
                <a href="/site-map">Site Map</a>
                <a href="/dmca">DMCA</a>
                <a href="/privacy-policy">Privacy Policy</a>
                <a href="/terms-of-service">Terms of Service</a>
            </div>
        </div>
    </footer>
    """
    
    new_content = top + hero + info_section + contact + "\n    </main>\n\n" + footer_part + "\n\n" + bottom
    new_content = new_content.replace('</main>\n\n</main>', '</main>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

for filename in DATA.keys():
    rebuild_page(filename)
print("All pages rebuilt. Homepage now uses the premium Visual Guide.")
