import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useAppState } from '../../context/AppStateContext';
import { fetchGroupSchedule } from '../../services/supabaseService';
import { localT } from '../../utils/tasksUtils';
import { getLocalizedText } from '../../utils/localizationHelper';
import EmptyStateLottie from './EmptyStateLottie';

// 1. تعريف أيام الأسبوع كثابت خارج المكون
const DAYS_MAP = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
};

const ScheduleSkeleton = () => (
  <View style={{ paddingHorizontal: 20, gap: 12, paddingTop: 10 }}>
    {[1, 2, 3].map((i) => (
      <MotiView
        key={i}
        from={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
        style={styles.skeletonItem}
      >
        <View style={styles.skeletonTime} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.skeletonLineLong} />
          <View style={styles.skeletonLineShort} />
        </View>
      </MotiView>
    ))}
  </View>
);

// 2. فصل مكون البطاقة واستخدام React.memo لمنع إعادة الريندر غير الضروري
const ScheduleItem = React.memo(({ item, index, language, isRTL, todayIndex }) => {
    const currentDays = DAYS_MAP[language] || DAYS_MAP['en'];
    const isToday = item.day_index === todayIndex;
    const isNextUp = index === 0;
    const isOnline = item.session_type === 'online';

    // الانيميشن فقط لأول 5 عناصر
    const shouldAnimate = index < 5;
    const Container = shouldAnimate ? MotiView : View;
    
    // إعدادات الانيميشن الثابتة
    const animationProps = shouldAnimate ? {
        from: { opacity: 0, translateY: 10 },
        animate: { opacity: 1, translateY: 0 },
        transition: { delay: index * 50, type: 'timing', duration: 350 }
    } : {};

    return (
        <Container 
            {...animationProps}
            style={[
              styles.scheduleCard, 
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
              (isToday || isNextUp) && { 
                  borderColor: isToday ? '#10B981' : '#38BDF8', 
                  borderWidth: 1.5,
                  backgroundColor: isToday ? 'rgba(16, 185, 129, 0.05)' : 'rgba(56, 189, 248, 0.05)' 
              }
            ]}
        >
            {(isToday || isNextUp) && (
                <View style={[
                    styles.activeBadge, 
                    { backgroundColor: isToday ? '#10B981' : '#38BDF8', [isRTL ? 'left' : 'right']: 0 }
                ]}>
                    <Text style={styles.activeBadgeText}>
                        {isToday ? localT('today', language) : localT('nextUp', language)}
                    </Text>
                </View>
            )}

            <View style={styles.timeBox}>
               <Text style={[styles.dayText, (isToday || isNextUp) && {color: 'white', fontWeight: 'bold'}]}>
                   {currentDays[item.day_index]}
               </Text>
               <Text style={styles.timeText}>{item.start_time?.slice(0,5)}</Text>
               <View style={styles.timeLine} />
               <Text style={styles.timeText}>{item.end_time?.slice(0,5)}</Text>
            </View>

            <View style={[styles.infoBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
               <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 6, width: '100%' }}>
                 <Text style={[styles.subjectTitle, { flex: 1, flexWrap: 'wrap', textAlign: isRTL ? 'right' : 'left' }]}>
                   {getLocalizedText(item.subject_name, language)}
                 </Text>
                 {isOnline && (
                   <View style={[styles.onlineDot, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]} />
                 )}
               </View>
               
               <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                 <View style={[styles.badge, { backgroundColor: isOnline ? 'rgba(74, 222, 128, 0.15)' : '#3B82F620' }]}>
                    <Text style={[styles.badgeText, isOnline && { color: '#4ADE80' }]}>
                      {isOnline ? 'ONLINE' : (item.session_type?.toUpperCase() || item.type?.toUpperCase())}
                    </Text>
                 </View>
                 <Text style={styles.profText}>
                   👨‍🏫 {getLocalizedText(item.professor_name, language)}
                 </Text>
               </View>

               <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 4 }]}>
                    <FontAwesome5 name={isOnline ? "wifi" : "door-open"} size={12} color={isOnline ? "#4ADE80" : "#94A3B8"} />
                    <Text style={[styles.profText, isOnline && { color: '#4ADE80', fontWeight: '600' }]}>
                      {getLocalizedText(item.room, language) || (isOnline ? 'Zoom/Meet' : 'Salle ?')}
                    </Text>
               </View>
            </View>
        </Container>
    );
});

export default function ScheduleTab() {
  const { user } = useAppState();
  const { language, isRTL } = useLanguage();
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);

  // حساب اليوم الحالي مرة واحدة عند تحميل المكون
  const todayIndex = useMemo(() => new Date().getDay(), []);

  useEffect(() => {
    const loadData = async () => {
      if (user?.groupId || user?.group_id) {
        setLoading(true);
        try {
          const data = await fetchGroupSchedule(user.groupId || user.group_id);
          setScheduleData(data);
        } catch (e) {
          console.error("Error fetching schedule:", e);
        } finally {
          setLoading(false);
        }
      } else {
          setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const getSortedSchedule = useMemo(() => {
    if (!scheduleData || scheduleData.length === 0) return [];
    return [...scheduleData].sort((a, b) => {
      const diffA = (a.day_index - todayIndex + 7) % 7;
      const diffB = (b.day_index - todayIndex + 7) % 7;
      if (diffA !== diffB) return diffA - diffB;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [scheduleData, todayIndex]);

  // 3. استخدام useCallback لضمان ثبات دالة renderItem
  const renderItem = useCallback(({ item, index }) => (
    <ScheduleItem 
      item={item} 
      index={index} 
      language={language} 
      isRTL={isRTL} 
      todayIndex={todayIndex} 
    />
  ), [language, isRTL, todayIndex]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  if (loading) return <ScheduleSkeleton />;

  return (
    <FlatList 
      data={getSortedSchedule}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      renderItem={renderItem}
      
      // 4. تحسينات الأداء للسكرول
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      removeClippedSubviews={true} // مهم جداً: يزيل العناصر خارج الشاشة من الذاكرة
      updateCellsBatchingPeriod={50}

            ListEmptyComponent={<EmptyStateLottie type="schedule" />}

    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 100, paddingTop: 10 },
  scheduleCard: { backgroundColor: 'rgba(30, 41, 59, 0.6)', marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', overflow: 'hidden' },
  activeBadge: { position: 'absolute', top: 0, paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, zIndex: 10 },
  activeBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  timeBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, minWidth: 70 },
  dayText: { color: '#94A3B8', fontSize: 11, marginBottom: 4 },
  timeText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  timeLine: { width: 2, height: 15, backgroundColor: '#334155', marginVertical: 2 },
  infoBox: { flex: 1, paddingHorizontal: 15 },
  subjectTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  metaRow: { alignItems: 'center', gap: 10, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#60A5FA', fontSize: 11, fontWeight: 'bold' },
  profText: { color: '#CBD5E1', fontSize: 12 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', elevation: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', fontSize: 14 },
  skeletonItem: { height: 80, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center', padding: 15 },
  skeletonTime: { width: 60, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, marginRight: 15 },
  skeletonLineLong: { width: '70%', height: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4 },
  skeletonLineShort: { width: '40%', height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 },
});