// استبدال الرموز الرياضية والأسهم
const replaceMathSymbols = (text) => {
  return text
    .replace(/\\leftarrow/g, '←')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\\longleftarrow/g, '⟵')
    .replace(/\\longrightarrow/g, '⟶')
    .replace(/\\approx/g, '≈')
    .replace(/\\ne/g, '≠')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\times/g, '×');
};

export const textFormatters = {
  // 0. حذف العنوان الرئيسي: لن نستخدم هذه الدالة، لكن يمكن تركها كما هي وعدم استدعائها في index.js
  removeTitle: (text) => {
    return text.replace(/^\s*#\s+.*(\r\n|\r|\n)+/, '');
  },

  // 1. الفواصل
  divider: (text) => text.replace(/^---$/gm, '<hr>'),

  // 2. العناوين - تعديل: الحفاظ على H1 كما هو
  headers: (text) => {
    let processed = text
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')   // تحويل # إلى h1
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')  // تحويل ## إلى h2
      .replace(/^### (.*$)/gm, '<h3>$1</h3>'); // تحويل ### إلى h3
    
    return processed.replace(/(<\/h[1-6]>)\s*\n+/g, '$1');
  },

  // 3. التنسيقات (كما هي)
  styles: (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/\$([^$]+)\$/g, (match, content) => {
         return `<span class="math-inline">${replaceMathSymbols(content)}</span>`;
      }) 
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  },

  // 4. القوائم (كما هي)
  listsSimple: (text) => {
     return text.replace(/^(\s*)[-*]\s+(.*$)/gm, 
       '<div style="display:flex; align-items:baseline; margin-bottom:2px;">' + // تقليل المارجن هنا أيضاً
       '<span style="color:#38BDF8; margin-inline-end:8px; font-size:12px; line-height:1.8;">●</span>' +
       '<span style="flex:1">$2</span></div>'
     );
  },

  // 5. الفقرات
  paragraphs: (text) => {
    // تحويل الأسطر الجديدة المزدوجة إلى فاصل واحد فقط لتقليل الفجوات
    // استخدام <br> واحد بدل اثنين، أو استخدام <p> مع مارجن قليل في CSS
    // الحل الأبسط هنا لتقليل الفجوة الكبيرة:
    return text.replace(/\n\n/g, '<br><div style="height:6px"></div>'); 
  }
};