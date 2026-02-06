import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, TouchableOpacity, Platform, StatusBar } from 'react-native';
import Animated, { FadeOutDown, ZoomIn, FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext'; // ✅ استيراد

// --- Services & Sub-Components ---
import { TranslationView } from './TextSelectionTranslation'; 
import { QuickSearchView } from './QuickSearchView'; 

const SCREEN_WIDTH = Dimensions.get('window').width;
const MENU_WIDTH = 280; 
const HALF_MENU = MENU_WIDTH / 2;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;
const SAFE_TOP_MARGIN = STATUS_BAR_HEIGHT + 10;

// --- Helper: Icon Renderer ---
const MenuIcon = ({ type, name, size, color }) => {
    if (type === 'material') return <MaterialIcons name={name} size={size} color={color} />;
    return <FontAwesome5 name={name} size={size - 2} color={color} />;
};

// --- Component: Horizontal Action Button ---
const ActionButton = ({ item, onPress }) => {
  const activeColor = item.color || '#475569';
  const specialColor = '#7C3AED';
  const isSpecial = item.isSpecial;

  return (
    <Pressable 
        onPress={() => { Haptics.selectionAsync(); onPress(); }} 
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressedBtn]}
    >
        <View style={[
            styles.iconCircle, 
            isSpecial && styles.specialIconCircle,
            { backgroundColor: isSpecial ? 'rgba(124, 58, 237, 0.1)' : 'rgba(0,0,0,0.04)' }
        ]}>
            <MenuIcon type={item.iconType} name={item.icon} size={16} color={isSpecial ? specialColor : activeColor} />
        </View>
        <Text style={[
            styles.actionLabel, 
            isSpecial ? { color: specialColor, fontWeight: '700' } : { color: activeColor }
        ]}>
            {item.label}
        </Text>
    </Pressable>
  );
};

// --- Component: Vertical List Item ---
const VerticalMenuItem = ({ item, onPress }) => {
    return (
        <TouchableOpacity style={styles.verticalItem} onPress={() => { Haptics.selectionAsync(); onPress(); }}>
            <View style={[styles.verticalIconBox, item.color && { backgroundColor: item.color + '15' }]}>
                <MenuIcon type={item.iconType} name={item.icon} size={16} color={item.color || '#475569'} />
            </View>
            <Text style={styles.verticalText}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={16} color="#CBD5E1" />
        </TouchableOpacity>
    );
};

