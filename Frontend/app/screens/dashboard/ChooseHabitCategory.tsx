import React from 'react';
import { View, Text } from 'react-native';
import Particles from 'app/components/space/whiteStarsParticlesBackground';
import HabitShadowCircle from '@/components/ui/habitShadowCircle';
import GreyButton from '@/components/ui/greyButton';
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

  const categories = [
    { label: 'Productivity', category: 'productivity' },
    { label: 'Health & Fitness', category: 'fitness' },
    { label: 'Self Care', category: 'selfcare' },
  ];

  return (
    <View className="flex-1 relative bg-transparent">
      <Particles />

      <View className="flex-1 px-5 pt-20">
        <Text className="font-wix text-[38px] text-center text-white leading-tight">
          Choose your{'\n'}Habit Category
        </Text>

        <View className="flex-row flex-wrap justify-center mt-16">
          {categories.map((cat, index) => (
            <View
              key={index}
              className="m-4"
              style={{
                width: '40%',
                alignItems: 'center',
              }}
            >
              <HabitShadowCircle
                label={cat.label}
                onPress={() => handleCategoryPress(cat.category)}
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
              style={{ marginTop: 40, marginBottom: 60 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
