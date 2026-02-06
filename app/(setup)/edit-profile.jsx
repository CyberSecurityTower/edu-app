import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, 
  Platform, KeyboardAvoidingView, ActivityIndicator, Animated, 
  Dimensions, LayoutAnimation, UIManager 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../config/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

// Enable Layout Animation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- 🌍 LOCAL TRANSLATIONS ---
const TR = {
  en: {
    title: "Edit Profile",
    personalInfo: "Personal Information",
    firstName: "First Name",
    lastName: "Last Name",
    dob: "Date of Birth",
    placeOfBirth: "Place of Birth",
    save: "Save Changes",
    saving: "Saving...",
    cancel: "Cancel",
    placeholderFirst: "Enter your first name",
    placeholderLast: "Enter your last name",
    placeholderPlace: "City, Country"
  },
  ar: {
    title: "تعديل الملف الشخصي",
    personalInfo: "المعلومات الشخصية",
    firstName: "الاسم الأول",
    lastName: "اللقب",
    dob: "تاريخ الميلاد",
    placeOfBirth: "مكان الميلاد",
    save: "حفظ التغييرات",
    saving: "جاري الحفظ...",
    cancel: "إلغاء",
    placeholderFirst: "أدخل اسمك الأول",
    placeholderLast: "أدخل لقبك",
    placeholderPlace: "المدينة، الدولة"
  },
  fr: {
    title: "Modifier le profil",
    personalInfo: "Informations personnelles",
    firstName: "Prénom",
    lastName: "Nom",
    dob: "Date de naissance",
    placeOfBirth: "Lieu de naissance",
    save: "Enregistrer",
    saving: "Enregistrement...",
    cancel: "Annuler",
    placeholderFirst: "Entrez votre prénom",
    placeholderLast: "Entrez votre nom",
    placeholderPlace: "Ville, Pays"
  }
};

// --- ✨ ANIMATED SKELETON ---
const SkeletonInput = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ marginBottom: 20 }}>
      <Animated.View style={{ width: 100, height: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 8, opacity }} />
      <Animated.View style={{ width: '100%', height: 56, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, opacity }} />
    </View>
  );
};