// ==========================================================
// 🌟 MAIN COMPONENT
// ==========================================================
export const TextSelectionMenu = ({ visible, position, onAction, onClose }) => {
  const { t, isRTL } = useLanguage(); // ✅ استخدام اللغة
  const [viewMode, setViewMode] = useState('main'); 

 useEffect(() => {
    // 🛑 التعديل هنا:
    // نقوم بإعادة التعيين إلى القائمة الرئيسية فقط إذا كانت القائمة ظاهرة 
    // ولكنها "غير مثبتة" (أي أنها عملية تحديد جديدة).
    // إذا كانت pinned، فهذا يعني أننا انتقلنا لصفحة فرعية ولا نريد العودة للرئيسية.
    if (visible && !position.pinned) {
        setViewMode('main');
    }
  }, [visible, position.pinned, position.text]); // ✅ نعتمد على النص وحالة التثبيت بدلاً من الكائن كاملاً

  // ✅ نقل تعريف القائمة للداخل مع استخدام useMemo للترجمة
  const menuItems = useMemo(() => [
      { 
          id: 'ai', 
          label: t('menuAskAi'), // مترجم
          icon: 'robot', iconType: 'fa5', color: '#7C3AED', isSpecial: true, action: 'explain' 
      },
      { 
          id: 'quick_search', 
          label: t('menuQuickLook'), // مترجم
          icon: 'eye', iconType: 'fa5', color: '#0EA5E9', type: 'view', viewName: 'quick_search' 
      },
      { 
          id: 'translate', 
          label: t('menuTranslate'), // مترجم
          icon: 'translate', iconType: 'material', color: '#10B981', type: 'view', viewName: 'translate' 
      },
      { id: 'copy', label: t('menuCopy'), icon: 'content-copy', iconType: 'material', action: 'copy', color: '#64748B' },
      { id: 'share', label: t('menuShare'), icon: 'share', iconType: 'material', action: 'share', color: '#64748B' },
  ], [t]);

  const { visibleItems, overflowItems } = useMemo(() => {
      return {
          visibleItems: menuItems.slice(0, 3), 
          overflowItems: menuItems.slice(3),   
      };
  }, [menuItems]);

  const handleItemPress = (item) => {
      if (item.type === 'view') {
          // ✅ نرسل أمراً لتثبيت القائمة ومسح التحديد فقط، دون إغلاق
          onAction('PIN_MENU_AND_CLEAR_HIGHLIGHT'); 
          setViewMode(item.viewName);
      } else {
          onAction(item.action);
      }
  };

  if (!visible || !position) return null;

  // الحسابات المكانية (نفس الكود السابق)
  let leftPos = position.x - HALF_MENU;
  if (leftPos < 16) leftPos = 16;
  if (leftPos + MENU_WIDTH > SCREEN_WIDTH - 16) leftPos = SCREEN_WIDTH - MENU_WIDTH - 16;
  const arrowLeftPos = (position.x - leftPos) - 10; 

  const getVerticalHeight = () => {
      switch (viewMode) {
          case 'quick_search': return 260;
          case 'translate': return 250; 
          case 'overflow': return 60 + (overflowItems.length * 45) + 40; 
          default: return 75;
      }
  };
  
  const menuHeight = getVerticalHeight();
  const initialFlip = position.isFlipped || false;
  const topPositionIfAbove = position.y - menuHeight;
  const isOutOfBoundsTop = topPositionIfAbove < SAFE_TOP_MARGIN;
  const shouldFlip = initialFlip || isOutOfBoundsTop;
  const finalTop = shouldFlip ? position.y + 15 : position.y - menuHeight;

  return (
    <Animated.View 
      layout={Layout.springify().damping(16).stiffness(150)}
      entering={ZoomIn.springify().damping(15)} 
      exiting={FadeOutDown.duration(150)}
      style={[ styles.absoluteContainer, { left: leftPos, top: finalTop } ]}
    >
      <View style={styles.shadowGlow} />

      <BlurView intensity={95} tint="light" style={styles.glassContainer}>
        
        {viewMode === 'main' && (
           <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.rowContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {visibleItems.map((item) => (
                  <React.Fragment key={item.id}>
                      <ActionButton item={item} onPress={() => handleItemPress(item)} />
                      <View style={styles.divider} />
                  </React.Fragment>
              ))}

              <Pressable 
                style={({pressed}) => [styles.actionBtn, pressed && styles.pressedBtn]}
                onPress={() => { Haptics.selectionAsync(); setViewMode('overflow'); }}
              >
                  <View style={styles.iconCircle}>
                     <MaterialIcons name="more-horiz" size={20} color="#475569" />
                  </View>
                  <Text style={styles.actionLabel}>{t('menuMore')}</Text> 
              </Pressable>

              <View style={styles.divider} />
              
              <Pressable onPress={onClose} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={16} color="#94A3B8" />
              </Pressable>
           </Animated.View>
        )}

        {viewMode === 'overflow' && (
           <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overflowContainer}>
               <View style={[styles.overflowHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                   <Text style={styles.overflowTitle}>{t('menuMoreOptions')}</Text>
                   <TouchableOpacity onPress={() => setViewMode('main')} style={styles.backBtn}>
                       <MaterialIcons name="close" size={18} color="#64748B" />
                   </TouchableOpacity>
               </View>
               <View style={styles.listWrapper}>
                   {overflowItems.map((item) => (
                       <VerticalMenuItem key={item.id} item={item} onPress={() => handleItemPress(item)} />
                   ))}
               </View>
           </Animated.View>
        )}

        {viewMode === 'translate' && (
           <TranslationView 
              text={position.text || ""} 
              onClose={onClose}
              onBack={() => setViewMode('main')}
           />
        )}

        {viewMode === 'quick_search' && (
           <QuickSearchView
              text={position.text || ""} 
              onClose={onClose}
              onBack={() => setViewMode('main')}
           />
        )}

      </BlurView>

      <View style={[
          styles.arrowContainer, 
          { left: arrowLeftPos },
          shouldFlip ? styles.arrowTop : styles.arrowBottom 
      ]}>
         <View style={[styles.arrowTriangle, shouldFlip && { transform: [{ rotate: '180deg' }] } ]} />
      </View>

    </Animated.View>
  );
};

// ... نفس الـ Styles
const styles = StyleSheet.create({
    // ... (أبقِ نفس التنسيقات القديمة كما هي)
    absoluteContainer: {
        position: 'absolute',
        width: MENU_WIDTH,
        zIndex: 9999,
        alignItems: 'center',
      },
      shadowGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.15)', 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        borderRadius: 20,
      },
      glassContainer: {
        width: '100%',
        borderRadius: 40, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)', 
        backgroundColor: 'rgba(255, 255, 255, 0.96)', // Increased opacity slightly
      },
      
      // --- Horizontal Row ---
      rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 6,
        height: 65, 
      },
      actionBtn: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
      },
      pressedBtn: {
        backgroundColor: 'rgba(0,0,0,0.05)',
      },
      iconCircle: {
        width: 28, height: 28, borderRadius: 14, 
        alignItems: 'center', justifyContent: 'center', marginBottom: 3,
      },
      specialIconCircle: {
        borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)',
      },
      actionLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center' },
      divider: { width: 1, height: 24, backgroundColor: 'rgba(0, 0, 0, 0.08)', marginHorizontal: 2 },
      closeBtn: { width: 30, height: '100%', alignItems: 'center', justifyContent: 'center' },
    
      // --- Vertical Overflow ---
      overflowContainer: { padding: 12, width: '100%' },
      overflowHeader: {
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: 8,
      },
      overflowTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
      backBtn: { padding: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12 },
      listWrapper: { gap: 4 },
      verticalItem: {
          flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8,
          borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.5)',
      },
      verticalIconBox: {
          width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)',
          justifyContent: 'center', alignItems: 'center', marginRight: 12
      },
      verticalText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '600' },
    
      // --- Arrow ---
      arrowContainer: { position: 'absolute', width: 20, height: 10, alignItems: 'center', justifyContent: 'flex-start', zIndex: -1 },
      // عند وضع القائمة فوق النص، السهم يكون بالأسفل
      arrowBottom: { bottom: -8 },
      // عند وضع القائمة تحت النص، السهم يكون بالأعلى
      arrowTop: { top: -8 },
      arrowTriangle: {
        width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid',
        borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: 'rgba(255, 255, 255, 0.96)', 
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2,
      }
});