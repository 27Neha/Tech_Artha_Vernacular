import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  G,
} from 'react-native-svg';

interface GrowthSproutBannerProps {
  height?: number;
}

export const GrowthSproutBanner: React.FC<GrowthSproutBannerProps> = ({ height = 86 }) => {
  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 350 90" preserveAspectRatio="none">
        <Defs>
          {/* Back Wave Gradient (Soft Lavender to Canvas) */}
          <LinearGradient id="backWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#E9D5FF" stopOpacity="0.45" />
            <Stop offset="60%" stopColor="#DDD6FE" stopOpacity="0.20" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>

          {/* Mid Wave Gradient (Gentle Violet Mist) */}
          <LinearGradient id="midWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#D8B4FE" stopOpacity="0.55" />
            <Stop offset="50%" stopColor="#C4B5FD" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>

          {/* Front Wave Gradient (Undulating Silky Foreground) */}
          <LinearGradient id="frontWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#C084FC" stopOpacity="0.50" />
            <Stop offset="40%" stopColor="#A855F7" stopOpacity="0.20" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>

          {/* Sprout Leaf Gradient (Translucent Royal Lavender with Golden Highlight) */}
          <LinearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.75" />
            <Stop offset="55%" stopColor="#A855F7" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#FFD188" stopOpacity="0.95" />
          </LinearGradient>

          {/* Ambient Morning Sunrise Aura Gradient */}
          <LinearGradient id="sunriseGlow" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFAE42" stopOpacity="0.28" />
            <Stop offset="50%" stopColor="#F7941D" stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>
        </Defs>

        {/* Ambient Warm Horizon Glow in Background */}
        <Circle cx="295" cy="38" r="42" fill="url(#sunriseGlow)" />
        <Circle cx="295" cy="38" r="28" fill="#FFAE42" opacity={0.16} />

        {/* Layer 1: Ethereal Back Wave */}
        <Path
          d="M -10 52 C 60 40, 130 62, 205 44 C 255 32, 305 38, 360 26 L 360 90 L -10 90 Z"
          fill="url(#backWaveGrad)"
        />
        {/* Soft edge highlight on back wave */}
        <Path
          d="M -10 52 C 60 40, 130 62, 205 44 C 255 32, 305 38, 360 26"
          fill="none"
          stroke="#F3E8FF"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Layer 2: Mid Wave with Gentle Curves */}
        <Path
          d="M -10 66 C 75 48, 150 72, 230 52 C 275 42, 315 48, 360 40 L 360 90 L -10 90 Z"
          fill="url(#midWaveGrad)"
        />
        {/* Soft crest highlight on mid wave */}
        <Path
          d="M -10 66 C 75 48, 150 72, 230 52 C 275 42, 315 48, 360 40"
          fill="none"
          stroke="#EDE9FE"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Layer 3: Foreground Wave (Where the Sprout emerges) */}
        <Path
          d="M -10 78 C 65 68, 140 82, 220 66 C 265 56, 305 62, 360 52 L 360 90 L -10 90 Z"
          fill="url(#frontWaveGrad)"
        />
        {/* Silky crest highlight */}
        <Path
          d="M -10 78 C 65 68, 140 82, 220 66 C 265 56, 305 62, 360 52"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* ======================================================== */}
        {/* THE SPROUT / SEEDLING (Growing on the right hill)        */}
        {/* ======================================================== */}
        <G>
          {/* Subtle root anchor glow */}
          <Circle cx="295" cy="62" r="5" fill="#A855F7" opacity="0.3" />

          {/* Slender Sprout Stem */}
          <Path
            d="M 295 62 Q 296 46 295 34"
            fill="none"
            stroke="#A855F7"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <Path
            d="M 295 62 Q 296 46 295 34"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Left Leaf (Curving gently upward-left) */}
          <Path
            d="M 294 38 C 284 38, 274 34, 268 25 C 276 21, 287 25, 294 33 Z"
            fill="url(#leafGrad)"
            stroke="#C084FC"
            strokeWidth="1"
          />
          {/* Left Leaf Center Vein */}
          <Path
            d="M 294 36 Q 282 32 270 26"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.75"
            opacity="0.6"
          />

          {/* Right Leaf (Reaching upward-right towards the sunrise) */}
          <Path
            d="M 295 35 C 303 33, 310 27, 315 17 C 315 27, 308 35, 296 36 Z"
            fill="url(#leafGrad)"
            stroke="#C084FC"
            strokeWidth="1"
          />
          {/* Right Leaf Center Vein */}
          <Path
            d="M 295 34 Q 306 28 314 18"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.75"
            opacity="0.6"
          />

          {/* Golden tip sparkles on sprout leaves */}
          <Circle cx="268" cy="25" r="1.5" fill="#FFAE42" opacity="0.9" />
          <Circle cx="315" cy="17" r="1.8" fill="#FFAE42" opacity="0.95" />
          <Circle cx="315" cy="17" r="0.8" fill="#FFFFFF" />
        </G>

        {/* Floating ethereal golden spores rising into the sky */}
        <Circle cx="258" cy="22" r="1.2" fill="#FFAE42" opacity="0.5" />
        <Circle cx="282" cy="14" r="1.6" fill="#FFD188" opacity="0.7" />
        <Circle cx="282" cy="14" r="0.6" fill="#FFFFFF" />
        <Circle cx="328" cy="26" r="1.3" fill="#A855F7" opacity="0.6" />
        <Circle cx="304" cy="10" r="1.1" fill="#FFAE42" opacity="0.55" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
});

export default GrowthSproutBanner;
