
// components/minichat/MessageItem.jsx
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Text 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';

// Components
import NeuralTypingIndicator from './NeuralTypingIndicator'; 
import RichTextRenderer from './RichTextRenderer';
import SourcesWidget from './SourcesWidget';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import MessageAttachmentsRenderer from './MessageAttachmentsRenderer';
import MermaidDiagram from './MermaidDiagram'; 
import GenQuiz from '../gen-ui/GenQuiz'; 
import GenFlashcards from '../gen-ui/GenFlashcards'; // ✅ Added Import
import HtmlTable from './HtmlTable'; 

// ✅ Helper function to convert Markdown Table to HTML
const convertMarkdownTableToHtml = (markdown) => {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return null;

  let html = '<table>';
  
  // Handle Header
  const headerLine = lines[0];
  if (headerLine.includes('|')) {
    html += '<thead><tr>';
    const headers = headerLine.split('|').filter(cell => cell.trim() !== '');
    headers.forEach(h => {
      html += `<th>${h.trim()}</th>`;
    });
    html += '</tr></thead>';
  }

  html += '<tbody>';
  // Skip separator line (e.g., |---|---|)
  const startIndex = lines.length > 1 && lines[1].includes('---') ? 2 : 1;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || !line.includes('|')) continue;
    
    html += '<tr>';
    const cells = line.split('|');
    
    // Clean empty cells at start/end resulting from split
    const cleanCells = cells.filter((c, idx) => {
        // Keep middle cells even if empty, remove only strict start/end empty splits
        return !(idx === 0 && c.trim() === '') && !(idx === cells.length - 1 && c.trim() === '');
    });

    cleanCells.forEach(cell => {
      // Basic support for bold text inside cells
      let content = cell.trim().replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      html += `<td>${content}</td>`;
    });
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  return html;
};

