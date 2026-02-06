
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { apiService, BASE_URL } from '../config/api';
// ✅ 1. استيراد سياق التطبيق لجلب المساحة المستخدمة
import { useAppState } from '../context/AppStateContext';

// ✅ دالة مساعدة لتحويل النصوص (مثل "50 MB") إلى بايت للمقارنة
const parseSizeToBytes = (sizeStr) => {
    if (!sizeStr || typeof sizeStr !== 'string') return 0;
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return 0;
    
    if (sizeStr.toUpperCase().includes('GB')) return num * 1024 * 1024 * 1024;
    if (sizeStr.toUpperCase().includes('MB')) return num * 1024 * 1024;
    if (sizeStr.toUpperCase().includes('KB')) return num * 1024;
    return num; // bytes assumed if no unit
};

export const useLessonSources = (lessonId, callbacks = {}) => {
  const { onSuccessToast, onErrorAlert } = callbacks;
  // ✅ 2. الحصول على الاستهلاك الحالي من السياق
  const { storageUsage } = useAppState(); 

  const [sources, setSources] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const isProcessingBackground = false;

  const fetchSources = useCallback(async () => {
    try {
      const serverData = await apiService.fetchLessonSources(lessonId);
      const formattedData = serverData.map(item => ({
        ...item,
        status: 'completed',
        isProcessing: false,
        original_name: item.original_name || item.file_name, 
        file_size: item.file_size 
      }));
      setSources(formattedData);
      return formattedData;
    } catch (error) {
      console.error('Error fetching sources:', error);
      return [];
    }
  }, [lessonId]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf', 
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) return null;
      return result.assets[0]; 
    } catch (e) {
      console.log(e);
      return null;
    }
  };

 const startUpload = async (file, customName, description, onUploadSuccess = null) => {
    // 1. التحقق من حجم الملف الفردي (9.9 MB)
    const MAX_FILE_SIZE = 9.9 * 1024 * 1024;
    if (file.size && file.size > MAX_FILE_SIZE) {
        if (onErrorAlert) onErrorAlert("File Too Large", "The file exceeds the 9.9MB limit per file.");
        return;
    }

    // ✅ 3. التحقق من إجمالي مساحة التخزين (150 MB)
    const STORAGE_LIMIT_BYTES = 150 * 1024 * 1024; // 150 ميجا بايت بالبايت
    const currentUsedBytes = parseSizeToBytes(storageUsage);
    const totalAfterUpload = currentUsedBytes + file.size;

    if (totalAfterUpload > STORAGE_LIMIT_BYTES) {
        if (onErrorAlert) {
            onErrorAlert(
                "Storage Full", 
                "You have reached your 150MB free storage limit. Please delete some files to upload new ones."
            );
        }
        return; // 🛑 إيقاف الرفع
    }

    // 2. التحقق من النوع (PDF Only)
    const isTypeValid = file.mimeType?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
    if (!isTypeValid) {
        if (onErrorAlert) onErrorAlert("Invalid File Type", "Only PDF files are allowed.");
        return;
    }

    // التحقق من التكرار
    const isDuplicate = sources.some(source => {
        const sizeMatch = source.file_size && Math.abs(source.file_size - file.size) < 1024; 
        const nameToCheck = source.original_name || source.file_name;
        const nameMatch = nameToCheck === file.name;
        return sizeMatch && nameMatch;
    });

    if (isDuplicate) {
        if (onErrorAlert) onErrorAlert("Duplicate File", `The file "${file.name}" is already uploaded.`);
        return; 
    }

    const token = await apiService.getToken();
    if (!token) {
        if (onErrorAlert) onErrorAlert("Session Error", "Please login again.");
        return;
    }
    
    setIsUploading(true); 
    setUploadProgress(0); 

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name, 
        type: file.mimeType || 'application/pdf',
      });
      formData.append('lessonId', lessonId);
      formData.append('customName', customName);
      formData.append('description', description || ""); 

      const response = await axios.post(`${BASE_URL}/sources/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
        },
      });

      setIsUploading(false);
      const newSourceData = response.data.data; 
      const displayTitle = customName || file.name;

      const newSource = { 
        ...newSourceData, 
        status: 'completed',
        isProcessing: false, 
        file_name: displayTitle,
        original_name: file.name, 
        file_size: file.size,
        type: 'external',
        is_upload: true,
        file_url: newSourceData.file_url || newSourceData.url 
      };

      setSources(prev => [newSource, ...prev]);

      if (onSuccessToast) onSuccessToast("File uploaded successfully!");
      
      if (onUploadSuccess) onUploadSuccess(newSource);

    } catch (error) {
      setIsUploading(false);
      const msg = error.response?.status === 413 ? "File too large for server." : "Upload failed.";
      if (onErrorAlert) onErrorAlert("Error", msg);
    }
  };

  const deleteSource = (item, onSuccess) => {
    setSources(prev => prev.filter(s => s.id !== item.id));
    apiService.deleteSource(item.id).then(() => {
        if (onSuccess) onSuccess();
    }).catch(() => {
        if (onErrorAlert) onErrorAlert("Error", "Failed to delete file.");
        fetchSources(); 
    });
  };

  return {
    sources,
    isUploading,
    uploadProgress,
    isProcessingBackground, 
    pickDocument, 
    startUpload,  
    deleteSource,
    fetchSources,
  };
};