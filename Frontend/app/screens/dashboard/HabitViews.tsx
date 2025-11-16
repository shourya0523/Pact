import React, { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import HomeUI from "@/components/ui/home-ui";
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import HabitBox from '@/components/ui/habitBox'
import GreyButton from '@/components/ui/greyButton'
import { Ionicons } from '@expo/vector-icons'

interface Habit {
    id: string;
    habit_name: string;
    status: string;
    count_checkins: number;
    current_streak?: number;
}

export default function HabitViews() {
    const router = useRouter()
    const [habits, setHabits] = useState<Habit[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchHabits()
    }, [])

    const fetchHabits = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            console.log('🔍 Fetching habits from:', `${BASE_URL}/api/habits`)
            console.log('🔑 Token:', token.substring(0, 20) + '...')
            
            const response = await fetch(`${BASE_URL}/api/habits`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            console.log('📡 Response status:', response.status)

            if (response.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Fetched habits:', data)
                console.log('📊 Number of habits:', data.length)
                
                // Debug each habit
                data.forEach((habit: any, index: number) => {
                    console.log(`Habit ${index + 1}:`, {
                        name: habit.habit_name,
                        status: habit.status,
                        id: habit.id
                    })
                })
                
                setHabits(data)
                
                // Alert if no habits found
                if (data.length === 0) {
                    setTimeout(() => {
                        Alert.alert(
                            "No Habits Found",
                            "You don't have any habits yet. Create one to get started!",
                            [{ text: "OK" }]
                        )
                    }, 500)
                }
            } else {
                const errorData = await response.json()
                console.error('❌ Failed to fetch habits:', errorData)
                Alert.alert("Error", errorData.detail || "Failed to fetch habits")
                setHabits([])
            }
        } catch (err) {
            console.error('💥 Fetch habits error:', err)
            setHabits([])
        } finally {
            setLoading(false)
        }
    }

    const activeHabits = habits.filter(h => h.status === 'active')
    const inactiveHabits = habits.filter(h => h.status !== 'active')
    
    console.log('📊 Total habits:', habits.length)
    console.log('✅ Active habits:', activeHabits.length)
    console.log('❌ Inactive habits:', inactiveHabits.length)

    if (loading) {
        return (
            <View className="flex-1 relative">
                <WhiteParticles />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="text-white mt-4">Loading Habits...</Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <Image
                source={require('app/images/space/galaxy.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 300 }}
                resizeMode="cover"
            />
            
            <Text className="font-wix text-white text-[38px] text-center mt-16">All Habits</Text>
            
            <View className="items-center justify-center mt-4 mb-10">
                {activeHabits.length > 0 ? (
                    activeHabits.map((habit) => (
                        <TouchableOpacity
                            key={habit.id}
                            onPress={() => {
                                console.log('Navigating to habit:', habit.id, habit.habit_name)
                                router.push({
                                    pathname: '/screens/dashboard/habitDetails',
                                    params: { habitId: habit.id }
                                })
                            }}
                            activeOpacity={0.8}
                            className="w-full items-center"
                        >
                            <HabitBox
                                title={habit.habit_name}
                                progress={habit.count_checkins ? habit.count_checkins / 100 : 0}
                                streak={habit.current_streak || 0}
                            />
                        </TouchableOpacity>
                    ))
                ) : (
                    <View className="py-8">
                        <Text className="text-white/60 text-center text-lg">No active habits yet</Text>
                        <Text className="text-white/40 text-center mt-2">Create your first habit below!</Text>
                    </View>
                )}
                
                {inactiveHabits.length > 0 && (
                    <GreyButton 
                        text="INACTIVE HABITS"
                        onPress={() => console.log('Show inactive habits')}
                        style={{ width: '80%', backgroundColor: '#3E1B56', marginTop: 20 }}
                    />
                )}
            
                <TouchableOpacity
                    className="mt-6 bg-white/50 rounded-full p-4 shadow-lg"
                    onPress={() => router.push('/screens/dashboard/createHabit')}
                >
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </View>
            
            <HomeUI />
        </View>
    )
}