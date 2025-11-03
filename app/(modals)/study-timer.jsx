import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable, ScrollView, Platform, UIManager, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppState } from '../../context/AppStateContext';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';

import SettingsModal from '../../components/timer/SettingsModal';
import CircularProgress from '../../components/timer/CircularProgress';
import SoundsModal from '../../components/timer/SoundsModal';
import TimerControls from '../../components/timer/TimerControls';
import { audioService } from '../../services/audioService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ASYNC_STORAGE_MODES_KEY = '@timerModes';
const DEFAULT_MODES = [
  { key: 'default-pomodoro', name: 'Classic Focus', icon: 'brain', settings: { sessions: [{ focus: 25 * 60, break: 5 * 60 }, { focus: 25 * 60, break: 5 * 60 }, { focus: 25 * 60, break: 5 * 60 }, { focus: 25 * 60, break: 15 * 60 }], autoStartNextSession: true, enableAudioNotifications: true }},
  { key: 'default-50-10', name: 'Intense Sprint', icon: 'hourglass-half', settings: { sessions: [{ focus: 50 * 60, break: 10 * 60 }], autoStartNextSession: true, enableAudioNotifications: true }},
];
const SESSION_COLORS = { focus: '#34D399', break: '#60A5FA' };

const TimerStatusIndicator = React.memo(({ timerSession }) => {
  const { status, sessionType, currentCycle, settings } = timerSession || {};
  if (!settings || !settings.sessions) return null;

  const totalSessions = settings.sessions.length;
  const { icon, text } = useMemo(() => {
    const isRunning = status === 'active' || status === 'paused';
    if (status === 'finished') {
        return { icon: 'check-circle', text: 'Cycle Complete! Well done.' };
    }
    if (isRunning) {
      switch (sessionType) {
        case 'focus':
          return { icon: 'brain', text: `Focus: Session ${currentCycle} of ${totalSessions}` };
        case 'break':
          return { icon: 'coffee', text: `Break after Session ${currentCycle}` };
        default:
          return { icon: 'clock', text: '...' };
      }
    } else {
      return { icon: 'play-circle', text: `Ready to start Session ${currentCycle} of ${totalSessions}` };
    }
  }, [status, sessionType, currentCycle, totalSessions]);

  return (
    <View style={styles.statusIndicatorContainer}>
      <FontAwesome5 name={icon} style={styles.statusIndicatorIcon} />
      <Text style={styles.statusIndicatorText}>{text}</Text>
    </View>
  );
});
TimerStatusIndicator.displayName = 'TimerStatusIndicator';

