import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../theme/styles';

export const ProfileScreen = () => {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.description}>Your user profile settings.</Text>
    </View>
  );
};
