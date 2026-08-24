import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme/styles';

export const LearnScreen = () => {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.description}>Educational resources and courses.</Text>
    </View>
  );
};
