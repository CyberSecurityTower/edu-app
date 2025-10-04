import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import AnimatedGradientButton from "./AnimatedGradientButton";

// لاحظ أننا أزلنا تعريف const { height } من هنا

export default function App() {
  // نعرف الطول والعرض هنا داخل المكون
  const { height } = useWindowDimensions();

  // 1. نُعرّف النمط الديناميكي هنا بالداخل
  const dynamicImageStyle = {
    height: height * 0.55,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.mainContainer}>
        <View style={styles.upperContainer}>
          <Image
            source={require("../assets/images/tst.png")}
            style={[styles.imageStyle, dynamicImageStyle]}
          />
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>
              Transform your lectures into superwors
            </Text>
            <Text style={styles.subtitleText}>
              Summarize lessons, create quizzes, and generate flashcards with a single click.
            </Text>
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <View style={styles.indicatorContainer}>
            <View style={[styles.indicator, { backgroundColor: "#10B981", borderColor: "#10B981" }]} />
            <View style={styles.indicator} />
            <View style={styles.indicator} />
          </View>

          <AnimatedGradientButton
            text="Next"
            onPress={() => Alert.alert("Next pressed")}
            withGlow={true}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0C0F27",
  },
  mainContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  upperContainer: {
    alignItems: 'center',
    marginTop: "16%",
  },
  bottomContainer: {
    marginBottom: '25%',
  },
  imageStyle: {
    width: "100%",
    resizeMode: "contain",
    borderWidth:1
  },
  textContainer: {
    alignItems: "center",
  },
  titleText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 28,
    paddingBottom: 15,
  },
  subtitleText: {
    color: "#a7adb8ff",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '90%',
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 45,
    marginTop:25
  },
  indicator: {
    width: 12,
    height: 12,
    borderColor: "#4B5563",
    borderWidth: 2,
    borderRadius: 6,
    marginHorizontal: 8,
  },
});