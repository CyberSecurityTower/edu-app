// app/(tabs)/tasks.jsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Components
import ScheduleTab from '../../components/tasks/ScheduleTab';
import ExamsTab from '../../components/tasks/ExamsTab';
import OverlayRefreshLoader from '../../components/OverlayRefreshLoader';

// Optimization
import { ScheduleScreenSkeleton } from '../../components/AppSkeletons';
import { useScreenReady } from '../../hooks/useScreenReady';

import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

// 🌍 قاموس الترجمة المباشر (لضمان السرعة والدقة)
const LABELS = {
  greeting: {
    morning: { ar: 'صباح الخير', en: 'Good Morning', fr: 'Bonjour' },
    afternoon: { ar: 'مساء الخير', en: 'Good Afternoon', fr: 'Bon après-midi' },
    evening: { ar: 'مساء النور', en: 'Good Evening', fr: 'Bonsoir' }
  },
  tabs: {
    schedule: { ar: 'جدول الحصص', en: 'Schedule', fr: 'Emploi du temps' },
    exams: { ar: 'الامتحانات', en: 'Exams', fr: 'Examens' }
  }
};

// --- 1. الهيدر الجديد (بسيط وجميل) ---
const MinimalHeader = React.memo(() => {
    const { language, isRTL } = useLanguage();
    
    // التاريخ واليوم
    const date = new Date();
    const locale = language === 'ar' ? 'ar-SA' : (language === 'fr' ? 'fr-FR' : 'en-US');
    const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
    const fullDate = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

    // التحية
    const getGreeting = () => {
      const hours = date.getHours();
      const key = hours < 12 ? 'morning' : (hours < 18 ? 'afternoon' : 'evening');
      return LABELS.greeting[key][language] || LABELS.greeting[key]['en'];
    };

    return (
      <MotiView 
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        style={[styles.headerContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <View>
            <Text style={[styles.subGreeting, { textAlign: isRTL ? 'right' : 'left' }]}>
                {dayName}, {fullDate}
            </Text>
            <Text style={[styles.mainGreeting, { textAlign: isRTL ? 'right' : 'left' }]}>
                {getGreeting()} 👋
            </Text>
        </View>

        <View style={styles.iconContainer}>
            <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                style={styles.iconGradient}
            >
                <FontAwesome5 name="calendar-alt" size={24} color="white" />
            </LinearGradient>
        </View>
      </MotiView>
    );
});

// --- 2. التبويبات (Schedule & Exams Only) ---
const GlassyTabs = ({ activeTab, onTabChange, language }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  
  // ✅ تحديد التبويبات المتاحة فقط
  const tabs = ['schedule', 'exams'];
  
  const activeIndex = tabs.indexOf(activeTab);
  const tabWidth = layout.width / 2; // نقسم على 2 لأن لدينا عنصرين فقط

  return (
    <View 
      style={styles.glassContainer} 
      onLayout={(e) => setLayout(e.nativeEvent.layout)}
    >
      <View style={styles.glassBackground} />

      {layout.width > 0 && (
        <MotiView
          animate={{ translateX: activeIndex * tabWidth }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          style={[styles.slidingIndicator, { width: tabWidth - 8 }]}
        >
          <LinearGradient
            colors={['#38BDF8', '#2563EB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: 30 }}
          />
        </MotiView>
      )}

      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const icons = { schedule: 'clock', exams: 'graduation-cap' };
          
          // ✅ جلب الترجمة الصحيحة
          const label = LABELS.tabs[tab][language] || LABELS.tabs[tab]['en'];

          return (
            <Pressable
              key={tab}
              onPress={() => { 
                Haptics.selectionAsync(); 
                onTabChange(tab); 
              }}
              style={styles.tabTouchArea}
            >
              <MotiView
                animate={{ scale: isActive ? 1.05 : 1, opacity: isActive ? 1 : 0.6 }}
                style={styles.tabContent}
              >
                <FontAwesome5 name={icons[tab]} size={16} color={isActive ? '#FFFFFF' : '#94A3B8'} style={{ marginRight: 8 }} />
                <Text style={[styles.glassTabText, isActive && styles.glassActiveText]}>
                  {label}
                </Text>
              </MotiView>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default function TasksScreen() {
  // ✅ 1. تطبيق InteractionManager Hook (يمنع التعليق)
  const isReady = useScreenReady();
  
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('schedule');

  // ✅ 2. عرض الـ Skeleton حتى تنتهي العمليات الثقيلة
  if (!isReady) {
    return <ScheduleScreenSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OverlayRefreshLoader isRefreshing={false} />
      
      {/* Header */}
      <MinimalHeader />

      {/* Tabs */}
      <View style={{ marginHorizontal: 20, marginBottom: 15, zIndex: 10 }}>
        <GlassyTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          language={language} 
        />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'exams' && <ExamsTab />}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  
  // Header Styles
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingTop: 20, 
    paddingBottom: 25 
  },
  subGreeting: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  mainGreeting: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  iconContainer: { shadowColor: '#38BDF8', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  iconGradient: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  // Tabs Styles
  glassContainer: {
    height: 55, // ارتفاع أقل قليلاً ليناسب التصميم الجديد
    borderRadius: 30, 
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  glassBackground: { ...StyleSheet.absoluteFillObject, borderRadius: 30 },
  slidingIndicator: {
    position: 'absolute',
    height: '84%',
    top: '8%',
    left: 4, 
    borderRadius: 25,
    zIndex: 1,
  },
  tabsRow: { flexDirection: 'row', height: '100%', zIndex: 2 },
  tabTouchArea: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 35 },
  tabContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  glassTabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  glassActiveText: { color: '#FFFFFF', fontWeight: 'bold' },
});