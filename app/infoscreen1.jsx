import { Alert, Image, SafeAreaView, StyleSheet, Text, View } from "react-native";
import AnimatedGradientButton from "./AnimatedGradientButton"; 
import { useWindowDimensions } from "react-native";


export default function App() {
const { width } = useWindowDimensions(); 
  // ملاحظة: قمنا بتطبيق خاصية flex لتقسيم الشاشة بدلاً من استخدام useWindowDimensions
  // هذا يجعل التخطيط (Layout) أكثر استقراراً وأسهل في التحكم

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        
        {/* القسم العلوي: الصورة والنصوص - يأخذ 3/4 من الشاشة */}
        <View style={styles.upperContainer}>
          <Image
            // تأكد من تحديث المسار الصحيح للصورة في مشروعك 
            source={require("../assets/images/tst.png")} 
            style={styles.imageStyle}
          />
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>
              {/* تصحيح الكلمة الإنجليزية "superpowers" */}
              Turn your boring lectures into fun activities
            </Text>
            <Text style={styles.subtitleText}>
              Summarize lessons, create quizzes, access to degital library, and generate flashcards with a single click.
            </Text>
          </View>
        </View>

        {/* القسم السفلي: مؤشرات الصفحة والزر - يأخذ 1/4 من الشاشة */}
        <View style={styles.bottomContainer}>
          <View style={styles.indicatorContainer}>
            {/* الألوان تم تجميعها هنا: الأول نشط والبقية غير نشطة */}
            <View style={[styles.indicator, styles.activeIndicator]} /> 
            <View style={styles.indicator} />
            <View style={styles.indicator} />
          </View>

 <AnimatedGradientButton
      text="Next"
      onPress={() => Alert.alert("Next pressed")}
      withGlow={true}
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
    backgroundColor: "#0C0F27", // لون الخلفية الداكن
  },
  mainContainer: {
    flex: 1, // يستخدم كل المساحة المتاحة
    paddingHorizontal: 20, // حواف جانبية
  },
  
  // =======================================================
  // التعديلات الرئيسية هنا: استخدام Flexbox لتقسيم الشاشة
  // =======================================================

  upperContainer: {
    flex: 3, // نخصص 75% من المساحة (3 أجزاء) للصورة والنص
    alignItems: 'center',
    justifyContent: 'flex-start', // بدء المحتوى من الأعلى
    paddingTop: '16%', // لتعويض شريط الحالة (Status Bar)
    // لا نحتاج لـ marginTop هنا لأننا استخدمنا paddingTop
  },
  imageStyle: {
    width: "100%",
    height: "75%", 
    resizeMode: "contain",
  },

  bottomContainer: {
    flex: 1, // نخصص 25% من المساحة (1 جزء) للمؤشرات والزر
    justifyContent: 'flex-end', // دفع المحتوى (الأزرار) إلى الأسفل
    paddingBottom: '10%', // لإعطاء مسافة جميلة أسفل الزر
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
    marginBottom: "12%", // قللنا المسافة قليلاً
  },
  indicator: {
    width: 12,
    height: 12,
    borderColor: "#4B5563",
    borderWidth: 2,
    borderRadius: 6,
    marginHorizontal: 8,
    backgroundColor: "transparent", // اللون الافتراضي شفاف
  },
  activeIndicator: {
    backgroundColor: "#10B981", // اللون الأخضر للمؤشر النشط
    borderColor: "#10B981",
  }
});