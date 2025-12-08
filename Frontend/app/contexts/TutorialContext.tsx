import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, LayoutRectangle } from 'react-native';

interface TutorialStep {
  id: string;
  screen: string;
  title: string;
  description: string;
  targetRef?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: (steps: TutorialStep[]) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  registerElement: (ref: string, layout: LayoutRectangle) => void;
  getElementPosition: (ref: string) => LayoutRectangle | null;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const elementPositions = useRef<Map<string, LayoutRectangle>>(new Map());

  const startTutorial = useCallback((tutorialSteps: TutorialStep[]) => {
    setSteps(tutorialSteps);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < steps.length - 1) {
        return prev + 1;
      } else {
        setIsActive(false);
        return prev;
      }
    });
  }, [steps.length]);

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
    elementPositions.current.clear();
  }, []);

  const registerElement = useCallback((ref: string, layout: LayoutRectangle) => {
    elementPositions.current.set(ref, layout);
  }, []);

  const getElementPosition = useCallback((ref: string) => {
    return elementPositions.current.get(ref) || null;
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        registerElement,
        getElementPosition,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

