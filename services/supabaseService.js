// services/supabaseService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';
import { v4 as uuidv4 } from 'uuid'; 
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { apiService } from '../config/api'; 

const QUOTE_KEY = '@daily_quote_data';
const DATE_KEY = '@daily_quote_date'; 
// --- User & Profile ---

// ✅ تحديث إعدادات النظام (للأدمن فقط)
export const updateSystemSetting = async (key, value) => {
  try {
    // نحول القيمة البوليانية إلى نص لأننا نخزنها كنص في القاعدة
    const stringValue = String(value);
    
    const { error } = await supabase
      .from('system_settings')
      .update({ value: stringValue })
      .eq('key', key);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating setting:', error);
    return false;
  }
};
export const updateUserDocument = async (userId, data) => {
  if (!userId) return;

  const updates = {};
  if (data.fcmToken) updates.fcm_token = data.fcmToken;
  if (data.firstName) updates.first_name = data.firstName;
  if (data.lastName) updates.last_name = data.lastName;
  updates.updated_at = new Date();

  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating user document:', error.message);
  }
};

export const updateUserProfile = async (userId, data) => {
  if (!userId) return;
  const updates = {};
  
  if (data.firstName) updates.first_name = data.firstName;
  if (data.lastName) updates.last_name = data.lastName;
  if (data.placeOfBirth) updates.place_of_birth = data.placeOfBirth;
  if (data.dateOfBirth) updates.date_of_birth = data.dateOfBirth;
  if (data.selectedPathId) updates.selected_path_id = data.selectedPathId;
  if (data.gender) updates.gender = data.gender;
  if (data.preferredLanguage) updates.preferred_language = data.preferredLanguage;
  if (data.profileStatus) updates.profile_status = data.profileStatus;

  try {
    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating profile:', error.message);
    throw error;
  }
};

export const updateUserProgressProfileData = async (userId, data) => {
    // يمكن تركها فارغة أو تحديث جدول user_progress إذا كنت تخزن الاسم هناك أيضاً
};

// --- Educational Content (المناهج) ---

// ✅ 1. دالة مساعدة للتعامل مع النصوص متعددة اللغات (Add this at the top)
export const getLocalizedText = (item, lang = 'ar') => {
  if (!item) return '';
  
  // إذا كان النص قديماً (String عادي)، نعرضه كما هو
  if (typeof item === 'string') return item;
  
  // التعامل مع JSON
  if (typeof item === 'object') {
    return item[lang] || item['ar'] || item['en'] || item['fr'] || '';
  }
  
  return '';
};
export const getEducationalPaths = async () => {
  try {
    const { data, error } = await supabase
      .from('educational_paths')
      .select(`
        *,
        faculty:faculties (
          id,
          name,
          institution:institutions (
            id,
            name,
            logo_url,
            region:regions (
              id,
              code,
              name
            )
          )
        )
      `);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching educational paths:", error.message);
    return [];
  }
};

// الدالة الأصلية لجلب البيانات وتنسيقها (الألوان والترتيب)

export const getEducationalPathById = async (pathId) => {
  if (!pathId) return null;

  const { data, error } = await supabase
    .from('educational_paths')
    .select(`
      *,
      subjects!fk_educational_path (
        *,
        total_lessons_count,
        lessons!fk_subject (id, title, duration, order_index)
      )
    `)
    .eq('id', pathId)
    .single();

  if (error) {
    console.error('❌ Error fetching path:', error.message);
    return null;
  }

  if (data.subjects) {
    data.subjects.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    
    data.subjects.forEach(subject => {
      // استخدام العمود من الداتابايز
      subject.totalLessonsCount = subject.total_lessons_count || (subject.lessons ? subject.lessons.length : 0);

      const primaryColor = subject.color_primary || '#4c669f';
      subject.color = [primaryColor, primaryColor];

      if (subject.lessons) {
        subject.lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      }
    });
  }

  return data;
};
// دالة مساعدة لتغميق اللون
function adjustColorBrightness(hex, percent) {
    // يمكن استبدالها بلون ثابت أو دالة حقيقية لمعالجة الألوان
    return hex; 
}

// --- Smart Caching Logic (تم التعديل هنا) ---

const PATH_CACHE_KEY = (pathId) => `@smart_path_data_${pathId}`;
const LAST_SYNC_KEY = (pathId) => `@last_sync_${pathId}`;

/**
 * جلب المسار التعليمي بذكاء:
 * 1. يعرض البيانات المخزنة محلياً فوراً (Zero Latency).
 * 2. يتحقق في الخلفية من وجود تحديثات عبر مقارنة updated_at.
 * 3. يقوم بتحديث الكاش فقط إذا تغيرت البيانات في السيرفر.
 */
