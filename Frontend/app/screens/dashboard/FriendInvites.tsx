import React from 'react'
import { Image, View, Text, TouchableOpacity } from 'react-native'
import GradientBackground from '@/components/ui/gradientBackground'
import { useRouter } from 'expo-router'

export default function FriendInvites() {
    const router = useRouter()
    return (
        <GradientBackground>
            <View className="flex-1 items-center justify-center">
                <Image className="w-300 h-300 rounded-sm" />
                <Text className="text-white">You are tracking habits alone...</Text>
                <TouchableOpacity className="bg-[#B1BCCE] w-60 h-16 top-9 text-center justify-center items-center rounded-2xl">
                    <Text className="text-white font-bold">Invite friends!</Text>
                </TouchableOpacity>
            </View>
        </GradientBackground>
    )
}