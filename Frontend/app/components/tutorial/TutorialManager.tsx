import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useTutorial } from '../../contexts/TutorialContext';
import TutorialOverlay from './TutorialOverlay';

export default function TutorialManager() {
  const { isActive, currentStep, steps, nextStep, skipTutorial, getElementPosition } = useTutorial();
  const router = useRouter();
  const segments = useSegments();
  const [targetPosition, setTargetPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateTargetPosition = (targetRef?: string) => {
    if (targetRef) {
      const position = getElementPosition(targetRef);
      if (position) {
        setTargetPosition(position);
      } else {
        // Retry after a short delay
        setTimeout(() => {
          const retryPosition = getElementPosition(targetRef);
          if (retryPosition) {
            setTargetPosition(retryPosition);
          }
        }, 300);
      }
    } else {
      setTargetPosition(null);
    }
  };

  useEffect(() => {
    if (!isActive || steps.length === 0) {
      // Clear interval when tutorial is not active
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    const step = steps[currentStep];
    if (!step) return;

    const currentPath = '/' + segments.join('/');
    const targetScreen = step.screen;

    // Navigate to the required screen if needed
    if (targetScreen && currentPath !== targetScreen && !hasNavigated) {
      setHasNavigated(true);
      router.push(targetScreen as any);
      // Wait for navigation to complete
      setTimeout(() => {
        updateTargetPosition(step.targetRef);
        setHasNavigated(false);
      }, 800);
    } else {
      // Small delay to ensure elements are rendered
      setTimeout(() => {
        updateTargetPosition(step.targetRef);
      }, 300);
    }

    // Set up interval to update position periodically (for scrolling)
    if (step.targetRef) {
      // Clear any existing interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      // Update position every 100ms to track scrolling
      updateIntervalRef.current = setInterval(() => {
        updateTargetPosition(step.targetRef);
      }, 100);
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    }

    // Execute action if provided
    if (step.action) {
      setTimeout(() => step.action?.(), 500);
    }

    // Cleanup interval on unmount or step change
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isActive, currentStep, steps, segments]);

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];
  if (!step) return null;

  return (
    <TutorialOverlay
      visible={isActive}
      title={step.title}
      description={step.description}
      position={step.position || 'bottom'}
      targetPosition={targetPosition || undefined}
      onNext={nextStep}
      onSkip={skipTutorial}
      step={currentStep + 1}
      totalSteps={steps.length}
    />
  );
}

