import React from 'react';
import { View, Text } from 'react-native';
import Particles from '@/components/ui/starsParticlesBackground';
import HabitShadowCircle from '@/components/ui/habitShadowCircle';
import GreyButton from '@/components/ui/greyButton';
import BackwardButton from '@/components/ui/backwardButton';
import { useRouter } from 'expo-router';

export default function ChooseHabitCategory() {
  const router = useRouter();

  /*const handleCategoryPress = (category: string) => {
    router.push({
      pathname: '/PredefinedHabits',
      params: { category }
    });
  };*/

  const chooseHabitPress = () => {
    router.push('/screens/dashboard/createHabit');
  };

  return (
    <View className="flex-1 relative">
      <Particles />
      
      <View className="flex-1 px-5 pt-20 pb-5">
        <BackwardButton />

        <Text className="font-wix text-[32px] text-center text-white mb-8 leading-tight">
          Choose from Predefined Productivity Habits
        </Text>
        
        <View className="flex-1 justify-center items-center">
          <View className="flex-row justify-center mb-12 gap-8">
            <HabitShadowCircle 
              label="Study Everyday"
              onPress={() => handleCategoryPress('productivity')}
            />
            <HabitShadowCircle
              label="Reduce Screen Time"
              onPress={() => handleCategoryPress('fitness')}
            />
          </View>
          <View className="flex-row justify-center mb-12 gap-8">
            <HabitShadowCircle
              label="Wake up Early"
              onPress={() => handleCategoryPress('selfcare')}
            />
            <HabitShadowCircle
              label="Stop Procrastinating"
              onPress={() => handleCategoryPress('selfcare')}
            />
          </View>
        </View>
        
        <View className="mt-auto">
          <View className="flex-row justify-center items-center mb-6">
            <View className="flex-1 h-[1px] bg-white" />
            <Text className="mx-4 text-white font-wix text-sm">OR</Text>
            <View className="flex-1 h-[1px] bg-white" />
          </View>
          
          <View className="items-center">
            <GreyButton
                onPress={chooseHabitPress}
                text="CREATE YOUR OWN HABIT"
            />
          </View>
        </View>
      </View>
    </View>
  );
}