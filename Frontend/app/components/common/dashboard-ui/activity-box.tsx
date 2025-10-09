import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';

type ActivityBoxProps = {
  activityAction: string;
  activityTime: string;
  image?: ImageSourcePropType;
};

const ActivityBox: React.FC<ActivityBoxProps> = ({ activityAction, activityTime, image }) => {
  return (
    <View className="bg-white p-4 w-[90%] h-[80px] m-2 justify-center rounded-xl border border-gray-200">
      {image && (
        <Image
          source={image}
          className="w-8 h-8 mb-1"
          resizeMode="contain"
        />
      )}
      <Text className="text-lg font-semibold text-gray-800">{activityAction}</Text>
      <Text className="text-xs text-gray-500">{activityTime}</Text>
    </View>
  );
};

export default ActivityBox;
