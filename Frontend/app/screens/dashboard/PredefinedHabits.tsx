import React from 'react';
import { View, Text } from 'react-native';
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground';
import HabitShadowCircle from '@/components/ui/habitShadowCircle';
import GreyButton from '@/components/ui/greyButton';
import BackwardButton from '@/components/ui/backwardButton';
import OrComponent from '@/components/ui/or';
import { useRouter } from 'expo-router';

export default function ChooseHabitCategory() {
  const router = useRouter();

  const handleCategoryPress = (category: string) => {
    router.push({
      pathname: '/screens/dashboard/predefinedHabits',
      params: { category },
    });
  };

  const chooseHabitPress = () => {
    router.push('/screens/dashboard/createHabit');
  };

  const habits = [
    { label: 'Study everyday', category: 'productivity' },
    { label: 'Reduce screen time', category: 'fitness' },
    { label: 'Wake up early', category: 'selfcare' },
    { label: 'Stop procrastinating', category: 'selfcare' },
  ];

  return (
    <View className="flex-1 relative bg-transparent">
      <WhiteParticles />
      
      <View className="absolute mt-6 left-8 z-50">
        <BackwardButton />
      </View>

      <View className="flex-1 px-5 pt-20 pb-5">
        <Text className="font-wix text-[38px] text-center text-white mt-6 leading-tight">
          Choose from Predefined Productivity Habits
        </Text>

        {/* Automatic grid layout */}
        <View className="flex-row flex-wrap justify-center mt-10">
          {habits.map((habit, index) => (
            <View
              key={index}
              className="m-4" // controls spacing
              style={{
                width: '40%', // fits 2 per row roughly
                alignItems: 'center',
              }}
            >
              <HabitShadowCircle
                label={habit.label}
                onPress={() => handleCategoryPress(habit.category)}
              />
            </View>
          ))}
        </View>

        <View className="mt-auto">
          <OrComponent />

          <View className="items-center">
            <GreyButton
              onPress={chooseHabitPress}
              text="CREATE YOUR OWN HABIT"
              style={{ marginTop: 40, marginBottom: 40 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
