import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, 
  Platform, KeyboardAvoidingView, ActivityIndicator, 
  LayoutAnimation, UIManager, Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';

import CustomAlert from '../../components/CustomAlert';
import { supabase } from '../../config/supabaseClient';
import { anonymizeAndDeleteAccount } from '../../services/supabaseService';
import { useLanguage } from '../../context/LanguageContext';
import { apiService } from '../../config/api'; 

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  bg: ['#0F172A', '#1E293B', '#020617'],
  glass: 'rgba(30, 41, 59, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  primary: '#38BDF8',
  accent: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
  text: '#F1F5F9',
  muted: '#94A3B8'
};

const LOCAL_TR = {
  en: {
    title: "Security Settings",
    changePass: "Change Password",
    forgotPass: "Forgot Password?",
    forgotPassDesc: "Log out and start the password recovery flow.",
    resetBtn: "Reset Password",
    currentPass: "Current Password",
    newPass: "New Password",
    confirmPass: "Confirm Password",
    updatePassBtn: "Update Password",
    deleteAccount: "Delete Account",
    deleteDesc: "This action is irreversible. Your data will be wiped immediately.",
    deleteBtn: "Delete My Account",
    weak: "Weak", medium: "Medium", strong: "Strong",
    error: "Error", success: "Success",
    passChanged: "Password Changed", passChangedMsg: "Please login again.",
    networkError: "Network Error"
  },
  ar: {
    title: "إعدادات الحماية",
    changePass: "تغيير كلمة المرور",
    forgotPass: "نسيت كلمة المرور؟",
    forgotPassDesc: "تسجيل الخروج وبدء إجراءات استعادة كلمة المرور.",
    resetBtn: "استعادة كلمة المرور",
    currentPass: "كلمة المرور الحالية",
    newPass: "كلمة المرور الجديدة",
    confirmPass: "تأكيد كلمة المرور",
    updatePassBtn: "تحديث كلمة المرور",
    deleteAccount: "حذف الحساب",
    deleteDesc: "هذا الإجراء نهائي ولا رجعة فيه. سيتم مسح جميع بياناتك فوراً.",
    deleteBtn: "حذف حسابي نهائياً",
    weak: "ضعيف", medium: "متوسط", strong: "قوي",
    error: "خطأ", success: "نجاح",
    passChanged: "تم تغيير كلمة المرور", passChangedMsg: "يرجى تسجيل الدخول مجدداً.",
    networkError: "خطأ في الشبكة"
  },
  fr: {
    title: "Paramètres de sécurité",
    changePass: "Changer le mot de passe",
    forgotPass: "Mot de passe oublié ?",
    forgotPassDesc: "Déconnectez-vous et lancez la récupération.",
    resetBtn: "Réinitialiser",
    currentPass: "Mot de passe actuel",
    newPass: "Nouveau mot de passe",
    confirmPass: "Confirmer le mot de passe",
    updatePassBtn: "Mettre à jour le mot de passe",
    deleteAccount: "Supprimer le compte",
    deleteDesc: "Cette action est irréversible. Vos données seront effacées.",
    deleteBtn: "Supprimer mon compte",
    weak: "Faible", medium: "Moyen", strong: "Fort",
    error: "Erreur", success: "Succès",
    passChanged: "Mot de passe changé", passChangedMsg: "Veuillez vous reconnecter.",
    networkError: "Erreur réseau"
  }
};

const triggerHaptic = (type = 'selection') => {
  if (Platform.OS !== 'web') {
    if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.selectionAsync();
  }
};

export const getClientTelemetry = async () => {
  let batteryLevel = -1;
  try {
    const level = await Battery.getBatteryLevelAsync();
    batteryLevel = level !== -1 ? parseFloat(level.toFixed(2)) : -1;
  } catch (e) {}
  return {
    deviceModel: Device.modelName || 'Unknown',
    osVersion: `${Platform.OS} ${Device.osVersion}`,
    batteryLevel
  };
};

