import React, { useState, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image, Animated, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { Feather } from '@expo/vector-icons';
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as Device from 'expo-device'; // Import expo-device

export default function CreateAccountScreen() {
    const [firstName, setFirstName]    = useState('');
    const [lastName, setLastName]      = useState('');
    const [email, setEmail]            = useState('');
    const [password, setPassword]      = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [errors, setErrors]          = useState({});
    const [isLoading, setIsLoading]    = useState(false);
    const shakeAnimation = useRef(new Animated.Value(0)).current;

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
        ]).start();
    };

    const validateEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const handleCreateAccount = async () => {
        const newErrors = {};
        if (!firstName.trim()) newErrors.firstName = 'First name is required.';
        if (!lastName.trim()) newErrors.lastName = 'Last name is required.';
        if (!email.trim()) newErrors.email = 'Email is required.';
        else if (!validateEmail(email.trim())) newErrors.email = 'Please enter a valid email address.';
        if (!password) newErrors.password = 'Password is required.';
        else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters long.';
        if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
        if (!agreedToTerms) newErrors.terms = 'You must agree to the terms.';

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            if (newErrors.terms) triggerShake();
            return;
        }

        setIsLoading(true);
        try {
            const deviceId = Device.osInternalBuildId || `${Device.osName}-${Device.osVersion}`;
            if (!deviceId) {
                throw new Error("Could not identify the device.");
            }

            const trialRef = doc(db, "trialActivations", deviceId);
            const trialSnap = await getDoc(trialRef);

            if (trialSnap.exists()) {
                setErrors({ general: "The free trial has already been used on this device. Please log in." });
                setIsLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                createdAt: new Date(),
                profileStatus: "pending_setup",
                selectedPathId: null,
            });

            await setDoc(trialRef, {
                activatedAt: new Date(),
                userIds: [user.uid], // Store as an array to track multiple attempts
            });

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setErrors({ email: 'This email address is already in use.' });
            } else {
                setErrors({ general: 'An error occurred. Please try again.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = (fieldName) => {
        if (errors[fieldName] || errors.general) {
            setErrors(prev => ({ ...prev, [fieldName]: null, general: null }));
        }
    };

    const animatedStyle = { transform: [{ translateX: shakeAnimation }] };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.contentWrapper}>
                        <View style={styles.headerContainer}>
                            <Image source={require('../../assets/images/logo_accountCreating.png')} style={styles.logo} />
                            <Text style={styles.title}>Join the Future of Learning</Text>
                            <Text style={styles.subtitle}>Create your account to unlock your potential.</Text>
                        </View>
                        <View style={styles.formContainer}>
                            <View style={styles.nameContainer}>
                                <View style={styles.inputWrapper}>
                                    <TextInput style={[styles.input, styles.nameInput, errors.firstName && styles.inputError]} placeholder="First Name" placeholderTextColor="#8A94A4" value={firstName} onChangeText={(text) => { setFirstName(text); clearError('firstName'); }} autoCorrect={false} />
                                    {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                                </View>
                                <View style={styles.inputWrapper}>
                                    <TextInput style={[styles.input, styles.nameInput, errors.lastName && styles.inputError]} placeholder="Last Name" placeholderTextColor="#8A94A4" value={lastName} onChangeText={(text) => { setLastName(text); clearError('lastName'); }} autoCorrect={false} />
                                    {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                                </View>
                            </View>
                            <TextInput style={[styles.input, errors.email && styles.inputError]} placeholder="Email Address" placeholderTextColor="#8A94A4" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(text) => { setEmail(text); clearError('email'); }} autoCorrect={false} />
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                                <TextInput style={styles.passwordInput} placeholder="Password" placeholderTextColor="#8A94A4" secureTextEntry={!isPasswordVisible} value={password} onChangeText={(text) => { setPassword(text); clearError('password'); }} />
                                <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}><Feather name={isPasswordVisible ? "eye-off" : "eye"} size={22} color="#8A94A4" /></Pressable>
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                                <TextInput style={styles.passwordInput} placeholder="Confirm Password" placeholderTextColor="#8A94A4" secureTextEntry={!isConfirmPasswordVisible} value={confirmPassword} onChangeText={(text) => { setConfirmPassword(text); clearError('confirmPassword'); }} />
                                <Pressable onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}><Feather name={isConfirmPasswordVisible ? "eye-off" : "eye"} size={22} color="#8A94A4" /></Pressable>
                            </View>
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                        </View>
                        <View style={styles.footerContainer}>
                            {errors.general && <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 15 }]}>{errors.general}</Text>}
                            <Animated.View style={[styles.termsContainer, animatedStyle]}>
                                <Pressable style={styles.checkbox} onPress={() => { setAgreedToTerms(!agreedToTerms); clearError('terms'); }}>
                                    {agreedToTerms && <View style={styles.checkboxChecked} />}
                                </Pressable>
                                <Text style={[styles.termsText, errors.terms && styles.termsErrorText]}>I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.</Text>
                            </Animated.View>
                            {isLoading ? (<ActivityIndicator size="large" color="#10B981" style={{ height: 50 }} />) : (<AnimatedGradientButton text="Create Account" onPress={handleCreateAccount} buttonWidth={200} buttonHeight={50} borderRadius={10} fontSize={20} />)}
                            <Link href="/login" asChild>
                                <Pressable style={styles.loginLink}><Text style={styles.loginText}>Already a member? <Text style={styles.linkText}>Log In</Text></Text></Pressable>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0C0F27' },
    container: { flex: 1 },
    scrollViewContent: { flexGrow: 1, justifyContent: 'center' },
    contentWrapper: { paddingHorizontal: 20, paddingVertical: 20 },
    headerContainer: { alignItems: 'center', marginBottom: 30 },
    logo: { width: 170, height: 170, resizeMode: 'contain', marginBottom: 15 },
    title: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    subtitle: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center' },
    formContainer: { marginBottom: 10 },
    nameContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    inputWrapper: { width: '48%' },
    nameInput: { width: '100%' },
    input: { backgroundColor: '#1E293B', color: 'white', paddingHorizontal: 15, paddingVertical: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    passwordInput: { flex: 1, color: 'white', paddingHorizontal: 15, paddingVertical: 16, fontSize: 16 },
    footerContainer: { alignItems: 'center' },
    termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, width: '100%' },
    checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#4B5563', borderRadius: 6, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { width: 12, height: 12, backgroundColor: '#10B981', borderRadius: 3 },
    termsText: { color: '#a7adb8ff', fontSize: 14, flex: 1 },
    termsErrorText: { color: '#EF4444' },
    linkText: { color: '#10B981', fontWeight: 'bold', textDecorationLine: 'underline' },
    loginLink: { marginTop: 20 },
    loginText: { color: '#a7adb8ff', fontSize: 15 },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginBottom: 8, marginLeft: 4 },
});