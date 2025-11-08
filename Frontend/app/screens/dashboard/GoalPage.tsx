import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import PurpleParticles from "app/components/space/purpleStarsParticlesBackground";
import GreyButton from "@/components/ui/greyButton";

export default function GoalDetails() {
  const router = useRouter();

  const handleEditPress = () => {
    router.push("/edit-goal");
  };

  return (
    <View className="flex-1 relative">
      <PurpleParticles />

      <ScrollView
        className="flex-1 px-6 pt-12"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text className="font-wix text-white text-[38px] text-center">
          Study for Algo
        </Text>

        {/* Progress + Check-in row */}
        <View className="flex-row justify-center items-center mt-6">
          {/* Progress Circle */}
          <View className="w-24 h-24 rounded-full border-[6px] border-[#7C4DFF] justify-center items-center">
            <Text className="text-white font-bold text-xl">50%</Text>
          </View>

          {/* Check-in button */}
          <View className="ml-6 bg-[#B49EFF] px-6 py-3 rounded-2xl">
            <Text className="text-black font-semibold">CHECK IN</Text>
          </View>
        </View>

        {/* Partnership + Habit boxes */}
        <View className="flex-row justify-center mt-6 space-x-4">
          <View className="bg-white rounded-2xl w-40 h-20 justify-center items-center">
            <Text className="font-bold text-base">PARTNERSHIP</Text>
            <Text className="text-gray-500 text-sm">Partner Name</Text>
          </View>

          <View className="bg-white rounded-2xl w-40 h-20 justify-center items-center">
            <Text className="font-bold text-base">HABIT</Text>
            <Text className="text-gray-500 text-sm">Study Everyday</Text>
          </View>
        </View>

        {/* Progress visualizations */}
        <View className="mt-8 bg-[#3a006e] rounded-2xl p-6 h-32 justify-center items-center">
          <Text className="text-white font-semibold">
            PROGRESS VISUALIZATION
          </Text>
        </View>

        <View className="mt-6 bg-[#3a006e] rounded-2xl p-6 h-32 justify-center items-center">
          <Text className="text-white font-semibold">
            PROGRESS VISUALIZATION
          </Text>
        </View>

        {/* Edit Goal Button */}
        <View className="mt-8">
          <GreyButton onPress={handleEditPress} text="EDIT GOAL" />
        </View>
      </ScrollView>
    </View>
  );
}
