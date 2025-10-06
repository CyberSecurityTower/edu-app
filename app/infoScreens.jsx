import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRef, useState } from "react";
import AnimatedGradientButton from "./AnimatedGradientButton"; // تأكد من أن المسار صحيح

// =======================================================
// 1. تعريف محتوى كل شاشة كمكونات داخلية منفصلة
// =======================================================

const Screen1 = ({ width }) => (
  <View style={[styles.page, { width }]}>
    <View style={styles.upperContainer}>
      <Image
        source={require("../assets/images/info1.png")}
        style={styles.imageStyle}
      />
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>
          Turn your boring lectures into fun activities
        </Text>
        <Text style={styles.subtitleText}>
          Summarize lessons, create quizzes, access to digital library, and generate flashcards with a single click.
        </Text>
      </View>
    </View>
  </View>
);

const Screen2 = ({ width }) => (
  <View style={[styles.page, { width }]}>
    <View style={styles.upperContainer}>
      <Image
        source={require("../assets/images/info2.png")}
        style={styles.imageStyle}
      />
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>
          Study smarter,{'\n'}not harder
        </Text>
        <Text style={styles.subtitleText}>
          Our intelligent system helps you focus on what truly matters, saving you hours of manual work.
        </Text>
      </View>
    </View>
  </View>
);

// قمت بتصميم الشاشة الثالثة بناءً على نفس النمط
const Screen3 = ({ width }) => (
  <View style={[styles.page, { width }]}>
    <View style={styles.upperContainer}>
      <Image
        source={require("../assets/images/info1.png")} // ستحتاج لإضافة صورة ثالثة
        style={styles.imageStyle}
      />
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>
          Start your free{'\n'}trial now
        </Text>
        <Text style={styles.subtitleText}>
          Get 3 days of full access. No credit card required. Unlock your full potential.
        </Text>
      </View>
    </View>
  </View>
);


// =======================================================
// 2. المكون الرئيسي الذي يجمع كل شيء
// =======================================================

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
      // هذه هي الدالة التي ستنتقل بالمستخدم إلى شاشة إنشاء الحساب
      // onComplete(); 
      alert("Navigate to Create Account Screen");
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
        <Screen1 width={width} />
        <Screen2 width={width} />
        <Screen3 width={width} />
      </ScrollView>

      {/* ======================================================= */}
      {/* 3. منطقة الأزرار والمؤشرات أصبحت الآن ديناميكية */}
      {/* ======================================================= */}
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

// =======================================================
// 4. الأنماط الموحدة لجميع الشاشات
// =======================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0C0F27",
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
  },
  upperContainer: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '5%',
  },
  imageStyle: {
    width: "101%",
    height: "35%",
    resizeMode: "contain",
    marginTop:"-20%"
  },
  textContainer: {
    alignItems: "center",
  },
  titleText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 28,
    paddingBottom: 20,
    marginTop:"10%"
  },
  subtitleText: {
    color: "#a7adb8ff",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '90%',
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