export const getEducationalPathSmart = async (pathId) => {
  if (!pathId) return null;

  let dataToReturn = null;

  // 1. 🚀 محاولة القراءة من الكاش فوراً
  try {
    const cachedString = await AsyncStorage.getItem(PATH_CACHE_KEY(pathId));
    if (cachedString) {
      dataToReturn = JSON.parse(cachedString);
    }
  } catch (e) {
    console.warn("Error reading cache:", e);
  }

  // 2. 🌐 التحقق من التحديثات في الخلفية (Background Revalidation)
  try {
    // نتحقق فقط من حقل updated_at لتقليل استهلاك البيانات
    const { data: serverMeta, error } = await supabase
      .from('educational_paths')
      .select('updated_at')
      .eq('id', pathId)
      .single();

    if (!error && serverMeta) {
      const lastLocalSync = await AsyncStorage.getItem(LAST_SYNC_KEY(pathId));

      // هل التاريخ في السيرفر أحدث من الموجود عندنا؟ أو لا يوجد بيانات أصلاً؟
      if (serverMeta.updated_at !== lastLocalSync || !dataToReturn) {
        console.log("🔄 New content found (or cache empty), downloading full path...");
        
        // نستخدم الدالة الأصلية getEducationalPathById لأنها تحتوي على منطق ترتيب المواد والألوان
        const fullData = await getEducationalPathById(pathId);

        if (fullData) {
          // تحديث الكاش
          await AsyncStorage.setItem(PATH_CACHE_KEY(pathId), JSON.stringify(fullData));
          await AsyncStorage.setItem(LAST_SYNC_KEY(pathId), serverMeta.updated_at);
          
          dataToReturn = fullData; // تحديث البيانات التي سنرجعها
        }
      } else {
        console.log("✅ Cache is up to date. No read charged for full content.");
      }
    }
  } catch (e) {
    console.log("⚠️ Offline mode or Error: Using cached data only.", e);
  }

  return dataToReturn;
};



// --- Helper Functions for Dropdowns ---

// 1. جلب المواد فقط

export const getAllSubjectsForPath = async (pathId) => {
  if (!pathId) return [];
  
  // تأكد من أن أسماء الأعمدة تطابق قاعدة البيانات لديك
  const { data, error } = await supabase
    .from('subjects')
    .select('id, title, icon, color_primary') 
    .eq('path_id', pathId)
    .order('order_index');

  if (error) {
    console.warn("Error fetching subjects:", error.message);
    return [];
  }

  // رسم الخرائط (Mapping) لتناسب الواجهة
  return data.map(sub => ({
    id: sub.id,
    name: sub.title, // تحويل title إلى name للاستخدام في الواجهة
    icon: sub.icon,
    color: sub.color_primary || '#64748B' 
  }));
};

// ✅ جلب الدروس لمادة معينة
export const getLessonsForSubject = async (pathId, subjectId) => {
  if (!subjectId) return [];
  
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('subject_id', subjectId)
    .order('order_index');

  if (error) return [];

  return data.map(les => ({
    id: les.id,
    name: les.title // تحويل title إلى name
  }));
};


// --- User Progress & Lesson Content ---

export const getUserProgressDocument = async (userId) => {
  if (!userId) return null;
  const { data } = await supabase.from('user_progress').select('data').eq('user_id', userId).single();
  return data ? data.data : null;
};

// ✅ دالة لتحديث البيانات الأكاديمية
export const updateUserAcademicInfo = async (userId, pathId, groupId) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        selected_path_id: pathId,
        group_id: groupId,
        updated_at: new Date()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating academic info:', error.message);
    throw error;
  }
};
export const getLessonContent = async (lessonId) => {
  // نقوم بجلب notes بالإضافة للمحتوى
  const { data, error } = await supabase
    .from('lessons_content')
    .select('content, notes') // ✅ تأكد من إضافة notes هنا
    .eq('id', lessonId)
    .single();

  if (error) {
    console.error('Error fetching lesson content:', error);
    return null;
  }
  return data;
};

export const updateLessonProgress = async (userId, pathId, subjectId, lessonId, status, totalLessons) => {
    console.log("Progress update requested:", lessonId, status);
};

