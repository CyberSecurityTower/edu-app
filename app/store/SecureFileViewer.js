// components/store/SecureFileViewer.js

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, TouchableOpacity, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser'; 
import { apiService } from '../../config/api';
import { useLanguage } from '../../context/LanguageContext';

export default function SecureFileViewer({ visible, item, onClose }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && item) {
      loadContentStrategy();
    }
  }, [visible, item]);

  const loadContentStrategy = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ 1. السيناريو الأول: الملف مرفوع من قبل المستخدم (Upload)
      // الملفات المرفوعة تحتوي بالفعل على file_url ولديها الخاصية is_upload = true
      if (item.is_upload || item.type === 'upload' || item.source_type === 'upload') {
          console.log("📂 Opening User Upload:", item.title);
          
          if (!item.file_url && !item.fileUrl) {
              throw new Error("File URL is missing for this upload.");
          }

          // فتح الرابط المباشر (Cloudinary عادة)
          await openFile(item.file_url || item.fileUrl);
          onClose(); // نغلق المودال لأن المتصفح سيفتح
          return;
      }

      // ✅ 2. السيناريو الثاني: عنصر متجر (Store Item)
      // يحتاج للتحقق من السيرفر أولاً لجلب الرابط الآمن
      console.log("🛒 Opening Store Item:", item.title);
      const data = await apiService.getSecureItemContent(item.item_id || item.id);
      
      if (data && data.fileUrl) {
        await openFile(data.fileUrl);
        onClose(); 
      } else {
        throw new Error("Invalid secure link from store.");
      }

    } catch (err) {
      console.error("Secure View Error:", err);
      // ترجمة رسالة الخطأ الخاصة بالملكية
      if (err.message.includes('NOT_OWNED')) {
          setError(t('itemNotOwned') || "You do not own this item yet.");
      } else {
          setError(t('errorLoadingFile') || "Failed to load file.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (url) => {
    // استخدام WebBrowser لفتح الملفات (PDF, Images) داخل التطبيق
    await WebBrowser.openBrowserAsync(url, {
        controlsColor: '#38BDF8',
        toolbarColor: '#0F172A',
        enableBarCollapsing: true,
        showTitle: true
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.card}>
            {loading ? (
                <>
                    <ActivityIndicator size="large" color="#38BDF8" />
                    <Text style={[styles.text, { marginTop: 10 }]}>
                        {item?.is_upload 
                            ? (t('openingFile') || "Opening file...") 
                            : (t('verifyingAccess') || "Verifying access...")}
                    </Text>
                </>
            ) : error ? (
                <>
                    <FontAwesome5 name="exclamation-triangle" size={32} color="#EF4444" style={{ marginBottom: 10 }} />
                    <Text style={[styles.text, { color: '#EF4444', marginBottom: 15 }]}>{error}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.btn}>
                        <Text style={styles.btnText}>{t('close')}</Text>
                    </TouchableOpacity>
                </>
            ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '80%', maxWidth: 300, padding: 25, backgroundColor: '#1E293B', borderRadius: 20, alignItems: 'center', elevation: 10 },
  text: { color: 'white', textAlign: 'center', fontSize: 15, fontWeight: '500' },
  btn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#334155', borderRadius: 10, width: '100%', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' }
});