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
    <View className="items-center">
      <View className="w-60 h-60 rounded-full border-white blur-xl absolute" />
      <View 
        className="w-40 h-40 border-4 border-white blur-[4px] rounded-full justify-center items-center relative"
        style={{
          shadowColor: '#ffffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 50,
          elevation: 10, 
        }}
      >
        <Image
          className="w-24 h-24"
          resizeMode="contain"
        />
      </View>
      
      <Text className="text-white font-wix text-sm mt-3 text-center">
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