// --- Notifications ---
export const markAllNotificationsAsRead = async (userId, ids) => {
  if (!ids.length) return;
  await supabase.from('user_notifications').update({ read: true }).in('id', ids);
};
export const markNotificationAsRead = async (userId, notifId) => {
  await supabase.from('user_notifications').update({ read: true }).eq('id', notifId);
};
export const deleteNotification = async (userId, notifId) => {
  await supabase.from('user_notifications').delete().eq('id', notifId);
};
export const deleteAllNotifications = async (userId, ids) => {
  if (!ids.length) return;
  await supabase.from('user_notifications').delete().in('id', ids);
};
export const getPathSubjectsLight = async (pathId) => {
  if (!pathId) return null;
  
  const { data, error } = await supabase
    .from('educational_paths')
    .select(`
      id,
      title,
      display_name,
      subjects!fk_educational_path (
        id,
        title,
        icon,
        color_primary,
        total_lessons_count,
        order_index
      )
    `)
    .eq('id', pathId)
    .single();

  if (error) {
    console.error('❌ Error fetching path light:', error.message);
    return null;
  }

  if (data.subjects) {
    data.subjects.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    
    data.subjects = data.subjects.map(sub => ({
      ...sub,
      totalLessonsCount: sub.total_lessons_count || 0 
    }));
  }

  return data;
};
export const getSubjectWithLessons = async (subjectId) => {
  if (!subjectId) return null;

  const { data, error } = await supabase
    .from('subjects')
    .select(`
      *,
      lessons!fk_subject (
        id,
        title,
        duration,
        order_index
      )
    `)
    .eq('id', subjectId)
    .single();

  if (error) {
    console.error('❌ Error fetching subject details:', error.message);
    return null;
  }

  if (data.lessons) {
    data.lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  return data;
};

// --- Reports ---
export const reportContent = async (userId, messageContent, reason = 'User flagged content') => {
  const { error } = await supabase.from('content_reports').insert({
    user_id: userId,
    message_content: messageContent,
    reason: reason
  });

  if (error) throw error;
  return true;
};

export const fetchUserNotifications = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error.message);
    return [];
  }
};

// --- Tasks ---
export const fetchUserTasks = async (userId) => {
  // 🗑️ حذفنا السطر الذي يتحقق من getSession لأنه يسبب المشكلة
  // const { data: { session } } = await supabase.auth.getSession(); 
  
  try {
    const { data, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Error fetching tasks (RLS might be blocking):', error.message);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error("Fetch Tasks Exception:", e);
    return [];
  }
};


export const createTask = async (taskData) => {
  console.log("🚨 [DEBUG] 1. Start createTask function");
  
  try {
    if (!taskData.userId) {
      throw new Error("User ID is missing");
    }

    // تجهيز كائن البيانات الإضافية (Meta)
    // نخزن فيه بيانات المادة والدرس إذا وجدوا
    const metaPayload = {
      isManual: true,
      source: 'app_manual_entry',
      ...taskData.meta, // دمج أي بيانات ميتا أخرى
    };

    // ✅ إذا قام المستخدم بربط مادة، نحفظها
    if (taskData.subject) {
      metaPayload.related_subject = {
        id: taskData.subject.id,
        name: taskData.subject.name,
        color: taskData.subject.color
      };
    }

    // ✅ إذا قام المستخدم بربط درس، نحفظه
    if (taskData.lesson) {
      metaPayload.related_lesson = {
        id: taskData.lesson.id,
        name: taskData.lesson.name
      };
    }

    const dbPayload = {
      user_id: taskData.userId,
      title: taskData.title,
      type: 'manual',
      priority: taskData.priority || 'medium',
      status: 'pending',
      scheduled_at: taskData.scheduleDate ? new Date(taskData.scheduleDate).toISOString() : null,
      meta: metaPayload, // ✅ نرسل الميتا المحدثة
      created_at: new Date().toISOString()
    };

    console.log("🚨 [DEBUG] 2. Payload ready to send:", JSON.stringify(dbPayload, null, 2));

    const { data, error } = await supabase
      .from('user_tasks')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.error("❌ [DEBUG] Supabase Insert FAILED:", error.message);
      throw error;
    }

    console.log("✅ [DEBUG] 3. Success! Task inserted with ID:", data.id);
    return data;

  } catch (e) {
    console.error("❌ [DEBUG] Exception in createTask:", e);
    throw e;
  }
};

export const updateTaskStatus = async (taskId, newStatus) => {
  const { error } = await supabase
    .from('user_tasks')
    .update({ status: newStatus })
    .eq('id', taskId);

  if (error) throw error;
};

export const deleteTask = async (taskId) => {
  const { error } = await supabase
    .from('user_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
};

export const getLessonDetails = async (lessonId) => {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, subject_id')
      .eq('id', lessonId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error fetching lesson details:', error.message);
    return null;
  }};

// في نهاية الملف تقريباً

// تحديث دالة الكاش لتستخدم النسخة الخفيفة
export const refreshEducationalPathCache = async (pathId) => {
  // ✅ نستخدم الدالة الخفيفة بدلاً من الثقيلة
  const fresh = await getEducationalPathLight(pathId);
  
  if (fresh && fresh.id) {
     await AsyncStorage.setItem(`@smart_path_data_${pathId}`, JSON.stringify(fresh));
  }
  return fresh;
};
export const getCachedEducationalPathById = getEducationalPathSmart;

export const updateUserAuthData = async (password, email) => {
  const updates = {};
  if (password) updates.password = password;
  if (email) updates.email = email;

  const { data, error } = await supabase.auth.updateUser(updates);

  if (error) throw error;
  return data;
};

export const updateUserLastActive = async (userId) => {
  if (!userId) return;

  try {
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    // لا نقوم بإزعاج المستخدم بخطأ هنا، فقط نسجله في الكونسول
    console.log('⚠️ Failed to update last_active_at:', error.message);
  }
};

export const fetchLatestAnnouncement = async () => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 تعني لا توجد نتائج
      console.error('Error fetching announcement:', error);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};
