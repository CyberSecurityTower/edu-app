// app/(tabs)/index.jsx

import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// --- Contexts & Services ---
import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { useUIState } from '../../context/UIStateContext';
import { useLanguage } from '../../context/LanguageContext';
// ✅ 1. استيراد دالة جلب الإحصائيات
import { fetchBatchSubjectStats } from '../../services/supabaseService';

// --- Components ---
import ChatFab from '../../components/ChatFab';
import { HeaderSkeleton, SubjectsSkeleton } from '../../components/HomeScreenSkeletons';
import LastViewedWidget from '../../components/LastViewedWidget';
import MainHeader from '../../components/MainHeader';
import StreakWidget from '../../components/StreakWidget';
import SubjectCard from '../../components/SubjectCard';
import SmartHomeWidget from '../../components/SmartHomeWidget';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const errorTexts = {
  ar: {
    timeoutTitle: "استغرق التحميل وقتاً طويلاً",
    failedTitle: "فشل الاتصال",
    subTitle: "يرجى التحقق من اتصالك بالإنترنت",
    retryBtn: "إعادة المحاولة"
  },
  en: {
    timeoutTitle: "Request Timed Out",
    failedTitle: "Connection Failed",
    subTitle: "Please check your internet connection",
    retryBtn: "Retry"
  },
  fr: {
    timeoutTitle: "Délai d'attente dépassé",
    failedTitle: "Échec de la connexion",
    subTitle: "Veuillez vérifier votre connexion internet",
    retryBtn: "Réessayer"
  }
};

