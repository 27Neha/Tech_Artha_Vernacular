import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from '../theme/styles';

interface HeaderProps {
  title: string;
  /** Present only for backward compatibility with callers that still pass it. */
  back?: string;
  onBack?: () => void;
}

export const Header = ({ title, back, onBack }: HeaderProps) => (
  <View style={styles.header}>
    {onBack ? (
      <Pressable onPress={onBack}>
        <Text style={styles.back}>‹</Text>
      </Pressable>
    ) : (
      <View style={styles.backPlaceholder} />
    )}
    <Text style={styles.headerTitle}>{title}</Text>
    <Text style={styles.language}>English</Text>
  </View>
);
