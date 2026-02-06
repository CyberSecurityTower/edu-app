import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  TextInput, // ✅ Added
  KeyboardAvoidingView, // ✅ Added
  Platform, // ✅ Added
  Keyboard // ✅ Added
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'; 
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking'; 
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  FadeIn, 
  FadeOut, 
  withTiming,
  Easing,
  runOnJS,
  ZoomIn, 
  LinearTransition 
} from 'react-native-reanimated';
import YoutubePlayer from "react-native-youtube-iframe"; 
import DraggableChatFab from '../components/DraggableChatFab'; 
import ArenaEntryButton from '../components/Arena/ArenaEntryButton';
import { useFocusEffect } from 'expo-router'; 
import { SoundManager } from '../utils/SoundManager'; 
import CustomAlert from '../components/CustomUploadAlert'; 
import UploadModal from '../components/UploadModal';
import { LessonStickyNote } from '../components/LessonStickyNote';
import { getLessonContent, getLessonDetails } from '../services/supabaseService';
import { useLanguage } from '../context/LanguageContext';
import { useUIState } from '../context/UIStateContext';
import { useFab } from '../context/FabContext';
import { useChat } from '../context/ChatContext';
import loadingAnimation from '../assets/images/task_loading.json';
import { renderLesson } from '../utils/renderer'; 
import { useLessonSources } from '../hooks/useLessonSources'; 
import * as WebBrowser from 'expo-web-browser';
import WorkspaceSelectionModal from './workspace/components/WorkspaceSelectionModal'; 
import { apiService } from '../config/api'; 
import { getPdfHtml } from '../utils/PdfViewerEngine'; 
import { TextSelectionMenu } from '../components/TextSelectionMenu'; 
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

const STATIC_SOURCES = [
  { id: 'default', title: "EduSources (Main)", icon: 'book-open', color: '#E2E8F0', type: 'html' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 🎨 Success Toast Component
const SuccessToast = ({ message, visible, onHide }) => {
  const insets = useSafeAreaInsets(); 
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(insets.top + 10, { damping: 12 });
      const timer = setTimeout(() => {
        translateY.value = withSpring(-100);
        setTimeout(onHide, 500);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      translateY.value = withSpring(-100);
    }
  }, [visible, insets.top]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  if (!visible && translateY.value === -100) return null;

  return (
    <Animated.View style={[styles.toastContainer, animatedStyle]}>
      <BlurView intensity={80} tint="dark" style={styles.toastContent}>
        <View style={styles.toastIconBox}>
          <FontAwesome5 name="check" size={12} color="white" />
        </View>
        <Text style={styles.toastText}>{message}</Text>
      </BlurView>
    </Animated.View>
  );
};

export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isRTL } = useLanguage();
  const { openChatPanel, isChatOpen } = useUIState(); 
  const { setFabConfig } = useFab();
  const { openChatSession, sendMessage } = useChat();
  const insets = useSafeAreaInsets(); 
  const { lessonId, subjectId } = params;
  const originalLessonContent = useRef(null); 
  const htmlWebViewRef = useRef(null); 
  // --- Modals & UI State ---
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [isFabLoading, setIsFabLoading] = useState(false); 
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  
  // --- Lesson Data State ---
  const [noteContent, setNoteContent] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [htmlSource, setHtmlSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLessonTitle, setCurrentLessonTitle] = useState(params.lessonTitle || '');
  
  // --- PDF Viewer State (Updated) ---
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [pdfSourceHtml, setPdfSourceHtml] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfGoToModalVisible, setPdfGoToModalVisible] = useState(false); // ✅ New
  const [targetPdfPageInput, setTargetPdfPageInput] = useState(''); // ✅ New
  const pdfWebViewRef = useRef(null);
  
  // --- Auto Height WebView State ---
  const [webViewHeight, setWebViewHeight] = useState(Dimensions.get('window').height);
  
const scrollYRef = useRef(0); // ✅ تتبع السكرول
const scrollViewRef = useRef(null); // ✅ مرجع للـ ScrollView
  // --- Source Management State ---
  const [sourceMenuVisible, setSourceMenuVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState(STATIC_SOURCES[0]);
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '' });
  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false); 

  // --- FADE TO BLACK ANIMATION ---
  const overlayOpacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      fetchSources();
      if (overlayOpacity.value > 0) {
        overlayOpacity.value = withTiming(0, { duration: 500 });
      }
    }, [fetchSources]) 
  );
