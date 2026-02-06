import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useAppState } from '../../context/AppStateContext';
import { fetchPathExams } from '../../services/supabaseService';
import { localT, calculateDuration, getDaysString } from '../../utils/tasksUtils';
import { getLocalizedText } from '../../utils/localizationHelper';
import EmptyStateLottie from './EmptyStateLottie';
const ExamsSkeleton = () => (
  <View style={{ paddingHorizontal: 20, gap: 15, paddingTop: 15 }}>
    {[1, 2].map((i) => (
      <MotiView
        key={i}
        from={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
        style={styles.skeletonItem}
      >
        <View style={styles.skeletonDate} />
        <View style={{ flex: 1, marginLeft: 15, justifyContent: 'center', gap: 10 }}>
          <View style={styles.skeletonLineLong} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
             <View style={styles.skeletonLineShort} />
             <View style={styles.skeletonLineShort} />
          </View>
        </View>
      </MotiView>
    ))}
  </View>
);

export default function ExamsTab() {
  const { user } = useAppState();
  const { language, isRTL } = useLanguage();
  const [examsData, setExamsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user?.selectedPathId || user?.selected_path_id) {
        setLoading(true);
        try {
          const data = await fetchPathExams(user.selectedPathId || user.selected_path_id);
          setExamsData(data);
        } catch (e) {
          console.error("Error fetching exams:", e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const getDaysLeft = (dateString) => {
    const examDate = new Date(dateString);
    const today = new Date();
    const diffTime = examDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) return <ExamsSkeleton />;

  return (
    <FlatList 
      data={examsData}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: 15, paddingHorizontal: 20 }}
      // زيادة الأداء للقوائم الطويلة
      initialNumToRender={6}
      windowSize={5}
      renderItem={({ item, index }) => {
        const daysLeft = getDaysLeft(item.exam_date);
        let gradientColors = ['#1E293B', '#0F172A']; 
        let accentColor = '#38BDF8'; 
        let statusText = getDaysString(daysLeft, language);
        
        if (daysLeft <= 3 && daysLeft >= 0) {
          gradientColors = ['#7F1D1D', '#450A0A']; 
          accentColor = '#F87171';
        } else if (daysLeft <= 7) {
          gradientColors = ['#78350F', '#451A03'];
          accentColor = '#FBBF24';
        }

        const examDateObj = new Date(item.exam_date);
        const dayNumber = examDateObj.getDate();
        const monthName = examDateObj.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
        const dayName = examDateObj.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long' });

        let rawAllocation = item.rooms_allocation || item.room_allocation; 
        if (typeof rawAllocation === 'string') {
          try { rawAllocation = JSON.parse(rawAllocation); } catch (e) { console.error(e); }
        }
        const userGroupId = user?.groupId || user?.group_id;
        const allocationData = rawAllocation?.[userGroupId] || rawAllocation?.['default'];
        const defaultText = language === 'ar' ? "غير محدد" : (language === 'fr' ? "Non spécifié" : "Not specified");
        let roomName = defaultText;
        let floorName = null;

        if (allocationData) {
            if (allocationData.room) {
                roomName = allocationData.room[language] || allocationData.room['en'] || allocationData.room['fr'] || allocationData.room['ar'] || roomName;
            } else if (typeof allocationData === 'string') {
                roomName = allocationData;
            }
            if (allocationData.floor) {
                floorName = allocationData.floor[language] || allocationData.floor['en'] || allocationData.floor['fr'];
            }
        } else if (item.room) {
            roomName = item.room;
        }

        // --- التعديل هنا: تحديد ما إذا كان العنصر سيتحرك أم لا ---
        const shouldAnimate = index < 5;
        const Container = shouldAnimate ? MotiView : View;
        const animationProps = shouldAnimate ? {
            from: { opacity: 0, scale: 0.9, translateY: 20 },
            animate: { opacity: 1, scale: 1, translateY: 0 },
            transition: { delay: index * 100, type: 'spring', damping: 15 }
        } : {};

        return (
          <Container 
            {...animationProps}
            style={{ marginBottom: 16 }}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.examCardModern, { borderColor: accentColor + '40' }]}
            >
              <View style={[styles.decorativeCircle, { backgroundColor: accentColor }]} />
              <View style={[styles.examContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.dateBoxModern}>
                  <Text style={[styles.dateDayModern, { color: accentColor }]}>{dayNumber}</Text>
                  <Text style={styles.dateMonthModern}>{monthName}</Text>
                </View>

                <View style={{ flex: 1, paddingHorizontal: 15, justifyContent: 'center' }}>
                  <Text style={[styles.examTitleModern, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {getLocalizedText(item.subject_name, language)}
                  </Text>
                   
                  <View style={[styles.examMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 6 }]}>
                    <View style={[styles.pillBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                       <FontAwesome5 name="clock" size={10} color="#CBD5E1" style={{ marginRight: 4 }} />
                       <Text style={styles.pillText}>{item.start_time?.slice(0,5)}</Text>
                    </View>
                    <View style={[styles.pillBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <FontAwesome5 name="door-open" size={10} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={[styles.pillText, { color: '#10B981' }]}>{roomName}</Text>
                    </View>
                    {floorName && (
                      <View style={[styles.pillBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                          <FontAwesome5 name="layer-group" size={10} color="#38BDF8" style={{ marginRight: 4 }} />
                          <Text style={[styles.pillText, { color: '#38BDF8' }]}>{floorName}</Text>
                      </View>
                    )}
                    <View style={[styles.pillBadge, { backgroundColor: accentColor + '20' }]}>
                       <Text style={[styles.pillText, { color: accentColor }]}>
                         {calculateDuration(item.start_time, item.end_time, language)}
                       </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={[styles.examFooterModern, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                 <Text style={styles.dayNameText}>{dayName}</Text>
                 <View style={[styles.countdownBadge, { backgroundColor: accentColor }]}>
                    <Text style={styles.countdownText}>{statusText}</Text>
                 </View>
              </View>
            </LinearGradient>
          </Container>
        );
      }}
            ListEmptyComponent={<EmptyStateLottie type="exams" />}

    />
  );
}

const styles = StyleSheet.create({
  skeletonItem: { height: 110, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 20, flexDirection: 'row' },
  skeletonDate: { width: 65, height: 75, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16 },
  skeletonLineLong: { width: '80%', height: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 },
  skeletonLineShort: { width: 50, height: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 },
  examCardModern: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
  decorativeCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, opacity: 0.05 },
  examContentRow: { padding: 20, alignItems: 'center' },
  dateBoxModern: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, width: 65, height: 75, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  dateDayModern: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  dateMonthModern: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  examTitleModern: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  examMetaRow: { flexWrap: 'wrap', gap: 5 },
  pillBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  pillText: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  examFooterModern: { backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'space-between', alignItems: 'center' },
  dayNameText: { color: '#94A3B8', fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  countdownBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  countdownText: { color: '#0F172A', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#64748B', fontSize: 14 }
});