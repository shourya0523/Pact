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
    router.push('/screens/dashboard/PredefinedHabits');
  };

  return (
    <View className="flex-1 relative">
      <Particles />
      
      <View className="flex-1 px-5 pt-20 pb-5">
        <Text className="font-wix text-[48px] text-center text-white mb-8 leading-tight">
          Choose your{'\n'}Habit Category
        </Text>
        
        <View className="flex justify-center items-center mt-12">
          <View className="flex-row flex-wrap justify-center">
            <HabitShadowCircle 
              label="Productivity"
              onPress={() => router.push('/screens/dashboard/predefinedHabits')}
            />
            <HabitShadowCircle
              label="Health & Fitness"
              onPress={() => handleCategoryPress('fitness')}
            />
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
              style={{ marginTop: 40, marginBottom: 40 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}