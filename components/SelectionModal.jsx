import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, 
  TextInput, Pressable, Platform, KeyboardAvoidingView, Keyboard, 
  Animated, LayoutAnimation, UIManager, Dimensions 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// تفعيل LayoutAnimation للأندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- مكون العنصر الواحد ---
const ListItem = React.memo(({ item, onPress, icon, isSelected, isRTL }) => {
  // أنيميشن عند الضغط (Scale)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={[
            styles.itemContainer, 
            isSelected && styles.itemSelected,
            { flexDirection: isRTL ? 'row-reverse' : 'row' } // دعم RTL
        ]} 
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[
            styles.itemLeft, 
            { flexDirection: isRTL ? 'row-reverse' : 'row' } // دعم RTL
        ]}>
          <View style={[
              styles.iconBox, 
              isSelected && styles.iconBoxSelected,
              isRTL ? { marginLeft: 14 } : { marginRight: 14 } // المسافة حسب اللغة
          ]}>
            <FontAwesome5 
              name={item.icon || icon} 
              size={16} 
              color={isSelected ? "#fff" : "#38BDF8"} 
            />
          </View>
          <Text style={[
              styles.itemText, 
              isSelected && styles.textSelected,
              { textAlign: isRTL ? 'right' : 'left' } // محاذاة النص
          ]}>
            {item.label}
          </Text>
        </View>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={22} 
            color="#38BDF8" 
            style={isRTL ? { marginRight: 10 } : { marginLeft: 10 }} 
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function SelectionModal({ 
  visible, 
  onClose, 
  onSelect, 
  data = [], 
  title = "Select Item",
  searchPlaceholder = "Search...",
  icon = "circle",
  noResultsText = "No results found",
  selectedValue = null,
  isRTL = false // خاصية جديدة لتحديد الاتجاه
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current; 
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
        mass: 0.8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
  }, [visible]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const lowerQuery = searchQuery.toLowerCase().trim();
    return data.filter(item => 
      item.label.toLowerCase().includes(lowerQuery)
    );
  }, [data, searchQuery]);

  const handleSelect = useCallback((item) => {
    Haptics.selectionAsync();
    onSelect(item);
  }, [onSelect]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    onClose();
  };

  const getItemLayout = (data, index) => ({
    length: 60,
    offset: 60 * index,
    index,
  });

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrapper}
          pointerEvents="box-none"
        >
          <Animated.View 
            style={[
              styles.modalContainer, 
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.dragHandle} />

            {/* --- الهيدر (العنوان في المنتصف) --- */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              
              {/* زر الإغلاق بتموضع مطلق */}
              <TouchableOpacity 
                onPress={handleClose} 
                style={[
                    styles.closeButton, 
                    isRTL ? { left: 0 } : { right: 0 } // الزر يعكس مكانه حسب اللغة
                ]}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* --- البحث --- */}
            <View style={[
                styles.searchBox, 
                { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}>
              <Ionicons 
                name="search" 
                size={18} 
                color="#64748B" 
                style={isRTL ? { marginLeft: 12 } : { marginRight: 12 }} 
              />
              <TextInput
                style={[
                    styles.input, 
                    { textAlign: isRTL ? 'right' : 'left' }
                ]}
                placeholder={searchPlaceholder}
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>

            {/* --- القائمة --- */}
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.value ? item.value.toString() : Math.random().toString()}
              renderItem={({ item }) => (
                <ListItem 
                  item={item} 
                  onPress={handleSelect} 
                  icon={item.icon || icon} 
                  isSelected={selectedValue === item.value}
                  isRTL={isRTL} // تمرير الاتجاه للعنصر
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              getItemLayout={getItemLayout}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBg}>
                    <FontAwesome5 name="search" size={24} color="#64748B" />
                  </View>
                  <Text style={styles.emptyText}>{noResultsText}</Text>
                </View>
              }
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    height: '75%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  // --- ستايل الهيدر الجديد (Centered) ---
  header: {
    flexDirection: 'row',
    justifyContent: 'center', // توسيط المحتوى
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative', // ضروري لزر الإغلاق المطلق
    height: 40,
  },
  title: {
    fontSize: 18, // تصغير بسيط ليناسب التوسط
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  // Subtitle تم حذفه
  closeButton: {
    position: 'absolute', // تموضع مطلق بالنسبة للهيدر
    // (Right/Left سيتم تحديدها ديناميكياً)
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 16,
    height: '100%',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: 4,
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  itemLeft: {
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconBoxSelected: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  itemText: {
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '600',
    flex: 1,
  },
  textSelected: {
    color: '#F0F9FF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
});