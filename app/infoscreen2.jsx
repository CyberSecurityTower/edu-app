import { Alert, Image, SafeAreaView, StyleSheet, Text, View, useWindowDimensions, Pressable } from "react-native";
// استوردنا المكون الذي بنيته
import AnimatedGradientButton from "./AnimatedGradientButton"; 

// قم بتغيير اسم المكون لتجنب التكرار في React Native
export default function InfoScreen2() {
  const { width } = useWindowDimensions();

  // دوال التنقل الوهمية
  const handlePrevious = () => Alert.alert("Previous pressed");
  const handleNext = () => Alert.alert("Next pressed");

  return (
    <SafeAreaView style={styles.safeArea} >
      <View style={styles.mainContainer}>

        <View style={styles.upperContainer}>
          <Image
            // تأكد من تحديث المسار الصحيح للصورة في مشروعك 
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
          {/* مؤشرات الصفحة */}
          <View style={styles.indicatorContainer}>
            <View style={styles.indicator} />
            <View style={[styles.indicator, styles.activeIndicator]} />
            <View style={styles.indicator} />
          </View>

          {/* أزرار التنقل - الآن مهيكلة بشكل احترافي */}
          <View style={styles.buttonGroup}>
            {/* زر Previous - أصبح زر حافة (Outline Button) */}
            <Pressable style={[styles.previousButton, {width: width * 0.35}]} onPress={handlePrevious}>
                <Text style={styles.previousButtonText}>Previous</Text>
            </Pressable>

            {/* زر Next - يستخدم المكون الرئيسي AnimatedGradientButton */}
            <AnimatedGradientButton
              text="Next"
              onPress={handleNext}
              buttonWidth={width * 0.5} // نخصص مساحة أكبر للزر الأساسي
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
    backgroundColor: "#0F151F", // *تم توحيد اللون مع الشاشة الأولى*
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
    height: "75%", // زيادة الارتفاع لملء الشاشة بشكل أفضل
    resizeMode: "contain",
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: '15%',
  },
  textContainer: {
    alignItems: "center",
  },
  titleText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 34, // تم تصغير الخط قليلاً ليتناسب مع سطرين
    paddingBottom: 20,
    marginTop: "-15%",
  },
  subtitleText: {
    color: "#a7adb8ff",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '80%',
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
  },
  // =======================================================
  // الأنماط الجديدة لمجموعة الأزرار والتناسق
  // =======================================================
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between', // وضع زر في اليمين وآخر في اليسار
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  previousButton: {
    height: 50, // نفس ارتفاع الزر المتدرج تقريباً
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4B5563', // حافة باللون الداكن المناسب للخلفية
  },
  previousButtonText: {
    color: '#a7adb8ff', // لون نص هادئ
    fontWeight: 'bold',
    fontSize: 18,
  }
});