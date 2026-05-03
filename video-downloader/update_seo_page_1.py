import os
import re

pages_content = {
    "index.html": """<div class="seo-content">
                    <h2>The Ultimate Universal Video Downloader Online</h2>
                    <p>Welcome to <strong>downloader.online</strong>, your premier destination for saving high-quality videos and audio from the world's most popular social media platforms. Whether you're looking to download a viral TikTok video without a watermark, save an inspiring Instagram Reel, archive a Facebook Watch clip, or directly rip a high-definition Twitter (X) video, our platform does it all—for free, and instantly.</p>
                    <p>Unlike standard download apps, we process everything entirely in the cloud. This means no suspicious software to install, no annoying browser extensions, and zero risk to your computer or mobile device. As the ultimate <strong>vidsaved alternative</strong> and <strong>vidmate alternative</strong>, our system is engineered for maximum speed and uncompromising security.</p>
                    
                    <h2>Features & Benefits of Our Downloader</h2>
                    <ul>
                        <li><strong>No Watermarks:</strong> We extract the original, pristine video file directly from the source servers. Your TikToks and Reels will download completely clean and watermark-free.</li>
                        <li><strong>Ultra HD Quality (4K, 2K, 1080p):</strong> Stop settling for blurry pixels! If the original creator uploaded a video in 4K or 1080p 60FPS, our engine fetches that exact maximum resolution file for you.</li>
                        <li><strong>Universal Device Compatibility:</strong> Our web tool works flawlessly on Windows PCs, Mac OS, iPhones (iOS), iPads, Android smartphones, and tablets. All you need is a modern web browser.</li>
                        <li><strong>Lightning Fast Processing:</strong> Equipped with industrial-grade backend servers, our platform instantly safely fetches your content in milliseconds without delays.</li>
                    </ul>

                    <h2>Frequently Asked Questions (FAQ)</h2>
                    <h3>Is it legal to download videos from social media?</h3>
                    <p>Yes, it is legal to download videos for <strong>personal, offline viewing only</strong>. However, you must respect the intellectual property rights of the original content creators. Do not re-upload, monetize, or otherwise distribute copyrighted content without explicit permission from the owner.</p>

                    <h3>Do I need to pay to use downloader.online?</h3>
                    <p>No! Our service is 100% free and forever will be. There are absolutely no hidden fees, paywalls, or premium subscriptions required to access maximum quality and unlimited downloads.</p>

                    <h3>Are my downloads anonymous and secure?</h3>
                    <p>Absolutely. We value your privacy and security above everything else. We <strong>do not</strong> track your download history, we do not log the specific video URLs you download, and all site traffic is strictly encrypted via HTTPS protocols to protect your data.</p>
                    
                    <h3>Can I use this on my iPhone or Android?</h3>
                    <p>Yes! Simply open Safari on your iPhone, or Chrome on your Android device, navigate to our site, paste your copied link, and download your file directly to your mobile camera roll or downloads folder.</p>
                </div>""",
                
    "tiktok-downloader.html": """<div class="seo-content">
                    <h2>Advanced TikTok Video Downloader Without Watermark</h2>
                    <p>TikTok is one of the fastest-growing platforms on the internet, filled with creative, entertaining, and educational videos. With our specialized <strong>TikTok Downloader</strong>, you can instantly save any TikTok video to your device in original HD quality—and most importantly, absolutely <strong>without the TikTok watermark</strong>.</p>
                    <p>Our powerful ssstik and snaptik alternative tool extracts the pure MP4 source file. Whether you want to back up your own TikTok portfolio, share a funny clip with friends in a chat app, or use a video for your own offline viewing, our web-based downloader delivers pristine, logo-free content.</p>

                    <h2>How to Download no-watermark TikToks</h2>
                    <p>The process is incredibly straightforward and takes less than 5 seconds:</p>
                    <ol>
                        <li><strong>Copy the Link:</strong> Open the TikTok app and find the video you wish to save. Tap the "Share" arrow on the right side of the screen, and press "Copy Link".</li>
                        <li><strong>Paste into our Tool:</strong> Visit this page, paste the copied URL directly into the search bar at the very top, and hit "Download".</li>
                        <li><strong>Save to your Device:</strong> Our servers will instantly analyze the link. Click the final Download button to save the MP4 straight to your smartphone, tablet, or PC folder!</li>
                    </ol>

                    <h2>TikTok Parsing Features</h2>
                    <ul>
                        <li><strong>Watermark Removal:</strong> We actively bypass the standard TikTok branding engine, giving you access to the untouched, raw video exactly as the creator filmed it.</li>
                        <li><strong>Save TikTok MP3 Audio:</strong> Love a specific trending sound or song? Our tool allows you to isolate and download just the high-quality MP3 audio track from any TikTok post.</li>
                        <li><strong>No Login Required:</strong> Download anonymously. We never ask you to link your TikTok account, sign in, or provide any personal data whatsoever.</li>
                    </ul>

                    <h2>Frequently Asked Questions</h2>
                    <h3>Where are downloaded TikTok videos saved?</h3>
                    <p>On a PC or Mac, your videos will typically appear in your default "Downloads" folder. On mobile devices (iOS/Android), iPhones may save it to the Files app (which you can then Save to Camera Roll), while Androids generally save directly to your Gallery or Video folder.</p>
                    
                    <h3>Can I download private TikTok videos?</h3>
                    <p>No. We uphold strict privacy boundaries. Our tool cannot access or download videos from TikTok accounts that are set to private. We can only process and download videos that are publicly available to everyone.</p>

                    <h3>Do you limit the number of TikTok videos I can download?</h3>
                    <p>Never. Our service is completely unlimited. You can download 5, 50, or 500 TikTok videos per day entirely for free without hitting a paywall or experiencing a throttle in download speeds.</p>
                </div>"""
}

def update_seo(filepath, seo_content):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace the exact <div class="seo-content">...</div> block
    # Note: re.DOTALL ensures . matches newlines
    pattern = r'<div class="seo-content">.*?</div>'
    # Wait, if there are nested divs, regex might fail. But in our case <div class="seo-content"> doesn't usually have extensive nested <div>s, it just has <h2/3>, <p>, <ul>
    # Wait, earlier I saw the file had no nested divs inside seo-content. So .*?</div> will stop at the FIRST </div> it encounters. 
    # Let's verify if there are any nested divs.
    
    # Actually, a much safer regex:
    # Match from <div class="seo-content"> up to \s*</div>\s*</div>\s*</section>
    
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

