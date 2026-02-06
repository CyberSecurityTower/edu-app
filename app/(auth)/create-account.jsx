import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    Linking,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { getEducationalPaths, getLocalizedText } from '../../services/supabaseService'; 
import * as Device from 'expo-device'; 
import SelectionModal from '../../components/SelectionModal'; // ✅ المكون الجديد
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { supabase } from '../../config/supabaseClient';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext'; // ✅ 1. استيراد هوك اللغة

import { apiService } from '../../config/api';
import { getClientTelemetry } from '../../services/supabaseService';

import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
// --- 🌍 Language Selection Modal ---
const LanguageModal = ({ visible, onClose, currentLang, onSelect, isRTL }) => {
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
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
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
};
export default function CreateAccountScreen() {
  const { setUser } = useAppState();
  const router = useRouter();
  const LEGAL_URL = "https://edu-legal-zeta.vercel.app/";
  const { language, changeLanguage, isRTL, t } = useLanguage(); 

  const openLegalPage = async () => {
    const supported = await Linking.canOpenURL(LEGAL_URL);
    if (supported) {
        await Linking.openURL(LEGAL_URL);
    } else {
        console.error("Don't know how to open this URL: " + LEGAL_URL);
    }
  };

  // --- State Management ---
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Step 1: Account Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Step 2: Profile Setup
  const [selectedGender, setSelectedGender] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Dropdown: Path
  const [isPathModalVisible, setPathModalVisible] = useState(false);
  const [isSectionModalVisible, setSectionModalVisible] = useState(false);
  const [isGroupModalVisible, setGroupModalVisible] = useState(false);

  // ✅ Data States
  const [pathValue, setPathValue] = useState(null);
  const [pathItems, setPathItems] = useState([]);


  const [groupValue, setGroupValue] = useState(null);
  const [groupItems, setGroupItems] = useState([]);

  // Date Picker
  const [birthDate, setBirthDate] = useState(new Date(2007, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animations
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
   // ✅ New State for Sections
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionValue, setSectionValue] = useState(null);
  const [sectionItems, setSectionItems] = useState([]);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false); // التحكم في الظهور

  // نحتفظ بكل الأفواج القادمة من السيرفر هنا، ثم نفلترها للعرض
  const [allGroups, setAllGroups] = useState([]); 
  // --- Effects ---
  
  // 1. Fetch Paths
  useEffect(() => {
    const loadPaths = async () => {
      try {
        const paths = await getEducationalPaths();
        if (paths) {
          // ✅ تنسيق البيانات للهيكلة الجديدة
          const formattedPaths = paths.map(p => {
            // ✅ 3. استبدال currentLang بـ language
            const pathName = getLocalizedText(p.name_i18n || p.title, language);
            
            // ✅ استبدال currentLang بـ language هنا أيضاً
            const uniName = p.faculty?.institution?.name 
              ? getLocalizedText(p.faculty.institution.name, language)
              : (p.institution_name || ''); // دعم القديم

            // التسمية النهائية: "جامعة الجزائر 3 - علوم إعلام"
            const label = uniName ? `${uniName} - ${pathName}` : pathName;

            return { 
              label: label, 
              value: p.id,
              // نحتفظ بالكائن الأصلي إذا احتجنا له
              originalData: p 
            };
          });
          
          setPathItems(formattedPaths);
        }
      } catch (error) {
        console.error("Failed to load paths", error);
      }
    };
    loadPaths();
  }, [language]); // ✅ إضافة language للمصفوفة لتحديث النصوص عند تغيير اللغة

  // 2. Fetch Groups
   useEffect(() => {
    const fetchHierarchy = async () => {
      // تصفير القيم عند تغيير التخصص
      setSectionValue(null);
      setGroupValue(null);
      setSectionItems([]);
      setGroupItems([]);
      setAllGroups([]);
      setShowSectionDropdown(false);

      if (!pathValue) return;

      setLoadingGroups(true);
      try {
        // طلب البيانات من الباك أند الجديد
        // ملاحظة: يمكنك استخدام supabase مباشرة هنا إذا كانت سياسات RLS تسمح بالقراءة العامة
        const response = await fetch(`${apiService.BASE_URL}/academic/hierarchy?pathId=${pathValue}`);
        const data = await response.json();

        if (data.sections && data.sections.length > 1) {
          // الحالة 1: يوجد أقسام متعددة -> تفعيل الـ Dropdown
          setShowSectionDropdown(true);
          setSectionItems(data.sections.map(s => ({ label: s.name, value: s.id })));
          setAllGroups(data.groups); // تخزين الكل للفلترة لاحقاً
        } else {
          // الحالة 2: قسم واحد أو لا يوجد -> إخفاء الـ Dropdown وعرض كل الأفواج
          setShowSectionDropdown(false);
          // إذا كان هناك قسم وحيد، نقوم باختياره تلقائياً في الخلفية (اختياري)
          if (data.sections.length === 1) {
             setSectionValue(data.sections[0].id);
          }
          // عرض الأفواج مباشرة
          setGroupItems(data.groups.map(g => ({ label: g.name, value: g.id })));
        }

      } catch (err) {
        console.error("Error fetching hierarchy:", err);
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchHierarchy();
  }, [pathValue]);
  // ✅ New Effect: Filter Groups when Section changes (فقط إذا كان الـ Dropdown ظاهراً)
  useEffect(() => {
    if (showSectionDropdown && sectionValue) {
      // فلترة الأفواج بناءً على القسم المختار
      const filteredGroups = allGroups.filter(g => g.section_id === sectionValue);
      setGroupItems(filteredGroups.map(g => ({ label: g.name, value: g.id })));
      setGroupValue(null); // تصفير الفوج ليختار المستخدم من جديد
    }
  }, [sectionValue, showSectionDropdown]);
  // --- Helpers ---
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const clearError = (fieldName) => {
    if (errors[fieldName] || errors.general) {
      setErrors((prev) => ({ ...prev, [fieldName]: null, general: null }));
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || birthDate;
    setShowDatePicker(Platform.OS === 'ios');
    setBirthDate(currentDate);
  };

  // --- Handlers ---

  // المرحلة الأولى: التحقق من المستخدم
  const handleNextStep = async () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!validateEmail(email.trim())) newErrors.email = 'Invalid email address.';
    if (!password) newErrors.password = 'Password is required.';
    else if (password.length < 6) newErrors.password = 'Min 6 characters.';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
        // استدعاء Endpoint فحص الإيميل
        const checkResult = await apiService.checkEmail(email.trim().toLowerCase());

        if (checkResult.exists) {
            Toast.show({
                type: 'info',
                text1: 'الحساب موجود بالفعل',
                text2: 'جاري تحويلك لتسجيل الدخول...'
            });
            setTimeout(() => router.replace('/login'), 1500);
            return;
        }

        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            setStep(2);
            setIsLoading(false); 
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        });

    } catch (error) {
        console.error("Check Email Error:", error);
        setErrors({ general: "فشل الاتصال بالسيرفر، تحقق من الإنترنت." });
        setIsLoading(false);
    }
  };

  // المرحلة الثانية: بدء التسجيل
  const handleCreateAccountFull = async () => {
    const newErrors = {};
    if (!pathValue) newErrors.path = 'Please select your educational path.';
    if (!groupValue) newErrors.group = 'Please select your study group.';
    if (!selectedGender) newErrors.gender = 'Please select your gender.';
    if (!agreedToTerms) newErrors.terms = 'You must agree to the terms.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrors({});

     try {
      await apiService.initiateSignup(
          email.trim().toLowerCase(), 
          password,
          firstName.trim(),
          lastName.trim()
      );

      const userData = {
        email: email.trim().toLowerCase(),
        password, 
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: selectedGender,
        dateOfBirth: birthDate.toISOString(),
        selectedPathId: pathValue,
        groupId: groupValue,
      };

      router.push({
          pathname: '/(auth)/verify-email',
          params: { 
              email: email.trim().toLowerCase(),
              userData: JSON.stringify(userData) 
          }
      });

    } catch (error) {
      console.error("Signup Error:", error.message);
      
      let msg = error.message || "حدث خطأ غير متوقع";
      setErrors({ general: msg });
      triggerShake();
      
      Toast.show({
        type: 'error',
        text1: 'فشل بدء التسجيل',
        text2: msg
      });
    } finally {
      setIsLoading(false);
    }
  };

  const animatedStyle = { transform: [{ translateX: shakeAnimation }] };
  const getLabel = (items, value) => items.find(i => i.value === value)?.label;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* 👇 1. أضف هذا الجزء (زر الكبسولة) */}
