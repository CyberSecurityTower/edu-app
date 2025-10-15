  import { View, Text, StyleSheet } from 'react-native';
    
    export default function LibraryScreen() {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Library Screen</Text>
        </View>
      );
    }
    
    const styles = StyleSheet.create({
      container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
      text: { color: 'white', fontSize: 24 }
    });