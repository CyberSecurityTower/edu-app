import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, ActivityIndicator, SafeAreaView, Text,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView,
  Platform, TouchableWithoutFeedback, Keyboard, StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getPdfHtml } from '../utils/PdfViewerEngine';

// يمكن استبدال هذا بالرابط القادم من الـ params
const DEFAULT_URL = "https://wlghgzsgsefvwtdysqsw.supabase.co/storage/v1/object/public/announcements/1767268968.pdf";

export default function PdfViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // تحديد الرابط: إما من الباراميترات أو الافتراضي للاختبار
  const rawUrl = params.url || DEFAULT_URL;
  const url = rawUrl ? decodeURIComponent(rawUrl) : null;
  const title = params.title || "عرض المستند";

  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState('');

  const pdfSource = getPdfHtml(url);

  useEffect(() => {
    async function changeOrientation() {
      await ScreenOrientation.unlockAsync();
    }
    changeOrientation();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOADED') {
        setLoading(false);
        setTotalPages(data.totalPages);
      }
      if (data.type === 'PAGE_CHANGED') {
        // تحديث الرقم تلقائياً أثناء السكرول
        setCurrentPage(data.page);
      }
    } catch (e) {}
  };

  const goToPage = () => {
    const pageNum = parseInt(targetPageInput);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'GOTO', page: pageNum }));
      setModalVisible(false);
      setTargetPageInput('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-right" size={20} color="#CBD5E1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        
        {/* زر الذهاب لصفحة في الهيدر أيضاً لسهولة الوصول */}
        {!loading && (
             <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerPageBadge}>
                 <Text style={styles.headerPageText}>{currentPage} / {totalPages}</Text>
             </TouchableOpacity>
        )}
      </View>

      <View style={styles.contentContainer}>
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={{color: '#64748B', marginTop: 10}}>جاري تجهيز الصفحات...</Text>
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: pdfSource }}
          style={{ backgroundColor: '#0F172A', flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
          androidLayerType="hardware"
          // تفعيل الزوم الداخلي المدمج
          setBuiltInZoomControls={true} 
          displayZoomControls={false}
          scrollEnabled={true} // التأكد من تفعيل السكرول
        />

        {/* Floating Page Indicator (Optional - if users scroll fast) */}
        {!loading && (
          <View style={styles.floatingIndicator}>
             <Text style={styles.floatingText}>{currentPage}</Text>
          </View>
        )}
      </View>

      {/* Modal - Go To Page */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>الذهاب إلى صفحة</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="number-pad"
                            placeholder={`1 - ${totalPages}`}
                            placeholderTextColor="#64748B"
                            value={targetPageInput}
                            onChangeText={setTargetPageInput}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#38BDF8'}]} onPress={goToPage}>
                                <Text style={styles.modalBtnText}>ذهاب</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#334155'}]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { 
    height: 55, 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    backgroundColor: '#0F172A', 
    borderBottomWidth: 1, 
    borderColor: '#1E293B' 
  },
  headerTitle: { 
    color: '#F8FAFC', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginRight: 15, 
    flex: 1, 
    textAlign: 'right' 
  },
  headerPageBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  headerPageText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold'
  },
  backBtn: { padding: 8 },
  contentContainer: { flex: 1 },
  loaderContainer: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#0F172A', 
    zIndex: 10 
  },
  
  // مؤشر صغير عائم يظهر رقم الصفحة الحالية فقط في الزاوية
  floatingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5
  },
  floatingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 280, backgroundColor: '#1E293B', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: 'white', fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
  input: { width: '100%', height: 50, backgroundColor: '#0F172A', borderRadius: 12, color: 'white', textAlign: 'center', fontSize: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  modalButtons: { flexDirection: 'row-reverse', width: '100%', gap: 12 },
  modalBtn: { flex: 1, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});