
// components/ChatFab.jsx
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useChat } from '../context/ChatContext'; 

const ChatFab = ({ onPress }) => {
  const { unreadBotMessages } = useChat(); 

  return (
    <Pressable style={styles.fabContainer} onPress={onPress}>
      <LinearGradient
        colors={['#10B981', '#3B82F6']}
        start={{ x: 0.8, y: 0.2 }}
        end={{ x: 0.2, y: 1.0 }}
        style={styles.gradient}
      >
        <FontAwesome5 name="robot" size={28} color="white" />
      </LinearGradient>

      {/* ✅ الدائرة الحمراء بنفس تصميم جرس الإشعارات */}
      {unreadBotMessages > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadBotMessages > 9 ? '9+' : unreadBotMessages}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    width: 65,  // حجم مناسب للزر العائم
    height: 65,
    borderRadius: 35,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // لا نضع overflow: hidden هنا لكي تظهر الدائرة الحمراء فوق الحواف
  },
  gradient: {
    flex: 1,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 🔥 ستايل الدائرة الحمراء (مطابق لجرس الإشعارات)
  badge: {
    position: 'absolute',
    top: 0,                // وضعناها على الحافة تماماً
    right: 0,              // وضعناها على الحافة تماماً
    backgroundColor: '#EF4444', // اللون الأحمر الجذاب
    minWidth: 22,          // عرض مناسب
    height: 22,            // ارتفاع مناسب
    borderRadius: 11,      // نصف الارتفاع لتكون دائرية
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,        // سمك الحدود
    borderColor: '#0F172A', // ⚠️ لون خلفية التطبيق (ليعطي تأثير القص)
    zIndex: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,          // خط صغير وواضح
    fontWeight: '800',     // خط عريض جداً
    textAlign: 'center',
    paddingHorizontal: 2,
  }
});

export default ChatFab;