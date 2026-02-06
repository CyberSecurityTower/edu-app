export const getPdfHtml = (pdfUrl) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  </script>
  <style>
    /* تنسيقات أساسية */
    html, body {
      margin: 0; padding: 0;
      background-color: #0F172A; /* نفس لون خلفية التطبيق */
      scroll-behavior: smooth; /* تنقل ناعم */
    }

    #viewer-container {
      display: flex;
      flex-direction: column; /* جعل الصفحات تحت بعضها */
      align-items: center;
      padding-top: 10px;
      padding-bottom: 40px;
      width: 100%;
    }

    /* وعاء الصفحة الواحدة */
    .page-wrapper {
      position: relative;
      background-color: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      margin-bottom: 15px; /* مسافة بين الصفحات */
      min-height: 200px; /* ارتفاع مبدئي حتى يتم التحميل */
    }

    canvas { display: block; width: 100%; height: 100%; }

    /* طبقة النصوص - لم يتم المساس بها للحفاظ على دعم العربية */
    .textLayer {
      position: absolute; left: 0; top: 0; right: 0; bottom: 0;
      overflow: hidden; opacity: 0.2; line-height: 1.0;
      mix-blend-mode: multiply; pointer-events: none;
    }
    .textLayer > span {
      color: transparent; position: absolute; white-space: pre;
      cursor: default; transform-origin: 0% 0%;
      font-family: sans-serif !important;
    }
    
    /* مؤشر تحميل للصفحة غير المحملة بعد */
    .loading-placeholder {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #94A3B8; font-family: sans-serif; font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="viewer-container"></div>

  <script>
    const CONFIG = { url: '${pdfUrl}' };
    let pdfDoc = null;
    const container = document.getElementById('viewer-container');
    
    // إعداد مراقب الظهور (Intersection Observer) للتحميل الذكي
    // هذا الكود يكتشف أي صفحة ظاهرة الآن على الشاشة
    let observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 1. تحميل الصفحة إذا لم تكن محملة
          const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
          renderPage(pageNum, entry.target);
          
          // 2. إبلاغ التطبيق برقم الصفحة الحالية
          sendToRN({ type: 'PAGE_CHANGED', page: pageNum });
        }
      });
    }, {
      root: null,
      rootMargin: '200px', // تحميل الصفحات قبل وصولها بمسافة قليلة
      threshold: 0.1
    });

    async function initPDF() {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: CONFIG.url,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
          disableFontFace: true, 
          enableXfa: true
        });
        pdfDoc = await loadingTask.promise;
        
        sendToRN({ type: 'LOADED', totalPages: pdfDoc.numPages });
        
        // إنشاء الهيكل الفارغ لجميع الصفحات دفعة واحدة
        createPlaceholders(pdfDoc.numPages);
        
      } catch (error) {
        sendToRN({ type: 'ERROR', msg: error.message });
      }
    }

    function createPlaceholders(numPages) {
      for (let i = 1; i <= numPages; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper';
        wrapper.id = 'page-' + i;
        wrapper.setAttribute('data-page-number', i);
        
        // نص مؤقت
        const loadingText = document.createElement('div');
        loadingText.className = 'loading-placeholder';
        loadingText.innerText = 'جاري التحميل... ' + i;
        wrapper.appendChild(loadingText);

        container.appendChild(wrapper);
        
        // ابدأ بمراقبة هذا العنصر
        observer.observe(wrapper);
      }
    }

    async function renderPage(num, wrapper) {
      // إذا كانت الصفحة محملة مسبقاً (يوجد بها Canvas)، لا تقم بإعادة الرسم
      if (wrapper.querySelector('canvas')) return;

      const page = await pdfDoc.getPage(num);
      
      // حساب الأبعاد لتناسب عرض الشاشة مع هوامش
      const windowWidth = window.innerWidth;
      const desiredWidth = windowWidth - 20; 
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scale = desiredWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: scale });
      const outputScale = window.devicePixelRatio || 1;

      // تنظيف العنصر (إزالة نص جاري التحميل)
      wrapper.innerHTML = '';

      const canvas = document.createElement('canvas');
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';

      wrapper.appendChild(canvas);
      wrapper.appendChild(textLayerDiv);

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);

      const cssWidth = Math.floor(viewport.width) + "px";
      const cssHeight = Math.floor(viewport.height) + "px";

      canvas.style.width = cssWidth;
      canvas.style.height = cssHeight;
      wrapper.style.width = cssWidth;
      wrapper.style.height = cssHeight;
      textLayerDiv.style.width = cssWidth;
      textLayerDiv.style.height = cssHeight;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      // رسم الصفحة
      await page.render({ canvasContext: canvas.getContext('2d'), viewport, transform }).promise;

      // رسم طبقة النصوص (كما هي تماماً)
      const textContent = await page.getTextContent();
      pdfjsLib.renderTextLayer({
        textContentSource: textContent, container: textLayerDiv, viewport, textDivs: []
      });
    }

    function sendToRN(data) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }

    // استقبال الأوامر من التطبيق
    document.addEventListener("message", (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'GOTO') {
                const targetPage = parseInt(data.page);
                const targetElement = document.getElementById('page-' + targetPage);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } catch(e){}
    });

    initPDF();
  </script>
</body>
</html>
`;