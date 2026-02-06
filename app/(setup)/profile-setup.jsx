// app/(setup)/profile-setup.jsx

import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  I18nManager // ✅ استيراد للتحكم في اتجاه النص
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { supabase } from '../../config/supabaseClient';
import { useAppState } from '../../context/AppStateContext';
import { getEducationalPaths, getLocalizedText  } from '../../services/supabaseService';
import { useLanguage } from '../../context/LanguageContext'; // ✅ استيراد سياق اللغة

const { width } = Dimensions.get('window');

// --- مكون اختيار الجنس ---
const GenderSelector = ({ selectedGender, onSelect }) => {
  return (
    <View style={styles.genderContainer}>
      <Pressable
        style={[styles.genderButton, selectedGender === 'male' && styles.maleSelected]}
        onPress={() => onSelect('male')}
      >
        <FontAwesome5 name="mars" size={24} color={selectedGender === 'male' ? 'white' : '#94A3B8'} />
        <Text style={[styles.genderText, selectedGender === 'male' && { color: 'white' }]}>ذكر</Text>
      </Pressable>
      <Pressable
        style={[styles.genderButton, selectedGender === 'female' && styles.femaleSelected]}
        onPress={() => onSelect('female')}
      >
        <FontAwesome5 name="venus" size={24} color={selectedGender === 'female' ? 'white' : '#94A3B8'} />
        <Text style={[styles.genderText, selectedGender === 'female' && { color: 'white' }]}>أنثى</Text>
      </Pressable>
    </View>
  );
};

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, setUser } = useAppState();
  const { changeLanguage, t} = useLanguage(); // ✅ استخدام دالة تغيير اللغة

  // --- Loading & Animation States ---
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- Form States ---
  const [selectedGender, setSelectedGender] = useState(null);
  const [birthDate, setBirthDate] = useState(new Date(2004, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ Dropdowns - Language
  const [langOpen, setLangOpen] = useState(false);
  const [langValue, setLangValue] = useState('en'); // الافتراضي إنجليزي
  const [langItems, setLangItems] = useState([
    { label: 'English (Recommended)', value: 'en' }, //  تمييز الإنجليزية
    { label: 'العربية (Arabic)', value: 'ar' },
    { label: 'Français (French)', value: 'fr' },
  ]);
useEffect(() => {
    if (langValue) {
      changeLanguage(langValue); // هذا يحدث الكونتكست فوراً
    }
  }, [langValue]);
  // Dropdowns - Path & Group
  const [pathOpen, setPathOpen] = useState(false);
  const [pathValue, setPathValue] = useState(null);
  const [pathItems, setPathItems] = useState([]);

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupValue, setGroupValue] = useState(null);
  const [groupItems, setGroupItems] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // --- Effects ---

  // 1. Fetch Paths on Mount
  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const paths = await getEducationalPaths();
        
        // ✅ استخدام اللغة المختارة حالياً في الـ Dropdown العلوي (langValue)
        // هذا يضمن أن يرى الطالب التخصصات باللغة التي اختارها للتو
        const selectedLangForDisplay = langValue || 'en';

        const formattedPaths = paths.map(p => {
            const pathName = getLocalizedText(p.name_i18n || p.title, selectedLangForDisplay);
            
            const uniName = p.faculty?.institution?.name 
              ? getLocalizedText(p.faculty.institution.name, selectedLangForDisplay)
              : (p.institution_name || '');

            const label = uniName ? `${uniName} - ${pathName}` : pathName;

            return { label, value: p.id };
        });

        setPathItems(formattedPaths);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchPaths();
  }, [langValue]);

  // 2. Fetch Groups when Path Changes
  useEffect(() => {
    const fetchGroups = async () => {
      if (!pathValue) {
        setGroupItems([]);
        return;
      }
      setLoadingGroups(true);
      try {
        const { data, error } = await supabase
          .from('study_groups')
          .select('id, name')
          .eq('path_id', pathValue)
          .order('name', { ascending: true });

        if (error) throw error;

        if (data) {
          setGroupItems(data.map(g => ({ label: g.name, value: g.id })));
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, [pathValue]);

  // ✅ 3. تغيير لغة التطبيق فورياً عند الاختيار
  useEffect(() => {
    if (langValue) {
      changeLanguage(langValue);
    }
  }, [langValue]);

  // --- Handlers ---

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || birthDate;
    setShowDatePicker(Platform.OS === 'ios');
    setBirthDate(currentDate);
  };

  const handleSaveProfile = async () => {
    if (!pathValue || !selectedGender || !groupValue) {
      alert("يرجى إكمال جميع الحقول المطلوبة (التخصص، الفوج، الجنس).");
      return;
    }

    setIsSubmitting(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    try {
      const updates = {
        selected_path_id: pathValue,
        group_id: groupValue,
        gender: selectedGender,
        preferred_language: langValue, // ✅ حفظ اللغة في الداتابايز
        date_of_birth: birthDate.toISOString(),
        profile_status: 'completed',
        updated_at: new Date(),
      };

      // 1. Update DB
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.uid);

      if (error) throw error;

      // 2. Delay for UX
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. Update Context
      setUser(prev => ({ ...prev, ...updates }));

      // التوجيه يتم تلقائياً عبر _layout
      
    } catch (error) {
      console.error("Error saving profile:", error);
      setIsSubmitting(false);
      alert("حدث خطأ أثناء الحفظ، حاول مرة أخرى.");
    }
  };

  if (isSubmitting) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
          <LottieView
            source={require('../../assets/images/rocket_loading.json')}
            autoPlay
            loop
            style={{ width: 250, height: 250 }}
          />
          <Text style={styles.loadingTitle}>جاري إعداد مساحتك...</Text>
          <Text style={styles.loadingSubtitle}>
            نقوم بتخصيص المحتوى الدراسي، وجلب جداول فوجك، وترتيب دروسك لتجربة مثالية.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.title}>إعداد الملف الشخصي</Text>
            <Text style={styles.subtitle}>
              ساعدنا لنتعرف عليك أكثر ونقدم لك تجربة تعليمية مخصصة.
            </Text>
          </View>

          {isLoadingData ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 50 }} />
          ) : (
            
            <View style={styles.form}>
              
              {/* ✅ 1. لغة التطبيق (في الأعلى) */}
              <View style={[styles.inputGroup, { zIndex: 3000 }]}>
                <Text style={styles.label}>لغة التطبيق المفضلة</Text>
                <DropDownPicker
                  open={langOpen}
                  value={langValue}
                  items={langItems}
                  setOpen={setLangOpen}
                  setValue={setLangValue}
                  setItems={setLangItems}
                  theme="DARK"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  textStyle={styles.dropdownText}
                  placeholder="اختر اللغة"
                  // إضافة نص توضيحي بجانب الإنجليزية
                  renderListItem={(props) => {
                     const isRecommended = props.value === 'en';
                     return (
                        <Pressable 
                            {...props} 
                            onPress={() => props.onPress(props.item)}
                            style={[
                                styles.dropdownItem, 
                                props.isSelected && { backgroundColor: '#334155' }
                            ]}
                        >
                            <Text style={[
                                styles.dropdownText, 
                                isRecommended && { color: '#34D399', fontWeight: 'bold' }
                            ]}>
                                {props.label}
                            </Text>
                        </Pressable>
                     );
                  }}
                />
                {/* نص نصيحة صغير */}
                <Text style={styles.hintText}>
                  💡 نوصي باللغة الإنجليزية للحصول على أفضل دقة من الذكاء الاصطناعي.
                </Text>
              </View>

              {/* 2. التخصص الدراسي */}
              <View style={[styles.inputGroup, { zIndex: 2000 }]}>
                <Text style={styles.label}>التخصص الدراسي</Text>
                <DropDownPicker
                  open={pathOpen}
                  value={pathValue}
                  items={pathItems}
                  setOpen={setPathOpen}
                  setValue={setPathValue}
                  setItems={setPathItems}
                  theme="DARK"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  textStyle={styles.dropdownText}
                  listMode="MODAL"
                  placeholder="اختر تخصصك الجامعي"
                  modalTitle="اختر التخصص"
                />
              </View>

              {/* 3. الفوج الدراسي */}
              <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                <Text style={styles.label}>الفوج الدراسي (Groupe)</Text>
                <DropDownPicker
                  open={groupOpen}
                  value={groupValue}
                  items={groupItems}
                  setOpen={setGroupOpen}
                  setValue={setGroupValue}
                  setItems={setGroupItems}
                  theme="DARK"
                  style={[styles.dropdown, !pathValue && { opacity: 0.5 }]}
                  dropDownContainerStyle={styles.dropdownContainer}
                  textStyle={styles.dropdownText}
                  placeholder={pathValue ? (loadingGroups ? "جاري جلب الأفواج..." : "اختر فوجك") : "اختر التخصص أولاً"}
                  disabled={!pathValue}
                />
              </View>

              {/* 4. تاريخ الميلاد */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>تاريخ الميلاد</Text>
                <Pressable 
                  style={styles.dateButton} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {birthDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
                </Pressable>
                
                {showDatePicker && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={birthDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1950, 0, 1)}
                  />
                )}
              </View>

              {/* 5. الجنس */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الجنس</Text>
                <GenderSelector selectedGender={selectedGender} onSelect={setSelectedGender} />
              </View>

              {/* زر الحفظ */}
              <View style={styles.footer}>
                <AnimatedGradientButton
                  text="حفظ وبدء الرحلة"
                  onPress={handleSaveProfile}
                  buttonWidth={width * 0.85}
                  buttonHeight={56}
                  borderRadius={16}
                  fontSize={18}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 24, paddingBottom: 50 },
  
  header: { marginBottom: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },

  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', marginBottom: 8, textAlign: 'right' },
  
  dropdown: { 
    backgroundColor: '#1E293B', 
    borderColor: '#334155', 
    borderRadius: 12,
    height: 56
  },
  dropdownContainer: { 
    backgroundColor: '#1E293B', 
    borderColor: '#334155' 
  },
  dropdownText: { 
    color: 'white', 
    textAlign: 'right',
    fontSize: 15
  },
  dropdownItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#334155'
  },
  hintText: {
      color: '#94A3B8',
      fontSize: 12,
      marginTop: 8,
      textAlign: 'right',
      fontStyle: 'italic'
  },

  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 56,
  },
  dateText: { color: 'white', fontSize: 16 },

  genderContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  genderButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#334155', 
    backgroundColor: '#1E293B',
    gap: 10
  },
  maleSelected: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38BDF8' },
  femaleSelected: { backgroundColor: 'rgba(244, 114, 182, 0.15)', borderColor: '#F472B6' },
  genderText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },

  footer: { marginTop: 20, alignItems: 'center' },

  loadingContainer: { 
    flex: 1, 
    backgroundColor: '#0F172A', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  loadingContent: { alignItems: 'center', width: '100%' },
  loadingTitle: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginTop: 20, 
    marginBottom: 10 
  },
  loadingSubtitle: { 
    color: '#94A3B8', 
    fontSize: 16, 
    textAlign: 'center', 
    lineHeight: 24,
    maxWidth: '80%'
  }
});