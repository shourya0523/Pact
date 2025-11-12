import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import HomeUI from "@/components/ui/home-ui";
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import HabitBox from '@/components/ui/habitBox'
import GreyButton from '@/components/ui/greyButton'
import { Ionicons } from '@expo/vector-icons'

export default function HabitViews() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <HomeUI />
            <Image
                source={require('app/images/space/galaxy.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 300 }}
                resizeMode="cover"
            />
            
            <Text className="font-wix text-white text-[38px] text-center mt-16">All Habits</Text>
            
            <View className="items-center justify-center mt-4 mb-10">
                <HabitBox
                    title="Study Habit"
                    progress={0.5}
                    streak={7}
                />
                <HabitBox
                    title="Workout Habit"
                    progress={0.3}
                    streak={4}
                />
                <HabitBox
                    title="Reading Habit"
                    progress={0.8}
                    streak={12}
                />
                <HabitBox
                    title="Meditation Habit"
                    progress={0.6}
                    streak={9}
                />
                <GreyButton 
                    text="INACTIVE HABITS"
                    style={{ width: '80%', backgroundColor: '#3E1B56', marginTop: 20 }}
                />

            
                <TouchableOpacity
                    className="mt-6 bg-white/50 rounded-full p-4 shadow-lg"
                    onPress={() => router.push('/screens/dashboard/createHabit')}
                >
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    )
}
