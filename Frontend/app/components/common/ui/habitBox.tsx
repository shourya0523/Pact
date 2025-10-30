import React from 'react'
import { View, Text,  Image, ImageSourcePropType } from 'react-native'

interface HabitBoxProps {
    title: string;
    progress?: number;
    streak?: number;
    leftAvatar?: string | ImageSourcePropType;
    rightAvatar?: string | ImageSourcePropType;
    partnerName?: string;
}

const HabitBox: React.FC<HabitBoxProps> = ({
  title,
  progress = 0,
  streak = 0,
  leftAvatar,
  rightAvatar,
  partnerName = 'Partner',
}) => {
  return (
    <View className="flex-row items-center justify-between bg-[#FFFFFF] rounded-2xl px-4 py-3 w-[80%] mt-4 h-[120px]">
      <View className="items-center">
        {leftAvatar && (
          <Image
            source={
              typeof leftAvatar === 'string'
                ? { uri: leftAvatar }
                : (leftAvatar as ImageSourcePropType)
            }
            className="w-10 h-10 rounded-full"
          />
        )}
        <Text className="text-white text-[16px] mt-1">You</Text>
      </View>

      <View className="flex-1 items-center">
        <Text className="text-white text-[20px] font-semibold mb-1">{title}</Text>
        <Text className="text-white text-xs">
          Progress: {Math.round((progress || 0) * 100)}%
        </Text>
        <Text className="text-white text-xs mt-1">🔥 {streak} day streak</Text>
      </View>

      <View className="items-center">
        {rightAvatar && (
          <Image
            source={
              typeof rightAvatar === 'string'
                ? { uri: rightAvatar }
                : (rightAvatar as ImageSourcePropType)
            }
            className="w-10 h-10 rounded-full"
          />
        )}
        <Text className="text-white text-[16px] mt-1">{partnerName}</Text>
      </View>
    </View>
  )
}

export default HabitBox