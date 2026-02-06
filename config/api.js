// config/api.js
import { supabase } from './supabaseClient';

// رابط السيرفر الخاص بك من Render
export const BASE_URL = 'https://eduserver-htnt.onrender.com';

// دالة مساعدة لجلب الهيدر مع التوكن (Global Authorization)
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '' // إرسال التوكن أو نص فارغ
  };
};

export const apiService = {
   // ✅ 2. [NEW] دالة مساعدة يحتاجها الـ Hook لجلب التوكن فقط
  getToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  },
  
  // ✅ 3. تصدير الرابط الأساسي (مفيد إذا أردت تغييره مستقبلاً في مكان واحد)
  BASE_URL: BASE_URL,
  // ==========================================================
  // 1. Authentication & Account Management
  // ==========================================================

  // ✅ [NEW] التحقق من وجود الإيميل (للمرحلة الأولى من التسجيل)
  checkEmail: async (email) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Check failed');
      
      return data; // { exists: true/false }
    } catch (error) {
      console.error("Check Email API Error:", error);
      throw error;
    }
  },

  // ✅ [UPDATED] بدء التسجيل (إرسال OTP)
  initiateSignup: async (email, password, firstName, lastName) => {
    const response = await fetch(`${BASE_URL}/auth/initiate-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Signup initiation failed');
    return data;
  },
// أضف هذه الدالة داخل كائن apiService
renameSource: async (sourceId, newName) => {
    const token = await apiService.getToken();
    const response = await fetch(`${apiService.BASE_URL}/sources/${sourceId}/rename`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newName })
    });
    return await response.json();
},
  // إكمال التسجيل (بعد إدخال OTP)
  completeSignup: async (payload) => {
    const response = await fetch(`${BASE_URL}/auth/complete-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Signup completion failed');
    return data;
  },

  // التحقق من OTP التسجيل (إذا كان منفصلاً)
  verifySignupOtp: async (email, token, telemetry) => {
    const response = await fetch(`${BASE_URL}/auth/verify-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, client_telemetry: telemetry })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'فشل التحقق من الرمز');
    return data; 
  },

  // إعادة إرسال OTP التسجيل
  resendSignupOtp: async (email) => {
    const response = await fetch(`${BASE_URL}/auth/resend-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'فشل إعادة الإرسال');
    return true;
  },

  // طلب استعادة كلمة المرور
  requestPasswordReset: async (email, telemetry) => {
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, client_telemetry: telemetry })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'فشل إرسال الرمز');
    return data;
  },

  // التحقق من رمز استعادة كلمة المرور
  verifyRecoveryOtp: async (email, token, telemetry) => {
    const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, client_telemetry: telemetry })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'الرمز غير صحيح');
    return data; 
  },

  // تعيين كلمة المرور الجديدة
  resetPassword: async (accessToken, newPassword, telemetry) => {
    const response = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        accessToken, 
        newPassword, 
        client_telemetry: telemetry 
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'فشل تعيين كلمة المرور');
    return data;
  },

  // تحديث كلمة المرور (للمستخدم المسجل دخول)
  updatePassword: async (userId, newPassword, telemetry) => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) throw new Error("No active session");

    const response = await fetch(`${BASE_URL}/auth/update-password`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 
        userId, 
        newPassword, 
        client_telemetry: telemetry 
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'فشل تحديث كلمة المرور');
    return data;
  },

  // حذف الحساب
  deleteUserAccount: async (userId) => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) throw new Error("لا يوجد جلسة نشطة.");

    const response = await fetch(`${BASE_URL}/auth/delete-account`, {
      method: 'DELETE',
      headers: headers,
      body: JSON.stringify({ userId })
    });

    const text = await response.text();
    try {
        const data = JSON.parse(text);
        if (!response.ok) throw new Error(data.message || data.error || 'فشل حذف الحساب');
        return true;
    } catch (e) {
        console.error("❌ Server Error Response:", text); 
        throw new Error("حدث خطأ في الاتصال بالسيرفر.");
    }
  },

  // ==========================================================
  // 2. Analytics & Session
  // ==========================================================

  sendHeartbeat: async (sessionId) => {
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;

      const response = await fetch(`${BASE_URL}/analytics/heartbeat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) console.warn(`⚠️ Heartbeat failed: ${response.status}`);
      else console.log(`💓 Thump-Thump: ${sessionId}`);
    } catch (e) {
      console.warn("⚠️ Heartbeat network error");
    }
  },

  logSessionStart: async (userId, telemetry) => {
    try {
      await fetch(`${BASE_URL}/log-session-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, client_telemetry: telemetry })
      });
      console.log("📡 Session logged to backend");
    } catch (e) {
      console.warn("⚠️ Failed to log session:", e);
    }
  },

  logEvent: async (userId, eventName, eventData) => {
    console.log(`[Event Logged] ${eventName}`, eventData);
    // يمكنك إضافة استدعاء للسيرفر هنا إذا كنت تخزن الأحداث في قاعدة البيانات
    return true;
  },

  wakeUp: async () => {
    try {
      await fetch(`${BASE_URL}/health`, { method: 'GET' });
      return true;
    } catch (e) {
      return false;
    }
  },

  // ==========================================================
  // 3. Tasks & Features
  // ==========================================================

  getDailyTasks: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/get-daily-tasks?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.error("GET Tasks Error:", error);
      return [];
    }
  },

  updateDailyTasks: async (userId, updatedTasks) => {
    try {
      const { data: currentData } = await supabase
        .from('user_progress')
        .select('data')
        .eq('user_id', userId)
        .single();

      const progressData = currentData?.data || {};
      const newData = {
        ...progressData,
        dailyTasks: { tasks: updatedTasks, lastUpdated: new Date().toISOString() }
      };

      const { error } = await supabase
        .from('user_progress')
        .upsert({ user_id: userId, data: newData, updated_at: new Date() });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Supabase Task Update Error:", error.message);
      throw error;
    }
  },

  generateDailyTasks: async (userId, pathId) => {
    try {
      const response = await fetch(`${BASE_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pathId, context: "daily_plan" })
      });

      if (!response.ok) throw new Error(`Server Error: ${response.status}`);
      const data = await response.json();
      const newTasks = data.tasks || [];

      // تحديث Supabase (اختياري، لأن الباك اند قد يقوم بذلك)
      const { data: currentData } = await supabase
        .from('user_progress')
        .select('data')
        .eq('user_id', userId)
        .single();

      const updatedData = {
        ...(currentData?.data || {}),
        dailyTasks: { tasks: newTasks, lastUpdated: new Date().toISOString() }
      };

      await supabase
        .from('user_progress')
        .upsert({ user_id: userId, data: updatedData, updated_at: new Date() });

      return { success: true, tasks: newTasks };
    } catch (error) {
      console.error("❌ AI Generation Failed:", error);
      throw error;
    }
  },

  // ==========================================================
  // 4. Streak & Rewards
  // ==========================================================

  getStreakStatus: async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return null;

      const response = await fetch(`${BASE_URL}/streak/status`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("❌ Get Streak Status Error:", error);
      return null;
    }
  },

  dailyCheckIn: async () => {
    console.log("🚀 [STREAK_DEBUG] Starting dailyCheckIn...");
    try {
      const headers = await getAuthHeaders(); 
      if (!headers.Authorization) {
        console.error("❌ No Auth Token found!");
        return null;
      }

      const response = await fetch(`${BASE_URL}/streak/check-in`, {
        method: 'POST',
        headers: headers
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("❌ Failed to parse JSON response:", text);
        return null;
      }
      
      if (response.ok) return data;
      
      if (data.status === 'already_claimed') {
        return { ...data, success: true, already_claimed: true };
      }
      
      throw new Error(data.message || 'Check-in failed');
    } catch (error) {
      console.error("❌ Streak Check-in Network Error:", error);
      return null; 
    }
  },

  // ==========================================================
  // 5. Wallet & Store
  // ==========================================================

  getWalletBalance: async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/wallet/balance`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) throw new Error('Failed to fetch balance');
      return await response.json();
    } catch (error) {
      console.error("❌ Wallet Balance Error:", error);
      throw error;
    }
  },

  spendCoins: async (itemType, itemId, cost) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/wallet/spend`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ item_type: itemType, item_id: itemId, cost: cost })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
          if (response.status === 402) throw new Error("INSUFFICIENT_FUNDS");
          throw new Error(data.error || 'Purchase failed');
      }
      return data;
    } catch (error) {
      console.error("❌ Spend Coins Error:", error);
      throw error;
    }
  },

  // ==========================================================
  // 6. Chat & AI
  // ==========================================================

  getChatSuggestions: async (userId, context = {}) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/generate-chat-suggestions`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ userId, context })
      });
      if (!response.ok) throw new Error('Server responded with error');
      const data = await response.json();
      
      if (data && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        return { suggestions: data.suggestions };
      }
      throw new Error('Empty suggestions');
    } catch (error) {
      return { suggestions: ["لخص لي الدرس", "أعطني كويز سريع", "اشرح لي أصعب نقطة"] };
    }
  },
 // ✅ [NEW] دالة GET عامة (ضرورية لـ ChatContext)
  get: async (endpoint, params = {}) => {
    const headers = await getAuthHeaders();
    
    // تحويل الباراميترز إلى Query String
    const queryString = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GET Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  },

  // ✅ [NEW] دالة POST عامة (ضرورية لـ ChatContext)
  post: async (endpoint, body) => {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      // محاولة استخراج رسالة خطأ مفيدة
      throw new Error(data.reply || data.error || data.message || `POST Error ${response.status}`);
    }
    return data;
  },
  getInteractiveChatReply: async (payload, signal) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/chat/process`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        let customErrorMessage = `Server Error: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson && errorJson.reply) customErrorMessage = errorJson.reply;
        } catch (e) {}
        throw new Error(customErrorMessage);
      }

      const data = await response.json();
      if (!data || (!data.reply && !data.widgets)) {
        throw new Error("Invalid response format from server");
      }
      return data;
    } catch (error) {
      console.error("❌ Chat API Exception:", error);
      throw error;
    }
  },
  // ==========================================================
  // 9. Source Management & Advanced Store (V2.0) 📂
  // ==========================================================

  /**
   * 1. حذف عنصر من المكتبة (للمشتريات)
   */
  deleteInventoryItem: async (itemId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/store/inventory/${itemId}`, {
      method: 'DELETE',
      headers: headers
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to remove item');
    return true;
  },

  /**
   * 2. جلب المنتجات المتاحة فقط (غير المملوكة)
   * GET /api/store/available
   */
  fetchAvailableStoreItems: async (filters = {}) => {
    try {
      const headers = await getAuthHeaders();
      const queryString = Object.keys(filters)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');
        
      const response = await fetch(`${BASE_URL}/store/available?${queryString}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) throw new Error('Failed to fetch available items');
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("🛒 Fetch Available Error:", error);
      return [];
    }
  },

  /**
   * 3. جلب المكتبة الشاملة (ملفات المستخدم المرفوعة)
   * GET /api/sources/my-library
   */
  /**
   * جلب المكتبة الشاملة (ملفات المستخدم المرفوعة + المشتريات)
   * يقوم بتهيئة البيانات لتتوافق مع الواجهة
   */
  fetchUserLibrarySources: async () => {
    try {
      const headers = await getAuthHeaders();
      const url = `${BASE_URL}/sources/my-library`; 
      const response = await fetch(url, { method: 'GET', headers });

      if (!response.ok) return [];

      const data = await response.json();
      
      return (data.sources || []).map(source => ({
        ...source,
        id: source.id,
        folder_id: source.folder_id || null,
        title: source.title || source.file_name || source.name,
        type: source.file_type || source.type || 'file',
        thumbnail_url: source.thumbnail_url || source.thumbnail || null,
        created_at: source.created_at || source.purchased_at,
        is_upload: source.is_upload !== false, 
        is_inventory: !!source.item_id,
        // ✅ حقل مهم جداً للفلترة
        lesson_ids: source.lesson_ids || [] 
      }));
    } catch (error) {
      console.error("📂 Sources Network Error:", error);
      return [];
    }
  },
 // ✅ [NEW] دالة لجلب الدروس لمادة معينة
  getLessons: async (subjectId) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${BASE_URL}/educational/lessons?subjectId=${subjectId}`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.lessons || [];
    } catch (e) {
        console.error("Fetching lessons failed:", e);
        return [];
    }
  },

updateFolder: async (folderId, name, color) => {
    try {
        const headers = await getAuthHeaders(); // استخدام الهيدر الصحيح
        const metadata = { color, icon: 'folder' }; 
        
        const response = await fetch(`${BASE_URL}/folders/${folderId}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ name, metadata })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Update failed');
        }
        
        return data.folder; // تأكد أن الباك إند يعيد { folder: ... }
    } catch (error) {
        console.error("📂 Update Folder Error:", error); // طباعة الخطأ للتتبع
        throw error;
    }
},
 
  // ✅ [NEW] ربط ملف (مرفوع أو مشترى) بمواد ودروس
  linkSourceToContext: async (sourceId, lessonIds = [], subjectIds = []) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/sources/link`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          sourceId,     // UUID
          lessonIds,    // Array of Strings
          subjectIds    // Array of Strings
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Linking failed');
      return data;
    } catch (error) {
      console.error("🔗 Linking Error:", error);
      throw error;
    }
  },
// ==========================================================
  // 8. EduStore V1.1 (The New Core) 🛒
  // ==========================================================

  /**
   * 1. جلب المنتجات (المتجر)
   * يدعم الفلترة حسب المسار، المادة، أو الفئة.
   * @param {Object} filters - { pathId, subjectId, category, page, limit }
   */
  fetchStoreItems: async (filters = {}) => {
    try {
      const headers = await getAuthHeaders();
      const queryString = Object.keys(filters)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');

      // ✅ التصحيح:
      const url = `${BASE_URL}/store/items${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, { method: 'GET', headers: headers });

      if (!response.ok) throw new Error('Failed');
      
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("🛒 Store Fetch Error:", error);
      return [];
    }
  },

  fetchLibraryStats: async () => {
    try {
      const headers = await getAuthHeaders(); // استخدام الهيدر الموحد
      const response = await fetch(`${BASE_URL}/library/stats`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.stats; // يُرجع كائن الإحصائيات
    } catch (error) {
      console.error("Error fetching library stats:", error);
      return null;
    }
  },

  // ==========================================================
  // 10. EduDrive V2.0 (Folders & Organization) 📂
  // ==========================================================

  /**
   * جلب المجلدات داخل مجلد معين (أو الجذر)
   * @param {string|null} parentId - null for root
   */
  fetchFolders: async (parentId = null) => {
    try {
      const headers = await getAuthHeaders();
      const url = parentId 
        ? `${BASE_URL}/folders?parentId=${parentId}` 
        : `${BASE_URL}/folders?root=true`;
        
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) return [];
      const data = await response.json();
      return data.folders || [];
    } catch (error) {
      console.error("📂 Fetch Folders Error:", error);
      return [];
    }
  },

  /**
   * إنشاء مجلد جديد
   */
  createFolder: async (name, parentId = null, color = '#38BDF8') => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/folders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          name, 
          parentId, 
          metadata: { color, icon: 'folder' } 
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Create folder failed');
      return data.folder;
    } catch (error) {
      console.error("📂 Create Folder Error:", error);
      throw error;
    }
  },

  /**
   * نقل ملف إلى مجلد (Move File)
   */
   moveFileToFolder: async (fileId, targetFolderId) => {
    try {
      const headers = await getAuthHeaders();
      
      // ✅ Logic Fix: Ensure correct payload for Root vs Folder
      // If targetFolderId is falsy (null/undefined), send 'root' string or null depending on backend logic.
      // Our updated backend accepts null or 'root'. Let's send null for clarity.
      const payload = { 
        targetFolderId: targetFolderId ? targetFolderId : null 
      };

      console.log(`🚚 API: Moving file ${fileId} to`, payload);

      const response = await fetch(`${BASE_URL}/sources/${fileId}/move`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || resData.error || 'Move failed');
      }
      return true;
    } catch (error) {
      console.error("📂 Move File Error:", error);
      throw error;
    }
  },
  /**
   * حذف مجلد
   */
  deleteFolder: async (folderId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/folders/${folderId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Delete folder failed');
    return true;
  },
  /**
   * 2. شراء منتج (Atomic Purchase)
   * يقوم بخصم الرصيد وإضافة المنتج للمخزون في عملية واحدة.
   * @param {string} itemId - معرف المنتج
   */
  purchaseStoreItem: async (itemId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/store/purchase`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ itemId })
      });

      const data = await response.json();

      if (!response.ok) {
        // معالجة الأخطاء الخاصة (مهم جداً للواجهة)
        if (response.status === 402) throw new Error("INSUFFICIENT_FUNDS"); // رصيد غير كافي
        if (response.status === 409) throw new Error("ALREADY_OWNED"); // تم شراؤه مسبقاً
        throw new Error(data.error || data.message || 'Purchase failed');
      }

      return data; // { success: true, newBalance: 500, ... }
    } catch (error) {
      console.error("🛒 Purchase Error:", error.message);
      throw error; // نرمي الخطأ لنتعامل معه في الواجهة (عرض تنبيه)
    }
  },

  /**
   * 3. جلب مخزون المستخدم (مكتبتي)
   * يعيد قائمة الملفات التي يملكها الطالب.
   */
   fetchUserInventory: async () => {
    try {
      const headers = await getAuthHeaders();
      // ✅ التصحيح: إزالة /api/ إذا كانت موجودة، والتأكد من الرابط
      const url = `${BASE_URL}/store/inventory`; 
      
      console.log(`📡 [Inventory] Fetching: ${url}`); // لنرى الرابط في الكونسول

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ [Inventory] Error ${response.status}:`, errText);
        return [];
      }
      
      const data = await response.json();
      console.log(`✅ [Inventory] Items found:`, data.inventory?.length || 0);
      
      return data.inventory || [];
    } catch (error) {
      console.error("🎒 Inventory Network Error:", error);
      return [];
    }
  },

  /**
   * 4. جلب المحتوى الآمن (Secure Viewer)
   * لا يعمل إلا إذا كان المستخدم يملك الملف في المخزون.
   * @param {string} itemId 
   */
  getSecureItemContent: async (itemId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/store/item/${itemId}/content`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 403) throw new Error("NOT_OWNED"); // محاولة وصول غير مصرح
      if (!response.ok) throw new Error('Failed to load content');

      const data = await response.json();
      // { fileUrl: "https://...", content: "...", type: "pdf" }
      return data;
    } catch (error) {
      console.error("🔐 Secure Content Error:", error.message);
      throw error;
    }},
  // ==========================================================
  // 7. Notifications
  // ==========================================================

  trackNotificationClick: async (data) => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;

    await fetch(`${BASE_URL}/analytics/notification-event`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    });
  },
  
  fetchLessonSources: async (lessonId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/sources/lesson/${lessonId}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) throw new Error('Failed to fetch sources');
      
      const data = await response.json();
      
      // ✅ التوافق مع التعديل الجديد:
      // السيرفر يرسل: { success: true, sources: [...] }
      // نحن نريد إرجاع المصفوفة [...] فقط
      return data.sources || []; 
      
    } catch (error) {
      console.error("❌ Fetch Sources Error:", error);
      return [];
    }
  },

// ✅ [UPDATED] تحديث دالة الرفع لتقبل المجلد والوصف
uploadSource: async (fileData, lessonIds = [], subjectIds = [], customName = "", folderId = null, description = "") => {
    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      
      formData.append('file', {
        uri: fileData.uri, 
        name: fileData.name,
        type: fileData.mimeType || 'application/octet-stream'
      });

      // إرسال البيانات الجديدة
      formData.append('customName', customName);
      formData.append('description', description); // ✅ إضافة الوصف
      
      // إذا كان المجلد null سيتم الرفع إلى الروت
      if (folderId) formData.append('folderId', folderId); 

      formData.append('lessonIds', JSON.stringify(lessonIds));
      formData.append('subjectIds', JSON.stringify(subjectIds));

      const response = await fetch(`${BASE_URL}/sources/upload`, {
        method: 'POST',
        headers: { 
            'Authorization': headers['Authorization'],
            // لا تضف Content-Type هنا، المتصفح/التطبيق سيضيفه تلقائياً مع boundary للـ multipart
        }, 
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      return data.data; 
    } catch (error) {
      console.error("❌ Upload Source Error:", error);
      throw error;
    }
},
 // ✅ [NEW] البحث السريع (Quick Look)
  quickSearch: async (query, language = 'Arabic') => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/search/quick`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query, language })
      });

      const data = await response.json();

      if (!response.ok) {
        // نرمي خطأ مميز لنلتقطه في الخدمة ونفعل الـ Fallback
        throw new Error(data.error || 'AI_SEARCH_FAILED');
      }

      return data; // { result: "...", source: "ai_quick_search" }
    } catch (error) {
      console.error("🔍 AI Quick Search Error:", error.message);
      throw error; // نعيد رمي الخطأ ليتعامل معه السيرفيس
    }
  },
  // ✅ 2. دالة جديدة للتحقق من الحالة (Polling Endpoint)
  checkSourceStatus: async (sourceId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/sources/${sourceId}/status`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) return null;
      
      const data = await response.json();
      // نتوقع: { status: 'processing' | 'completed' | 'failed', data: { ... } }
      return data; 
    } catch (error) {
      console.error("❌ Check Status Error:", error);
      return null; // سنعتبره خطأ شبكة ونحاول مرة أخرى
    }
  },
 // ==========================================================
  // ✅ WorkLens Search System (New)
  // ==========================================================
  
  /**
   * البحث الموحد (WorkLens)
   * @param {string} query - نص البحث
   * @param {string} scope - نطاق البحث ('workspace' | 'store')
   */
  searchWorkLens: async (query, scope = 'workspace') => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/worklens/search`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query, scope })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // في حال لم يكن الـ Endpoint جاهزاً بعد، سنعيد خطأ ليتم التعامل معه محلياً
        throw new Error(data.message || 'Search failed');
      }

      return data.results || [];
    } catch (error) {
      console.error("🔍 WorkLens Error:", error);
      throw error; // نرمي الخطأ لتقوم الواجهة بالبحث المحلي (Fallback)
    }
  },

