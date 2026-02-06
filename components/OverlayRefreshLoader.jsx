
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const OverlayRefreshLoader = ({ isRefreshing, topOffset = 140 }) => {
  // القيم المبدئية للأنيميشن
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isRefreshing) {
      // ظهور سلس
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // اختفاء سلس
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRefreshing]);

  // إذا لم يكن هناك تحديث والشفافية 0، لا نرسم شيئاً (لتحسين الأداء)
  // لكننا نحتاج لإبقائه موجوداً لحظة الاختفاء، لذا نعتمد على opacity في الستايل
  
  return (
    <Animated.View
      style={[
        styles.container,
        { 
          top: topOffset, // ✅ التحكم في النزول أسفل الهيدر
          opacity, 
          transform: [{ translateY }, { scale }],
          // نستخدم pointerEvents لمنع اللودر من حجب اللمسات عند اختفائه
          zIndex: isRefreshing ? 999 : -1 
        },
      ]}
      pointerEvents="none" 
    >
      <View style={styles.loaderWrapper}>
        {/* تأثير زجاجي خلف اللودر */}
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        
        {/* اللودر نفسه */}
        <LottieView
          source={require('../assets/images/rocket_loading.json')} // ✅ تأكد من المسار
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // لون خلفية داكن
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)', // حدود زرقاء خفيفة
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  lottie: {
    width: 50,
    height: 50,
  },
});

export default OverlayRefreshLoader;