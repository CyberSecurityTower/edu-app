import { useEffect, useRef } from 'react';
import AnalyticsService from '../services/AnalyticsService';

export const usePageTracking = (screenName, userId, additionalData = {}) => {
  const startTime = useRef(Date.now());

  useEffect(() => {
    // 1. تسجيل الدخول للشاشة
    AnalyticsService.logEvent('screen_view', userId, {
      screen_name: screenName,
      ...additionalData
    });

    return () => {
      // 2. تسجيل الخروج وحساب المدة عند مغادرة الشاشة
      const duration = Date.now() - startTime.current;
      AnalyticsService.logEvent('screen_exit', userId, {
        screen_name: screenName,
        duration_ms: duration,
        ...additionalData
      });
    };
  }, []);
};