import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import PurpleParticles from "app/components/space/purpleStarsParticlesBackground";
import GreyButton from "@/components/ui/greyButton";
import ProgressCircle from "app/components/habit/ProgressCircle";

export default function GoalDetails() {
  const router = useRouter();

  const handleEditPress = () => {
    router.push("/edit-goal");
  };

  const handleCheckIn = () => {
    console.log("Check-in pressed!");
  };

  return (
    <View className="flex-1 relative">
      <PurpleParticles />

      <ScrollView
        className="flex-1 px-6 pt-12"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-wix text-white text-[38px] text-center">
          Study for Algo
        </Text>

        <View className="flex-row justify-center items-center mt-10 space-x-6">
          <ProgressCircle progress={50} size={96} strokeWidth={10} showShadow={true} />

          <TouchableOpacity
            onPress={handleCheckIn}
            activeOpacity={0.7}
            className="bg-[#C9B0E8] px-12 py-6 rounded-full justify-center items-center"
          >
            <Text className="text-black text-[24px]">CHECK IN</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mt-6 w-[90%] self-center">
          <View className="bg-white rounded-2xl flex-1 h-20 justify-center items-center mr-2">
            <Text className="font-bold text-base">PARTNERSHIP</Text>
            <Text className="text-gray-500 text-sm">Partner Name</Text>
          </View>

          <View className="bg-white rounded-2xl flex-1 h-20 justify-center items-center ml-2">
            <Text className="font-bold text-base">HABIT</Text>
            <Text className="text-gray-500 text-sm">Study Everyday</Text>
          </View>
        </View>

        <View
          className="mt-10 bg-white/20 rounded-3xl p-6 h-40 w-[95%] self-center justify-center items-center"
        >
          <Text className="text-white font-semibold text-center">
            PROGRESS VISUALIZATION
          </Text>
        </View>

        <View
          className="mt-6 bg-white/20 rounded-3xl p-6 h-60 w-[95%] self-center justify-center items-center"
        >
          <Text className="text-white font-semibold text-center">
            PROGRESS VISUALIZATION
          </Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-5 w-full px-6 items-center">
        <GreyButton onPress={handleEditPress} text="EDIT GOAL" />
      </View>
    </View>
  );
}
