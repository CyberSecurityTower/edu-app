import { ActivityIndicator, View } from 'react-native';

export default function StartPage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0C0F27' }}>
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}