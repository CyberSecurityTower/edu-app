import { Stack } from 'expo-router';
      
      export default function SetupLayout() {
        return (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="profile-setup" />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          </Stack>
        );
      }