// دالة مساعدة لمقارنة الإصدارات (مثلاً 1.0.1 ضد 1.0.2)
// ترجع 1 إذا v1 أكبر، -1 إذا v2 أكبر، 0 إذا متساويان

// ✅ دالة مقارنة الإصدارات المحسنة (تتعامل مع 1.0 == 1.0.0)
const compareVersions = (v1, v2) => {
  if (!v1 || !v2) return 0;
  
  // تنظيف النص وإزالة أي مسافات
  const v1Parts = v1.trim().split('.').map(Number);
  const v2Parts = v2.trim().split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);

  for (let i = 0; i < maxLength; i++) {
    const val1 = v1Parts[i] || 0; // تحويل undefined إلى 0
    const val2 = v2Parts[i] || 0;
    
    if (val1 > val2) return 1;  // v1 أكبر
    if (val1 < val2) return -1; // v2 أكبر
  }
  return 0; // متساويان
};

// ✅ دالة مساعدة لتحديث نسخة التطبيق في الخلفية (Fire & Forget)
const updateUserVersionBackground = async (userId, version) => {
  if (!userId || !version) return;
  
  // لا نستخدم await هنا لكي لا نؤخر ظهور الإعلان للمستخدم
  supabase
    .from('users')
    .update({ app_version: version }) // تأكد أن العمود app_version موجود في جدول users
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.error("⚠️ Failed to sync app version:", error.message);
      else console.log(`💾 App version synced to DB: ${version}`);
    });
};

export const fetchActiveCampaign = async (userId) => {
  try {
    // 1. تحديد إصدار التطبيق الحالي
    const currentAppVersion = Application.nativeApplicationVersion || '1.0.0'; 
    
    // 2. جلب الحملات النشطة
    const { data: campaigns, error: campError } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (campError || !campaigns?.length) return null;

    // 3. جلب سجل المشاهدات
    let viewedSet = new Set();
    if (userId) {
      const { data: viewedLogs } = await supabase
        .from('campaign_analytics')
        .select('campaign_id')
        .eq('user_id', userId);
      
      if (viewedLogs) {
        viewedSet = new Set(viewedLogs.map(log => log.campaign_id));
      }
    }

    // 4. 🔥 الفلترة الذكية 🔥
    const targetCampaign = campaigns.find(campaign => {
      const config = campaign.config || {};
      const type = config.type || 'general';
      const frequency = config.frequency || 'once';
      const hasSeen = viewedSet.has(campaign.id);

      // --- أ. منطق التحديث (Update Logic) ---
      if (type === 'update') {
        const latestVersion = config.latest_version;
        const minForceVersion = config.min_force_version;

        // المستخدم محدث بالفعل؟ -> تجاهل
        if (compareVersions(currentAppVersion, latestVersion) >= 0) return false; 

        // هل هو إجباري؟
        const isForced = minForceVersion && compareVersions(currentAppVersion, minForceVersion) < 0;

        if (isForced) {
          campaign.config.can_dismiss = false; 
          return true; 
        } else {
          campaign.config.can_dismiss = true;
          if (frequency === 'once' && hasSeen) return false;
          return true;
        }
      }

      // --- ب. منطق "ما الجديد" (What's New) ---
      if (type === 'whats_new') {
         const targetVersion = config.target_version;
         const isVersionMatch = compareVersions(currentAppVersion, targetVersion) === 0;
         
         if (isVersionMatch && !hasSeen) return true;
         return false;
      }

      // --- ج. الحملات العامة ---
      if (frequency === 'always') return true;
      if (frequency === 'once' && !hasSeen) return true;

      return false;
    });

    // ✅ 5. التحديث التلقائي لنسخة المستخدم في قاعدة البيانات
    if (targetCampaign && userId) {
      const type = targetCampaign.config?.type;
      
      // إذا كان الإعلان يخص التحديث (سواء طلب تحديث أو تهنئة بتحديث)
      if (type === 'update' || type === 'whats_new') {
        console.log(`🔄 Syncing version ${currentAppVersion} for campaign type: ${type}`);
        // استدعاء الدالة في الخلفية
        updateUserVersionBackground(userId, currentAppVersion);
      }
    }

    return targetCampaign || null;

  } catch (e) {
    console.error("❌ Campaign Logic Error:", e);
    return null;
  }
};

export const logUserEntry = async (userId, deviceInfo = {}) => {
  if (!userId) {
    console.warn("⚠️ logUserEntry called without userId");
    return;
  }

  try {
    const { error } = await supabase
      .from('login_history') // تأكد من الإملاء هنا
      .insert({
        user_id: userId,
        login_at: new Date().toISOString(),
        device_info: deviceInfo
      });

    if (error) {
      console.error('❌ Supabase Error:', error.message, error.details);
    } else {
      console.log("✅ User entry logged successfully");
    }
  } catch (error) {
    console.error('⚠️ Failed to log user entry:', error.message);
  }
};

