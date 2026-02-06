import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat,
  withTiming,
  withSequence
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const ModernFolder = ({ 
  name = "File", 
  count = 0, 
  scale = 1, 
  color = "#38BDF8", 
  isHovered = false, // ✅ الخاصية الجديدة
  isSmart = false 
}) => {
  
  const hoverVal = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isSmart) {
        hoverVal.value = 0;
        return;
    }
    // ✅ أنيميشن التفاعل: يفتح المجلد ويتحرك
    hoverVal.value = withSpring(isHovered ? 1 : 0, { damping: 10, stiffness: 100 });
    
    // ✅ أنيميشن التوهج: ينبض عند التفاعل
    if (isHovered) {
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: 500 }),
                withTiming(0.3, { duration: 500 })
            ),
            -1, 
            true
        );
    } else {
        glowOpacity.value = withTiming(0, { duration: 300 });
    }

  }, [isHovered, isSmart]);

  const frontPlateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotateX: `${hoverVal.value * -25}deg` }, // يفتح بزاوية أكبر
        { translateY: hoverVal.value * 15 }
      ],
    };
  });

  const paperStyle = useAnimatedStyle(() => {
    return {
      transform: [
          { translateY: hoverVal.value * -15 }, // الورق يرتفع للأعلى كأنه يستقبل الملف
          { scale: 1 + (hoverVal.value * 0.05) }
      ]
    };
  });

  // ✅ تأثير الهالة المتوهجة خلف المجلد
  const activeGlowStyle = useAnimatedStyle(() => {
      return {
          opacity: glowOpacity.value,
          transform: [{ scale: 1 + (hoverVal.value * 0.2) }]
      };
  });

  const folderWidth = 90; 
  const folderHeight = 75;

  return (
    <View style={[styles.wrapper, { transform: [{ scale }] }]}>
      
      {/* جسم المجلد */}
      <View style={{ width: folderWidth, height: folderHeight, alignItems: 'center' }}>
        
        {/* ✅ الطبقة الجديدة: التوهج الخلفي الكبير */}
        <Animated.View style={[styles.superGlow, { backgroundColor: color, shadowColor: color }, activeGlowStyle]} />

        {/* الطبقة الخلفية */}
        <View style={[styles.backPlate, { backgroundColor: color, opacity: 0.25 }]} />
        <View style={[styles.backPlateBorder, { borderColor: color, opacity: 0.6 }]} />

        {/* اللسان */}
        <View style={[styles.tab, { backgroundColor: color, opacity: 0.25 }]} />
        <View style={[styles.tabBorder, { borderColor: color, opacity: 0.6 }]} />

        {/* الأوراق */}
        <Animated.View style={[styles.paperStack, paperStyle]}>
          <View style={styles.paper} />
          {count > 0 && <View style={[styles.paper, styles.paper2]} />}
        </Animated.View>

        {/* الطبقة الأمامية */}
        <Animated.View style={[styles.frontPlateWrapper, frontPlateStyle]}>
            <LinearGradient
                colors={[color, adjustColorBrightness(color, -20)]}
                style={styles.frontPlate}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0.4)', 'transparent']}
                    style={styles.glassShine}
                />
            </LinearGradient>
            <View style={[styles.frontPlateBorder, { borderColor: 'rgba(255,255,255,0.4)' }]} />
        </Animated.View>

        {/* شارة العدد */}
        {count > 0 && !isHovered && (
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
            </View>
        )}
      </View>

      <View style={styles.labelContainer}>
        <Text style={[styles.label, isHovered && { color: color, fontWeight: '800' }]} numberOfLines={2}>
            {name}
        </Text>
      </View>

    </View>
  );
};

const adjustColorBrightness = (hex, percent) => hex; 

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 120,
    width: 100,
  },
  
  // ✅ ستايل التوهج الجديد
  superGlow: {
      position: 'absolute',
      width: '100%', height: '100%',
      borderRadius: 20,
      zIndex: -5,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 20,
  },

  backPlate: {
    position: 'absolute', bottom: 0, width: '100%', height: '88%',
    borderTopLeftRadius: 6, borderTopRightRadius: 12,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  backPlateBorder: {
    position: 'absolute', bottom: 0, width: '100%', height: '88%',
    borderWidth: 1.5, borderTopWidth: 0,
    borderTopLeftRadius: 6, borderTopRightRadius: 12,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  tab: {
    position: 'absolute', top: 0, left: 0, width: '45%', height: 16,
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  tabBorder: {
    position: 'absolute', top: 0, left: 0, width: '45%', height: 16,
    borderWidth: 1.5, borderBottomWidth: 0,
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  paperStack: {
    position: 'absolute', top: 10, left: 10, right: 10, bottom: 10,
    alignItems: 'center',
  },
  paper: {
    width: '90%', height: '95%', backgroundColor: '#F8FAFC',
    borderRadius: 6, position: 'absolute', top: 0,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2,
  },
  paper2: {
    top: -4, width: '85%', opacity: 0.6,
  },
  frontPlateWrapper: {
    position: 'absolute', bottom: 0, width: '100%', height: '78%',
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  frontPlate: {
    flex: 1,
    borderTopLeftRadius: 6, borderTopRightRadius: 12,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  glassShine: {
    height: 25, width: '100%', opacity: 0.6,
    borderTopLeftRadius: 6, borderTopRightRadius: 12,
  },
  frontPlateBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderTopLeftRadius: 6, borderTopRightRadius: 12,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  badge: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#EF4444', borderRadius: 12,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 2, borderColor: '#1E293B', zIndex: 20,
    minWidth: 22, alignItems: 'center', justifyContent: 'center'
  },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: 'white' },
  labelContainer: {
    marginTop: 12,
    width: '120%', 
    alignItems: 'center',
  },
  label: {
    color: '#F1F5F9', 
    fontSize: 14, 
    fontWeight: '600', 
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  }
});

export default ModernFolder;