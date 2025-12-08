import React, {useEffect, useState} from 'react'
import {View, Text, Image, TouchableOpacity, ActivityIndicator, Alert} from 'react-native'
import {useRouter} from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {getBaseUrl} from '../../../config'
import HomeUI from "@/components/ui/home-ui"
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GoalBox from '@/components/ui/goalBox'
import GreyButton from '@/components/ui/greyButton'
import {Ionicons} from '@expo/vector-icons'
import { logger } from '../../utils/logger'

interface Goal {
    habit_id: string;
    user_id: string;
    habit_name: string;
    goal_status: string;
    target_value: number;
    current_value: number;
    partner_username?: string;
    progress_percentage?: number;
}

export default function ViewAllGoals() {
    const router = useRouter()
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchGoals()
    }, [])

    const fetchGoals = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()

            const response = await fetch(`${BASE_URL}/api/goals/users/me/goals`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (response.ok) {
                const data = await response.json()
                setGoals(data)
            } else {
                const errorData = await response.json()
                Alert.alert("Error", errorData.detail || "Failed to fetch goals")
                setGoals([])
            }
        } catch (err) {
            Alert.alert("Error", "Failed to load goals")
            setGoals([])
        } finally {
            setLoading(false)
        }
    }

    const handleCheckIn = async (habitId: string) => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            
            const response = await fetch(`${BASE_URL}/api/habits/${habitId}/log`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: true })
            })

            if (response.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (response.ok) {
                Alert.alert("Checked In! ✅", "Great job! Keep up the momentum! 🔥")
                fetchGoals()
            } else {
                const errorData = await response.json()
                Alert.alert("Check-in Failed", errorData.detail || "Unable to check in. Please try again.")
            }
        } catch (err) {
            logger.error('Check-in error:', err)
            Alert.alert("Error", "Unable to check in.")
        }
    }

    const activeGoals = goals.filter(g => g.goal_status === 'active')
    const completedGoals = goals.filter(g => g.goal_status === 'completed')

    if (loading) {
        return (
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <WhiteParticles/>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff"/>
                    <Text className="text-white mt-4">Loading Goals...</Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
            <WhiteParticles/>
            <Image
                source={require('app/images/space/galaxy.png')}
                className="absolute bottom-0 right-0"
                style={{height: 300}}
                resizeMode="cover"
            />

            <Text className="font-wix text-white text-[38px] text-center mt-16">All Goals</Text>

            <View className="items-center justify-center mt-4 mb-10">
                {activeGoals.length > 0 ? (
                    activeGoals.map((goal) => (
                        <TouchableOpacity
                            key={goal.habit_id}
                            onPress={() => {
                                router.push({
                                    pathname: '/screens/dashboard/GoalPage',
                                    params: {habitId: goal.habit_id}
                                })
                            }}
                            activeOpacity={0.8}
                            className="w-full items-center"
                        >
                            <GoalBox
                                title={goal.habit_name}
                                currentValue={goal.current_value || 0}
                                targetValue={goal.target_value || 0}
                                progress_percentage={goal.progress_percentage || 0}
                                onCheckIn={() => handleCheckIn(goal.habit_id)}
                                onViewGoal={() => {
                                    router.push({
                                        pathname: '/screens/dashboard/HabitDetails',
                                        params: {habitId: goal.habit_id}
                                    })
                                }}
                            />
                        </TouchableOpacity>
                    ))
                ) : (
                    <View className="py-12 px-6 items-center">
                        <Text className="text-white/60 text-center text-lg mb-2">No goals yet</Text>
                        <Text className="text-white/40 text-center text-sm mb-6">
                            Create a habit first to set goals!
                        </Text>
                        <TouchableOpacity
                            className="bg-white/50 rounded-full p-4 shadow-lg"
                            onPress={() => router.push('/screens/dashboard/createHabit')}
                        >
                            <Ionicons name="add" size={32} color="white"/>
                        </TouchableOpacity>
                        <Text className="text-white/50 text-center text-xs mt-3">
                            Create Habit
                        </Text>
                    </View>
                )}

                {completedGoals.length > 0 && (
                    <GreyButton
                        text="COMPLETED GOALS"
                        onPress={() => {
                            // TODO: Implement completed goals screen
                            Alert.alert("Coming Soon", "Completed goals view will be available soon!")
                        }}
                        style={{width: '80%', backgroundColor: '#3E1B56', marginTop: 20}}
                    />
                )}
            </View>

            <HomeUI/>
        </View>
    )
}