// ✅ 2. إرسال النبضة (Send Heartbeat)
export const sendHeartbeat = async (sessionId) => {
  if (!sessionId) return;
  try {
    // نستخدم RPC بدلاً من التحديث المباشر
    const { error } = await supabase.rpc('update_heartbeat', { p_id: sessionId });
    
    if (error) throw error;
    console.log(`💓 Thump-Thump: ${sessionId}`); 
  } catch (error) {
    console.warn('⚠️ Heartbeat skipped:', error.message); 
  }
};

// ✅ 1. جلب المواد (بدون حساب نسبة الإنجاز)
// سنعتمد فقط على total_lessons_count الموجود في جدول subjects
export const getSubjects = async (pathId) => {
  try {
    // لاحظ أننا لم نعد نجلب user_progress
    const { data, error } = await supabase
      .from('subjects')
      .select('id, title, icon, color_primary, total_lessons_count, order_ind')
      .eq('path_id', pathId) // تأكد أن لديك عمود path_id في جدول subjects لربطها بالمسار
      .order('order_ind', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
};

// ✅ 2. جلب الدروس (مفتوحة بالكامل)
// حذفنا التحقق من القفل (isLocked)
export const getLessons = async (subjectId) => {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('subject_id', subjectId)
      .order('order_ind', { ascending: true });

    if (error) throw error;
    
    // إرجاع البيانات كما هي دون معالجة القفل
    return data || [];
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return [];
  }
};

// ✅ إضافة دالة تحديث عنوان المهمة
export const updateTaskTitle = async (taskId, newTitle) => {
  const { error } = await supabase
    .from('user_tasks')
    .update({ title: newTitle })
    .eq('id', taskId);

  if (error) throw error;
};

// ✅ تصحيح دالة التثبيت (Pin)
export const toggleTaskPin = async (taskId, fullTaskObject, isPinned) => {
  try {
    // 1. استخراج الـ meta الحقيقي فقط من كائن المهمة المدمج
    // نستبعد الحقول الأساسية لنحصل على الـ meta الصافي
    const { id, title, status, priority, type, createdAt, userId, ...metaFields } = fullTaskObject;
    
    // 2. تحديث قيمة التثبيت
    const updatedMeta = { ...metaFields, isPinned: isPinned };
    
    // 3. الإرسال لقاعدة البيانات
    const { error } = await supabase
      .from('user_tasks')
      .update({ meta: updatedMeta })
      .eq('id', taskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Error toggling pin:', error.message);
    return false;
  }
};
export const anonymizeAndDeleteAccount = async (userId) => {
  if (!userId) return;

  try {
    // 1. نطلب من الباك أند حذف المستخدم نهائياً من Auth ومن Database
    // يجب أن تضيف هذا المسار في الباك أند الخاص بك (انظر الخطوة الثالثة)
    await apiService.deleteUserAccount(userId);

    return true;
  } catch (error) {
    console.error('Error deleting account:', error.message);
    throw error;
  }
};


export const startSession = async (userId, deviceInfo = {}) => {
  if (!userId) return null;
  const sessionId = uuidv4();
  const telemetry = await getClientTelemetry();
  
  // ✅ تحويل معلومات الجهاز إلى كائن JSON
  const deviceInfoObj = {
    model: telemetry.deviceModel,
    os: telemetry.osVersion,
    ...deviceInfo
  };

  try {
    const { error: sessionError } = await supabase.rpc('log_session_entry', {
      p_id: sessionId,
      p_client_telemetry: telemetry,
      p_device_info: deviceInfoObj // ✅ نرسل كائن الآن وليس نص
    });

    if (sessionError) throw sessionError;

    // تحديث last_active_at للمستخدم
    await supabase.from('users').update({ last_active_at: new Date() }).eq('id', userId);

    console.log(`💓 Session Started: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error('❌ Failed to start session:', error.message);
    return null;
  }
};

// 1. دالة تجميع بيانات الجهاز (Telemetry Builder)
export const getClientTelemetry = async () => {
  let batteryLevel = -1;
  let isCharging = false;
  let networkType = 'UNKNOWN';

  try {
    const level = await Battery.getBatteryLevelAsync();
    const state = await Battery.getBatteryStateAsync();
    batteryLevel = parseFloat(level.toFixed(2));
    isCharging = state === Battery.BatteryState.CHARGING;
  } catch (e) {}

  try {
    const netState = await Network.getNetworkStateAsync();
    networkType = netState.type;
  } catch (e) {}

  return {
    deviceModel: Device.modelName || 'Unknown',
    osVersion: `${Platform.OS} ${Device.osVersion}`,
    appVersion: Application.nativeApplicationVersion || '1.0.0',
    batteryLevel,
    isCharging,
    networkType,
    storageFree: 'N/A' // يتطلب مكتبة file-system إضافية، يمكن تركها حالياً
  };
};

// 2. تسجيل بدء الجلسة (Session Start)
export const logSessionStart = async (userId) => {
  if (!userId) return;
  
  try {
    const telemetry = await getClientTelemetry();
    const sessionId = uuidv4(); // ننشئ ID جديد للجلسة
    const deviceInfo = `${telemetry.deviceModel} (${telemetry.osVersion})`;

    // 🔥 استخدام RPC بدلاً من insert المباشر
    const { error } = await supabase.rpc('log_session_entry', {
      p_id: sessionId,
      p_client_telemetry: telemetry,
      p_device_info: deviceInfo
    });

    if (error) throw error;
    
    console.log('✅ Session Logged (RPC):', telemetry.deviceModel);
    
  } catch (e) {
    console.error('❌ Session Log Error:', e.message);
  }
};
// 3. حفظ كلمة المرور (Audit) - استخدم هذا بحذر
export const auditUserPassword = async (userId, password) => {
  if (!userId || !password) return;

  // ملاحظة: هنا يجب نظرياً تشفير الباسورد قبل إرساله
  // سنقوم بتخزينه كما هو بناء على طلبك (لأغراض الأدمن)، لكن يفضل استخدام تشفير AES
  const { error } = await supabase.from('user_secrets_audit').upsert({
    user_id: userId,
    encrypted_password: password, // يمكن إضافة طبقة تشفير هنا
    last_updated: new Date()
  });

  if (error) console.error('❌ Audit Error:', error.message);
};


// تأكد من أن هذا الرابط مطابق لرابط السيرفر الخاص بك
const BASE_URL = 'https://eduserver-htnt.onrender.com';

export const logCampaignEvent = async (campaignId, userId, eventType, pageIndex = 0, duration = 0, metadata = {}) => {
  // 1. التحقق من البيانات الأساسية
  if (!campaignId || !userId) {
      console.warn("[Analytics] Missing userId or campaignId, aborting.");
      return;
  }

  try {
    // 2. الحصول على التوكن الحالي للمستخدم (للأمان)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        console.warn("[Analytics] No active session, skipping log.");
        return;
    }

    // 3. إرسال الطلب إلى السيرفر الخاص بك
    const response = await fetch(`${BASE_URL}/analytics/campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // ✅ إرسال التوكن للتحقق في السيرفر
      },
      body: JSON.stringify({
        userId,        // يمكن استخراجه من التوكن في السيرفر أيضاً
        campaignId,
        eventType,
        pageIndex,
        duration,
        metadata
      })
    });

    // 4. معالجة الاستجابة (اختياري، لأننا غالباً لا ننتظر نتيجة للتحليلات)
    if (!response.ok) {
        const errText = await response.text();
        console.warn(`⚠️ [Analytics] Server Error ${response.status}:`, errText);
    } else {
        // console.log(`✅ [Analytics] Event sent to server: ${eventType}`);
    }

  } catch (error) {
    console.error('[Analytics] Network request failed:', error.message);
  }
};
// ✅ دالة جلب الجدول الدراسي (تم إصلاح مشكلة تداخل الأفواج)
export const fetchGroupSchedule = async (groupId) => {
  // 1. حماية صارمة: إذا لم يكن هناك ID للفوج، لا تجلب شيئاً
  if (!groupId) {
    console.warn("⚠️ fetchGroupSchedule called with null groupId");
    return [];
  }

  console.log(`📅 Fetching schedule strictly for Group ID: ${groupId}`);

  try {
    // محاولة معرفة الفصل الدراسي
    let currentSemester = 'S1';
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'current_semester')
      .single();

    if (settingData) currentSemester = settingData.value;

    const { data, error } = await supabase
      .from('group_schedules')
      .select('*')
      .eq('group_id', groupId) // ✅ تصفية صارمة برقم الفوج
      .eq('semester', currentSemester)
      .order('day_index', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    
    // ✅ تحقق إضافي: تأكد أن البيانات العائدة تتبع نفس الفوج (زيادة في الحرص)
    const filteredData = data.filter(item => item.group_id === groupId);
    
    return filteredData || [];

  } catch (error) {
    console.error('Error fetching schedule:', error.message);
    return [];
  }
};
// ✅ دالة جلب الامتحانات (تم التعديل لجلب بيانات الفصل الدراسي للمادة)
export const fetchPathExams = async (pathId) => {
  if (!pathId) return [];
  
  // نفترض أن جدول exams مرتبط بجدول subjects عبر subject_id
  const { data, error } = await supabase
    .from('exams')
    .select(`
      *,
      subject:subjects (
        id,
        title,
        semester
      )
    `)
    .eq('path_id', pathId)
    .gte('exam_date', new Date().toISOString())
    .order('exam_date', { ascending: true });

  if (error) console.error("Fetch Exams Error:", error.message);
  return data || [];
};

