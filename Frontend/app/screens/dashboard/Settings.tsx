import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import GradientBackground from '@/components/ui/starsParticlesBackground'

export default function Settings() {
    return (
        <GradientBackground>
            <View
                className="flex-1 items-center"
            >
                <Text className="text-white text-[28px] m-4">SETTINGS</Text>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Sound</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Vecation mode</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Help</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Share app</Text>
                </TouchableOpacity>
            </View>
        </GradientBackground>
    )
}