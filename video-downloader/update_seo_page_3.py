import os
import re

pages_content = {
    "audio-downloader.html": """<div class="seo-content">
                    <h2>Premium Online Audio & MP3 Downloader</h2>
                    <p>Have you ever watched a music video, an inspiring podcast clip, or a funny meme and thought, "I just want to save the audio from this"? Our robust <strong>Audio Downloader</strong> allows you to perfectly strip and extract the highest-quality MP3 file directly from almost any video on social media.</p>
                    
                    <h2>How the MP3 Converter Works</h2>
                    <p>Unlike other websites that poorly re-encode MP3s causing them to lose quality and sound muddy, we directly rip the source Audio Codec. We deliver the absolute best bitrate (up to 320kbps depending on source quality) straight to your device.</p>
                    <ul>
                        <li><strong>Universal Social Media Support:</strong> Extract MP3 audio from YouTube-like VODs, TikTok sounds, Instagram Reel soundtracks, Facebook meme clips, and Twitter (X) video clips interchangeably natively.</li>
                        <li><strong>Automatic Video-to-Audio Mapping:</strong> Simply paste a standard video link. You don't need a special link format. Paste the video link above, select MP3 from the dropdown format menu, and you are done.</li>
                        <li><strong>Extremely Rapid Processing:</strong> Audio files are significantly smaller than videos. By separating the MP3 from the massive video streams on our 10Gbps backend servers, your file is delivered virtually instantaneously.</li>
                    </ul>

                    <h2>Steps to Extract Audio to MP3</h2>
                    <ol>
                        <li>Copy the URL of the video that contains the audio you wish to save.</li>
                        <li>Navigate to our Audio Downloader page and securely paste the URL into our search bar.</li>
                        <li>When the system analyzes your URL, find the "Audio" options from the format dropdown menu. Pick the MP3 format and click the primary "Download" button to save it!</li>
                    </ol>

                    <h2>Frequently Asked Questions</h2>
                    <h3>What bitrate are the MP3 files downloaded in?</h3>
                    <p>The audio bitrate entirely depends on the original video's upload quality. If a TikTok creator uploaded a sound using extremely compressed 64kbps audio, we will supply you with that 64kbps file. If an Instagram Reel has pristine 320kbps stereo sound, we extract and deliver exactly that 320kbps fidelity.</p>

                    <h3>Do you limit the length of the audio I can download?</h3>
                    <p>Mostly, no. Our service is designed to rip standard social media posts (which are typically under 15 minutes). We don't artificially restrict the length, provided our servers can process the media quickly enough.</p>
                </div>""",

    "video-downloader.html": """<div class="seo-content">
                    <h2>All-In-One Universal Video Downloader</h2>
                    <p>If you're tired of switching between five different apps just to save media from various social networks, you've come to the right place. Our <strong>Universal Video Downloader</strong> consolidates everything into a single, powerhouse engine. Save videos from over a dozen platforms quickly, securely, and completely ad-free.</p>
                    
                    <h2>A True Vidmate & Vidsaved Alternative</h2>
                    <p>Historically, finding a fast universal downloader meant installing sketchy Android APK apps. We've eliminated that necessity.</p>
                    <ul>
                        <li><strong>No Downloads or Extensions:</strong> Your web browser is the only tool you need.</li>
                        <li><strong>Formats for Every Use Case:</strong> We support extracting native formats, whether that's an MP4 container, an MP3 audio track, a GIF looping image, or a high-res JPEG.</li>
                        <li><strong>Maximum Resolution Enabled:</strong> You are guaranteed the highest resolution available. Download in majestic 4K if the source video allows it. No throttling, no compression.</li>
                    </ul>

                    <h2>Steps to Universal Downloads</h2>
                    <ol>
                        <li>Find any video link on platforms like Instagram, Facebook, TikTok, Twitter/X, Dailymotion, or Vimeo. Copy the link.</li>
                        <li>Paste that link directly into the downloader box on this page.</li>
                        <li>Our system intelligently categorizes the link, queries the correct API, and provides you with the direct file downloads. Hit "Download" and enjoy!</li>
                    </ol>

                    <h2>Frequently Asked Questions</h2>
                    <h3>Why did my link say "Unsupported Platform"?</h3>
                    <p>While our downloader engines parse the vast majority of social media traffic (Instagram, TikTok, FB, Twitter), certain extremely niche streaming sites or premium video hosting platforms might utilize heavy DRM (Digital Rights Management) that blocks legitimate parsing tools. Try ensuring it's a standard social media URL.</p>

                    <h3>How can I download videos to my iPhone Camera Roll?</h3>
                    <p>Using iOS Safari, tap "Download" and select "Download" when the iPhone prompt appears. Open the Safari Downloads menu, find your video file, tap the Share icon at the bottom, and finally select "Save Video". The video is now safely in your Photos app!</p>
                </div>"""
}

def update_seo(filepath, seo_content):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern2 = r'(<div class="seo-content">.*?</div>)(\s*</div>\s*</section>)'
    
    new_html = re.sub(pattern2, seo_content.replace("\\", "\\\\") + r'\2', content, flags=re.DOTALL)
    
    if new_html != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f"Updated {filepath}")
    else:
        print(f"Failed to find match in {filepath}")

base_dir = r"c:\\Users\\Administrator\\Desktop\\download\\video-downloader\\public"
for filename, seo_text in pages_content.items():
    update_seo(os.path.join(base_dir, filename), seo_text)
