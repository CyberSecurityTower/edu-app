import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatePresence } from 'moti';

import { EditModeProvider, useEditMode } from '../../context/EditModeContext';
import { useFab } from '../../context/FabContext'; // <-- سيعمل الآن لأن Provider موجود في الملف الجذري
import ExpandableFAB from '../../components/ExpandableFAB';
import MagicTriggerFAB from '../../components/MagicTriggerFAB';

// --- شريط التبويبات المخصص الخاص بك (بدون أي تغيير) ---
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
    }, [state.index, layouts.current]);

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
                                // تحديث فوري عند أول رسم
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

// --- شريط وضع التعديل (بدون أي تغيير) ---
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

function TabsLayoutContent() {
    const { isEditMode } = useEditMode();
    const { fabActions } = useFab();
    const shouldShowFab = fabActions && fabActions.length > 0 && !isEditMode;

    const renderFab = () => {
        if (!fabActions) return null;
        if (fabActions.length > 1) return <ExpandableFAB actions={fabActions} />;
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
            <Tabs tabBar={(props) => isEditMode && props.state.routes[props.state.index].name === 'tasks' ? <EditModeActionBar /> : <MyCustomTabBar {...props} />}>
                <Tabs.Screen name="index" options={{ title: 'Home', tabBarIconName: 'home', headerShown: false }} />
                <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIconName: 'tasks', headerShown: false }} />
                {/* --- تم إصلاح المسار هنا --- */}
                <Tabs.Screen name="leaderboard" options={{ title: 'Ranking', tabBarIconName: 'trophy', headerShown: false }} />
                <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIconName: 'user-alt', headerShown: false }} />
            </Tabs>
            
            <AnimatePresence>
                {shouldShowFab && renderFab()}
            </AnimatePresence>
        </View>
    );
}

// --- المكون الرئيسي ---
export default function TabsLayout() {
    return (
        <EditModeProvider>
            {/* FabProvider موجود الآن في الملف الجذري، لا حاجة له هنا */}
            <TabsLayoutContent />
        </EditModeProvider>
    );
}

// --- الستايلات (بدون تغيير) ---
const styles = StyleSheet.create({
    tabBarContainer: { position: 'absolute', bottom: 25, left: 20, right: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
    tabBar: { flexDirection: 'row', height: 70, backgroundColor: 'rgba(30, 41, 59, 0.9)', borderRadius: 35, alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 1 },
    tabLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    animatedPill: { position: 'absolute', height: '80%', top: '10%', left: 0, borderRadius: 25, overflow: 'hidden' },
    actionItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { color: 'white', fontSize: 11, marginTop: 4, fontWeight: '600' },
    selectionCount: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    fabContainer: { position: 'absolute', bottom: 100, right: 25 },
});