import React, { useRef } from 'react';
import { View, PanResponder } from 'react-native';
import AnalyticsService from '../services/AnalyticsService';
import { useAppState } from '../context/AppStateContext';

// إعدادات الحساسية
const RAGE_THRESHOLD = 4; // 4 نقرات
const TIME_WINDOW = 600;  // خلال 600 ميلي ثانية
const DISTANCE_LIMIT = 30; // في دائرة قطرها 30 بكسل

export const GlobalTouchListener = ({ children }) => {
  const { user } = useAppState();
  const tapsQueue = useRef([]);

  const panResponder = useRef(
    PanResponder.create({
      // نستخدم Capture لنلتقط الحدث قبل أي زر آخر، لكن نرجع false لنسمح للزر بالعمل
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
        const now = Date.now();

        // تنظيف الطابور من النقرات القديمة
        tapsQueue.current = tapsQueue.current.filter(t => now - t.time < TIME_WINDOW);

        // إضافة النقرة الحالية
        tapsQueue.current.push({ x: pageX, y: pageY, time: now });

        // التحقق من شرط "الغضب"
        if (tapsQueue.current.length >= RAGE_THRESHOLD) {
          // التأكد أن النقرات في نفس المكان تقريباً
          const firstTap = tapsQueue.current[0];
          const isConcentrated = tapsQueue.current.every(t => 
            Math.abs(t.x - firstTap.x) < DISTANCE_LIMIT && 
            Math.abs(t.y - firstTap.y) < DISTANCE_LIMIT
          );

          if (isConcentrated && user?.uid) {
            console.log("🤬 Rage Tap Detected!");
            
            AnalyticsService.logEvent('ux_rage_tap', user.uid, {
              coordinates: `${Math.round(pageX)},${Math.round(pageY)}`,
              tap_count: tapsQueue.current.length,
              // يمكن هنا إضافة اسم الشاشة الحالية إذا كنت تستخدم React NavigationRef
            });
            
            // تفريغ الطابور لمنع تكرار الحدث لنفس النوبة
            tapsQueue.current = [];
          }
        }
        
        return false; // اسمح للحدث بالمرور للعناصر التحتية
      }
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};