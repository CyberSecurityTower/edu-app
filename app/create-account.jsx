import React, { useState, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image, Animated } from 'react-native';
import { Link } from 'expo-router';
import AnimatedGradientButton from '../components/AnimatedGradientButton';
import { Feather } from '@expo/vector-icons';

export default function CreateAccountScreen() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    
    // NEW: State to hold all validation errors
    const [errors, setErrors] = useState({});

    const shakeAnimation = useRef(new Animated.Value(0)).current;

    const triggerShake = () => {
        shakeAnimation.setValue(0);
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

    // UPGRADED: The complete validation logic is back!
    const handleCreateAccount = () => {
        const newErrors = {};

        if (!firstName) newErrors.firstName = 'First name is required.';
        if (!lastName) newErrors.lastName = 'Last name is required.';
        if (!email) {
            newErrors.email = 'Email is required.';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Please enter a valid email address.';
        }
        if (!password) {
            newErrors.password = 'Password is required.';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long.';
        }
        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password.';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }
        if (!agreedToTerms) {
            newErrors.terms = 'You must agree to the terms.';
            triggerShake();
        }

        setErrors(newErrors);

        // If there are no errors, proceed
        if (Object.keys(newErrors).length === 0) {
            console.log('Validation successful! Ready for Firebase.');
            // Here we will add Firebase logic
        }
    };

    const animatedStyle = {
        transform: [{ translateX: shakeAnimation }]
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
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.input, styles.nameInput, errors.firstName && styles.inputError]}
                                        placeholder="First Name"
                                        placeholderTextColor="#8A94A4"
                                        value={firstName}
                                        onChangeText={setFirstName}
                                    />
                                    {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                                </View>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.input, styles.nameInput, errors.lastName && styles.inputError]}
                                        placeholder="Last Name"
                                        placeholderTextColor="#8A94A4"
                                        value={lastName}
                                        onChangeText={setLastName}
                                    />
                                    {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                                </View>
                            </View>
                            <TextInput
                                style={[styles.input, errors.email && styles.inputError]}
                                placeholder="Email Address"
                                placeholderTextColor="#8A94A4"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            
                            <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
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
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                             <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
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
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                        </View>

                        <View style={styles.footerContainer}>
                             <Animated.View style={[styles.termsContainer, animatedStyle]}>
                                <Pressable style={styles.checkbox} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                                    {agreedToTerms && <View style={styles.checkboxChecked} />}
                                </Pressable>
                                <Text style={[styles.termsText, errors.terms && styles.termsErrorText]}>
                                    I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
                                </Text>
                            </Animated.View>
                            <AnimatedGradientButton
                                text="Create Account"
                                onPress={handleCreateAccount}
                                buttonWidth={200}
                                buttonHeight={50}
                                borderRadius={10}
                                fontSize={20}
                            />
                            <Link href="/login" asChild>
                                <Pressable style={styles.loginLink}>
                                    <Text style={styles.loginText}>
                                        Already a member? <Text style={styles.linkText}>Log In</Text>
                                    </Text>
                                </Pressable>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // ... (all previous styles are the same)
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
    inputWrapper: {
        width: '48%',
    },
    nameInput: {
        width: '100%',
    },
    input: {
        backgroundColor: '#1E293B',
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 16,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 4, // Reduced margin to make space for error text
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
        marginBottom: 4, // Reduced margin
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
        color: '#EF4444', // Red for error
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
    // NEW STYLES for error handling
    inputError: {
        borderColor: '#EF4444', // Red border for inputs with errors
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginBottom: 12, // Space after the error message
        marginLeft: 4,
    },
});