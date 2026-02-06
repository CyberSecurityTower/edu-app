
// services/PushSetup.js
import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabaseClient';
import { notificationService } from './notificationService';

export const setupPushNotifications = async (userId) => {
  if (!userId) return;

  try {
    // 1. الحصول على Expo Token
    const token = await notificationService.registerForPushNotificationsAsync();
    
    if (token) {
      // 2. تخزين التوكن في Supabase
      // ملاحظة: تأكد من تغيير اسم العمود في جدول users إلى expo_push_token أو generic push_token
      const { error } = await supabase
        .from('users')
        .update({ fcm_token: token }) // يفضل تغيير اسم العمود في القاعدة إلى push_token لاحقاً
        .eq('id', userId);

      if (error) console.error("Error saving push token:", error);
      else console.log("Push token saved to Supabase");
    }
  } catch (error) {
    console.error('Error configuring Push Notifications:', error);
  }
};

// الاستماع للنقر على الإشعار (للتعامل مع التوجيه)
export const setupNotificationListeners = (onNotificationClick) => {
  // عندما يتم استقبال إشعار والتطبيق مفتوح
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification Received in Foreground:', notification);
  });

  // عندما يضغط المستخدم على الإشعار
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification Clicked:', data);
    if (onNotificationClick) {
      onNotificationClick(data);
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};