import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withDelay,
    withSequence,
    withSpring,
    FadeInDown,
    Easing,
    cancelAnimation,
    Layout // تم استيراد Layout لجعل حركة تكبير الصندوق ناعمة
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// دالة تنسيق الاسم
const formatAtomName = (atomId) => {
    if (!atomId) return "Skill Node";
    return atomId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const MasteryProgressRow = ({ title, atomId, oldScore, newScore, delta, index, isRTL }) => {
    // حالة لتتبع هل النص مفتوح بالكامل أم لا
    const [isExpanded, setIsExpanded] = useState(false);

    // 1. تحديد الحالة والألوان
    const isGain = delta > 0;
    const isLoss = delta < 0;
    
    // لوحة الألوان
    const colors = {
        gain: { main: ['#10B981', '#34D399'], text: '#34D399', bg: 'rgba(16, 185, 129, 0.15)' },
        loss: { main: ['#EF4444', '#F87171'], text: '#F87171', bg: 'rgba(239, 68, 68, 0.15)' },
        neutral: { main: ['#94A3B8', '#CBD5E1'], text: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)' }
    };

    const currentTheme = isGain ? colors.gain : isLoss ? colors.loss : colors.neutral;
    const statusIcon = isGain ? "trending-up" : isLoss ? "trending-down" : "minus";

    // 2. القيم المشتركة للأنيميشن
    const progressWidth = useSharedValue(0);
    const cardScale = useSharedValue(1);

    // دالة تشغيل الأنيميشن
    const runProgressAnimation = (delay = 0) => {
        progressWidth.value = 0;
        progressWidth.value = withDelay(
            delay, 
            withTiming(newScore, { duration: 1500, easing: Easing.out(Easing.exp) })
        );
    };

    useEffect(() => {
        runProgressAnimation(index * 150 + 500);
    }, []);

    // 3. التفاعل عند الضغط (Replay Animation + Toggle Text)
    const handlePress = () => {
        // عكس حالة التوسيع (إظهار/إخفاء الاسم الكامل)
        setIsExpanded(!isExpanded);

        // 1. Haptic Feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // 2. Button Scale Animation (Click Effect)
        cardScale.value = withSequence(
            withTiming(0.97, { duration: 50 }),
            withSpring(1)
        );

        // 3. Replay Progress Bar
        cancelAnimation(progressWidth);
        progressWidth.value = 0; // تصفير فوري
        progressWidth.value = withTiming(newScore, { duration: 1000, easing: Easing.out(Easing.cubic) });
    };

    // أنماط الأنيميشن
    const animatedBarStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }]
    }));

    const displayTitle = title || formatAtomName(atomId);

    return (
        <Animated.View 
            entering={FadeInDown.delay(index * 100 + 600).springify()}
            layout={Layout.springify()} // جعل حركة تمدد الصندوق ناعمة عند ظهور النص
        >
            <Pressable onPress={handlePress} activeOpacity={1}>
                <Animated.View 
                    style={[
                        styles.container, 
                        animatedCardStyle,
                        { borderColor: `${currentTheme.text}40` } 
                    ]}
                >
                    {/* --- الرأس: الاسم + الأيقونة --- */}
                    <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        
                        <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <View style={[styles.iconBox, { backgroundColor: currentTheme.bg }]}>
                                <FontAwesome5 name="atom" size={12} color={currentTheme.text} />
                            </View>
                            
                            {/* تم التعديل هنا: استخدام isExpanded للتحكم في عدد الأسطر */}
                            <Text 
                                style={[styles.skillName, { textAlign: isRTL ? 'right' : 'left' }]} 
                                numberOfLines={isExpanded ? undefined : 1}
                            >
                                {displayTitle}
                            </Text>
                        </View>

                        {/* شارة التغيير (Delta) */}
                        {delta !== 0 && (
                            <View style={[
                                styles.deltaBadge, 
                                { backgroundColor: currentTheme.bg, borderColor: currentTheme.text },
                                { flexDirection: isRTL ? 'row-reverse' : 'row' }
                            ]}>
                                <MaterialCommunityIcons name={statusIcon} size={14} color={currentTheme.text} />
                                <Text style={[styles.deltaText, { color: currentTheme.text }]}>
                                    {Math.abs(delta)}%
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* --- شريط التقدم --- */}
                    <View style={styles.trackContainer}>
                        <View style={styles.trackBg} />

                        {oldScore > 0 && (
                            <View 
                                style={[
                                    styles.ghostBar, 
                                    { width: `${oldScore}%`, backgroundColor: isLoss ? '#EF444455' : '#FFFFFF20' }
                                ]} 
                            />
                        )}
                        
                        <View style={[styles.markerLine, { left: `${oldScore}%`, backgroundColor: '#94A3B8' }]} />

                        <Animated.View style={[styles.progressBarWrapper, animatedBarStyle]}>
                            <LinearGradient
                                colors={currentTheme.main}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.gradientFill}
                            />
                            <View style={styles.barTipGlow} />
                        </Animated.View>
                    </View>

                    {/* --- التذييل: الأرقام --- */}
                    <View style={[styles.footerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.labelLimit}>0</Text>
                        
                        <View style={[styles.scoreTransition, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Text style={styles.oldScoreText}>{Math.round(oldScore)}%</Text>
                            <MaterialCommunityIcons 
                                name={isRTL ? "arrow-left-thin" : "arrow-right-thin"} 
                                size={14} 
                                color="#64748B" 
                                style={{ marginHorizontal: 4, opacity: 0.5 }}
                            />
                            <Text style={[styles.newScoreText, { color: currentTheme.text, textShadowColor: currentTheme.text }]}>
                                {Math.round(newScore)}%
                            </Text>
                        </View>

                        <Text style={styles.labelLimit}>100</Text>
                    </View>

                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(15, 23, 42, 0.8)', 
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    headerRow: {
        justifyContent: 'space-between',
        alignItems: 'flex-start', // تم التعديل لضمان المحاذاة العلوية عند تمدد النص
        marginBottom: 12,
    },
    titleGroup: {
        flex: 1,
        // alignItems: 'center', // إزالة المحاذاة الوسطى للسماح للنص بالتمدد بشكل سليم عمودياً
        alignItems: 'flex-start', // بداية السطر للأيقونة والنص
        gap: 10
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 0, // لضبط محاذاة الأيقونة مع السطر الأول من النص
    },
    skillName: {
        color: '#F1F5F9',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
        flex: 1,
        lineHeight: 20, // إضافة ارتفاع سطر لضمان قراءة جيدة عند التمدد
        marginTop: 4 // ضبط بسيط لمحاذاة النص مع الأيقونة
    },
    deltaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 0
    },
    deltaText: {
        fontSize: 12,
        fontWeight: '800',
    },
    
    // Progress Bar Styles
    trackContainer: {
        height: 10,
        width: '100%',
        justifyContent: 'center',
        marginBottom: 10,
        position: 'relative'
    },
    trackBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E293B',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    ghostBar: {
        position: 'absolute',
        height: '100%',
        borderRadius: 5,
        left: 0,
        zIndex: 1
    },
    markerLine: {
        position: 'absolute',
        top: -4,
        bottom: -4,
        width: 2,
        borderRadius: 1,
        zIndex: 10,
        opacity: 0.6
    },
    progressBarWrapper: {
        height: '100%',
        borderRadius: 5,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5
    },
    gradientFill: { flex: 1 },
    barTipGlow: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 15,
        backgroundColor: 'rgba(255,255,255,0.4)',
        opacity: 0.6
    },

    // Footer Styles
    footerRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelLimit: {
        color: '#475569',
        fontSize: 10,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    scoreTransition: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    oldScoreText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'line-through'
    },
    newScoreText: {
        fontSize: 14,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    }
});

export default MasteryProgressRow;