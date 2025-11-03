// components/timer/SoundsModal.jsx
import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { audioService } from '../../services/audioService';

// قائمة الأصوات — لا يوجد ملف لصوت "complete-silence"
const SOUND_OPTIONS = [
  { id: 'quiet-rain', name: 'Quiet Rain', icon: 'cloud-rain' },
  { id: 'busy-cafe', name: 'Busy Cafe', icon: 'coffee' },
  { id: 'complete-silence', name: 'Mute (Complete Silence)', icon: 'volume-mute' },
  { id: 'summer-forest', name: 'Summer Forest', icon: 'tree' },
  { id: 'ocean-waves', name: 'Ocean Waves', icon: 'water' },
  { id: 'fireplace-crackle', name: 'Fireplace Crackle', icon: 'fire-alt' },
];

const SoundsModal = ({ isVisible, onClose, selectedSound, onSelectSound }) => {
  // ✅ لمنع النقر المزدوج السريع
  const lastTapRef = useRef(0);

  // ✅ عند اختيار صوت
  const handleSelect = (soundId) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) return; // تجاهل النقرات المتتالية السريعة
    lastTapRef.current = now;

    onSelectSound(soundId);

    if (soundId === 'complete-silence') {
      // mute mode — لا تشغيل
      audioService.stopPreview();
      return;
    }

    audioService.previewSound(soundId);
  };

  // ✅ عند غلق النافذة
  const handleClose = () => {
    audioService.stopPreview();
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose}>
          <MotiView
            from={{ opacity: 0, scale: 0.8, translateY: 50 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Ambient Focus Sounds</Text>
              <Text style={styles.modalSubtitle}>Our Recommendations For You</Text>

              <View style={styles.soundsGrid}>
                {SOUND_OPTIONS.map((sound) => {
                  const isActive = selectedSound === sound.id;
                  return (
                    <MotiView
                      key={sound.id}
                      style={styles.soundCardContainer}
                      animate={{ scale: isActive ? 1.05 : 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                    >
                      <Pressable
                        style={[
                          styles.soundCard,
                          isActive && styles.soundCardActive,
                        ]}
                        onPress={() => handleSelect(sound.id)}
                      >
                        <FontAwesome5
                          name={sound.icon}
                          size={24}
                          color={isActive ? '#34D399' : '#E5E7EB'}
                        />
                        <Text
                          style={[
                            styles.soundCardText,
                            isActive && styles.soundCardTextActive,
                          ]}
                        >
                          {sound.name}
                        </Text>
                      </Pressable>
                    </MotiView>
                  );
                })}
              </View>
            </View>
          </MotiView>
        </Pressable>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 25,
  },
  soundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  soundCardContainer: {
    width: '48%',
    marginBottom: 15,
  },
  soundCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  soundCardActive: {
    borderColor: '#34D399',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  soundCardText: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  soundCardTextActive: {
    color: '#34D399',
  },
});

export default SoundsModal;
