import React from 'react'
import { ScrollView, FlatList, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import GradientBackground from '@/components/ui/gradientBackground'

const NOTIFICATIONS = [
    { id: '1', title: "Hey, it's time for lunch.", timeStatus: "About 1 minute ago"},
    { id: '2', title: "Don't miss your lower body workout", timeStatus: "About 4 hours ago"},
    { id: '3', title: "Hey, let's add some meals for your b...", timeStatus: "About 1 week ago"},
    { id: '4', title: "Congratulations! You have finished...", timeStatus: "About 2 weeks ago"},
    { id: '5', title: "Hey, it's time for lunch.", timeStatus: "5 May"},
    { id: '6', title: "You missed your lower bod...", timeStatus: "8 April"}
]

export default function Notifications() {
    const router = useRouter()

    return (
        <GradientBackground>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ alignItems: 'center' }}
            >
                <Text className="text-white text-[28px] m-4">NOTIFICATIONS</Text>
                <FlatList
                    data={NOTIFICATIONS}
                    renderItem={({ item }) => (
                        <View className="p-3 my-2">
                            <Text className="text-white font-semibold">{item.title}</Text>
                            <Text className="text-white/70">{item.timeStatus}</Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => (
                        <View className="h-px bg-white/20" />
                    )}
                />
            </ScrollView>
        </GradientBackground>
    )
}