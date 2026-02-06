// components/AppSkeletons.jsx
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

// 1. هيكل صفحة الجدول (بدلاً من المهام)
export const ScheduleScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header Modern */}
      <View style={styles.header}>
        <MotiView 
          from={{ opacity: 0.5 }} animate={{ opacity: 1 }} 
          transition={{ loop: true, duration: 800 }} 
          style={{ width: 120, height: 24, backgroundColor: '#334155', borderRadius: 6, marginBottom: 8 }} 
        />
        <MotiView 
          from={{ opacity: 0.5 }} animate={{ opacity: 1 }} 
          transition={{ loop: true, duration: 800 }} 
          style={{ width: 180, height: 32, backgroundColor: '#334155', borderRadius: 8 }} 
        />
      </View>

      {/* Tabs (2 items) */}
      <View style={styles.tabs}>
         <MotiView style={{ width: '100%', height: 50, borderRadius: 25, backgroundColor: '#1E293B' }} />
      </View>

      {/* Schedule Items Skeleton */}
      <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        {[1, 2, 3].map((i) => (
          <MotiView 
            key={i}
            from={{ opacity: 0.3 }} animate={{ opacity: 0.6 }} 
            transition={{ loop: true, duration: 800, delay: i * 100 }}
            style={styles.scheduleCard}
          >
             {/* Time Column */}
             <View style={{ width: 60, alignItems: 'center', gap: 5 }}>
                <View style={{ width: 40, height: 12, backgroundColor: '#334155', borderRadius: 4 }} />
                <View style={{ width: 2, height: 20, backgroundColor: '#334155' }} />
                <View style={{ width: 40, height: 12, backgroundColor: '#334155', borderRadius: 4 }} />
             </View>
             {/* Info Column */}
             <View style={{ flex: 1, marginLeft: 15, padding: 10, backgroundColor: '#334155', borderRadius: 12, height: 80 }} />
          </MotiView>
        ))}
      </View>
    </View>
  );
};

// 2. هيكل البروفايل (كما هو)
export const ProfileScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 40 }}>
        <MotiView 
            from={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 0.8 }} 
            transition={{ loop: true, type: 'timing', duration: 1000 }}
            style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: '#1E293B', marginBottom: 15 }} 
        />
        <MotiView style={{ width: 150, height: 24, backgroundColor: '#1E293B', borderRadius: 6, marginBottom: 8 }} />
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ marginBottom: 25, paddingHorizontal: 20 }}>
           <MotiView style={{ width: 80, height: 14, backgroundColor: '#334155', borderRadius: 4, marginBottom: 10 }} />
           <MotiView style={{ width: '100%', height: 120, backgroundColor: '#1E293B', borderRadius: 16 }} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27', paddingTop: 20 },
  header: { paddingHorizontal: 25, marginBottom: 25, marginTop: 10 },
  tabs: { paddingHorizontal: 20, marginBottom: 20 },
  scheduleCard: { 
    marginBottom: 15, 
    flexDirection: 'row', 
    alignItems: 'center' 
  }
});