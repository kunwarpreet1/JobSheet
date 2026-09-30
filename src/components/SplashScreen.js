import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, {
  Line,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

/**
 * 3D Origami Paper Boat SVG
 * Clean geometric paper folds tailored for warm light (#FFFBF7) canvas
 */
function PaperBoat({ size = 126, accentColor = '#6366F1' }) {
  const width = size;
  const height = size * 0.72;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 72" style={styles.boatShadow}>
      <Defs>
        <LinearGradient id="sailLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#F8FAFC" />
        </LinearGradient>
        <LinearGradient id="sailShadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E2E8F0" />
          <Stop offset="100%" stopColor="#CBD5E1" />
        </LinearGradient>
        <LinearGradient id="hullFront" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#F1F5F9" />
        </LinearGradient>
        <LinearGradient id="hullDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#CBD5E1" />
          <Stop offset="100%" stopColor="#94A3B8" />
        </LinearGradient>
      </Defs>

      {/* 1. Cockpit Inner Depth Fold */}
      <Polygon points="26,42 50,34 74,42 50,42" fill="#64748B" opacity={0.5} />

      {/* 2. Left Sail (Folded shadow side) */}
      <Polygon points="50,8 24,42 50,42" fill="url(#sailShadow)" />

      {/* 3. Right Sail (Reflective illuminated side) */}
      <Polygon points="50,8 76,42 50,42" fill="url(#sailLight)" />

      {/* 4. Center Crease Line */}
      <Line x1="50" y1="8" x2="50" y2="42" stroke="#94A3B8" strokeWidth="0.8" opacity={0.6} />

      {/* 5. Origami Sail Peak Accent Flag */}
      <Polygon points="50,8 57,13 50,17" fill={accentColor} />

      {/* 6. Hull Far-Left Point */}
      <Polygon points="6,42 26,42 18,62" fill="#CBD5E1" />

      {/* 7. Hull Mid-Left Panel */}
      <Polygon points="26,42 50,42 50,64 18,62" fill="url(#hullDark)" opacity={0.9} />

      {/* 8. Hull Mid-Right Panel (Highlight) */}
      <Polygon points="50,42 74,42 82,62 50,64" fill="url(#hullFront)" />

      {/* 9. Hull Far-Right Point */}
      <Polygon points="74,42 94,42 82,62" fill="#FFFFFF" />

      {/* 10. Crisp Paper Fold Edge Lines */}
      <Line x1="6" y1="42" x2="94" y2="42" stroke="#CBD5E1" strokeWidth="1" opacity={0.8} />
      <Line x1="18" y1="62" x2="50" y2="64" stroke="#94A3B8" strokeWidth="0.8" opacity={0.5} />
      <Line x1="50" y1="64" x2="82" y2="62" stroke="#E2E8F0" strokeWidth="0.8" opacity={0.8} />
    </Svg>
  );
}

/**
 * Paper Boat Splash Screen
 * Seamless light theme (#FFFBF7) matching the entire app:
 * 1. Boat floats gently on concentric water ripples
 * 2. Speed trails form behind keel
 * 3. Boat rockets UPWARDS off the top of the screen at high speed
 * 4. Screen smoothly unmounts to reveal Login screen with ZERO blink / flicker
 */
