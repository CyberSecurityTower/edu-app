import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message'; 
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  FadeOutLeft, 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSequence
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';

// ✅ Import new services
import { apiService } from '../../config/api';
import { getClientTelemetry } from '../../services/supabaseService';

const { width } = Dimensions.get('window');

// --- 1. Enhanced Input Component ---
const AnimatedInput = ({ value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, maxLength, style, textAlign, error }) => {
  const isFocused = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(10, { duration: 50 }), 
        withTiming(-10, { duration: 50 }), 
        withTiming(10, { duration: 50 }), 
        withTiming(0, { duration: 50 })
      );
    }
  }, [error]);

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = withTiming(
      error ? '#EF4444' : (isFocused.value === 1 ? '#38BDF8' : 'rgba(255,255,255,0.1)'),
      { duration: 200 }
    );
    const borderWidth = withTiming(isFocused.value === 1 || error ? 1.5 : 1);
    
    return {
      borderColor,
      borderWidth,
      transform: [{ translateX: shake.value }],
      backgroundColor: withTiming(isFocused.value === 1 ? 'rgba(30, 41, 59, 0.9)' : 'rgba(30, 41, 59, 0.6)'),
    };
  });

  return (
    <Animated.View style={[styles.inputContainer, animatedStyle]}>
      <TextInput
        style={[styles.input, style, textAlign && { textAlign }]}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        onFocus={() => (isFocused.value = 1)}
        onBlur={() => (isFocused.value = 0)}
      />
      {error && <FontAwesome5 name="exclamation-circle" size={16} color="#EF4444" style={{ marginRight: 15 }} />}
    </Animated.View>
  );
};

