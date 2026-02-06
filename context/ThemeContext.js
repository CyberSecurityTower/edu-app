// context/ThemeContext.js
import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../themes'; // استيراد الثيمات

const THEME_STORAGE_KEY = '@app-theme';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState('default'); // اسم الثيم الحالي

  // تحميل الثيم المحفوظ عند بدء تشغيل التطبيق
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && themes[savedTheme]) {
          setThemeName(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme from storage', error);
      }
    };
    loadTheme();
  }, []);

  // دالة لتبديل الثيم وحفظه
  const switchTheme = async (name) => {
    if (themes[name]) {
      setThemeName(name);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
      } catch (error) {
        console.error('Failed to save theme to storage', error);
      }
    }
  };

  const currentTheme = themes[themeName];

  const value = useMemo(() => ({
    theme: currentTheme,
    themeName,
    switchTheme,
  }), [currentTheme, themeName]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};