const [selectionMenu, setSelectionMenu] = useState({ 
    visible: false, 
    text: '', 
    x: 0, 
    y: 0 
  });
  const handleEnterArena = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    SoundManager.playSound('battle');

    setTimeout(() => {
        SoundManager.playSound('sword');
    }, 3000);

    overlayOpacity.value = withTiming(1, { 
      duration: 5000, 
      easing: Easing.inOut(Easing.poly(4)) 
    }, (finished) => {
      if (finished) {
        runOnJS(router.push)({
            pathname: '/arena',
            params: { 
                lessonId: lessonId, 
                title: currentLessonTitle ,
                subjectId: subjectId
            }
        });
      }
    });
  }, [lessonId, currentLessonTitle, subjectId]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    zIndex: 999999999, 
    pointerEvents: overlayOpacity.value > 0.1 ? 'auto' : 'none',
  }));

  useEffect(() => {
    if (setFabConfig) {
      setFabConfig({ visible: false }); 
    }
    return () => {
      if (setFabConfig) {
        setFabConfig({ visible: true }); 
      }
    };
  }, [setFabConfig]);

  // Callbacks
  const showCustomAlert = useCallback((type, title, message, onConfirm = null) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setAlertConfig(prev => ({ ...prev, visible: false }));
      },
      onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false })),
    });
  }, []);

  const showSuccessToast = useCallback((msg) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToastConfig({ visible: true, message: msg });
  }, []);

  const handleErrorAlert = useCallback((title, message) => {
    showCustomAlert('error', title, message);
  }, [showCustomAlert]);

  const { 
    sources, 
    isUploading, 
    uploadProgress, 
    isProcessingBackground, 
    pickDocument, 
    startUpload,  
    deleteSource, 
    fetchSources, 
    retrySource
  } = useLessonSources(lessonId, {
    onSuccessToast: showSuccessToast, 
    onErrorAlert: handleErrorAlert 
  });

  const capsuleScale = useSharedValue(1);

  // Script for Auto Height in HTML View
  const autoHeightScript = `
    const meta = document.createElement('meta'); 
    meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1'); 
    document.getElementsByTagName('head')[0].appendChild(meta);

    function sendHeight() {
      const height = document.body.scrollHeight; 
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'HEIGHT', height: height }));
    }
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    window.addEventListener('load', sendHeight);
    window.addEventListener('resize', sendHeight);
    setTimeout(sendHeight, 1000);
  `;

  // ✅ التعديل الرئيسي هنا: إضافة CSS و JS لإلغاء قائمة النظام
 const selectionScript = `
    const style = document.createElement('style');
    style.innerHTML = \`
      :root { -webkit-touch-callout: none; -webkit-user-select: text; user-select: text; }
      ::selection { background: rgba(56, 189, 248, 0.3); color: inherit; }
    \`;
    document.head.appendChild(style);

    window.addEventListener("contextmenu", e => { e.preventDefault(); e.stopPropagation(); return false; }, true);

    // دالة مساعدة للحصول على الإحداثيات
    function reportSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 0) {
           const range = selection.getRangeAt(0);
           const rects = range.getClientRects();
           
           // نأخذ أول مستطيل (بداية التحديد) أو المستطيل المجمع
           const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
           
           // ✅ هام: نستخدم window.scrollY لضمان الإحداثيات المطلقة داخل المستند
           const absoluteTop = rect.top + window.scrollY;
           
           window.ReactNativeWebView.postMessage(JSON.stringify({
             type: 'TEXT_SELECTION',
             text: text,
             x: rect.left + (rect.width / 2),
             y: absoluteTop, 
             height: rect.height
           }));
        } else {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLEAR_SELECTION' }));
        }
    }

    let selectionTimeout;
    document.addEventListener("selectionchange", function() {
      clearTimeout(selectionTimeout);
      // نزيد الوقت قليلاً للتأكد من استقرار التحديد (Debounce)
      selectionTimeout = setTimeout(reportSelection, 200); 
    });

    // إضافة مستمع للنقر لإخفاء القائمة إذا نقر المستخدم في الفراغ
    document.addEventListener("touchend", function(e) {
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.toString().length === 0) {
                 window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLEAR_SELECTION' }));
            }
        }, 100);
    });
`;

  // دمج السكربتات
  const injectedJavascript = autoHeightScript + selectionScript;
  // Initial Data Load
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [details, contentData] = await Promise.all([
          getLessonDetails(lessonId),
          getLessonContent(lessonId),
          fetchSources() 
        ]);

        if (mounted) {
          if (details) setCurrentLessonTitle(details.title);
          
          if (contentData) {
             originalLessonContent.current = {
                content: contentData.content || '',
                title: details?.title
            };
            const html = renderLesson({
              content: contentData.content || '',
              title: details?.title,
            });
            setHtmlSource(html);
          }
        }
      } catch (e) {
        console.error('Error loading lesson:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    if (lessonId) loadData();
    return () => { mounted = false; };
  }, [lessonId, fetchSources]);

  const handleChatPress = useCallback(() => {
      setIsFabLoading(true); 
      setSourceMenuVisible(false);
      openChatSession(`lesson_${lessonId}`, {
          lessonId: lessonId,
          lessonTitle: currentLessonTitle,
          subjectId: subjectId
      });

      setTimeout(() => {
          openChatPanel(); 
          setIsFabLoading(false);
      }, 1000); 
  }, [lessonId, currentLessonTitle, subjectId, openChatPanel, openChatSession]);

 // ✅ 3. تحديث دالة استقبال الرسائل
 const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'HEIGHT' && data.height > 0) {
        setWebViewHeight(Number(data.height) + 20);
      }
      if (data.type === 'PLAY_VIDEO' && data.videoId) {
        setPlayingVideoId(data.videoId);
        setVideoModalVisible(true);
      }

      // --- ✅ منطق التحديد الجديد ---
      if (data.type === 'TEXT_SELECTION') {
        
        // 1. الثوابت
        const headerHeight = 75 + insets.top; // ارتفاع الهيدر + نوتش الهاتف
        const menuHeightEstimate = 70; // ارتفاع القائمة التقريبي
        
        // 2. موقع النص الحالي على الشاشة
        const selectionTopOnScreen = (data.y - scrollYRef.current) + headerHeight; 
        
        // 3. التحقق: هل هناك مساحة فوق النص؟
        // إذا كان موقع النص - ارتفاع القائمة < ارتفاع الهيدر، إذن لا توجد مساحة
        const notEnoughSpaceAbove = (selectionTopOnScreen - menuHeightEstimate) < headerHeight;

        // 4. تحديد الوضع (مقلوب أم لا)
        const isFlipped = notEnoughSpaceAbove;

        // 5. حساب الإحداثي Y النهائي
        let finalY;
        if (isFlipped) {
            // في حالة القلب: نضع القائمة أسفل النص
            // data.height هو ارتفاع سطر النص المحدد
            finalY = selectionTopOnScreen + (data.height || 20); 
        } else {
            // الحالة الطبيعية: فوق النص
            finalY = selectionTopOnScreen;
        }

        setSelectionMenu({
            visible: true,
            text: data.text,
            x: data.x,
            y: finalY,
            isFlipped: isFlipped,
            pinned: false        
          });
      }

      if (data.type === 'CLEAR_SELECTION') {
        setSelectionMenu(prev => {
            // 🛑 إذا كانت القائمة مثبتة (بسبب فتح ترجمة أو شرح)، لا تغلقها
            if (prev.pinned) return prev; 
            return { ...prev, visible: false };
        });
      }

    } catch (e) {}
};
 // ✅ 4. دالة التعامل مع أزرار القائمة (محدثة لتدعم Quick Look)
 const handleSelectionAction = async (action) => {
    const text = selectionMenu.text;
    
    // ✅ حالة خاصة: عند فتح Quick Look أو الترجمة
    if (action === 'PIN_MENU_AND_CLEAR_HIGHLIGHT') {
        // 1. نثبت القائمة حتى لا تغلق تلقائياً
        setSelectionMenu(prev => ({ ...prev, pinned: true }));

        // 2. نمسح اللون الأزرق
        const clearScript = `try { window.getSelection().removeAllRanges(); } catch(e){} true;`;
        if (isPdfMode) pdfWebViewRef.current?.injectJavaScript(clearScript);
        else htmlWebViewRef.current?.injectJavaScript(clearScript);
        
        return; // نخرج من الدالة لتبقى القائمة مفتوحة
    }
    // 1. التحكم في ظهور القائمة
    // إذا كان الأمر "تنظيف فقط" (مثل Quick Look)، لا نخفي القائمة
    if (action !== 'CLEAR_HIGHLIGHT_ONLY') {
        setSelectionMenu(prev => ({ ...prev, visible: false }));
    }

    // ✅ 2. إزالة التحديد الأزرق من النص (Deselect) دائماً
    const clearScript = `
      try {
        window.getSelection().removeAllRanges(); 
        if (window.getSelection().empty) {
            window.getSelection().empty();
        }
        // إجبار المتصفح على إعادة الرسم
        document.body.style.display='none';
        document.body.offsetHeight; 
        document.body.style.display='';
      } catch(e) {}
      true; 
    `;

    // تنفيذ كود الإزالة
    if (isPdfMode) {
        pdfWebViewRef.current?.injectJavaScript(clearScript);
    } else {
        htmlWebViewRef.current?.injectJavaScript(clearScript);
    }

    // إذا كان الأمر مجرد تنظيف للتحديد (لأجل Quick Look)، نتوقف هنا
    if (action === 'CLEAR_HIGHLIGHT_ONLY') return;

    // 3. تنفيذ باقي الأوامر (نسخ، مشاركة، شرح)
    if (action === 'copy') {
        await Clipboard.setStringAsync(text);
        showSuccessToast("Copied to clipboard");
        return;
    }
    
    if (action === 'share') {
        Share.share({ message: text });
        return;
    }

    if (action === 'explain') {
        openChatSession(`lesson_${lessonId}`, {
            lessonId: lessonId,
            lessonTitle: currentLessonTitle,
            subjectId: subjectId
        });

        openChatPanel(); 
        
        setTimeout(async () => {
            const visibleMessage = isRTL 
                ? `اشرح لي ما يلي:\n"${text}"` 
                : `Explain the following:\n"${text}"`;

            const hiddenContext = isRTL
                ? `المستخدم قام بنسخ هذا النص من درس "${currentLessonTitle}". المرجو شرحه بأسلوب مبسط وواضح.`
                : `User selected this text from lesson "${currentLessonTitle}". Please explain it clearly.`;

            await sendMessage(visibleMessage, {
                lessonId: lessonId,
                lessonTitle: currentLessonTitle,
                customInstruction: hiddenContext,
                metadata: {
                    selectedText: text,
                    source: 'selection_menu'
                }
            });

        }, 800); 
    }
  };
  // ✅ Handle messages from the PDF WebView (Smart Scroll Update)
  const handlePdfMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOADED') {
        setPdfTotalPages(data.totalPages);
      }
      if (data.type === 'PAGE_CHANGED') {
        setPdfPage(data.page); // Auto sync with scroll
      }
    } catch (e) {}
  };

  // ✅ Go To Page Function
  const goToPdfPage = () => {
    const pageNum = parseInt(targetPdfPageInput);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pdfTotalPages) {
      pdfWebViewRef.current?.postMessage(JSON.stringify({ type: 'GOTO', page: pageNum }));
      setPdfGoToModalVisible(false);
      setTargetPdfPageInput('');
    }
  };

 const handleNativeScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollYRef.current = offsetY; // ✅ حفظ القيمة لاستخدامها في الحسابات

    if (offsetY > 20 && sourceMenuVisible) {
      setSourceMenuVisible(false);
    }
    // إخفاء قائمة التحديد عند السكرول لتجنب تحركها بشكل غريب
    if (selectionMenu.visible) {
       setSelectionMenu(prev => ({ ...prev, visible: false }));
    }
  };
  
  const handleSourceSelect = async (item) => {
    Haptics.selectionAsync();

    // 1. Upload Logic
    if (item.special === 'add') {
      setSourceMenuVisible(false);
      setTimeout(async () => {
        const file = await pickDocument(); 
        if (file) {
          const MAX_SIZE = 9.9 * 1024 * 1024; 
          if (file.size > MAX_SIZE) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showCustomAlert('error', 'File Too Large', 'Maximum size allowed is 9.9 MB');
            return;
          }
          setPendingFile(file);
          setUploadModalVisible(true);
        }
      }, 300);
      return; 
    }

    // 2. Workspace Logic
    if (item.special === 'workspace') {
        setSourceMenuVisible(false);
        setTimeout(() => {
            setWorkspaceModalVisible(true);
        }, 300);
        return;
    }

    setSourceMenuVisible(false);
    
    // 3. Return to Main HTML Lesson
    if (item.type === 'html') {
      setIsPdfMode(false);
      setSelectedSource(item);
      if (originalLessonContent.current) {
          const html = renderLesson({
              content: originalLessonContent.current.content,
              title: originalLessonContent.current.title,
          });
          setHtmlSource(html);
          setCurrentLessonTitle(originalLessonContent.current.title);
      }
      return;
    }

    // 4. Handle External / PDF Files
    if (item.type === 'external' || item.is_upload) {
        
        const isPdf = item.file_type?.toLowerCase().includes('pdf') || 
                      item.type?.toLowerCase().includes('pdf') ||
                      item.file_url?.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            // ✅ Enable PDF Mode with New Engine
            const pdfHtml = getPdfHtml(item.file_url);
            setPdfSourceHtml(pdfHtml);
            setSelectedSource(item);
            setIsPdfMode(true); 
            setPdfPage(1);
        } else {
            try {
                await WebBrowser.openBrowserAsync(item.file_url, {
                    controlsColor: '#38BDF8',
                    toolbarColor: '#0F172A',
                    enableBarCollapsing: true,
                    showTitle: true
                });
                setTimeout(() => setSelectedSource(STATIC_SOURCES[0]), 500); 
            } catch (e) {
                console.error("Failed to open link", e);
                Linking.openURL(item.file_url);
            }
        }
    }
  };

 const handleWorkspaceFileSelect = async (file) => {
      setWorkspaceModalVisible(false);
      try {
          showSuccessToast("Linking file...");
          
          // 1. تنفيذ عملية الربط في الخلفية
          const existingLessonIds = file.lesson_ids || [];
          const existingSubjectIds = file.subject_ids || [];
          const updatedLessonIds = [...new Set([...existingLessonIds, lessonId])];
          const updatedSubjectIds = [...new Set([...existingSubjectIds, subjectId])];

          await apiService.linkSourceToContext(file.id, updatedLessonIds, updatedSubjectIds);
          
          showSuccessToast("File added and opened successfully");
          
          // 2. تحديث قائمة المصادر لضمان تزامن البيانات
          fetchSources();

          // 3. تجهيز الملف وفتحه مباشرة بالقارئ
          // نحتاج للتأكد من توحيد أسماء الحقول (url vs file_url)
          const sourceToOpen = {
              ...file,
              type: 'external',
              file_url: file.url || file.file_url, // ضمان وجود الرابط
              file_name: file.title || file.file_name || file.name, // ضمان وجود الاسم
              is_linked: true
          };

          // استدعاء دالة الاختيار لفتح الملف
          handleSourceSelect(sourceToOpen);

      } catch (error) {
          console.error("Linking failed", error);
          handleErrorAlert("Linking Failed", "Could not link the selected file.");
      }
  };

  const handleDeletePress = (item) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showCustomAlert(
      'delete',
      'Delete File?',
      `Are you sure you want to delete "${item.file_name || item.title}"?`,
      () => {
        deleteSource(item, () => {
             if (selectedSource.id === item.id) setSelectedSource(STATIC_SOURCES[0]);
        });
      }
    );
  };

 const handleUploadConfirm = (customName, description) => { 
    setUploadModalVisible(false);
    
    // تأخير بسيط لإغلاق المودال بسلاسة قبل البدء
    setTimeout(() => {
        // نمرر callback يستقبل الملف الجديد (uploadedFile)
        startUpload(pendingFile, customName, description, (uploadedFile) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // إذا قام الـ hook بإرجاع الملف الجديد، نفتح الملف مباشرة
            if (uploadedFile) {
                const sourceToOpen = {
                    ...uploadedFile,
                    type: 'external',
                    is_upload: true
                };
                handleSourceSelect(sourceToOpen);
            } else {
                // في حالة عدم إرجاع الملف، نقوم فقط بتحديث القائمة وفتح القائمة كاحتياط
                setSourceMenuVisible(true);
            }
        });
    }, 400); 
  };

  const toggleSourceMenu = () => {
    Haptics.selectionAsync();
    setSourceMenuVisible(!sourceMenuVisible);
  };

  const getSourceConfig = (source) => {
    const hasSmartContent = source.extracted_text && source.extracted_text.length > 50;
    if (hasSmartContent) {
      return { icon: 'brain', iconLib: 'MaterialCommunityIcons', color: '#A78BFA', isSmart: true };
    }
    const type = source.file_type;
    if (type?.includes('pdf')) return { icon: 'file-pdf', iconLib: 'FontAwesome5', color: '#EF4444' };
    if (type?.includes('image')) return { icon: 'image', iconLib: 'FontAwesome5', color: '#3B82F6' };
    if (type?.includes('video')) return { icon: 'video', iconLib: 'FontAwesome5', color: '#F59E0B' };
    return { icon: 'file-alt', iconLib: 'FontAwesome5', color: '#94A3B8' };
  };

  const menuData = [
    ...STATIC_SOURCES,
    ...sources.map(s => {
      if (s.isProcessing) {
        return {
          id: s.id,
          title: s.file_name,
          type: 'external',
          isProcessing: true,
          status: s.status,
          original: s
        };
      }
      const config = getSourceConfig(s);
      return {
        id: s.id,
        title: s.file_name,
        file_url: s.file_url,
        ...config,
        type: 'external',
        status: s.status, 
        original: s,
        isLinked: s.is_linked
      };
    }),
    { 
        id: 'workspace_select', 
        title: "Select from Workspace", 
        icon: 'folder-open', 
        iconLib: 'FontAwesome5', 
        color: '#F59E0B', 
        special: 'workspace' 
    },
    { id: 'add', title: "Upload New File", icon: 'cloud-upload-alt', iconLib: 'FontAwesome5', color: '#10B981', special: 'add' },
  ];

  // --- Animations ---
  const onCapsulePressIn = () => {
    capsuleScale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
  };
  const onCapsulePressOut = () => {
    capsuleScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };
  const capsuleAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: capsuleScale.value }] }));

  const renderUploadOverlay = () => {
    if (!isUploading) return null; 
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }]}>
         <BlurView intensity={60} tint="dark" style={styles.progressContainer}>
            <View style={{ width: 100, height: 100, marginBottom: 10, backgroundColor: 'transparent' }}>
                <LottieView 
                    source={require('../assets/images/cloud_upload.json')} 
                    autoPlay loop 
                    style={{ flex: 1 }} 
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.progressText}>Uploading to Cloud...</Text>
            <View style={styles.progressBarTrack}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${uploadProgress}%`,
                    backgroundColor: '#10B981' 
                  }
                ]} 
                layout={LinearTransition.springify()}
              />
            </View>
            <Text style={styles.percentageText}>{Math.round(uploadProgress)}%</Text>
         </BlurView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView source={loadingAnimation} autoPlay loop style={{ width: 150, height: 150 }} />
      </View>
    );
  }

  const menuTopPosition = insets.top + 65;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* Black Overlay for Arena Transition */}
      <Animated.View style={[styles.blackOverlay, overlayStyle]} />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={20} color="white" />
        </Pressable>
        
        <View style={styles.headerCenterContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentLessonTitle}
          </Text>
          
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    {/* ✅ PDF Page Indicator inside Header */}
    {isPdfMode && !isLoading && (
        <TouchableOpacity 
            onPress={() => setPdfGoToModalVisible(true)} 
            style={styles.headerPageBadge}
        >
            <Text style={styles.headerPageText}>{pdfPage} / {pdfTotalPages}</Text>
        </TouchableOpacity>
    )}

    <AnimatedPressable 
      style={[
        styles.glassCapsule,
        sourceMenuVisible && styles.glassCapsuleActive,
        capsuleAnimatedStyle
      ]} 
      onPress={toggleSourceMenu}
      onPressIn={onCapsulePressIn}
      onPressOut={onCapsulePressOut}
    >
      {/* 👇 التعديل هنا 👇 */}
      <Text 
        style={[
            styles.capsuleText, 
            { textAlign: isRTL ? 'right' : 'left' } // دعم اتجاه النص
        ]} 
        numberOfLines={1}        // سطر واحد فقط
        ellipsizeMode="tail"     // وضع (...) في النهاية إذا كان النص طويلاً
      >
        {selectedSource.title || "EduSources"}
      </Text>
      {/* 👆 نهاية التعديل 👆 */}
      
      {isProcessingBackground && (
          <View style={styles.processingDot} />
      )}

      <View style={styles.capsuleIconContainer}>
        <FontAwesome5 
          name={sourceMenuVisible ? "caret-up" : "caret-down"} 
          size={14} 
          color="#94A3B8" 
        />
      </View>
    </AnimatedPressable>
</View>
</View>

        <Pressable onPress={() => { Haptics.selectionAsync(); openChatPanel(); }} style={styles.headerIcon}>
          <FontAwesome5 name="comments" size={18} color="white" />
        </Pressable>
      </View>

      <View style={styles.contentContainer}>
        
        {/* ✅ OPTION A: Standard Lesson HTML View */}
        {!isPdfMode && (
            <Animated.ScrollView 
                ref={scrollViewRef}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleNativeScroll}
            >
                {showNote && noteContent && (
                  <LessonStickyNote note={noteContent} onClose={() => setShowNote(false)} />
                )}
                
                {htmlSource && (
                  <WebView
                  ref={htmlWebViewRef}
                    originWhitelist={['*']}
                    source={{ 
                      html: htmlSource, 
                      baseUrl: "https://www.youtube.com" 
                    }}
                    style={{ height: webViewHeight, backgroundColor: '#0B1220' }}
                    scrollEnabled={false} 
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    injectedJavaScript={injectedJavascript}
                    onMessage={handleWebViewMessage}
                    allowsFullscreenVideo={true} 
                    mediaPlaybackRequiresUserAction={false}
                  />
                )}
                
                <View style={{ paddingBottom: 100, paddingTop: 40, alignItems: 'center' }}>
                    <ArenaEntryButton 
                        title="ENTER ARENA" 
                        onPress={handleEnterArena}
                    />
                    
                    <Text style={{ 
                        color: '#64748B', 
                        fontSize: 10, 
                        marginTop: 10, 
                        textAlign: 'center',
                        opacity: 0.6
                    }}>
                        Win XP • Rank Up • Master this Lesson
                    </Text>
                </View>
            </Animated.ScrollView>
        )}

        {/* ✅ OPTION B: PDF Viewer Mode (Updated for Scroll & Zoom) */}
        {isPdfMode && pdfSourceHtml && (
            <View style={{ flex: 1, position: 'relative' }}>
                <WebView
                    ref={pdfWebViewRef}
                    originWhitelist={['*']}
                    source={{ html: pdfSourceHtml }}
                    style={{ backgroundColor: '#0B1220', flex: 1 }}
                    onMessage={handlePdfMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scalesPageToFit={true}
                    androidLayerType="hardware"
                    // ✅ Enable Built-in Zoom & Scrolling
                    setBuiltInZoomControls={true} 
                    displayZoomControls={false}
                    scrollEnabled={true}
                />

                {/* Optional: Small Floating Indicator at bottom right */}
                <View style={styles.miniPageIndicator}>
                    <Text style={styles.miniPageText}>{pdfPage}</Text>
                </View>
            </View>
        )}

      </View>

      {!uploadModalVisible && !videoModalVisible && !pdfGoToModalVisible && (
         <DraggableChatFab 
            onPress={handleChatPress} 
            isLoading={isFabLoading} 
            isHidden={isChatOpen}     
         />
      )}

      {renderUploadOverlay()}
      
      <SuccessToast 
        visible={toastConfig.visible} 
        message={toastConfig.message} 
        onHide={() => setToastConfig(prev => ({ ...prev, visible: false }))} 
      />

      <UploadModal 
        visible={uploadModalVisible}
        file={pendingFile}
        onClose={() => setUploadModalVisible(false)}
        onConfirm={handleUploadConfirm}
      />

      <CustomAlert 
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.type === 'delete' ? 'Delete' : 'OK'}
        cancelText="Cancel"
      />

      {/* ✅ PDF Go To Page Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={pdfGoToModalVisible}
        onRequestClose={() => setPdfGoToModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPdfGoToModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Go to Page</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="number-pad"
                            placeholder={`1 - ${pdfTotalPages}`}
                            placeholderTextColor="#64748B"
                            value={targetPdfPageInput}
                            onChangeText={setTargetPdfPageInput}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#38BDF8'}]} onPress={goToPdfPage}>
                                <Text style={styles.modalBtnText}>Go</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#334155'}]} onPress={() => setPdfGoToModalVisible(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
      </Modal>
  {/* ✅ إضافة قائمة التحديد المخصصة هنا */}
  {selectionMenu.visible && (
        <TextSelectionMenu 
          visible={selectionMenu.visible}
          position={selectionMenu} 
          onAction={handleSelectionAction}
          onClose={() => setSelectionMenu(prev => ({ ...prev, visible: false, pinned: false }))}
        />
      )}
      {sourceMenuVisible && !isUploading && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
          <TouchableWithoutFeedback onPress={() => setSourceMenuVisible(false)}>
            <Animated.View 
              entering={FadeIn.duration(200)} 
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
            />
          </TouchableWithoutFeedback>

          <View style={[styles.menuWrapper, { top: menuTopPosition }]} pointerEvents="box-none">
            <Animated.View 
              entering={ZoomIn.springify().damping(15).stiffness(200).mass(0.8)}
              exiting={FadeOut.duration(150)}
              style={styles.menuAnimationContainer}
            >
              <View style={styles.menuArrow} />
              
              <BlurView intensity={70} tint="dark" style={styles.glassMenuContainer}>
                <FlatList
                  data={menuData}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={menuData.length > 4} // تفعيل السكرول إذا كان هناك أكثر من 4 عناصر
style={{ maxHeight: 260 }} 
                  contentContainerStyle={{ paddingVertical: 4 }}
                  renderItem={({ item, index }) => {
                    
                    if (item.isProcessing) {
                        return (
                            <View style={[styles.menuItem, { opacity: 1 }]}> 
                                <View style={[styles.menuIconBox, { backgroundColor: 'transparent' }]}>
                                    <LottieView 
                                        source={require('../assets/images/ai_processing.json')} 
                                        autoPlay 
                                        loop 
                                        style={{ width: 45, height: 45 }}
                                        renderMode="SOFTWARE" 
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuItemText, { color: '#38BDF8', fontWeight: '600' }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                                        EduAI is preparing lesson...
                                    </Text>
                                </View>
                            </View>
                        );
                    }

                    if (item.status === 'failed') {
                        return (
                            <View style={[styles.menuItem, { opacity: 1 }]}>
                                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                    <FontAwesome5 name="exclamation-triangle" size={14} color="#EF4444" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuItemText, { color: '#EF4444', fontWeight: '600' }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                                        AI processing failed.
                                    </Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => handleDeletePress(item.original || item)}
                                    style={{ padding: 8, marginRight: 4 }}
                                >
                                    <FontAwesome5 name="trash" size={12} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => {
                                       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                       retrySource(item.original || item); 
                                    }}
                                    style={styles.retryButton}
                                >
                                    <FontAwesome5 name="redo" size={12} color="white" />
                                    <Text style={styles.retryText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ); 
                    }

                    const isSelected = selectedSource.id === item.id && !item.special;
                    const IconComponent = item.iconLib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : FontAwesome5;

                    return (
                      <Pressable 
                        style={({ pressed }) => [
                          styles.menuItem,
                          pressed && styles.menuItemPressed,
                          isSelected && styles.menuItemSelected,
                          index === menuData.length - 1 && styles.menuItemLast
                        ]}
                        onPress={() => handleSourceSelect(item)} 
                        onLongPress={() => {
                          if (item.type === 'external') handleDeletePress(item.original);
                        }}
                      >
                        <View style={[
                          styles.menuIconBox, 
                          { backgroundColor: item.special ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.08)' },
                          item.isSmart && { backgroundColor: 'rgba(139, 92, 246, 0.2)' } 
                        ]}>
                            <IconComponent name={item.icon} size={15} color={item.color} />
                        </View>
                        
                        <View style={{flex: 1, marginRight: 8}}>
                            <Text style={[
                              styles.menuItemText, 
                              item.special && { color: '#10B981', fontWeight: '700' },
                              item.isSmart && { color: '#E9D5FF', fontWeight: '600' },
                              isSelected && { color: '#38BDF8', fontWeight: '700' }
                            ]} numberOfLines={1}>
                              {item.title}
                             </Text>
                            {item.isLinked && (
                                <FontAwesome5 name="link" size={10} color="#94A3B8" />
                            )}
                        </View>
                        
                        {item.type === 'external' && !isSelected && (
                          <FontAwesome5 name={item.isSmart ? "chevron-right" : "external-link-alt"} size={10} color="#64748B" />
                        )}
                        
                        {isSelected && (
                          <FontAwesome5 name="check" size={12} color="#38BDF8" />
                        )}
                      </Pressable>
                    );
                  }}
                />
              </BlurView>
            </Animated.View>
          </View>
        </View>
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={videoModalVisible}
        onRequestClose={() => setVideoModalVisible(false)}
        statusBarTranslucent
      >
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center'}}>
          <TouchableOpacity 
            style={{position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10}}
            onPress={() => setVideoModalVisible(false)}
          >
            <FontAwesome5 name="times" size={24} color="white" />
          </TouchableOpacity>
          <View style={{width: '100%', aspectRatio: 16/9}}>
            <YoutubePlayer
              height={Dimensions.get('window').width * (9/16)}
              play={true}
              videoId={playingVideoId}
              onChangeState={(state) => {
                if (state === 'ended') setVideoModalVisible(false);
              }}
              webViewProps={{
                 androidLayerType: 'hardware',
                 allowsFullscreenVideo: true
              }}
            />
          </View>
        </View>
      </Modal>

      <WorkspaceSelectionModal 
        visible={workspaceModalVisible}
        onClose={() => setWorkspaceModalVisible(false)}
        onSelect={handleWorkspaceFileSelect}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0B1220' 
  },
  blackOverlay: {
    position: 'absolute',
    top: -100, 
    bottom: -100,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#0B1220'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0B1220',
    zIndex: 20, 
    height: 75,
  },
  headerCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10
  },
  headerTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.9
  },
  // ✅ New Styles for PDF Header Badge
  headerPageBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  headerPageText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxWidth: '90%',
  },
  glassCapsuleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  capsuleText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: 0.5,
    maxWidth: 150
  },
  capsuleIconContainer: {
    opacity: 0.9,
    marginTop: 2
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8', 
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  menuWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    elevation: 100, 
  },
  menuAnimationContainer: {
    width: 280,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  menuArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(30, 41, 59, 0.9)', 
    marginBottom: -1, 
    zIndex: 20,
    transform: [{ translateY: 1 }]
  },
  glassMenuContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  menuItemSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)', 
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    width: Dimensions.get('window').width * 0.8,
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    overflow: 'hidden'
  },
  progressText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
    opacity: 0.95
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4
  }, 
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 6
  },
  retryText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600'
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  toastIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  toastText: {
    color: '#ECFDF5',
    fontSize: 14,
    fontWeight: '600',
  },
  // ✅ New Styles for Modal & Mini Badge
  miniPageIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 280, backgroundColor: '#1E293B', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: 'white', fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
  input: { width: '100%', height: 50, backgroundColor: '#0F172A', borderRadius: 12, color: 'white', textAlign: 'center', fontSize: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  modalButtons: { flexDirection: 'row-reverse', width: '100%', gap: 12 },
  modalBtn: { flex: 1, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});