export default function StudyTimerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { timerSession, setTimerSession, startTimer, pauseTimer, resumeTimer, endTimer, skipTimer, updateSettings } = useAppState();

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isSoundsVisible, setIsSoundsVisible] = useState(false);
  const [selectedSound, setSelectedSound] = useState(timerSession?.selectedSound ?? 'complete-silence');
  const [availableModes, setAvailableModes] = useState([]);
  const [modeToEdit, setModeToEdit] = useState(null);
  const [modeLayouts, setModeLayouts] = useState({});
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const loadModes = async () => {
      try {
        const storedModes = await AsyncStorage.getItem(ASYNC_STORAGE_MODES_KEY);
        setAvailableModes(storedModes ? JSON.parse(storedModes) : DEFAULT_MODES);
      } catch (e) { console.error('Failed to load modes', e); setAvailableModes(DEFAULT_MODES); }
    };
    loadModes();
  }, []);

  const saveModes = async (modes) => {
    try { await AsyncStorage.setItem(ASYNC_STORAGE_MODES_KEY, JSON.stringify(modes)); } 
    catch (e) { console.error('Failed to save modes', e); }
  };

  useEffect(() => { if (timerSession?.selectedSound !== selectedSound) { setSelectedSound(timerSession.selectedSound ?? 'complete-silence'); } }, [timerSession?.selectedSound]);
  useEffect(() => () => audioService?.stopPreview?.(), []);
  useEffect(() => { if (params.relatedTaskTitle && timerSession?.status === 'idle') { setTimerSession(prev => ({ ...prev, taskTitle: params.relatedTaskTitle, taskId: params.taskId || null })); } }, [params.relatedTaskTitle, params.taskId, timerSession?.status, setTimerSession]);

  if (!timerSession || !timerSession.settings) {
    return (
      <ImageBackground source={require('../../assets/images/timer-background.jpg')} style={styles.backgroundImage}>
        <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </SafeAreaView>
      </ImageBackground>
    );
  }

  const { timeLeft, activeModeKey, status } = timerSession;
  // ✅ NEW: A flag to disable settings changes while the timer is running.
  const isTimerRunning = status === 'active' || status === 'paused';

  const handleSelectSound = useCallback((soundId) => { setSelectedSound(soundId); setTimerSession(prev => ({ ...prev, selectedSound: soundId })); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }, [setTimerSession]);
  
  const handleSelectMode = useCallback((mode) => {
    if (isTimerRunning) return; // This check is now redundant but safe to keep.
    if (!mode || !mode.key) {
      console.warn("handleSelectMode was called with an invalid mode object.", mode);
      return;
    }
    updateSettings(mode);
    const layout = modeLayouts[mode.key];
    if (layout && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: layout.x - 15, animated: true });
    }
  }, [isTimerRunning, updateSettings, modeLayouts]);

  const handleAddNewMode = useCallback(() => {
    if (isTimerRunning) return;
    const newMode = {
      key: `custom-${Date.now()}`, name: 'New Custom Mode', icon: 'pen-alt',
      settings: { sessions: [{ focus: 30 * 60, break: 5 * 60 }], autoStartNextSession: true, enableAudioNotifications: true },
    };
    setModeToEdit(newMode);
    setIsSettingsVisible(true);
  }, [isTimerRunning]);

  const handleEditMode = useCallback((mode) => {
    if (isTimerRunning) return;
    setModeToEdit(mode);
    setIsSettingsVisible(true);
  }, [isTimerRunning]);
  
  const handleSaveMode = useCallback(async (savedMode) => {
    const wasActiveMode = modeToEdit?.key === activeModeKey;
    const updatedModes = await new Promise(resolve => {
      setAvailableModes(prevModes => {
        const isNew = !prevModes.some(m => m.key === savedMode.key);
        const newModeList = isNew ? [...prevModes, savedMode] : prevModes.map(m => (m.key === savedMode.key ? savedMode : m));
        resolve(newModeList);
        return newModeList;
      });
    });
    await saveModes(updatedModes);
    if (wasActiveMode) {
      updateSettings(savedMode);
    }
    setModeToEdit(null);
    setIsSettingsVisible(false);
  }, [activeModeKey, updateSettings, modeToEdit]);
    
  const handleDeleteMode = useCallback(async (modeKey) => {
    const updatedModes = availableModes.filter(m => m.key !== modeKey);
    setAvailableModes(updatedModes);
    await saveModes(updatedModes);
    if (modeKey === activeModeKey) {
      updateSettings(DEFAULT_MODES[0]);
    }
    setModeToEdit(null);
    setIsSettingsVisible(false);
  }, [availableModes, activeModeKey, updateSettings]);

  const handleStart = useCallback(() => { startTimer(selectedSound); }, [startTimer, selectedSound]);
  const handleModeLayout = useCallback((event, key) => { const { x, width, height } = event.nativeEvent.layout; setModeLayouts(prev => ({ ...prev, [key]: { x, width, height } })); }, []);

  const activeModeLayout = activeModeKey ? modeLayouts[activeModeKey] : null;
  const sessionDisplayName = timerSession?.status === 'finished' ? 'Cycle Complete!' : timerSession?.sessionType === 'focus' ? (timerSession?.taskTitle || 'Focus Session') : 'Break';
  const progressColor = useMemo(() => SESSION_COLORS[timerSession?.sessionType] || SESSION_COLORS.focus, [timerSession?.sessionType]);

  return (
    <ImageBackground source={require('../../assets/images/timer-background.jpg')} style={styles.backgroundImage}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerIcon} onPress={() => router.back()}><FontAwesome5 name="chevron-down" size={22} color="#E5E7EB" /></Pressable>
          <Pressable style={styles.headerIcon} onPress={() => { audioService?.stopPreview?.(); setIsSoundsVisible(true); }}><FontAwesome5 name="music" size={22} color="#E5E7EB" /></Pressable>
        </View>

        <MotiView 
          style={styles.content}
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 250 }}
        >
          <View style={styles.titleContainer}><Text style={styles.taskTitle} numberOfLines={2}>{sessionDisplayName}</Text></View>
          <CircularProgress duration={timerSession?.duration ?? 0} timeLeft={timeLeft} sessionType={timerSession?.sessionType} progressColor={progressColor} />
          <TimerStatusIndicator timerSession={timerSession} />
          <View style={styles.controlsContainer}><TimerControls status={status} onStart={handleStart} onPause={pauseTimer} onResume={resumeTimer} onEnd={endTimer} onSkip={skipTimer} /></View>
        </MotiView>

        <View style={[styles.modeSelectorSection, isTimerRunning && styles.disabledOverlay]}>
          <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScrollContent}>
            <AnimatePresence>
              {activeModeLayout && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1, left: activeModeLayout.x, width: activeModeLayout.width, height: activeModeLayout.height }} transition={{ type: 'spring', damping: 20, stiffness: 200 }} style={[styles.modeCardActive, styles.activeIndicator]} />
              )}
            </AnimatePresence>
            {availableModes.map((mode) => {
              const isActive = activeModeKey === mode.key;
              return (
                <Pressable key={mode.key} onLayout={(event) => handleModeLayout(event, mode.key)} style={styles.modeCard} onPress={() => handleSelectMode(mode)} onLongPress={() => handleEditMode(mode)} disabled={isTimerRunning}>
                  <FontAwesome5 name={mode.icon ?? 'clock'} size={20} color={isActive ? 'white' : '#9CA3AF'} />
                  <Text style={[styles.modeCardTitle, isActive && styles.modeCardTitleActive]}>{mode.name}</Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.addModeCard} onPress={handleAddNewMode} disabled={isTimerRunning}>
              <FontAwesome5 name="plus" size={20} color="#9CA3AF" />
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>

      <SettingsModal isVisible={isSettingsVisible} onClose={() => { setModeToEdit(null); setIsSettingsVisible(false); }} onSave={handleSaveMode} onDelete={handleDeleteMode} modeToEdit={modeToEdit} />
      <SoundsModal isVisible={isSoundsVisible} onClose={() => { audioService?.stopPreview?.(); setIsSoundsVisible(false); }} selectedSound={selectedSound} onSelectSound={handleSelectSound} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
 backgroundImage: { flex: 1 },
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 10 },
  headerIcon: { padding: 10 },
  content: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  titleContainer: { alignItems: 'center', paddingHorizontal: 30 },
  taskTitle: { color: 'white', fontSize: 24, fontWeight: '600', textAlign: 'center' },
  statusIndicatorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  statusIndicatorIcon: { fontSize: 14, color: '#E5E7EB', marginRight: 10 },
  statusIndicatorText: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  controlsContainer: { width: '100%', alignItems: 'center' },
  modeSelectorSection: { height: 100, justifyContent: 'center', paddingBottom: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
  modeScrollContent: { paddingHorizontal: 15, alignItems: 'center' },
  modeCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: 15, alignItems: 'center', justifyContent: 'center', width: 110, height: 80, marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent' },
  modeCardActive: { backgroundColor: 'rgba(52, 211, 153, 0.2)', borderColor: '#34D399' },
  modeCardTitle: { color: '#9CA3AF', fontSize: 15, fontWeight: '600', marginTop: 8 },
  modeCardTitleActive: { color: 'white' },
  addModeCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: 80, height: 80, marginHorizontal: 5, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.2)', borderStyle: 'dashed' },
  activeIndicator: { position: 'absolute', top: 0, borderRadius: 16, borderWidth: 2 },
  // ✅ NEW: Style to visually indicate that the settings are disabled.
  disabledOverlay: {
    opacity: 0.5,
  }});