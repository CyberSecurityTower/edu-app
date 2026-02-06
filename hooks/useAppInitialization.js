// hooks/useAppInitialization.js
import { useState, useEffect, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ استيراد

const LOADING_TIMEOUT_MS = 12000;

// مفاتيح الكاش التي نريد تدميرها عند الفشل (يجب أن تطابق الموجودة في AppStateContext)
const CACHE_KEYS_TO_CLEAR = [
  '@user_tasks_v2',
  '@user_progress_v2',
  '@user_notifications',
  '@user_profile_v5', // نمسح البروفايل المحفوظ لكن Supabase Auth سيعيد جلبه
  // لا تمسح مفاتيح Supabase Auth لكي لا يسجل خروج
];

export function useAppInitialization() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // ✅ تعديل دالة retry لتقبل خيار مسح الكاش
  const retry = useCallback(async (hardReset = false) => {
    setIsReady(false);
    setInitError(null);

    if (hardReset) {
      console.log("🧹 Performing Hard Reset: Clearing Cache...");
      try {
        await AsyncStorage.multiRemove(CACHE_KEYS_TO_CLEAR);
        console.log("✅ Cache Cleared.");
      } catch (e) {
        console.error("Failed to clear cache:", e);
      }
    }

    // زيادة المفتاح لإعادة تشغيل الـ Effect
    setRetryKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();

        const loadResources = async () => {
          await Font.loadAsync({
            ...FontAwesome5.font,
            ...Ionicons.font,
            ...MaterialCommunityIcons.font,
          });
          apiService.wakeUp().catch(() => {});
          return true;
        };

        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), LOADING_TIMEOUT_MS);
        });

        await Promise.race([loadResources(), timeoutPromise]);

        if (isMounted) setIsReady(true);
        
      } catch (e) {
        if (isMounted) {
          console.error("Initialization Failed:", e);
          if (e.message === 'TIMEOUT_EXCEEDED') {
            setInitError({ 
              title: "استغرق الوقت طويلاً", 
              message: "الاتصال بطيء. يرجى التحقق من الشبكة." 
            });
          } else {
            setInitError({ 
              title: "خطأ في التشغيل", 
              message: "حدث خطأ غير متوقع. حاول مرة أخرى." 
            });
          }
          await SplashScreen.hideAsync();
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    prepare();

    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, [retryKey]);

  return { isReady, initError, retry };
}