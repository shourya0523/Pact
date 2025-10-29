import React from 'react'
import { View, Text, Image, TouchableOpacity, ImageSourcePropType } from 'react-native';

type ChallengeProps = {
  challengeName: string;
  challengeSet: string;
  image?: ImageSourcePropType;
};

const Challenge: React.FC<ChallengeProps> = ({ challengeName, challengeSet, image }) => {
    return (
        <View className="bg-white p-6 w-[90%] h-[180px] m-2 justify-center rounded-2xl border border-gray-200">
        {image && (
            <Image
            source={image}
            className="w-8 h-8 mb-1"
            resizeMode="contain"
            />
        )}
        <Text className="text-lg mb-4 font-bold text-gray-800">{challengeName}</Text>
        <Text className="text-xs mb-6 font-semibold text-gray-500">{challengeSet}</Text>
        
        <TouchableOpacity className="bg-[#C4CDDA] w-24 h-8 rounded-3xl items-center justify-center mt-2">
            <Text className="text-sm font-semibold text-gray-800">Join now</Text>
        </TouchableOpacity>
        </View>
    );
};

export default Challenge;