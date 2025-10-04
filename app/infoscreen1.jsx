import { Alert, Image, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import AnimatedGradientButton from "./AnimatedGradientButton";


export default function InfoScreen1() {
  const { width } = useWindowDimensions(); 

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        
        <View style={styles.upperContainer}>
          <Image
            source={require("../assets/images/tst.png")} 
            style={styles.imageStyle}
          />
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>
              Turn your boring lectures into fun activities
            </Text>
            <Text style={styles.subtitleText}>
              Summarize lessons, create quizzes, access to degital library, and generate flashcards with a single click.
            </Text>
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <View style={styles.indicatorContainer}>
            <View style={[styles.indicator, styles.activeIndicator]} /> 
            <View style={styles.indicator} />
            <View style={styles.indicator} />
          </View>

          <AnimatedGradientButton
            text="Next"
            onPress={() => Alert.alert("Next pressed")}
            buttonWidth={width * 0.7}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0C0F27",
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  upperContainer: {
    flex: 3, 
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '16%', 
  },
  imageStyle: {
    width: "100%",
    height: "75%", 
    resizeMode: "contain",
  },
  bottomContainer: {
    flex: 1, 
    justifyContent: 'flex-end',
    paddingBottom: '10%',
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
    marginTop:-10
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
    marginBottom: "12%",
  },
  indicator: {
    width: 12,
    height: 12,
    borderColor: "#4B5563",
    borderWidth: 2,
    borderRadius: 6,
    marginHorizontal: 8,
    backgroundColor: "transparent",
  },
  activeIndicator: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  }
});