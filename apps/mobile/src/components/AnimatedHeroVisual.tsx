import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect, Path, LinearGradient, Stop, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnimatedHeroVisual() {
  const lineAnim = useRef(new Animated.Value(1000)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entry scale and opacity
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Line drawing animation
    Animated.timing(lineAnim, {
      toValue: 0,
      duration: 1500,
      delay: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Floating animations (looping)
    const floatLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, { toValue: -6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim1, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    
    const floatLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, { toValue: 6, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim2, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    // Pulse animation (looping)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    floatLoop1.start();
    floatLoop2.start();
    pulseLoop.start();

    return () => {
      floatLoop1.stop();
      floatLoop2.stop();
      pulseLoop.stop();
    };
  }, []);

  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });

  // Fallback dimension width for scaling properly without breaking
  const { width } = Dimensions.get('window');
  
  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Background Glow */}
      <View style={styles.glow} />

      <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <Pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <Circle cx="2" cy="2" r="1.5" fill="#3C3985" opacity="0.3" />
          </Pattern>

          <LinearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3C3985" stopOpacity="1" />
            <Stop offset="100%" stopColor="#102A54" stopOpacity="1" />
          </LinearGradient>
          
          <LinearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFAE42" stopOpacity="1" />
            <Stop offset="100%" stopColor="#DD6B20" stopOpacity="1" />
          </LinearGradient>
          
          <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#3C3985" stopOpacity="0.2" />
            <Stop offset="50%" stopColor="#3C3985" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#DD6B20" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Abstract Grid Pattern */}
        <Rect width="100%" height="100%" fill="url(#gridPattern)" />

        {/* Rising Growth Line */}
        <AnimatedPath
          d="M 20 160 C 80 150, 120 140, 180 110 C 240 80, 280 60, 360 40"
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={1000}
          strokeDashoffset={lineAnim}
        />

        {/* Floating Abstract Coin / Node 1 (Navy/Purple) */}
        <AnimatedG y={floatAnim1 as any}>
          <Circle cx="90" cy="110" r="14" fill="url(#primaryGrad)" opacity="0.9" />
          <Circle cx="90" cy="110" r="6" fill="#EBEBFA" opacity="0.6" />
        </AnimatedG>

        {/* Floating Data Node 2 (Orange) */}
        <AnimatedG y={floatAnim2 as any}>
          <Circle cx="210" cy="70" r="10" fill="url(#orangeGrad)" />
        </AnimatedG>

        {/* High Point Glow Node */}
        <G>
          <Circle cx="360" cy="40" r="8" fill="#DD6B20" />
          {/* Animated Glow */}
          <AnimatedCircle 
            cx="360" 
            cy="40" 
            r="18" 
            fill="#DD6B20" 
            opacity={pulseOpacity}
            scale={pulseScale as any} originX="360" originY="40"
          />
        </G>

        {/* Subtle Geometric Ring (Translucent Depth) */}
        <AnimatedG y={floatAnim1 as any}>
          <Circle cx="290" cy="130" r="28" fill="none" stroke="#EBEBFA" strokeWidth="3" opacity="0.7" />
          <Circle cx="290" cy="130" r="18" fill="none" stroke="#EBEBFA" strokeWidth="1" opacity="0.5" />
        </AnimatedG>
        
        {/* Floating Particles */}
        <AnimatedCircle cx="50" cy="60" r="3" fill="#3C3985" opacity="0.4" y={floatAnim1 as any} />
        <AnimatedCircle cx="160" cy="150" r="4" fill="#DD6B20" opacity="0.3" y={floatAnim2 as any} />
        <AnimatedCircle cx="330" cy="100" r="2" fill="#102A54" opacity="0.3" y={floatAnim1 as any} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
    width: '100%',
    marginTop: 8, marginBottom: 8,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#fff',
  },
  glow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F8F9FB', // simulating a subtle glow behind
  }
});
