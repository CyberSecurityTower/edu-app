
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native'; 

// Components
import SubjectDetailsSkeleton from '../components/SubjectDetailsSkeleton';
import OverlayRefreshLoader from '../components/OverlayRefreshLoader';
import LessonTimelineItem from '../components/LessonTimelineItem';
import ProgressDetailsModal from '../components/ProgressDetailsModal';

// Services & Config
import {
  getSubjectWithLessons,
  fetchUserLessonStats,
  fetchUserSubjectStats
} from '../services/supabaseService';
import { supabase } from '../config/supabaseClient';

// Context
import { useAppState } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';

export default function SubjectDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();
  const { t, language, isRTL } = useLanguage();

  const [subjectData, setSubjectData] = useState(null);
  const [lessonStats, setLessonStats] = useState({});
  const [subjectStats, setSubjectStats] = useState({ mastery_percent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  const fallbackTitle = language === 'ar' ? 'تفاصيل المادة' : 'Subject Details';
  const displayTitle = subjectData?.title || subjectData?.name || params.name || fallbackTitle;

  // 1. حساب النسبة وحالة الإتقان (للشارة الذهبية)
  const currentMastery = Math.round(subjectStats.mastery_percent || 0);
  const isSubjectMastered = currentMastery === 100;

  // 2. دالة جلب البيانات
  const fetchData = useCallback(async (showLoader = true) => {
    if (!user?.uid || !params?.id) return;
    if (showLoader) setIsLoading(true);

    try {
      const subjectDetails = await getSubjectWithLessons(params.id);
      
      if (subjectDetails) {
        setSubjectData(subjectDetails);
        
        const lessonIds = subjectDetails.lessons?.map(l => l.id) || [];
        
        const [statsArr, subStats] = await Promise.all([
            fetchUserLessonStats(user.uid, lessonIds),
            fetchUserSubjectStats(user.uid, params.id)
        ]);

        const statsMap = {};
        statsArr.forEach(stat => {
            statsMap[stat.lesson_id] = stat;
        });
        
        setLessonStats(statsMap);
        setSubjectStats(subStats);
      }
    } catch (err) {
      console.error('Failed to load details:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.uid, params?.id]);

  // تحديث البيانات عند التركيز على الشاشة
  useFocusEffect(
    useCallback(() => {
      if (user?.uid && params?.id) {
        fetchData(false); 
      }
    }, [fetchData, user?.uid, params?.id])
  );

  // 3. Realtime Subscription
  useEffect(() => {
    fetchData(true);

    const statsSubscription = supabase
      .channel(`realtime_stats_${params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'user_lesson_stats',
          filter: `user_id=eq.${user?.uid}`
        },
        (payload) => {
           const newStat = payload.new;
           if (newStat && newStat.lesson_id) {
               setLessonStats(prev => ({
                   ...prev,
                   [newStat.lesson_id]: {
                       ...prev[newStat.lesson_id],
                       mastery_percent: newStat.mastery_percent,
                       is_unlocked: newStat.is_unlocked 
                   }
               }));
               fetchUserSubjectStats(user.uid, params.id).then(setSubjectStats);
           }
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(statsSubscription);
    };

  }, [fetchData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData(false);
  };

  // 4. Timeline Logic
  const timelineData = useMemo(() => {
    if (!subjectData?.lessons) return [];

    const sortedLessons = [...subjectData.lessons].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    let previousCompleted = true; // الدرس الأول مفتوح دائماً

    return sortedLessons.map((lesson) => {
        const stat = lessonStats[lesson.id];
        const mastery = stat?.mastery_percent ? Number(stat.mastery_percent) : 0;
        const highestScore = stat?.highest_score ? Number(stat.highest_score) : 0;
        const isDbUnlocked = stat?.is_unlocked === true;

        let status = 'locked';
        const isPassed = mastery >= 50 || highestScore >= 50;

        if (isPassed) {
            status = 'completed';
        } 
        else if (isDbUnlocked) {
            status = 'active';
        }
        else if (previousCompleted) {
            status = 'active';
        }

        if (!isPassed) { 
            previousCompleted = false;
        }
        
        return {
            ...lesson,
            status: status,
            masteryScore: mastery,
        };
    });
  }, [subjectData, lessonStats]);

  const processedTimeline = useMemo(() => {
      return timelineData;
  }, [timelineData]);

  // حساب الإحصائيات للمودال
  const modalStats = useMemo(() => {
    const total = processedTimeline.length;
    const unlocked = processedTimeline.filter(l => l.status !== 'locked').length;
    const remaining = total - unlocked;
    
    return { total, unlocked, remaining };
  }, [processedTimeline]);

  // نسبة التقدم للعرض في الشريط
  const progressPercentage = useMemo(() => {
    // إذا كانت هناك نسبة إتقان قادمة من السيرفر، نستخدمها
    if (subjectStats?.mastery_percent !== undefined && subjectStats?.mastery_percent !== null) {
      return Math.round(Number(subjectStats.mastery_percent));
    }
    
    // إذا لم تتوفر، نستخدم الحسبة القديمة كخيار بديل (عدد المفتوح / الكل)
    // أو يمكن التحقق مما إذا تم تمرير النسبة عبر الـ params
    const paramProgress = params.progress ? Number(params.progress) : 0;
    if (paramProgress > 0) return Math.round(paramProgress);

    return Math.round((modalStats.unlocked / (modalStats.total || 1)) * 100);
  }, [modalStats, subjectStats, params.progress]);

  // ✅ 1. عرض Skeleton أثناء التحميل
  if (isLoading && !subjectData) {
    return <SubjectDetailsSkeleton isRTL={isRTL} />;
  }

  const lessons = subjectData?.lessons || [];

  // ✅ 2. إذا كانت القائمة فارغة
  if (lessons.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={20} color="#E2E8F0" />
          </Pressable>
          <View style={styles.headerCenter}>
             <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
          </View>
          <View style={{ width: 40 }} /> 
        </View>

        <View style={styles.emptyContainer}>
          <LottieView
            source={require('../assets/images/empty_subject.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.emptyText}>
            {t('noSyllabusInfo')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ 3. عرض المحتوى الطبيعي
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <OverlayRefreshLoader isRefreshing={isRefreshing} />
      <LinearGradient colors={['#0B1220', '#020617']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={20} color="#E2E8F0" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
          
          {isSubjectMastered && (
            <View style={[
                styles.masteredBadge, 
                { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}>
                <FontAwesome5 name="crown" size={10} color="#FFD700" style={{ marginHorizontal: 4 }} />
                <Text style={styles.masteredText}>
                    {language === 'ar' ? 'متقن بالكامل' : 'MASTERED'}
                </Text>
            </View>
          )}
        </View>

        <View style={{ width: 40 }} /> 
      </View>

      {/* شريط تقدم المسار (قابل للضغط لفتح المودال) */}
      <Pressable 
        style={styles.progressBarContainer} 
        onPress={() => setShowProgressModal(true)}
      >
          <View style={{flexDirection: isRTL?'row-reverse':'row', justifyContent:'space-between', marginBottom: 6}}>
             <View style={{flexDirection: isRTL?'row-reverse':'row', alignItems:'center', gap: 6}}>
                 <Text style={styles.progressLabel}>
                     {language === 'ar' ? 'تقدم المسار' : 'Course Progress'}
                 </Text>
                 <FontAwesome5 name="info-circle" size={12} color="#94A3B8" />
             </View>
             
             <Text style={[styles.progressValue, isSubjectMastered && { color: '#FFD700' }]}>
                {progressPercentage}%
             </Text>
          </View>
          
          <View style={styles.track}>
              <LinearGradient 
                colors={isSubjectMastered ? ['#FFD700', '#D97706'] : ['#38BDF8', '#2563EB']} 
                start={{x:0, y:0}} end={{x:1, y:0}}
                style={[styles.fill, { width: `${Math.min(progressPercentage, 100)}%` }]} 
              />
          </View>
      </Pressable>

      {/* Timeline List */}
      <FlatList
        data={processedTimeline}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <LessonTimelineItem
            item={item}
            index={index}
            isFirst={index === 0}
            isLast={index === processedTimeline.length - 1}
            subjectId={params.id}
            pathId={user?.selectedPathId}
            totalLessons={processedTimeline.length}
          />
        )}
        refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="transparent"
              colors={['transparent']} 
              style={{ backgroundColor: 'transparent' }}
            />
        }
      />
      
      {/* Modal */}
      <ProgressDetailsModal 
        visible={showProgressModal} 
        onClose={() => setShowProgressModal(false)}
        stats={modalStats}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1220' },
  
  header: { 
      paddingHorizontal: 16, 
      paddingVertical: 12, 
      alignItems: 'center', 
      justifyContent: 'space-between',
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
      zIndex: 10
  },
  headerIcon: { 
      width: 40, 
      height: 40, 
      borderRadius: 12, 
      backgroundColor: 'rgba(255,255,255,0.05)', 
      justifyContent: 'center', 
      alignItems: 'center' 
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  
  masteredBadge: {
      marginTop: 4,
      backgroundColor: 'rgba(255, 215, 0, 0.15)', 
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 20, 
      borderWidth: 1,
      borderColor: 'rgba(255, 215, 0, 0.4)', 
      alignItems: 'center',
      justifyContent: 'center',
  },
  masteredText: {
      color: '#FFD700', 
      fontSize: 10,
      fontWeight: '800', 
      letterSpacing: 1,
  },
 
  progressBarContainer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  progressLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  progressValue: { color: 'white', fontSize: 12, fontWeight: '700' },
  track: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },

  listContent: { paddingVertical: 20, paddingHorizontal: 16 },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -50,
  },
  lottie: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
});