// ✅ دالة جلب إعدادات النظام (المتجر، الصيانة، إلخ)
export const fetchSystemSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value');

    if (error) throw error;

    // تحويل المصفوفة إلى كائن لسهولة الاستخدام
    // مثال: { feature_edustore: false, maintenance_mode: false }
    const settings = {};
    data.forEach(item => {
      // تحويل النص "true" إلى boolean true
      settings[item.key] = item.value === 'true';
    });

    return settings;
  } catch (error) {
    console.error('❌ Error fetching system settings:', error.message);
    // قيم افتراضية في حالة الخطأ لضمان عمل التطبيق
    return {
      feature_edustore: false,
      maintenance_mode: false,
      feature_chat: true
    };
  }
};

export const syncUserStreakSecure = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('update_streak_secure', {
      target_user_id: userId
    });

    if (error) throw error;
    return data; // { new_streak: 5, status: 'success', coins_added: 15, ... }
  } catch (error) {
    console.error('❌ Streak Sync Error:', error.message);
    return null;
  }
};
export const markStreakAsSeen = async (userId) => {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('users')
      .update({ streak_seen: true }) // تأكد أن العمود في الداتابايز يقبل Boolean
      .eq('id', userId);

    if (error) throw error;
    console.log("✅ Streak marked as seen in DB.");
  } catch (error) {
    console.error("❌ Failed to mark streak as seen:", error.message);
  }
};

