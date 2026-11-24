import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';

/**
 * Exact pixel dimensions and aspect ratio of the official TechArtha lockup asset
 * (`apps/mobile/assets/logo.png`: symbol + "TechArtha" wordmark + "FINANCE SIMPLIFIED").
 */
export const ORIGINAL_LOGO_PIXEL_WIDTH = 724;
export const ORIGINAL_LOGO_PIXEL_HEIGHT = 187;
export const ORIGINAL_LOGO_ASPECT_RATIO =
  ORIGINAL_LOGO_PIXEL_WIDTH / ORIGINAL_LOGO_PIXEL_HEIGHT;

/** Standardized fixed header logo dimensions across all screens. */
export const HEADER_LOGO_WIDTH = 144;
export const HEADER_LOGO_HEIGHT = 37;

interface TechArthaLogoProps {
  size?: 'header' | 'small' | 'medium' | 'large';
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export const TechArthaLogo: React.FC<TechArthaLogoProps> = ({
  size = 'header',
  width,
  height,
  style,
}) => {
  const defaultDimensions = {
    header: { width: HEADER_LOGO_WIDTH, height: HEADER_LOGO_HEIGHT },
    small: { width: 116, height: 30 },
    medium: { width: HEADER_LOGO_WIDTH, height: HEADER_LOGO_HEIGHT },
    large: { width: 174, height: 45 },
  }[size];

  const finalDimensions =
    width && height
      ? { width, height }
      : {
          width: defaultDimensions.width,
          height: defaultDimensions.height,
        };

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Image
        testID="techartha-brand-logo"
        source={require('../../assets/logo.png')}
        style={[
          styles.image,
          finalDimensions,
          { aspectRatio: ORIGINAL_LOGO_ASPECT_RATIO },
        ]}
        resizeMode="contain"
        accessibilityLabel="TechArtha Finance Simplified"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  image: {
    flexShrink: 0,
  },
});

export default TechArthaLogo;
