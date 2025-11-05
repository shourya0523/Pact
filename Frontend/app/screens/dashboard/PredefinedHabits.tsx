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
      <WhiteParticles />
      
      <View className="flex-1 px-5 pt-20 pb-5">
        <BackwardButton />

        <Text className="font-wix text-[32px] text-center text-white mb-8 leading-tight">
          Choose from Predefined Productivity Habits
        </Text>
        
          <View className="flex-row flex-wrap justify-center mt-12">
            <HabitShadowCircle 
              label="Study everyday"
              onPress={() => handleCategoryPress('productivity')}
            />
            <HabitShadowCircle
              label="Reduce screen time"
              onPress={() => handleCategoryPress('fitness')}
            />
            <HabitShadowCircle
              label="Wake up early"
              onPress={() => handleCategoryPress('selfcare')}
            />
            <HabitShadowCircle
              label="Stop procrastinating"
              onPress={() => handleCategoryPress('selfcare')}
            />
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