import os
import re

pages_content = {
    "instagram-reels-downloader.html": """<div class="seo-content">
                    <h2>The Best Instagram Reels Downloader Online</h2>
                    <p>Instagram Reels have taken over as one of the most engaging ways to consume short-form video on social media. Our <strong>Instagram Reels Downloader</strong> provides a seamless way to save these incredible clips directly to your device. As a top vidsaved alternative, our tool ensures you consistently extract the absolute highest quality available, so you can watch your favorite Reels anywhere, at any time.</p>
                    <p>Whether you're compiling a mood board, saving educational tutorials, or just backing up hilarious memes, downloading IG Reels is now incredibly simple. Simply grab the link, paste it, and our backend engines do the rest in seconds.</p>

                    <h2>Why choose our Reels Downloader?</h2>
                    <p>Our platform is engineered and optimized specifically for parsing the complex Instagram CDNs, ensuring you get pristine results without any frustrating loading times.</p>
                    <ul>
                        <li><strong>Absolutely no account required:</strong> Unlike buggy browser extensions, we never ask you to link your Instagram profile. Download securely and anonymously.</li>
                        <li><strong>Uncompressed HD Details:</strong> We grab the raw 1080p MP4 file from the Reel, maintaining perfectly synced audio and crisp visuals.</li>
                        <li><strong>Zero Watermarks:</strong> We process the source feed, which means the videos you download will be perfectly clean—no logos superimposed on top of the content.</li>
                        <li><strong>Multi-Device Support:</strong> Works universally whether you're using Safari on an iPhone, Chrome on a Galaxy device, or Edge on your Desktop PC.</li>
                    </ul>

                    <h2>Frequently Asked Questions</h2>
                    <h3>How do I copy a Reel link from the Instagram App?</h3>
                    <p>It's easy. Tap on the Reel you want to download to open it. Look for the paper airplane "Share" icon (or the three dots) on the right-hand side. Tap it, and select "Copy Link". Then, come to downloader.online and paste!</p>
                    
                    <h3>Is there a limit on how many Reels I can save?</h3>
                    <p>No limits whatsoever. Our tool is provided completely free of charge and you can download an unlimited number of Instagram Reels daily. Our infrastructure scales to handle massive traffic so you'll never face slowdowns.</p>

                    <h3>Why did my Reel download fail?</h3>
                    <p>Usually, this occurs if the Reel comes from a Private Account. Our service respects privacy protocols and can only fetch Reels posted by public Instagram profiles. Ensure the video is public before trying to download it.</p>
                </div>""",
                
    "instagram-photo-downloader.html": """<div class="seo-content">
                    <h2>Free Instagram Photo Downloader & Image Saver</h2>
                    <p>Have you ever found a breathtaking photograph, a hilarious meme, or an important infographic on an Instagram post, only to realize the app doesn't let you save it? Our <strong>Instagram Photo Downloader</strong> solves this instantly. With just a quick link copy-paste, you can harvest and save full-resolution JPEG and PNG images straight from standard Instagram photo posts.</p>
                    
                    <h2>How to Save Instagram Pictures in Original Quality</h2>
                    <p>Many people resort to taking screenshots of Instagram photos. However, mobile devices compress screenshots, reducing image quality and cutting off parts of the photo. Our tool fetches the actual uncompressed source image file uploaded by the creator.</p>
                    <ol>
                        <li>Navigate to the specific Instagram photo post you want to save.</li>
                        <li>Tap the "Share" icon (the paper plane) or the three dots (...) and tap "Copy Link".</li>
                        <li>Paste your URL into the field above and tap download. In seconds, you will receive the full HD resolution (up to 1080x1350 pixels depending on the original upload) ready to be saved permanently!</li>
                    </ol>

                    <h2>Benefits of using our IG Downloader</h2>
                    <ul>
                        <li><strong>Carousel Support Tracking:</strong> If a post contains multiple photos (a carousel), you can easily extract the specific image link and grab exactly what you need.</li>
                        <li><strong>PC and Mac Friendly:</strong> Photographers and designers love using our tool to backup their own Instagram feeds right onto their desktop hard drives.</li>
                        <li><strong>100% Free and Safe:</strong> No annoying paywalls, no confusing captchas, and absolutely no malware. Your image is delivered through a secure HTTPS gateway.</li>
                    </ul>

                    <h2>Frequently Asked Questions</h2>
                    <h3>Can I save profile pictures (DPs) using this?</h3>
                    <p>This specific page is optimized for standard feed photo posts. For full-size profile pictures, you might need a dedicated DP downloader tool. However, any public feed post image will work flawlessly here.</p>

                    <h3>Do you compress the photos when I download them?</h3>
                    <p>Never. The core philosophy of downloader.online is to return the exact source file from the server. The MB size and resolution of the photo you get is precisely what the social media CDN stored.</p>
                </div>""",
                
    "instagram-stories-downloader.html": """<div class="seo-content">
                    <h2>Anonymous Instagram Stories Downloader</h2>
                    <p>Instagram Stories are a fantastic way to share daily updates, behind-the-scenes content, and limited-time announcements. But because Stories disappear after 24 hours, you often need to save them. Our <strong>Instagram Stories Downloader</strong> is designed to easily grab these ephemeral videos and photos so you can preserve them forever.</p>
                    
                    <h2>Key Features of our Story Saver</h2>
                    <p>Saving stories should be private and effortless. Our tool bypasses the need for you to screenshot or screen-record, offering direct file access for maximum quality.</p>
                    <ul>
                        <li><strong>100% Anonymous Viewing:</strong> When you use our tool to download a public Story, your account is totally detached. The creator will not see you in their "Viewers" list. You can browse and save in complete stealth mode.</li>
                        <li><strong>Video & Image Compatibility:</strong> Stories can be static images or 15–60 second video clips. Our engine intelligently detects the format and provides the appropriate MP4 or JPG download.</li>
                        <li><strong>HD Resolution:</strong> We preserve the standard 1080x1920 vertical format. The downloaded files will look gorgeous when played back on any modern smartphone screen.</li>
                    </ul>

                    <h2>Steps to Download an Instagram Story</h2>
                    <p>To use our service safely, the Instagram profile must be public.</p>
                    <ol>
                        <li>On the Instagram app, tap the user's avatar to view their active Story.</li>
                        <li>Hit the "Share" button at the bottom (or the three dots in the top right), and pick "Copy Link".</li>
                        <li>Paste that link into our IG Story downloader interface above and watch as the file is delivered seamlessly.</li>
                    </ol>

                    <h2>Frequently Asked Questions</h2>
                    <h3>Can I save stories from Private Instagram Accounts?</h3>
                    <p>No. To protect user privacy, our server infrastructure only queries public, unrestricted Instagram profiles. If the user has a padlock icon on their profile, our tool cannot fetch their active stories.</p>

                    <h3>Does this work for Instagram Highlights?</h3>
                    <p>Yes! Instagram Highlights are essentially Stories that have been permanently pinned to a profile. You can copy the link to a specific Highlight and paste it here to download it just as you would a normal 24-hour story.</p>
                </div>""",

    "facebook-downloader.html": """<div class="seo-content">
                    <h2>Advanced Facebook Video & Watch Downloader</h2>
                    <p>Facebook remains one of the largest hubs for discovering viral videos, news clips, live stream replays, and long-form "Facebook Watch" content. However, there is no native way to save these videos offline. Our <strong>Facebook Video Downloader</strong> bridges this gap, allowing you to easily rip FB videos to your local storage in crisp HD.</p>
                    
                    <h2>Save FB Videos to MP4 Effectively</h2>
                    <p>Relying on internet connections to show a video to friends can be frustrating. By using downloader.online, you take control of your media playback.</p>
                    <ul>
                        <li><strong>Public Groups & Pages:</strong> You can download videos natively hosted on public Facebook Pages or public Groups. Whether it's a cooking recipe, a DIY tutorial, or a sports highlight, we can grab it.</li>
                        <li><strong>Superb HD Quality:</strong> We offer comprehensive quality selection. If the video was uploaded in 1080p, you will see a 1080p option in our downloader dropdown menu. Say goodbye to pixelated downloads.</li>
                        <li><strong>No Login Gateway:</strong> Feel safe utilizing our secure platform—you do not need to log into your Facebook account to use our tool, protecting your credentials.</li>
                    </ul>

                    <h2>How to Rip a Facebook Video</h2>
                    <p>Our extraction interface is blazing fast:</p>
                    <ol>
                        <li>On the Facebook app or desktop website, locate the video you're interested in.</li>
                        <li>Click "Share" -> "More Options" -> "Copy Link". Note: Make sure you are copying the link to the <em>actual video post</em>, not the entire page.</li>
                        <li>Return to our Downloader interface above, paste the URL, and click "Download". Our tools will parse the varying Facebook CDNs and provide a direct MP4 link.</li>
                    </ol>

                    <h2>Frequently Asked Questions</h2>
                    <h3>Why am I getting a "Private Video" error?</h3>
                    <p>Facebook enforces strict privacy for videos posted on personal profiles limited to "Friends Only", or heavily moderated private Facebook Groups. Our downloader can only interact with content that is shared as "Public" facing the whole internet.</p>

                    <h3>Can I save Facebook Reels with this tool?</h3>
                    <p>Yes. Facebook Reels function functionally identically to standard Facebook timeline videos on our backend. Just copy the link to the Reel and our system will serve you the vertical MP4 perfectly.</p>
                </div>""",

    "twitter-downloader.html": """<div class="seo-content">
                    <h2>High-Speed Twitter / X Video Downloader</h2>
                    <p>Twitter (now X) is the primary real-time source for breaking news, trending memes, GIF reactions, and viral conversational threads. It's incredibly common to find an awesome video on your timeline that you'd love to save, but the app provides zero native options for offline archiving. Our streamlined <strong>Twitter Video Downloader</strong> makes ripping these videos as easy as clicking a single button.</p>

                    <h2>Your Best Option for X Video Saves</h2>
                    <p>Why should you choose our proprietary web app to handle your Twitter media?</p>
                    <ul>
                        <li><strong>All Resolutions Captured:</strong> Many Twitter downloaders only grab the low-res 360p stream. We parse the full m3u8 playlist file to extract the 720p or 1080p maximum bitrate versions directly from the X servers.</li>
                        <li><strong>GIF to MP4 Automatic Conversion:</strong> See a hilarious looping GIF on a timeline? Twitter actually stores GIFs as small, silent MP4 videos. Paste the GIF tweet link, and we'll instantly give you that frictionless MP4 file.</li>
                        <li><strong>Safe & Private Operation:</strong> Our cloud engine securely queries the X API. You do not need an X/Twitter account, nor do we require you to authenticate via Twitter Login. Stay 100% anonymous.</li>
                    </ul>

                    <h2>How to Download Videos from X / Twitter</h2>
                    <p>Get your favorite clips onto your desktop or mobile device in 3 steps:</p>
                    <ol>
                        <li>Scroll your Twitter timeline until you find the tweet containing the video or GIF.</li>
                        <li>Tap the "Share" icon (next to the Like button) and select <strong>Copy link</strong>.</li>
                        <li>Paste that link into our blue search bar at the very top of this screen. Hit Download, pick your preferred quality, and the MP4 is yours.</li>
                    </ol>

                    <h2>Frequently Asked Questions</h2>
                    <h3>Did Twitter's rebranding to X break the downloader?</h3>
                    <p>Nope! Our custom backend engines are fully updated to support both standard <code>twitter.com</code> URLs and the newer <code>x.com</code> web links. Paste either URL type, and our system will accurately decode the embedded media.</p>

                    <h3>Can I download videos from an X Space or Live broadcast?</h3>
                    <p>Currently, live streaming protocols are unsupported for direct downloads. Once the Live broadcast finishes and the creator saves the recording as a standard VOD (Video on Demand) tweet on their timeline, you can easily copy that new link and use our downloader.</p>
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
