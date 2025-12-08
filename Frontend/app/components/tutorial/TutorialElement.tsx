import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTutorial } from '../../contexts/TutorialContext';

interface TutorialElementProps {
  id: string;
  children: React.ReactNode;
}

export default function TutorialElement({ id, children }: TutorialElementProps) {
  const { registerElement, isActive, currentStep, steps } = useTutorial();
  const viewRef = useRef<View>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const isTarget = isActive && steps[currentStep]?.targetRef === id;

  const measureElement = () => {
    if (isActive && steps[currentStep]?.targetRef === id) {
      // Measure element position
      viewRef.current?.measure((x, y, width, height, pageX, pageY) => {
        registerElement(id, {
          x: pageX,
          y: pageY,
          width,
          height,
        });
      });
    }
  };

  useEffect(() => {
    measureElement();
  }, [isActive, currentStep, steps, id, registerElement]);

  // Animate glow effect when this element is the target
  useEffect(() => {
    if (isTarget) {
      // Start pulsing glow animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [isTarget, glowAnim]);

  // Re-measure on layout changes (e.g., when scrolling)
  const handleLayout = () => {
    // Small delay to ensure layout is complete
    setTimeout(measureElement, 100);
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16],
  });

  return (
    <Animated.View 
      ref={viewRef} 
      collapsable={false}
      onLayout={handleLayout}
      style={[
        isTarget && {
          shadowColor: '#A855F7',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: glowOpacity,
          shadowRadius: glowRadius,
          elevation: 15,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

