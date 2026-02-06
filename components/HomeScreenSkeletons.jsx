
// components/HomeScreenSkeletons.jsx

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

// حساب عرض البطاقة ليكون مطابقاً تماماً لـ SubjectCard.jsx
// (عرض الشاشة - الهوامش) / 2
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = 160; // نفس ارتفاع البطاقة الحقيقية

// مكون البطاقة الوهمية الواحدة
const SubjectSkeletonCard = () => (
  <MotiView
    from={{ opacity: 0.3 }}
    animate={{ opacity: 0.6 }}
    transition={{
      type: 'timing',
      duration: 800,
      loop: true,
      repeatReverse: true,
    }}
    style={[styles.cardSkeleton, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
  >
    {/* محاكاة الأيقونة في الأعلى */}
    <View style={styles.iconSkeleton} />
    
    {/* محاكاة النصوص في الأسفل */}
    <View style={styles.textContainer}>
      <View style={styles.titleSkeleton} />
      <View style={styles.subtitleSkeleton} />
    </View>
  </MotiView>
);

// 1. سكيلتون الهيدر (كما هو)
export const HeaderSkeleton = () => (
  <View style={styles.headerContainer}>
    <View>
      <MotiView 
        from={{ opacity: 0.5 }} animate={{ opacity: 1 }} 
        transition={{ loop: true, duration: 800 }} 
        style={{ width: 180, height: 30, backgroundColor: '#1E293B', borderRadius: 8, marginBottom: 10 }} 
      />
      <MotiView 
        from={{ opacity: 0.5 }} animate={{ opacity: 1 }} 
        transition={{ loop: true, duration: 800 }} 
        style={{ width: 120, height: 20, backgroundColor: '#1E293B', borderRadius: 8 }} 
      />
    </View>
    <MotiView 
        from={{ opacity: 0.5 }} animate={{ opacity: 1 }} 
        transition={{ loop: true, duration: 800 }} 
        style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E293B' }} 
    />
  </View>
);

// 2. سكيلتون المهام (كما هو)
export const TasksSkeleton = () => (
  <View style={styles.tasksContainer}>
    {[1, 2].map((i) => (
      <View key={i} style={styles.taskItem}>
        <MotiView 
            from={{ opacity: 0.3 }} animate={{ opacity: 0.6 }} 
            transition={{ loop: true, duration: 800 }} 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155' }} 
        />
        <MotiView 
            from={{ opacity: 0.3 }} animate={{ opacity: 0.6 }} 
            transition={{ loop: true, duration: 800 }} 
            style={{ width: '70%', height: 20, borderRadius: 6, backgroundColor: '#334155' }} 
        />
      </View>
    ))}
  </View>
);

// 3. 🔥 سكيلتون المواد الجديد (يملأ الشاشة) 🔥
export const SubjectsSkeleton = () => {
  // ننشئ مصفوفة وهمية من 6 أو 8 عناصر لملء الشاشة
  const fakeItems = Array.from({ length: 8 });

  return (
    <View style={styles.subjectsGrid}>
      {/* عنوان القسم الوهمي */}
      <MotiView 
        from={{ opacity: 0.5 }} animate={{ opacity: 1 }} 
        transition={{ loop: true, duration: 800 }} 
        style={styles.sectionTitleSkeleton} 
      />

      <View style={styles.gridContainer}>
        {fakeItems.map((_, index) => (
          <SubjectSkeletonCard key={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Header Styles
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    marginBottom: 20, 
    paddingTop: 20 
  },
  
  // Tasks Styles
  tasksContainer: { 
    backgroundColor: '#1E293B', 
    borderRadius: 20, 
    padding: 20, 
    marginHorizontal: 12, 
    marginBottom: 20 
  },
  taskItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15, 
    marginBottom: 15 
  },

  // 🔥 Subjects Grid Styles
  subjectsGrid: {
    paddingHorizontal: 12,
    marginTop: 10,
  },
  sectionTitleSkeleton: {
    width: 150,
    height: 24,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    marginBottom: 15,
    marginLeft: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // يسمح بالنزول للسطر التالي
    justifyContent: 'space-between', // توزيع المسافات
  },
  
  // Card Skeleton Styles
  cardSkeleton: {
    backgroundColor: '#1E293B', // لون الكارد الأساسي
    borderRadius: 24,
    padding: 16,
    marginBottom: 12, // مسافة أسفل كل كارد
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconSkeleton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  textContainer: {
    gap: 8,
  },
  titleSkeleton: {
    width: '80%',
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  subtitleSkeleton: {
    width: '50%',
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  }
});