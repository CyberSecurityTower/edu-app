
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import { getEducationalPaths, updateUserProfile } from '../../services/firestoreService';
import { useAppState } from '../_layout';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

const ProfileSetupScreen = () => {
  const { user, setUser } = useAppState();
  const [paths, setPaths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchPaths = async () => {
      setIsLoading(true);
      const availablePaths = await getEducationalPaths();
      const formattedPaths = availablePaths.map(path => ({
        label: path.displayName,
        value: path.id
      }));
      setItems(formattedPaths);
      setIsLoading(false);
    };

    fetchPaths();
  }, []);

  const handleSaveProfile = async () => {
    if (!selectedValue) {
      Alert.alert("Selection Required", "Please select your educational path to continue.");
      return;
    }
    
    setIsSaving(true);
    const dataToUpdate = {
      selectedPathId: selectedValue,
      profileStatus: 'completed'
    };

    const result = await updateUserProfile(user.uid, dataToUpdate);

    if (result.success) {
      setUser(prevUser => ({
        ...prevUser,
        ...dataToUpdate
      }));
    } else {
      Alert.alert("Error", "Could not save your profile. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
            Tell us about your studies to personalize your experience.
            </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Select Your Educational Path</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#10B981" style={{ height: 50, marginTop: 20 }}/>
          ) : (
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
              placeholderStyle={styles.placeholder}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              modalProps={{
                animationType: 'fade'
              }}
            />
          )}
        </View>

        <View style={styles.footer}>
            {isSaving ? (
                <ActivityIndicator size="large" color="#10B981" style={{ height: 50 }} />
            ) : (
                <AnimatedGradientButton
                    text="Save and Continue"
                    onPress={handleSaveProfile}
                    buttonWidth={280}
                    buttonHeight={55}
                    fontSize={20}
                    borderRadius={12}
                />
            )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0C0F27',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a7adb8ff',
    textAlign: 'center',
    maxWidth: '90%',
  },
  form: {
    flex: 3,
    width: '100%',
    zIndex: 1000, 
  },
  label: {
    fontSize: 16,
    color: '#a7adb8ff',
    marginBottom: 15,
    marginLeft: 5,
  },
  footer: {
      flex: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  placeholder: {
    color: '#8A94A4',
  },
  dropdownContainer: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  dropdownText: {
    color: 'white',
    fontSize: 16,
  },
});

export default ProfileSetupScreen;