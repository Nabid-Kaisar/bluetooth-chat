import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {Message} from '../types';

interface Props {
  message: Message;
}

export default function MessageBubble({message}: Props) {
  const isMe = message.sender === 'me';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.text, isMe ? styles.textMe : styles.textThem]}>
          {message.text}
        </Text>
        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeThem]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {marginVertical: 4, flexDirection: 'row'},
  rowMe: {justifyContent: 'flex-end'},
  rowThem: {justifyContent: 'flex-start'},
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  bubbleMe: {backgroundColor: '#007AFF', borderBottomRightRadius: 4},
  bubbleThem: {backgroundColor: '#E5E5EA', borderBottomLeftRadius: 4},
  text: {fontSize: 16, lineHeight: 22},
  textMe: {color: '#fff'},
  textThem: {color: '#1C1C1E'},
  time: {fontSize: 10, marginTop: 2, alignSelf: 'flex-end'},
  timeMe: {color: 'rgba(255,255,255,0.7)'},
  timeThem: {color: '#8E8E93'},
});
