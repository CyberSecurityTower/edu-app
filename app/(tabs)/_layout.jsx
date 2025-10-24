// app/(tabs)/_layout.jsx (النسخة النهائية والمستقرة)
import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatePresence } from 'moti';

import { EditModeProvider, useEditMode } from '../../context/EditModeContext';
import { FabProvider, useFab } from '../../context/FabContext';
import ExpandableFAB from '../../components/ExpandableFAB';
import MagicTriggerFAB from '../../components/MagicTriggerFAB';

// ✨ --- تم تعديل هذا المكون ليكون أكثر استقرارًا --- ✨
function MyCustomTabBar({ state, descriptors, navigation }) {
    const layouts = React.useRef(new Array(state.routes.length));
    const translateX = useSharedValue(0);
    const pillWidth = useSharedValue(0);

    React.useEffect(() => {
        const activeLayout = layouts.current[state.index];
        if (activeLayout) {
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
                                // تحديث الـ ref لا يسبب re-render وبالتالي أكثر أمانًا
                                layouts.current[index] = { x, width };
                            }}
                            style={styles.tabItem}
                        >
                            <FontAwesome5 name={options.tabBarIcon({ color: '' }).props.name} size={22} color={isFocused ? 'white' : '#a7adb8ff'} />
                            <Text style={[styles.tabLabel, { color: isFocused ? 'white' : '#a7adb8ff' }]}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </Animated.View>
    );
}

// EditModeActionBar (بدون تغيير)
function EditModeActionBar() {
  const { selectedTasks, actions } = useEditMode();
  if (selectedTasks.size === 0) return null;
  return (
    <Animated.View style={styles.tabBarContainer} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
      <View style={styles.tabBar}>
        <Pressable style={styles.actionItem} onPress={actions.onPin}>
          <FontAwesome5 name="thumbtack" size={22} color="#60A5FA" />
          <Text style={styles.actionLabel}>Pin/Unpin</Text>
        </Pressable>
        <Text style={styles.selectionCount}>{selectedTasks.size} Selected</Text>
        <Pressable style={styles.actionItem} onPress={actions.onDelete}>
          <FontAwesome5 name="trash" size={22} color="#F87171" />
          <Text style={styles.actionLabel}>Delete</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// TabsLayoutContent (بدون تغيير في المنطق)
function TabsLayoutContent() {
    const router = useRouter();
    const segments = useSegments();
    const { isEditMode } = useEditMode();
    const { primaryAction } = useFab();

    const currentScreen = segments[segments.length - 1];
    const isTasksScreen = currentScreen === 'tasks';

    const shouldShowFab = ['index', 'tasks'].includes(currentScreen) && !isEditMode;

    const fabActions = [];
    // الإجراء الأساسي (اسأل EduAI) يضاف دائمًا إذا كان الزر ظاهرًا
    if (shouldShowFab) {
        fabActions.push({ icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/(modal)/ai-chatbot') });
    }
    // إجراء "إضافة مهمة" يضاف فقط في شاشة المهام
    if (isTasksScreen && primaryAction) {
        fabActions.unshift({ icon: 'tasks', label: 'Add Task', onPress: primaryAction });
    }

    const renderFab = () => {
        // إذا كان هناك أكثر من إجراء، أظهر القائمة المنسدلة
        if (fabActions.length > 1) {
            return <ExpandableFAB actions={fabActions} />;
        }
        // إذا كان هناك إجراء واحد فقط، أظهر الزر السحري مباشرة
        if (fabActions.length === 1) {
            return (
                <View style={styles.fabContainer}>
                    <MagicTriggerFAB isOpen={false} onPress={fabActions[0].onPress} />
                </View>
            );
        }
        return null;
    };

    return (
        <View style={{ flex: 1, position: 'relative' }}>
            <Tabs tabBar={(props) => isEditMode && isTasksScreen ? <EditModeActionBar /> : <MyCustomTabBar {...props} />}>
                <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />, headerShown: false }} />
                <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <FontAwesome5 name="tasks" size={24} color={color} />, headerShown: false }} />
                <Tabs.Screen name="leaderboard" options={{ title: 'Ranking', tabBarIcon: ({ color }) => <FontAwesome5 name="trophy" size={24} color={color} />, headerShown: true }} />
                <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={24} color={color} />, headerShown: false }} />
            </Tabs>
            
            <AnimatePresence>
                {shouldShowFab && renderFab()}
            </AnimatePresence>
        </View>
    );
}

// TabsLayout (بدون تغيير)
export default function TabsLayout() {
    return (
        <EditModeProvider>
            <FabProvider>
                <TabsLayoutContent />
            </FabProvider>
        </EditModeProvider>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: { position: 'absolute', bottom: 25, left: 20, right: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
    tabBar: { flexDirection: 'row', height: 70, backgroundColor: 'rgba(42, 56, 78, 0.75)', borderRadius: 35, alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 1 },
    tabLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    animatedPill: { position: 'absolute', height: '80%', top: '10%', left: 0, borderRadius: 25, overflow: 'hidden' },
    actionItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { color: 'white', fontSize: 11, marginTop: 4, fontWeight: '600' },
    selectionCount: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    fabContainer: { position: 'absolute', bottom: 100, right: 25 },
});