// app/(auth)/verify-email.jsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Services & Config
import { supabase } from '../../config/supabaseClient';
import { apiService } from '../../config/api';
import { useAppState } from '../../context/AppStateContext';
import { getClientTelemetry, refreshEducationalPathCache } from '../../services/supabaseService';

export default function VerifyEmailScreen() {
  // استقبال الإيميل وبيانات المستخدم (stringified) من الصفحة السابقة
  const { email, userData } = useLocalSearchParams();
  const router = useRouter();
  
  const { setUser, setPathDetails, markAsJustSignedUp } = useAppState();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // مؤقت إعادة الإرسال
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // 🔥 دالة التحقق وإتمام التسجيل 🔥
  const handleVerify = async () => {
    // 1. تحقق سريع من الطول
    if (otp.length < 6) { 
      setErrorMsg("الرمز يجب أن يكون 6 أرقام على الأقل");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setLoadingText('جاري التحقق...');

    try {
      // 2. تحضير البيانات للإرسال
      const telemetry = await getClientTelemetry();
      
      // فك تشفير بيانات المستخدم القادمة من الصفحة السابقة
      let parsedUserData = {};
      try {
        parsedUserData = userData ? JSON.parse(userData) : {};
      } catch (e) {
        throw new Error("حدث خطأ في استلام بيانات التسجيل.");
      }

      // دمج الكل: بيانات المستخدم + الرمز + بيانات الجهاز
      const finalPayload = {
        ...parsedUserData,
        otp: otp.trim(),
        client_telemetry: telemetry
      };

      // 3. استدعاء الباك اند (المرحلة الحاسمة)
      // هذه الدالة ستتحقق من الرمز، تنشئ المستخدم في Supabase Auth، وتدخله في جدول users
      const response = await apiService.completeSignup(finalPayload);

      if (response.session) {
        setLoadingText('جاري إعداد حسابك...');

        // 🔥 خطوة الأمان: نخبر التطبيق أننا سجلنا للتو، فلا تمسح البيانات عند تغيير الجلسة
        markAsJustSignedUp();

        // 4. إعداد كائن المستخدم المتفائل (Optimistic User Object)
        // نستخدم البيانات التي لدينا بالفعل لعرض الواجهة فوراً دون انتظار جلبها من السيرفر
        const optimisticUser = {
            uid: response.user.id,
            email: response.user.email,
            // الحقول بأسماء الكاميل (للتطبيق)
            firstName: parsedUserData.firstName,
            lastName: parsedUserData.lastName,
            selectedPathId: parsedUserData.selectedPathId, 
            groupId: parsedUserData.groupId,
            profileStatus: 'completed',
            points: 0,
            streakCount: 0,
            // الحقول بأسماء سنيك (للتوافق مع قاعدة البيانات)
            first_name: parsedUserData.firstName,
            last_name: parsedUserData.lastName,
            selected_path_id: parsedUserData.selectedPathId,
            group_id: parsedUserData.groupId,
        };

        // 5. تحديث الكونتكست وتخزين البيانات
        setUser(optimisticUser);
        await AsyncStorage.setItem('@user_profile_v5', JSON.stringify(optimisticUser));

        // 6. تحميل بيانات المواد الدراسية (Pre-fetching)
        if (optimisticUser.selectedPathId) {
            setLoadingText('جاري تحضير المواد...');
            try {
                const pathData = await refreshEducationalPathCache(optimisticUser.selectedPathId);
                if (pathData) {
                    setPathDetails(pathData); // تحديث مباشر للواجهة
                    // حفظ في الكاش لضمان السرعة في المرة القادمة
                    await AsyncStorage.setItem(`@smart_path_data_${optimisticUser.selectedPathId}`, JSON.stringify(pathData));
                }
            } catch (e) {
                console.log("Path fetch warning:", e);
            }
        }

        // 7. تفعيل الجلسة رسمياً
        // هذا سيطلق onAuthStateChange في التطبيق، لكن markAsJustSignedUp ستحمي بياناتنا
        await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });

        setLoadingText('تم بنجاح! 🚀');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 8. التوجيه للرئيسية
        setTimeout(() => {
            router.replace('/(tabs)/');
        }, 500);
      }
    } catch (error) {
      console.error("Verification Error:", error);
      setErrorMsg(error.message || "الرمز غير صحيح أو انتهت صلاحيته");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false); // نوقف التحميل فقط عند الخطأ
    }
  };

  // 🔥 إعادة إرسال الرمز 🔥
  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    setLoadingText('جاري الإرسال...');
    
    try {
        await apiService.resendSignupOtp(email);
        setTimer(60);
        setCanResend(false);
        Toast.show({ type: 'info', text1: 'تم إرسال رمز جديد 📧' });
    } catch (error) {
        Toast.show({ type: 'error', text1: 'فشل الإرسال', text2: error.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F172A', '#1E293B', '#020617']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="envelope-open-text" size={32} color="#38BDF8" />
          </View>
          <Text style={styles.title}>تفعيل الحساب</Text>
          <Text style={styles.subtitle}>أرسلنا رمز التحقق إلى {email}</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.form}>
            <TextInput
              style={[styles.input, errorMsg && styles.inputError]}
              placeholder="000000"
              placeholderTextColor="#64748B"
              value={otp}
              onChangeText={(t) => { setOtp(t); setErrorMsg(''); }}
              keyboardType="number-pad"
              maxLength={8}
              textAlign="center"
              editable={!loading}
              autoFocus={true}
            />
            
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {/* مؤشر التحميل مع النص المتغير */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#38BDF8" style={{marginBottom: 10}} />
                    <Text style={styles.loadingText}>{loadingText}</Text>
                </View>
            )}

            <View style={styles.resendContainer}>
                <Text style={styles.resendLabel}>لم يصلك الرمز؟ </Text>
                <Pressable onPress={handleResend} disabled={!canResend || loading}>
                    <Text style={[styles.resendText, (!canResend || loading) && styles.resendTextDisabled]}>
                        {canResend ? "إعادة إرسال الآن" : `إعادة إرسال (${timer}ث)`}
                    </Text>
                </Pressable>
            </View>

            <Pressable 
                style={({ pressed }) => [styles.button, { opacity: pressed || loading ? 0.8 : 1 }]}
                onPress={handleVerify}
                disabled={loading}
            >
                <Text style={styles.btnText}>
                    {loading ? "جاري المعالجة..." : "تأكيد وتفعيل"}
                </Text>
            </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(56, 189, 248, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#38BDF8' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  form: { width: '100%' },
  input: { backgroundColor: '#1E293B', color: 'white', borderRadius: 12, padding: 16, fontSize: 24, letterSpacing: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 10, fontWeight: 'bold' },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 10 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  resendLabel: { color: '#94A3B8' },
  resendText: { color: '#38BDF8', fontWeight: 'bold' },
  resendTextDisabled: { color: '#64748B' },
  button: { backgroundColor: '#38BDF8', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 18 },
  loadingContainer: { alignItems: 'center', marginBottom: 20 },
  loadingText: { color: '#38BDF8', fontSize: 14, fontWeight: '600' }
});