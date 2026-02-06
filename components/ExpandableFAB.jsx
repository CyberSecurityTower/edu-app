
// components/ExpandableFAB.jsx
import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import MagicTriggerFAB from './MagicTriggerFAB'; // مكون مساعد للزر الرئيسي

const ActionButton = ({ icon, label, onPress, delay }) => (
  <MotiView
    from={{ opacity: 0, translateY: 10, scale: 0.8 }}
    animate={{ opacity: 1, translateY: 0, scale: 1 }}
    exit={{ opacity: 0, translateY: 10, scale: 0.8 }}
    transition={{ type: 'spring', delay }}
    style={styles.actionContainer}
  >
    <Text style={styles.actionLabel}>{label}</Text>
    <Pressable onPress={onPress}>
      <LinearGradient colors={['#374151', '#1F2937']} style={styles.actionButton}>
        <FontAwesome5 name={icon} size={18} color="white" />
      </LinearGradient>
    </Pressable>
  </MotiView>
);

const ExpandableFAB = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <View style={styles.container}>
      <AnimatePresence>
        {isOpen && (
          <View>
            {actions.map((action, index) => (
              action && action.onPress &&
              <ActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                onPress={() => {
                  action.onPress();
                  setIsOpen(false);
                }}
                delay={index * 50}
              />
            ))}
          </View>
        )}
      </AnimatePresence>
      <MagicTriggerFAB isOpen={isOpen} onPress={toggleMenu} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 100, right: 25, alignItems: 'flex-end' },
  actionContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  actionLabel: { color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 12, fontSize: 14, fontWeight: '600' },
  actionButton: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },
});

export default ExpandableFAB;