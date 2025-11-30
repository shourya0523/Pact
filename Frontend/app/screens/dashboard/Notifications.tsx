import React from 'react'
import { View, ScrollView, Text } from 'react-native'
import BackwardButton from '@/components/ui/backwardButton'
import Notification from '@/components/ui/notification'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import { useRouter } from 'expo-router'

// test data
const notificationsData = [
    {
        id: '1',
        title: 'New connection request from Sarah Connor',
        time: '5 min ago',
        type: 'request' as const, 
    },
    {
        id: '2',
        title: 'Check-in required for Stellar Project',
        time: '1 hour ago',
        type: 'checkin' as const,
    },
    {
        id: '3',
        title: 'Upcoming meeting with Kyle Reese in 15 mins',
        time: '2 hours ago',
        type: 'reminder' as const,
    },
    {
        id: '4',
        title: 'John Doe accepted your request.',
        time: 'Yesterday',
        type: 'checkin' as const,
    },
];

export default function Notifications() {
    const router = useRouter();

    return (
        <View className="flex-1">
            <ScrollView className="flex-1">
                <View className="relative">
                    <PurpleParticles />

                    <View className="absolute mt-6 left-8 z-50">
                        <BackwardButton />
                    </View>

                    <View className="mb-16">
                        <Text className="font-wix text-white text-[38px] mt-12 text-center">Notifications</Text>
                    </View>
                </View>

                <View className="mx-4 rounded-xl p-2 mb-8">
                    {notificationsData.map((notif) => (
                        <Notification 
                            key={notif.id}
                            title={notif.title}
                            time={notif.time}
                            type={notif.type}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    )
}