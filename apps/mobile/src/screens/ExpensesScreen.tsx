import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme/styles';

export const ExpensesScreen = () => {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Expenses</Text>
      <Text style={styles.description}>Track your expenses here.</Text>
    </View>
  );
};
