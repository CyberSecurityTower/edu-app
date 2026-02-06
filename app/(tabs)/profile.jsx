// app/(tabs)/profile.jsx

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  Image, Pressable, ScrollView, StyleSheet, Linking, 
  Text, View, RefreshControl, Animated, Modal,
  Platform, UIManager, Dimensions, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// --- Contexts & Config ---
import { supabase } from '../../config/supabaseClient';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';

// --- Components ---
import OverlayRefreshLoader from '../../components/OverlayRefreshLoader';
import CustomAlert from '../../components/CustomAlert';
import { ProfileScreenSkeleton } from '../../components/AppSkeletons';
import { useScreenReady } from '../../hooks/useScreenReady';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const LEGAL_URL = "https://edu-legal-zeta.vercel.app/";
const IS_IOS = Platform.OS === 'ios';

// --- 🖼️ Profile Images Assets ---
const MALE_ASSET = require('../../assets/images/male_profile.png');
const FEMALE_ASSET = require('../../assets/images/female_profile.jpg');

// --- 🚀 PERFORMANCE COMPONENT: Optimized Glass View ---
const GlassView = ({ style, intensity = 20, children }) => {
  if (IS_IOS) {
    return (
      <BlurView intensity={intensity} tint="dark" style={style}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[style, { backgroundColor: 'rgba(30, 41, 59, 0.85)' }]}>
      {children}
    </View>
  );
};

// --- 🎨 Language Selection Modal (Memoized) ---
const LanguageModal = React.memo(({ visible, onClose, currentLang, onSelect, isRTL }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const languages = [
    { code: 'en', label: 'English', icon: '🇬🇧' },
    { code: 'ar', label: 'العربية', icon: '🇩🇿' }, 
    { code: 'fr', label: 'Français', icon: '🇫🇷' },
  ];

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <GlassView intensity={40} style={StyleSheet.absoluteFill} />
        <Animated.View style={[
          styles.langModalContent, 
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
        ]}>
          <Text style={styles.langModalTitle}>{isRTL ? 'اختر اللغة' : 'Select Language'}</Text>
          {languages.map((lang, index) => (
            <Pressable
              key={lang.code}
              style={({ pressed }) => [
                styles.langOption,
                index !== languages.length - 1 && styles.langOptionBorder,
                pressed && { backgroundColor: 'rgba(255,255,255,0.08)' }
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(lang.code);
                onClose();
              }}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginHorizontal: 10 }}>{lang.icon}</Text>
                <Text style={[styles.langText, currentLang === lang.code && { color: '#38BDF8', fontWeight: 'bold' }]}>
                  {lang.label}
                </Text>
              </View>
              {currentLang === lang.code && (
                <FontAwesome5 name="check" size={16} color="#38BDF8" />
              )}
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

// --- ✨ Modern Settings Item (Memoized) ---
const ModernSettingsItem = React.memo(({ icon, label, onPress, color = "#E2E8F0", isDestructive = false, rightElement, isRTL, isFirst, isLast }) => {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.modernItem,
        isFirst && styles.roundedTop,
        isLast && styles.roundedBottom,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        pressed && { backgroundColor: 'rgba(255,255,255,0.05)' } 
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.1)' }]}>
        <FontAwesome5 name={icon} size={16} color={isDestructive ? '#EF4444' : (color === "#E2E8F0" ? '#38BDF8' : color)} />
      </View>
      
      <Text style={[
        styles.modernLabel, 
        isDestructive && { color: '#EF4444' },
        { textAlign: isRTL ? 'right' : 'left' }
      ]}>
        {label}
      </Text>

      {rightElement ? rightElement : (
        <FontAwesome5 name={isRTL ? "chevron-left" : "chevron-right"} size={12} color="#475569" style={{ opacity: 0.5 }} />
      )}
      
      {!isLast && <View style={styles.separator} />}
    </Pressable>
  );
});

// --- 📦 Workspace Hero (Memoized) ---
const WorkspaceHero = React.memo(({ onPress, t, isRTL }) => {
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 25, marginTop: 10 }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.heroContainer}
      >
        <LinearGradient
          colors={['#3B82F6', '#2563EB']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />

        <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={styles.heroIconBox}>
            <FontAwesome5 name="briefcase" size={22} color="white" />
          </View>

          <View style={{ flex: 1, marginHorizontal: 16, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.heroTitle}>{t('myWorkspace')}</Text>
            <Text style={styles.heroSubtitle}>{t('workspaceSubtitle')}</Text>
          </View>

          <View style={styles.heroArrowBox}>
            <FontAwesome5 name={isRTL ? "arrow-left" : "arrow-right"} size={12} color="#2563EB" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default function ProfileScreen() {
  const isReady = useScreenReady();
  const { user, setUser, logout, refreshTasks } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const { t, changeLanguage, language, isRTL } = useLanguage();
  const router = useRouter();
  const [alertInfo, setAlertInfo] = useState({ isVisible: false });
  const [langModalVisible, setLangModalVisible] = useState(false);
  
const { libraryStats } = useAppState();
const totalItems = (libraryStats?.uploads?.count || 0) + (libraryStats?.purchases?.count || 0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 500, 
        useNativeDriver: true 
      }).start();
    }
  }, [isReady]);

  // Optimized Fetch
  useEffect(() => {
    if (!isReady || !user?.uid) return;
    
    // Background fetch - doesn't block UI
    const updateProfile = async () => {
      const { data } = await supabase.from('users').select('*').eq('id', user.uid).single();
      if (data) setUser(prev => ({ ...prev, ...data }));
    };
    updateProfile();
  }, [isReady]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
        if (refreshTasks) await refreshTasks();
        const { data } = await supabase.from('users').select('*').eq('id', user?.uid).single();
        if (data) setUser(prev => ({ ...prev, ...data }));
    } catch (e) {
        // silent error
    } finally {
        setRefreshing(false);
    }
  }, [user?.uid, refreshTasks]);
