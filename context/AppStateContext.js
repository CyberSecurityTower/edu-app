// context/AppStateContext.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from '../config/api'; 
import { 
  fetchSystemSettings, 
  fetchUserTasks, 
  startSession, 
  toggleTaskPin, 
  updateTaskTitle, 
  refreshEducationalPathCache 
} from '../services/supabaseService'; 
import { supabase } from '../config/supabaseClient';
import { useTimer } from './TimerContext';
import { useUIState } from './UIStateContext';

const AppStateContext = createContext();

export const useAppState = () => useContext(AppStateContext);

const CACHE_KEYS = {
  USER: '@user_profile_v5', 
  TASKS: '@user_tasks_v2',
  PROGRESS: '@user_progress_v2',
  NOTIFICATIONS: '@user_notifications',
  SETTINGS_ONBOARDING: '@hasCompletedOnboarding',
  // ✅ [NEW] مفتاح تخزين المخزون محلياً
  INVENTORY: '@user_inventory_v1', 
};

export const AppStateProvider = ({ children }) => {
  // ------------------------------------------------------------
  // 1. State & Refs
  // ------------------------------------------------------------
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [streakReward, setStreakReward] = useState(null);
  const [tasks, setTasks] = useState([]); 
  const [userProgress, setUserProgress] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [userSources, setUserSources] = useState([]); //  ملفات المستخدم المرفوعة
  const [inventory, setInventory] = useState([]);
  const [ownedItemIds, setOwnedItemIds] = useState(new Set());
  const [storageUsage, setStorageUsage] = useState("0 B");
  const [systemConfig, setSystemConfig] = useState({
    feature_edustore: false,
    maintenance_mode: false,
    feature_chat: true
  });  
  
  const [pathDetails, setPathDetails] = useState(null);

  // Refs
  const sessionRef = useRef(null);       
  const heartbeatTimerRef = useRef(null); 
  const sessionStartTime = useRef(new Date()); 
  const isCreatingSession = useRef(false); 
  const isSyncedRef = useRef(false);
  const hasCheckedStreak = useRef(false);
  const skipNextSync = useRef(false);

  const { startTimer, pauseTimer, resumeTimer, endTimer, timerSession } = useTimer();
  const { showAlert } = useUIState();

  const [penaltyReward, setPenaltyReward] = useState(null);

  // ------------------------------------------------------------
  // 2. Helper Functions
  // ------------------------------------------------------------
  
  const markAsJustSignedUp = useCallback(() => {
    console.log("🛑 Flag raised: Skipping next sync due to new signup.");
    skipNextSync.current = true;
  }, []);

  const normalizeTask = (dbTask) => ({
    id: dbTask.id,
    title: dbTask.title,
    status: dbTask.status,
    priority: dbTask.priority,
    type: dbTask.type,
    createdAt: dbTask.created_at,
    ...dbTask.meta, 
    isPinned: dbTask.meta?.isPinned || false, 
  });

  const manageSession = useCallback(async (isActive, userId) => {
    if (!userId) return;
    if (isActive) {
      if (sessionRef.current || isCreatingSession.current) return;
      try {
        isCreatingSession.current = true; 
        sessionStartTime.current = new Date();
        const sid = await startSession(userId, { os: Platform.OS });
        if (sid) {
          sessionRef.current = sid; 
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          apiService.sendHeartbeat(sessionRef.current);
          heartbeatTimerRef.current = setInterval(() => {
            if (sessionRef.current && AppState.currentState === 'active') {
                apiService.sendHeartbeat(sessionRef.current);
            }
          }, 30000);
        }
      } catch (e) { console.error("Session Start Error:", e); } finally { isCreatingSession.current = false; }      
    } else {
      if (heartbeatTimerRef.current) { clearInterval(heartbeatTimerRef.current); heartbeatTimerRef.current = null; }
      sessionRef.current = null; isCreatingSession.current = false; 
    }
  }, []);

  const checkDailyStreak = useCallback(async (explicitUserId = null) => {
    const targetUserId = explicitUserId || user?.uid;
    if (!targetUserId) return;
    if (hasCheckedStreak.current && !explicitUserId) return;

    try {
      hasCheckedStreak.current = true;
      const resData = await apiService.dailyCheckIn();
      if (!resData) { hasCheckedStreak.current = false; return; }

      setUserProgress(prev => {
        const nextStreak = resData.data?.streak ?? prev?.streakCount ?? 0;
        const isActive = resData.status === 'claimed' || resData.status === 'already_claimed';
        return { ...prev, streakCount: nextStreak, isStreakActiveToday: isActive };
      });

      if (resData.wasReset) {
         setPenaltyReward({ lostStreak: resData.data?.previous_streak || 0, isPenalty: true });
      } else if (resData.status === 'claimed' && !resData.already_claimed) {
         setStreakReward({ coins: resData.reward?.coins_added || 0, streak: resData.data?.streak });
      }
    } catch (e) { console.error("Streak Check Error:", e); hasCheckedStreak.current = false; }
  }, [user?.uid]);

  // ✅ [NEW] دالة مساعدة لتحديث حالة المخزون (تستخدم داخل syncWithBackend)
  const updateInventoryState = (items) => {
    setInventory(items);
    // نستخدم Set للبحث السريع جداً O(1)
    const ids = new Set(items.map(i => i.item_id || i.inventoryId || i.id));
    setOwnedItemIds(ids);
  };
  // ✅ [NEW] دالة لجلب مصادر المستخدم
  const refreshUserSources = useCallback(async () => {
    try {
      // 1. جلب الملفات
      const sources = await apiService.fetchUserLibrarySources();
      setUserSources(sources || []);

      // 2. ✅ جلب الإحصائيات وتحديثها
      const stats = await apiService.fetchLibraryStats();
      if (stats && stats.grandTotalSize) {
        setStorageUsage(stats.grandTotalSize);
      }
    } catch (e) {
      console.error("Failed to fetch library data", e);
    }
  }, []);
 
  const syncWithBackend = useCallback(async (sessionUser) => {
    if (!sessionUser || isSyncing) return; // منع التزامن إذا كان هناك واحد جارٍ بالفعل
        setIsSyncing(true); 
    console.log("☁️ Syncing Data for:", sessionUser.email);

    try {
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*') 
            .eq('id', sessionUser.id)
            .single();
        
        if (profileError) throw profileError;

        const { data: progressDoc } = await supabase
            .from('user_progress')
            .select('data')
            .eq('user_id', sessionUser.id)
            .single();
        
        const progressData = progressDoc?.data || {}; 

        const normalizedUser = { 
            uid: sessionUser.id, 
            email: sessionUser.email,
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            selectedPathId: profileData.selected_path_id,
            groupId: profileData.group_id,
            profileStatus: profileData.profile_status,
            ...profileData, 
            streak: profileData.streak_count ?? 0 
        };

        setUser(normalizedUser);
        await AsyncStorage.setItem(CACHE_KEYS.USER, JSON.stringify(normalizedUser));

        setUserProgress({
            ...progressData,
            points: profileData.coins || 0,
            streakCount: profileData.streak_count || 0,
            isStreakActiveToday: false 
        });

        const serverTasks = await fetchUserTasks(sessionUser.id);
        if (serverTasks) {
            const normalized = serverTasks.map(normalizeTask);
            setTasks(normalized);
        }
        
        if (normalizedUser.selectedPathId) {
            console.log("📚 Fetching fresh Path Details...");
            const freshPath = await refreshEducationalPathCache(normalizedUser.selectedPathId);
            if (freshPath) setPathDetails(freshPath);
        }

       
        // 1. تتبع المخزون
        const rawInventory = await apiService.fetchUserInventory();

        // التطبيع (Mapping)
        const formattedInventory = rawInventory.map(item => ({
            ...item,
            id: item.item_id || item.id, // تأكد من الـ ID
            is_store_item: true,
            type: item.type || item.file_type || 'file' // تأكد من الـ Type
        }));
        
        updateInventoryState(formattedInventory);

        // 2. تتبع المصادر
        const rawSources = await apiService.fetchUserLibrarySources();

        setUserSources(rawSources);
       

        // حفظ في الكاش
        await AsyncStorage.setItem(CACHE_KEYS.INVENTORY, JSON.stringify(formattedInventory));

        await checkDailyStreak(sessionUser.id); 
        isSyncedRef.current = true;

    } catch (e) {
        console.error("❌ Sync Error:", e);
        Toast.show({ type: 'error', text1: 'خطأ في المزامنة', text2: 'تأكد من الانترنت' });
    } finally {
        setAuthLoading(false);
        setIsSyncing(false); 
    }
  }, [checkDailyStreak]);
// ✅ [NEW] القائمة الموحدة (مشتريات + مرفقات)
 const addPoints = useCallback(async (amount) => {
    if (!amount) return;
    
    const pointsToAdd = parseInt(amount, 10);
    console.log(`💎 Adding ${pointsToAdd} points...`);

    // 1. تحديث فوري للواجهة (Optimistic Update)
    setUserProgress(prev => ({
        ...prev,
        points: (prev?.points || 0) + pointsToAdd
    }));  }, [user?.uid]);

 const combinedLibrary = useMemo(() => {
    return userSources; 
  }, [userSources]);
  const loadLocalData = async () => {
    try {
      console.log("🚀 App Start: Reading minimal local data...");
      // ✅ [UPDATED] إضافة مفتاح المخزون للقراءة الأولية
      const keys = [CACHE_KEYS.USER, CACHE_KEYS.SETTINGS_ONBOARDING, CACHE_KEYS.INVENTORY];
      const stores = await AsyncStorage.multiGet(keys);
      
      const userData = stores[0][1] ? JSON.parse(stores[0][1]) : null;
      const onboardingData = stores[1][1];
      const inventoryData = stores[2][1] ? JSON.parse(stores[2][1]) : [];

      if (userData) setUser(userData);
      setHasCompletedOnboarding(onboardingData === 'true');
      
      // تحميل المخزون المحفوظ محلياً
      if (inventoryData.length > 0) updateInventoryState(inventoryData);

    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      setAppReady(true);
    }
  };

  const reloadAllData = useCallback(async () => {
    if (!user?.uid) return;
    console.log("☢️ NUCLEAR RELOAD INITIATED ☢️");
    try {
      const keysToRemove = [
        CACHE_KEYS.TASKS,
        CACHE_KEYS.PROGRESS,
        CACHE_KEYS.NOTIFICATIONS,
        CACHE_KEYS.INVENTORY, // ✅ مسح كاش المخزون
        user.selectedPathId ? `@smart_path_data_${user.selectedPathId}` : null,
        user.selectedPathId ? `@last_sync_${user.selectedPathId}` : null
      ].filter(Boolean);

      await AsyncStorage.multiRemove(keysToRemove);
      console.log("🧹 Cache Destroyed.");

      setTasks([]);
      setUserProgress(null);
      setPathDetails(null); 
      setNotifications([]);
      setInventory([]); // ✅ تصفير المخزون
      setOwnedItemIds(new Set());
      isSyncedRef.current = false; 

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("No User");

      await syncWithBackend(currentUser);
      console.log("✅ Nuclear Reload Complete!");
      return true;

    } catch (e) {
      console.error("❌ Reload Failed:", e);
      return false;
    }
  }, [user?.uid, user?.selectedPathId, syncWithBackend]);

  const logout = async () => {
    try {
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        sessionRef.current = null;
        await supabase.auth.signOut();
        await AsyncStorage.multiRemove([
            CACHE_KEYS.USER, 
            CACHE_KEYS.TASKS, 
            CACHE_KEYS.PROGRESS,
            CACHE_KEYS.NOTIFICATIONS,
            CACHE_KEYS.SETTINGS_ONBOARDING,
            CACHE_KEYS.INVENTORY // ✅ حذف المخزون عند الخروج
        ]);
        setUser(null);
        setTasks([]);
        setUserProgress(null);
        setPathDetails(null);
        setInventory([]);
        setOwnedItemIds(new Set());
        isSyncedRef.current = false; 
    } catch (e) { console.error("Logout Error:", e); }
  };

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener(state => setIsOffline(!state.isConnected));
    loadLocalData();
    
    const loadSettings = async () => {
      try {
        const settings = await fetchSystemSettings();
        if (settings) setSystemConfig(prev => ({ ...prev, ...settings }));
      } catch (e) { console.error("Failed to load system settings", e); }
    };
    loadSettings();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
          if (user?.uid === session?.user?.id && isSyncedRef.current) return;
      }
      if (session?.user) {
        const isDifferentUser = user?.uid !== session.user.id;
        if (!isSyncedRef.current || isDifferentUser) {
            await syncWithBackend(session.user);
            manageSession(true, session.user.id);
        }
      } else {
        if (event === 'SIGNED_OUT') {
           setUser(null); setTasks([]); setUserProgress(null); isSyncedRef.current = false;
        }
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeNet();
      authListener.subscription.unsubscribe();
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, []);

  const handleClosePenalty = useCallback(() => setPenaltyReward(null), []);
  const handleCloseStreakModal = useCallback(() => setStreakReward(null), []);
  
  const refreshTasks = useCallback(async () => { 
      if (!user?.uid) return;
      try {
        const serverTasks = await fetchUserTasks(user.uid);
        if (serverTasks) setTasks(serverTasks.map(normalizeTask));
      } catch (e) { console.error(e); }
  }, [user?.uid]);

  const optimisticUpdateTaskStatus = useCallback(async (taskId, newStatus) => { 
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)); 
  }, []);

  const requestTimerAction = useCallback((task) => {
      if (timerSession?.status !== 'idle' && timerSession?.taskId !== task.id) {
        showAlert("جلسة نشطة", "يجب إنهاء الجلسة الحالية أولاً.", [{ text: 'حسناً' }]);
        return;
      }
      if (timerSession?.taskId === task.id) {
        timerSession.status === 'active' ? pauseTimer() : resumeTimer();
      } else { startTimer(task, () => {}); }
  }, [timerSession, startTimer, pauseTimer, resumeTimer, showAlert]);

  const handleTogglePin = useCallback(async (taskIds) => {
    const idsArray = Array.from(taskIds);
    setTasks(prev => prev.map(t => idsArray.includes(t.id) ? { ...t, isPinned: !t.isPinned } : t));
    for (const id of idsArray) {
      const task = tasks.find(t => t.id === id);
      if (task) await toggleTaskPin(id, task, !task.isPinned);
    }
  }, [tasks]);

  const optimisticDeleteTasks = useCallback((ids) => setTasks(p => p.filter(t => !ids.includes(t.id))), []);
  const handleRenameTask = useCallback(async (id, title) => { setTasks(p => p.map(t => t.id === id ? {...t, title} : t)); await updateTaskTitle(id, title); }, []);
  const optimisticAddTask = useCallback((t) => setTasks(p => [t, ...p]), []);
  
  const syncWallet = useCallback(async () => { 
    if (!user?.uid) return; 
    try { 
      const { data } = await supabase.from('users').select('coins').eq('id', user.uid).single(); 
      if (data) setUserProgress(p => ({ ...p, points: data.coins })); 
    } catch (e) {} 
  }, [user?.uid]);

  // ✅ [NEW] دالة لتحديث الرصيد والمخزون معاً بعد الشراء (Optimistic Update)
  const handlePurchaseSuccess = useCallback((newItem, newBalance) => {
    // 1. تحديث الرصيد
    setUserProgress(prev => ({ ...prev, points: newBalance }));
    
    // 2. تحديث المخزون
    setInventory(prev => {
        const updated = [...prev, newItem];
        AsyncStorage.setItem(CACHE_KEYS.INVENTORY, JSON.stringify(updated)); // تحديث الكاش أيضاً
        return updated;
    });

    // 3. تحديث قائمة المعرفات المملوكة (للتحقق السريع)
    setOwnedItemIds(prev => {
        const updated = new Set(prev);
        updated.add(newItem.item_id || newItem.id);
        return updated;
    });
  }, []);

  // ✅ [NEW] دالة للتحقق من ملكية عنصر
  const isItemOwned = useCallback((itemId) => {
    return ownedItemIds.has(itemId);
  }, [ownedItemIds]);

  const value = useMemo(() => ({
    user, setUser, addPoints,
    authLoading, appReady, isOffline, 
    tasks, setTasks, 
    userProgress, setUserProgress,
    points: userProgress?.points || 0, 
    notifications, unreadCount, setNotifications,
    hasCompletedOnboarding, setHasCompletedOnboarding,
    systemConfig, streakReward, setStreakReward,
    handleCloseStreakModal, setSystemConfig,
    refreshTasks, penaltyReward, setPenaltyReward,
    optimisticUpdateTaskStatus, markAsJustSignedUp,
    requestTimerAction, requestEndTimer: endTimer, 
    pathDetails, setPathDetails,
    logout, handleTogglePin, optimisticDeleteTasks,
    handleRenameTask, optimisticAddTask, 
    syncWithBackend, syncWallet, 
    checkDailyStreak, handleClosePenalty, 
    reloadAllData,storageUsage,
    inventory, ownedItemIds, handlePurchaseSuccess, isItemOwned,  userSources, 
    combinedLibrary, 
    refreshUserSources 
  }), [
    user, authLoading, appReady, isOffline, tasks, userProgress, 
    notifications, unreadCount, hasCompletedOnboarding, systemConfig, 
    streakReward, penaltyReward, pathDetails, 
    refreshTasks, optimisticUpdateTaskStatus, requestTimerAction, 
    endTimer, logout, handleTogglePin, optimisticDeleteTasks, 
    handleRenameTask, optimisticAddTask, syncWithBackend, 
    syncWallet, checkDailyStreak, handleClosePenalty, reloadAllData,
    inventory, ownedItemIds, handlePurchaseSuccess, isItemOwned,  userSources, 
    combinedLibrary, 
    refreshUserSources, addPoints, storageUsage
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};