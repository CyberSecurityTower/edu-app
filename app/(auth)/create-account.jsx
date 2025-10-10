import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { Feather } from '@expo/vector-icons';

// This screen is the first step of our custom sign-up flow.
export default function InitialInfoScreen() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [errors, setErrors] = useState({});
    const router = useRouter();

    const handleNext = () => {
        const newErrors = {};
        if (!firstName.trim()) newErrors.firstName = 'First name is required.';
        if (!lastName.trim()) newErrors.lastName = 'Last name is required.';
        if (!password) {
            newErrors.password = 'Password is required.';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long.';
        }
        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        // Navigate to the next screen, passing the data as params
        router.push({
            pathname: '/link-google',
            params: { 
                firstName: firstName.trim(), 
                lastName: lastName.trim(), 
                password 
            }
        });
    };
    
    const clearError = (fieldName) => {
        if (errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: null }));
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.contentWrapper}>
                        <View style={styles.headerContainer}>
                            <Image source={require('../../assets/images/logo_accountCreating.png')} style={styles.logo} />
                            <Text style={styles.title}>Let's Get Started</Text>
                            <Text style={styles.subtitle}>First, tell us a bit about yourself.</Text>
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
                            <AnimatedGradientButton text="Next" onPress={handleNext} buttonWidth={200} buttonHeight={50} borderRadius={10} fontSize={20} />
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
    formContainer: { marginBottom: 40 },
    nameContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    inputWrapper: { width: '48%' },
    nameInput: { width: '100%' },
    input: { backgroundColor: '#1E293B', color: 'white', paddingHorizontal: 15, paddingVertical: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    passwordInput: { flex: 1, color: 'white', paddingHorizontal: 15, paddingVertical: 16, fontSize: 16 },
    footerContainer: { alignItems: 'center' },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginBottom: 8, marginLeft: 4 },
});