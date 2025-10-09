import React, { useState, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image, Animated, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import AnimatedGradientButton from '../components/AnimatedGradientButton';
import { Feather } from '@expo/vector-icons';

// NEW: Import Firebase services and functions
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function CreateAccountScreen() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    
    const [errors, setErrors] = useState({});
    // NEW: Loading state to give user feedback
    const [isLoading, setIsLoading] = useState(false);

    const shakeAnimation = useRef(new Animated.Value(0)).current;

    const triggerShake = () => { /* ... (shake logic is the same) ... */ };
    const validateEmail = (email) => { /* ... (validation logic is the same) ... */ };

    // UPGRADED: The handleCreateAccount function now talks to Firebase!
    const handleCreateAccount = async () => {
        const newErrors = {};
        // ... (all previous validation checks are the same)
        if (!firstName) newErrors.firstName = 'First name is required.';
        if (!lastName) newErrors.lastName = 'Last name is required.';
        if (!email) newErrors.email = 'Email is required.';
        else if (!validateEmail(email)) newErrors.email = 'Please enter a valid email address.';
        if (!password) newErrors.password = 'Password is required.';
        else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters long.';
        if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
        if (!agreedToTerms) newErrors.terms = 'You must agree to the terms.';
        
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            if(newErrors.terms) triggerShake();
            return; // Stop if there are validation errors
        }

        setIsLoading(true); // Start loading
        try {
            // Step 1: Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Step 2: Create a document for the user in Firestore
            await setDoc(doc(db, "users", user.uid), {
                firstName: firstName,
                lastName: lastName,
                email: email,
                createdAt: new Date(), // Good practice to store creation date
            });

            console.log('SUCCESS: User account created & data saved!');
            // Here, we will navigate to the next screen (Profile Setup) in the future

        } catch (error) {
            // Handle Firebase errors
            if (error.code === 'auth/email-already-in-use') {
                setErrors({ email: 'This email address is already in use.' });
            } else {
                setErrors({ general: 'An error occurred. Please try again.' });
                console.error("Firebase Error:", error);
            }
        } finally {
            setIsLoading(false); // Stop loading, whether success or failure
        }
    };

    // ... (rest of the component is mostly the same)
    return (
        <SafeAreaView style={styles.safeArea}>
            {/* ... StatusBar, KeyboardAvoidingView, ScrollView ... */}
            <View style={styles.formContainer}>
                {/* ... All TextInput fields ... */}
            </View>

            <View style={styles.footerContainer}>
                {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}
                
                {/* ... Terms and Conditions ... */}

                {isLoading ? (
                    <ActivityIndicator size="large" color="#10B981" />
                ) : (
                    <AnimatedGradientButton
                        text="Create Account"
                        onPress={handleCreateAccount}
                        // ... other props
                    />
                )}
                
                {/* ... Login Link ... */}
            </View>
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
    inputWrapper: {
        width: '48%',
    },
    nameInput: {
        width: '100%',
        marginBottom:20
    },
    input: {
        backgroundColor: '#1E293B',
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 16,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 4, 
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom:20
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom:20
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
    inputError: {
        borderColor: '#EF4444', 
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginBottom: 8, 
        marginLeft: 4,
    },
});