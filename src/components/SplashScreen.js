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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 3D Origami Paper Boat SVG
 * Clean geometric paper folds with authentic light/shadow facets
 */
function PaperBoat({ size = 110, accentColor = '#6366F1' }) {
  const width = size;
  const height = size * 0.72;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 72" style={styles.boatShadow}>
      <Defs>
        <LinearGradient id="sailLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E0E7FF" />
        </LinearGradient>
        <LinearGradient id="sailShadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#CBD5E1" />
          <Stop offset="100%" stopColor="#94A3B8" />
        </LinearGradient>
        <LinearGradient id="hullFront" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#F8FAFC" />
          <Stop offset="100%" stopColor="#E2E8F0" />
        </LinearGradient>
        <LinearGradient id="hullDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#94A3B8" />
          <Stop offset="100%" stopColor="#64748B" />
        </LinearGradient>
      </Defs>

      {/* 1. Cockpit Inner Depth Fold */}
      <Polygon points="26,42 50,34 74,42 50,42" fill="#475569" opacity={0.75} />

      {/* 2. Left Sail (Folded shadow side) */}
      <Polygon points="50,8 24,42 50,42" fill="url(#sailShadow)" />

      {/* 3. Right Sail (Reflective illuminated side) */}
      <Polygon points="50,8 76,42 50,42" fill="url(#sailLight)" />

      {/* 4. Center Crease Line */}
      <Line x1="50" y1="8" x2="50" y2="42" stroke="#64748B" strokeWidth="0.8" opacity={0.6} />

      {/* 5. Origami Sail Peak Accent Flag */}
      <Polygon points="50,8 57,13 50,17" fill={accentColor} />

      {/* 6. Hull Far-Left Point */}
      <Polygon points="6,42 26,42 18,62" fill="#94A3B8" />

      {/* 7. Hull Mid-Left Panel */}
      <Polygon points="26,42 50,42 50,64 18,62" fill="url(#hullDark)" opacity={0.85} />

      {/* 8. Hull Mid-Right Panel (Highlight) */}
      <Polygon points="50,42 74,42 82,62 50,64" fill="url(#hullFront)" />

      {/* 9. Hull Far-Right Point */}
      <Polygon points="74,42 94,42 82,62" fill="#FFFFFF" />

      {/* 10. Crisp Paper Fold Edge Lines */}
      <Line x1="6" y1="42" x2="94" y2="42" stroke="#FFFFFF" strokeWidth="0.8" opacity={0.7} />
      <Line x1="18" y1="62" x2="50" y2="64" stroke="#64748B" strokeWidth="0.8" opacity={0.5} />
      <Line x1="50" y1="64" x2="82" y2="62" stroke="#CBD5E1" strokeWidth="0.8" opacity={0.7} />
    </Svg>
  );
}

/**
 * Cinematic Netflix-Style Paper Boat Splash Screen
 * 1. Gentle float on glowing water
 * 2. Ignition / speed lines gather beneath
 * 3. Hyperspeed rocket blast towards the top
 * 4. Netflix-style camera zoom & light burst transition into Login
 */
