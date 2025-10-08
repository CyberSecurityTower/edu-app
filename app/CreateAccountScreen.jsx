import React, { useState, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image, Animated } from 'react-native';
import AnimatedGradientButton from './AnimatedGradientButton';
import { Feather } from '@expo/vector-icons';

export default function CreateAccountScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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

    const handleCreateAccount = () => {
        if (!agreedToTerms) {
            triggerShake();
            return;
        }
        alert('Account creation logic goes here!');
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
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                placeholderTextColor="#8A94A4"
                                value={fullName}
                                onChangeText={setFullName}
                            />
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
                                text="Create My Account & Start Trial"
                                onPress={handleCreateAccount}
                                buttonWidth={'100%'}
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
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
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
    input: {
        backgroundColor: '#1E293B',
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 18,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 20,
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
    },
    passwordInput: {
        flex: 1,
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 18,
        fontSize: 16,
    },
    footerContainer: {
        alignItems: 'center',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
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
        color: '#EF4444', // Red color for error
    },
    linkText: {
        color: '#10B981',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    loginLink: {
        marginTop: 25,
    },
    loginText: {
        color: '#a7adb8ff',
        fontSize: 15,
    },
});