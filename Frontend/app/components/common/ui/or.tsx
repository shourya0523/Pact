import React from 'react';
import { View, Text } from 'react-native'

export default function orComponent() {
    return (
        <View className="flex-row justify-center items-center">
            <View className="h-[2px] w-[35%] bg-white" />
                <Text className="mx-8 text-white font-wix text-sm">OR</Text>
            <View className="h-[2px] w-[35%] bg-white" />
        </View>
    )
}