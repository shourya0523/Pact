import React from 'react';
import { View, Text } from 'react-native'

export default function orComponent() {
    return (
        <View className="flex-row justify-center items-center mb-6">
            <View className="flex-1 h-[1px] bg-white" />
                <Text className="mx-4 text-white font-wix text-sm">OR</Text>
            <View className="flex-1 h-[1px] bg-white" />
        </View>
    )
}