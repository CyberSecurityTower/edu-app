import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AnimatedGradientButton from './AnimatedGradientButton'; 
// ستحتاج إلى تثبيت مكتبة الأيقونات هذه: expo install @expo/vector-icons
import { Feather } from '@expo/vector-icons'; 

export default function CreateAccountScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const handleCreateAccount = () => {
        // هنا سيتم وضع منطق إنشاء الحساب مع Firebase لاحقاً
        // حالياً، سنقوم فقط بالتحقق من أن الشروط موافق عليها
        if (!agreedToTerms) {
            alert('Please agree to the Terms of Service and Privacy Policy.');
            return;
        }
        alert('Account creation logic goes here!');
        // لاحقاً، بعد النجاح: navigation.navigate('SetupProfile');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Let's get you started on your learning journey!</Text>
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

                        <View style={styles.termsContainer}>
                            <Pressable style={styles.checkbox} onPress={() => setAgreedToTerms(!agreedToTerms)}>
                                {agreedToTerms && <View style={styles.checkboxChecked} />}
                            </Pressable>
                            <Text style={styles.termsText}>
                                I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <AnimatedGradientButton
                            text="Create Account"
                            onPress={handleCreateAccount}
                            buttonWidth={'100%'}
                        />
                        <Pressable style={styles.loginLink} onPress={() => { /* Navigate to Login Screen */ }}>
                            <Text style={styles.loginText}>
                                Already have an account? <Text style={styles.linkText}>Log In</Text>
                            </Text>
                        </Pressable>
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: '5%',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        color: '#a7adb8ff',
        fontSize: 16,
        textAlign: 'center',
    },
    formContainer: {
        flex: 1,
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
        marginBottom: 20,
    },
    passwordInput: {
        flex: 1,
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 18,
        fontSize: 16,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
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
    linkText: {
        color: '#10B981',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    buttonContainer: {
        alignItems: 'center',
    },
    loginLink: {
        marginTop: 20,
    },
    loginText: {
        color: '#a7adb8ff',
        fontSize: 15,
    },
});