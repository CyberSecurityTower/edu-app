import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function ScheduleView({ scheduleData }) {
  // تحديد اليوم الحالي تلقائياً
  const todayIndex = new Date().getDay(); 
  const [selectedDay, setSelectedDay] = useState(DAYS[todayIndex]);

  // تصفية الحصص حسب اليوم المختار
  const dailyClasses = useMemo(() => {
    return scheduleData.filter(item => item.day_of_week === selectedDay);
  }, [scheduleData, selectedDay]);

  return (
    <View style={{ flex: 1 }}>
      {/* 1. شريط الأيام الأفقي */}
      <View style={{ height: 60, marginBottom: 10 }}>
        <FlatList
          horizontal
          data={DAYS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, gap: 8 }}
          renderItem={({ item, index }) => {
            const isActive = item === selectedDay;
            return (
              <Pressable onPress={() => setSelectedDay(item)}>
                <LinearGradient
                  colors={isActive ? ['#3B82F6', '#2563EB'] : ['#1E293B', '#1E293B']}
                  style={[styles.dayChip, isActive && styles.activeChip]}
                >
                  <Text style={[styles.dayText, isActive && { color: 'white' }]}>
                    {DAYS_AR[index]}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          }}
        />
      </View>

      {/* 2. قائمة الحصص */}
      <FlatList
        data={dailyClasses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="bed" size={40} color="#475569" />
            <Text style={styles.emptyText}>لا توجد حصص لهذا اليوم، استرح! 😴</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 100 }}
            style={styles.classCard}
          >
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{item.start_time?.slice(0, 5)}</Text>
              <View style={styles.verticalLine} />
              <Text style={styles.timeText}>{item.end_time?.slice(0, 5)}</Text>
            </View>
            
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              style={styles.cardContent}
            >
              <Text style={styles.subjectName}>{item.subject_name}</Text>
              <View style={styles.row}>
                <View style={styles.badge}>
                  <FontAwesome5 name="door-open" size={12} color="#94A3B8" />
                  <Text style={styles.badgeText}>{item.room || 'مدرج'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#3B82F620' }]}>
                  <Text style={[styles.badgeText, { color: '#60A5FA' }]}>{item.type || 'Cours'}</Text>
                </View>
              </View>
            </LinearGradient>
          </MotiView>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dayChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  activeChip: { borderColor: '#60A5FA' },
  dayText: { color: '#94A3B8', fontWeight: 'bold' },
  classCard: { flexDirection: 'row', marginBottom: 15, height: 90 },
  timeContainer: { width: 60, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  timeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  verticalLine: { width: 2, height: 20, backgroundColor: '#334155', marginVertical: 4 },
  cardContent: { flex: 1, borderRadius: 16, padding: 15, justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  subjectName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 6 },
  badgeText: { color: '#CBD5E1', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 50, gap: 10 },
  emptyText: { color: '#64748B', fontSize: 16 }
});