import React from 'react'
import { View, ScrollView, Text } from 'react-native'
import { useRouter } from 'expo-router'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import HabitBox from '@/components/ui/habitBox'
import GreyButton from '@/components/ui/greyButton'

export default function HabitDetails() {
  return (
    <View className="flex-1 relative">
      <PurpleParticles />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-wix text-white text-[38px] text-center mt-10">
          Study Everyday
        </Text>

        <View className="items-center justify-center mt-4">
          <HabitBox
            title="Study Everyday"
            progress={0.5}
            streak={7}
            leftAvatar="https://example.com/user-avatar.jpg"
            rightAvatar="https://example.com/partner-avatar.jpg"
            partnerName="Alice"
          />
        </View>

        <View className="flex-row justify-center items-center mt-8">
          {/* Left goal box */}
          <View className="bg-white rounded-2xl p-4 w-36 h-28 justify-center items-center">
            <Text className="font-bold text-lg mb-2">GOAL:</Text>
            <Text className="text-center text-sm">
              Study algo for at least an hour everyday
            </Text>
          </View>

          <View className="w-[2px] h-24 bg-white mx-5" />

          <View className="bg-white rounded-2xl p-4 w-36 h-28 justify-center items-center">
            <Text className="font-bold text-lg mb-2">GOAL:</Text>
            <Text className="text-center text-sm">
              Do 5 mock MCAT questions everyday
            </Text>
          </View>
        </View>

        <View className="bg-[#2a0055] rounded-2xl p-4 mt-8">
          <Text className="text-white text-center text-xl mb-4">
            November 2025
          </Text>

          <View className="flex-row flex-wrap justify-center">
            {Array.from({ length: 30 }, (_, i) => (
              <View
                key={i}
                className="w-9 h-9 bg-white rounded-xl justify-center items-center m-1"
              >
                <Text className="font-semibold">{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-5 w-full px-5 items-center">
        <GreyButton text="EDIT HABIT" />
      </View>
    </View>
  );
}