// context/LanguageContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { translations } from '../constants/translations';
import { supabase } from '../config/supabaseClient'; // ✅ استيراد Supabase

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // منع قلب الواجهة (RTL) للحفاظ على التصميم
        if (I18nManager.isRTL) {
            I18nManager.allowRTL(false);
            I18nManager.forceRTL(false);
        }

        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang) {
          setLanguage(savedLang);
        } else {
          // يمكن هنا فحص لغة الجهاز الافتراضية إذا أردت
          setLanguage('en');
        }
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async (newLang) => {
    if (newLang === language) return;

    try {
      // 1. الحفظ محلياً
      await AsyncStorage.setItem('appLanguage', newLang);
      setLanguage(newLang);

      // 2. ✅ الحفظ في الداتابايز (إذا كان المستخدم مسجلاً)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ preferred_language: newLang })
          .eq('id', user.id);
        console.log(`Language updated in DB to: ${newLang}`);
      }

    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  const t = (key, params = {}) => {
    const langData = translations[language] || translations['en'];
    let text = langData[key] || translations['en'][key] || key;
    
    Object.keys(params).forEach(param => {
      text = text.replace(`{{${param}}}`, params[param]);
    });

    return text;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, isRTL, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};
