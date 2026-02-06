
// components/minichat/MessageItem.jsx (أو الملف المنفصل MermaidDiagram.jsx)
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const MermaidDiagram = ({ chartCode }) => {
  const [height, setHeight] = useState(200);
  const [loading, setLoading] = useState(true);

  if (!chartCode) return null;

  // 1. تحديد نوع المخطط
  const isFlowchart = useMemo(() => {
    const code = chartCode.trim();
    // التحقق مما إذا كان يبدأ بـ graph أو flowchart
    return code.startsWith('graph') || code.startsWith('flowchart');
  }, [chartCode]);

  // 2. إعدادات مختلفة حسب النوع
  // Flowchart: يحاول احتواء العرض (Responsive)
  // Mindmap: يأخذ العرض الذي يحتاجه (Scrollable)
  const cssStyles = isFlowchart 
    ? `
      /* ستايل الفلوتشارت: عرض كامل وتوسيط */
      body { margin: 0; padding: 0; display: flex; justify-content: center; }
      #container { width: 100%; display: flex; justify-content: center; }
    `
    : `
      /* ستايل المايند ماب: سكرول وتمدد */
      body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: auto; }
      #container { width: max-content; min-width: 100%; padding: 20px; box-sizing: border-box; display: flex; justify-content: center; }
    `;

  const mermaidConfigMaxWidth = isFlowchart ? 'true' : 'false';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <style>
          ${cssStyles}
        </style>
        <script>
          mermaid.initialize({ 
            startOnLoad: true, 
            theme: 'base',
            securityLevel: 'loose',
            flowchart: { 
                curve: 'basis', 
                useMaxWidth: ${mermaidConfigMaxWidth} 
            },
            themeVariables: {
              fontFamily: 'sans-serif',
              primaryColor: '#e0e7ff',
              edgeLabelBackground: '#ffffff',
            }
          });

          window.onload = function() {
             setTimeout(() => {
                const container = document.getElementById('container');
                // للفلوتشارت نأخذ الارتفاع فقط، للمايند ماب نأخذ الحسبان للهوامش
                const height = container.scrollHeight; 
                window.ReactNativeWebView.postMessage(height);
             }, ${isFlowchart ? 500 : 800}); 
          }
        </script>
      </head>
      <body>
        <div id="container" class="mermaid">
          ${chartCode}
        </div>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height: height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        // تفعيل السكرول فقط للأنواع غير الفلوتشارت (مثل المايند ماب)
        scrollEnabled={!isFlowchart} 
        showsHorizontalScrollIndicator={!isFlowchart}
        showsVerticalScrollIndicator={false}
        onMessage={(event) => {
          const contentHeight = parseInt(event.nativeEvent.data, 10);
          if (contentHeight > 20) {
            setHeight(contentHeight + 20); // هامش بسيط
            setLoading(false);
          }
        }}
        javaScriptEnabled={true}
        nestedScrollEnabled={!isFlowchart}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 100, // تقليل الحد الأدنى للارتفاع
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
    opacity: 0.99,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});

export default React.memo(MermaidDiagram);