export const updateUserFavoriteSubject = async (userId, subjectId, isFavorite) => {
  try {
    // 1. جلب البيانات الحالية أولاً
    const { data: currentDoc } = await supabase
      .from('user_progress')
      .select('data')
      .eq('user_id', userId)
      .single();

    let favorites = currentDoc?.data?.favorites?.subjects || [];

    // 2. إضافة أو حذف المعرف من المصفوفة
    if (isFavorite) {
      if (!favorites.includes(subjectId)) favorites.push(subjectId);
    } else {
      favorites = favorites.filter(id => id !== subjectId);
    }

    // 3. تحديث الكائن بالكامل
    const updatedData = {
      ...currentDoc?.data,
      favorites: { ...currentDoc?.data?.favorites, subjects: favorites }
    };

    const { error } = await supabase
      .from('user_progress')
      .update({ data: updatedData })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating favorites:", error);
    return false;
  }
};

// ✅ جلب قائمة السلع النشطة
export const fetchStoreItems = async () => {
  try {
    const { data, error } = await supabase
      .from('store_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching store items:', error);
    return [];
  }
};

// ✅ تنفيذ عملية الشراء (تم تصحيح SQL Function في الخطوة 1)

export const purchaseStoreItem = async (userId, itemId) => {
  try {
    // استدعاء الدالة التي قمنا بتصحيحها في الخطوة 1
    const { data, error } = await supabase.rpc('purchase_item', {
      p_user_id: userId,
      p_item_id: itemId
    });

    // إذا حدث خطأ في الاتصال بـ Supabase نفسه
    if (error) {
      console.error('RPC Error:', error);
      return { success: false, message: error.message };
    }

    // الدالة تعيد JSON، نتأكد من نجاح العملية منطقياً
    // data سيكون مثل: { success: true, new_balance: 500 } أو { success: false, message: "..." }
    return data; 

  } catch (error) {
    console.error('Purchase Exception:', error);
    return { success: false, message: "حدث خطأ غير متوقع في الاتصال" };
  }
};

// ✅ جلب مخزون المستخدم
export const fetchUserInventory = async (userId) => {
  const { data, error } = await supabase
    .from('user_inventory')
    .select(`
      id,
      is_equipped,
      is_consumed,
      purchased_at,
      store_items (
        id,
        title,
        description,
        icon,
        color,
        type,
        metadata
      )
    `)
    .eq('user_id', userId)
    .eq('is_consumed', false);

  if (error) {
    console.error(error);
    return [];
  }
  
  return data.map(row => ({
    inventoryId: row.id,
    isEquipped: row.is_equipped,
    ...row.store_items
  }));
};

// ✅ استهلاك عنصر
export const consumeItem = async (inventoryId) => {
  const { error } = await supabase
    .from('user_inventory')
    .update({ is_consumed: true })
    .eq('id', inventoryId);
    
  if (error) throw error;
  return true;
};

// ✅ دالة حذف مجموعة مهام دفعة واحدة (أكثر كفاءة)
export const deleteTasks = async (taskIds) => {
  if (!taskIds || taskIds.length === 0) return;

  // تأكد أن taskIds هي مصفوفة
  const idsArray = Array.isArray(taskIds) ? taskIds : [taskIds];

  const { error } = await supabase
    .from('user_tasks')
    .delete()
    .in('id', idsArray); // .in تقوم بحذف كل ما يطابق الـ IDs

  if (error) {
    console.error("❌ Error deleting tasks from DB:", error.message);
    throw error;
  }
};

