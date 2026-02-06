import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../../context/LanguageContext';

const { width } = Dimensions.get('window');

// دالة مساعدة للألوان والأسماء (Mac Style)
const getStatusConfig = (isUpload, lang) => {
    if (isUpload) {
        return {
            label: lang === 'ar' ? 'ملفي' : lang === 'fr' ? 'Mon Fichier' : 'My File',
            colors: ['#A855F7', '#EC4899'], // بنفسجي ووردي
            textColor: '#C084FC'
        };
    }
    return {
        label: lang === 'ar' ? 'مُقتنى' : lang === 'fr' ? 'Acquis' : 'Owned',
        colors: ['#22C55E', '#3B82F6'], // أخضر وأزرق
        textColor: '#4ADE80'
    };
};
const getFileTypeInfo = (type) => {
    const t = type ? type.toLowerCase() : '';
    if (t.includes('pdf')) return { label: 'PDF', icon: 'file-pdf' };
    if (t.includes('image') || t.includes('jpg')) return { label: 'IMG', icon: 'image' };
    if (t.includes('video') || t.includes('mp4')) return { label: 'VID', icon: 'video' };
    if (t.includes('audio') || t.includes('mp3')) return { label: 'AUD', icon: 'music' };
    return { label: 'FILE', icon: 'file-alt' };
};
const getFileTypeColor = (type) => {
    const t = type ? type.toLowerCase() : '';
    if (t.includes('pdf')) return { label: 'PDF' };
    if (t.includes('image') || t.includes('jpg') || t.includes('png')) return { label: 'IMG' };
    if (t.includes('video') || t.includes('mp4')) return { label: 'VID' };
    return { label: 'FILE' };
};

export default function FileGridItem({ item, index, onPress, onLongPress }) {
  const { language, isRTL } = useLanguage();
  const cardRef = useRef(null);

  const thumbnail = item.thumbnail_url || item.thumbnail;
  const title = item.title || 'Unknown File';
  const type = item.type || 'file';
  const fileSize = item.file_size || item.size || '';
  const isUpload = item.is_upload;
  const status = getStatusConfig(isUpload, language);
  const typeInfo = getFileTypeColor(type);

  const handleLongPress = () => {
    if (onLongPress && cardRef.current) {
       // pageX و pageY هي الإحداثيات المطلقة التي نحتاجها
containerRef.current.measure((x, y, width, height, pageX, pageY) => {
    onLayoutRegister(folder.id, { x: pageX, y: pageY, width, height });
});
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <TouchableOpacity 
        ref={cardRef} 
        style={styles.card}
        onPress={() => {
          Haptics.selectionAsync();
          onPress(item);
        }}
        onLongPress={handleLongPress} 
        delayLongPress={300} 
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
               <FontAwesome5 name={type.includes('pdf') ? 'file-pdf' : 'image'} size={30} color="#64748B" />
            </View>
          )}
        </View>

        <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            
            {/* Mac Style Status Indicator */}
            <View style={[styles.statusIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.macDots, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.dot, { backgroundColor: status.colors[0] }]} />
                    <View style={[styles.dot, { backgroundColor: status.colors[1] }]} />
                </View>
                <Text style={[styles.statusText, { color: status.textColor }]}>
                    {status.label}
                </Text>
            </View>

            <View style={styles.footer}>
                <Text style={styles.dateText}>
                    {typeInfo.label} • {fileSize}
                </Text>
            </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: (width - 48) / 2, 
    backgroundColor: 'rgba(30, 41, 59, 0.6)', 
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  imageContainer: { height: 110, width: '100%', padding: 8 },
  image: { width: '100%', height: '100%', borderRadius: 14, backgroundColor: '#0F172A' },
  placeholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  content: { paddingHorizontal: 12, paddingBottom: 12 },
  title: { color: '#F1F5F9', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  statusIndicator: { alignItems: 'center', gap: 6, marginBottom: 8 },
  macDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  dateText: { color: '#64748B', fontSize: 10, fontWeight: '500' }
});