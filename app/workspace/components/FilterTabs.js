import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../../context/LanguageContext';

export default function FilterTabs({ activeTab, onTabChange }) {
  const { t, isRTL } = useLanguage();

  // Define tabs inside component to access 't'
  const tabs = [
    { id: 'All', label: t('filterAll'), icon: null },
    { id: 'PDFs', label: t('filterPDFs'), icon: 'file-pdf' },
    { id: 'Images', label: t('filterImages'), icon: 'image' },
    { id: 'Videos', label: t('filterVideos'), icon: 'video' },
    { id: 'Subject', label: t('filterSubject'), icon: 'layer-group' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        {tabs.map((tab) => {
           const isActive = activeTab === tab.id;
           return (
            <TouchableOpacity
                key={tab.id}
                onPress={() => { Haptics.selectionAsync(); onTabChange(tab.id); }}
                style={[styles.tab, isActive && styles.activeTab, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
                {tab.icon && (
                    <FontAwesome5 
                        name={tab.icon} 
                        size={12} 
                        color={isActive ? '#000' : '#94A3B8'} 
                        style={{ [isRTL ? 'marginLeft' : 'marginRight']: 6 }} 
                    />
                )}
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {tab.label}
                </Text>
            </TouchableOpacity>
           );
        })}
      </ScrollView>
    </View>
  );
}
// ... Styles
const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  scrollContent: { paddingHorizontal: 20, gap: 10 },
  tab: { 
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  activeTab: { backgroundColor: '#E2E8F0' }, 
  tabText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#0F172A' },
});