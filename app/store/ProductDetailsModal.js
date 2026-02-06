import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../config/api';
import { useLanguage } from '../../context/LanguageContext';
import { useAppState } from '../../context/AppStateContext';
import Toast from 'react-native-toast-message';
import CustomAlert from '../../components/CustomAlert';

export default function ProductDetailsModal({ visible, item, onClose }) {
  const { t, isRTL, language } = useLanguage();
  const { userProgress, handlePurchaseSuccess, isItemOwned } = useAppState();
  const [buying, setBuying] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState({ isVisible: false, title: '', message: '', buttons: [] });

  if (!item) return null;

  // 1. معالجة النصوص متعددة اللغات
  const getLocalizedText = (data) => {
      if (!data) return "";
      if (typeof data === 'string') return data;
      return data[language] || data['en'] || data['ar'] || Object.values(data)[0] || "";
  };

  const displayTitle = getLocalizedText(item.title);
  const displayDesc = getLocalizedText(item.description);

  // --- دوال التنسيق الجديدة ---

  // تحويل الحجم (bytes -> MB/KB)
  const formatFileSize = (size) => {
      const bytes = parseInt(size);
      if (!bytes || isNaN(bytes)) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // تنسيق عدد الصفحات حسب القواعد اللغوية
  const formatPageCount = (count) => {
      const num = parseInt(count) || 0;
      if (language === 'ar') {
          if (num === 1) return 'صفحة واحدة';
          if (num === 2) return 'صفحتان';
          if (num >= 3 && num <= 10) return `${num} صفحات`;
          return `${num} صفحة`;
      } else {
          return `${num} ${num > 1 ? 'pages' : 'page'}`;
      }
  };
  // ---------------------------

  // 2. معالجة الصور
  let previews = [];
  if (Array.isArray(item.preview_images)) {
      previews = item.preview_images;
  } else if (typeof item.preview_images === 'string') {
      try { previews = JSON.parse(item.preview_images); } catch(e) { console.warn("Image parse error", e); }
  }

  const owned = isItemOwned(item.id);
  const currentPoints = userProgress?.points || 0;
  const canAfford = currentPoints >= item.price;

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, isVisible: false }));

  const handleBuy = async () => {
    if (buying) return;

    if (!canAfford) {
        setAlertConfig({
            isVisible: true,
            title: t('insufficientFunds'),
            message: t('visitStoreHint') || "Visit the store to get more coins!",
            buttons: [{ text: t('ok'), style: 'cancel', onPress: hideAlert }]
        });
        return;
    }

    setAlertConfig({
        isVisible: true,
        title: t('confirmPurchase'),
        message: t('confirmPurchaseMsg').replace('{{price}}', item.price),
        buttons: [
            { text: t('cancel'), style: 'cancel', onPress: hideAlert },
            { 
                text: t('confirm'), 
                style: 'default', 
                onPress: async () => {
                    hideAlert();
                    await performPurchase();
                } 
            }
        ]
    });
  };

  const performPurchase = async () => {
    try {
        setBuying(true);
        const response = await apiService.purchaseStoreItem(item.id);
        
        if (response.success) {
            let newBalance = response.new_balance;
            if (newBalance === undefined || newBalance === null) {
                newBalance = Math.max(0, currentPoints - item.price);
            }

            handlePurchaseSuccess({
                item_id: item.id,
                ...item
            }, newBalance);
            
            onClose();
            Toast.show({
                type: 'success',
                text1: t('purchaseSuccess'),
                text2: t('checkLibraryHint') || 'The item is now in your library.',
            });
        }
    } catch (error) {
        setTimeout(() => { 
             setAlertConfig({
                isVisible: true,
                title: t('error'),
                message: error.message || "Purchase failed",
                buttons: [{ text: t('ok'), style: 'cancel', onPress: hideAlert }]
            });
        }, 500);
    } finally {
        setBuying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalContainer}>
            {/* Header Image */}
            <View style={styles.headerImageContainer}>
                <Image 
                    source={{ uri: item.thumbnail_url || item.thumbnail }} 
                    style={styles.headerImage} 
                    resizeMode="cover" 
                />
                <LinearGradient colors={['transparent', '#0F172A']} style={styles.gradient} />
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <FontAwesome5 name="times" size={16} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Title */}
                <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {displayTitle}
                </Text>
                
                {/* Meta Data */}
                <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.type?.toUpperCase()}</Text>
                    </View>
                    {/* هنا نستخدم الدوال الجديدة للعرض */}
                    <Text style={styles.metaText}>
                        {formatFileSize(item.file_size)} • {formatPageCount(item.pages_count)}
                    </Text>
                </View>

                {/* Description */}
                <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {displayDesc || t('noDescription') || "No description available."}
                </Text>

                {/* Preview Images Section */}
                {previews.length > 0 && (
                    <View style={styles.previewSection}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('preview') || "Preview"}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                            {previews.map((imgUrl, idx) => (
                                <Image 
                                    key={idx} 
                                    source={{ uri: imgUrl }} 
                                    style={styles.previewImage} 
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {owned ? (
                    <TouchableOpacity style={styles.ownedButton} disabled>
                        <FontAwesome5 name="check-circle" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>{t('owned')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.buyButton, !canAfford && styles.disabledButton]} 
                        onPress={handleBuy}
                        disabled={buying}
                    >
                        {buying ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>{t('unlockFor')}</Text>
                                <View style={styles.priceContainer}>
                                    <FontAwesome5 name="coins" size={14} color="white" style={{ marginRight: 4 }} />
                                    <Text style={styles.priceValue}>{item.price}</Text>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>

        <CustomAlert 
            isVisible={alertConfig.isVisible}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            onClose={hideAlert}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { height: '85%', backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  headerImageContainer: { height: 200, width: '100%' },
  headerImage: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  closeButton: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  content: { padding: 20 },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  metaRow: { alignItems: 'center', marginBottom: 20, gap: 10 },
  badge: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  metaText: { color: '#94A3B8', fontSize: 14 },
  description: { color: '#CBD5E1', fontSize: 15, lineHeight: 24, marginBottom: 30 },
  previewSection: { marginTop: 0, marginBottom: 20 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  previewImage: { 
      width: 120, 
      height: 170, 
      borderRadius: 8, 
      marginRight: 10, 
      backgroundColor: '#1E293B',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
  },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0F172A' },
  buyButton: { backgroundColor: '#F59E0B', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  ownedButton: { backgroundColor: '#10B981', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  disabledButton: { backgroundColor: '#334155', opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priceValue: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});