export default function SplashScreen({ onFinish }) {
  // Animation values
  const boatY = useRef(new Animated.Value(0)).current;
  const boatScale = useRef(new Animated.Value(0.7)).current;
  const boatScaleY = useRef(new Animated.Value(1)).current;
  const boatRotate = useRef(new Animated.Value(0)).current;
  const boatOpacity = useRef(new Animated.Value(0)).current;

  // Ripples under the boat
  const rippleScale1 = useRef(new Animated.Value(0.3)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.8)).current;
  const rippleScale2 = useRef(new Animated.Value(0.2)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0)).current;

  // Speed lines & glow trails
  const speedLinesOpacity = useRef(new Animated.Value(0)).current;
  const speedLinesY = useRef(new Animated.Value(0)).current;
  const glowTrailScale = useRef(new Animated.Value(0)).current;

  // Title & branding
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(16)).current;

  // Overall container fade-out on completion
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stage 1: Fade-in & gentle boat entrance
    Animated.parallel([
      Animated.timing(boatOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(boatScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: 500,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 1b: Floating water ripples
    Animated.parallel([
      Animated.timing(rippleScale1, {
        toValue: 2.2,
        duration: 850,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity1, {
        toValue: 0,
        duration: 850,
        useNativeDriver: true,
      }),
    ]).start();

    const rippleTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(rippleOpacity2, {
          toValue: 0.6,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(rippleScale2, {
          toValue: 2.0,
          duration: 750,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity2, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Stage 1c: Gentle ocean bobbing (rocking back & forth)
    Animated.sequence([
      Animated.timing(boatRotate, {
        toValue: -3,
        duration: 300,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(boatRotate, {
        toValue: 3,
        duration: 300,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(boatRotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 2: Speed charge & thruster trails (starts at 800ms)
    const timer1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(boatRotate, {
          toValue: -5,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(speedLinesOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(speedLinesY, {
          toValue: 140,
          duration: 550,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(glowTrailScale, {
          toValue: 1.4,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }, 750);

    // Stage 3: Hyperspeed upward rocket blast (starts at 1150ms)
    const timer2 = setTimeout(() => {
      Animated.parallel([
        // Boat shoots straight UP with high-speed acceleration
        Animated.timing(boatY, {
          toValue: -SCREEN_HEIGHT * 0.95,
          duration: 500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        // Aerodynamic stretch along Y axis (speed blur effect)
        Animated.sequence([
          Animated.timing(boatScaleY, {
            toValue: 1.5,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(boatScaleY, {
            toValue: 0.9,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
        // Scale dynamics during flight
        Animated.sequence([
          Animated.timing(boatScale, {
            toValue: 1.25,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(boatScale, {
            toValue: 0.5,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(boatRotate, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        // Title smoothly fades away as boat blasts off
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1100);

    // Stage 4: Seamless fade into LoginScreen (starts at 1550ms)
    // Both screens share #FFFBF7 background, so this is 100% flicker-free!
    const timer3 = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 1550);

    return () => {
      clearTimeout(rippleTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = boatRotate.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: screenOpacity,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFBF7" />

      {/* Central Animation Stage (Centers boat & effects in the true center of the screen) */}
      <View style={styles.centerStage}>
        {/* Ambient background glow orb */}
        <View style={styles.ambientGlow} />

        {/* Ripple Effects directly beneath boat keel */}
        <View style={styles.rippleContainer}>
          <Animated.View
            style={[
              styles.rippleRing,
              {
                transform: [
                  { scaleX: rippleScale1 },
                  {
                    scaleY: rippleScale1.interpolate({
                      inputRange: [0, 3],
                      outputRange: [0, 0.85],
                    }),
                  },
                ],
                opacity: rippleOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              styles.rippleRingSecondary,
              {
                transform: [
                  { scaleX: rippleScale2 },
                  {
                    scaleY: rippleScale2.interpolate({
                      inputRange: [0, 3],
                      outputRange: [0, 0.85],
                    }),
                  },
                ],
                opacity: rippleOpacity2,
              },
            ]}
          />
        </View>

        {/* Speed Lines trailing behind boat */}
        <Animated.View
          style={[
            styles.speedLinesContainer,
            {
              opacity: speedLinesOpacity,
              transform: [{ translateY: speedLinesY }],
            },
          ]}
        >
          <View style={[styles.speedLine, styles.speedLine1]} />
          <View style={[styles.speedLine, styles.speedLine2]} />
          <View style={[styles.speedLine, styles.speedLine3]} />
          <View style={[styles.speedLine, styles.speedLine4]} />
          <View style={[styles.speedLine, styles.speedLine5]} />
          <View style={[styles.speedLine, styles.speedLine6]} />
        </Animated.View>

        {/* Animated Paper Boat */}
        <Animated.View
          style={[
            styles.boatWrapper,
            {
              opacity: boatOpacity,
              transform: [
                { translateY: boatY },
                { scale: boatScale },
                { scaleY: boatScaleY },
                { rotate: spin },
              ],
            },
          ]}
        >
          {/* Subtle warm glow halo right at the keel */}
          <Animated.View
            style={[
              styles.boatGlow,
              {
                transform: [{ scale: glowTrailScale }],
                opacity: glowTrailScale.interpolate({
                  inputRange: [0, 1.4],
                  outputRange: [0, 0.35],
                }),
              },
            ]}
          />
          <PaperBoat size={126} accentColor="#6366F1" />
        </Animated.View>
      </View>

      {/* App Branding & Tagline */}
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
          },
        ]}
      >
        <Text style={styles.brandTitle}>
          JobSheet<Text style={styles.brandAccent}>Flow</Text>
        </Text>
        <Text style={styles.brandSubtitle}>Smooth Operations • Seamless Craft</Text>

        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBarGlow} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFBF7',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  centerStage: {
    width: '100%',
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#EEF2FF',
    opacity: 0.9,
  },
  rippleContainer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: 140,
    height: 55,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.32)',
    backgroundColor: 'transparent',
  },
  rippleRingSecondary: {
    width: 180,
    height: 70,
    borderRadius: 90,
    borderColor: 'rgba(59, 130, 246, 0.22)',
    borderWidth: 1,
  },
  speedLinesContainer: {
    position: 'absolute',
    bottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedLine: {
    position: 'absolute',
    width: 2.5,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  speedLine1: {
    height: 70,
    left: -24,
    opacity: 0.45,
  },
  speedLine2: {
    height: 110,
    left: -8,
    opacity: 0.8,
    backgroundColor: '#3B82F6',
  },
  speedLine3: {
    height: 130,
    left: 8,
    opacity: 0.85,
    backgroundColor: '#818CF8',
  },
  speedLine4: {
    height: 75,
    left: 24,
    opacity: 0.45,
  },
  speedLine5: {
    height: 45,
    left: -40,
    opacity: 0.25,
  },
  speedLine6: {
    height: 50,
    left: 40,
    opacity: 0.25,
  },
  boatWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  boatGlow: {
    position: 'absolute',
    bottom: -10,
    width: 90,
    height: 35,
    borderRadius: 20,
    backgroundColor: '#818CF8',
    opacity: 0.3,
  },
  boatShadow: {
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 75,
    alignItems: 'center',
    width: '100%',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  brandAccent: {
    color: '#6366F1',
  },
  brandSubtitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  progressBarWrapper: {
    marginTop: 20,
    width: 110,
    height: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarGlow: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
});
