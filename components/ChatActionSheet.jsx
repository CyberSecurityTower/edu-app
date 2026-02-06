import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Modalize } from 'react-native-modalize';
import { FontAwesome5 } from '@expo/vector-icons';

export const ChatActionSheet = forwardRef(({ session, onRename, onPin, onDelete }, ref) => {

  const handleRename = () => {
    if (session) onRename(session);
  };

  const handlePin = () => {
    if (session) onPin(session);
  };

  const handleDelete = () => {
    if (session) onDelete(session);
  };

  const ActionItem = ({ icon, name, color, onPress }) => (
    <Pressable style={styles.actionItem} onPress={onPress}>
      <FontAwesome5 name={icon} size={20} color={color} style={styles.icon} />
      <Text style={[styles.actionText, { color }]}>{name}</Text>
    </Pressable>
  );

  return (
    <Modalize
      ref={ref}
      adjustToContentHeight
      handleStyle={{ backgroundColor: '#4B5563' }}
      modalStyle={{ backgroundColor: '#1E293B' }}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{session?.title || 'Actions'}</Text>
        <ActionItem
          icon="pen"
          name="Rename"
          color="#a7adb8ff"
          onPress={handleRename}
        />
        <ActionItem
          icon="thumbtack"
          name={session?.isPinned ? "Unpin" : "Pin"}
          color="#3B82F6"
          onPress={handlePin}
        />
        <ActionItem
          icon="trash-alt"
          name="Delete"
          color="#EF4444"
          onPress={handleDelete}
        />
      </View>
    </Modalize>
  );
});

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  icon: {
    width: 35,
    textAlign: 'center',
  },
  actionText: {
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '600',
  },
});