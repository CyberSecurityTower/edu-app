import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import { v4 as uuidv4 } from 'uuid';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { supabase } from '../config/supabaseClient'; // لجلب التوكن
import { apiService } from '../config/api'; // لجلب رابط السيرفر الأساسي

// مفاتيح التخزين المحلي
const QUEUE_KEY = '@telemetry_queue_v3';
const SESSION_KEY = '@telemetry_session_id';

// تجميع الرابط النهائي (تأكد أن apiService.BASE_URL معرف لديك)
// أو يمكنك وضع الرابط المباشر هنا: 'https://eduserver-htnt.onrender.com/telemetry/ingest'
const INGEST_ENDPOINT = '/telemetry/ingest'; 
// ملاحظة: سنستخدم الرابط الكامل داخل دالة fetch أدناه

class AnalyticsService {
  constructor() {
    this.queue = [];
    this.isFlushing = false;
    this.sessionId = null;
    this.initSession();
  }

  // 1. تهيئة الجلسة واسترجاع البيانات القديمة
  async initSession() {
    try {
      let sid = await AsyncStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = uuidv4();
        await AsyncStorage.setItem(SESSION_KEY, sid);
      }
      this.sessionId = sid;

      const savedQueue = await AsyncStorage.getItem(QUEUE_KEY);
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
      }
    } catch (e) {
      console.warn("[Analytics] Init Error", e);
    }
  }

  // 2. جمع المعلومات السياقية (السياق البيئي)
  async getContext() {
    let networkType = 'UNKNOWN';
    let batteryLevel = -1;
    let isCharging = false;

    try {
      const net = await Network.getNetworkStateAsync();
      networkType = net.type;
      
      const bat = await Battery.getBatteryLevelAsync();
      batteryLevel = parseFloat(bat.toFixed(2));
      
      const batState = await Battery.getBatteryStateAsync();
      isCharging = batState === Battery.BatteryState.CHARGING;
    } catch (e) {
      // تجاهل الأخطاء لعدم تعطيل التطبيق
    }
    
    return {
      network: networkType,
      battery_level: batteryLevel,
      is_charging: isCharging,
      app_state: AppState.currentState
    };
  }

  // 3. تسجيل الحدث (يضاف للطابور محلياً)
  async logEvent(eventName, userId, payload = {}, priority = 'normal') {
    if (!userId) return; // لا نسجل أحداث بدون مستخدم

    const context = await this.getContext();
    
    const event = {
      event_id: uuidv4(),
      event_name: eventName,
      user_id: userId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      app_version: Constants.expoConfig?.version || '1.0.0',
      device_info: {
        platform: Device.osName,
        model: Device.modelName,
        os_ver: Device.osVersion
      },
      context: context,
      payload: payload
    };

    // إضافة للطابور
    this.queue.push(event);
    
    // حفظ سريع (Fire & Forget)
    this.persistQueue().catch(() => {});

    // قواعد الإرسال الذكي (Smart Flushing Rules)
    if (priority === 'critical') {
      this.flush(); // إرسال فوري للطوارئ
    } else if (context.network === Network.NetworkStateType.WIFI && this.queue.length >= 10) {
      this.flush(); // إرسال عند الامتلاء على الواي فاي
    }
  }

  // 4. حفظ الطابور
  async persistQueue() {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  // 5. الإرسال للسيرفر (تنفيذ الـ API Contract)
  async flush() {
    // منع التداخل: إذا كان يرسل حالياً أو الطابور فارغ، توقف
    if (this.isFlushing || this.queue.length === 0) return;
    
    this.isFlushing = true;
    
    // أخذ نسخة من البيانات للإرسال
    const batchToSend = [...this.queue];
    
    try {
      // جلب التوكن للمصادقة (Bearer Token Requirement)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.log("[Analytics] No token found, pausing sync.");
        this.isFlushing = false;
        return;
      }

      // بناء الرابط الكامل (استبدل بالجزء الخاص بك من config/api.js إذا أردت)
      // هنا سأفترض أنك تحتاج كتابة الرابط الأساسي يدوياً أو استيراده
      const BASE_URL = 'https://eduserver-htnt.onrender.com'; 
      const FULL_URL = `${BASE_URL}${INGEST_ENDPOINT}`;

      const response = await fetch(FULL_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ تنفيذ شرط الـ Auth
        },
        body: JSON.stringify(batchToSend) // ✅ إرسال المصفوفة مباشرة كما طلبوا
      });

      if (response.ok) {
        // إذا نجح الإرسال، نحذف العناصر المرسلة فقط من الطابور الأصلي
        this.queue = this.queue.filter(e => !batchToSend.includes(e));
        await this.persistQueue();
        console.log(`📡 [Telemetry] Flushed ${batchToSend.length} events.`);
      } else {
        const errText = await response.text();
        console.warn(`⚠️ [Telemetry] Server Error ${response.status}:`, errText);
      }
    } catch (error) {
      console.warn("⚠️ [Telemetry] Network fail, retrying later.", error.message);
    } finally {
      this.isFlushing = false;
    }
  }
}

// تصدير نسخة واحدة (Singleton)
export default new AnalyticsService();