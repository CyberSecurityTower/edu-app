// components/minichat/SourcesWidget.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Linking, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

// تفعيل الأنيميشن للأندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * 🛠️ دالة لاستخراج الدومين النظيف
 */
const getDomainName = (url) => {
  try {
    if (!url) return 'Source';
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch (e) {
    return 'Web Source';
  }
};

/**
 * 🛠️ دالة لجلب أيقونة الموقع بجودة عالية (للشارة الصغيرة)
 */
const getFavicon = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch (e) {
    return null;
  }
};

/**
 * 🃏 مكون البطاقة الواحدة (Source Card)
 * ✅ الآن يدعم جلب الصور تلقائياً (Auto-Fetch Logic)
 */
const SourceCard = ({ source, isRTL }) => {
  // الحالة لتخزين صورة الخلفية النهائية
  const [bgImage, setBgImage] = useState(source.image || null);
  const [loading, setLoading] = useState(!source.image); // تحميل فقط إذا لم يكن لدينا صورة مسبقة

  const domain = getDomainName(source.url);
  const smallFavicon = getFavicon(source.url);
  // أيقونة عالية الجودة جداً لاستخدامها كخلفية في حال الفشل
  const largeFavicon = `https://www.google.com/s2/favicons?sz=256&domain=${new URL(source.url).hostname}`;

  const snippet = source.snippet || source.description || (isRTL ? "اضغط لقراءة التفاصيل الكاملة للمقال..." : "Tap to read the full article content...");

  useEffect(() => {
    let isMounted = true;

    // 🚀 المنطق العبقري: جلب صورة المقال باستخدام Microlink
    const fetchArticleImage = async () => {
      // إذا كان لدينا صورة بالفعل من السيرفر، لا تفعل شيئاً
      if (source.image) {
        setLoading(false);
        return;
      }

      try {
        const encodedUrl = encodeURIComponent(source.url);
        // نطلب البيانات الوصفية فقط
        const response = await fetch(`https://api.microlink.io/?url=${encodedUrl}&palette=true`);
        const data = await response.json();

        if (isMounted && data.status === 'success') {
          // 1. الأولوية لصورة المقال (og:image)
          if (data.data.image && data.data.image.url) {
             setBgImage(data.data.image.url);
          } 
          // 2. البديل: شعار الموقع (Logo)
          else if (data.data.logo && data.data.logo.url) {
             setBgImage(data.data.logo.url);
          }
        }
      } catch (error) {
        // فشل صامت، سنعتمد على الـ Fallback في الريندر
        console.log("Image fetch failed", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchArticleImage();

    return () => { isMounted = false; };
  }, [source.url, source.image]);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => source.url && Linking.openURL(source.url)}
      style={styles.cardContainer}
    >
      {/* 1. منطقة الصورة أو الغلاف */}
      <View style={styles.imageContainer}>
        {loading ? (
           // مؤشر تحميل خفيف
           <View style={[styles.skeletonPlaceholder, { backgroundColor: '#1E293B' }]}>
               <ActivityIndicator size="small" color="#64748B" />
           </View>
        ) : bgImage ? (
          // ✅ الحالة الأولى: تم العثور على صورة (من السيرفر أو Microlink)
          <>
            <Image
                source={{ uri: bgImage }}
                style={styles.cardImage}
                resizeMode="cover"
            />
            {/* طبقة سوداء خفيفة لتوضيح النص */}
            <View style={styles.darkOverlay} />
          </>
        ) : (
          // ⚠️ الحالة الثانية: لا توجد صورة مقال -> نعرض اللوجو الكبير كخلفية ضبابية
          <View style={styles.skeletonPlaceholder}>
             {/* خلفية اللوجو الكبير (مشوشة) */}
             <Image 
                source={{ uri: largeFavicon }} 
                style={styles.blurredBackgroundIcon} 
                resizeMode="cover"
                blurRadius={10} 
            />
             {/* طبقة متدرجة فوق الخلفية */}
             <LinearGradient
                colors={['rgba(15, 23, 42, 0.6)', 'rgba(15, 23, 42, 0.9)']} 
                style={StyleSheet.absoluteFill}
             />
             {/* اللوجو واضح في المنتصف */}
             <Image 
                source={{ uri: largeFavicon }} 
                style={styles.centerWatermark} 
                resizeMode="contain" 
            />
          </View>
        )}

        {/* شارة الموقع (Badge) */}
        <View style={[styles.siteBadge, isRTL ? { right: 8 } : { left: 8 }]}>
           <Image source={{ uri: smallFavicon }} style={styles.badgeIcon} />
           <Text style={styles.badgeText} numberOfLines={1}>{domain}</Text>
        </View>
      </View>

      {/* 2. منطقة المحتوى */}
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
          {source.title || domain}
        </Text>
        
        <Text style={[styles.snippet, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
          {snippet}
        </Text>
        
        <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
           <Text style={styles.date}>
             {source.date ? new Date(source.date).toLocaleDateString() : 'Read Now'}
           </Text>
           <MaterialCommunityIcons name="open-in-new" size={12} color="#64748B" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * 📦 المكون الرئيسي (SourcesWidget)
 */
const SourcesWidget = ({ sources, direction = 'ltr' }) => {
  const [expanded, setExpanded] = useState(false);
  const isRTL = direction === 'rtl' || direction === 'right';
  
  if (!sources || sources.length === 0) return null;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const label = isRTL ? "المصادر" : "Sources";

  return (
    <View style={styles.wrapper}>
      {/* --- الشريط العلوي --- */}
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={toggleExpand} 
        style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <View style={[styles.iconsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {sources.slice(0, 3).map((src, idx) => (
            <View 
              key={idx} 
              style={[
                styles.iconCircle, 
                { 
                   zIndex: 10 - idx,
                   marginLeft: isRTL ? (idx === 0 ? 0 : -8) : (idx === 0 ? 0 : -8),
                   marginRight: isRTL ? (idx === 0 ? 0 : -8) : 0
                }
              ]}
            >
              <Image 
                source={{ uri: getFavicon(src.url) }} 
                style={styles.iconImg} 
              />
            </View>
          ))}
          
          {sources.length > 3 && (
            <View style={[styles.moreCircle, { zIndex: 0, marginLeft: isRTL ? 0 : -8, marginRight: isRTL ? -8 : 0 }]}>
              <Text style={styles.moreText}>+{sources.length - 3}</Text>
            </View>
          )}
        </View>

        <Text style={styles.labelText}>{label}</Text>
        <FontAwesome5 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={10} 
            color="#94A3B8" 
            style={{ marginHorizontal: 6 }}
        />
      </TouchableOpacity>

      {/* --- القائمة الموسعة --- */}
      {expanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
             styles.scrollContent,
             { flexDirection: isRTL ? 'row-reverse' : 'row' }
          ]}
        >
          {sources.map((src, idx) => (
            <SourceCard key={idx} source={src} isRTL={isRTL} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginVertical: 8 },
  header: { alignItems: 'center', marginBottom: 4, paddingHorizontal: 4 },
  iconsRow: { alignItems: 'center', marginHorizontal: 8 },
  iconCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F1F5F9', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  iconImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  moreCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E2E8F0', borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  moreText: { fontSize: 9, fontWeight: '700', color: '#475569' },
  labelText: { fontSize: 12, color: '#64748B', fontWeight: '600', marginHorizontal: 4 },
  scrollContent: { paddingVertical: 8, paddingHorizontal: 2, gap: 10 },

  // Card Styles
  cardContainer: {
    width: 210, // زيادة العرض قليلاً
    backgroundColor: '#0F172A', 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  imageContainer: {
    height: 110, // ارتفاع مناسب للصورة
    width: '100%',
    backgroundColor: '#020617',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  cardImage: { width: '100%', height: '100%' },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)' 
  },
  
  // Skeleton / Fallback Styles
  skeletonPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617', 
    overflow: 'hidden'
  },
  blurredBackgroundIcon: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
    transform: [{ scale: 1.5 }] // تكبير الخلفية المشوشة
  },
  centerWatermark: {
    width: 48,
    height: 48,
    opacity: 0.9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

  siteBadge: {
    position: 'absolute',
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // خلفية داكنة واضحة للشارة
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  badgeIcon: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'white' }, // خلفية بيضاء صغيرة للأيقونة
  badgeText: { color: '#F1F5F9', fontSize: 10, fontWeight: '700' },
  
  contentContainer: { padding: 12, justifyContent: 'space-between', flex: 1 },
  title: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', marginBottom: 6, lineHeight: 18 },
  snippet: { color: '#94A3B8', fontSize: 11, lineHeight: 16, marginBottom: 10, minHeight: 32 },
  footer: { justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  date: { color: '#475569', fontSize: 10, fontWeight: '500' }
});

export default SourcesWidget;