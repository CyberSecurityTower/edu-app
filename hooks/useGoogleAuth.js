import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

// This is necessary for Google Auth to work on web and mobile.
WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: Constants.expoConfig.extra.androidClientId,
    iosClientId: Constants.expoConfig.extra.iosClientId,
    webClientId: Constants.expoConfig.extra.androidClientId, // Often the same as Android for web
  });

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync(); // This opens the Google Sign-In window

      if (result.type === 'success') {
        // User successfully authenticated with Google
        const { id_token } = result.params;
        return { success: true, id_token };
      } else {
        // User cancelled the sign-in flow
        return { success: false, error: 'cancelled' };
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      return { success: false, error: 'unknown' };
    }
  };

  return {
    isReady: !!request, // A boolean to know if the hook is ready to be used
    signInWithGoogle,
  };
};