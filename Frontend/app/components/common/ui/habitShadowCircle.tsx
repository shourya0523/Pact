import React, { ReactNode } from 'react';
import { View, Image, ImageSourcePropType, Text, TouchableOpacity } from 'react-native';

interface HabitShadowCircleProps {
  label: string;
  onPress?: () => void;
}

const HabitShadowCircle: React.FC<HabitShadowCircleProps> = ({ 
  label,
  onPress 
}) => {
  const content = (
    <View className="items-center mx-10 my-6">
      <View className="w-60 h-60 rounded-full border-white blur-xl absolute" />
      <View 
        className="w-[120px] h-[120px] border-[6px] border-white blur-[4px] rounded-full justify-center items-center relative"
        style={{
          shadowColor: '#ffffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 50, 
        }}
      >
        <Image
          className="w-24 h-24"
          resizeMode="contain"
        />
      </View>
      
      <Text className="text-white font-wix text-[14px] mt-6 text-center">
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default HabitShadowCircle;