import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface TutorialOverlayProps {
  visible: boolean;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  targetPosition?: { x: number; y: number; width: number; height: number };
  onNext: () => void;
  onSkip: () => void;
  step: number;
  totalSteps: number;
  showSkip?: boolean;
}

export default function TutorialOverlay({
  visible,
  title,
  description,
  position = 'bottom',
  targetPosition,
  onNext,
  onSkip,
  step,
  totalSteps,
  showSkip = true,
}: TutorialOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  if (!visible) return null;

  // Calculate tooltip position based on target element with bounds checking
  const getTooltipStyle = () => {
    const tooltipWidth = Math.min(300, width - 32); // Responsive width with padding
    const tooltipHeight = 200; // Increased to account for content
    const spacing = 20;
    const padding = 16; // Padding from screen edges

    if (!targetPosition) {
      // Center position if no target
      return {
        top: Math.max(padding, Math.min(height / 2 - tooltipHeight / 2, height - tooltipHeight - padding)),
        left: Math.max(padding, Math.min(width / 2 - tooltipWidth / 2, width - tooltipWidth - padding)),
      };
    }

    const { x, y, width: targetWidth, height: targetHeight } = targetPosition;
    let tooltipTop = 0;
    let tooltipLeft = 0;

    switch (position) {
      case 'top':
        tooltipTop = y - tooltipHeight - spacing;
        tooltipLeft = x + targetWidth / 2 - tooltipWidth / 2;
        // If tooltip goes above screen, place it below instead
        if (tooltipTop < padding) {
          tooltipTop = y + targetHeight + spacing;
        }
        break;
      case 'bottom':
        tooltipTop = y + targetHeight + spacing;
        tooltipLeft = x + targetWidth / 2 - tooltipWidth / 2;
        // If tooltip goes below screen, place it above instead
        if (tooltipTop + tooltipHeight > height - padding) {
          tooltipTop = y - tooltipHeight - spacing;
        }
        break;
      case 'left':
        tooltipTop = y + targetHeight / 2 - tooltipHeight / 2;
        tooltipLeft = x - tooltipWidth - spacing;
        // If tooltip goes off left edge, place it to the right
        if (tooltipLeft < padding) {
          tooltipLeft = x + targetWidth + spacing;
        }
        break;
      case 'right':
        tooltipTop = y + targetHeight / 2 - tooltipHeight / 2;
        tooltipLeft = x + targetWidth + spacing;
        // If tooltip goes off right edge, place it to the left
        if (tooltipLeft + tooltipWidth > width - padding) {
          tooltipLeft = x - tooltipWidth - spacing;
        }
        break;
      default:
        tooltipTop = y + targetHeight + spacing;
        tooltipLeft = x + targetWidth / 2 - tooltipWidth / 2;
        // If tooltip goes below screen, place it above instead
        if (tooltipTop + tooltipHeight > height - padding) {
          tooltipTop = y - tooltipHeight - spacing;
        }
    }

    // Ensure tooltip stays within screen bounds
    tooltipTop = Math.max(padding, Math.min(tooltipTop, height - tooltipHeight - padding));
    tooltipLeft = Math.max(padding, Math.min(tooltipLeft, width - tooltipWidth - padding));

    return {
      top: tooltipTop,
      left: tooltipLeft,
    };
  };

  const tooltipStyle = getTooltipStyle();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Light overlay with cutout - visible but allows scrolls to pass through */}
      <View style={styles.overlay} pointerEvents="box-none">
        {targetPosition && (
          <View
            style={[
              styles.cutout,
              {
                left: targetPosition.x - 10,
                top: targetPosition.y - 10,
                width: targetPosition.width + 20,
                height: targetPosition.height + 20,
              },
            ]}
            pointerEvents="none"
          />
        )}
      </View>

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            tooltipStyle,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              width: Math.min(300, width - 32),
            },
          ]}
          pointerEvents="auto"
        >
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(step / totalSteps) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Step {step} of {totalSteps}
            </Text>
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            {showSkip && (
              <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onNext} style={styles.nextButton}>
              <Text style={styles.nextText}>
                {step === totalSteps ? 'Got it!' : 'Next'}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color="#fff"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cutout: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltip: {
    position: 'absolute',
    width: 300,
    maxWidth: '90%',
    backgroundColor: '#2D1B4E',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10000,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'WixMadeforText-Regular',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'WixMadeforText-Regular',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'WixMadeforText-Regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'WixMadeforText-Regular',
  },
  nextButton: {
    backgroundColor: '#A855F7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'WixMadeforText-Regular',
    fontWeight: '600',
  },
});

