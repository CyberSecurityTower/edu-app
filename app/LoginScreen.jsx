import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import AnimatedGradientButton from './AnimatedGradientButton';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)

    const handleLogin = () => {
        if (!email || !password) {
            alert('Please enter both email and password.')
            return
        }
        console.log('Attempting login with:', email)
        // Soon, we will add Firebase login logic here!
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
                            <Text style={styles.title}>Welcome Back!</Text>
                            <Text style={styles.subtitle}>Log in to continue your learning journey.</Text>
                        </View>

                        <View style={styles.formContainer}>
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
                             <Pressable style={styles.forgotPasswordLink}>
                                <Text style={styles.linkText}>Forgot Password?</Text>
                            </Pressable>
                        </View>

                        <View style={styles.footerContainer}>
                            <AnimatedGradientButton
                                text="Log In"
                                onPress={handleLogin}
                                buttonWidth={200}
                                buttonHeight={50}
                                borderRadius={10}
                                fontSize={20}
                            />
                            <Pressable style={styles.signupLink} onPress={() => navigation.navigate('CreateAccount')}>
                                <Text style={styles.signupText}>
                                    Don't have an account? <Text style={styles.linkText}>Create one</Text>
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
        width: 150,
        height: 150,
        resizeMode: 'contain',
        marginBottom: 15,
    },
    title: {
        color: 'white',
        fontSize: 28,
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
        marginBottom: 30,
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
        marginBottom: 10,
    },
    passwordInput: {
        flex: 1,
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 16,
        fontSize: 16,
    },
    forgotPasswordLink: {
        alignSelf: 'flex-end',
    },
    footerContainer: {
        alignItems: 'center',
    },
    linkText: {
        color: '#10B981',
        fontWeight: 'bold',
    },
    signupLink: {
        marginTop: 25,
    },
    signupText: {
        color: '#a7adb8ff',
        fontSize: 15,
    },
});