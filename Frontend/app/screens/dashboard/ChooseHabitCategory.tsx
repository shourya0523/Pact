import React from 'react';
import { View, Text } from 'react-native';
import Particles from 'app/components/space/whiteStarsParticlesBackground';
import HabitShadowCircle from '@/components/ui/habitShadowCircle';
import GreyButton from '@/components/ui/greyButton';
import OrComponent from '@/components/ui/or';
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
    router.push('/screens/dashboard/createHabits');
  };

  return (
    <View className="flex-1 relative">
      <Particles />
      
      <View className="flex-1 px-5 pt-20 pb-5">
        <Text className="font-wix text-[32px] text-center text-white mb-8 leading-tight">
          Choose your{'\n'}Habit Category
        </Text>
        
        <View className="flex-1 justify-center items-center">
          <View className="flex-row justify-center mb-12 gap-8">
            <HabitShadowCircle 
              label="Productivity"
              onPress={() => handleCategoryPress('productivity')}
            />
            <HabitShadowCircle
              label="Health & Fitness"
              onPress={() => handleCategoryPress('fitness')}
            />
          </View>
          
          <View className="flex-row justify-center">
            <HabitShadowCircle
              label="Self Care"
              onPress={() => handleCategoryPress('selfcare')}
            />
          </View>
        </View>
        
        <View className="mt-auto">
          <OrComponent />
          
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