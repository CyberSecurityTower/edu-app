// themes/defaultTheme.js

export const defaultTheme = {
  name: 'Default Dark',
  colors: {
    // --- Backgrounds ---
    backgroundPrimary: '#0C0F27',    // اللون الرئيسي للخلفية
    backgroundSecondary: '#1E293B', // لون الكروت والقوائم
    backgroundTertiary: '#0F172A',   // لون أغمق قليلاً للكروت الداخلية

    // --- Text ---
    textPrimary: '#FFFFFF',         // النص الأبيض الأساسي
    textSecondary: '#a7adb8ff',      // النص الرمادي الفاتح
    textMuted: '#6B7280',           // النص الرمادي المعتم

    // --- Accents & Actions ---
    accent: '#10B981',              // اللون الأخضر المميز
    accentGradient: ['#34D399', '#10B981'],
    primary: '#3B82F6',             // اللون الأزرق الأساسي
    primaryGradient: ['#10B981', '#3B82F6'],

    // --- Semantic Colors ---
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#EF4444',
    info: '#60A5FA',

    // --- Borders & Dividers ---
    border: '#334155',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radii: {
    sm: 8,
    md: 16,
    lg: 24,
    full: 999,
  },
  typography: {
    header: {
      fontSize: 28,
      fontWeight: 'bold',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    body: {
      fontSize: 16,
    },
  },
};