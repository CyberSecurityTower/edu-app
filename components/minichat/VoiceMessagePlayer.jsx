// components/minichat/VoiceMessagePlayer.jsx

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// --- Global Controller ---
const GlobalAudioController = {
  currentSound: null,
  currentUri: null,
  resetPreviousUI: null,

  async playNew(soundObject, uri, resetUICallback) {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (error) {}
    }
    if (this.resetPreviousUI) {
      this.resetPreviousUI(); 
    }
    this.currentSound = soundObject;
    this.currentUri = uri;
    this.resetPreviousUI = resetUICallback;
  },

  async stopCurrent() {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (e) {}
    }
    if (this.resetPreviousUI) {
      this.resetPreviousUI();
    }
    this.currentSound = null;
    this.currentUri = null;
    this.resetPreviousUI = null;
  }
};

const BARS_COUNT = 45; 

const VoiceMessagePlayer = ({ 
  audioUri, 
  duration, 
  isUser = true, 
  tintColor,
  mode = 'chat', // 'chat' | 'review'
  waveColor,
  backgroundColor = 'transparent'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const soundRef = useRef(null);
  const widthShared = useSharedValue(0);
  const progress = useSharedValue(0); 
  const [displayTime, setDisplayTime] = useState(duration || "0:00");
  const [totalDuration, setTotalDuration] = useState(0);

  // توليد شكل موجة جيبي (Sine Wave)
  const waveformHeights = useMemo(() => {
    return Array.from({ length: BARS_COUNT }).map((_, i) => {
       const x = i / BARS_COUNT; 
       const sine = Math.sin(x * Math.PI); 
       const noise = Math.random() * 0.5 + 0.5; 
       const height = Math.max(20, sine * noise * 100);
       return height;
    });
  }, []);

  const isReview = mode === 'review';

  // تعريف اللون النشط
  const activeColor = isReview 
     ? (waveColor || '#10B981') 
     : isUser ? '#FFFFFF' : (tintColor || '#0EA5A4');

  // ✅ تعريف اللون غير النشط (هنا كان الخطأ في التسمية سابقاً)
  const inactiveColor = isReview 
     ? 'rgba(16, 185, 129, 0.3)' 
     : isUser ? 'rgba(255, 255, 255, 0.4)' : '#CBD5E1';

  const btnBg = isReview ? '#D1FAE5' : (isUser ? 'rgba(255,255,255,0.25)' : '#F1F5F9');
  const iconColor = isReview ? '#059669' : (isUser ? '#FFF' : '#475569');
  const timerTextColor = isReview ? '#059669' : (isUser ? 'rgba(255,255,255,0.95)' : '#64748B');

  const formatTime = (millis) => {
    if ((!millis && millis !== 0) || millis < 0) return duration || "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const resetUI = useCallback(() => {
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        if (GlobalAudioController.currentUri === audioUri) {
          GlobalAudioController.currentSound = null;
          GlobalAudioController.currentUri = null;
          GlobalAudioController.resetPreviousUI = null;
        }
      }
    };
  }, [audioUri]);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) return;
    if (status.durationMillis && totalDuration === 0) setTotalDuration(status.durationMillis);

    if (status.didJustFinish) {
      soundRef.current?.stopAsync(); 
      soundRef.current?.setPositionAsync(0);
      setIsPlaying(false);
      progress.value = withTiming(0, { duration: 200 });
      setDisplayTime(formatTime(status.durationMillis));
      return;
    }

    if (status.isPlaying !== isPlaying) setIsPlaying(status.isPlaying);

    if (status.isPlaying) {
      const p = status.positionMillis / (status.durationMillis || 1);
      progress.value = withTiming(Math.min(p, 1), { duration: 100, easing: Easing.linear });
      setDisplayTime(formatTime(status.positionMillis));
    }
  };

  const initializeSound = async (autoPlay = false, startFromMillis = 0) => {
    if (!audioUri) return;
    try {
      setIsLoading(true);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: autoPlay, positionMillis: startFromMillis, isLooping: false },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      if (autoPlay) await GlobalAudioController.playNew(sound, audioUri, resetUI);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      resetUI();
    }
  };

  const handlePlayPause = async () => {
    Haptics.selectionAsync();
    if (!soundRef.current) { await initializeSound(true); return; }
    try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
            if (status.isPlaying) {
                await soundRef.current.pauseAsync();
                setIsPlaying(false);
            } else {
                if (GlobalAudioController.currentUri !== audioUri) await GlobalAudioController.playNew(soundRef.current, audioUri, resetUI);
                if (status.positionMillis >= (status.durationMillis || 0) - 100) await soundRef.current.replayAsync();
                else await soundRef.current.playAsync();
                setIsPlaying(true);
            }
        } else { await initializeSound(true); }
    } catch (e) { await initializeSound(true); }
  };

  const handleSeek = async (percentage) => {
    const targetMillis = Math.floor(percentage * (totalDuration || duration * 1000 || 1)); 
    progress.value = percentage;
    setDisplayTime(formatTime(targetMillis));
    try {
        if (!soundRef.current) await initializeSound(true, targetMillis);
        else {
            if (GlobalAudioController.currentUri !== audioUri) await GlobalAudioController.playNew(soundRef.current, audioUri, resetUI);
            await soundRef.current.setPositionAsync(targetMillis);
            const status = await soundRef.current.getStatusAsync();
            if (!status.isPlaying) await soundRef.current.playAsync();
        }
    } catch (e) {}
  };

  const tapGesture = Gesture.Tap().maxDuration(250).onStart((e) => {
       if (widthShared.value > 0) {
         const p = Math.max(0, Math.min(1, e.x / widthShared.value));
         runOnJS(Haptics.selectionAsync)();
         runOnJS(handleSeek)(p);
       }
  });

  const panGesture = Gesture.Pan()
    .onStart(() => runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light))
    .onUpdate((e) => { if (widthShared.value > 0) { const p = Math.max(0, Math.min(1, e.x / widthShared.value)); progress.value = p; } })
    .onEnd((e) => { if (widthShared.value > 0) { const p = Math.max(0, Math.min(1, e.x / widthShared.value)); runOnJS(handleSeek)(p); } });

  const composedGestures = Gesture.Race(panGesture, tapGesture);

  const maskStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`, overflow: 'hidden', position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 2,
  }));

  const Bars = ({ color }) => (
    <View style={styles.barsRow}>
      {waveformHeights.map((h, i) => (
        <View 
          key={i} 
          style={[styles.bar, { height: `${h}%`, backgroundColor: color }]} 
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Pressable 
        style={[styles.playBtn, { backgroundColor: btnBg }]} 
        onPress={handlePlayPause}
        hitSlop={8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={16} 
            color={iconColor} 
            style={{ marginLeft: isPlaying ? 0 : 2 }} 
          />
        )}
      </Pressable>

      <View 
        style={styles.wavesWrapper} 
        onLayout={(e) => { widthShared.value = e.nativeEvent.layout.width; }}
      >
        <GestureDetector gesture={composedGestures}>
            <View style={styles.touchableLayer}>
                {/* الخلفية: استخدام inactiveColor المصحح بدلاً من inactiveBarColor */}
                <View style={styles.fullLayer}>
                    <Bars color={inactiveColor} />
                </View>
                
                {/* المقدمة: استخدام activeColor */}
                <Animated.View style={maskStyle}>
                     <View style={[styles.fullLayer, { width: '100%' }]}> 
                        <Bars color={activeColor} />
                     </View>
                </Animated.View>
            </View>
        </GestureDetector>
      </View>

      <Text style={[styles.timer, { color: timerTextColor }]}>{displayTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', height: 45, paddingHorizontal: 8, width: '100%', minWidth: 150,
  },
  playBtn: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  wavesWrapper: {
    flex: 1, height: '100%', justifyContent: 'center', overflow: 'hidden', marginRight: 8,
  },
  touchableLayer: {
    width: '100%', height: '100%', position: 'relative', justifyContent: 'center',
  },
  fullLayer: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', justifyContent: 'center',
  },
  barsRow: {
    flexDirection: 'row', alignItems: 'center', height: 24, gap: 1.5, justifyContent: 'space-between', width: '100%'
  },
  bar: {
    width: 2.5, borderRadius: 1.25,
  },
  timer: {
    fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right', minWidth: 35,
  },
});

export default VoiceMessagePlayer;