
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, TextInput, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedGradientButton from '../components/AnimatedGradientButton';
import { ChatActionSheet } from '../components/ChatActionSheet';
import { STORAGE_KEYS } from '../config/appConfig';

const RenameModal = ({ isVisible, currentName, onClose, onSave }) => {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    if (isVisible) {
      setNewName(currentName);
    }
  }, [isVisible, currentName]);

  const handleSave = () => {
    if (newName && newName.trim() !== '') {
      onSave(newName.trim());
    } else {
      Alert.alert('Invalid name', 'Please enter a valid name.');
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={() => {}}>
          <Text style={styles.modalTitle}>Rename Chat</Text>
          <TextInput
            style={styles.modalInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter new name"
            placeholderTextColor="#8A94A4"
            autoFocus={true}
          />
          <View style={styles.modalButtonContainer}>
            <Pressable style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
            <AnimatedGradientButton
              text="Save"
              onPress={handleSave}
              buttonWidth={100}
              buttonHeight={45}
              fontSize={16}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const groupSessionsByDate = (sessionsArray) => {
  const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  sessionsArray.forEach(session => {
    const sessionDate = new Date(session.timestamp);
    if (sessionDate.toDateString() === today.toDateString()) groups.Today.push(session);
    else if (sessionDate.toDateString() === yesterday.toDateString()) groups.Yesterday.push(session);
    else if (sessionDate > sevenDaysAgo) groups['Previous 7 Days'].push(session);
    else groups.Older.push(session);
  });
  return groups;
};

export default function ChatHistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const modalizeRef = useRef(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isRenameModalVisible, setRenameModalVisible] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedSessionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      const sessionsData = savedSessionsRaw ? JSON.parse(savedSessionsRaw) : {};
      const sessionsArray = Object.keys(sessionsData).map(key => ({
        id: key,
        ...sessionsData[key],
        timestamp: parseInt(key.split('_')[1], 10) || Date.now(),
      })).sort((a, b) => b.timestamp - a.timestamp);
      setSessions(sessionsArray);
    } catch (e) {
      console.error("Failed to load sessions.", e);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const updateAndSaveSessions = async (updatedSessionsArray) => {
    setSessions(updatedSessionsArray);
    const sessionsObject = updatedSessionsArray.reduce((obj, item) => {
      obj[item.id] = { title: item.title, messages: item.messages, isPinned: item.isPinned };
      return obj;
    }, {});
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessionsObject));
    } catch (e) {
      console.error("Failed to save updated sessions.", e);
    }
  };

  const handleSelectSession = (sessionId) => {
    router.push({ pathname: '/(modal)/ai-chatbot', params: { sessionId } });
  };

  const handleNewChat = () => router.push('/(modal)/ai-chatbot');

  const openActionSheet = (session) => {
    setSelectedSession(session);
    modalizeRef.current?.open();
  };

  const renameSession = (session) => {
    setSelectedSession(session);
    setRenameModalVisible(true);
    modalizeRef.current?.close();
  };

  const handleSaveRename = async (newName) => {
    if (!selectedSession) return;
    const updatedSessions = sessions.map(s =>
      s.id === selectedSession.id ? { ...s, title: newName } : s
    );
    await updateAndSaveSessions(updatedSessions);
    setRenameModalVisible(false);
    setSelectedSession(null);
  };

  const togglePinSession = async (session) => {
    const updatedSessions = sessions.map(s =>
      s.id === session.id ? { ...s, isPinned: !s.isPinned } : s
    );
    await updateAndSaveSessions(updatedSessions);
    modalizeRef.current?.close();
  };

  const deleteSession = (session) => {
    modalizeRef.current?.close();
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete "${session.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedSessions = sessions.filter(s => s.id !== session.id);
            await updateAndSaveSessions(updatedSessions);
            if (selectedSession?.id === session.id) setSelectedSession(null);
          }
        }
      ]
    );
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter(s => s.isPinned);
  const regularSessions = filteredSessions.filter(s => !s.isPinned);
  const groupedRegularSessions = groupSessionsByDate(regularSessions);

  const sections = [
    { title: 'Pinned', data: pinnedSessions },
    { title: 'Today', data: groupedRegularSessions.Today },
    { title: 'Yesterday', data: groupedRegularSessions.Yesterday },
    { title: 'Previous 7 Days', data: groupedRegularSessions['Previous 7 Days'] },
    { title: 'Older', data: groupedRegularSessions.Older },
  ].filter(section => section.data.length > 0);

  const renderSessionItem = ({ item }) => (
    <Pressable
      style={styles.sessionItem}
      onPress={() => handleSelectSession(item.id)}
      onLongPress={() => openActionSheet(item)}
    >
      <FontAwesome5 name="comment-alt" size={18} color="#a7adb8ff" />
      <Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text>
      {item.isPinned && <FontAwesome5 name="thumbtack" size={16} color="#3B82F6" style={{ marginHorizontal: 10 }} />}
      <Pressable onPress={() => openActionSheet(item)} style={styles.ellipsisButton}>
        <FontAwesome5 name="ellipsis-v" size={16} color="#6B7280" />
      </Pressable>
    </Pressable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <FontAwesome5 name="times" size={22} color="white" />
          </Pressable>
          <Pressable style={styles.newChatButton} onPress={handleNewChat}>
            <Text style={styles.newChatText}>New Chat</Text>
            <FontAwesome5 name="edit" size={16} color="white" />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={18} color="#8A94A4" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#8A94A4"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={sections}
            keyExtractor={(item) => item.title}
            renderItem={({ item }) => (
              <View>
                <Text style={styles.sectionHeader}>{item.title}</Text>
                <FlatList
                  data={item.data}
                  scrollEnabled={false}
                  keyExtractor={(session) => session.id}
                  renderItem={renderSessionItem}
                />
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No chats found.</Text>
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        <RenameModal
          isVisible={isRenameModalVisible}
          currentName={selectedSession?.title || ''}
          onClose={() => { setRenameModalVisible(false); setSelectedSession(null); }}
          onSave={handleSaveRename}
        />

        <ChatActionSheet
          ref={modalizeRef}
          session={selectedSession}
          onRename={renameSession}
          onPin={togglePinSession}
          onDelete={deleteSession}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
  headerButton: { padding: 10 },
  newChatButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E293B', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  newChatText: { color: 'white', fontSize: 16, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 15, marginHorizontal: 20, marginTop: 10, marginBottom: 5 },
  searchInput: { flex: 1, color: 'white', fontSize: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10, marginLeft: 10 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: { color: '#a7adb8ff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingLeft: 20, borderRadius: 12, marginBottom: 10, gap: 15 },
  sessionTitle: { flex: 1, color: 'white', fontSize: 16 },
  ellipsisButton: { padding: 18 },
  emptyText: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', backgroundColor: '#1E293B', borderRadius: 16, padding: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { backgroundColor: '#334155', color: 'white', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 20 },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  modalButton: { padding: 15 },
  modalButtonText: { color: '#a7adb8ff', fontSize: 16, fontWeight: '600' },
});