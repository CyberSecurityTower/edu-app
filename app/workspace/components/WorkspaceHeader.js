
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useLanguage } from '../../../context/LanguageContext';

// 🌍 قاموس الترجمة الداخلي للنصوص الثابتة
const LABELS = {
  ar: {
    workspace: 'مساحة العمل',
    searchPlaceholder: 'بحث في الملفات والدروس...',
  },
  en: {
    workspace: 'My Workspace',
    searchPlaceholder: 'Search files, lessons...',
  },
  fr: {
    workspace: 'Mon Espace',
    searchPlaceholder: 'Rechercher fichiers, leçons...',
  }
};

// 🔢 دالة التعامل مع صيغ الجمع المتقدمة
const getItemCountLabel = (count, lang) => {
  if (lang === 'ar') {
    if (count === 0) return 'لا يوجد عناصر';
    if (count === 1) return 'عنصر واحد';
    if (count === 2) return 'عنصران';
    if (count >= 3 && count <= 10) return `${count} عناصر`;
    return `${count} عنصرًا`;
  }

  if (lang === 'fr') {
    if (count === 0) return 'Aucun élément';
    if (count === 1) return '1 Élément';
    return `${count} Éléments`;
  }

  // English (Default)
  if (count === 0) return 'No items';
  if (count === 1) return '1 Item';
  return `${count} Items`;
};

export default function WorkspaceHeader({ 
  itemCount = 0, 
  onSearch, 
  isSearching, 
  onClearSearch,
  onBack
}) {
  const { language, isRTL } = useLanguage(); // استخدام اللغة الحالية من الكونتكست
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // اختيار النصوص بناءً على اللغة الحالية أو العودة للإنجليزية
  const texts = LABELS[language] || LABELS.en;

  // تحديث البحث مع تأخير بسيط (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    onClearSearch();
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* القسم العلوي: يختفي عند التركيز في البحث */}
      
      {!isFocused && !query && (
        <View style={styles.titleSection}>
          
          {/* 👇 بداية الإضافة: زر الرجوع */}
          {onBack && (
            <TouchableOpacity 
              onPress={onBack} 
              style={[styles.backBtn, { [isRTL ? 'right' : 'left']: 0 }]}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="white" />
            </TouchableOpacity>
          )}
          {/* 👆 نهاية الإضافة */}

          <Text style={styles.title}>{texts.workspace}</Text>
          <Text style={styles.subtitle}>
            {getItemCountLabel(itemCount, language)}
          </Text>
        </View>
      )}

      {/* شريط البحث */}
      <View style={[
          styles.searchContainer, 
          isFocused && styles.searchContainerActive,
          { flexDirection: isRTL ? 'row-reverse' : 'row' }
      ]}>
        
        {/* أيقونة البحث أو التحميل */}
        {isSearching ? (
           <ActivityIndicator size="small" color="#38BDF8" style={{ marginHorizontal: 8 }} />
        ) : (
           <Ionicons 
             name="search" 
             size={20} 
             color={isFocused ? "#38BDF8" : "#94A3B8"} 
             style={{ marginHorizontal: 8 }} 
           />
        )}

        <TextInput 
            placeholder={texts.searchPlaceholder} 
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={[
              styles.searchInput, 
              { textAlign: isRTL ? 'right' : 'left' }
            ]}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
        />

        {/* زر المسح أو Scan */}
        {query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.iconBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="scan-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 15,
    zIndex: 10
  },
  titleSection: { 
    alignItems: 'center', 
    justifyContent: 'center', // ✅ إضافة لتوسط العنوان
    marginBottom: 20,
    width: '100%', // ✅ ضروري ليأخذ العرض الكامل
    position: 'relative' // ✅ ضروري ليعمل الزر الجانبي
  },
  
  // ✅ ستايل الزر الجديد
  backBtn: {
    position: 'absolute',
    top: 3,
    padding: 8, // لتسهيل الضغط
    zIndex: 10
  },
  title: { 
    color: 'white', 
    fontSize: 22, 
    fontWeight: '700', 
    marginBottom: 4,
    textShadowColor: 'rgba(56, 189, 248, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  subtitle: { 
    color: '#94A3B8', 
    fontSize: 13, 
    fontWeight: '500' 
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)', 
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  searchContainerActive: {
    borderColor: '#38BDF8', 
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    shadowColor: "#38BDF8",
    shadowOpacity: 0.15,
    shadowRadius: 12
  },
  searchInput: { 
    flex: 1, 
    color: 'white', 
    fontSize: 15, 
    height: '100%',
    paddingHorizontal: 10,
    fontWeight: '500'
  },
  iconBtn: { 
    padding: 8 
  }
});