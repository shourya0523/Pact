import React from "react";
import { View, Text, Image } from "react-native";
import { useRouter } from "expo-router";
import HomeUI from "@/components/ui/home-ui";
import HabitSelect from "@/components/ui/habitSelect";
import ProgressCheck from "@/components/ui/progressCheck";
import PurpleParticles from "app/components/space/purpleStarsParticlesBackground";
import StreakIndicator from "app/components/habit/StreakIndicator";


export default function HomePage() {
  const router = useRouter();

  const streaks = [
    { name: "Study Everyday", flame: 4 },
    { name: "Reduce Screen Time", flame: 13 },
    { name: "Workout", flame: 1 },
    { name: "Wake Up Early", flame: 7 },
  ];

  const goals = [
    { id: "1", name: "Wake Up Early" },
    { id: "2", name: "Study Everyday" },
    { id: "3", name: "Workout" },
  ];

  const partnerProgress = [
    "Jake checked in for Study Everyday!",
    "Charles checked in for Wake Up Early!",
    "Becky checked in for Workout!",
  ];

  return (
    <View className="flex-1 relative bg-black">
      <PurpleParticles />
      <HomeUI />
      <Image
        source={require("app/images/space/nebula.png")}
        className="absolute top-0 left-0"
        style={{ width: 500, height: 420 }}
        resizeMode="cover"
      />

      <View className="w-full bg-white/10 pt-12 pb-6 px-6">
        <Text className="text-white text-[36px] font-wix">Hello, Mark!</Text>
      </View>

      <View className="mt-6 px-6">
        <Text className="text-white text-[28px] font-semibold mb-1">Streaks</Text>
        <View className="h-[1px] mb-2 bg-white" />
        {streaks.map((item, index) => (
          <View key={index} className="flex-row justify-between mb-2">
            <Text className="text-white text-[18px] ml-2">{item.name}</Text>
            <StreakIndicator currentStreak={item.flame} isActive={true} />
          </View>
        ))}
      </View>

      {/* Today's Goals */}
      <View className="mt-8 px-6">
        <Text className="text-white text-[28px] font-semibold">Check In</Text>
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-[22px]">Today's Goals</Text>
          <Text className="text-gray-300 text-xs">View All</Text>
        </View>

        <HabitSelect
          habits={goals}
          onPress={(habit) => console.log("Selected habit:", habit.name)}
        />
      </View>

      <View className="mt-8 px-6 mb-6">
        <Text className="text-white text-[28px] font-semibold mb-3">Partner Progress</Text>
        {partnerProgress.map((text, index) => (
          <ProgressCheck key={index} text={text} />
        ))}
      </View>
    </View>
  );
}
