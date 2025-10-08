import React, { useState, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image, Animated } from 'react-native';
import AnimatedGradientButton from './AnimatedGradientButton';
import { Feather } from '@expo/vector-icons';

export default function CreateAccountScreen({ navigation }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [termsError, setTermsError] = useState(false);

    const shakeAnimation = useRef(new Animated.Value(0)).current;

    const triggerShake = () => {
        setTermsError(true);
        shakeAnimation.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
        ]).start(() => {
            setTimeout(() => setTermsError(false), 2000);
        });
    };

    const validateEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const handleCreateAccount = () => {
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            alert('Please fill in all fields.');
            return;
        }
        if (!validateEmail(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }
        if (!agreedToTerms) {
            triggerShake();
            return;
        }
        alert('Validation successful! Account creation logic goes here.');
    };

    const animatedStyle = {
        transform: [{
            translateX: shakeAnimation
        }]
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollViewContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.contentWrapper}>
                        <View style={styles.headerContainer}>
                            <Image
                                source={require('../assets/images/logo_accountCreating.png')}
                                style={styles.logo}
                            />
                            <Text style={styles.title}>Join the Future of Learning</Text>
                            <Text style={styles.subtitle}>Create your account to unlock your potential.</Text>
                        </View>

                        <View style={styles.formContainer}>
                            <View style={styles.nameContainer}>
                                <TextInput
                                    style={[styles.input, styles.nameInput]}
                                    placeholder="First Name"
                                    placeholderTextColor="#8A94A4"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                                <TextInput
                                    style={[styles.input, styles.nameInput]}
                                    placeholder="Last Name"
                                    placeholderTextColor="#8A94A4"
                                    value={lastName}
                                    onChangeText={setLastName}
                                />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Email Address"
                                placeholderTextColor="#8A94A4"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Password"
                                    placeholderTextColor="#8A94A4"
                                    secureTextEntry={!isPasswordVisible}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                                    <Feather name={isPasswordVisible ? "eye-off" : "eye"} size={22} color="#8A94A4" />
                                </Pressable>
                            </View>
                             <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#8A94A4"
                                    secureTextEntry={!isConfirmPasswordVisible}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <Pressable onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                                    <Feather name={isConfirmPasswordVisible ? "eye-off" : "eye"} size={22} color="#8A94A4" />
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.footerContainer}>
                             <Animated.View style={[styles.termsContainer, animatedStyle]}>
                                <Pressable style={styles.checkbox} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                                    {agreedToTerms && <View style={styles.checkboxChecked} />}
                                </Pressable>
                                <Text style={[styles.termsText, termsError && styles.termsErrorText]}>
                                    I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
                                </Text>
                            </Animated.View>
                            <AnimatedGradientButton
                                text="Create Account"
                                onPress={handleCreateAccount}
                                buttonWidth={200}
                                buttonHeight={50}
                                borderRadius={10}
                            />
                            <Pressable style={styles.loginLink} onPress={() => { /* Navigate to Login Screen */ }}>
                                <Text style={styles.loginText}>
                                    Already a member? <Text style={styles.linkText}>Log In</Text>
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0C0F27',
    },
    container: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    contentWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 170,
        height: 170,
        resizeMode: 'contain',
        marginBottom: 15,
    },
    title: {
        color: 'white',
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: '#a7adb8ff',
        fontSize: 16,
        textAlign: 'center',
    },
    formContainer: {
        marginBottom: 20,
    },
    nameContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    nameInput: {
        width: '48%',
    },
    input: {
        backgroundColor: '#1E293B',
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 16,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#334155',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 18,
    },
    passwordInput: {
        flex: 1,
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 16,
        fontSize: 16,
    },
    footerContainer: {
        alignItems: 'center',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        width: '100%',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: '#4B5563',
        borderRadius: 6,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        width: 12,
        height: 12,
        backgroundColor: '#10B981',
        borderRadius: 3,
    },
    termsText: {
        color: '#a7adb8ff',
        fontSize: 14,
        flex: 1,
    },
    termsErrorText: {
        color: '#EF4444',
    },
    linkText: {
        color: '#10B981',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    loginLink: {
        marginTop: 20,
    },
    loginText: {
        color: '#a7adb8ff',
        fontSize: 15,
    },
});