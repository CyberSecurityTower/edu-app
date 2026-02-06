// hooks/useNetworkStatus.js
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from 'expo-router';

// This hook provides a robust network status using the official netinfo library.
// 'strong': Connected and likely fast (4G/5G/good WiFi).
// 'weak': Connected but likely slow (2G/3G/poor WiFi).
// 'no-internet': Connected to a network but no internet access (only available on some platforms).
// 'none': No network connection at all.
// 'unknown': Initial state.
export const useNetworkStatus = () => {
  const [status, setStatus] = useState('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        setStatus('none');
        return;
      }
      
      // state.isInternetReachable can be null, false, or true.
      if (state.isInternetReachable === false) {
          setStatus('no-internet');
          return;
      }

      if (state.type === 'wifi') {
        const strength = state.details?.strength; // 0-100
        if (strength != null) {
          setStatus(strength > 35 ? 'strong' : 'weak');
        } else {
          setStatus('strong');
        }
      } else if (state.type === 'cellular') {
        const gen = state.details?.cellularGeneration;
        if (gen === '2g' || gen === '3g') {
          setStatus('weak');
        } else {
          setStatus('strong');
        }
      } else {
        setStatus('strong');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Re-check when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const recheck = async () => {
        await NetInfo.fetch();
      };
      recheck();
    }, [])
  );

  return status;
};