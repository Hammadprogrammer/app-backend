import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

const CRIMSON = '#DC2626';

interface SosButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function SosButton({ onPress, loading = false, disabled = false }: SosButtonProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pulseRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trigger SOS emergency alert"
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
        >
          <Text style={styles.sosText}>{loading ? '...' : 'SOS'}</Text>
          <Text style={styles.subText}>{loading ? 'SENDING' : 'TAP FOR HELP'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const SIZE = 200;

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE * 1.6,
    height: SIZE * 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: CRIMSON,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: CRIMSON,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: CRIMSON,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
  },
  subText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
});
