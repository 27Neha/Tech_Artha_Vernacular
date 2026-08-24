import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from '../theme/styles';
import { Screen } from '../types';

interface HeaderProps {
  title: string;
  back?: Screen;
  onBack?: (screen: Screen) => void;
}

export const Header = ({ title, back, onBack }: HeaderProps) => (
  <View style={styles.header}>
    {back && onBack ? (
      <Pressable onPress={() => onBack(back)}>
        <Text style={styles.back}>‹</Text>
      </Pressable>
    ) : (
      <View style={styles.backPlaceholder} />
    )}
    <Text style={styles.headerTitle}>{title}</Text>
    <Text style={styles.language}>English</Text>
  </View>
);
