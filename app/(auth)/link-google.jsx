import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { GoogleAuthProvider, createUserWithEmailAndPassword, linkWithCredential, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import jwtDecode from 'jwt-decode';

export default function LinkGoogleScreen() {
    const params = useLocalSearchParams(); // Get data from the previous screen
    const router = useRouter();
    const { isReady, signInWithGoogle } = useGoogleAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // If for some reason the user lands here without the required params, send them back.
        if (!params.password) {
            router.replace('/create-account');
        }
    }, [params]);

    const handleLinkGoogle = async () => {
        setIsLoading(true);
        setError('');

        const googleAuthResult = await signInWithGoogle();
        if (!googleAuthResult.success || !googleAuthResult.id_token) {
            setError('Google sign-in was cancelled or failed.');
            setIsLoading(false);
            return;
        }

        try {
            const { id_token } = googleAuthResult;
            const decodedToken = jwtDecode(id_token);
            const { email, name, picture } = decodedToken;

            // Check if this Google account's email is already in use in Firebase Auth
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            if (signInMethods.length > 0) {
                setError('This Google account is already linked to another user.');
                setIsLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, params.password);
            const user = userCredential.user;

            const credential = GoogleAuthProvider.credential(id_token);
            await linkWithCredential(user, credential);

            await setDoc(doc(db, "users", user.uid), {
                userInput: {
                    firstName: params.firstName,
                    lastName: params.lastName,
                },
                googleData: {
                    displayName: name,
                    email: email,
                    photoURL: picture,
                },
                profileStatus: "pending_setup",
                createdAt: new Date(),
            });

            // Success! The AuthProvider in _layout will handle redirection.
        } catch (error) {
            console.error("Account creation/linking error:", error);
            setError('An error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.contentWrapper}>
                <Image source={require('../../assets/images/google-icon.png')} style={styles.icon} />
                <Text style={styles.title}>One Last Step!</Text>
                <Text style={styles.subtitle}>To secure your account and verify your identity, please link your Google account. We'll use this to confirm your email.</Text>
                
                {isLoading ? (
                    <ActivityIndicator size="large" color="#10B981" style={{ height: 60, marginTop: 20 }} />
                ) : (
                    <AnimatedGradientButton
                        text="Link with Google"
                        onPress={handleLinkGoogle}
                        buttonWidth={280}
                        buttonHeight={60}
                        disabled={!isReady}
                    />
                )}
                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0C0F27',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentWrapper: {
        paddingHorizontal: 20,
        alignItems: 'center',
        maxWidth: 400,
    },
    icon: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
        marginBottom: 30,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        color: '#a7adb8ff',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
    },
});