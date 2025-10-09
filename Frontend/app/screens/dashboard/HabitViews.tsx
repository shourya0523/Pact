import React from 'react'
import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from "expo-router"
import GradientBackground from '@/components/ui/gradientBackground'
import HabitsBox from '@/components/dashboard-ui/habit-box'

export default function HabitViews() {
    const router = useRouter()

    return (
        <GradientBackground>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ alignItems: 'center' }}
            >
                <Text className="text-white text-[28px] m-4">ALL HABITS</Text>
            
                <TouchableOpacity
                    className=" bg-white w-[85%] rounded-3xl m-2 p-6 items-center justify-center"
                >
                    <Text className="text-black text-2xl font-bold">Create a new Habit</Text>
                </TouchableOpacity>

                <View className="flex-1 relative">
                    <View className="flex flex-wrap flex-row justify-between px-6">
                        <HabitsBox name="Drinking water" percentage={75} />
                        <HabitsBox name="Cycling" percentage={40} />
                        <HabitsBox name="Walking" percentage={30} />
                        <HabitsBox name="Gym" percentage={60} />
                        <HabitsBox name="Sleeping Early" percentage={40} />
                    </View>
                </View>
            </ScrollView>
        </GradientBackground>
    )
}