// --- 2. Interaction Button ---
const BouncyButton = ({ onPress, disabled, children, loading }) => {
  return (
    <Pressable 
      onPress={onPress} 
      disabled={disabled}
      style={({ pressed }) => [
        styles.button, 
        { 
          opacity: disabled ? 0.7 : 1, 
          transform: [{ scale: pressed ? 0.96 : 1 }] 
        }
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#0F172A" />
      ) : (
        children
      )}
    </Pressable>
  );
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage(); // ✅ Enable Translation
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // ✅ State to store the token from backend to complete password change
  const [recoveryToken, setRecoveryToken] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); 

  // Timer and Resend states
  const [resendTimer, setResendTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  useEffect(() => setErrorMsg(''), [email, otp, newPassword, confirmPassword]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (step === 2) {
      if (resendTimer > 0) {
        interval = setInterval(() => {
          setResendTimer((prev) => prev - 1);
        }, 1000);
      } else {
        setIsResendDisabled(false);
      }
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // ---------------------------------------------------------
  // 1. Send Code (Step 1) - via API Service
  // ---------------------------------------------------------
  const handleSendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg(t('invalidEmail') || "Please enter a valid email address.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    setLoading(true);
    try {
      // ✅ Get telemetry and call backend
      const telemetry = await getClientTelemetry();
      await apiService.requestPasswordReset(cleanEmail, telemetry);
      
      setStep(2); 
      setResendTimer(60);
      setIsResendDisabled(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: t('sentSuccess') || 'Sent 🚀',
        text2: `${t('checkEmail') || 'Check your email'}: ${cleanEmail}`,
        position: 'top',
        topOffset: 60
      });
      
    } catch (error) {
      setErrorMsg(error.message || t('sendError') || "An error occurred while sending");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 2. Resend Code - via API Service
  // ---------------------------------------------------------
  const handleResendCode = async () => {
    if (isResendDisabled) return;

    setLoading(true);
    try {
      const telemetry = await getClientTelemetry();
      await apiService.requestPasswordReset(email.trim().toLowerCase(), telemetry);

      setResendTimer(60);
      setIsResendDisabled(true);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'info',
        text1: t('resentSuccess') || 'Resent 📧',
        text2: t('newCodeSent') || 'A new code has been sent to your email.',
        position: 'top'
      });
    } catch (error) {
      setErrorMsg(t('resendFailed') || "Resend failed, please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 3. Verify Code (Step 2) - via API Service
  // ---------------------------------------------------------
   
   const handleVerifyCode = async () => {
    // ✅ Modification 1
    if (otp.length < 6) {
      setErrorMsg(t('codeLengthError') || "Code must be at least 6 digits");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    setLoading(true);
    try {
      const telemetry = await getClientTelemetry();
      // ✅ Call backend to verify
      const response = await apiService.verifyRecoveryOtp(email.trim(), otp.trim(), telemetry);
      
      // ✅ Ensure session/token exists in response
      if (response.session && response.session.access_token) {
        setRecoveryToken(response.session.access_token); // Save token for next step
        setStep(3); 
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ 
          type: 'success', 
          text1: t('codeValid') || 'Code Valid', 
          text2: t('setNewPassword') || 'Now set your new password', 
          position: 'top', 
          topOffset: 60 
        });
      } else {
        throw new Error(t('serverPermissionError') || "No modification permission received from server");
      }

    } catch (error) {
      console.log(error);
      setErrorMsg(error.message || t('invalidCode') || "Invalid or expired code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 4. Set New Password (Step 3) - via API Service
  // ---------------------------------------------------------
 const handleSetNewPassword = async () => {
    if (newPassword.length < 6) {
      setErrorMsg(t('passwordTooShort') || "Password is too short");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t('passwordsDoNotMatch') || "Passwords do not match");
      return;
    }
    if (!recoveryToken) {
      setErrorMsg(t('invalidSession') || "Invalid session, please try again");
      setStep(1);
      return;
    }

    setLoading(true);

    try {
        const telemetry = await getClientTelemetry();
        // ✅ Send token and new password to backend
        await apiService.resetPassword(recoveryToken, newPassword, telemetry);

        // Clear cache
        const keys = ['@user_profile_v5', '@user_tasks_v2', '@user_progress_v2'];
        await AsyncStorage.multiRemove(keys);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ 
            type: 'success', 
            text1: t('success') || 'Success', 
            text2: t('loginNow') || 'Login now',
            position: 'top'
        });

        setTimeout(() => {
            router.replace({
                pathname: '/(auth)/re-login',
                params: { email: email }
            });
        }, 1500);

    } catch (error) {
        console.error(error);
        setErrorMsg(error.message || t('updateFailed') || "Failed to update password");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F172A', '#1E293B', '#020617']} style={StyleSheet.absoluteFill} />
      
      <View style={[styles.blob, { top: -100, left: -50, backgroundColor: '#38BDF8' }]} />
      <View style={[styles.blob, { top: '40%', right: -100, backgroundColor: '#818CF8' }]} />

      <SafeAreaView style={styles.content}>
        
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome5 name="arrow-left" size={20} color="white" />
          </Pressable>
        </Animated.View>

        <View style={styles.header}>
          <Animated.View 
            key={`icon-${step}`} 
            entering={FadeInDown.springify().damping(12)}
            style={styles.iconCircle}
          >
            <LinearGradient
               colors={['rgba(56, 189, 248, 0.2)', 'rgba(56, 189, 248, 0.05)']}
               style={StyleSheet.absoluteFill} 
            />
            <FontAwesome5 name={step === 1 ? "envelope" : step === 2 ? "key" : "lock"} size={32} color="#38BDF8" />
          </Animated.View>
          
           <Animated.Text 
            key={`title-${step}`} 
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.title}
          >
            {step === 1 ? (t('recoverAccount') || 'Recover Account') : step === 2 ? (t('securityCheck') || 'Security Check') : (t('newPasswordTitle') || 'New Password')}
          </Animated.Text>
          
          <Animated.Text 
            key={`sub-${step}`} 
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.subtitle}
          >
            {step === 1 
              ? (t('enterEmailForCode') || 'Enter your email to receive a code') 
              : step === 2 
                ? (t('enterCodeSentTo', {email}) || `Enter the code sent to ${email}`) 
                : (t('createStrongPassword') || 'Create a strong password')}
          </Animated.Text>
        </View>


        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.form}>
          <Animated.View 
            key={`form-${step}`} 
            entering={FadeInRight.springify().damping(18).stiffness(100)} 
            exiting={FadeOutLeft.duration(200)} 
            style={{ width: '100%' }}
          >
            
            {step === 1 && (
              <AnimatedInput
                placeholder={t('email') || "Email"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={!!errorMsg && !email}
              />
            )}

             {step === 2 && (
              <>
                <AnimatedInput
                  style={{ fontSize: 24, letterSpacing: 8 }} // Adjust size slightly to fit 8 digits
                  textAlign="center"
                  placeholder="00000000" 
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={8} 
                  error={!!errorMsg}
                />
                
                <View style={styles.resendContainer}>
                  <Text style={styles.resendLabel}>{t('didNotReceiveCode') || "Didn't receive code?"} </Text>
                  <Pressable 
                    onPress={handleResendCode} 
                    disabled={isResendDisabled}
                    hitSlop={10}
                  >
                    <Text style={[
                      styles.resendText, 
                      isResendDisabled && styles.resendTextDisabled
                    ]}>
                      {isResendDisabled 
                        ? (t('resendIn', { seconds: resendTimer }) || `Resend in ${resendTimer}s`)
                        : (t('resendNow') || "Resend Now")}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}


            {step === 3 && (
              <>
                <AnimatedInput
                  placeholder={t('newPassword') || "New password"}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  error={!!errorMsg}
                />
                <AnimatedInput
                  placeholder={t('confirmPassword') || "Confirm password"}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={!!errorMsg && newPassword !== confirmPassword}
                />
              </>
            )}

            {errorMsg ? (
              <Animated.View entering={FadeInDown} style={styles.errorContainer}>
                <FontAwesome5 name="exclamation-triangle" size={12} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : <View style={{height: 24}} />} 
            
             <View style={{ marginTop: 10 }}>
              <BouncyButton 
                onPress={step === 1 ? handleSendCode : step === 2 ? handleVerifyCode : handleSetNewPassword}
                disabled={loading}
                loading={loading}
              >
                <Text style={styles.btnText}>
                  {step === 1 
                    ? (t('sendCode') || 'Send Code') 
                    : step === 2 
                      ? (t('verifyAndProceed') || 'Verify & Proceed') 
                      : (t('saveAndLogin') || 'Save & Login')}
                </Text>
                {!loading && <FontAwesome5 name={step === 3 ? "check" : "arrow-right"} size={16} color="#0F172A" style={{ marginLeft: 10 }} />}
              </BouncyButton>
            </View>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, padding: 24 },
  blob: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.15,
    filter: 'blur(40px)', 
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(56, 189, 248, 0.4)', 
    overflow: 'hidden',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 }
  },
  title: { fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', maxWidth: '80%', lineHeight: 22 },
  form: { width: '100%', alignItems: 'center' },
  inputContainer: { 
    width: '100%', 
    borderRadius: 16, 
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden'
  },
  input: { 
    flex: 1,
    color: 'white', 
    padding: 18, 
    fontSize: 16,
  },
  button: { 
    backgroundColor: '#38BDF8', 
    borderRadius: 16, 
    paddingVertical: 18, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4}
  },
  btnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 18 },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 5,
    marginBottom: 10,
    paddingHorizontal: 5
  },
  errorText: { color: '#EF4444', fontSize: 14, marginLeft: 6, fontWeight: '500' },
  
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5
  },
  resendLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  resendText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resendTextDisabled: {
    color: '#64748B',
    fontWeight: 'normal',
  }
});