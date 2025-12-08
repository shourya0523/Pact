import React from 'react'
import { View, Text, Image, ImageSourcePropType, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ProgressCircle from 'app/components/habit/ProgressCircle';
import StreakIndicator from 'app/components/habit/StreakIndicator';

interface HabitBoxProps {
    title: string;
    habitType?: string;  // "build" or "break"
    userProgress: number;  // User's progress percentage (0-100)
    partnerProgress: number;  // Partner's progress percentage (0-100)
    streak?: number;
    leftAvatar?: string | ImageSourcePropType;
    rightAvatar?: string | ImageSourcePropType;
    userName?: string;
    partnerName?: string;
    onNudgePress?: () => void;  // Callback when nudge button is pressed
    showNudgeButton?: boolean;  // Whether to show nudge button
}

const HabitBox: React.FC<HabitBoxProps> = ({
  title,
  habitType,
  userProgress = 0,
  partnerProgress = 0,
  streak = 0,
  leftAvatar,
  rightAvatar,
  userName,
  partnerName,
  onNudgePress,
  showNudgeButton = false,
}) => {
  // Calculate average progress and ceiling it
  const averageProgress = Math.ceil((userProgress + partnerProgress) / 2);

  // Habit type badge configuration
  const getHabitTypeConfig = () => {
    if (habitType === 'build') {
      return {
        label: 'Build',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-400/40',
        textColor: 'text-green-300',
        iconColor: '#86efac', // green-300
        icon: 'trending-up' as const,
      };
    } else if (habitType === 'break') {
      return {
        label: 'Break',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-400/40',
        textColor: 'text-orange-300',
        iconColor: '#fdba74', // orange-300
        icon: 'remove-circle' as const,
      };
    }
    return null;
  };

  const typeConfig = getHabitTypeConfig();

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
        <View className="w-full items-center mb-1.5">
          <Text className="text-white text-[20px] font-wix text-center mb-1.5" numberOfLines={1}>{title}</Text>
          {typeConfig && (
            <View className={`${typeConfig.bgColor} ${typeConfig.borderColor} border rounded-full px-2.5 py-0.5 flex-row items-center gap-1`}>
              <Ionicons name={typeConfig.icon} size={12} color={typeConfig.iconColor} />
              <Text className={`${typeConfig.textColor} text-[10px] font-wix font-semibold`}>
                {typeConfig.label}
              </Text>
            </View>
          )}
        </View>
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
        {showNudgeButton && onNudgePress && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onNudgePress();
            }}
            className="mt-1.5 bg-purple-600/60 rounded-full p-1.5 border border-purple-400/50"
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Ionicons name="notifications-outline" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default HabitBox;