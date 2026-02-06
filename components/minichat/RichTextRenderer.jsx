// components/minichat/RichTextRenderer.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const getTextDirection = (text) => {
  if (!text) return 'right';
  const isArabic = /[\u0600-\u06FF]/.test(text);
  return isArabic ? 'right' : 'left';
};

const parseInlineStyles = (text) => {
  if (!text) return [];
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'bold', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return parts;
};

const RichTextRenderer = React.memo(({ text, isBot }) => {
  if (!text || typeof text !== 'string') return null;
  
  const lines = text.split('\n');
  const textAlign = getTextDirection(text);
  const alignStyle = { textAlign: textAlign };
  const containerAlign = { alignItems: textAlign === 'left' ? 'flex-start' : 'flex-end' };

  return (
    <View style={[styles.container, containerAlign]}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        const key = `${index}`;

        if (trimmed === '') return <View key={key} style={styles.spacer} />;
        
        // Headers
        if (trimmed.startsWith('# ')) 
          return <Text key={key} style={[styles.h1, { color: isBot ? '#1e293b' : '#fff' }, alignStyle]}>{trimmed.substring(2).trim()}</Text>;
        if (trimmed.startsWith('## ')) 
          return <Text key={key} style={[styles.h2, { color: isBot ? '#334155' : '#e2e8f0' }, alignStyle]}>{trimmed.substring(3).trim()}</Text>;
        
        // Lists
        if (trimmed.startsWith('- ')) {
             const parts = parseInlineStyles(trimmed.substring(2).trim());
             return (
               <View key={key} style={[styles.listItem, { flexDirection: textAlign === 'left' ? 'row' : 'row-reverse' }]}>
                 <View style={[styles.bullet, { backgroundColor: isBot ? '#475569' : '#94a3b8' }]} />
                 <Text style={[styles.body, { color: isBot ? '#334155' : '#f1f5f9', flex: 1 }, alignStyle]}>
                    {parts.map((p, i) => (<Text key={i} style={p.type === 'bold' ? (isBot ? styles.boldBot : styles.boldUser) : {}}>{p.content}</Text>))}
                 </Text>
               </View>
             );
        }

        // Normal Text
        const parts = parseInlineStyles(line);
        return (
          <Text key={key} style={[styles.body, { color: isBot ? '#0f172a' : '#f8fafc', marginBottom: 4 }, alignStyle]}>
            {parts.map((p, i) => (<Text key={i} style={p.type === 'bold' ? (isBot ? styles.boldBot : styles.boldUser) : {}}>{p.content}</Text>))}
          </Text>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: 'column', width: '100%' },
  spacer: { height: 8 },
  h1: { fontSize: 18, fontWeight: '800', marginVertical: 6 },
  h2: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  listItem: { alignItems: 'flex-start', marginVertical: 2 },
  bullet: { width: 5, height: 5, borderRadius: 2.5, marginTop: 9, marginHorizontal: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  boldBot: { fontWeight: '800', color: '#0F172A' },
  boldUser: { fontWeight: '800', color: '#FFFFFF' },
});

export default RichTextRenderer;