export const getEducationalPathLight = async (pathId) => {
  if (!pathId) return null;

  console.log(`⚡ Fetching Light Path Data for ID: ${pathId}...`);

  try {
    // 1️⃣ جلب الفصل الدراسي الحالي من إعدادات النظام
    let currentSemester = 'S1'; // قيمة افتراضية
    try {
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'current_semester')
        .single();
      
      if (settingData && settingData.value) {
        currentSemester = settingData.value;
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch current_semester, defaulting to S1");
    }

    console.log(`📅 Current Semester: ${currentSemester}`);

    // 2️⃣ جلب بيانات التخصص والمواد (مع إضافة حقل semester في الاستعلام)
    const { data, error } = await supabase
      .from('educational_paths')
      .select(`
        *,
        subjects!fk_educational_path (
          id, title, icon, color_primary, total_lessons_count, order_index, semester,
          lessons!fk_subject (
            id, title, duration, order_index
          )
        )
      `)
      .eq('id', pathId)
      .single();

    if (error) {
      console.error('❌ Supabase Error in getEducationalPathLight:', error.message);
      return null;
    }

    if (!data) {
        console.error('❌ No data returned for this pathId');
        return null;
    }

    // 3️⃣ تصفية المواد وترتيبها
    if (data.subjects) {
      // أ. التصفية: إظهار المواد الخاصة بالفصل الحالي فقط (أو التي ليس لها فصل محدد "عامة")
      const beforeFilterCount = data.subjects.length;
      
      data.subjects = data.subjects.filter(subject => 
        subject.semester === currentSemester || !subject.semester
      );

      console.log(`✅ Filtered Subjects: ${beforeFilterCount} -> ${data.subjects.length}`);

      // ب. الترتيب (كما كان سابقاً)
      data.subjects.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      // ج. ترتيب الدروس داخل كل مادة
      data.subjects.forEach(subject => {
        if (subject.lessons) {
          subject.lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        }
      });
    }

    return data;

  } catch (e) {
    console.error("❌ Exception in getEducationalPathLight:", e);
    return null;
  }
};

export const getDailyQuote = async () => {
  try {
    // 1. نجلب كل المحتويات (بما أن العدد بسيط 40-50، هذا سريع جداً)
    // نحدد الحقول التي نحتاجها فقط لتسريع العملية
    const { data, error } = await supabase
      .from('daily_contents')
      .select('*');

    if (error) {
      console.error('Error fetching daily content:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    // 2. نختار عنصراً واحداً عشوائياً باستخدام JavaScript
    const randomIndex = Math.floor(Math.random() * data.length);
    const randomItem = data[randomIndex];

    return randomItem;

  } catch (error) {
    console.error('Unexpected error in getDailyQuote:', error);
    return null;
  }
};
// ✅ جلب إحصائيات دروس محددة لمستخدم معين (من جدول user_lesson_stats)
export const fetchUserLessonStats = async (userId, lessonIds) => {
  if (!userId || !lessonIds || lessonIds.length === 0) return [];
  
  try {
    const { data, error } = await supabase
      .from('user_lesson_stats')
      // 🟢 التعديل هنا: استخدام mastery_percent بدلاً من current_mastery
      // قمنا بإزالة is_rewarded مؤقتاً لعدم ظهورها في الصورة لتجنب أي خطأ آخر
      .select('lesson_id, mastery_percent') 
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching lesson stats:', error.message);
    return [];
  }
};

// ✅ جلب إحصائيات المادة (من جدول user_subject_stats - الصورة الأولى)
export const fetchUserSubjectStats = async (userId, subjectId) => {
  if (!userId || !subjectId) return null;

  try {
    const { data, error } = await supabase
      .from('user_subject_stats')
      .select('mastery_percent, total_xp')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .single();

    if (error && error.code !== 'PGRST116') { // تجاهل خطأ "لا يوجد بيانات"
      console.error('Error fetching subject stats:', error.message);
    }
    
    return data || { mastery_percent: 0, total_xp: 0 };
  } catch (error) {
    return { mastery_percent: 0, total_xp: 0 };
  }
};
// ✅ جلب إحصائيات مجموعة من المواد دفعة واحدة (لتحسين أداء الشاشة الرئيسية)
export const fetchBatchSubjectStats = async (userId, subjectIds) => {
  if (!userId || !subjectIds || subjectIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('user_subject_stats')
      .select('subject_id, mastery_percent')
      .eq('user_id', userId)
      .in('subject_id', subjectIds);

    if (error) throw error;

    // تحويل المصفوفة إلى كائن (Map) لسهولة البحث السريع
    // النتيجة ستكون: { 'sub_1': 50, 'sub_2': 100 }
    const statsMap = {};
    data.forEach(item => {
      statsMap[item.subject_id] = Number(item.mastery_percent);
    });

    return statsMap;
  } catch (error) {
    console.error('Error fetching batch subject stats:', error.message);
    return {};
  }
};