import { useRef, useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import AnimatedGradientButton from "./AnimatedGradientButton";
const OnboardingPage = ({ width, imageSource, title, subtitle, customStyles = {}, backgroundColor }) => (
  <View style={[styles.page, { width, backgroundColor }]}>
    <View style={[styles.topSpacer, customStyles.topSpacer]} />
    <Image
      source={imageSource}
      style={[styles.imageStyle, customStyles.imageStyle]}
    />
    <View style={[styles.textContainer, customStyles.textContainer]}>
      <Text style={[styles.titleText, customStyles.titleText]}>
        {title}
      </Text>
      <Text style={[styles.subtitleText, customStyles.subtitleText]}>
        {subtitle}
      </Text>
    </View>
    <View style={[styles.bottomSpacer, customStyles.bottomSpacer]} />
  </View>
);

export default function OnboardingScreen({ onComplete }) {
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event) => {
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(pageIndex);
  };

  const handleNext = () => {
    if (activeIndex < 2) {
      scrollViewRef.current?.scrollTo({ x: width * (activeIndex + 1), animated: true });
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      scrollViewRef.current?.scrollTo({ x: width * (activeIndex - 1), animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <OnboardingPage
          width={width}
          backgroundColor={"#0C0F27"}
          imageSource={require("../assets/images/info1.png")}
          title={"Turn your boring lectures into fun activities"}
          subtitle={"Summarize lessons, create quizzes, access to digital library, and generate flashcards with a single click."}
          customStyles={{
            imageStyle: { flex: 3 },
            textContainer: { flex: 1.8, paddingTop: '2%' }
          }}
        />
        <OnboardingPage
          width={width}
          backgroundColor={"#0F151F"}
          imageSource={require("../assets/images/info2.png")}
          title={"Study smarter,\not harder"}
          subtitle={"Our intelligent system helps you focus on what truly matters, saving you hours of manual work."}
          customStyles={{
            imageStyle: { flex: 3.3 },
            textContainer: { flex: 2.2 }
          }}
        />
        <OnboardingPage
          width={width}
          backgroundColor={"#030816ff"}
          imageSource={require("../assets/images/info3.png")}
          title={"Start your free\ntrial now"}
          subtitle={"Get full access. No credit card required.\n Unlock your full potential."}
          customStyles={{
            imageStyle: { flex: 4 },
            textContainer: { flex: 2 }
          }}
        />
        
      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.indicatorContainer}>
          <View style={[styles.indicator, activeIndex === 0 && styles.activeIndicator]} />
          <View style={[styles.indicator, activeIndex === 1 && styles.activeIndicator]} />
          <View style={[styles.indicator, activeIndex === 2 && styles.activeIndicator]} />
        </View>

        {activeIndex === 0 && (
          <AnimatedGradientButton
            text="Next"
            onPress={handleNext}
            buttonWidth={width * 0.8}
          />
        )}

        {activeIndex === 1 && (
          <View style={styles.buttonGroup}>
            <Pressable style={[styles.previousButton, { width: width * 0.35 }]} onPress={handlePrevious}>
              <Text style={styles.previousButtonText}>Previous</Text>
            </Pressable>
            <AnimatedGradientButton
              text="Next"
              onPress={handleNext}
              buttonWidth={width * 0.5}
              buttonHeight={55}
            />
          </View>
        )}

        {activeIndex === 2 && (
          <AnimatedGradientButton
            text="Get Started"
            onPress={handleNext}
            buttonWidth={width * 0.8}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  topSpacer: {
    flex: 0.5,
  },
  imageStyle: {
    width: "100%",
    flex: 2,
    resizeMode: "contain",
  },
  textContainer: {
    flex: 2,
    alignItems: "center",
    justifyContent: 'flex-start',
    paddingTop: '5%',
  },
  bottomSpacer: {
    flex: 1,
  },
  titleText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 30,
    paddingBottom: 20,
  },
  subtitleText: {
    color: "#a7adb8ff",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '95%',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
    paddingHorizontal: 20,
    paddingBottom: '10%',
    justifyContent: 'flex-end',
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "12%",
  },
  indicator: {
    width: 12,
    height: 12,
    borderColor: "#4B5563",
    borderWidth: 2,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  activeIndicator: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  previousButton: {
    height: 58,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  previousButtonText: {
    color: '#a7adb8ff',
    fontWeight: 'bold',
    fontSize: 18,
  }
});