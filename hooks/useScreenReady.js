// hooks/useScreenReady.js
import { useState, useEffect } from 'react';
import { InteractionManager } from 'react-native';

export const useScreenReady = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // هذه الدالة تنتظر حتى تنتهي جميع التفاعلات والأنيميشن
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });

    // تنظيف في حال تم إغلاق الشاشة قبل الاكتمال
    return () => task.cancel();
  }, []);

  return isReady;
};