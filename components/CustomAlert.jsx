// components/CustomAlert.jsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';

const CustomAlert = ({ isVisible, onClose, title, message, buttons = [] }) => {
  if (!isVisible) return null;

  const getIcon = () => {
    if (title.toLowerCase().includes('delete') || title.toLowerCase().includes('clear')) {
      return { name: 'trash-alt', color: '#F87171' };
    }
    if (title.toLowerCase().includes('error')) {
      return { name: 'exclamation-triangle', color: '#FBBF24' };
    }
    return { name: 'info-circle', color: '#60A5FA' };
  };

  const icon = getIcon();

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={onClose}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <MotiView
            from={{ opacity: 0, scale: 0.8, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 150 }}
          >
            <Pressable style={styles.alertContainer}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name={icon.name} size={24} color={icon.color} />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.buttonRow}>
                {buttons.map((button, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.button,
                      button.style === 'destructive' && styles.destructiveButton,
                      button.style === 'cancel' && styles.cancelButton,
                      buttons.length > 1 && styles.buttonWithMargin
                    ]}
                    onPress={() => {
                      if (button.onPress) button.onPress();
                      onClose();
                    }}
                  >
                    <Text style={[
                      styles.buttonText,
                      button.style === 'destructive' && styles.destructiveText,
                      button.style === 'cancel' && styles.cancelText
                    ]}>
                      {button.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </MotiView>
        </Pressable>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: '#CBD5E1',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  buttonWithMargin: {
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  destructiveButton: {
    backgroundColor: '#991B1B', // Darker red for destructive actions
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: {
    color: '#E5E7EB',
  },
  destructiveText: {
    color: '#FECACA',
  },
});

export default CustomAlert;