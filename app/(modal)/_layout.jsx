// app/(modal)/_layout.jsx
import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      {/* The chatbot is now the entry point for this stack */}
      <Stack.Screen name="ai-chatbot" />
      <Stack.Screen name="chat-history" />
    </Stack>
  );
}