const MessageItem = React.memo(({ 
  message, 
  onLongPressMessage, 
  disableAnim, 
  showTyping, 
  direction, 
  onCopy,
  onReport,
  onImagePress,
  onWidgetAction
}) => {
  if (!message) return null;
  const BOT_ID = 'bot-fab'; 
  
  const isBot = message.author?.id === BOT_ID || message.role === 'assistant';

  // ✅ 2. Updated Content Analysis: Text, Mermaid, HTML, Quiz, Flashcards, and Markdown Tables
  const { contentParts, widgetData, widgetType } = useMemo(() => {
    if (!message.text || typeof message.text !== 'string') {
      return { contentParts: [], widgetData: null, widgetType: null };
    }

    let textToProcess = message.text;
    let foundData = null;
    let type = null;

    // A. Extract JSON Widget (Quiz OR Flashcards)
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = textToProcess.match(jsonRegex);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        
        // Handle direct type or nested widgets array structure
        const detectedType = parsed.type || (parsed.widgets && parsed.widgets[0]?.type);

        if (detectedType === 'quiz' || detectedType === 'flashcards') {
          type = detectedType;
          // Extract data depending on structure
          foundData = parsed.data || (parsed.widgets ? parsed.widgets[0].data : parsed);
          
          // Remove the JSON block from the visible text
          textToProcess = textToProcess.replace(jsonMatch[0], '').trim();
        }
      } catch (e) {
        console.log("⚠️ MessageItem JSON Parse Error:", e);
      }
    }

    // B. Split text based on Code Blocks (Mermaid/HTML) OR Markdown Tables
    const parts = [];
    
    // Regex breakdown:
    // 1. ```(mermaid|html) ... ``` -> Captures explicit code blocks
    // 2. | (\n\|.*\|.*(?:\n\|.*\|.*)+) -> Captures Markdown tables (lines starting with |)
    const combinedRegex = /```(mermaid|html)\s*([\s\S]*?)\s*```|(\n\|.*\|.*(?:\n\|.*\|.*)+)/g;

    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(textToProcess)) !== null) {
      // 1. Add preceding plain text
      if (match.index > lastIndex) {
        parts.push({ 
          type: 'text', 
          content: textToProcess.slice(lastIndex, match.index) 
        });
      }

      // 2. Handle matches
      if (match[1]) {
        // Case: Explicit Code Block (mermaid or html)
        parts.push({ 
          type: match[1], 
          content: match[2] 
        });
      } else if (match[3]) {
        // Case: Markdown Table detected
        // Convert immediate Markdown to HTML
        const htmlTable = convertMarkdownTableToHtml(match[3]);
        if (htmlTable) {
            parts.push({ 
              type: 'html', // Set type to 'html' so HtmlTable renders it
              content: htmlTable 
            });
        } else {
            // Conversion failed, treat as text
            parts.push({ type: 'text', content: match[3] });
        }
      }
      
      lastIndex = match.index + match[0].length;
    }

    // 3. Add remaining text
    if (lastIndex < textToProcess.length) {
      parts.push({ 
        type: 'text', 
        content: textToProcess.slice(lastIndex) 
      });
    }

    return { contentParts: parts, widgetData: foundData, widgetType: type };
  }, [message.text]);

  const finalAttachments = useMemo(() => {
    return message.attachments || message.files || [];
  }, [message.attachments, message.files]);

  const hasAttachments = finalAttachments.length > 0;
  const hasContent = contentParts.length > 0 || widgetData;
  const sources = message.sources || message.metadata?.sources || [];
  const hasSources = isBot && sources.length > 0;
  const isAudio = message.isAudio || message.type === 'audio' || (message.attachments && message.attachments.some(a => a.mime?.startsWith('audio')));
  const audioUri = message.audioUri || (message.attachments?.find(a => a.mime?.startsWith('audio'))?.url);
  
  const shouldRenderBubble = hasContent || hasSources || isAudio;

  // --- Typing State ---
   if (message.type === 'typing') { 
    return showTyping ? (
      <MotiView 
        from={{ opacity: 0, translateY: 5 }} 
        animate={{ opacity: 1, translateY: 0 }} 
        style={styles.typingContainer}
      >
        <View style={styles.typingBubble}>
          <NeuralTypingIndicator />
        </View>
      </MotiView>
    ) : null; 
  }

  // --- Error State ---
  if (message.isError) {
    return (
       <MotiView 
         from={{ opacity: 0, scale: 0.95 }} 
         animate={{ opacity: 1, scale: 1 }}
         style={[styles.row, styles.rowBot]}
       >
           <View style={[styles.bubble, styles.bubbleBot, { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]}>
               <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                   <FontAwesome5 name="exclamation-circle" size={14} color="#EF4444" style={{marginRight: 6}}/>
                   <Text style={{color: '#EF4444', fontWeight: 'bold', fontSize: 12}}>Error</Text>
               </View>
               <Text style={{color: '#7F1D1D', fontSize: 14}}>{message.text}</Text>
           </View>
       </MotiView>
    );
 }

  // --- Bubble Content ---
    const TextContent = () => {
    if (isAudio && audioUri) {
      return (
        <VoiceMessagePlayer 
          audioUri={audioUri} 
          duration={message.duration}
          isUser={!isBot}
        />
      );
    }

    return (
      <View>
        {/* Render Content Parts */}
        {contentParts.map((part, index) => {
          if (part.type === 'mermaid') {
            return (
              <MermaidDiagram 
                key={`mermaid-${index}`} 
                chartCode={part.content} 
              />
            );
          }
          if (part.type === 'html') {
            // ✅ Renders both raw HTML blocks AND converted Markdown tables
            return (
              <HtmlTable 
                key={`html-${index}`} 
                htmlCode={part.content} 
              />
            );
          }
          return (
            <RichTextRenderer 
              key={`text-${index}`} 
              text={part.content} 
              isBot={isBot} 
            />
          );
        })}

        {/* ✅ Render Widgets Dynamically */}
        {widgetType === 'quiz' && widgetData && (
          <GenQuiz 
            data={widgetData} 
            onAction={onWidgetAction}
            messageId={message.id}
          />
        )}

        {widgetType === 'flashcards' && widgetData && (
          <GenFlashcards 
            data={widgetData} 
          />
        )}
        
        {/* Sources Widget */}
        {hasSources && (
            <SourcesWidget 
              sources={sources} 
              direction={direction || 'ltr'} 
            />
        )}
      </View>
    );
  };

  const renderBubble = () => {
    if (!shouldRenderBubble) return null;

    if (isBot) {
      return (
        <View style={[styles.bubble, styles.bubbleBot]}>
          <TextContent />
        </View>
      );
    }
    
    return (
      <LinearGradient
        colors={['#0EA5A4', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, styles.bubbleUser]}
      >
        <TextContent />
      </LinearGradient>
    );
  };

  const content = (
      <View style={[styles.row, isBot ? styles.rowBot : styles.rowUser]}>
        <Pressable 
            onLongPress={() => onLongPressMessage && onLongPressMessage(message)} 
            style={[styles.baseWrapper, isBot ? styles.wrapperBot : styles.wrapperUser]}
        >
          {hasAttachments && (
            <View style={[
              styles.attachmentsContainer,
              !isBot ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
              shouldRenderBubble && { marginBottom: 6 } 
            ]}>
               <MessageAttachmentsRenderer 
                  attachments={finalAttachments} 
                  onImagePress={onImagePress} 
               />
            </View>
          )}

          {renderBubble()}

          {isBot && shouldRenderBubble && (
            <View style={styles.toolsRow}>
              <TouchableOpacity onPress={onReport} style={styles.toolBtn} hitSlop={12}>
                <FontAwesome5 name="flag" size={12} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onCopy && onCopy(message.text)} style={styles.toolBtn} hitSlop={12}>
                <FontAwesome5 name="copy" size={12} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

        </Pressable>
      </View>
  );

  if (disableAnim) {
    return <View style={styles.fullWidth}>{content}</View>;
  }

  return (
    <View style={{ width: '100%' }}>
      <MotiView 
        from={{ opacity: 0, scale: 0.98, translateY: 10 }} 
        animate={{ opacity: 1, scale: 1, translateY: 0 }} 
        transition={{ type: 'timing', duration: 200 }} 
      >
        {content}
      </MotiView>
    </View>
  );
}, (prevProps, nextProps) => {
   
    const prevAtt = prevProps.message.attachments || prevProps.message.files || [];
    const nextAtt = nextProps.message.attachments || nextProps.message.files || [];
    
    return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.text === nextProps.message.text &&
        prevAtt.length === nextAtt.length &&
        prevProps.message.isError === nextProps.message.isError &&
        // ✅ Ensure button updates when function changes
        prevProps.onWidgetAction === nextProps.onWidgetAction 
    );
});

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  
  row: { 
    flexDirection: 'row', 
    marginVertical: 4, 
    width: '100%',
    paddingHorizontal: 0,
  },

  rowBot: { justifyContent: 'center' }, 
  rowUser: { justifyContent: 'flex-end', paddingRight: 4 },

  baseWrapper: {},

  wrapperBot: { 
    width: '97%',        
    maxWidth: '97%',     
    alignSelf: 'center', 
    alignItems: 'stretch' 
  },

  wrapperUser: { 
    maxWidth: '85%',     
    alignItems: 'flex-end' 
  },

  attachmentsContainer: {
    width: '100%',
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    width: '100%',
    borderBottomLeftRadius: 4, 
  },
  
  bubbleUser: {
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end', 
  },
  
  typingContainer: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 8,
  },
  
  typingBubble: {
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 12, 
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
    gap: 16,
  },
  
  toolBtn: {
    padding: 6,
    opacity: 0.7,
  },
});

export default MessageItem;