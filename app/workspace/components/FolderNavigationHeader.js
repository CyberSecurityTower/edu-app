import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useLanguage } from '../../../context/LanguageContext';

export default function FolderNavigationHeader({ title, subtitle, onBack, onLayoutRegister, isHighlighted }) {
  const { isRTL } = useLanguage();
  const scale = useSharedValue(1);

  // تأثير التكبير عند سحب ملف فوق زر العودة
  useEffect(() => {
    scale.value = withSpring(isHighlighted ? 1.3 : 1, { damping: 12 });
  }, [isHighlighted]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isHighlighted ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.1)',
  }));

  return (
    <Animated.View 
        entering={FadeIn} 
        exiting={FadeOut} 
        style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
        <TouchableOpacity 
            onPress={onBack} 
            // تسجيل موقع الزر لتمكين الإفلات عليه
            onLayout={(event) => {
                if(onLayoutRegister) {
                    event.target.measure((x, y, width, height, pageX, pageY) => {
                        onLayoutRegister({ x: pageX, y: pageY, width, height });
                    });
                }
            }}
        >
            <Animated.View style={[styles.backButton, animatedButtonStyle]}>
                 <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={isHighlighted ? "#38BDF8" : "white"} />
            </Animated.View>
        </TouchableOpacity>
        
        <View style={{ [isRTL ? 'marginRight' : 'marginLeft']: 15 }}>
            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
                {title}
            </Text>
            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {subtitle}
            </Text>
        </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, marginTop: 5 },
  backButton: { padding: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 13 },
});