const AnimatedInput = ({ label, value, onChangeText, icon, isSecure, placeholder, editable = true }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.inputLabel, { color: isFocused ? COLORS.primary : COLORS.muted }]}>{label}</Text>
      <View style={[styles.inputWrapper, isFocused && { borderColor: COLORS.primary }]}>
        <MaterialIcons name={icon} size={20} color={isFocused ? COLORS.primary : COLORS.muted} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={isFocused ? placeholder : ''}
          placeholderTextColor={COLORS.muted}
          secureTextEntry={isSecure && !showPass}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          editable={editable}
        />
        {isSecure && (
          <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
             <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const StrengthMeter = ({ password, tr }) => {
  if (!password) return null;
  let score = 0;
  if (password.length > 6) score++;
  if (password.length > 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  
  const width = (score / 4) * 100;
  const color = score <= 2 ? COLORS.danger : COLORS.success;
  const text = score <= 2 ? tr.weak : score === 3 ? tr.medium : tr.strong;

  return (
    <View style={styles.meterContainer}>
      <View style={styles.meterTrack}>
        <Animated.View style={[styles.meterFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.meterText, { color }]}>{text}</Text>
    </View>
  );
};

export default function SecuritySettingsScreen() {
  const { user, setUser, logout } = useAppState();
  const router = useRouter();
  const { language, isRTL } = useLanguage();
  const tr = LOCAL_TR[language] || LOCAL_TR.en; 

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [loadingAction, setLoadingAction] = useState(null); 
  const [activeSection, setActiveSection] = useState(null); 
  const [alertInfo, setAlertInfo] = useState({ isVisible: false });

  const toggleSection = (section) => {
    triggerHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveSection(activeSection === section ? null : section);
    if (activeSection !== section) {
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    }
  };

  const handleError = (error) => {
    triggerHaptic('error');
    setAlertInfo({ isVisible: true, title: tr.error, message: error.message || 'Unknown error' });
  };

  const handleSavePassword = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return handleError({ message: tr.networkError });

    if (currentPassword === newPassword) {
       return handleError({ message: language === 'ar' ? "كلمة المرور الجديدة يجب أن تختلف عن الحالية" : "New password must be different from current one" });
    }

    if (newPassword !== confirmNewPassword) return handleError({ message: "Passwords do not match" });
    if (newPassword.length < 6) return handleError({ message: "Password too short" });

    setLoadingAction('password');
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) throw new Error("Current password incorrect");

      const telemetry = await getClientTelemetry();
      await apiService.updatePassword(user.uid, newPassword, telemetry);
      
      triggerHaptic('success');
      
      setAlertInfo({
        isVisible: true,
        title: tr.passChanged,
        message: tr.passChangedMsg,
        buttons: [{ text: "OK", onPress: async () => {
             setAlertInfo({ isVisible: false });
             const emailToPass = user.email;
             await supabase.auth.signOut(); 
             setUser(null); 
             router.replace({
                 pathname: '/(auth)/login',
                 params: { email: emailToPass } 
             });
        }}]
      });
    } catch (e) { handleError(e); }
    finally { setLoadingAction(null); }
  };

  const handleForgotPasswordAction = async () => {
    setLoadingAction('forgot');
    const emailToPass = user.email;
    await supabase.auth.signOut();
    setUser(null);
    setTimeout(() => {
        router.replace({
            pathname: '/(auth)/forgot-password',
            params: { email: emailToPass }
        });
    }, 500);
  };

  const handleDeleteAccount = () => {
    triggerHaptic('error');
    setAlertInfo({
      isVisible: true,
      title: tr.deleteAccount,
      message: tr.deleteDesc,
      buttons: [
        { text: "Cancel", style: 'cancel', onPress: () => setAlertInfo({ isVisible: false }) },
        { text: tr.deleteBtn, style: 'destructive', onPress: async () => {
            setAlertInfo({ isVisible: false });
            setLoadingAction('delete');
            try {
              await anonymizeAndDeleteAccount(user.uid);
              await AsyncStorage.clear();
              await logout();
              router.replace('/(auth)/login');
            } catch (e) { handleError(e); }
            finally { setLoadingAction(null); }
        }}
      ]
    });
  };

  const isAnyLoading = loadingAction !== null;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={COLORS.bg} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={20} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{tr.title}</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. PASSWORD SECTION */}
        <View style={styles.card}>
          <Pressable style={styles.accordionHeader} onPress={() => !isAnyLoading && toggleSection('password')}>
            <View style={styles.accordionLeft}>
              <MaterialCommunityIcons name="shield-key" size={22} color={COLORS.success} />
              <Text style={styles.accordionTitle}>{tr.changePass}</Text>
            </View>
            <Ionicons name={activeSection === 'password' ? "chevron-up" : "chevron-down"} size={20} color={COLORS.muted} />
          </Pressable>

          {activeSection === 'password' && (
            <View style={styles.accordionBody}>
              <AnimatedInput label={tr.currentPass} value={currentPassword} onChangeText={setCurrentPassword} icon="lock" isSecure placeholder="***" editable={!isAnyLoading} />
              <View style={styles.divider} />
              <AnimatedInput label={tr.newPass} value={newPassword} onChangeText={setNewPassword} icon="key" isSecure placeholder="***" editable={!isAnyLoading} />
              <StrengthMeter password={newPassword} tr={tr} />
              <AnimatedInput label={tr.confirmPass} value={confirmNewPassword} onChangeText={setConfirmNewPassword} icon="check-circle" isSecure placeholder="***" editable={!isAnyLoading} />

              <Pressable style={styles.secondaryBtn} onPress={handleSavePassword} disabled={isAnyLoading}>
                {loadingAction === 'password' ? <ActivityIndicator color="white" /> : <Text style={styles.secondaryBtnText}>{tr.updatePassBtn}</Text>}
              </Pressable>
            </View>
          )}
        </View>

        {/* 2. FORGOT PASSWORD SECTION */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Pressable style={styles.accordionHeader} onPress={() => !isAnyLoading && toggleSection('forgot')}>
            <View style={styles.accordionLeft}>
              <MaterialCommunityIcons name="lock-question" size={22} color="#38BDF8" />
              <Text style={styles.accordionTitle}>{tr.forgotPass}</Text>
            </View>
            <Ionicons name={activeSection === 'forgot' ? "chevron-up" : "chevron-down"} size={20} color={COLORS.muted} />
          </Pressable>

          {activeSection === 'forgot' && (
            <View style={styles.accordionBody}>
              <Text style={styles.helperText}>{tr.forgotPassDesc}</Text>
              <Pressable style={[styles.secondaryBtn, { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)' }]} onPress={handleForgotPasswordAction} disabled={isAnyLoading}>
                {loadingAction === 'forgot' ? <ActivityIndicator color="white" /> : <Text style={[styles.secondaryBtnText, {color: '#38BDF8'}]}>{tr.resetBtn}</Text>}
              </Pressable>
            </View>
          )}
        </View>

        {/* 3. DELETE ACCOUNT SECTION */}
        <View style={[styles.card, { marginTop: 40, borderColor: activeSection === 'delete' ? COLORS.danger : 'rgba(239, 68, 68, 0.3)', backgroundColor: activeSection === 'delete' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)' }]}>
          <Pressable style={styles.accordionHeader} onPress={() => !isAnyLoading && toggleSection('delete')}>
            <View style={styles.accordionLeft}>
              <Ionicons name="trash-bin" size={22} color={COLORS.danger} />
              <Text style={[styles.accordionTitle, { color: COLORS.danger }]}>{tr.deleteAccount}</Text>
            </View>
            <Ionicons name={activeSection === 'delete' ? "chevron-up" : "chevron-down"} size={20} color={COLORS.danger} />
          </Pressable>

          {activeSection === 'delete' && (
            <View style={styles.accordionBody}>
              <Text style={[styles.helperText, {color: '#EF4444'}]}>{tr.deleteDesc}</Text>
              <Pressable style={[styles.secondaryBtn, { backgroundColor: COLORS.danger, borderColor: COLORS.danger, marginTop: 10 }]} onPress={handleDeleteAccount} disabled={isAnyLoading}>
                {loadingAction === 'delete' ? <ActivityIndicator color="white" /> : <Text style={[styles.secondaryBtnText, { color: 'white', fontWeight: 'bold' }]}>{tr.deleteBtn}</Text>}
              </Pressable>
            </View>
          )}
        </View>

      </ScrollView>

      <CustomAlert isVisible={alertInfo.isVisible} onClose={() => setAlertInfo({ isVisible: false })} title={alertInfo.title} message={alertInfo.message} buttons={alertInfo.buttons} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25, marginTop: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.glass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.glassBorder },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: COLORS.glass, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.glassBorder, paddingHorizontal: 15, height: 50 },
  textInput: { flex: 1, color: COLORS.text, fontSize: 15, height: '100%' },
  secondaryBtn: { height: 45, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 15 },
  secondaryBtnText: { color: COLORS.text, fontWeight: '600' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accordionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  accordionBody: { marginTop: 20 },
  helperText: { color: COLORS.muted, fontSize: 13, marginBottom: 15 },
  divider: { height: 1, backgroundColor: COLORS.glassBorder, marginVertical: 15 },
  meterContainer: { marginBottom: 15, marginTop: -5 },
  meterTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 5 },
  meterFill: { height: '100%', borderRadius: 2 },
  meterText: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
});