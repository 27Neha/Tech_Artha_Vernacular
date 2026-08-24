import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme/styles';

export const PortfolioScreen = () => {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Portfolio</Text>
      <Text style={styles.description}>Your investments and portfolio will appear here.</Text>
    </View>
  );
};
