// components/minichat/CelebrationOverlay.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const CelebrationOverlay = ({ isVisible, data, onClose }) => {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (lottieRef.current) lottieRef.current.play();
      
      // إغلاق تلقائي بعد 4 ثواني
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible || !data) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={StyleSheet.absoluteFillObject} // ✅ يغطي الأب بالكامل
        >
          {/* خلفية معتمة */}
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.95)', 'rgba(6, 78, 59, 0.98)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Lottie */}
          <View style={styles.lottieWrapper}>
            <LottieView
              ref={lottieRef}
              source={require('../../assets/images/celebrate.json')} 
              autoPlay
              loop={false}
              style={styles.lottie}
              resizeMode="cover"
            />
          </View>

          {/* المحتوى */}
          <MotiView
            from={{ scale: 0.5, translateY: 50 }}
            animate={{ scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.contentContainer}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5 name="trophy" size={40} color="#F59E0B" />
            </View>

<Text style={styles.title}>{data.message || "عمل رائع!"}</Text>
            
{/* دعم coins_added أو score */}
{(data.score > 0 || data.coins_added > 0) && (
  <View style={styles.scoreBadge}>
    <FontAwesome5 name="star" size={14} color="white" solid />
    <Text style={styles.scoreText}>+{data.score || data.coins_added} EduCoins</Text>
  </View>
)}

            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>متابعة</Text>
            </Pressable>
          </MotiView>
        </MotiView>
      )}
    </AnimatePresence>
  );
};

const styles = StyleSheet.create({
  lottieWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    opacity: 0.6,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 15,
    textAlign: 'center',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 30,
    elevation: 5,
  },
  scoreText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default CelebrationOverlay;