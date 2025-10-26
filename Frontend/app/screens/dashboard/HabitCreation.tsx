import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from "expo-router"
import Particles from '@/components/ui/starsParticlesBackground'

export default function HabitCreation() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
        <Particles />
            <View 
                className="flex-1 justify-center items-center"
            >
                <Text className="font-wix text-white text-[38px] text-center ps leading-[54px]">
                    {"Get Started By\nCreating a\nHabit!"}
                </Text>
                <View className="absolute bottom-5 w-full p-5 items-center">
                    <Pressable
                        className="w-[480px] h-[60px] rounded-[30px] flex-row items-center justify-center"
                        style={{ backgroundColor: "rgba(129, 132, 152, 0.27)" }} 
                    >
                        <Text className="text-[16px] font-wix text-white text-center">
                            CONTINUE
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    )
}