retrySourceProcessing: async (sourceId) => {
    console.log(`📡 [API] Attempting retry for source: ${sourceId}`); // 👈 تتبع 1
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/sources/${sourceId}/retry`, {
        method: 'POST', // تأكد أنها POST وليست GET
        headers: headers
      });
      
      console.log(`📡 [API] Retry Status: ${response.status}`); // 👈 تتبع 2

      if (!response.ok) {
          const text = await response.text();
          console.error(`❌ [API Error] Retry failed: ${text}`);
          throw new Error("Failed to retry");
      }
      return true;
    } catch (error) {
      console.error("❌ [Network Error] Retry:", error);
      throw error;
    }
},
  deleteSource: async (sourceId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/sources/${sourceId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (!response.ok) throw new Error('Delete failed');
      return true;
    } catch (error) {
      console.error("❌ Delete Source Error:", error);
      throw error;
    }
  },
  reportNotificationMetric: async (notification, eventType) => {
    try {
      const content = notification.request?.content || notification;
      const data = content.data || {};
      
      if (!data.notificationId) return;

      let latencyMs = 0;
      if (data.sentAt) {
        const sentAt = new Date(data.sentAt);
        const now = new Date();
        latencyMs = now.getTime() - sentAt.getTime();
      }

      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;

      await fetch(`${BASE_URL}/analytics/notification-event`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          notificationId: data.notificationId,
          campaignId: data.campaignId,
          eventType: eventType, // 'received' | 'opened'
          latencyMs: latencyMs
        })
      });
      
      console.log(`📡 Notification [${eventType}] logged. Latency: ${latencyMs}ms`);
    } catch (e) {
      console.warn("Failed to report notification metric:", e);
    }
  }
};