import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
    Linking, ScrollView, Dimensions 
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getQuickDefinition } from '../services/quickLookService'; 
import { useLanguage } from '../context/LanguageContext'; // ✅

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const isArabicText = (text) => /[\u0600-\u06FF]/.test(text);

export const QuickSearchView = ({ text, onClose, onBack }) => {
    const { t, language } = useLanguage(); // ✅
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            // ✅ نمرر لغة التطبيق وكائن يحتوي على النصوص اللازمة للخدمة
            const localizedStrings = {
                noDefinitionFound: t('noDefinitionFound'),
                searchGoogle: t('searchGoogle')
            };
            
            // نمرر لغة التطبيق الحالية (language)
            const result = await getQuickDefinition(text, language, localizedStrings); 
            
            if (mounted) {
                setData(result);
                setLoading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [text, language]);

    const handleOpenLink = () => {
        if (data?.url) {
            Linking.openURL(data.url);
            onClose();
        }
    };

    const getDisplaySource = (originalSource) => {
        switch (originalSource) {
            case 'AI Assistant': return t('sourceAi'); // ✅
            case 'DuckDuckGo': return 'Google'; 
            case 'Wikipedia': return t('sourceWiki'); // ✅
            case 'Dictionary': return t('sourceDict'); // ✅
            case 'Web': return t('sourceWeb'); // ✅
            default: return originalSource; 
        }
    };

    const getSourceIcon = (originalSource) => {
        switch (originalSource) {
            case 'AI Assistant': return 'robot';
            case 'DuckDuckGo': return 'google'; 
            case 'Wikipedia': return 'wikipedia-w'; 
            case 'Dictionary': return 'book';
            default: return 'search';
        }
    };

    const isContentArabic = data ? isArabicText(data.content) : false;

    return (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
            <View style={[styles.header, { flexDirection: isArabicText(t('quickLookTitle')) ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
                    <MaterialIcons name={isArabicText(t('quickLookTitle')) ? "arrow-forward" : "arrow-back"} size={18} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('quickLookTitle')}</Text> 
                <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                    <MaterialIcons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#8B5CF6" />
                    <Text style={styles.loadingText}>{t('analyzing')}</Text> 
                </View>
            ) : (
                <ScrollView 
                    style={styles.scrollContainer}
                    contentContainerStyle={{ paddingBottom: 10 }}
                    showsVerticalScrollIndicator={true}
                >
                    <Text style={[styles.quickTitle, { textAlign: 'center' }]}>
                        {data.title}
                    </Text>
                    
                    <Text style={[
                        styles.quickContent, 
                        { textAlign: isContentArabic ? 'right' : 'left' }
                    ]}>
                        {data.content}
                    </Text>

                    <View style={[styles.sourceContainerLeft, { justifyContent: isContentArabic ? 'flex-end' : 'flex-start' }]}>
                        <View style={[styles.sourceCapsule, { 
                            borderColor: data.color, 
                            backgroundColor: data.color + '10',
                            flexDirection: isContentArabic ? 'row-reverse' : 'row'
                        }]}>
                            <FontAwesome5 
                                name={getSourceIcon(data.source)} 
                                size={12} 
                                color={data.color} 
                                style={{ [isContentArabic ? 'marginLeft' : 'marginRight']: 6 }} 
                            />
                            <Text style={[styles.sourceText, { color: data.color }]}>
                                {getDisplaySource(data.source)}
                            </Text>
                        </View>
                    </View>

                    {data.url && (
                        <TouchableOpacity 
                            style={[styles.externalLinkBtn, { flexDirection: isContentArabic ? 'row-reverse' : 'row' }]} 
                            onPress={handleOpenLink}
                        >
                             <Text style={styles.externalLinkText}>
                                {data.type === 'search_link' ? t('searchWeb') : t('readFullArticle')}
                            </Text>
                            <MaterialIcons 
                                name="open-in-new" 
                                size={14} 
                                color="#0F172A" 
                                style={{ [isContentArabic ? 'marginRight' : 'marginLeft']: 8 }}
                            />
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}
        </Animated.View>
    );
};
// ... (Styles)
const styles = StyleSheet.create({
    container: { 
        padding: 16,
        backgroundColor: 'white', // تأكد من وجود خلفية
        borderRadius: 16, // لجعل الحواف دائرية مثل البطاقة
        maxHeight: SCREEN_HEIGHT * 0.6, // ✅ تحديد الحد الأقصى لطول النافذة (60% من الشاشة)
        minHeight: 200, // حد أدنى للجمالية
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 10, 
        alignItems: 'center',
        paddingBottom: 8, // مسافة فصل بسيطة
        borderBottomWidth: 1, // خط فاصل خفيف تحت الهيدر (اختياري)
        borderBottomColor: '#F1F5F9'
    },
    headerTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
    iconBtn: { padding: 4 },
    
    loadingContainer: { alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 8, fontSize: 12, color: '#8B5CF6' },

    // ✅ تنسيق منطقة السكرول
    scrollContainer: {
        // لا نحتاج max height هنا لأن الـ container الأب يحكمه
    },

    quickTitle: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: '#1E293B', 
        marginBottom: 12, // زيادة المسافة قليلاً
        textAlign: 'center', 
        marginTop: 4,
        paddingHorizontal: 4
    },
    
    quickContent: { 
        fontSize: 15, // تكبير الخط قليلاً للقراءة
        color: '#334155', 
        lineHeight: 24, // تحسين تباعد الأسطر
        marginBottom: 16 
    },
    
    sourceContainerLeft: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 20,
    },
    sourceCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    sourceText: { 
        fontSize: 11, 
        fontWeight: '700', 
        textTransform: 'uppercase' 
    },

    externalLinkBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F1F5F9', // لون خلفية أوضح
        paddingVertical: 12, 
        borderRadius: 12, 
        gap: 8,
        marginBottom: 4
    },
    externalLinkText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
});