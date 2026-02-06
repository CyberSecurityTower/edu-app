import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Text, 
  ActivityIndicator, 
  Pressable, 
  StatusBar, 
  TextInput, 
  Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router'; 
import StoreItemCard from './StoreItemCard';
import ProductDetailsModal from './ProductDetailsModal';
import { apiService } from '../../config/api';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';

export default function StoreScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { user, userProgress, isItemOwned, refreshUserProgress } = useAppState();
  
  // Basic Store State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Search State (WorkLens)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Local Balance State
  const [localPoints, setLocalPoints] = useState(userProgress?.points || 0);

  // Initial Load
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Sync Balance
  useEffect(() => {
      if (userProgress?.points !== undefined) {
          setLocalPoints(userProgress.points);
      }
  }, [userProgress]);

  // Handle Search Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setIsSearching(false);
        setSearchResults([]);
      }
    }, 600); // Wait 600ms after typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      if (!isSearching) setLoading(true); // Only show main loader if not searching
      
      const itemsData = await apiService.fetchStoreItems({ 
          pathId: user?.selectedPathId 
      });
      setItems(itemsData);

      try {
          if (refreshUserProgress) {
              await refreshUserProgress();
          } else {
              const walletData = await apiService.getWalletBalance();
              if (walletData && walletData.balance !== undefined) {
                  setLocalPoints(walletData.balance);
              }
          }
      } catch (e) {
          console.warn("Failed to fetch wallet balance:", e);
      }

    } catch (error) {
      console.error("Failed to refresh store:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ WorkLens Search Implementation
  const performSearch = async (query) => {
    try {
      setIsSearching(true);
      setSearchLoading(true);

      // Call the API with scope 'store'
      // Note: Assuming apiService.searchWorkLens exists as per context
      const results = await apiService.searchWorkLens(query, 'store');
      
      // Merge results with existing items to get full details (price, thumbnail)
      // The search API might return lightweight objects, so we try to enrich them
      const enrichedResults = results.map(result => {
        const fullItem = items.find(i => i.id === result.id);
        if (fullItem) return fullItem;
        
        // If not found in local list, return result but ensure defaults for card
        return {
          ...result,
          // Use search result title/desc, fallback to defaults for UI safety
          price: result.price || 0, 
          thumbnail_url: result.thumbnail_url || null
        };
      });

      setSearchResults(enrichedResults);
    } catch (error) {
      console.error("Store Search Error:", error);
      // Optional: Show toast or silent fail
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleItemPress = (item) => {
    // If we are searching and the item is "lightweight" (missing price),
    // try to find it again in the main list just in case
    if (isSearching && item.price === undefined) {
        const fullItem = items.find(i => i.id === item.id);
        setSelectedItem(fullItem || item);
    } else {
        setSelectedItem(item);
    }
  };

  const renderContent = () => {
    // 1. Search Loading State
    if (isSearching && searchLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>{t('searching') || "Searching..."}</Text>
        </View>
      );
    }

    // 2. Main Loading State
    if (loading && !isSearching) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      );
    }

    const dataToRender = isSearching ? searchResults : items;
    const isEmpty = dataToRender.length === 0;

    // 3. List
    return (
      <FlatList
        data={dataToRender}
        keyExtractor={item => (item.id || Math.random()).toString()}
        renderItem={({ item, index }) => (
            <StoreItemCard 
                item={item} 
                index={index} 
                isOwned={isItemOwned(item.id)}
                onPress={handleItemPress}
            />
        )}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={{ 
            justifyContent: 'space-between', 
            flexDirection: isRTL ? 'row-reverse' : 'row' 
        }}
        onScroll={() => Keyboard.dismiss()}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <FontAwesome5 
                  name={isSearching ? "search" : "store-slash"} 
                  size={40} 
                  color="#475569" 
                />
                <Text style={styles.emptyText}>
                  {isSearching 
                    ? (t('noResultsFor') || "No results for") + ` "${searchQuery}"`
                    : t('noFilesFound')
                  }
                </Text>
            </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={20} color="white" />
        </Pressable>
        
        <Text style={styles.headerTitle}>{t('storeTitle')}</Text>
        
        <View style={styles.balanceContainer}>
            <FontAwesome5 name="coins" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.balanceText}>{localPoints}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <FontAwesome5 name="search" size={16} color="#94A3B8" style={{ marginHorizontal: 10 }} />
          <TextInput
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('searchStore') || "Search store..."}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={handleClearSearch} style={styles.clearBtn}>
              <FontAwesome5 name="times-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {renderContent()}

      <ProductDetailsModal 
        visible={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B', marginTop: 10, fontSize: 14 },
  
  header: { 
      paddingHorizontal: 20, paddingVertical: 15, 
      alignItems: 'center', justifyContent: 'space-between',
      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  backBtn: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  balanceContainer: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.08)', 
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 
  },
  balanceText: { color: '#F59E0B', fontSize: 14, fontWeight: 'bold' },
  
  // Search Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#020617',
  },
  searchBar: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    height: 45,
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    height: '100%',
    paddingHorizontal: 5
  },
  clearBtn: {
    padding: 8
  },

  listContent: { padding: 20 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748B', marginTop: 10, fontSize: 16 }
});