// --- 💎 GLASS INPUT COMPONENT ---
const GlassInput = ({ label, value, onChangeText, icon, isDate, onPress, placeholder, isRTL, editable = true }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      
      <Pressable onPress={isDate ? onPress : null} style={{ width: '100%' }}>
        <View 
          style={[
            styles.inputWrapper, 
            isFocused && styles.inputWrapperFocused,
            { flexDirection: isRTL ? 'row-reverse' : 'row' }
          ]}
        >
          <View style={[styles.iconBox, { marginLeft: isRTL ? 10 : 0, marginRight: isRTL ? 0 : 10 }]}>
            <MaterialCommunityIcons 
              name={icon} 
              size={20} 
              color={isFocused ? '#38BDF8' : '#94A3B8'} 
            />
          </View>
          
          {isDate ? (
            <Text style={[styles.dateText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {value}
            </Text>
          ) : (
            <TextInput
              style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor="#64748B"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              editable={editable}
            />
          )}
        </View>
      </Pressable>
    </View>
  );
};

export default function EditProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();
  const { language, isRTL } = useLanguage();
  const t = TR[language] || TR.en;

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // --- INITIAL LOAD ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();

    let isActive = true;
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const { data } = await supabase.from('users').select('*').eq('id', user.uid).single();
        if (isActive && data) {
          // ✅ تم التصحيح: قراءة الحقول بصيغة snake_case من قاعدة البيانات
          setFirstName(data.first_name || data.firstName || '');
          setLastName(data.last_name || data.lastName || '');
          setPlaceOfBirth(data.place_of_birth || data.placeOfBirth || '');
          
          const dob = data.date_of_birth || data.dateOfBirth;
          if (dob) setDate(new Date(dob));
        }
      } catch (e) {
        console.log("Error fetching profile", e);
      } finally {
        if (isActive) setIsLoadingData(false);
      }
    };
    fetchProfile();
    return () => { isActive = false; };
  }, [user?.uid]);

  // --- HANDLERS ---
  const handleSaveInfo = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);

    try {
      // ✅ تم التصحيح: استخدام snake_case عند الإرسال لقاعدة البيانات
      const dbUpdates = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        place_of_birth: placeOfBirth.trim(),
        date_of_birth: date.toISOString(), // 👈 التصحيح هنا
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.uid);

      if (error) throw error;

      // تحديث الحالة المحلية (للتطبيق نستخدم CamelCase إذا لزم الأمر، أو نحدث الموجود)
      setUser(prev => ({ 
        ...prev, 
        firstName: firstName.trim(), 
        lastName: lastName.trim(),
        placeOfBirth: placeOfBirth.trim(),
        dateOfBirth: date.toISOString(),
        // وأيضاً نحدث النسخ الـ snake_case لضمان التوافق
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        place_of_birth: placeOfBirth.trim(),
        date_of_birth: date.toISOString()
      }));
      
      setTimeout(() => router.back(), 500); 
    } catch (error) {
      console.error("Save Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("حدث خطأ أثناء الحفظ: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Background Ambience */}
      <View style={styles.ambientLight} />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        {/* --- Header --- */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable 
            onPress={() => { Haptics.selectionAsync(); router.back(); }} 
            style={styles.backBtn}
          >
            <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={18} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <View style={{ width: 44 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* Identity Card */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.personalInfo}</Text>
            </View>

            <BlurView intensity={20} tint="dark" style={styles.glassForm}>
              {isLoadingData ? (
                <>
                  <SkeletonInput />
                  <SkeletonInput />
                  <SkeletonInput />
                  <SkeletonInput />
                </>
              ) : (
                <>
                  <GlassInput 
                    label={t.firstName} 
                    value={firstName} 
                    onChangeText={setFirstName} 
                    icon="account-outline" 
                    placeholder={t.placeholderFirst}
                    isRTL={isRTL}
                  />
                  
                  <GlassInput 
                    label={t.lastName} 
                    value={lastName} 
                    onChangeText={setLastName} 
                    icon="account-tie-outline" 
                    placeholder={t.placeholderLast}
                    isRTL={isRTL}
                  />
                  
                  <GlassInput 
                    label={t.dob} 
                    value={date.toLocaleDateString(language === 'ar' ? 'ar-EG' : (language === 'fr' ? 'fr-FR' : 'en-US'))} 
                    icon="cake-variant-outline" 
                    isDate 
                    onPress={() => setShowDatePicker(true)} 
                    isRTL={isRTL}
                  />
                  
                  {showDatePicker && (
                    <DateTimePicker 
                      value={date} 
                      mode="date" 
                      display="spinner" 
                      onChange={handleDateChange} 
                      textColor="white"
                      themeVariant="dark"
                    />
                  )}

                  <GlassInput 
                    label={t.placeOfBirth} 
                    value={placeOfBirth} 
                    onChangeText={setPlaceOfBirth} 
                    icon="map-marker-outline" 
                    placeholder={t.placeholderPlace}
                    isRTL={isRTL}
                  />

                  <View style={{ height: 20 }} />

                  {/* Save Button */}
                  <Pressable 
                    onPress={handleSaveInfo}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.saveBtn,
                      pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
                    ]}
                  >
                    <LinearGradient
                      colors={['#38BDF8', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.btnText}>{t.save}</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}
            </BlurView>
          
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' }, // Deep Navy
  
  // Ambient Light similar to Profile
  ambientLight: {
    position: 'absolute', top: -150, right: -50, width: width, height: 400,
    backgroundColor: '#38BDF8', opacity: 0.06, borderRadius: 200, transform: [{ scaleX: 1.5 }]
  },

  scrollContent: { padding: 20, paddingBottom: 50 },

  // Header
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },

  // Form Section
  sectionHeader: { marginBottom: 15, paddingHorizontal: 5 },
  sectionTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  
  glassForm: { 
    borderRadius: 24, padding: 24, 
    backgroundColor: 'rgba(30, 41, 59, 0.4)', 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },

  // Input Component
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: '#E2E8F0', marginLeft: 4 },
  inputWrapper: { 
    alignItems: 'center', 
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    borderRadius: 16, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 16, 
    height: 56 
  },
  inputWrapperFocused: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.05)'
  },
  iconBox: { justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, color: 'white', fontSize: 16, fontWeight: '500', height: '100%' },
  dateText: { flex: 1, color: 'white', fontSize: 16, fontWeight: '500' },

  // Buttons
  saveBtn: { borderRadius: 16, overflow: 'hidden', elevation: 8, shadowColor: '#38BDF8', shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
});