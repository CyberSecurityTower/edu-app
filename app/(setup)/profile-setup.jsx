
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';
import { useRouter } from 'expo-router';
import { getEducationalPaths, updateUserProfile } from '../../services/firestoreService';
import { useAppState } from '../_layout';
import { FontAwesome5 } from '@expo/vector-icons';

// --- New Gender Selector Component ---
const GenderSelector = ({ selectedGender, onSelect }) => {
  return (
    <View style={styles.genderContainer}>
      <Pressable
        style={[styles.genderButton, selectedGender === 'male' && styles.maleSelected]}
        onPress={() => onSelect('male')}
      >
        <FontAwesome5 name="mars" size={24} color={selectedGender === 'male' ? 'white' : '#90b8f8'} />
        <Text style={[styles.genderText, selectedGender === 'male' && { color: 'white' }]}>Male</Text>
      </Pressable>
      <Pressable
        style={[styles.genderButton, selectedGender === 'female' && styles.femaleSelected]}
        onPress={() => onSelect('female')}
      >
        <FontAwesome5 name="venus" size={24} color={selectedGender === 'female' ? 'white' : '#f890c8'} />
        <Text style={[styles.genderText, selectedGender === 'female' && { color: 'white' }]}>Female</Text>
      </Pressable>
    </View>
  );
};

const ProfileSetupScreen = () => {
  const router = useRouter();
  const { user, setUser } = useAppState();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- New States for new inputs ---
  const [selectedGender, setSelectedGender] = useState(null);
  
  // States for Path Dropdown
  const [pathOpen, setPathOpen] = useState(false);
  const [pathValue, setPathValue] = useState(null);
  const [pathItems, setPathItems] = useState([]);

  // States for Language Dropdown
  const [langOpen, setLangOpen] = useState(false);
  const [langValue, setLangValue] = useState('en'); // Default to English
  const [langItems, setLangItems] = useState([
    { label: 'English', value: 'en' },
    { label: 'العربية', value: 'ar' },
    { label: 'Français', value: 'fr' },
  ]);

  useEffect(() => {
    const fetchPaths = async () => {
      const availablePaths = await getEducationalPaths();
      const formattedItems = availablePaths.map(path => ({
        label: path.displayName,
        value: path.id
      }));
      setPathItems(formattedItems);
      setIsLoading(false);
    };
    fetchPaths();
  }, []);

  const handleSaveProfile = async () => {
    if (!pathValue || !selectedGender) {
      alert("Please complete all fields.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedData = {
        selectedPathId: pathValue,
        gender: selectedGender,
        preferredLanguage: langValue,
        profileStatus: 'completed'
      };
      await updateUserProfile(user.uid, updatedData);
      
      setUser(prevUser => ({ ...prevUser, ...updatedData }));
      router.replace('/'); 
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("An error occurred while saving. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
        <Text style={styles.title}>Let's Personalize Your Journey</Text>
        <Text style={styles.subtitle}>This helps us tailor the content just for you.</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Select Your Educational Path</Text>
            <DropDownPicker
              open={pathOpen}
              value={pathValue}
              items={pathItems}
              setOpen={setPathOpen}
              setValue={setPathValue}
              setItems={setPathItems}
              theme="DARK"
              placeholder="Choose your path..."
              listMode="MODAL"
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              textStyle={styles.dropdownText}
              zIndex={3000}
            />
            
            <Text style={styles.label}>Preferred App Language</Text>
            <DropDownPicker
              open={langOpen}
              value={langValue}
              items={langItems}
              setOpen={setLangOpen}
              setValue={setLangValue}
              setItems={setLangItems}
              theme="DARK"
              listMode="SCROLLVIEW"
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              textStyle={styles.dropdownText}
              zIndex={2000}
            />

            <Text style={styles.label}>Gender</Text>
            <GenderSelector selectedGender={selectedGender} onSelect={setSelectedGender} />
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

// --- Updated Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0C0F27' },
  container: { flexGrow: 1, padding: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#a7adb8ff', marginBottom: 40, textAlign: 'center', maxWidth: '90%' },
  form: { width: '100%', flex: 1 },
  label: { fontSize: 16, color: '#a7adb8ff', marginBottom: 10, marginLeft: 5, marginTop: 20 },
  dropdown: { backgroundColor: '#1E293B', borderColor: '#334155' },
  dropdownPlaceholder: { color: '#8A94A4' },
  dropdownText: { color: 'white' },
  buttonContainer: { flex: 1, justifyContent: 'flex-end', paddingBottom: 20, marginTop: 40 },
  
  // Gender Selector Styles
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    marginHorizontal: 5,
  },
  genderText: {
    color: '#a7adb8ff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  maleSelected: {
    backgroundColor: '#3b82f6', // Blue
    borderColor: '#60a5fa',
  },
  femaleSelected: {
    backgroundColor: '#ec4899', // Pink
    borderColor: '#f472b6',
  },
});

export default ProfileSetupScreen;