export default function SplashScreen({ onFinish }) {
  // Animation values
  const boatY = useRef(new Animated.Value(0)).current;
  const boatX = useRef(new Animated.Value(0)).current;
  const boatScale = useRef(new Animated.Value(0.7)).current;
  const boatScaleY = useRef(new Animated.Value(1)).current;
  const boatRotate = useRef(new Animated.Value(0)).current;
  const boatOpacity = useRef(new Animated.Value(0)).current;

  // Ripples under the boat
  const rippleScale1 = useRef(new Animated.Value(0.4)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.8)).current;
  const rippleScale2 = useRef(new Animated.Value(0.2)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0)).current;

  // Speed lines & glow trails
  const speedLinesOpacity = useRef(new Animated.Value(0)).current;
  const speedLinesY = useRef(new Animated.Value(0)).current;
  const glowTrailScale = useRef(new Animated.Value(0)).current;

  // Title & branding
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;

  // Netflix-style burst & screen exit
  const flashScale = useRef(new Animated.Value(0.01)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stage 1: Fade-in & gentle boat entrance
    Animated.parallel([
      Animated.timing(boatOpacity, {
        toValue: 1,
        duration: 500,
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
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 1b: Floating water ripples
    Animated.parallel([
      Animated.timing(rippleScale1, {
        toValue: 2.2,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity1, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(rippleOpacity2, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rippleScale2, {
          toValue: 2.0,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity2, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 350);

    // Stage 1c: Gentle ocean bobbing (rocking back & forth)
    Animated.sequence([
      Animated.timing(boatRotate, {
        toValue: -3,
        duration: 350,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(boatRotate, {
        toValue: 3,
        duration: 350,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(boatRotate, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 2: Speed charge & thruster trails (starts at 950ms)
    const timer1 = setTimeout(() => {
      // Boat tilts slightly back like launching
      Animated.parallel([
        Animated.timing(boatRotate, {
          toValue: -6,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(speedLinesOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(speedLinesY, {
          toValue: 120,
          duration: 600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(glowTrailScale, {
          toValue: 1.5,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);

    // Stage 3: Hyperspeed upward rocket blast (starts at 1350ms)
    const timer2 = setTimeout(() => {
      Animated.parallel([
        // Boat shoots straight UP with explosive acceleration
        Animated.timing(boatY, {
          toValue: -SCREEN_HEIGHT * 0.9,
          duration: 550,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        // Aerodynamic stretch along Y axis (motion blur effect)
        Animated.sequence([
          Animated.timing(boatScaleY, {
            toValue: 1.6,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(boatScaleY, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Scale grows as it zooms toward camera then exits
        Animated.sequence([
          Animated.timing(boatScale, {
            toValue: 1.35,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(boatScale, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(boatRotate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1300);

    // Stage 4: Netflix-Style Portal Bloom & Reveal Transition (starts at 1800ms)
    const timer3 = setTimeout(() => {
      Animated.parallel([
        // Luminous flash bloom
        Animated.timing(flashOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(flashScale, {
          toValue: 30,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Overall splash screen scales up like entering a portal
        Animated.timing(screenScale, {
          toValue: 1.15,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Fade out splash to reveal the Login screen
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 350,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onFinish) onFinish();
      });
    }, 1800);

    return () => {
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
          transform: [{ scale: screenScale }],
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#070B14" />

      {/* Ambient background glow orb */}
      <View style={styles.ambientGlow} />

      {/* Ripple Effects behind boat */}
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
                    outputRange: [0, 0.9],
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
                    outputRange: [0, 0.9],
                  }),
                },
              ],
              opacity: rippleOpacity2,
            },
          ]}
        />
      </View>

      {/* Speed Lines trailing behind */}
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
              { translateX: boatX },
              { scale: boatScale },
              { scaleY: boatScaleY },
              { rotate: spin },
            ],
          },
        ]}
      >
        {/* Glow halo right at the keel */}
        <Animated.View
          style={[
            styles.boatGlow,
            {
              transform: [{ scale: glowTrailScale }],
              opacity: glowTrailScale.interpolate({
                inputRange: [0, 1.5],
                outputRange: [0, 0.8],
              }),
            },
          ]}
        />
        <PaperBoat size={118} accentColor="#6366F1" />
      </Animated.View>

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

      {/* Netflix-Style Expanding White Flare / Flash on Exit */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flashBloom,
          {
            opacity: flashOpacity,
            transform: [{ scale: flashScale }],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070B14',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#3B82F6',
    opacity: 0.12,
    top: '36%',
  },
  rippleContainer: {
    position: 'absolute',
    top: '49%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: 140,
    height: 60,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    backgroundColor: 'transparent',
  },
  rippleRingSecondary: {
    width: 180,
    height: 75,
    borderRadius: 90,
    borderColor: '#818CF8',
    borderWidth: 1,
  },
  speedLinesContainer: {
    position: 'absolute',
    top: '52%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedLine: {
    position: 'absolute',
    width: 2.5,
    borderRadius: 2,
    backgroundColor: '#93C5FD',
  },
  speedLine1: {
    height: 70,
    left: -24,
    opacity: 0.6,
  },
  speedLine2: {
    height: 110,
    left: -8,
    opacity: 0.9,
    backgroundColor: '#60A5FA',
  },
  speedLine3: {
    height: 130,
    left: 8,
    opacity: 0.9,
    backgroundColor: '#818CF8',
  },
  speedLine4: {
    height: 75,
    left: 24,
    opacity: 0.6,
  },
  speedLine5: {
    height: 45,
    left: -40,
    opacity: 0.3,
  },
  speedLine6: {
    height: 50,
    left: 40,
    opacity: 0.3,
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
    backgroundColor: '#6366F1',
    opacity: 0.4,
  },
  boatShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 90,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(99, 102, 241, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  brandAccent: {
    color: '#6366F1',
  },
  brandSubtitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  progressBarWrapper: {
    marginTop: 22,
    width: 110,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarGlow: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  flashBloom: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    top: '30%',
    zIndex: 99999,
  },
});
