import React from 'react'
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native'
import GradientBackground from 'app/components/space/whiteStarsParticlesBackground'
import { useRouter } from 'expo-router'

export default function ProfileView() {
    const router = useRouter()

    return (
        <GradientBackground>
            <View className="flex-1 items-center m-4">
                <Text className="text-white text-[28px] m-4">PROFILE</Text>
                <Image className="w-64 h-64 rounded-full" />
                <TextInput 
                    className="bg-white rounded-2xl w-[90%] h-16 m-2 text-center"
                    placeholder="NAME"
                />
                <TextInput 
                    className="bg-white rounded-2xl w-[90%] h-16 m-2 text-center"
                    placeholder="USERNAME"
                />
                <TextInput 
                    className="bg-white rounded-2xl w-[90%] h-16 m-2 text-center"
                    placeholder="EMAIL"
                />
                <TouchableOpacity className="bg-white w-[90%] h-16 rounded-2xl items-center justify-center mt-2">
                    <Text className="text-sm font-semibold text-gray-800">EDIT PROFILE</Text>
                </TouchableOpacity>
            </View>
        </GradientBackground>
    )
}