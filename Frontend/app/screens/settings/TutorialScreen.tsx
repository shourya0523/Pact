import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackwardButton from '@/components/ui/backwardButton';
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground';
import { useTutorial } from '../../contexts/TutorialContext';
import { Ionicons } from '@expo/vector-icons';

interface TutorialStepInfo {
  title: string;
  description: string;
  icon: string;
  screen: string;
  targetRef?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tutorialSteps: TutorialStepInfo[] = [
  {
    title: 'Welcome to Pact!',
    description: 'Let\'s take a quick tour of your habit tracking app. I\'ll guide you through the key features step by step.',
    icon: 'rocket',
    screen: '/screens/dashboard/Home',
    position: 'center',
  },
  {
    title: 'Your Dashboard',
    description: 'This is your Home screen! Here you can see your activity summary, streaks, today\'s goals, and your partner\'s progress. Pull down to refresh.',
    icon: 'home',
    screen: '/screens/dashboard/Home',
    targetRef: 'dashboard-greeting',
    position: 'bottom',
  },
  {
    title: 'Activity Summary',
    description: 'Quickly view your stats at a glance! Tap any card to jump to that section - Partners, Habits, Goals, or Check-ins.',
    icon: 'stats-chart',
    screen: '/screens/dashboard/Home',
    targetRef: 'activity-summary',
    position: 'bottom',
  },
  {
    title: 'Check In Daily',
    description: 'Tap on any habit in "Today\'s Goals" to check in. Your partner will see your progress in real-time!',
    icon: 'checkmark-circle',
    screen: '/screens/dashboard/Home',
    targetRef: 'todays-goals',
    position: 'bottom',
  },
  {
    title: 'View Your Streaks',
    description: 'See your current streak counts here. The longer your streak, the more motivated you\'ll stay!',
    icon: 'flame',
    screen: '/screens/dashboard/Home',
    targetRef: 'streaks-section',
    position: 'bottom',
  },
  {
    title: 'Bottom Navigation',
    description: 'Use the bottom navigation bar to quickly switch between screens. You have 5 main sections: Home, Stats, Partners, Notifications, and Profile.',
    icon: 'navigate',
    screen: '/screens/dashboard/Home',
    position: 'bottom',
  },
  {
    title: 'All Your Habits',
    description: 'Tap the Stats icon in the bottom navigation to see all your habits with detailed progress, charts, and analytics.',
    icon: 'stats-chart',
    screen: '/screens/dashboard/HabitViews',
    targetRef: 'habits-list',
    position: 'bottom',
  },
  {
    title: 'Find a Partner',
    description: 'Tap the People icon in the bottom navigation to find and connect with partners. You can search by username or email.',
    icon: 'people',
    screen: '/screens/dashboard/ViewAllPartnerships',
    targetRef: 'partnerships-screen',
    position: 'bottom',
  },
  {
    title: 'Create a Habit',
    description: 'To create a new habit, tap the "Add New Habit" button. You can build new habits or break old ones with your partner!',
    icon: 'add-circle',
    screen: '/screens/dashboard/HabitViews',
    targetRef: 'create-habit-button',
    position: 'top',
  },
  {
    title: 'Notifications',
    description: 'Tap the bell icon in the bottom navigation to see notifications. You\'ll get reminders, partner updates, nudges, and check-in reminders here.',
    icon: 'notifications',
    screen: '/screens/dashboard/Notifications',
    targetRef: 'notifications-list',
    position: 'bottom',
  },
  {
    title: 'Your Profile',
    description: 'Tap your profile icon in the bottom navigation to manage your account, view settings, customize preferences, and access the tutorial again.',
    icon: 'person',
    screen: '/screens/dashboard/profile',
    targetRef: 'profile-screen',
    position: 'bottom',
  },
  {
    title: 'You\'re All Set!',
    description: 'You now know the basics! Start by creating your first habit and finding a partner. Happy tracking! 🎉',
    icon: 'checkmark-done',
    screen: '/screens/dashboard/Home',
    position: 'center',
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const { startTutorial } = useTutorial();

  const handleStartTutorial = async () => {
    // Mark tutorial as shown
    await AsyncStorage.setItem('tutorial_shown', 'true');
    
    // Start the interactive tutorial
    startTutorial(tutorialSteps.map(step => ({
      id: step.icon,
      screen: step.screen,
      title: step.title,
      description: step.description,
      targetRef: step.targetRef,
      position: step.position || 'bottom',
    })));
    
    // Navigate to first screen
    router.push('/screens/dashboard/Home');
  };

  return (
    <View className="flex-1 relative" style={{ backgroundColor: '#291133' }}>
      <PurpleParticles />
      
      {/* Back button */}
      <View className="absolute mt-6 left-8 z-50">
        <BackwardButton onPress={() => router.back()} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 100,
          paddingBottom: 140,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-8">
          <View className="w-32 h-32 bg-purple-500/20 rounded-full items-center justify-center mb-6 border-4 border-purple-400/30">
            <Ionicons name="school" size={64} color="#A855F7" />
          </View>
          <Text className="text-white text-[36px] font-wix text-center mb-4">
            Interactive Tutorial
          </Text>
          <Text className="text-white/70 text-lg font-wix text-center mb-8">
            Let's walk through the app together!
          </Text>
        </View>

        {/* Tutorial Overview */}
        <View className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
          <Text className="text-white text-xl font-wix mb-4">
            What You'll Learn
          </Text>
          {tutorialSteps.slice(0, -1).map((step, index) => (
            <View key={index} className="flex-row items-start mb-3">
              <View className="w-6 h-6 bg-purple-500/30 rounded-full items-center justify-center mr-3 mt-1">
                <Ionicons name={step.icon as any} size={14} color="#A855F7" />
              </View>
              <Text className="flex-1 text-white/90 text-base font-wix">
                {step.title}
              </Text>
            </View>
          ))}
        </View>

        {/* How It Works */}
        <View className="bg-purple-500/10 rounded-2xl p-6 border border-purple-400/20 mb-6">
          <Text className="text-white text-xl font-wix mb-3">
            How It Works
          </Text>
          <View className="space-y-3">
            <View className="flex-row items-start">
              <Ionicons name="location" size={20} color="#A855F7" style={{ marginRight: 12, marginTop: 2 }} />
              <Text className="flex-1 text-white/90 text-base font-wix">
                We'll navigate through actual screens
              </Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="radio-button-on" size={20} color="#A855F7" style={{ marginRight: 12, marginTop: 2 }} />
              <Text className="flex-1 text-white/90 text-base font-wix">
                Key features will be highlighted
              </Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="arrow-forward" size={20} color="#A855F7" style={{ marginRight: 12, marginTop: 2 }} />
              <Text className="flex-1 text-white/90 text-base font-wix">
                Follow along step by step
              </Text>
            </View>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          onPress={handleStartTutorial}
          className="bg-purple-600 rounded-2xl p-5 items-center justify-center mb-6"
        >
          <View className="flex-row items-center">
            <Ionicons name="play" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white font-wix text-xl font-semibold">
              Start Interactive Tutorial
            </Text>
          </View>
        </TouchableOpacity>

        <View className="bg-white/10 rounded-2xl p-4 border border-white/20">
          <Text className="text-white/70 text-sm text-center font-wix">
            💡 Tip: You can skip any step or revisit this tutorial anytime from Settings → Help
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
