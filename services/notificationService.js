// services/notificationService.js
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. إعداد السلوك
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  
  async registerForPushNotificationsAsync() {
    let token;

     if (Platform.OS === 'android') {
      // ✅ التأكد من إنشاء القناة هنا أيضاً لضمان وجودها
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'notification.mp3', // ✅ الصوت هنا
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('❌ يرجى تفعيل الإشعارات!');
        return null;
      }

      const YOUR_PROJECT_ID = "2c0c9221-7057-4dea-a0ec-47da1105d893";

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: YOUR_PROJECT_ID, 
        });
        token = tokenData.data;
        console.log('🔥 EXPO PUSH TOKEN:', token);
      } catch (e) {
        console.error('❌ Error fetching token:', e);
      }
    }

    return token;
  }

async scheduleTaskNotification(task) {
    if (!task.scheduleDate || new Date(task.scheduleDate) <= new Date()) return null;
    
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "حان وقت الدراسة! 📚",
          body: `مهمتك: ${task.title}`,
          sound: 'notification.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX, // ✅ أضف هذا السطر لفرض ظهور البانر
          data: { taskId: task.id, type: 'task_reminder' },
        },
        trigger: { date: new Date(task.scheduleDate) },
      });
      return id;
    } catch (error) {
      console.error("Failed to schedule:", error);
      return null;
    }
}

  async cancelNotification(id) {
    if (!id) return;
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export const notificationService = new NotificationService();
export default notificationService;