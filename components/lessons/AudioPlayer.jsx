
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const AudioPlayer = ({ source, title }) => {
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePlay() {
    if (isLoading) return;
    
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      setIsLoading(true);
      try {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: source });
        setSound(newSound);
        await newSound.playAsync();
        setIsPlaying(true);
      } catch (e) {
        console.log("Audio Error", e);
      } finally {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <LinearGradient colors={['#334155', '#1E293B']} style={styles.container}>
      <Pressable onPress={handlePlay} style={styles.btn}>
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <FontAwesome5 name={isPlaying ? "pause" : "play"} size={16} color="white" />
        )}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title || "مقطع صوتي"}</Text>
        <View style={styles.bar}><View style={[styles.progress, { width: isPlaying ? '60%' : '0%' }]} /></View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginVertical: 10, borderWidth: 1, borderColor: '#475569' },
  btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 6 },
  bar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: '#38BDF8' }
});