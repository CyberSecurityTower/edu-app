 import React from 'react';
    import { View, Text, StyleSheet, Button } from 'react-native';
    import { auth } from '../../firebase'; // Go up two levels to find firebase.js

    const HomeScreen = () => {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Welcome to EduApp!</Text>
          <Text style={styles.subtitle}>You are logged in.</Text>
          <Button title="Sign Out" onPress={() => auth.signOut()} />
        </View>
      );
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0C0F27',
      },
      title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
      },
      subtitle: {
        fontSize: 18,
        color: '#a7adb8ff',
        marginBottom: 30,
      },
    });

    export default HomeScreen;