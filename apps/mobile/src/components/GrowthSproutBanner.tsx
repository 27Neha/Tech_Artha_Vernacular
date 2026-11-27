import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
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
  minHeight?: number;
  maxHeight?: number;
  flexGrow?: number;
}

export const GrowthSproutBanner: React.FC<GrowthSproutBannerProps> = ({
  height,
  minHeight,
  maxHeight,
  flexGrow,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  // Natural aspect height so the full 350x98 artwork (leaf tips, spores, sunrise & waves) always fits 100%
  const naturalHeight = Math.round(Math.min(windowWidth - 32, 520) * (96 / 350));
  const resolvedMinHeight = minHeight ?? height ?? Math.max(76, naturalHeight);

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: resolvedMinHeight,
          ...(maxHeight ? { maxHeight: Math.max(maxHeight, resolvedMinHeight) } : {}),
          ...(flexGrow !== undefined ? { flexGrow } : { height: height ?? resolvedMinHeight }),
        },
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 -6 350 98"
        preserveAspectRatio="xMidYMax meet"
      >
        <Defs>
          {/* Back Wave Gradient (Soft Lavender to Canvas) */}
          <LinearGradient id="backWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#E9D5FF" stopOpacity="0.48" />
            <Stop offset="65%" stopColor="#DDD6FE" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>

          {/* Mid Wave Gradient (Gentle Violet Mist) */}
          <LinearGradient id="midWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#D8B4FE" stopOpacity="0.58" />
            <Stop offset="55%" stopColor="#C4B5FD" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>

          {/* Front Wave Gradient (Undulating Silky Foreground) */}
          <LinearGradient id="frontWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#C084FC" stopOpacity="0.54" />
            <Stop offset="45%" stopColor="#A855F7" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>

          {/* Sprout Leaf Gradient (Translucent Royal Lavender with Golden Highlight) */}
          <LinearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.82" />
            <Stop offset="55%" stopColor="#A855F7" stopOpacity="0.90" />
            <Stop offset="100%" stopColor="#FFD188" stopOpacity="0.98" />
          </LinearGradient>

          {/* Ambient Morning Sunrise Aura Gradient */}
          <LinearGradient id="sunriseGlow" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFAE42" stopOpacity="0.30" />
            <Stop offset="50%" stopColor="#F7941D" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#F8F9FD" stopOpacity="0.00" />
          </LinearGradient>
        </Defs>

        {/* Ambient Warm Horizon Glow in Background */}
        <Circle cx="292" cy="38" r="40" fill="url(#sunriseGlow)" />
        <Circle cx="292" cy="38" r="26" fill="#FFAE42" opacity={0.18} />

        {/* Layer 1: Ethereal Back Wave (extended wide [-240..590] so wide displays stay edge-to-edge) */}
        <Path
          d="M -240 58 C -150 44, -80 62, -10 52 C 60 40, 130 62, 205 44 C 255 32, 305 38, 360 26 C 430 16, 510 34, 590 24 L 590 94 L -240 94 Z"
          fill="url(#backWaveGrad)"
        />
        <Path
          d="M -240 58 C -150 44, -80 62, -10 52 C 60 40, 130 62, 205 44 C 255 32, 305 38, 360 26 C 430 16, 510 34, 590 24"
          fill="none"
          stroke="#F3E8FF"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Layer 2: Mid Wave with Gentle Curves */}
        <Path
          d="M -240 70 C -145 54, -75 74, -10 66 C 75 48, 150 72, 230 52 C 275 42, 315 48, 360 40 C 435 30, 510 46, 590 38 L 590 94 L -240 94 Z"
          fill="url(#midWaveGrad)"
        />
        <Path
          d="M -240 70 C -145 54, -75 74, -10 66 C 75 48, 150 72, 230 52 C 275 42, 315 48, 360 40 C 435 30, 510 46, 590 38"
          fill="none"
          stroke="#EDE9FE"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.78"
        />

        {/* Layer 3: Foreground Wave (Where the Sprout emerges) */}
        <Path
          d="M -240 80 C -140 70, -70 84, -10 78 C 65 68, 140 82, 220 66 C 265 56, 305 62, 360 52 C 435 44, 510 58, 590 50 L 590 94 L -240 94 Z"
          fill="url(#frontWaveGrad)"
        />
        <Path
          d="M -240 80 C -140 70, -70 84, -10 78 C 65 68, 140 82, 220 66 C 265 56, 305 62, 360 52 C 435 44, 510 58, 590 50"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* ======================================================== */}
        {/* THE SPROUT / SEEDLING (100% within safe viewBox bounds)  */}
        {/* ======================================================== */}
        <G>
          {/* Subtle root anchor glow */}
          <Circle cx="292" cy="61" r="5.5" fill="#A855F7" opacity="0.34" />

          {/* Slender Sprout Stem */}
          <Path
            d="M 292 61 Q 293 45 292 32"
            fill="none"
            stroke="#9333EA"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <Path
            d="M 292 61 Q 293 45 292 32"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.85"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Left Leaf (Curving gently upward-left) */}
          <Path
            d="M 291 37 C 280 37, 269 32, 263 22 C 272 18, 284 22, 291 31 Z"
            fill="url(#leafGrad)"
            stroke="#C084FC"
            strokeWidth="1.1"
          />
          {/* Left Leaf Center Vein */}
          <Path
            d="M 291 35 Q 278 30 265 23"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.85"
            opacity="0.68"
          />

          {/* Right Leaf (Reaching upward-right towards the sunrise) */}
          <Path
            d="M 292 34 C 301 32, 309 25, 315 14 C 315 25, 307 34, 293 35 Z"
            fill="url(#leafGrad)"
            stroke="#C084FC"
            strokeWidth="1.1"
          />
          {/* Right Leaf Center Vein */}
          <Path
            d="M 292 33 Q 305 26 314 15"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.85"
            opacity="0.68"
          />

          {/* Golden tip sparkles on sprout leaves */}
          <Circle cx="263" cy="22" r="1.7" fill="#FFAE42" opacity="0.92" />
          <Circle cx="315" cy="14" r="2.0" fill="#FFAE42" opacity="0.96" />
          <Circle cx="315" cy="14" r="0.9" fill="#FFFFFF" />
        </G>

        {/* Floating ethereal golden spores rising into the sky */}
        <Circle cx="254" cy="19" r="1.3" fill="#FFAE42" opacity="0.55" />
        <Circle cx="279" cy="11" r="1.7" fill="#FFD188" opacity="0.78" />
        <Circle cx="279" cy="11" r="0.7" fill="#FFFFFF" />
        <Circle cx="326" cy="24" r="1.4" fill="#A855F7" opacity="0.65" />
        <Circle cx="301" cy="7" r="1.2" fill="#FFAE42" opacity="0.60" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    marginVertical: 2,
    backgroundColor: 'transparent',
  },
});

export default GrowthSproutBanner;
