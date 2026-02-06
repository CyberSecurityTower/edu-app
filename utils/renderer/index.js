import { globalStyles } from './styles';
import { widgetProcessors } from './widgets';
import { textFormatters } from './formatters';

// استيراد المكون الجديد
import { processYouTube, youtubeStyles, youtubeScript } from './youtubeWidget'; 
const isArabicText = (text) => /[\u0600-\u06FF]/.test(text);

export const renderLesson = ({ content, title }) => {
  if (!content) return '';
  
  // فحص الاتجاه
  const checkStr = (title || '') + (content.substring(0, 100) || '');
  const isRTL = isArabicText(checkStr);
  const dir = isRTL ? 'rtl' : 'ltr';
  const lang = isRTL ? 'ar' : 'en';

  let processed = content;

  // 1. إعداد دالة الحفظ
  let widgetsStore = [];
  const saveWidget = (html) => {
    widgetsStore.push(html);
    return `%%%WIDGET_${widgetsStore.length - 1}%%%`;
  };

  // --- المعالجة ---

  // ✅ التغيير المهم هنا: نمرر saveWidget للمعالج ليقوم بالعزل بنفسه
  processed = processYouTube(processed, saveWidget); 

  processed = widgetProcessors.math(processed); 
  processed = widgetProcessors.chartPie(processed);
  processed = widgetProcessors.chartBar(processed);
  processed = widgetProcessors.steps(processed);
  processed = widgetProcessors.table(processed);
  processed = widgetProcessors.spoiler(processed);
  processed = widgetProcessors.callouts(processed);

  // عزل باقي الويدجت (تمت إزالة yt-wrapper من هنا لأنها عولجت في الخطوة السابقة)
  processed = processed.replace(
    /(<div class="(?:steps-container|table-wrap|spoiler|callout|math-box|chart-card|bar-chart-card).*?<\/div>(\s*<\/div>)?)/gs, 
    (match) => saveWidget(match)
  );

  // 2. تنسيق النص
  processed = textFormatters.headers(processed);
  processed = textFormatters.divider(processed);
  processed = textFormatters.styles(processed);
  processed = textFormatters.listsSimple(processed); 
  processed = textFormatters.paragraphs(processed);

  // 3. استعادة الويدجت
  widgetsStore.forEach((html, i) => {
    processed = processed.replace(`%%%WIDGET_${i}%%%`, html);
  });
  
  return `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${lang}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        ${globalStyles}
        ${youtubeStyles} 
      </style>
    </head>
    <body>
      <div id="content">${processed}</div>
      ${youtubeScript} 
    </body>
    </html>
  `;
};