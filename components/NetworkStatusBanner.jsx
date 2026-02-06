import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { MotiView } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const NetworkStatusBanner = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // NetInfo.fetch() للتحقق الفوري عند تحميل المكون لأول مرة
    NetInfo.fetch().then(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      setIsOffline(!isOnline);
    });

    // إعداد مستمع للتغييرات المستقبلية في حالة الشبكة
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      setIsOffline(!isOnline);
    });

    return () => unsubscribe();
  }, []);

  const handleRetry = useCallback(() => {
    // جلب حالة الشبكة يدويًا عند الضغط على "إعادة المحاولة"
    NetInfo.fetch().then(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      setIsOffline(!isOnline);
    });
  }, []);

  if (!isOffline) {
    return null; // لا تعرض أي شيء إذا كان هناك اتصال بالإنترنت
  }

  return (
    <MotiView
      style={styles.container}
      from={{ translateY: -120 }}
      animate={{ translateY: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <FontAwesome5 name="exclamation-triangle" size={16} color="#FFD700" style={styles.icon} />
        <Text style={styles.text}>No Internet Connection</Text>
        <Pressable onPress={handleRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#5B21B6', // بنفسجي داكن
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default NetworkStatusBanner;