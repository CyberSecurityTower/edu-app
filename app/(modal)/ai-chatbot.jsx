   // app/(modal)/ai-chatbot.jsx
    import { View, Text, StyleSheet, Pressable } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { useRouter } from 'expo-router';
    import { FontAwesome5 } from '@expo/vector-icons';

    export default function AiChatbotScreen() {
      const router = useRouter();

      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Pressable onPress={() => router.back()} style={styles.closeButton}>
              <FontAwesome5 name="times" size={24} color="#a7adb8ff" />
            </Pressable>
          </View>
          <View style={styles.content}>
            <FontAwesome5 name="robot" size={80} color="#1E293B" />
            <Text style={styles.placeholderText}>The AI Chatbot interface will be built here.</Text>
            <Text style={styles.placeholderSubtext}>You can start asking questions and getting smart summaries soon!</Text>
          </View>
        </SafeAreaView>
      );
    }

    const styles = StyleSheet.create({
      container: { flex: 1, backgroundColor: '#0C0F27' },
      header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
      headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
      closeButton: { padding: 5 },
      content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
      placeholderText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 30, textAlign: 'center' },
      placeholderSubtext: { color: '#a7adb8ff', fontSize: 16, marginTop: 10, textAlign: 'center', maxWidth: '80%' },
    });