const HomeScreen = () => {
  const router = useRouter();
  const { t, isRTL, language } = useLanguage(); 
  
  const { 
    user, 
    points, 
    userProgress, 
    tasks, 
    refreshTasks, 
    syncWallet, 
    reloadAllData,
    pathDetails, 
    setPathDetails 
  } = useAppState();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); 
  const [showRetry, setShowRetry] = useState(false);

  // ✅ 2. حالة محلية لتخزين المواد مدمجة مع نسب التقدم
  const [subjectsWithStats, setSubjectsWithStats] = useState([]);

  const [widgetRefreshTrigger, setWidgetRefreshTrigger] = useState(0);
  
  const { setFabConfig } = useFab(); 
  const { openChatPanel } = useUIState();

  // ✅ 3. دالة لجلب الإحصائيات ودمجها (نفس المنطق في صفحة المواد)
   const loadStats = useCallback(async () => {
    if (!user?.uid || !pathDetails?.subjects) return;

    try {
      const subjectIds = pathDetails.subjects.map(s => s.id);
      const statsMap = await fetchBatchSubjectStats(user.uid, subjectIds);

      const mergedData = pathDetails.subjects.map(subject => ({
        ...subject,
        mastery_percent: statsMap[subject.id] || 0
      }));

      setSubjectsWithStats(mergedData);
    } catch (e) {
      console.error("Error loading home stats:", e);
    }
  }, [user?.uid, pathDetails]);

  // ... (Timeout useEffect logic remains the same)

  // ✅ التعديل الجديد 1: جلب البيانات العامة مرة واحدة عند التحميل
  useEffect(() => {
    if (user?.uid) {
      refreshTasks();
      syncWallet();
    }
  }, [user?.uid]);

  // ✅ التعديل الجديد 2: جلب إحصائيات المواد عند توفر المسار (وليس عند كل تركيز)
  useEffect(() => {
    if (user?.uid && pathDetails) {
      loadStats();
    }
  }, [user?.uid, pathDetails, loadStats]);

  // ✅ التعديل الجديد 3: useFocusEffect يتعامل فقط مع عناصر الواجهة (FAB)
  useFocusEffect(
    useCallback(() => {
      if (setFabConfig) {
        setFabConfig({ component: ChatFab, props: { onPress: openChatPanel } });
      }
    }, [setFabConfig, openChatPanel])
  );

  const handleRetryPress = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsLoading(true);
      setShowRetry(false);
      setErrorMsg(null);
      setPathDetails(null);
      
      const success = await reloadAllData();
      await loadStats(); // تحديث النسب عند إعادة المحاولة
      
      setWidgetRefreshTrigger(prev => prev + 1);

      if (!success) {
          setIsLoading(false);
          setShowRetry(true);
          setErrorMsg("failed"); 
      } else {
          setIsLoading(false);
      }
  };

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        refreshTasks(); 
        syncWallet(); 
        loadStats(); // ✅ 4. استدعاء النسب عند التركيز على الشاشة
      }
      if (setFabConfig) {
        setFabConfig({ component: ChatFab, props: { onPress: openChatPanel } });
      }
    }, [user?.uid, loadStats])
  );

  const [coreSubjects, setCoreSubjects] = useState([]);

  useEffect(() => {
    const sourceSubjects = subjectsWithStats.length > 0 ? subjectsWithStats : pathDetails?.subjects || [];
    
    if (sourceSubjects.length === 0) return;

    setCoreSubjects(prevSubjects => {
      // الحالة 1: إذا كانت هذه أول مرة (القائمة فارغة)، قم باختيار المواد وخلطها
      if (prevSubjects.length === 0) {
        const favoriteIds = userProgress?.favorites?.subjects || [];
        const foundFavorites = sourceSubjects.filter(s => favoriteIds.includes(s.id));

        // إذا وجدت مفضلات اعرضها، وإلا اختر 4 عشوائياً
        if (foundFavorites.length > 0) {
          return foundFavorites;
        } else {
          return [...sourceSubjects]
            .sort(() => 0.5 - Math.random()) // خلط عشوائي لمرة واحدة فقط
            .slice(0, 4);
        }
      }

      // الحالة 2: القائمة موجودة مسبقاً، نحافظ على الترتيب ونحدث البيانات فقط (مثل النسب)
      return prevSubjects.map(prevSub => {
        const updatedSub = sourceSubjects.find(s => s.id === prevSub.id);
        // نحدث الكائن بالبيانات الجديدة مع الحفاظ على مكانه
        return updatedSub ? { ...updatedSub } : prevSub;
      });
    });

  }, [subjectsWithStats, pathDetails, userProgress?.favorites]); // الاعتماديات محددة بدقة
  
  // تحديث virtualProgress لضمان توافقه (اختياري، لكن جيد للتناسق)
  const virtualProgress = useMemo(() => ({ 
      ...userProgress, 
      favorites: { 
          ...userProgress?.favorites, 
          subjects: coreSubjects.map(s => s.id) 
      } 
  }), [userProgress, coreSubjects]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y; });
  const animatedHeaderStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, 50], [1, 0], 'clamp'), transform: [{ translateY: interpolate(scrollY.value, [0, 50], [0, -20], 'clamp') }] }));

  if (!user) return <SafeAreaView style={styles.container} />;
  
  if ((isLoading && !pathDetails) || (!pathDetails && !showRetry)) {
     return <SafeAreaView style={styles.container}><HeaderSkeleton /><SubjectsSkeleton /></SafeAreaView>;
  }

  if (showRetry) {
     const texts = errorTexts[language] || errorTexts['en'];
     const titleText = errorMsg === 'timeout' ? texts.timeoutTitle : texts.failedTitle;

     return (
        <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top']}>
            <LottieView 
                source={require('../../assets/images/no-internet.json')} 
                autoPlay 
                loop={false}
                style={{width: 200, height: 200}} 
            />
            
            <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>{titleText}</Text>
                <Text style={styles.errorSubTitle}>{texts.subTitle}</Text>
            </View>

            <Pressable 
                onPress={handleRetryPress} 
                style={({ pressed }) => [
                    styles.retryButton,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                ]}
            >
                <FontAwesome5 name="redo" size={16} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.retryButtonText}>{texts.retryBtn}</Text>
            </Pressable>
        </SafeAreaView>
     );
  }

  return (
    <SafeAreaView style={styles.container} edges={[ 'top' ]}>
      <Animated.View style={[styles.headerContainer, animatedHeaderStyle]}>
        <MainHeader user={user} points={points} />
      </Animated.View>

      <AnimatedFlatList
        data={coreSubjects} // سيتم تمرير الكائنات التي تحتوي الآن على mastery_percent
        renderItem={({ item, index }) => (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', delay: index * 100 }}>
            {/* SubjectCard الجديد سيتعامل تلقائياً مع item.mastery_percent */}
            <SubjectCard item={item} /> 
          </MotiView>
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        refreshControl={
            <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={async () => { 
                    setIsRefreshing(true); 
                    setCoreSubjects([]); 
                    await reloadAllData(); 
                    await loadStats(); // ✅ تحديث النسب عند السحب للتحديث
                    setWidgetRefreshTrigger(prev => prev + 1);
                    setIsRefreshing(false); 
                }} 
                tintColor="#10B981" 
                colors={['#10B981']}
                progressViewOffset={100}
            />
        }
        
        ListHeaderComponent={
          <>
            <View style={styles.headerPlaceholder} />
            
            <View style={styles.widgetsContainer}>
              <LastViewedWidget progress={userProgress} pathId={user?.selectedPathId} />
              <StreakWidget streak={userProgress?.streakCount ?? 0} isActiveToday={userProgress?.isStreakActiveToday} />
            </View>

            <SmartHomeWidget refreshTrigger={widgetRefreshTrigger} />
            
            {coreSubjects.length > 0 && (
              <View style={styles.subjectsHeader}>
                <Text style={styles.sectionTitle}>{language === 'ar' ? "موادك الأساسية 🎯" : "Your Core Focus 🎯"}</Text>
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, backgroundColor: '#0C0F27', paddingTop: 30 },
  headerPlaceholder: { height: 140 }, 
  listContent: { paddingHorizontal: 8, paddingBottom: 130 },
  subjectsHeader: { paddingHorizontal: 12, marginTop: 20 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  widgetsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, marginBottom: 20 },
  
  centerContent: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  errorTextContainer: { alignItems: 'center', marginBottom: 30, marginTop: -10 },
  errorTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  errorSubTitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  retryButton: { 
    backgroundColor: '#38BDF8', 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5
  },
  retryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default HomeScreen;