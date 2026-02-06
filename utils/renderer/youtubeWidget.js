// youtubeWidget.js

// دالة استخراج المعرف
const getVideoID = (url) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#<]+)/);
  return (match && match[1]) ? match[1] : null;
};

export const processYouTube = (text, saveWidget) => {
  return text.replace(/<(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^>]+)>/g, (fullMatch, url) => {
    const id = getVideoID(url);
    if (!id) return fullMatch.replace('<', '&lt;').replace('>', '&gt;');
    
    const thumbUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    
    // لاحظ: onclick هنا يرسل رسالة للتطبيق بدلاً من تشغيل الفيديو
    const html = `
      <div class="yt-wrapper" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'PLAY_VIDEO', videoId: '${id}'}))">
        <div class="yt-container">
          <div class="yt-thumbnail" style="background-image: url('${thumbUrl}');">
            <div class="yt-glass-btn">
              <div class="yt-icon"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (saveWidget) return saveWidget(html);
    return html;
  });
};

// التنسيقات (فقط للمظهر الجمالي للصورة)
export const youtubeStyles = `
  .yt-wrapper {
    width: 100%; max-width: 600px; margin: 24px auto;
    display: block; position: relative; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .yt-wrapper:active { transform: scale(0.98); transition: transform 0.1s; }
  .yt-container {
    position: relative; width: 100%; height: 0; padding-bottom: 56.25%;
    background: #000; border-radius: 16px; overflow: hidden;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .yt-thumbnail {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover; background-position: center;
    display: flex; align-items: center; justify-content: center;
  }
  .yt-glass-btn {
    width: 64px; height: 64px; background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  }
  .yt-icon {
    width: 0; height: 0; 
    border-top: 10px solid transparent; border-bottom: 10px solid transparent;
    border-left: 16px solid #fff; margin-left: 4px;
  }
`;

// لا نحتاج لسكربت معقد، فقط التنسيقات
export const youtubeScript = ``;