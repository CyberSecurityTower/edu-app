import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A memoized mini circular progress component that can display an icon in the center.
 * @param {object} props
 * @param {number} [props.progress=0] - The progress value from 0 to 1.
 * @param {number} [props.size=40] - The width and height of the SVG container.
 * @param {number} [props.strokeWidth=3.5] - The width of the progress stroke.
 * @param {string} [props.backgroundColor="#3F3F46"] - The color of the background circle.
 * @param {string} [props.progressColor="#34D399"] - The color of the progress circle.
 * @param {number} [props.animationDuration=600] - The duration of the progress animation in ms.
 * @param {string} [props.iconName] - The name of the FontAwesome5 icon to display.
 * @param {number} [props.iconSize=16] - The size of the icon.
 * @param {string} [props.iconColor] - The color of the icon.
 */
const MiniCircularProgress = ({
  progress = 0,
  size = 40,
  strokeWidth = 3.5,
  backgroundColor = "#3F3F46",
  progressColor = "#34D399",
  animationDuration = 600,
  iconName,
  iconSize = 16,
  iconColor,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    const validProgress = typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : 0;
    animatedProgress.value = withTiming(validProgress, { duration: animationDuration });
  }, [progress, animationDuration, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {iconName && (
        <View style={StyleSheet.absoluteFill}>
          <FontAwesome5 name={iconName} size={iconSize} color={iconColor || progressColor} style={styles.icon} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  icon: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

export default React.memo(MiniCircularProgress);