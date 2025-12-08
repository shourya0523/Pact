import React from 'react'
import { View, Text, Image, ImageSourcePropType } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ProgressCircle from 'app/components/habit/ProgressCircle';
import StreakIndicator from 'app/components/habit/StreakIndicator';

interface HabitBoxProps {
    title: string;
    userProgress: number;  // User's progress percentage (0-100)
    partnerProgress: number;  // Partner's progress percentage (0-100)
    streak?: number;
    leftAvatar?: string | ImageSourcePropType;
    rightAvatar?: string | ImageSourcePropType;
    userName?: string;
    partnerName?: string;
}

const HabitBox: React.FC<HabitBoxProps> = ({
  title,
  userProgress = 0,
  partnerProgress = 0,
  streak = 0,
  leftAvatar,
  rightAvatar,
  userName,
  partnerName,
}) => {
  // Calculate average progress and ceiling it
  const averageProgress = Math.ceil((userProgress + partnerProgress) / 2);

  // Default avatar component
  const DefaultAvatar = ({ size = 40 }: { size?: number }) => (
    <View 
      className="rounded-full bg-white/20 items-center justify-center border border-white/30"
      style={{ width: size, height: size }}
    >
      <Ionicons name="person" size={size * 0.6} color="white" />
    </View>
  );

  return (
    <View className="flex-row items-center justify-between bg-white/10 rounded-2xl px-4 py-4 w-full border border-white/20 h-[120px]">
      <View className="items-center">
        {leftAvatar ? (
          <Image
            source={
              typeof leftAvatar === 'string'
                ? { uri: leftAvatar }
                : (leftAvatar as ImageSourcePropType)
            }
            className="w-10 h-10 rounded-full"
            style={{ borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
          />
        ) : (
          <DefaultAvatar size={40} />
        )}
        <Text className="text-white/80 text-[14px] mt-1 font-wix" numberOfLines={1}>
          {userName || 'You'}
        </Text>
      </View>

      <View className="flex-1 items-center px-2">
        <Text className="text-white text-[20px] mb-2 font-wix text-center">{title}</Text>
        <View className="flex-row items-center gap-3">
          {/* Show average progress - NOT multiplied by 100! */}
          <ProgressCircle progress={averageProgress} size={50} strokeWidth={8} />
          <StreakIndicator
            currentStreak={streak}
            isActive={streak > 0}
            flameSize={20}
            numberSize={20}
            numberColor="white"
            spacing={4}
          />
        </View>
      </View>

      <View className="items-center">
        {rightAvatar ? (
          <Image
            source={
              typeof rightAvatar === 'string'
                ? { uri: rightAvatar }
                : (rightAvatar as ImageSourcePropType)
            }
            className="w-10 h-10 rounded-full"
            style={{ borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
          />
        ) : (
          <DefaultAvatar size={40} />
        )}
        <Text className="text-white/80 text-[14px] mt-1 font-wix" numberOfLines={1}>
          {partnerName || 'Partner'}
        </Text>
      </View>
    </View>
  )
}

export default HabitBox;