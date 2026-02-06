// app/components/CustomRefreshLoader.jsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiView } from 'moti';

const CustomRefreshLoader = ({ isRefreshing }) => {
  if (!isRefreshing) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -20, height: 0 }}
      animate={{ opacity: 1, translateY: 0, height: 80 }}
      exit={{ opacity: 0, translateY: -20, height: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.container}
    >
      <View style={styles.loaderContent}>
        <LottieView
          source={require('../assets/images/loading.json')} 
          autoPlay
          loop
          style={styles.lottie}
        />
        <Text style={styles.text}>loading...</Text>
      </View>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  loaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)', // خلفية شبه شفافة
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lottie: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  text: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CustomRefreshLoader;