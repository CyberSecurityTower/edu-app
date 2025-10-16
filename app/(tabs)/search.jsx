
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Pressable, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { searchSubjectsByName } from '../../services/firestoreService'; // استيراد حاسم من طبقة الخدمة

// مكون لعرض كل نتيجة بحث
const SearchResultCard = ({ item }) => {
  const router = useRouter();

  const handlePress = () => {
    // الانتقال إلى شاشة تفاصيل المادة، مع تمرير المعلمات اللازمة
    router.push({
      pathname: '/subject-details',
      params: { id: item.id, name: item.name },
    });
  };

  return (
    <Pressable style={styles.cardContainer} onPress={handlePress}>
      <View style={styles.cardIconContainer}>
        <FontAwesome5 name={item.icon || 'book-open'} size={24} color="#10B981" />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.faculty}</Text>
      </View>
      <FontAwesome5 name="chevron-right" size={18} color="#4B5563" />
    </Pressable>
  );
};

// المكون الرئيسي للشاشة
export default function SearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // للتمييز بين الحالة الأولية وحالة النتائج الفارغة
  const debounceTimeout = useRef(null);

  useEffect(() => {
    // إلغاء المؤقت السابق إذا كان المستخدم لا يزال يكتب
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (searchTerm.trim().length >= 3) {
      // تعيين مؤقت جديد لتشغيل البحث بعد 500 مللي ثانية من عدم النشاط
      debounceTimeout.current = setTimeout(async () => {
        Keyboard.dismiss(); // إخفاء لوحة المفاتيح لتجربة مستخدم أفضل
        setIsLoading(true);
        setHasSearched(true);
        const searchResults = await searchSubjectsByName(searchTerm.trim());
        setResults(searchResults);
        setIsLoading(false);
      }, 500);
    } else {
      // إعادة تعيين الحالة إذا كان مصطلح البحث قصيرًا جدًا
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
    }

    // دالة التنظيف لإلغاء المؤقت عند تغيير searchTerm أو تفكيك المكون
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchTerm]);

  // دالة لعرض المحتوى المناسب بناءً على الحالة
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.infoText}>جاري البحث...</Text>
        </View>
      );
    }

    if (hasSearched && results.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesome5 name="search" size={48} color="#4B5563" />
          <Text style={styles.infoText}>لا توجد نتائج لـ "{searchTerm}"</Text>
        </View>
      );
    }

    if (!hasSearched) {
      return (
        <View style={styles.centeredContainer}>
          <FontAwesome5 name="search-plus" size={48} color="#4B5563" />
          <Text style={styles.infoText}>ابحث عن المواد والدروس</Text>
          <Text style={styles.subInfoText}>أدخل 3 أحرف على الأقل للبدء.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.pathId}-${item.id}`} // مفتاح فريد لضمان الأداء
        renderItem={({ item }) => <SearchResultCard item={item} />}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBarContainer}>
        <FontAwesome5 name="search" size={18} color="#8A94A4" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن المواد..."
          placeholderTextColor="#8A94A4"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      
      {renderContent()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F27',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    margin: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 14,
    textAlign: 'right', // لدعم اللغة العربية
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
    color: '#a7adb8ff',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  subInfoText: {
    color: '#4B5563',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'left',
  },
});