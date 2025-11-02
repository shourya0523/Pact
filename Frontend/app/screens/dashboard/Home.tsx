import React from "react";
import { View, Text, ScrollView, FlatList } from "react-native";
import { useRouter } from "expo-router";
import PurpleParticles from "app/components/space/purpleStarsParticlesBackground";

export default function HomePage() {
  const router = useRouter();

  const streaks = [
    { name: "Study Everyday", flame: 4 },
    { name: "Reduce Screen Time", flame: 13 },
    { name: "Workout", flame: 1 },
    { name: "Wake Up Early", flame: 7 },
  ];

  const goals = [
    { name: "Wake Up Early" },
    { name: "Study Everyday" },
    { name: "Workout" },
  ];

  const partnerProgress = [
    "Jake checked in for Study Everyday!",
    "Charles checked in for Wake Up Early!",
    "Becky checked in for Workout!",
  ];

  return (
    <View className="flex-1 relative">
      <PurpleParticles />

      <ScrollView
        className="flex-1 px-6 pt-12"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text className="text-white text-[36px] font-wix">Hello, Mark!</Text>

        {/* Streaks */}
        <View className="mt-6">
          <Text className="text-white text-xl font-semibold mb-3">Streaks</Text>
          {streaks.map((item, index) => (
            <View
              key={index}
              className="flex-row justify-between bg-[#2a0055]/60 rounded-xl p-3 mb-2"
            >
              <Text className="text-white text-base">{item.name}</Text>
              <Text className="text-white font-semibold">{item.flame}🔥</Text>
            </View>
          ))}
        </View>

        {/* Check In Section */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-xl font-semibold">Check In</Text>
            <Text className="text-gray-300 text-sm">View All</Text>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={goals}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <View className="bg-white/90 w-32 h-32 rounded-2xl justify-center items-center mr-4">
                <Text className="font-semibold text-center text-black">
                  {item.name}
                </Text>
              </View>
            )}
          />
        </View>

        {/* Partner Progress */}
        <View className="mt-8">
          <Text className="text-white text-xl font-semibold mb-3">
            Partner Progress
          </Text>
          {partnerProgress.map((text, index) => (
            <View
              key={index}
              className="bg-white/15 rounded-full p-3 mb-2 flex-row justify-between items-center"
            >
              <Text className="text-white text-sm">{text}</Text>
              <Text className="text-[#00FF9C] font-bold">✓</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 w-full bg-[#2a0055]/80 py-4 flex-row justify-around items-center border-t border-white/20">
        <Text className="text-white text-sm">Home</Text>
        <Text className="text-white text-sm">Stats</Text>
        <Text className="text-white text-sm">+</Text>
        <Text className="text-white text-sm">Friends</Text>
        <Text className="text-white text-sm">Settings</Text>
      </View>
    </View>
  );
}
