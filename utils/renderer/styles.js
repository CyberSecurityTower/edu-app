export const globalStyles = `
  :root {
    --bg: #0B1220;
    --text: #E2E8F0;
    --text-muted: #94A3B8;
    --accent: #38BDF8;
    --border: #1E293B;
    --card: #1e293b;
    --font-ar: 'Tajawal', sans-serif;
    --font-en: 'Inter', sans-serif;
  }

  html { -webkit-text-size-adjust: 100%; }
  html[dir="rtl"] body { font-family: var(--font-ar); }
  html[dir="ltr"] body { font-family: var(--font-en); }

  body { 
    background: var(--bg); 
    color: var(--text); 
    margin: 0; 
    padding: 10px 14px; /* تقليل الحواف الجانبية */
    padding-bottom: 30px;
    line-height: 1.5; /* تقليل ارتفاع السطر قليلاً */
    text-align: start; 
  }
  
  * { box-sizing: border-box; outline: none; }
  
  /* --- Typography --- */
  
  /* 1. إظهار العنوان الرئيسي وتنسيقه */
  h1 { 
    display: block; 
    font-size: 22px; 
    color: var(--accent); 
    margin-top: 0;
    margin-bottom: 16px; 
    border-bottom: 1px solid var(--border); 
    padding-bottom: 10px;
    line-height: 1.3;
  }
  
  /* تقليل المسافات للعناوين */
  h2, h3, h4 { color: #fff; font-weight: 800; line-height: 1.3; }
  
  h2 { 
    margin-top: 20px; /* كان 28 */
    margin-bottom: 8px; /* كان 12 */
    font-size: 18px; 
    border-inline-start: 4px solid var(--accent); 
    padding-inline-start: 10px; 
    background: linear-gradient(to left, transparent, rgba(56, 189, 248, 0.05)); 
    border-radius: 4px;
    padding-top: 2px; 
    padding-bottom: 2px; 
  }

  h3 { 
    font-size: 16px; 
    color: #f1f5f9; 
    margin-top: 16px; /* كان 20 */
    margin-bottom: 6px; 
  }
  
  /* تقليل مسافة الفقرات */
  p { margin-bottom: 8px; font-size: 15.5px; text-align: justify; color: var(--text); }
  
  /* --- ضغط المسافات (Compact Spacing) --- */
  h2 + p, h3 + p, h2 + ul, h3 + ul, h2 + .callout { margin-top: -4px; }
  ul + p, ol + p { margin-top: 4px; }

  strong { color: #fff; font-weight: 700; }
  
  hr { border: 0; height: 1px; background: var(--border); margin: 16px 0; opacity: 0.5; }
  
  ul, ol { padding-inline-start: 20px; margin-bottom: 8px; }
  li { margin-bottom: 4px; color: var(--text); padding-inline-start: 4px; }
  li::marker { color: var(--accent); } 

  blockquote { 
    border-inline-start: 3px solid var(--text-muted); 
    background: rgba(255,255,255,0.02); 
    margin: 10px 0; /* تقليل الهامش */
    padding: 8px 12px; 
    color: var(--text-muted); 
    border-radius: 4px;
    font-size: 14.5px;
  }

  code, .math-inline { 
    font-family: 'Courier New', monospace; 
    background: rgba(255,255,255,0.08); 
    padding: 1px 5px; 
    border-radius: 4px; 
    font-size: 0.9em; 
    display: inline-block;
    color: #cbd5e1;
    direction: ltr;
  }
  .math-inline { color: var(--accent); font-weight: bold; font-size: 1.1em; vertical-align: bottom; }

  /* --- WIDGETS SPACING --- */
  
  .steps-container { margin: 16px 0; width: 100%; }
  .step-row { padding-bottom: 16px; } /* تقليل الفراغ بين الخطوات */
  
  .table-wrap { margin: 16px 0; }
  th, td { padding: 8px 12px; } /* تقليل حشوة الجدول */

  /* Callouts - تقليل الهوامش */
  .callout { 
    display: flex; gap: 10px; padding: 12px; margin: 12px 0; 
    border-radius: 6px; border-inline-start-width: 4px; border-inline-start-style: solid; 
    background: rgba(30, 41, 59, 0.4); 
  }
  .callout-title { font-size: 14px; margin-bottom: 2px; }
  
  /* --- Spoiler / Accordion (Modern Style) --- */
  .spoiler {
    background: rgba(30, 41, 59, 0.3); /* خلفية شفافة */
    border: 1px solid var(--border);
    border-radius: 8px;
    margin: 16px 0;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  /* عند الفتح نغير لون الحدود */
  .spoiler.open {
    border-color: var(--accent);
    background: rgba(30, 41, 59, 0.5);
  }

  /* زر الرأس */
  .spoiler-head {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    text-align: start;
    outline: none;
    transition: background 0.2s;
  }

  .spoiler-head:active {
    background: rgba(255, 255, 255, 0.05);
  }

  /* السهم ودورانه */
  .spoiler-icon {
    font-size: 10px;
    opacity: 0.7;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* تدوير السهم عند الفتح */
  .spoiler.open .spoiler-icon {
    transform: rotate(180deg);
    color: var(--accent);
    opacity: 1;
  }

  /* حاوية المحتوى للحركة الناعمة */
  .spoiler-content {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* عند الفتح */
  .spoiler.open .spoiler-content {
    max-height: 1000px; /* قيمة كبيرة للسماح بالتمدد */
    opacity: 1;
  }

  /* المحتوى الداخلي */
  .spoiler-inner {
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    font-size: 14.5px;
    line-height: 1.6;
  }

  .math-box { padding: 10px; margin: 12px 0; }

  /* --- Charts: Pie / Donut (Elegant Style) --- */
  .chart-card {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6));
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 20px;
    margin: 20px 0;
    display: flex;
    flex-direction: row-reverse; /* عكس الاتجاه ليناسب العربية */
    align-items: center;
    gap: 24px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  /* حاوية الرسم */
  .chart-visual-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    flex-shrink: 0;
    filter: drop-shadow(0 0 8px rgba(0,0,0,0.3));
  }

  .pie-donut {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  /* الثقب الداخلي */
  .pie-hole {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 75%; /* ثقب أوسع لمظهر أنحف وأحدث */
    height: 75%;
    background: var(--bg); /* لدمجه مع الخلفية */
    border-radius: 50%;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.5); /* ظل داخلي للعمق */
  }

  /* قائمة التوضيح */
  .chart-legend {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 150px;
  }

  .chart-legend-item {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.03);
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.02);
  }

  .chart-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-inline-end: 10px;
    box-shadow: 0 0 5px currentColor; /* توهج بسيط للون */
  }

  .chart-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex: 1;
  }

  .chart-label {
    font-size: 13px;
    color: #e2e8f0;
    font-weight: 500;
  }

  .chart-sub {
    font-size: 12px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    margin-inline-start: 8px;
  }

  /* تحسين للموبايل */
  @media (max-width: 400px) {
    .chart-card {
      flex-direction: column;
      padding: 16px;
    }
    .chart-legend {
      width: 100%;
    }
  }
    
  /* --- Modern Smart Timeline (Steps) --- */
  .timeline-container {
    padding: 10px 0;
    margin: 24px 0;
    position: relative;
  }

  .timeline-item {
    display: flex;
    position: relative;
    padding-bottom: 32px; /* مسافة بين المحطات */
  }
  
  .timeline-item:last-child {
    padding-bottom: 0;
  }

  /* --- منطقة الخط والنقطة --- */
  .timeline-marker-area {
    width: 40px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    margin-right: 16px; /* مسافة بين الخط والكارت */
  }

  /* الخط الرأسي */
  .timeline-line {
    position: absolute;
    top: 28px; /* يبدأ من تحت النقطة */
    bottom: -10px; /* يمتد للعنصر التالي */
    width: 2px;
    background: rgba(255, 255, 255, 0.1);
    z-index: 0;
  }
  
  .timeline-line.hidden { display: none; }
  
  /* تلوين الخط إذا كانت المرحلة مكتملة */
  .timeline-item.completed .timeline-line {
    background: linear-gradient(to bottom, var(--accent) 0%, rgba(56, 189, 248, 0.2) 100%);
  }
  
  /* إذا كان العنصر التالي أيضاً مكتمل، اجعل الخط صلباً */
  .timeline-item.completed:not(.current) .timeline-line {
    background: var(--accent);
  }

  /* النقطة (The Dot) */
  .timeline-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--card);
    border: 2px solid var(--border);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 14px;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 0 0 0 4px var(--bg); /* هالة لفصل الخط عن النقطة */
  }

  .dot-inner {
    width: 8px;
    height: 8px;
    background: var(--text-muted);
    border-radius: 50%;
    opacity: 0.5;
  }

  /* النقطة المكتملة */
  .timeline-item.completed .timeline-dot {
    background: var(--accent);
    border-color: var(--accent);
    color: #0B1220; /* لون النص داخل الدائرة */
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
  }

  /* النقطة الحالية (Current) - تأثير النبض */
  .timeline-item.current .timeline-dot {
    animation: pulse-glow 2s infinite;
  }

  @keyframes pulse-glow {
    0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
    70% { box-shadow: 0 0 0 8px rgba(56, 189, 248, 0); }
    100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
  }

  /* --- بطاقة المحتوى --- */
  .timeline-content {
    flex: 1;
    margin-top: -4px; /* محاذاة النص مع النقطة */
  }

  .timeline-card {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.3));
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px 16px;
    transition: transform 0.2s;
  }

  .timeline-item.current .timeline-card {
    border-color: rgba(56, 189, 248, 0.3);
    background: linear-gradient(145deg, rgba(56, 189, 248, 0.08), rgba(15, 23, 42, 0.3));
  }

  .timeline-title {
    display: block;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
  }

  .timeline-item.completed .timeline-title {
    color: var(--accent);
  }

  .timeline-desc {
    font-size: 13.5px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.5;
  }
 /* --- Bar Chart Styling --- */
  .bar-chart-card {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6));
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 20px;
    margin: 20px 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  .chart-header {
    margin-bottom: 16px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 8px;
  }

  .chart-title {
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .bar-chart-area {
    display: flex;
    align-items: flex-end; /* محاذاة الأعمدة للقاع */
    justify-content: space-around; /* توزيع المسافات بالتساوي */
    height: 180px; /* ارتفاع منطقة الرسم */
    padding-top: 20px;
    gap: 8px;
  }

  .bar-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1; /* جعل الأعمدة تتمدد بالتساوي */
    height: 100%;
    justify-content: flex-end;
    position: relative;
    min-width: 0; /* مهم لمنع تجاوز الحاوية */
  }

  .bar-visual {
    width: 60%; /* عرض العمود */
    max-width: 40px;
    min-width: 12px;
    border-radius: 6px 6px 0 0; /* تدوير الزوايا العلوية فقط */
    transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.9;
    position: relative;
    min-height: 4px; /* لضمان ظهور القيم الصغيرة جداً */
  }

  .bar-visual:hover {
    opacity: 1;
    filter: brightness(1.1);
  }

  .bar-label {
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; /* إضافة نقاط إذا كان النص طويلاً */
  }

  .bar-tooltip {
    font-size: 11px;
    color: #fff;
    margin-bottom: 4px;
    font-weight: bold;
    opacity: 0.8;
  }

  /* تحسين للموبايل */
  @media (max-width: 400px) {
    .bar-chart-area {
      height: 150px;
      gap: 4px;
    }
    .bar-visual {
      width: 70%;
    }
    .bar-label {
      font-size: 10px;
    }
  }
`;