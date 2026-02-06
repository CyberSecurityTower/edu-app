import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function VinylAudioItem({ item, index, onPress }) {
  
  // ألوان عشوائية لملصق الأسطوانة (Center Label) لتنويع الشكل
  const labelColors = ['#F472B6', '#38BDF8', '#A78BFA', '#FBBF24', '#34D399'];
  const labelColor = labelColors[index % labelColors.length];

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity 
        style={styles.container}
        activeOpacity={0.8}
        onPress={() => {
            Haptics.selectionAsync();
            onPress(item);
        }}
      >
        {/* الغلاف الخلفي (Sleeve) */}
        <View style={styles.sleeve}>
            
            {/* الأسطوانة (Vinyl Disc) */}
            <View style={styles.vinylDisk}>
                {/* لمعان الأسطوانة (Grooves Reflection) */}
                <LinearGradient
                    colors={['#333', '#111', '#333']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.vinylGrooves}
                >
                    {/* الملصق الأوسط (Label) */}
                    <View style={[styles.centerLabel, { backgroundColor: labelColor }]}>
                         {/* ثقب الأسطوانة */}
                        <View style={styles.centerHole} />
                        <FontAwesome5 name="music" size={12} color="rgba(0,0,0,0.5)" style={{ marginTop: 2 }} />
                    </View>
                </LinearGradient>
            </View>

            {/* زر تشغيل صغير عائم */}
            <View style={styles.playBadge}>
                <FontAwesome5 name="play" size={8} color="white" style={{ marginLeft: 2 }} />
            </View>
        </View>

        {/* تفاصيل الملف */}
        <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.title || item.name}</Text>
            <View style={styles.metaRow}>
                <MaterialCommunityIcons name="waveform" size={12} color="#64748B" />
                <Text style={styles.sizeText}>{item.file_size || 'Audio'}</Text>
            </View>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: (width - 48) / 2, // نفس عرض عناصر الشبكة الأخرى
    marginBottom: 16,
    alignItems: 'center',
  },
  sleeve: {
      width: 100, // حجم الأسطوانة
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      position: 'relative',
      // تأثير الظل لتبدو عائمة
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
      elevation: 8,
  },
  vinylDisk: {
      width: '100%',
      height: '100%',
      borderRadius: 50, // دائرة كاملة
      backgroundColor: '#1E1E1E',
      padding: 2, // Border width effect
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
  },
  vinylGrooves: {
      flex: 1,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      // خطوط دائرية وهمية باستخدام البوردر
      borderWidth: 8,
      borderColor: 'rgba(255,255,255,0.02)'
  },
  centerLabel: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(0,0,0,0.3)'
  },
  centerHole: {
      width: 6,
      height: 6,
      backgroundColor: '#0F172A', // لون الخلفية ليبدو كثقب
      borderRadius: 3,
      position: 'absolute',
      zIndex: 2
  },
  playBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#38BDF8',
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#0F172A'
  },
  info: {
      width: '100%',
      paddingHorizontal: 4
  },
  title: {
      color: 'white',
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 2
  },
  metaRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4
  },
  sizeText: {
      color: '#64748B',
      fontSize: 11
  }
});