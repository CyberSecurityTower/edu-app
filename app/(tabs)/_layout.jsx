import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { EditModeProvider, useEditMode } from '../../context/EditModeContext';

function MyCustomTabBar({ state, descriptors, navigation }) {
    const layouts = React.useRef(new Array(state.routes.length));
    const translateX = useSharedValue(0);
    const pillWidth = useSharedValue(0);

    React.useEffect(() => {
        if (layouts.current[state.index]) {
            const activeLayout = layouts.current[state.index];
            const pillScale = 0.7;
            const newWidth = activeLayout.width * pillScale;
            const padding = (activeLayout.width - newWidth) / 2;
            translateX.value = withTiming(activeLayout.x + padding, { duration: 250 });
            pillWidth.value = withTiming(newWidth, { duration: 250 });
        }
    }, [state.index]);

    const animatedPillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        width: pillWidth.value,
    }));

    return (
        <Animated.View style={styles.tabBarContainer} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
            <View style={styles.tabBar}>
                <Animated.View style={[styles.animatedPill, animatedPillStyle]}>
                    <LinearGradient colors={['#3B82F6', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.title !== undefined ? options.title : route.name;
                    const isFocused = state.index === index;
                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };
                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="button"
                            onPress={onPress}
                            onLayout={(event) => {
                                const { x, width } = event.nativeEvent.layout;
                                layouts.current[index] = { x, width };
                                if (state.index === index && pillWidth.value === 0) {
                                    const pillScale = 0.7;
                                    const newWidth = width * pillScale;
                                    const padding = (width - newWidth) / 2;
                                    translateX.value = x + padding;
                                    pillWidth.value = newWidth;
                                }
                            }}
                            style={styles.tabItem}
                        >
                            <FontAwesome5 name={options.tabBarIconName} size={22} color={isFocused ? 'white' : '#a7adb8ff'} />
                            <Text style={[styles.tabLabel, { color: isFocused ? 'white' : '#a7adb8ff' }]}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </Animated.View>
    );
}

function EditModeActionBar() {
  const { selectedTasks, actions, setIsEditMode, setSelectedTasks } = useEditMode();
  const selectionCount = selectedTasks.size;
  const canRename = selectionCount === 1;

  const handleCancel = () => {
    setIsEditMode(false);
    setSelectedTasks(new Set());
  };

  return (
    <Animated.View style={styles.tabBarContainer} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
      <View style={styles.tabBar}>
        <Pressable style={[styles.actionItem, !canRename && styles.disabledAction]} onPress={actions.onRename} disabled={!canRename}>
          <FontAwesome5 name="pen" size={20} color={canRename ? "#FBBF24" : "#4B5563"} />
          <Text style={[styles.actionLabel, !canRename && styles.disabledText]}>Rename</Text>
        </Pressable>
        <Pressable style={[styles.actionItem, selectionCount === 0 && styles.disabledAction]} onPress={actions.onPin} disabled={selectionCount === 0}>
          <FontAwesome5 name="thumbtack" size={20} color={selectionCount > 0 ? "#60A5FA" : "#4B5563"} />
          <Text style={[styles.actionLabel, selectionCount === 0 && styles.disabledText]}>Pin</Text>
        </Pressable>
        <Pressable style={[styles.actionItem, selectionCount === 0 && styles.disabledAction]} onPress={actions.onDelete} disabled={selectionCount === 0}>
          <FontAwesome5 name="trash" size={20} color={selectionCount > 0 ? "#F87171" : "#4B5563"} />
          <Text style={[styles.actionLabel, selectionCount === 0 && styles.disabledText]}>Delete</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
      {selectionCount > 0 && <Text style={styles.selectionCount}>{selectionCount} Selected</Text>}
    </Animated.View>
  );
}

function TabsLayoutContent() {
    const { isEditMode } = useEditMode();
    return (
        <Tabs tabBar={(props) => isEditMode && props.state.routes[props.state.index].name === 'tasks' ? <EditModeActionBar /> : <MyCustomTabBar {...props} />}>
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIconName: 'home', headerShown: false }} />
            <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIconName: 'tasks', headerShown: false }} />
            <Tabs.Screen name="leaderboard" options={{ title: 'Ranking', tabBarIconName: 'trophy', headerShown: false }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIconName: 'user-alt', headerShown: false }} />
        </Tabs>
    );
}

export default function TabsLayout() {
    return (
        <EditModeProvider>
            <TabsLayoutContent />
        </EditModeProvider>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: { position: 'absolute', bottom: 25, left: 20, right: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
    tabBar: { flexDirection: 'row', height: 70, backgroundColor: 'rgba(30, 41, 59, 0.9)', borderRadius: 35, alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 1 },
    tabLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    animatedPill: { position: 'absolute', height: '80%', top: '10%', left: 0, borderRadius: 25, overflow: 'hidden' },
    actionItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    disabledAction: { opacity: 0.4 },
    disabledText: { color: '#6B7280' },
    actionLabel: { color: 'white', fontSize: 11, marginTop: 4, fontWeight: '600' },
    selectionCount: { position: 'absolute', top: -25, alignSelf: 'center', backgroundColor: '#10B981', color: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontSize: 14, fontWeight: 'bold' },
    cancelButton: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 25 },
    cancelText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});