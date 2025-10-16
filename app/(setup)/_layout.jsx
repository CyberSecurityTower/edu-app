import { Stack } from 'expo-router';
      
      export default function SetupLayout() {
        return (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="profile-setup" />
            {/* ADD THIS NEW LINE */}
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          </Stack>
        );
      }
    