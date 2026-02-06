const safeParseJSON = (str) => {
  try {
    if (!str) return null;
    // تنظيف JSON من المشاكل الشائعة
    let clean = str.trim()
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\n/g, ' ')
      .replace(/,(\s*[\]}])/g, '$1');
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
};

const replaceMathSymbols = (text) => {
  return text
    .replace(/\\leftarrow/g, '←')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\times/g, '×');
    // ... بقية الرموز إذا لزم الأمر
};

const formatWidgetText = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\$([^$]+)\$/g, (match, content) => `<span class="math-inline">${replaceMathSymbols(content)}</span>`)
    .replace(/\n/g, '<br>');
};

// مصفوفة ألوان متناسقة مع الثيم الخاص بك
const CHART_COLORS = [
  '#38BDF8', // Cyan (Accent)
  '#818CF8', // Indigo
  '#F472B6', // Pink
  '#34D399', // Emerald
  '#FBBF24', // Amber
  '#A78BFA', // Violet
  '#FB7185', // Rose
];
export const widgetProcessors = {
   // --- إضافة معالج Bar Chart ---
  chartBar: (text) => {
    return text.replace(/```chart:bar\s*([\s\S]*?)```/gi, (_, jsonStr) => {
      const data = safeParseJSON(jsonStr);
      // التأكد من صحة هيكل البيانات (labels و datasets)
      if (!data || !data.labels || !data.datasets || !data.datasets[0]) return '';

      const labels = data.labels;
      const dataset = data.datasets[0]; // نأخذ أول مجموعة بيانات فقط للعرض البسيط
      const values = dataset.data || [];
      const datasetLabel = dataset.label || '';
      
      // إيجاد أكبر قيمة لحساب النسب المئوية للارتفاع
      const maxValue = Math.max(...values, 1);

      const bars = values.map((val, index) => {
        const label = labels[index] || '';
        const percentage = (val / maxValue) * 100;
        const color = dataset.backgroundColor?.[index] || CHART_COLORS[index % CHART_COLORS.length];
        
        return `
          <div class="bar-column">
            <div class="bar-tooltip">${val}</div>
            <div class="bar-visual" style="height: ${percentage}%; background: ${color};"></div>
            <div class="bar-label">${formatWidgetText(label)}</div>
          </div>
        `;
      }).join('');

      // عنوان المخطط (اختياري)
      const headerHtml = datasetLabel 
        ? `<div class="chart-header"><span class="chart-title">${formatWidgetText(datasetLabel)}</span></div>` 
        : '';

      return `
        <div class="bar-chart-card">
          ${headerHtml}
          <div class="bar-chart-area">
            ${bars}
          </div>
        </div>
      `;
    });
  },

  steps: (text) => {
    return text.replace(/```steps\s*([\s\S]*?)```/gi, (_, jsonStr) => {
      const data = safeParseJSON(jsonStr);
      if (!data || !Array.isArray(data)) return '';
      
      // نحدد آخر عنصر نشط لإضافة تأثير "النبض" له
      let lastActiveIndex = -1;
      data.forEach((step, index) => {
        if (step.active) lastActiveIndex = index;
      });

      const items = data.map((step, index) => {
        const isActive = step.active;
        const isLastActive = index === lastActiveIndex;
        const isLastItem = index === data.length - 1;
        
        // الحالة: تم (active)، الحالي (current)، أو قادم (inactive)
        let statusClass = isActive ? 'completed' : 'pending';
        if (isLastActive) statusClass += ' current';

        return `
          <div class="timeline-item ${statusClass}">
            <div class="timeline-marker-area">
              <div class="timeline-line ${isLastItem ? 'hidden' : ''}"></div>
              <div class="timeline-dot">
                ${isActive ? '✓' : '<span class="dot-inner"></span>'}
              </div>
            </div>
            <div class="timeline-content">
              <div class="timeline-card">
                <span class="timeline-title">${formatWidgetText(step.label)}</span>
                <p class="timeline-desc">${formatWidgetText(step.desc)}</p>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `<div class="timeline-container">${items}</div>`;
    });
  },

  table: (text) => {
    return text.replace(/```table\s*([\s\S]*?)```/gi, (_, jsonStr) => {
      const data = safeParseJSON(jsonStr);
      if (!data) return '';
      const ths = (data.headers || []).map(h => `<th>${formatWidgetText(h)}</th>`).join('');
      const trs = (data.rows || []).map(r => `<tr>${r.map(c => `<td>${formatWidgetText(c)}</td>`).join('')}</tr>`).join('');
      return `<div class="table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    });
  },

  math: (text) => {
    return text.replace(/```math\s*([\s\S]*?)```/gi, (_, content) => 
      `<div class="math-box">${content.trim()}</div>`
    );
  },

  spoiler: (text) => {
    // التعديل: الـ Regex الآن يلتقط (Title) اختياري بعد كلمة spoiler مباشرة
    // Group 1: العنوان (اختياري)
    // Group 2: المحتوى
    return text.replace(/```spoiler(?:[ \t]+(.*?))?\n([\s\S]*?)```/gi, (_, title, content) => {
      
      // العنوان الافتراضي إذا لم يكتب المستخدم شيئاً
      const displayTitle = title ? formatWidgetText(title.trim()) : 'عرض المحتوى المخفي';
      
      return `
        <div class="spoiler">
          <button class="spoiler-head" onclick="this.parentElement.classList.toggle('open')">
            <span class="spoiler-title-text">${displayTitle}</span>
            <span class="spoiler-icon">▼</span>
          </button>
          <div class="spoiler-content">
            <div class="spoiler-inner">
              ${formatWidgetText(content.trim())}
            </div>
          </div>
        </div>`;
    });
  },
   // --- إضافة الـ Chart الجديد ---
 chartPie: (text) => {
    return text.replace(/```chart:pie\s*([\s\S]*?)```/gi, (_, jsonStr) => {
      // ... (نفس كود جلب البيانات وحساب الألوان السابق) ...
      const data = safeParseJSON(jsonStr);
      if (!data || !Array.isArray(data)) return '';

      const getValue = (item) => Number(item.value || item.population || item.percent || 0);
      const getLabel = (item) => item.label || item.name || item.title || 'بدون عنوان';

      const total = data.reduce((sum, item) => sum + getValue(item), 0);
      if (total === 0) return ''; 

      let currentPercent = 0;
      const gradientSegments = data.map((item, index) => {
        const val = getValue(item);
        const percent = (val / total) * 100;
        const color = item.color || CHART_COLORS[index % CHART_COLORS.length];
        
        const start = currentPercent;
        currentPercent += percent;
        
        return `${color} ${start}% ${currentPercent}%`; 
      });

      const chartStyle = `background: conic-gradient(${gradientSegments.join(', ')});`;

      const legendItems = data.map((item, index) => {
        const val = getValue(item);
        const color = item.color || CHART_COLORS[index % CHART_COLORS.length];
        const percent = Math.round((val / total) * 100);
        
        return `
          <div class="chart-legend-item">
            <span class="chart-dot" style="background-color: ${color}"></span>
            <div class="chart-info">
              <span class="chart-label">${formatWidgetText(getLabel(item))}</span>
              <span class="chart-sub" style="color:${color}">${percent}%</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="chart-card">
          <div class="chart-visual-wrapper">
            <div class="pie-donut" style="${chartStyle}">
              <div class="pie-hole"></div> <!-- الحلقة الفارغة فقط -->
            </div>
          </div>
          <div class="chart-legend">
            ${legendItems}
          </div>
        </div>
      `;
    });
  },
  callouts: (text) => {
    // تمت إضافة note إلى التعبير النمطي (Regex)
    return text.replace(/^(?:>\s*)?!(info|warn|error|tip|note)\s*(.*?)\n([\s\S]*?)(?=\n\n|$)/gim, (_, type, title, body) => {
      const colors = { 
        info: '#38BDF8', 
        warn: '#F59E0B', 
        error: '#EF4444', 
        tip: '#10B981',
        note: '#8B5CF6' // لون بنفسجي للملاحظات
      };
      const icons = { 
        info: 'ⓘ', 
        warn: '⚠️', 
        error: '❌', 
        tip: '💡',
        note: '📝' // أيقونة الملاحظة
      };
      
      const c = colors[type.toLowerCase()] || colors.info;
      const i = icons[type.toLowerCase()] || icons.info;
      
      const cleanTitle = title.replace(/\*\*/g, '').trim();
      // إذا لم يوجد عنوان، نستخدم اسم النوع، أو نستخدم "ملاحظة" في حالة note
      const defaultTitle = type.toLowerCase() === 'note' ? 'ملاحظة' : type.toUpperCase();
      const displayTitle = cleanTitle ? formatWidgetText(cleanTitle) : defaultTitle;
      
      const cleanBody = body.replace(/^>\s*/gm, '').trim();

      return `
        <div class="callout" style="border-inline-start-color: ${c}; background: ${c}15;">
          <div class="callout-icon" style="color:${c}">${i}</div>
          <div class="callout-content">
            <span class="callout-title" style="color:${c}">${displayTitle}</span>
            <div class="callout-body">${formatWidgetText(cleanBody)}</div>
          </div>
        </div>`;
    });
  }
};