import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { 
    ActivityIndicator, 
    Image, 
    KeyboardAvoidingView, 
    Platform, 
    Pressable, 
    ScrollView, 
    StatusBar, 
    StyleSheet, 
    Text, 
    TextInput, 
    View,
    Modal,
    Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { supabase } from '../../config/supabaseClient';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import Toast from 'react-native-toast-message'; 
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

export default function LoginScreen() {
    const { setUser } = useAppState();
    const { t, language, changeLanguage, isRTL } = useLanguage(); // ✅ Get Language Context
    const router = useRouter();
    
    const params = useLocalSearchParams();
    
    const [email, setEmail] = useState(params.email || '');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // ✅ Modal State
    const [langModalVisible, setLangModalVisible] = useState(false);

     useEffect(() => {
        if (params.email) {
            setEmail(params.email);
        }
    }, [params.email]);


    const handleLogin = async () => {
        if (!email || !password) {
            setError(t('enterEmailPassword') || 'Please enter email and password.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password,
            });

            if (authError) throw authError;

            const telemetry = await getClientTelemetry();
            apiService.logSessionStart(authData.user.id, telemetry).catch(e => console.log("Session log warning:", e));

            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*') 
                .eq('id', authData.user.id)
                .single();

            if (profileError) throw profileError;

            if (profile?.profile_status === 'deleted' || profile?.profile_status === 'suspended') {
                await supabase.auth.signOut();
                const genericErrorMsg = t('invalidCredentials') || 'Invalid email or password.';
                setError(genericErrorMsg);
                setIsLoading(false);
                return; 
            }

            setUser({
                uid: authData.user.id,
                email: authData.user.email,
                profileStatus: profile?.profile_status || 'completed',
                selectedPathId: profile?.selected_path_id,
                groupId: profile?.group_id,
                firstName: profile?.first_name,
                lastName: profile?.last_name,
                preferredLanguage: profile?.preferred_language,
                ...profile
            });
            
        } catch (error) {
            console.error("Login Error:", error.message);
            let msg = t('invalidCredentials') || 'Invalid email or password.';
            
            if (error.message && error.message.includes('Email not confirmed')) {
                msg = t('confirmEmail') || 'Please confirm your email first.';
            }
            setError(msg);
            
            Toast.show({
                type: 'error',
                text1: t('loginError') || 'Login Error',
                text2: msg
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" />
            
            {/* ✅ Language Capsule (Top Right) */}
            <View style={styles.topBar}>
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

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.contentWrapper}>
                        <View style={styles.headerContainer}>
                            <Image source={require('../../assets/images/notification-logo.png')} style={styles.logo} />
                            
                            <Text style={styles.title}>{t('welcomeBack') || 'Welcome Back!'}</Text>
                            <Text style={styles.subtitle}>{t('loginSubtitle') || 'Log in to continue your journey of excellence.'}</Text>
                        </View>
                        <View style={styles.formContainer}>
                            <TextInput 
                                style={[styles.input, !!error && styles.inputError, { textAlign: isRTL ? 'right' : 'left' }]} 
                                placeholder={t('email') || "Email"} 
                                placeholderTextColor="#8A94A4" 
                                keyboardType="email-address" 
                                autoCapitalize="none" 
                                value={email} 
                                onChangeText={(text) => { setEmail(text); setError(''); }} 
                                autoCorrect={false} 
                                editable={!isLoading}
                            />
                            <View style={[styles.passwordContainer, !!error && styles.inputError, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <TextInput 
                                    style={[styles.passwordInput, { textAlign: isRTL ? 'right' : 'left' }]} 
                                    placeholder={t('password') || "Password"} 
                                    placeholderTextColor="#8A94A4" 
                                    secureTextEntry={!isPasswordVisible} 
                                    value={password} 
                                    onChangeText={(text) => { setPassword(text); setError(''); }} 
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
                            <Pressable style={styles.forgotPasswordLink} onPress={() => router.push('/(auth)/forgot-password')} disabled={isLoading}>
                                <Text style={styles.linkText}>{t('forgotPassword') || 'Forgot your password?'}</Text>
                            </Pressable>
                        </View>
                        <View style={styles.footerContainer}>
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                            {isLoading ? (
                                <ActivityIndicator size="large" color="#10B981" style={{ height: 50 }} />
                            ) : (
                                <AnimatedGradientButton 
                                    text={t('login') || "Log in"} 
                                    onPress={handleLogin} 
                                    buttonWidth={200} 
                                    buttonHeight={50} 
                                    borderRadius={10} 
                                    fontSize={20} 
                                />
                            )}
                            <Link href="/create-account" asChild>
                                <Pressable style={styles.signupLink} disabled={isLoading}>
                                    <Text style={styles.signupText}>
                                        {t('noAccount') || "Don't have an account?"} <Text style={styles.linkText}>{t('createOne') || "Create one"}</Text>
                                    </Text>
                                </Pressable>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Language Modal */}
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
    
    // Header & Language Capsule
    topBar: { alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
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

    headerContainer: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
    logo: { width: 200, height: 150, resizeMode: 'contain', marginBottom: 15 },
    title: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    subtitle: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center' },
    
    formContainer: { marginBottom: 30 },
    input: { backgroundColor: '#1E293B', color: 'white', paddingHorizontal: 15, paddingVertical: 16, borderRadius: 12, fontSize: 16, marginBottom: 18, borderWidth: 1, borderColor: '#334155' },
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
    forgotPasswordLink: { alignSelf: 'flex-end' },
    footerContainer: { alignItems: 'center' },
    linkText: { color: '#10B981', fontWeight: 'bold' },
    signupLink: { marginTop: 25 },
    signupText: { color: '#a7adb8ff', fontSize: 15 },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 15 },
    eyeIconWrapper: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
},
    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    langModalContent: { width: '80%', backgroundColor: '#1E293B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
    langModalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 10, borderRadius: 12 },
    langOptionBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    langText: { color: '#E2E8F0', fontSize: 16, fontWeight: '500' },
});