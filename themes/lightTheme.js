// themes/lightTheme.js

export const lightTheme = {
  name: 'Light Mode',
  colors: {
    // --- Backgrounds ---
    backgroundPrimary: '#F1F5F9',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#E2E8F0',

    // --- Text ---
    textPrimary: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#94A3B8',

    // --- Accents & Actions ---
    accent: '#0F766E',
    accentGradient: ['#0D9488', '#0F766E'],
    primary: '#2563EB',
    primaryGradient: ['#0D9488', '#2563EB'],

    // --- Semantic Colors ---
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',

    // --- Borders & Dividers ---
    border: '#CBD5E1',
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