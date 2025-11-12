import React from 'react'
import { View, Text, Pressable, Switch } from 'react-native'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import { useRouter } from 'expo-router'

export default function Profile() {
    const router = useRouter()
    const [notifications, setNotifications] = React.useState({
        nudges: false,
        partnerRequests: false,
        habitReminders: false,
        goalReminders: false,
    })

    const toggleNotification = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <View className="flex-1 relative bg-[#1a0033]">
            <PurpleParticles />

            {/* Top text container */}
            <View className="pt-20 w-full">
                <Text className="text-white font-wix text-[36px] ml-12">
                    Set Up
                </Text>
                <Text className="text-white font-wix text-[36px] mt-2 ml-12">
                    Your Profile
                </Text>
            </View>

            {/* Main content */}
            <View className="flex-1 justify-start items-center mt-6 px-6">
                {/* Display Name Box */}
                <View className="w-[90%] bg-white/85 rounded-2xl mt-12 px-6 py-4 flex-row justify-between items-center">
                    <Text className="text-black font-wix text-[16px]">John Doe</Text>
                    <Text className="text-green-500 font-bold text-[20px]">✔</Text>
                </View>

                {/* Push Notifications Box */}
                <View className="w-[90%] bg-white/85 rounded-2xl mt-6 px-6 py-4">
                    <Text className="text-gray-700 font-wix text-[16px] mb-3 text-center">
                        Push Notifications
                    </Text>
                    {[
                        { key: 'nudges', label: 'Nudges' },
                        { key: 'partnerRequests', label: 'Partner Requests' },
                        { key: 'habitReminders', label: 'Habit Reminders' },
                        { key: 'goalReminders', label: 'Goal Reminders' },
                    ].map((item) => (
                        <View
                            key={item.key}
                            className="flex-row justify-between items-center mb-3"
                        >
                            <Text className="text-gray-700 font-wix text-[16px]">{item.label}</Text>
                            <Switch
                                value={notifications[item.key]}
                                onValueChange={() => toggleNotification(item.key)}
                                trackColor={{ false: "#ccc", true: "#7C4DFF" }}
                                thumbColor={notifications[item.key] ? "#fff" : "#fff"}
                            />
                        </View>
                    ))}
                </View>
            </View>

            {/* Edit Account Button fixed at bottom */}
            <View className="absolute bottom-5 w-full px-6">
                <Pressable
                    className="w-[85%] bg-white rounded-full py-4 items-center mx-auto mt-4"
                    onPress={() => console.log('Edit Account Pressed')}
                >
                    <Text className="text-black font-wix text-[18px]">EDIT ACCOUNT</Text>
                </Pressable>
            </View>
        </View>
    )
}
