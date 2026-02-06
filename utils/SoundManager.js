import { Audio } from 'expo-av';

const soundObjects = {};

const SOUND_FILES = {
  tick: require('../assets/sounds/tick.mp3'),
  card_flip: require('../assets/sounds/card_flip.mp3'),
  correct_tone: require('../assets/sounds/correct_tone.mp3'),
  error_tone: require('../assets/sounds/error_tone.mp3'),
  victory: require('../assets/sounds/victory_fanfare.mp3'),
  defeat: require('../assets/sounds/mission_failed.mp3'),
  click: require('../assets/sounds/click.mp3'), 
  sword: require('../assets/sounds/sword.mp3'),
  battle: require('../assets/sounds/battle.mp3'),
};

export const SoundManager = {
  // إعداد الصوت للنظام (IOS/Android)
  init: async () => {
    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
    } catch (e) {
        console.log("Audio Init Error", e);
    }
  },

  loadSounds: async () => {
    await SoundManager.init(); // تأكد من إعداد المود
    try {
      const loadPromises = Object.keys(SOUND_FILES).map(async (key) => {
        if (soundObjects[key]) {
             // تفريغ القديم إن وجد لضمان عدم تكرار الحجز في الذاكرة
             try { await soundObjects[key].unloadAsync(); } catch(e){}
        }
        const { sound } = await Audio.Sound.createAsync(SOUND_FILES[key]);
        soundObjects[key] = sound;
      });
      await Promise.all(loadPromises);
    } catch (error) {
      console.log('Error loading sounds', error);
    }
  },

  // 🔥 التعديل الذكي هنا: التحميل عند الطلب (Lazy Loading)
  playSound: async (name) => {
    try {
      let sound = soundObjects[name];

      // 1. إذا لم يكن الصوت موجوداً في الذاكرة، قم بتحميله الآن
      if (!sound) {
        if (SOUND_FILES[name]) {
            // console.log(`Loading sound ${name} on demand...`);
            const { sound: newSound } = await Audio.Sound.createAsync(SOUND_FILES[name]);
            soundObjects[name] = newSound;
            sound = newSound;
        } else {
            console.warn(`Sound file named "${name}" is not defined in SOUND_FILES.`);
            return;
        }
      }

      // 2. تشغيل الصوت
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
          await sound.stopAsync(); // إيقاف أي تشغيل سابق لنفس الصوت
          await sound.setPositionAsync(0);
          await sound.setVolumeAsync(1.0); // ضمان أن الصوت مسموع
          await sound.playAsync();
      } else {
          // محاولة أخيرة لإعادة التحميل إذا كان الكائن موجوداً لكن غير محمل
          await sound.unloadAsync();
          await sound.loadAsync(SOUND_FILES[name]);
          await sound.playAsync();
      }
    } catch (error) {
      console.log(`Error playing sound ${name}`, error);
    }
  },

  stopSound: async (name) => {
    try {
      const sound = soundObjects[name];
      if (sound) {
         const status = await sound.getStatusAsync();
         if (status.isLoaded) {
            await sound.stopAsync();
         }
      }
    } catch (error) {
      // ignore
    }
  },

  stopAllSounds: async () => {
    const stopPromises = Object.values(soundObjects).map(async (sound) => {
        try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
                await sound.stopAsync();
            }
        } catch (error) {}
    });
    await Promise.all(stopPromises);
  },

  unloadSounds: async () => {
    const unloadPromises = Object.values(soundObjects).map(async (sound) => {
        try {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
                await sound.unloadAsync();
            }
        } catch (e) {}
    });
    // تفريغ المصفوفة أيضاً
    for (let key in soundObjects) delete soundObjects[key];
    await Promise.all(unloadPromises);
  }
};