<View style={[styles.topBar, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
          <Pressable 
              style={styles.langCapsule} 
              onPress={() => {
                  Haptics.selectionAsync();
                  setLangModalVisible(true);
              }}
          >
              <FontAwesome5 name="globe" size={14} color="#38BDF8" />
              <Text style={styles.langCapsuleText}>
                  {language === 'ar' ? 'العربية' : (language === 'fr' ? 'Français' : 'English')}
              </Text>
              <FontAwesome5 name="chevron-down" size={10} color="#94A3B8" style={{marginLeft: 4}} />
          </Pressable>
      </View>
      {/* 👆 نهاية الإضافة */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
       <ScrollView 
    contentContainerStyle={styles.scrollViewContent} 
    keyboardShouldPersistTaps="handled"
    scrollEnabled={true} 
>
          <View style={styles.contentWrapper}>
            
            {/* Header */}
            <View style={styles.headerContainer}>
              {step === 1 && (
                  <Image source={require('../../assets/images/notification-logo.png')} style={styles.logo} />
              )}
              <Text style={styles.title}>
  {step === 1 ? t('createAccountTitle') : t('setupProfileTitle')}
</Text>
<Text style={styles.subtitle}>
  {step === 1 ? t('createAccountSubtitle') : t('setupProfileSubtitle')}
</Text>
              
              <View style={styles.stepIndicatorContainer}>
                  <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                  <View style={styles.stepLine} />
                  <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
              </View>
            </View>

            <Animated.View style={[styles.formContainer, { opacity: fadeAnim }, animatedStyle]}>
              
              {/* --- STEP 1: Account Info --- */}
              {step === 1 && (
                <>
                  <View style={styles.nameContainer}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[
    styles.input, 
    styles.nameInput, 
    errors.firstName && styles.inputError, 
    { textAlign: isRTL ? 'right' : 'left' } // 👈 أضف هذا
  ]}
                        placeholder={t('firstNamePlaceholder') || "First Name"}
                        placeholderTextColor="#8A94A4"
                        value={firstName}
                        onChangeText={(text) => { setFirstName(text); clearError('firstName'); }}
                        editable={!isLoading}
                      />
                      {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                    </View>

                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, styles.nameInput, errors.lastName && styles.inputError]}
                        placeholder={t('lastNamePlaceholder') || "Last Name"}
                        placeholderTextColor="#8A94A4"
                        value={lastName}
                        onChangeText={(text) => { setLastName(text); clearError('lastName'); }}
                        editable={!isLoading}
                      />
                      {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                    </View>
                  </View>

                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder={t('emailPlaceholder') || "Email Address"}
                    placeholderTextColor="#8A94A4"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => { setEmail(text); clearError('email'); }}
                    editable={!isLoading}
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

<View style={[
    styles.passwordContainer, 
    errors.password && styles.inputError, 
    { flexDirection: isRTL ? 'row-reverse' : 'row' }
]}>
    <TextInput
      style={[styles.passwordInput, { textAlign: isRTL ? 'right' : 'left' }]}
      placeholder={t('passwordPlaceholder') || "Password"}
      placeholderTextColor="#8A94A4"
      secureTextEntry={!isPasswordVisible}
      value={password}
      onChangeText={(text) => { setPassword(text); clearError('password'); }}
      editable={!isLoading}
    />
    <Pressable 
    onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // اهتزاز خفيف وذكي
        setIsPasswordVisible(!isPasswordVisible);
    }} 
    style={({ pressed }) => [
        styles.eyeIconWrapper,
        pressed && { opacity: 0.7 } // تأثير استجابة عند اللمس
    ]}
>
    <Feather 
        name={isPasswordVisible ? "eye" : "eye-off"} 
        size={20} 
        color={isPasswordVisible ? "#38BDF8" : "#94A3B8"} // أزرق ساطع عند الظهور، رمادي عند الإخفاء
    />
</Pressable>
</View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                 <View style={[
    styles.passwordContainer, 
    errors.confirmPassword && styles.inputError, 
    { flexDirection: isRTL ? 'row-reverse' : 'row' }
]}>
    <TextInput
      style={[styles.passwordInput, { textAlign: isRTL ? 'right' : 'left' }]}
      placeholder={t('confirmPasswordPlaceholder') || "Confirm Password"}
      placeholderTextColor="#8A94A4"
      secureTextEntry={!isConfirmPasswordVisible}
      value={confirmPassword}
      onChangeText={(text) => { setConfirmPassword(text); clearError('confirmPassword'); }}
      editable={!isLoading}
    />
    <Pressable 
    onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // اهتزاز خفيف وذكي
        setIsPasswordVisible(!isPasswordVisible);
    }} 
    style={({ pressed }) => [
        styles.eyeIconWrapper,
        pressed && { opacity: 0.7 } // تأثير استجابة عند اللمس
    ]}
