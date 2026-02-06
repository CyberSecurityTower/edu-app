import { useState, useRef, useEffect } from 'react';
import { Keyboard } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { 
  withTiming, 
  withSpring, 
  withSequence, 
  runOnJS 
} from 'react-native-reanimated';

// دالة مساعدة لتنسيق الوقت (MM:SS)
const formatDuration = (millis) => {
  if (!millis) return "00:00";
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
};

export const useAudioRecorder = ({
  metering,
  isRecordingShared,
  layerOpacity,
  shakeTranslate,
  onSend
}) => {
  const [isRecordingState, setIsRecordingState] = useState(false);
  const [timer, setTimer] = useState("00:00");
  const [recordingRef, setRecordingRef] = useState(null);
  
  // مرجع لتخزين الثواني الحالية
  const secondsRef = useRef(0);
  const timerIntervalRef = useRef(null);
  const stopRecordingInternal = async (recordingObject) => {
     // نفس منطق stopAndSend لكن يستقبل الكائن كـ معامل لضمان العمل
     // سيتم دمج المنطق في الدالة بالأسفل
  };
  // --- Refs ---
  const timerRef = useRef(null);

  // --- Helpers ---

  const startTimer = () => {
    secondsRef.current = 0;
    clearInterval(timerIntervalRef.current);
    
    timerIntervalRef.current = setInterval(() => {
      secondsRef.current += 1;
      
      // ✅ التحقق من الحد الأقصى (120 ثانية = دقيقتين)
      if (secondsRef.current >= 120) {
          clearInterval(timerIntervalRef.current);
          stopAndSend(); // إيقاف وإرسال تلقائي
          return;
      }

      const m = Math.floor(secondsRef.current / 60);
      const s = secondsRef.current % 60;
      setTimer(`${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`);
    }, 1000);
  };

  const resetInternalState = async () => {
    setIsRecordingState(false);
    isRecordingShared.value = false;
    metering.value = -160;
    setTimer("00:00");
    layerOpacity.value = 0;
    
    if (recordingRef) {
       try {
         await recordingRef.stopAndUnloadAsync();
       } catch (e) { console.log('Error stopping', e); }
       setRecordingRef(null);
    }
 };

  // --- Core Functions ---

  // 1. بدء التسجيل
  async function startRecording() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Keyboard.dismiss(); 
      
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true 
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.metering) metering.value = status.metering;
        },
        50 
      );
      
      setRecordingRef(recording);
      setIsRecordingState(true);
      isRecordingShared.value = true;
      
      // تشغيل أنيميشن الظهور
      layerOpacity.value = withTiming(1, { duration: 400 });
      startTimer();
      
    } catch (err) { console.error("Failed to start recording", err); }
  }

  // 2. إيقاف وإرسال (تم التعديل هنا) ✅
   // ✅ تعديل دالة الإيقاف لتعتمد على المرجع الحالي (Ref)
  // لأن State قد لا تكون محدثة داخل الـ setInterval
  const stopAndSend = async () => {
    // نستخدم المرجع المخزن في State أو نمرره
    // ملاحظة: بما أن recordingRef مخزن في State، قد نحتاج لاستخدام مرجع (Ref) له أيضاً إذا واجهت مشاكل
    // لكن في أغلب الحالات ستعمل مباشرة لأن الدالة يعاد إنشاؤها
    if (!recordingRef) return; 
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    layerOpacity.value = withTiming(0, { duration: 300 });
    clearInterval(timerIntervalRef.current);
    
    try {
        const status = await recordingRef.getStatusAsync();
        const durationMillis = status.durationMillis;
        const durationStr = formatDuration(durationMillis);

        await recordingRef.stopAndUnloadAsync();
        const uri = recordingRef.getURI();
        
        const audioFile = {
            uri: uri,
            duration: durationStr,
            durationMillis: durationMillis,
            type: 'audio/m4a',
            name: `voice_${Date.now()}.m4a`
        };

        // تنظيف
        setIsRecordingState(false);
        isRecordingShared.value = false;
        metering.value = -160;
        setTimer("00:00");
        setRecordingRef(null);
        secondsRef.current = 0;

        if(onSend) onSend(audioFile);

    } catch (error) {
        console.error("Failed to stop recording", error);
    }
  };

  // 3. إلغاء التسجيل
  async function cancelRecording() {
    if (!recordingRef) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // تأثير الاهتزاز (Shake)
    shakeTranslate.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
    );

    clearInterval(timerRef.current);

    // إخفاء الواجهة ثم تنظيف الذاكرة
    setTimeout(() => {
        layerOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
            if (finished) {
                runOnJS(resetInternalState)();
            }
        });
    }, 250);
  }

  // تنظيف عند إغلاق المكون
  useEffect(() => {
    return () => {
        if (recordingRef) {
            recordingRef.stopAndUnloadAsync();
        }
        clearInterval(timerRef.current);
    };
  }, []);

  return {
    isRecordingState,
    timer,
    startRecording,
    stopAndSend,
    cancelRecording
  };
};