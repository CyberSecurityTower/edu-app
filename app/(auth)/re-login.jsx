import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../config/supabaseClient';
import { useAppState } from '../../context/AppStateContext';

export default function ReLoginScreen() {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  const { setUser } = useAppState();
  
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (errorMsg) setErrorMsg('');
  }, [password]);

  const handleReLogin = async () => {
    if (!password) {
      setErrorMsg("يرجى إدخال كلمة المرور");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. تسجيل الدخول باستخدام Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (authError) throw authError;

      // 2. جلب بيانات البروفايل الإضافية من جدول users
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // 3. تجهيز كائن المستخدم للتخزين في الحالة العامة
      const userData = {
        uid: authData.user.id,
        email: authData.user.email,
        firstName: profile?.first_name || '', 
        lastName: profile?.last_name || '',   
        selectedPathId: profile?.selected_path_id,
        profileStatus: profile?.profile_status,
        ...profile 
      };

      // 4. تحديث الحالة
      setUser(userData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 5. التوجيه للصفحة الرئيسية
      router.replace('/(tabs)/'); 

    } catch (error) {
      console.error("Login Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg("كلمة المرور غير صحيحة، حاول مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#020617']}
        style={StyleSheet.absoluteFill}
      />

      {/* خلفية جمالية */}
      <View style={[styles.blob, { top: -50, right: -50, backgroundColor: '#38BDF8' }]} />
      <View style={[styles.blob, { bottom: -50, left: -50, backgroundColor: '#818CF8' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <FontAwesome5 name="unlock-alt" size={32} color="#38BDF8" />
                </View>
                <View style={styles.glow} />
              </View>

              <Text style={styles.title}>مرحباً بعودتك! 👋</Text>
              <Text style={styles.subtitle}>
                تم تحديث كلمة المرور بنجاح.{'\n'}سجل دخولك الآن للمتابعة.
              </Text>
            </View>

            {/* عرض البريد الإلكتروني (للقراءة فقط) */}
            <View style={styles.emailCard}>
              <Text style={styles.emailLabel}>الحساب:</Text>
              <View style={styles.emailRow}>
                <Text style={styles.emailText}>{email}</Text>
                <FontAwesome5 name="check-circle" size={14} color="#10B981" />
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={[styles.inputContainer, errorMsg && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <FontAwesome5 name="key" size={16} color="#94A3B8" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="كلمة المرور الجديدة"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                  autoFocus={false} 
                />
                <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Feather name={showPass ? "eye" : "eye-off"} size={20} color="#64748B" />
                </Pressable>
              </View>
              
              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : <View style={{height: 20}} />}

              <Pressable 
                style={({pressed}) => [
                  styles.button, 
                  pressed && { transform: [{scale: 0.98}], opacity: 0.9 }
                ]}
                onPress={handleReLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.btnText}>الدخول للتطبيق</Text>
                    <FontAwesome5 name="arrow-left" size={16} color="#0F172A" style={{marginLeft: 10}} />
                  </View>
                )}
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.1,
    filter: 'blur(40px)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerSection: { alignItems: 'center', marginBottom: 30 },
  iconContainer: { marginBottom: 20, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  iconCircle: { 
    width: 80, height: 80, borderRadius: 40, 
    backgroundColor: 'rgba(56, 189, 248, 0.1)', 
    alignItems: 'center', justifyContent: 'center', 
    borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)', 
    zIndex: 2 
  },
  glow: { 
    position: 'absolute', width: 80, height: 80, borderRadius: 40, 
    backgroundColor: '#38BDF8', opacity: 0.2, 
    shadowColor: '#38BDF8', shadowRadius: 20, shadowOpacity: 1 
  },
  title: { fontSize: 26, fontWeight: 'bold', color: 'white', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
  emailCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emailLabel: { color: '#64748B', fontSize: 12, marginBottom: 4, textAlign: 'right' },
  emailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emailText: { color: '#E2E8F0', fontSize: 16, fontWeight: '600' },
  formSection: { width: '100%' },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#1E293B', borderRadius: 14, 
    borderWidth: 1, borderColor: '#334155', 
    height: 56, marginBottom: 8 
  },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, color: 'white', fontSize: 16, textAlign: 'right', height: '100%' },
  eyeBtn: { padding: 16 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 15 },
  button: { 
    backgroundColor: '#38BDF8', 
    height: 56, borderRadius: 14, 
    alignItems: 'center', justifyContent: 'center', 
    shadowColor: '#38BDF8', shadowOpacity: 0.3, 
    shadowRadius: 10, shadowOffset: {width: 0, height: 4} 
  },
  btnText: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' },
});