const [isAlertLoading, setIsAlertLoading] = useState(false);
 const handleLogout = useCallback(() => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  setAlertInfo({
    isVisible: true,
    title: t('signOut'),
    message: t('signOutConfirm'),
    buttons: [
      { 
        text: t('cancel'), 
        style: "cancel",
        onPress: () => setIsAlertLoading(false) // التأكد من إغلاق التحميل إذا ألغى
      },
      { 
        text: t('signOut'), 
        style: "destructive", 
        onPress: async () => {
          setIsAlertLoading(true); // تفعيل اللودر في الزر
          try {
            await logout(); // استدعاء دالة تسجيل الخروج
          } catch (error) {
            console.error(error);
            setIsAlertLoading(false); // إيقاف اللودر في حال حدوث خطأ
          }
        } 
      }
    ]
  });
}, [t, logout]);

  const fullName = useMemo(() => user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student' : 'Guest', [user]);

  // ✅✅✅ NEW LOGIC: Gender Based Local Avatar ✅✅✅
  const avatarSource = useMemo(() => {
    const gender = user?.gender ? user.gender.toLowerCase().trim() : '';
    
    // Check Male
    if (['male', 'm', 'ذكر', 'homme'].includes(gender)) {
      return MALE_ASSET;
    }
    
    // Check Female
    if (['female', 'f', 'أنثى', 'femme'].includes(gender)) {
      return FEMALE_ASSET;
    }

    // Fallback: Web Generated Initials
    // هذا سيعمل فقط إذا كان هناك إنترنت، لكنه الخيار الثالث المطلوب
    return { uri: `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=38BDF8&color=FFFFFF&size=128&bold=true` };
  }, [user?.gender, fullName]);


  if (!isReady) {
    return <ProfileScreenSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OverlayRefreshLoader isRefreshing={refreshing} />
      
      <View style={styles.ambientLight} />

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true} // High Performance
        style={{ opacity: fadeAnim }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" colors={['#38BDF8']} />
        }
      >
        {/* --- Header Section --- */}
        <View style={styles.headerSection}>
          <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.screenTitle}>{t('myProfile') || 'Profile'}</Text>
            <Pressable 
              onPress={() => router.push('/(setup)/edit-profile')}
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
            >
              <FontAwesome5 name="cog" size={20} color="white" />
            </Pressable>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <LinearGradient colors={['#38BDF8', '#818CF8']} style={styles.avatarGradient}>
                {/* Image accepts both require(...) (number) and {uri:...} (object) automatically */}
                <Image source={avatarSource} style={styles.avatar} />
              </LinearGradient>
              <View style={styles.onlineBadge} />
            </View>
            <Text style={styles.nameText}>{fullName}</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'Administrator' : (user?.role || 'Student')}
              </Text>
            </View>
          </View>
        </View>
        
      <WorkspaceHero 
            onPress={() => router.push('/workspace/WorkspaceScreen')}
            t={t}
            isRTL={isRTL}
            subtitle={`${totalItems} ${t('items')} • ${libraryStats?.grandTotalSize || '0MB'}`}
        />

      

        {/* --- Settings Groups --- */}
        <View style={styles.groupContainer}>
            <Text style={[styles.groupTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings')}</Text>
            <GlassView style={styles.glassGroup}>
              
                <ModernSettingsItem 
                    icon="globe" 
                    label={t('language')} 
                    onPress={() => setLangModalVisible(true)} 
                    isRTL={isRTL} 
                    isFirst
                    rightElement={
                    <View style={styles.langBadge}>
                        <Text style={styles.langBadgeText}>
                        {language === 'ar' ? 'العربية' : (language === 'fr' ? 'Français' : 'English')}
                        </Text>
                    </View>
                    }
                />
                <ModernSettingsItem 
                    icon="user-edit" 
                    label={t('editProfile')} 
                    onPress={() => router.push('/(setup)/edit-profile')} 
                    isRTL={isRTL} 
                    isFirst 
                />
                 <ModernSettingsItem 
    icon="graduation-cap" 
    label={language === 'ar' ? 'الإعدادات الأكاديمية' : 'Academic Settings'} 
    onPress={() => router.push('/(setup)/academic-settings')} 
    isRTL={isRTL} 
/>
                
            </GlassView>
        </View>

        <View style={styles.groupContainer}>
            <Text style={[styles.groupTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('account')}</Text>
            <GlassView style={styles.glassGroup}>
                
                <ModernSettingsItem 
                    icon="shield-alt" 
                    label={t('securitySettings')} 
                    onPress={() => router.push('/(setup)/security-settings')} 
                    isRTL={isRTL} 
                    isLast 
                />
                <ModernSettingsItem 
                    icon="file-contract" 
                    label={t('termsPrivacy')} 
                    onPress={() => Linking.openURL(LEGAL_URL)} 
                    isRTL={isRTL} 
                    isLast
                />
            </GlassView>
        </View>

        <View style={styles.groupContainer}>
            <Text style={[styles.groupTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('support')}</Text>
            <GlassView style={styles.glassGroup}>
             
                <ModernSettingsItem 
                    icon="headset" 
                    label={t('weAreHere')} 
                    onPress={() => router.push('/support')} 
                    isRTL={isRTL} 
                    color="#F43F5E"
                    isFirst
                />
                <ModernSettingsItem 
                    icon="sign-out-alt" 
                    label={t('signOut')} 
                    isDestructive 
                    onPress={handleLogout} 
                    isRTL={isRTL} 
                    isLast 
                />
            </GlassView>
        </View>

        <View style={styles.footer}>
            <Text style={styles.versionText}>EduApp V2.0</Text>
        </View>

      </Animated.ScrollView>

      <LanguageModal 
        visible={langModalVisible} 
        onClose={() => setLangModalVisible(false)} 
        currentLang={language}
        onSelect={changeLanguage}
        isRTL={isRTL}
      />
      
      <CustomAlert 
  isVisible={alertInfo.isVisible} 
  onClose={() => {
    if (!isAlertLoading) { // منع الإغلاق أثناء التحميل
      setAlertInfo({ isVisible: false });
    }
  }} 
  title={alertInfo.title} 
  message={alertInfo.message} 
  buttons={alertInfo.buttons}
  loading={isAlertLoading} // <--- تمرير حالة التحميل هنا
/>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' }, 
  scrollContent: { paddingBottom: 100 },
  
  ambientLight: {
    position: 'absolute', top: -100, left: -50, width: width, height: 400,
    backgroundColor: '#38BDF8', opacity: 0.08, borderRadius: 200, transform: [{ scaleX: 2 }]
  },

  headerSection: { marginBottom: 30, paddingHorizontal: 20, paddingTop: 10 },
  topBar: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  editBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  
  profileCard: { alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginBottom: 15, shadowColor: '#38BDF8', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: {width:0, height:4}, elevation: 8 },
  avatarGradient: { padding: 3, borderRadius: 60 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#1E293B', resizeMode: 'cover' },
  onlineBadge: { position: 'absolute', bottom: 5, right: 5, width: 22, height: 22, backgroundColor: '#10B981', borderRadius: 11, borderWidth: 3, borderColor: '#020617' },
  
  nameText: { fontSize: 24, fontWeight: '700', color: 'white', marginBottom: 4 },
  emailText: { fontSize: 14, color: '#94A3B8', marginBottom: 12 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(56, 189, 248, 0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)' },
  roleText: { color: '#38BDF8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },

  heroContainer: {
    height: 100, borderRadius: 24, overflow: 'hidden', position: 'relative',
    shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  decoCircle1: { position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' },
  decoCircle2: { position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroIconBox: {
    width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  heroTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  heroArrowBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },

  groupContainer: { marginHorizontal: 20, marginBottom: 25 },
  groupTitle: { color: '#64748B', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, marginLeft: 10 },
  glassGroup: { borderRadius: 16, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
  
  modernItem: { padding: 16, alignItems: 'center' },
  roundedTop: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  roundedBottom: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  iconContainer: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 },
  modernLabel: { flex: 1, color: '#F1F5F9', fontSize: 16, fontWeight: '500' },
  separator: { position: 'absolute', bottom: 0, right: 0, width: '82%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  
  langBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  langBadgeText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },

  footer: { alignItems: 'center', marginTop: 10, opacity: 0.4 },
  versionText: { color: '#94A3B8', fontSize: 12 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  langModalContent: { width: '80%', backgroundColor: '#1E293B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
  langModalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 10, borderRadius: 12 },
  langOptionBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  langText: { color: '#E2E8F0', fontSize: 16, fontWeight: '500' },
});