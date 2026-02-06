
// components/minichat/HtmlTable.jsx
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

// 1. تحديد حد أقصى للارتفاع (مثلاً 60% من ارتفاع الشاشة)
const MAX_TABLE_HEIGHT = Dimensions.get('window').height * 0.6;

const HtmlTable = ({ htmlCode }) => {
  const [tableHeight, setTableHeight] = useState(100);
  const [isScrollable, setIsScrollable] = useState(false); // حالة لمعرفة هل المحتوى أكبر من الحد الأقصى
  
  const cssStyles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

      :root {
        --bg-color: #1E293B;
        --header-bg: #0F172A;
        --border-color: #475569;
        --text-primary: #F8FAFC;
        --text-secondary: #CBD5E1;
      }

      body {
        background-color: var(--bg-color);
        color: var(--text-primary);
        font-family: 'Cairo', sans-serif;
        margin: 0;
        padding: 0;
        direction: rtl;
        /* 2. السماح بالسكرول العمودي والأفقي */
        overflow: auto; 
        /* 3. تحسين استجابة اللمس للسماح بتمرير السكرول للأب */
        overscroll-behavior-y: contain; 
      }

      .table-wrapper {
        width: 100%;
        /* لم نعد بحاجة لـ overflow-x هنا لأن body أصبح auto، لكن يمكن إبقاؤه للترتيب */
        overflow-x: auto; 
        padding-bottom: 10px;
        -webkit-overflow-scrolling: touch; 
      }

      table {
        width: 100%; 
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
      }

      thead th {
        background-color: var(--header-bg);
        color: #38BDF8;
        padding: 12px 10px;
        font-weight: 700;
        text-align: center;
        border-bottom: 2px solid var(--border-color);
        white-space: nowrap; 
        position: sticky; /* تثبيت الهيدر عند السكرول الداخلي */
        top: 0;
        z-index: 10;
      }

      td {
        padding: 12px 10px;
        border-bottom: 1px solid var(--border-color);
        border-left: 1px solid rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
        min-width: 80px; 
        max-width: 200px; 
        white-space: normal; 
        word-wrap: break-word; 
        vertical-align: middle; 
        text-align: right;
      }

      td:last-child { border-left: none; }
      tbody tr:nth-child(even) { background-color: rgba(255, 255, 255, 0.03); }

      /* تنسيق السكرول بار ليظهر بشكل جميل */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
      ::-webkit-scrollbar-track { background: transparent; }
    </style>
  `;

  const injectedScript = `
    function sendHeight() {
      const height = document.body.scrollHeight;
      const width = document.body.scrollWidth;
      // نرسل العرض والارتفاع
      window.ReactNativeWebView.postMessage(JSON.stringify({ height, width }));
    }
    
    window.onload = sendHeight;
    new ResizeObserver(sendHeight).observe(document.body);
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${cssStyles}
      </head>
      <body>
        <div class="table-wrapper">
          ${htmlCode}
        </div>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height: tableHeight }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={[styles.webview, { height: tableHeight }]}
        
        // --- إعدادات السكرول المتداخل (الجوهرية) ---
        scrollEnabled={true} 
        nestedScrollEnabled={true} // هذا هو المفتاح للأندرويد
        
        // إعدادات إضافية للأندرويد لتحسين الأداء وتمرير اللمس
        overScrollMode="always"
        androidLayerType="hardware"
        
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={isScrollable} // إظهار السكرول العمودي فقط إذا كان المحتوى طويلاً
        
        javaScriptEnabled={true}
        injectedJavaScript={injectedScript}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            const contentHeight = data.height;
            
            // 4. المنطق الذكي لتحديد الارتفاع
            // إذا كان المحتوى أصغر من الحد الأقصى، خذ ارتفاع المحتوى
            // إذا كان أكبر، خذ الحد الأقصى وفعّل السكرول الداخلي
            if (contentHeight > MAX_TABLE_HEIGHT) {
                setTableHeight(MAX_TABLE_HEIGHT);
                setIsScrollable(true);
            } else {
                setTableHeight(contentHeight + 15); // هامش بسيط
                setIsScrollable(false);
            }
          } catch(e) {
             // Fallback للقيم القديمة في حال حدوث خطأ
             const h = Number(event.nativeEvent.data);
             if (h > 0) setTableHeight(Math.min(h + 15, MAX_TABLE_HEIGHT));
          }
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#38BDF8" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 8, // إضافة حواف دائرية للكونتينر ليظهر بشكل أفضل عند وجود سكرول
    borderWidth: 1,
    borderColor: '#334155',
  },
  webview: {
    backgroundColor: 'transparent',
    width: '100%',
    opacity: 0.99,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  }
});

export default React.memo(HtmlTable);