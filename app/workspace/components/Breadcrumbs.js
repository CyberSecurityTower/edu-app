import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

export default function Breadcrumbs({ path, onNavigate }) {
  const { isRTL } = useLanguage();

  // path example: [{id: null, name: 'Home'}, {id: '123', name: 'Math'}]

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row' }}
      >
        {path.map((crumb, index) => {
            const isLast = index === path.length - 1;
            return (
                <View key={crumb.id || 'root'} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                    <TouchableOpacity 
                        onPress={() => !isLast && onNavigate(crumb)}
                        disabled={isLast}
                        style={styles.crumbBtn}
                    >
                        {crumb.id === null && (
                            <FontAwesome5 name="home" size={12} color={isLast ? '#38BDF8' : '#94A3B8'} style={{ marginHorizontal: 4 }} />
                        )}
                        <Text style={[styles.text, isLast && styles.activeText]}>
                            {crumb.name}
                        </Text>
                    </TouchableOpacity>
                    
                    {!isLast && (
                        <FontAwesome5 
                            name={isRTL ? "chevron-left" : "chevron-right"} 
                            size={10} 
                            color="#475569" 
                            style={{ marginHorizontal: 8 }}
                        />
                    )}
                </View>
            );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 40, marginBottom: 5, paddingHorizontal: 20 },
  crumbBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  text: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  activeText: { color: '#38BDF8', fontWeight: 'bold' }
});