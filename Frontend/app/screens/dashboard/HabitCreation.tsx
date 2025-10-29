import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from "expo-router"
import Particles from '@/components/ui/starsParticlesBackground'
import GreyButton from '@/components/ui/greyButton'

export default function HabitCreation() {
    const router = useRouter()

    const handleContinuePress = () => {
        router.push('screens/dashboard/ChooseHabitCategory')
    }

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
                    <GreyButton 
                        onPress={handleContinuePress}
                        text="CONTINUE"    
                    />
                </View>
            </View>
        </View>
    )
}