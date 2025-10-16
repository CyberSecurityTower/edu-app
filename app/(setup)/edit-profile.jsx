import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../_layout';
import { useRouter } from 'expo-router';
import { updateUserProfile } from '../../services/firestoreService';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5 } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [placeOfBirth, setPlaceOfBirth] = useState(user?.placeOfBirth || '');
  
  // Date handling
  const [date, setDate] = useState(user?.dateOfBirth ? new Date(user.dateOfBirth) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Validation Error", "First name and last name cannot be empty.");
      return;
    }
    
    setIsSaving(true);
    try {
      const updatedData = {
        firstName,
        lastName,
        placeOfBirth,
        dateOfBirth: date.toISOString(), // Store date in a standard format
      };

      await updateUserProfile(user.uid, updatedData);
      
      // IMPORTANT: Update the global state so the changes reflect everywhere
      setUser(prevUser => ({ ...prevUser, ...updatedData }));
      
      Alert.alert("Success", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Could not update your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={22} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            placeholderTextColor="#8A94A4"
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
            placeholderTextColor="#8A94A4"
          />

          <Text style={styles.label}>Date of Birth</Text>
          <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: 'white' }}>{date.toLocaleDateString()}</Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              textColor='white' // For iOS
            />
          )}

          <Text style={styles.label}>Place of Birth</Text>
          <TextInput
            style={styles.input}
            value={placeOfBirth}
            onChangeText={setPlaceOfBirth}
            placeholder="e.g., Algiers"
            placeholderTextColor="#8A94A4"
          />
        </View>

        <View style={styles.buttonContainer}>
          <AnimatedGradientButton
            text={isSaving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            buttonWidth={250}
            disabled={isSaving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0C0F27' },
    scrollContent: { padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    backButton: { padding: 5 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    form: { marginBottom: 40 },
    label: { color: '#a7adb8ff', fontSize: 16, marginBottom: 10, marginLeft: 5 },
    input: { backgroundColor: '#1E293B', color: 'white', paddingHorizontal: 15, paddingVertical: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
    buttonContainer: { alignItems: 'center' },
});