  import { View, Text, StyleSheet } from 'react-native';
    
    export default function SearchScreen() {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Search Screen</Text>
        </View>
      );
    }
    
    const styles = StyleSheet.create({
      container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
      text: { color: 'white', fontSize: 24 }
    });