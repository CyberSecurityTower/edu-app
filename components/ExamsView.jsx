
// components/ExamsView.jsx
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function ExamsView({ examsData }) {
  
  // 1. دالة حساب الأيام المتبقية
  const getDaysLeft = (dateString) => {
    const examDate = new Date(dateString);
    const today = new Date();
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // ✅ 2. دالة حساب المدة الزمنية (الجديدة)
  const calculateDuration = (start, end) => {
    if (!start || !end) return '--';

    // تحويل الوقت "08:30:00" إلى ساعات ودقائق
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    // تحويل الكل إلى دقائق
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    // حساب الفرق
    let diff = endTotal - startTotal;
    if (diff < 0) diff = 0; // حماية من الأخطاء

    // إعادة التحويل لساعات ودقائق
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  };

  // تنسيق وقت العرض (مثلاً 08:30)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  return (
    <FlatList
      data={examsData}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
            <FontAwesome5 name="calendar-check" size={40} color="#475569" />
            <Text style={styles.emptyText}>لا توجد امتحانات قادمة 🎉</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const daysLeft = getDaysLeft(item.exam_date);
        const isUrgent = daysLeft <= 3 && daysLeft >= 0;
        const duration = calculateDuration(item.start_time, item.end_time);
        
        return (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 100 }}
          >
            <LinearGradient
              colors={isUrgent ? ['#7F1D1D', '#450A0A'] : ['#1E293B', '#0F172A']}
              style={[styles.card, isUrgent && styles.urgentCard]}
            >
              {/* الجزء الأيسر: الأيام المتبقية */}
              <View style={styles.dateBox}>
                <Text style={styles.daysLeft}>{daysLeft}</Text>
                <Text style={styles.daysLabel}>أيام</Text>
              </View>
              
              {/* الجزء الأوسط: التفاصيل */}
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 15 }}>
                <Text style={styles.subject}>{item.title || item.subject_name || 'مادة دراسية'}</Text> 
                
                <Text style={styles.fullDate}>
                  {new Date(item.exam_date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>

                {/* ✅ عرض التوقيت والمدة المحسوبة */}
                <View style={styles.timeRow}>
                    <Text style={styles.durationText}>({duration})</Text>
                    <Text style={styles.timeText}>
                        {formatTime(item.start_time)} - {formatTime(item.end_time)}
                    </Text>
                    <FontAwesome5 name="clock" size={12} color="#94A3B8" style={{marginLeft: 6}} />
                </View>
              </View>
              
              {/* الجزء الأيمن: الأيقونة */}
              <View style={[styles.iconBox, isUrgent && { backgroundColor: '#EF4444' }]}>
                <FontAwesome5 name={isUrgent ? "exclamation" : "file-alt"} size={20} color="white" />
              </View>
            </LinearGradient>
          </MotiView>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  urgentCard: { borderColor: '#EF4444', borderWidth: 2 },
  dateBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, minWidth: 60 },
  daysLeft: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  daysLabel: { color: '#CBD5E1', fontSize: 10 },
  subject: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  fullDate: { color: '#94A3B8', fontSize: 13, marginBottom: 4 },
  
  // ✅ ستايلات الوقت الجديدة
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  timeText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  durationText: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold', marginRight: 6 },

  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 50, gap: 10 },
  emptyText: { color: '#64748B', textAlign: 'center' }
});