>
    <Feather 
        name={isPasswordVisible ? "eye" : "eye-off"} 
        size={20} 
        color={isPasswordVisible ? "#38BDF8" : "#94A3B8"} // أزرق ساطع عند الظهور، رمادي عند الإخفاء
    />
</Pressable>
</View>
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

                  <View style={styles.footerContainer}>
                    {errors.general && <Text style={[styles.errorText, {marginBottom: 10}]}>{errors.general}</Text>}
                    
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#10B981" style={{ height: 50 }} />
                    ) : (
                        <AnimatedGradientButton
                            text={t('nextStep') || "Next Step"}
                            onPress={handleNextStep}
                            buttonWidth={200}
                            buttonHeight={50}
                            borderRadius={10}
                            fontSize={18}
                        />
                    )}

                   <Link href="/login" asChild>
    <Pressable style={styles.loginLink} disabled={isLoading}>
        <Text style={styles.loginText}>
            {t('loginLink') || "Already a member? "}
            <Text style={styles.linkText}>{t('loginBtn') || "Log In"}</Text>
        </Text>
    </Pressable>
</Link>
                  </View>
                </>
              )}

              {/* --- STEP 2: Profile Setup --- */}
             {step === 2 && (
                <>
                   {/* ------------------------------------------- */}
                   {/* 1. Educational Path Selection */}
                   {/* ------------------------------------------- */}
                   <View style={{ marginBottom: 15 }}>
                        <Text style={styles.label}>{t('pathLabel') || "Educational Path"}</Text>
                        
                        <Pressable
                            onPress={() => setPathModalVisible(true)}
                            style={[styles.selectButton, errors.path && styles.inputError]}
                            disabled={isLoading}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {/* أيقونة داخل الزر لجمالية أكثر */}
                                <FontAwesome5 name="graduation-cap" size={16} color="#38BDF8" style={{ marginRight: 10 }} />
                                <Text style={[styles.selectButtonText, !pathValue && { color: '#8A94A4' }]}>
                                    {pathValue ? getLabel(pathItems, pathValue) : t('pathPlaceholder') || "Choose Path..."}
                                </Text>
                            </View>
                            <FontAwesome5 name="chevron-down" size={14} color="#8A94A4" />
                        </Pressable>
                        {errors.path && <Text style={styles.errorText}>{errors.path}</Text>}

                        <SelectionModal
                            visible={isPathModalVisible}
                            onClose={() => setPathModalVisible(false)}
                            data={pathItems}
                            onSelect={(item) => {
                                setPathValue(item.value);
                                clearError('path');
                                setPathModalVisible(false);
                            }}
                                isRTL={isRTL} 
                            title="Select Path"
    searchPlaceholder={t('searcheducationalpath') || t('search')} 
                            icon="graduation-cap" // 🎓 أيقونة التخصص
                        />
                   </View>

                   {/* ------------------------------------------- */}
                   {/* 2. Section Selection (Conditional) */}
                   {/* ------------------------------------------- */}
                   {showSectionDropdown && (
                     <View style={{ marginBottom: 15 }}>
                          <Text style={styles.label}>{t('section') || "Section"}</Text>
                          
                          <Pressable
                              onPress={() => setSectionModalVisible(true)}
                              style={[styles.selectButton]}
                              disabled={isLoading}
                          >
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <FontAwesome5 name="layer-group" size={16} color="#FBBF24" style={{ marginRight: 10 }} />
                                  <Text style={[styles.selectButtonText, !sectionValue && { color: '#8A94A4' }]}>
                                      {sectionValue ? getLabel(sectionItems, sectionValue) : "Choose Section..."}
                                  </Text>
                              </View>
                              <FontAwesome5 name="chevron-down" size={14} color="#8A94A4" />
                          </Pressable>

                          <SelectionModal
                              visible={isSectionModalVisible}
                              onClose={() => setSectionModalVisible(false)}
                              data={sectionItems}
                              onSelect={(item) => {
                                  setSectionValue(item.value);
                                  setSectionModalVisible(false);
                              }}
                              isRTL={isRTL} 
                              title="Select Section"
    searchPlaceholder={t('searcheducationalsection') || t('search')} 
                              icon="layer-group" // 📚 أيقونة القسم
                          />
                     </View>
                   )}

                   {/* ------------------------------------------- */}
                   {/* 3. Group Selection */}
                   {/* ------------------------------------------- */}
                   <View style={{ marginBottom: 15 }}>
                        <Text style={styles.label}>{t('groupLabel') || "Study Group"}</Text>
                        
                        <Pressable
                            onPress={() => setGroupModalVisible(true)}
                            // تعطيل الزر إذا لم يتم استيفاء الشروط
                            disabled={!pathValue || (showSectionDropdown && !sectionValue) || isLoading}
                            style={[
                                styles.selectButton, 
                                // تغيير الستايل عند التعطيل
                                (!pathValue || (showSectionDropdown && !sectionValue)) && { opacity: 0.5, backgroundColor: '#161e2e' },
                                errors.group && styles.inputError
                            ]}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <FontAwesome5 name="users" size={16} color="#34D399" style={{ marginRight: 10 }} />
                                <Text style={[styles.selectButtonText, !groupValue && { color: '#8A94A4' }]}>
                                    {groupValue 
                                        ? getLabel(groupItems, groupValue) 
                                        : (loadingGroups ? t('loading') || "Loading..." :t('groupPlaceholder') || "Choose Group...")}
                                </Text>
                            </View>
                            <FontAwesome5 name="chevron-down" size={14} color="#8A94A4" />
                        </Pressable>
                        {errors.group && <Text style={styles.errorText}>{errors.group}</Text>}

                        <SelectionModal
                            visible={isGroupModalVisible}
                            onClose={() => setGroupModalVisible(false)}
                            data={groupItems}
                            onSelect={(item) => {
                                setGroupValue(item.value);
                                clearError('group');
                                setGroupModalVisible(false);
                            }}
                                isRTL={isRTL} 

                            title="Select Group"
    searchPlaceholder={t('searcheducationalgroup') || t('search')} 
                            icon="users" // 👥 أيقونة الفوج
                        />
                   </View>

                   {/* 3. Date of Birth */}
                   <View style={{ zIndex: 1000, marginBottom: 15 }}>
                        <Text style={styles.label}>{t('dobLabel') || "Date of Birth"}</Text>
                        <Pressable 
                            style={[styles.dateButton, isLoading && {opacity: 0.6}]} 
                            onPress={() => !isLoading && setShowDatePicker(true)}
                        >
                            <Text style={styles.dateText}>
                                {birthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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
                                minimumDate={new Date(1960, 0, 1)}
                            />
                        )}
                   </View>

                 {/* 4. Gender Selection */}
                   <View style={{ marginBottom: 20 }}>
                        <Text style={styles.label}>{t('genderLabel') || "Gender"}</Text>
                        <View style={styles.genderRow}>
                            <Pressable 
                                style={[
                                    styles.genderBtn, 
                                    selectedGender === 'male' && styles.genderSelected,
                                    errors.gender && styles.inputError,
                                    isLoading && {opacity: 0.6}
                                ]} 
                                onPress={() => { if(!isLoading) { setSelectedGender('male'); clearError('gender'); } }}
                            >
                                <FontAwesome5 name="mars" size={24} color={selectedGender === 'male' ? "#10B981" : "#8A94A4"} />
                                <Text style={[styles.genderText, selectedGender === 'male' && styles.genderTextSelected]}>
                                    {t('male') || "Male"}
                                </Text>
                            </Pressable>
                            
                            <Pressable 
                                style={[
                                    styles.genderBtn, 
                                    selectedGender === 'female' && styles.genderSelected,
                                    errors.gender && styles.inputError,
                                    isLoading && {opacity: 0.6}
                                ]} 
                                onPress={() => { if(!isLoading) { setSelectedGender('female'); clearError('gender'); } }}
                            >
                                <FontAwesome5 name="venus" size={24} color={selectedGender === 'female' ? "#10B981" : "#8A94A4"} />
                                <Text style={[styles.genderText, selectedGender === 'female' && styles.genderTextSelected]}>
                                    {t('female') || "Female"}
                                </Text>
                            </Pressable>
                        </View>
                        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                   </View>

                   {/* Terms & Submit */}
                   <View style={styles.footerContainer}>
                        {errors.general && <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 15 }]}>{errors.general}</Text>}

                        <Pressable 
                            style={styles.termsContainer} 
                            onPress={() => { if(!isLoading) { setAgreedToTerms(!agreedToTerms); clearError('terms'); } }}
                        >
                            <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive, errors.terms && styles.inputError]}>
                                {agreedToTerms && <Feather name="check" size={14} color="white" />}
                            </View>
                            
                            <Text style={[styles.termsText, errors.terms && styles.termsErrorText, {textAlign: isRTL ? 'right' : 'left'}]}>
                                {t('termsAgree') || "I agree to the "}
                                <Text style={styles.linkText} onPress={openLegalPage}> Terms </Text> 
                                <Text>and </Text> 
                                <Text style={styles.linkText} onPress={openLegalPage}> Privacy Policy</Text>
                                <Text>.</Text>
                            </Text>
                        </Pressable>

                        {isLoading ? (
                            <ActivityIndicator size="large" color="#10B981" style={{ height: 50 }} />
                        ) : (
                            <AnimatedGradientButton
                                text={t('signupBtn') || "Create Account"}
                                onPress={handleCreateAccountFull}
                                buttonWidth={220}
                                buttonHeight={50}
                                borderRadius={10}
                                fontSize={20}
                            />
                        )}

                        <Pressable onPress={() => !isLoading && setStep(1)} style={styles.backButton}>
                            <Text style={styles.backButtonText}>{t('backStep') || "Back to Step 1"}</Text>
                        </Pressable>
                   </View>
                </>
              )}

            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
       <LanguageModal 
        visible={langModalVisible} 
        onClose={() => setLangModalVisible(false)} 
        currentLang={language}
        onSelect={changeLanguage}
        isRTL={isRTL}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0C0F27' },
  container: { flex: 1 },
  scrollViewContent: { flexGrow: 1, justifyContent: 'center' },
  contentWrapper: { paddingHorizontal: 20, paddingVertical: 20 },
  
  headerContainer: { alignItems: 'center', marginBottom: 25 },
  logo: { width: 150, height: 110, resizeMode: 'contain', marginBottom: 10 },
  title: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  subtitle: { color: '#a7adb8ff', fontSize: 15, textAlign: 'center' },
  
  stepIndicatorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 10 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#334155' },
  stepDotActive: { backgroundColor: '#10B981' },
  stepLine: { width: 40, height: 2, backgroundColor: '#334155', marginHorizontal: 5 },
  topBar: { 
    alignItems: 'flex-start', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    zIndex: 10 
  },
  langCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 6
  },
  langCapsuleText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600'
  },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  langModalContent: { 
    width: '80%', 
    backgroundColor: '#1E293B', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    shadowColor: '#000', 
    shadowOpacity: 0.5, 
    shadowRadius: 30, 
    elevation: 10 
  },
  langModalTitle: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  langOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 15, 
    paddingHorizontal: 10, 
    borderRadius: 12 
  },
  langOptionBorder: { 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  langText: { 
    color: '#E2E8F0', 
    fontSize: 16, 
    fontWeight: '500' 
  },
 selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 56, // ارتفاع مريح للإصبع
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    textAlign: 'left' // أو right حسب اللغة
  },
  formContainer: { marginBottom: 10 },
  
  // Inputs
  nameContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  inputWrapper: { width: '48%' },
  nameInput: { width: '100%' },
  input: { backgroundColor: '#1E293B', color: 'white', paddingHorizontal: 15, paddingVertical: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 15 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 15,
    paddingRight: 5, // مساحة إضافية للأيقونة
},
passwordInput: {
    flex: 1,
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: 16,
    fontSize: 16,
},
eyeIconWrapper: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
},
  // Dropdown & Gender & Date
  label: { color: '#a7adb8', marginBottom: 8, marginLeft: 4, fontSize: 14, fontWeight: '600' },
  dropdown: { backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: 12 },
  dropdownContainer: { backgroundColor: '#1E293B', borderColor: '#334155' },
  
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  dateText: { color: 'white', fontSize: 16 },

  genderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  genderBtn: { flex: 0.48, backgroundColor: '#1E293B', paddingVertical: 18, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#334155' },
  genderSelected: { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  genderText: { color: '#8A94A4', fontSize: 16, fontWeight: '600' },
  genderTextSelected: { color: 'white' },

  // Footer & Terms
  footerContainer: { alignItems: 'center', marginTop: 10 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, width: '100%', justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#4B5563', borderRadius: 6, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  termsText: { color: '#a7adb8ff', fontSize: 13, flex: 1 },
  termsErrorText: { color: '#EF4444' },
  
  linkText: { color: '#10B981', fontWeight: 'bold' },
  loginLink: { marginTop: 20 },
  loginText: { color: '#a7adb8ff', fontSize: 15 },
  backButton: { marginTop: 20, padding: 10 },
  backButtonText: { color: '#8A94A4', fontSize: 14 },

  // Errors
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -10, marginBottom: 10, marginLeft: 4 },
});