import { Alert, Image, SafeAreaView, StyleSheet, Text, View, useWindowDimensions, Pressable } from "react-native";
import AnimatedGradientButton from "./AnimatedGradientButton";

export default function InfoScreen2() {
  const { width } = useWindowDimensions();

  const handlePrevious = () => Alert.alert("Previous pressed");
  const handleNext = () => Alert.alert("Next pressed");

  return (
    <SafeAreaView style={styles.safeArea} >
      <View style={styles.mainContainer}>

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

        <View style={styles.bottomContainer}>
          <View style={styles.indicatorContainer}>
            <View style={styles.indicator} />
            <View style={[styles.indicator, styles.activeIndicator]} />
            <View style={styles.indicator} />
          </View>

          <View style={styles.buttonGroup}>
            <Pressable style={[styles.previousButton, {width: width * 0.35}]} onPress={handlePrevious}>
                <Text style={styles.previousButtonText}>Previous</Text>
            </Pressable>

            <AnimatedGradientButton
              text="Next"
              onPress={handleNext}
              buttonWidth={width * 0.5} 
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F151F",
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
    height: "76%", 
    resizeMode: "contain",
    marginBottom: 20,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: '11%',
  },
  textContainer: {
    alignItems: "center",
  },
  titleText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 34,
    paddingBottom: 20,
    marginTop: "-15%",
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
    marginBottom: "16%",
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