// components/store/StoreItemCard.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function StoreItemCard({ item, index, onPress, isOwned }) {
  // نحتاج هنا لاستخراج language أيضاً للتحقق مما إذا كانت اللغة عربية أم لا
  const { t, language } = useLanguage();
  
  // دالة تحويل حجم الملف
  const formatFileSize = (size) => {
      const bytes = parseInt(size);
      if (!bytes || isNaN(bytes)) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // دالة تنسيق عدد الصفحات حسب اللغة
  const formatPageCount = (count) => {
      const num = parseInt(count) || 0;
      
      if (language === 'ar') {
          if (num === 1) return 'صفحة واحدة';
          if (num === 2) return 'صفحتان';
          if (num >= 3 && num <= 10) return `${num} صفحات`;
          return `${num} صفحة`;
      } else {
          // للغات الأخرى (En/Fr)
          return `${num} ${num > 1 ? 'pages' : 'page'}`;
      }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          Haptics.selectionAsync();
          onPress(item);
        }}
        activeOpacity={0.9}
      >
        {/* 1. صورة الغلاف */}
        <View style={styles.imageContainer}>
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
               <FontAwesome5 name="file-alt" size={24} color="#64748B" />
            </View>
          )}
          
          {/* شريط الحالة (مملوك أو السعر) */}
          <View style={styles.priceTag}>
            {isOwned ? (
                <View style={styles.ownedBadge}>
                    <FontAwesome5 name="check" size={10} color="white" style={{ marginRight: 4 }} />
                    <Text style={styles.ownedText}>{t('owned')}</Text>
                </View>
            ) : (
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.priceBadge}>
                    <FontAwesome5 name="coins" size={10} color="white" style={{ marginRight: 4 }} />
                    <Text style={styles.priceText}>{item.price}</Text>
                </LinearGradient>
            )}
          </View>
        </View>

        {/* 2. التفاصيل */}
        <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {/* هنا يمكن استخدام دالة الترجمة للعنوان إذا كان كائنًا، كما فعلت في المودال */}
              {typeof item.title === 'object' ? (item.title[language] || item.title['en']) : item.title}
            </Text>
            <Text style={styles.subTitle} numberOfLines={1}>
                {/* تم استبدال العرض القديم بالدوال الجديدة */}
                {formatFileSize(item.file_size)} • {formatPageCount(item.pages_count)}
            </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: (width - 48) / 2,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  imageContainer: {
    height: 120,
    width: '100%',
    backgroundColor: '#0F172A',
    position: 'relative'
  },
  image: { width: '100%', height: '100%' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  
  priceTag: { position: 'absolute', top: 8, right: 8 },
  priceBadge: { 
      flexDirection: 'row', alignItems: 'center', 
      paddingHorizontal: 8, paddingVertical: 4, 
      borderRadius: 12 
  },
  priceText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  
  ownedBadge: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: '#10B981', 
      paddingHorizontal: 8, paddingVertical: 4, 
      borderRadius: 12 
  },
  ownedText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  content: { padding: 10 },
  title: { color: 'white', fontSize: 13, fontWeight: '600', marginBottom: 4, height: 36 },
  subTitle: { color: '#94A3B8', fontSize: 11 }
});