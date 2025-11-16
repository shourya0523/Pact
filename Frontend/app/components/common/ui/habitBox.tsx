import React from 'react'
import { View, Text, Image, ImageSourcePropType } from 'react-native'
import ProgressCircle from 'app/components/habit/ProgressCircle';
import StreakIndicator from 'app/components/habit/StreakIndicator';

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
    <View className="flex-row items-center justify-between bg-white/90 rounded-2xl px-4 py-3 w-[80%] mt-4 h-[110px]">
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
        <Text className="text-black text-[16px] mt-1">You</Text>
      </View>

      <View className="flex-1 items-center">
        <Text className="text-black text-[24px] mb-2">{title}</Text>
        <View className="flex-row items-center space-x-4">
          <ProgressCircle progress={progress * 100} size={50} strokeWidth={8} />
          <StreakIndicator
            currentStreak={streak}
            isActive={streak > 0}
            flameSize={36}
            numberSize={24}      
            numberColor="black"  
            spacing={0}     
          />
        </View>
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
        <Text className="text-black text-[16px] mt-1">{partnerName}</Text>
      </View>
    </View>
  )
}

export default HabitBox;
