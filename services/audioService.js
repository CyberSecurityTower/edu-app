
// services/audioService.js
import { Audio } from 'expo-av';

// --- Asset Maps ---

// ✅ For long, looping ambient sounds
const SOUND_ASSETS = {
  'quiet-rain': require('../assets/sounds/quiet-rain.mp3'),
  'busy-cafe': require('../assets/sounds/busy-cafe.mp3'),
  'summer-forest': require('../assets/sounds/summer-forest.mp3'),
  'ocean-waves': require('../assets/sounds/ocean-waves.mp3'),
  'fireplace-crackle': require('../assets/sounds/fireplace-crackle.mp3'),
};

// ✨ NEW: For short, one-off sound effects
// ⚠️ هام: يجب عليك إضافة هذه الملفات الصوتية إلى مجلد assets/sounds
const EFFECT_ASSETS = {
  'start-effect': require('../assets/sounds/start.mp3'), // e.g., a short "swoosh" or "click"
  'end-effect': require('../assets/sounds/end.mp3'),     // e.g., a gentle "ding" or "chime"
};


// --- State Variables ---
let previewSound = null;
let sessionSound = null;
let sessionSoundId = null;

const audioService = {
  /* -------------------- PREVIEW (for SoundsModal) -------------------- */
  async previewSound(id) {
    // Stop any existing preview first
    if (previewSound) {
      await previewSound.unloadAsync();
      previewSound = null;
    }
    if (!id || id === 'complete-silence') return;

    try {
      const asset = SOUND_ASSETS[id];
      if (!asset) return console.warn(`Preview sound for ${id} not found.`);
      
      const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true, isLooping: true });
      previewSound = sound;
    } catch (error) {
      console.error("Error previewing sound:", error);
    }
  },

  async stopPreview() {
    if (previewSound) {
      await previewSound.unloadAsync();
      previewSound = null;
    }
  },

  /* -------------------- SESSION (for the main timer) -------------------- */
  async playSessionSound(id) {
    if (sessionSoundId === id && sessionSound) return; // Already playing
    await this.stopSessionSound(); // Stop any previous session sound
    
    if (!id || id === 'complete-silence') return;

    try {
      const asset = SOUND_ASSETS[id];
      if (!asset) return console.warn(`Session sound for ${id} not found.`);

      const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true, isLooping: true, volume: 0.6 });
      sessionSound = sound;
      sessionSoundId = id;
    } catch (error) {
      console.error("Error playing session sound:", error);
    }
  },

  async pauseSessionSound() {
    if (sessionSound) await sessionSound.pauseAsync();
  },

  async resumeSessionSound() {
    if (sessionSound) await sessionSound.playAsync();
  },

  async stopSessionSound() {
    if (sessionSound) {
      await sessionSound.unloadAsync();
      sessionSound = null;
      sessionSoundId = null;
    }
  },

  /* -------------------- ✨ NEW & FIXED: SOUND EFFECTS -------------------- */
  /**
   * Plays a short, non-looping sound effect.
   * This is a "fire-and-forget" function that cleans up after itself.
   * @param {'start-effect' | 'end-effect'} id The ID of the effect to play.
   */
  async playEffect(id) {
    const asset = EFFECT_ASSETS[id];
    if (!asset) {
      console.warn(`Sound effect with id "${id}" not found.`);
      return;
    }

    try {
      // Create a new sound object just for this effect
      const { sound } = await Audio.Sound.createAsync(
        asset,
        { shouldPlay: true } // Play immediately, don't loop
      );
      
      // IMPORTANT: Set a listener to unload the sound from memory once it finishes.
      // This prevents memory leaks from many sound effects.
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error(`Error playing effect "${id}":`, error);
    }
  },
};

export { audioService };