import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity, ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Contexts & Services
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../config/supabaseClient';
import {
  getEducationalPaths,
  updateUserAcademicInfo,
  getLocalizedText
} from '../../services/supabaseService';

// Components
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import SelectionModal from '../../components/SelectionModal';

// --- Safe Skeleton Component (Pulsing Opacity Only) ---
// هذا المكون يستخدم الشفافية فقط للأنيميشن، وهو آمن تماماً ولا يسبب أخطاء الجسر
const SkeletonBox = ({ width, height, style, borderRadius = 12 }) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width,
          height: height,
          backgroundColor: '#334155', // لون رمادي ثابت وآمن
          borderRadius: borderRadius,
          opacity: opacity,
        },
        style
      ]}
    />
  );
};

// --- Main Component ---
export default function AcademicSettingsScreen() {
  const router = useRouter();
  const { t, isRTL, language } = useLanguage();
  const { user, setUser, reloadAllData } = useAppState();

  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // --- Data States ---
  const [paths, setPaths] = useState([]);
  const [sections, setSections] = useState([]);
  const [groups, setGroups] = useState([]);

  // --- Selection States ---
  const [selectedPath, setSelectedPath] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // --- Modal Visibility ---
  const [showPathModal, setShowPathModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Animation for Content Entrance
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // 1. Initialization
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        const rawPaths = await getEducationalPaths();
        if (!isMounted) return;

        const formattedPaths = rawPaths.map(p => {
          const pathName = getLocalizedText(p.name_i18n || p.title, language);
          const uniName = p.faculty?.institution?.name
            ? getLocalizedText(p.faculty.institution.name, language)
            : (p.institution_name || '');
          const label = uniName ? `${uniName} - ${pathName}` : pathName;
          return { label, value: p.id, original: p };
        });
        setPaths(formattedPaths);

        // Pre-fill user data
        if (user?.selectedPathId && user?.groupId) {
          const currentPath = formattedPaths.find(p => p.value === user.selectedPathId);
          setSelectedPath(currentPath || null);

          if (currentPath) {
            const { data: sectionsData } = await supabase
              .from('sections')
              .select('*')
              .eq('path_id', currentPath.value)
              .order('name');
            
            const formattedSections = (sectionsData || []).map(s => ({
                label: s.name || `Section ${s.id}`,
                value: s.id
            }));
            setSections(formattedSections);

            const { data: userGroupData } = await supabase
               .from('study_groups')
               .select('id, name, section_id')
               .eq('id', user.groupId)
               .single();

            if (userGroupData) {
                const currentSection = formattedSections.find(s => s.value === userGroupData.section_id);
                setSelectedSection(currentSection || null);

                if (currentSection) {
                    const { data: groupsData } = await supabase
                        .from('study_groups')
                        .select('id, name')
                        .eq('section_id', currentSection.value)
                        .order('name');
                    
                    const formattedGroups = (groupsData || []).map(g => ({
                        label: g.name,
                        value: g.id
                    }));
                    setGroups(formattedGroups);
                    const currentGroup = formattedGroups.find(g => g.value === userGroupData.id);
                    setSelectedGroup(currentGroup || null);
                }
            }
          }
        }
      } catch (e) {
        console.error("Init Error:", e);
      } finally {
        if (isMounted) {
            setInitialLoading(false);
            // Smoothly fade in content
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true
            }).start();
        }
      }
    };
    initData();
    return () => { isMounted = false; };
  }, [user, language]);

  // 2. Handlers
  const handleSelectPath = async (item) => {
    if (item.value === selectedPath?.value) return;
    setSelectedPath(item);
    setSelectedSection(null);
    setSelectedGroup(null);
    setSections([]);
    setGroups([]);

    try {
        const { data } = await supabase
            .from('sections')
            .select('id, name')
            .eq('path_id', item.value)
            .order('name');
        if (data) setSections(data.map(s => ({ label: s.name, value: s.id })));
    } catch (err) { console.error(err); }
  };

  const handleSelectSection = async (item) => {
    if (item.value === selectedSection?.value) return;
    setSelectedSection(item);
    setSelectedGroup(null);
    setGroups([]);

    try {
        const { data } = await supabase
            .from('study_groups')
            .select('id, name')
            .eq('section_id', item.value)
            .order('name');
        if (data) setGroups(data.map(g => ({ label: g.name, value: g.id })));
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!selectedPath || !selectedGroup) {
      Toast.show({ type: 'error', text1: t('alertTitle'), text2: t('fillAllFields') });
      return;
    }

    // If nothing changed, just go back
    if (selectedPath.value === user.selectedPathId && selectedGroup.value === user.groupId) {
        router.back();
        return;
    }

    setSaving(true);
    try {
      await updateUserAcademicInfo(user.uid, selectedPath.value, selectedGroup.value);
      setUser(prev => ({ ...prev, selectedPathId: selectedPath.value, groupId: selectedGroup.value }));
      await reloadAllData();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: t('successTitle'), text2: t('academicUpdateSuccessMsg') });
      setTimeout(() => router.back(), 500);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: t('errorTitle'), text2: t('checkInternetMsg') });
    } finally {
      setSaving(false);
    }
  };

  // Helper Input Component
  const SelectionInput = ({ label, placeholder, value, onPress, disabled, icon }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.inputContainer,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          disabled && styles.disabledInput
        ]}
      >
        <View style={[styles.inputIcon, isRTL ? { marginLeft: 10 } : { marginRight: 10 }]}>
          <FontAwesome5 name={icon} size={16} color={value ? "#38BDF8" : "#64748B"} />
        </View>
        <Text
          style={[
            styles.inputText,
            !value && styles.placeholderText,
            { textAlign: isRTL ? 'right' : 'left' }
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color="#64748B"
          style={isRTL ? { marginRight: 10 } : { marginLeft: 10 }}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable 
            onPress={() => router.back()} 
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <FontAwesome5 name={isRTL ? "arrow-left" : "arrow-right"} size={18} color="white" />
        </Pressable>
        <Text style={styles.title}>{t('academicSettingsTitle')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {initialLoading ? (
        // --- SKELETON LOADING VIEW (SAFE MODE) ---
        <View style={styles.content}>
           {/* Warning Skeleton */}
           <SkeletonBox width="100%" height={100} borderRadius={16} style={{marginBottom: 30}} />
           
           {/* Input 1 Skeleton */}
           <View style={{ marginBottom: 20, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
               <SkeletonBox width={100} height={20} style={{ marginBottom: 10 }} />
               <SkeletonBox width="100%" height={60} borderRadius={16} />
           </View>
           {/* Input 2 Skeleton */}
           <View style={{ marginBottom: 20, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
               <SkeletonBox width={100} height={20} style={{ marginBottom: 10 }} />
               <SkeletonBox width="100%" height={60} borderRadius={16} />
           </View>
           {/* Input 3 Skeleton */}
           <View style={{ marginBottom: 20, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
               <SkeletonBox width={100} height={20} style={{ marginBottom: 10 }} />
               <SkeletonBox width="100%" height={60} borderRadius={16} />
           </View>
           
           {/* Button Skeleton */}
           <SkeletonBox width="100%" height={56} borderRadius={16} style={{ marginTop: 20 }} />
        </View>
      ) : (
        // --- REAL CONTENT ---
        <Animated.ScrollView 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            style={{ opacity: contentOpacity }} // Fade in whole content
        >
            {/* Warning Card */}
            <LinearGradient
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                style={[styles.infoBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
                <View style={[styles.infoIcon, isRTL ? { marginLeft: 12 } : { marginRight: 12 }]}>
                    <Ionicons name="alert-circle" size={24} color="#F59E0B" />
                </View>
                <View style={styles.infoTextContainer}>
                    <Text style={[styles.infoTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('importantWarning')}
                    </Text>
                    <Text style={[styles.infoDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('academicChangeWarningMsg')}
                    </Text>
                </View>
            </LinearGradient>

            <SelectionInput 
                label={t('educationalPathLabel')}
                placeholder={t('selectPathPlaceholder')}
                value={selectedPath?.label}
                onPress={() => setShowPathModal(true)}
                icon="university"
            />

             <SelectionInput 
                label={t('section')} // كان "Section"
                placeholder={t('selectSectionPlaceholder') || "Select Section"} // كان نصاً ثابتاً
                value={selectedSection?.label}
                onPress={() => setShowSectionModal(true)}
                disabled={!selectedPath}
                icon="layer-group"
            />
            <SelectionInput 
                label={t('studyGroupLabel')}
                placeholder={t('selectGroupPlaceholder')}
                value={selectedGroup?.label}
                onPress={() => setShowGroupModal(true)}
                disabled={!selectedSection}
                icon="users"
            />

            <View style={styles.footer}>
                {saving ? (
                    <View style={styles.savingContainer}>
                        <ActivityIndicator size="small" color="#fff" style={{marginRight: 10}} />
                        <Text style={{color: 'white', fontWeight: 'bold'}}>{t('saving') || 'Saving...'}</Text>
                    </View>
                ) : (
                    <AnimatedGradientButton 
                        text={t('saveChanges')}
                        onPress={handleSave}
                        buttonWidth="100%"
                        buttonHeight={56}
                        borderRadius={16}
                        fontSize={18}
                        disabled={!selectedGroup}
                        icon={isRTL ? "check-circle" : null}
                    />
                )}
            </View>

        </Animated.ScrollView>
      )}

      {/* Modals - Keeping them exactly as they were */}
      <SelectionModal
        visible={showPathModal}
        onClose={() => setShowPathModal(false)}
        onSelect={handleSelectPath}
        data={paths}
        isRTL={isRTL} 
        title={t('educationalPathLabel')}
        searchPlaceholder={t('searcheducationalpath') || t('search')} 
        icon="university"
      />
       <SelectionModal
                visible={showSectionModal}
                onClose={() => setShowSectionModal(false)}
                onSelect={handleSelectSection}
                data={sections}
                isRTL={isRTL} 
                title={t('section')} // سيظهر الآن "المجموعة" أو "Section" حسب اللغة
                    searchPlaceholder={t('searcheducationalsection') || t('search')} 
                icon="layer-group"
                noResultsText={t('noResults') || "No results found"}
            />
      <SelectionModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSelect={(item) => { setSelectedGroup(item); setShowGroupModal(false); }}
        data={groups}
        isRTL={isRTL} 
        title={t('studyGroupLabel')}
        searchPlaceholder={t('searcheducationalgroup') || t('search')} 
        icon="users"
        noResultsText="No groups found"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  backBtnPressed: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  
  content: { padding: 24, paddingBottom: 50 },

  infoBox: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginBottom: 30,
  },
  infoIcon: { marginTop: 2 },
  infoTextContainer: { flex: 1 },
  infoTitle: { color: '#F59E0B', fontWeight: '700', fontSize: 16, marginBottom: 6 },
  infoDescription: { color: '#CBD5E1', fontSize: 13.5, lineHeight: 21 },

  // Input Styles
  inputGroup: { marginBottom: 20 },
  label: { 
      color: '#94A3B8', 
      fontSize: 14, 
      fontWeight: '600', 
      marginBottom: 8,
      marginLeft: 4 
  },
  inputContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: '#0F172A',
  },
  inputIcon: { width: 24, alignItems: 'center' },
  inputText: { flex: 1, color: '#F1F5F9', fontSize: 16, fontWeight: '500' },
  placeholderText: { color: '#64748B' },

  footer: { marginTop: 20 },
  savingContainer: {
      height: 56,
      borderRadius: 16,
      backgroundColor: '#0EA5E9',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%'
  }
});