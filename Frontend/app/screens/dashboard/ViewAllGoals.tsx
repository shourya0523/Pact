
import React, { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import HomeUI from "@/components/ui/home-ui"
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GoalBox from '@/components/ui/goalBox'
import GreyButton from '@/components/ui/greyButton'
import { Ionicons } from '@expo/vector-icons'

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
            console.log('🔍 Fetching goals from:', `${BASE_URL}/api/users/me/goals`)
            console.log('🔑 Token:', token.substring(0, 20) + '...')

            const response = await fetch(`${BASE_URL}/api/goals/users/me/goals`, {
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
                console.log('✅ Fetched goals:', data)
                console.log('📊 Number of goals:', data.length)

                // Debug each goal
                data.forEach((goal: any, index: number) => {
                    console.log(`Goal ${index + 1}:`, {
                        name: goal.habit_name,
                        status: goal.goal_status,
                        habit_id: goal.habit_id,
                        current: goal.current_value,
                        target: goal.target_value
                    })
                })

                setGoals(data)

                // Alert if no goals found
                if (data.length === 0) {
                    setTimeout(() => {
                        Alert.alert(
                            "No Goals Found",
                            "You don't have any goals yet. Create one to get started!",
                            [{ text: "OK" }]
                        )
                    }, 500)
                }
            } else {
                const errorData = await response.json()
                console.error('❌ Failed to fetch goals:', errorData)
                Alert.alert("Error", errorData.detail || "Failed to fetch goals")
                setGoals([])
            }
        } catch (err) {
            console.error('💥 Fetch goals error:', err)
            setGoals([])
        } finally {
            setLoading(false)
        }
    }

    const activeGoals = goals.filter(g => g.goal_status === 'active')
    const completedGoals = goals.filter(g => g.goal_status === 'completed')

    console.log('📊 Total goals:', goals.length)
    console.log('✅ Active goals:', activeGoals.length)
    console.log('🎯 Completed goals:', completedGoals.length)

    if (loading) {
        return (
            <View className="flex-1 relative" style={{ backgroundColor: '#291133' }}>
                <WhiteParticles />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="text-white mt-4">Loading Goals...</Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 relative" style={{ backgroundColor: '#291133' }}>
            <WhiteParticles />
            <Image
                source={require('app/images/space/galaxy.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 300 }}
                resizeMode="cover"
            />

            <Text className="font-wix text-white text-[38px] text-center mt-16">All Goals</Text>

            <View className="items-center justify-center mt-4 mb-10">
                {activeGoals.length > 0 ? (
                    activeGoals.map((goal) => (
                        <TouchableOpacity
                            key={goal.habit_id}
                            onPress={() => {
                                console.log('Navigating to goal:', goal.habit_id, goal.habit_name)
                                router.push({
                                    pathname: '/screens/dashboard/GoalDetails',
                                    params: { habitId: goal.habit_id }
                                })
                            }}
                            activeOpacity={0.8}
                            className="w-full items-center"
                        >
                            <GoalBox
                                title={goal.habit_name}
                                progress={goal.current_value && goal.target_value
                                    ? goal.current_value / goal.target_value
                                    : 0}
                                currentValue={goal.current_value || 0}
                                targetValue={goal.target_value || 0}
                                partnerName={goal.partner_username}
                            />
                        </TouchableOpacity>
                    ))
                ) : (
                    <View className="py-8">
                        <Text className="text-white/60 text-center text-lg">No active goals yet</Text>
                        <Text className="text-white/40 text-center mt-2">Create your first goal below!</Text>
                    </View>
                )}
                
                {completedGoals.length > 0 && (
                    <GreyButton 
                        text="COMPLETED GOALS"
                        onPress={() => router.push('/screens/dashboard/CompletedGoals')}
                        style={{ width: '80%', backgroundColor: '#3E1B56', marginTop: 20 }}
                    />
                )}
            
                <TouchableOpacity
                    className="mt-6 bg-white/50 rounded-full p-4 shadow-lg"
                    onPress={() => router.push('/screens/dashboard/createGoal')}
                >
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </View>
            
            <HomeUI />
        </View>
    )
}