import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* We are explicitly telling the router that these screens belong to this stack */}
      <Stack.Screen name="subject-details" />
      <Stack.Screen name="lesson-view" />
    </Stack>
  );
}