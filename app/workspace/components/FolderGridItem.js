import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
// import { useLanguage } from '../../../context/LanguageContext'; // غير مستخدم هنا حالياً

export default function FolderGridItem({ folder, index, onPress, onLongPress, onLayoutRegister, isHighlighted }) {
  const containerRef = useRef(null);

  const handleLayout = () => {
    if (containerRef.current && onLayoutRegister) {
        containerRef.current.measureInWindow((x, y, width, height) => {
            onLayoutRegister(folder.id, { x, y, width, height });
        });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isHighlighted ? 1.1 : 1) }],
      borderColor: isHighlighted ? '#38BDF8' : 'rgba(255,255,255,0.1)',
      borderWidth: isHighlighted ? 2 : 1
    };
  }, [isHighlighted]);

  const folderColor = folder.metadata?.color || '#38BDF8';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.wrapper}>
      <TouchableOpacity 
        ref={containerRef}
        activeOpacity={0.7}
        onPress={() => onPress(folder)}
        onLongPress={() => onLongPress && onLongPress(folder)} // ✅ تفعيل الضغط المطول
        delayLongPress={300}
        onLayout={handleLayout}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
            <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.gradient}
            >
                <View style={styles.iconContainer}>
                    <FontAwesome5 name="folder" size={32} color={folderColor} solid />
                    <View style={[styles.paper, { backgroundColor: folderColor, opacity: 0.3 }]} />
                </View>
                
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{folder.name}</Text>
                    <Text style={styles.subtitle}>Folder</Text>
                </View>
                
                <View style={styles.menuIcon}>
                    <FontAwesome5 name="ellipsis-v" size={12} color="#64748B" />
                </View>
            </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '48%', marginBottom: 12 },
  container: {
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  gradient: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  iconContainer: { 
    width: 45, height: 45, 
    justifyContent: 'center', alignItems: 'center', 
    position: 'relative' 
  },
  paper: {
    position: 'absolute', top: 8, right: 6,
    width: 20, height: 24, borderRadius: 2,
    zIndex: -1
  },
  info: { flex: 1, marginLeft: 10 },
  title: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  subtitle: { color: '#64748B', fontSize: 10 },
  menuIcon: { position: 'absolute', top: 12, right: 12 }
});