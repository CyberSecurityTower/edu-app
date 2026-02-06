
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ImageBackground, ActivityIndicator, Dimensions, Text } from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');
// ✅ حساب العرض بدقة (عرض الشاشة - 40 بكسل للهوامش الجانبية)
const CARD_WIDTH = width - 40; 
const VIDEO_HEIGHT = 220;

const YouTubeEmbed = ({ videoId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const onStateChange = useCallback((state) => {
    if (state === "ended") {
      setIsPlaying(false);
    }
  }, []);

  return (
    // ✅ الحاوية الرئيسية: أبعاد ثابتة ومحاذاة ذاتية للمركز
    <View style={styles.container}>
      <View style={styles.cardWrapper}>
        {isPlaying ? (
          <View style={styles.playerContainer}>
            <YoutubePlayer
              height={VIDEO_HEIGHT}
              width={CARD_WIDTH}
              play={true}
              videoId={videoId}
              onChangeState={onStateChange}
              onReady={() => setLoading(false)}
              initialPlayerParams={{
                controls: true,
                modestbranding: true,
                rel: false,
              }}
              webViewProps={{
                androidLayerType: 'hardware',
                opacity: 0.99,
              }}
            />
            {loading && (
               <View style={styles.loadingOverlay}>
                  <ActivityIndicator color="#38BDF8" size="large" />
               </View>
            )}
          </View>
        ) : (
          <Pressable 
            onPress={() => setIsPlaying(true)} 
            style={styles.thumbnailContainer}
          >
            <ImageBackground 
              source={{ uri: thumbnailUrl }} 
              style={styles.thumbnail}
              imageStyle={{ borderRadius: 16 }}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
                style={styles.gradient}
              >
                <View style={styles.hdBadge}>
                  <Text style={styles.hdText}>HD</Text>
                </View>

                <MotiView
                  from={{ scale: 1 }}
                  animate={{ scale: 1.1 }}
                  transition={{
                    type: 'timing',
                    duration: 1000,
                    loop: true,
                    repeatReverse: true,
                  }}
                  style={styles.playButtonWrapper}
                >
                  <View style={styles.playButtonGlass}>
                    <FontAwesome5 name="play" size={28} color="white" style={{ marginLeft: 4 }} />
                  </View>
                </MotiView>

                <View style={styles.footerInfo}>
                  <Text style={styles.watchText}>مشاهدة الشرح</Text>
                  <MaterialIcons name="touch-app" size={16} color="#38BDF8" />
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: VIDEO_HEIGHT,
    alignSelf: 'center', // ✅ يضمن التوسط بغض النظر عن اتجاه الأب
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    backgroundColor: 'transparent', // لا خلفية للحاوية الخارجية
  },
  cardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000', // ✅ خلفية سوداء تمنع الوميض الأبيض
    width: CARD_WIDTH,
    height: VIDEO_HEIGHT,
    elevation: 5, // ظل خفيف
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  thumbnailContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  playButtonWrapper: {
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  playButtonGlass: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  hdBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  hdText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footerInfo: {
    position: 'absolute',
    bottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  watchText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10
  }
});

export default YouTubeEmbed;