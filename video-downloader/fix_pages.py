import os
import re

new_script_part = """        async function fetchFormats() {
            const url = urlInput.value.trim();
            if (!url) {
                showStatus('Please paste a video URL.', true);
                return;
            }

            try {
                const searchWrapper = document.querySelector('.search-wrapper');
                const loadingContainer = document.getElementById('loadingContainer');

                searchWrapper.classList.add('hidden');
                loadingContainer.style.display = 'block';
                videoCard.style.display = 'none';
                document.getElementById('loadingText').textContent = 'Analyzing Link...';
                showStatus('');
                setBar(0);
                setTimeout(() => setBar(65), 100);

                const res = await fetch('/formats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                const data = await res.json();
                setBar(100);

                if (!data.success) {
                    showStatus(data.message, true);
                    searchWrapper.classList.remove('hidden');
                    loadingContainer.style.display = 'none';
                    return;
                }

                currentVideoData = data;
                displayVideoInfo(data);

                setTimeout(() => { loadingContainer.style.display = 'none'; }, 400);
            } catch (err) {
                showStatus('Failed to connect to server.', true);
                document.querySelector('.search-wrapper').classList.remove('hidden');
                document.getElementById('loadingContainer').style.display = 'none';
            } finally {
                downloadBtn.disabled = false;
            }
        }

        function displayVideoInfo(data) {
            if (data.thumbnail) {
                thumbnail.src = data.thumbnail;
                thumbnail.style.display = 'block';
            } else {
                thumbnail.style.display = 'none';
            }
            videoTitle.textContent = data.title || "Video Download";
            videoDuration.textContent = data.duration ? formatTime(data.duration) : '';

            formatSelect.innerHTML = '';
            const allFormats = [...data.formats.video, ...data.formats.audio];

            allFormats.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.dataset.type = f.type;
                let typeLabel = 'MP4';
                if (f.type === 'audio') typeLabel = 'MP3';
                if (f.type === 'photo') typeLabel = 'PHOTO';

                const qualityLabel = f.quality || f.resolution || 'Unknown';
                const sizeLabel = f.size ? ` (${(f.size / (1024 * 1024)).toFixed(1)}MB)` : '';
                opt.textContent = `${typeLabel} ${qualityLabel} ${f.note || ''}${sizeLabel}`;
                formatSelect.appendChild(opt);
            });

            videoCard.style.display = 'block';
        }

        async function startDownload() {
            const formatId = formatSelect.value;
            if (!formatId) {
                showStatus('Please select a format.', true);
                return;
            }

            try {
                document.querySelector('.search-wrapper').classList.add('hidden');
                document.getElementById('loadingText').textContent = 'Processing Download...';
                document.getElementById('loadingContainer').style.display = 'block';
                videoCard.style.display = 'none';
                showStatus('');
                finalDownloadBtn.disabled = true;
                setBar(30);

                const formatType = formatSelect.options[formatSelect.selectedIndex].dataset.type;

                const res = await fetch('/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: urlInput.value.trim(),
                        formatId: formatId,
                        type: formatType,
                        videoId: currentVideoData?.videoId,
                        title: currentVideoData?.title,
                        photoUrl: currentVideoData?.formats?.video?.find(f => f.id === formatId)?.url || currentVideoData?.photoUrl
                    })
                });

                const data = await res.json();
                setBar(100);

                if (!data.success) {
                    showStatus(data.message, true);
                    return;
                }

                setTimeout(() => {
                    document.getElementById('loadingContainer').style.display = 'none';
                    showStatus('Download ready!');
                    window.location.href = data.video;
                }, 400);
            } catch (err) {
                document.getElementById('loadingContainer').style.display = 'none';
                showStatus('Download failed.', true);
            } finally {
                finalDownloadBtn.disabled = false;
            }
        }

        downloadBtn.addEventListener('click', fetchFormats);
        finalDownloadBtn.addEventListener('click', startDownload);

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fetchFormats();
        });
"""

def update_file(filepath):
    if 'index.html' in filepath:
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match from first fetchFormats to the end of script
    full_pattern = r'async function fetchFormats\(\) \{.*?(?=</script>)'
    
    if re.search(full_pattern, content, flags=re.DOTALL):
        content = re.sub(full_pattern, new_script_part, content, flags=re.DOTALL)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Pattern not found in {filepath}")

files = [
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
        update_file(f)
    else:
        print(f"File not found: {f}")
