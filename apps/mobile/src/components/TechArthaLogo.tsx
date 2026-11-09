import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';

interface TechArthaLogoProps {
  size?: 'small' | 'medium' | 'large';
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export const TechArthaLogo: React.FC<TechArthaLogoProps> = ({ size = 'medium', width, height, style }) => {
  // True aspect ratio of the official artwork is 762 : 234 (~ 3.256 : 1)
  const defaultDimensions = {
    small: { width: 110, height: 34 },
    medium: { width: 140, height: 43 },
    large: { width: 195, height: 60 },
  }[size];

  const finalDimensions = width && height ? { width, height } : defaultDimensions;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../assets/techartha_logo.png')}
        style={[styles.image, finalDimensions]}
        resizeMode="contain"
        accessibilityLabel="TechArtha - Finance Simplified"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // Preserve natural crispness without scaling distortion
  },
});

export default TechArthaLogo;
