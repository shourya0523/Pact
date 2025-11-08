import React from 'react'
import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import HabitBox from '@/components/ui/habitBox'
import GreyButton from '@/components/ui/greyButton'

export default function HabitViews() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <Text className="font-wix text-white text-[38px] text-center">All Habits</Text>
            <View className="items-center justify-center mt-4">
                <HabitBox
                    title="Study Habit"
                    progress={0.5}
                    streak={7}
                />
                <HabitBox
                    title="Study Habit"
                    progress={0.5}
                    streak={7}
                />
                <HabitBox
                    title="Study Habit"
                    progress={0.5}
                    streak={7}
                />
                <HabitBox
                    title="Study Habit"
                    progress={0.5}
                    streak={7}
                />
                <GreyButton 
                    text="INACTIVE HABITS"
                    style={{ width: '80%', backgroundColor: '#3E1B56', marginTop: 20 }}
                />
            </View>
        </View>
    )
}