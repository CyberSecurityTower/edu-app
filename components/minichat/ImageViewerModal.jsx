import React, { useEffect, useState } from 'react';
import { 
  Modal, View, Image, StyleSheet, Pressable, StatusBar, 
  Dimensions, Text, TextInput, KeyboardAvoidingView, Platform, Keyboard, Alert 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate, Extrapolate 
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ✅ 1. استيراد مكتبة الصور
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// ✅ 2. إضافة onCameraCapture للخصائص (Props)
const ImageViewerModal = ({ visible, imageData, onClose, onSendReply, onCameraCapture }) => {
  const insets = useSafeAreaInsets();
  const [replyText, setReplyText] = useState('');
  
  // Animation Values ... (نفس الكود السابق)
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  // ... (نفس دوال useEffect و handleCloseButton السابقة)
  
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1);
      translateY.value = 0;
      setReplyText(''); 
    }
  }, [visible]);

  const callOnClose = () => { if (onClose) onClose(); };

  const handleCloseButton = () => {
      // ... (نفس الكود السابق للإغلاق)
      Keyboard.dismiss();
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      translateY.value = withTiming(height, { duration: 200 }, (finished) => {
        if (finished) runOnJS(callOnClose)();
      });
  };

  const handleSend = () => {
    // ... (نفس الكود السابق)
     if (replyText.trim().length > 0) {
      handleCloseButton();
      setTimeout(() => {
        if (onSendReply) onSendReply(replyText);
      }, 300);
    }
  };

  // ✅ 3. دالة جديدة لفتح الكاميرا
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to take photos.');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // صور فقط
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // نغلق المودال ونرسل الصورة للأب
        handleCloseButton(); // تشغيل أنيميشن الإغلاق
        
        setTimeout(() => {
            if (onCameraCapture) {
                onCameraCapture(result.assets[0]);
            }
        }, 300); // انتظار بسيط لضمان انتهاء أنيميشن الإغلاق
      }
    } catch (error) {
      console.log('Camera Error:', error);
    }
  };

  // ... (نفس كود formattedDate و Gestures)
  
  // تنسيق التاريخ
  const formattedDate = imageData?.date 
    ? new Date(imageData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) 
    : '';

  // --- Gestures ---
  const pan = Gesture.Pan()
    .onUpdate((event) => {
        // ... (نفس الكود)
      translateY.value = event.translationY;
      scale.value = interpolate(Math.abs(event.translationY), [0, height], [1, 0.6], Extrapolate.CLAMP);
      opacity.value = interpolate(Math.abs(event.translationY), [0, height/2], [1, 0.5], Extrapolate.CLAMP);
    })
    .onEnd((event) => {
         // ... (نفس الكود)
      if (Math.abs(event.translationY) > 100 || Math.abs(event.velocityY) > 600) {
        const targetY = event.translationY > 0 ? height : -height;
        translateY.value = withTiming(targetY, { duration: 250 }, (finished) => {
          if (finished) runOnJS(callOnClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 15 });
        scale.value = withSpring(1);
        opacity.value = withTiming(1);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }]
  }));

  if (!visible || !imageData) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleCloseButton}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
            {/* ... (نفس كود الخلفية والـ Header و الصورة) ... */}
           <StatusBar hidden={true} />
          
          <Animated.View style={[StyleSheet.absoluteFill, styles.blackBg, backdropStyle]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, width: '100%' }}
          >
            <Animated.View style={[styles.header, { paddingTop: insets.top + 10 }, backdropStyle]}>
              <Pressable onPress={handleCloseButton} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color="white" />
              </Pressable>
              <View style={styles.headerInfo}>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
              <View style={styles.closeBtn} />
            </Animated.View>

            <View style={styles.imageContainer}>
              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.imageWrapper, containerAnimStyle]}>
                  <Image 
                    source={{ uri: imageData.uri }} 
                    style={styles.fullImage} 
                    resizeMode="contain" 
                  />
                </Animated.View>
              </GestureDetector>
            </View>

            {/* Footer */}
            <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 10 }, backdropStyle]}>
              <View style={styles.inputContainer}>
                
                {/* ✅ 4. ربط زر الكاميرا بدالة handleLaunchCamera */}
                <Pressable onPress={handleLaunchCamera} style={styles.cameraIcon}>
                   <View style={styles.cameraCircle}>
                      <Ionicons name="camera" size={20} color="white" />
                   </View>
                </Pressable>
                
                <TextInput
                  // ... (نفس الخصائص)
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Reply..."
                  placeholderTextColor="#A3A3A3"
                  style={styles.input}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
                
                <Pressable onPress={handleSend} style={styles.sendBtn}>
                  {replyText.length > 0 ? (
                    <Text style={styles.sendText}>Send</Text>
                  ) : (
                    <Feather name="mic" size={20} color="white" />
                  )}
                </Pressable>
              </View>
            </Animated.View>

          </KeyboardAvoidingView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

// ... (نفس الـ styles)
const styles = StyleSheet.create({
    // ... (نفس الستايلات السابقة)
  container: { flex: 1 },
  blackBg: { backgroundColor: 'black' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 20,
    width: '100%',
  },
  closeBtn: { width: 40, alignItems: 'flex-start' },
  headerInfo: { alignItems: 'center' },
  dateText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageWrapper: { width: width, height: '100%' }, 
  fullImage: { width: '100%', height: '100%' },
  footer: {
    width: '100%',
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: 'transparent', 
    zIndex: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626', 
    borderRadius: 25,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  cameraIcon: {
    padding: 4,
  },
  cameraCircle: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: '#3B82F6', 
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    height: 44,
  },
  sendBtn: {
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: '#3B82F6', 
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ImageViewerModal;