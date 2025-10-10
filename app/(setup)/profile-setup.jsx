
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { useRouter } from 'expo-router';
import { getEducationalPaths, updateUserProfile } from '../../services/firestoreService';
import { useAppState } from '../_layout';

const ProfileSetupScreen = () => {
  
  const router = useRouter(); // 2. Initialize the router
  const { user, setUser } = useAppState(); // Get user and setUser from context
  const [paths, setPaths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown states
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchPaths = async () => {
      const availablePaths = await getEducationalPaths();
      setPaths(availablePaths);

      // Format data for the DropDownPicker
      const formattedItems = availablePaths.map(path => ({
        label: path.displayName, // The text shown to the user
        value: path.id           // The unique ID we will save
      }));
      setItems(formattedItems);

      setIsLoading(false);
    };

    fetchPaths();
  }, []);

  const handleSaveProfile = async () => {
    if (!selectedValue) {
      alert("Please select your educational path.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedData = {
        selectedPathId: selectedValue,
        profileStatus: 'completed'
      };
      await updateUserProfile(user.uid, updatedData);
      
      // IMPORTANT: Update the user state in the context
      setUser(prevUser => ({ ...prevUser, ...updatedData }));

    } catch (error) {
      console.error("Error saving profile:", error);
      alert("An error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Let's Personalize Your Journey</Text>
        <Text style={styles.subtitle}>
          This helps us tailor the content just for you.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Select Your Educational Path</Text>
            <DropDownPicker
              open={open}
              value={selectedValue}
              items={items}
              setOpen={setOpen}
              setValue={setSelectedValue}
              setItems={setItems}
              theme="DARK"
              placeholder="Choose your path..."
              listMode="MODAL"
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              textStyle={styles.dropdownText}
              containerStyle={{ zIndex: 1000 }} // Important for visibility
            />
            
            {/* We can add other pickers for language here later */}
          </View>
        )}

        <View style={styles.buttonContainer}>
          {isSaving ? (
            <ActivityIndicator size="large" color="#10B981" />
          ) : (
            <AnimatedGradientButton
              text="Save & Continue"
              onPress={handleSaveProfile}
              buttonWidth={250}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0C0F27' },
  container: { flexGrow: 1, padding: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#a7adb8ff', marginBottom: 60, textAlign: 'center', maxWidth: '90%' },
  form: { width: '100%', flex: 1 },
  label: { fontSize: 16, color: '#a7adb8ff', marginBottom: 10, marginLeft: 5 },
  dropdown: { backgroundColor: '#1E293B', borderColor: '#334155' },
  dropdownPlaceholder: { color: '#8A94A4' },
  dropdownText: { color: 'white' },
  buttonContainer: { flex: 1, justifyContent: 'flex-end', paddingBottom: 20 },
});

export default ProfileSetupScreen;