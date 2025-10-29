import React from 'react';
import { View, Text, ImageSourcePropType, Image } from 'react-native'

type HabitsBoxProps = {
    name: string;
    percentage: number;
    image?: ImageSourcePropType;
};

const HabitsBox: React.FC<HabitsBoxProps> = ({ name, percentage, image}) => {
    return (
      <View className="bg-white rounded-3xl p-4 w-[200px] h-[250px] m-2 justify-center items-center">
        {
          image && (
              <Image
              source={image}
              className="w-20 h-20 mb-3"
              resizeMode="contain"
              />
          )
        }
        <Text className="text-lg font-semibold text-gray-800">{name}</Text>
        <Text className="text-base text-gray-600">{percentage}%</Text>
      </View>
    )
}

export default HabitsBox;