import React, {useEffect, useState, useRef} from 'react'
import {View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Animated} from 'react-native'
import {useRouter} from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {BASE_URL} from '../../../config'
import HomeUI from "@/components/ui/home-ui"
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GoalBox from '@/components/ui/goalBox'
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
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current

    useEffect(() => {
        fetchGoals()
        
        // Entrance animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    const fetchGoals = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

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
                style={{height: 250, width: 250, opacity: 0.3}}
                resizeMode="cover"
            />
            <Animated.View 
                style={{ 
                    flex: 1,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ 
                        paddingTop: 60,
                        paddingBottom: 120,
                        paddingHorizontal: 20
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text className="font-wix text-white text-[36px] text-center mb-8">All Goals</Text>

                {activeGoals.length > 0 ? (
                        <View className="gap-4">
                            {activeGoals.map((goal) => (
                        <TouchableOpacity
                            key={goal.habit_id}
                            onPress={() => {
                                router.push({
                                    pathname: '/screens/dashboard/GoalPage',
                                    params: {habitId: goal.habit_id}
                                })
                            }}
                            activeOpacity={0.8}
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
                            ))}
                        </View>
                ) : (
                        <View className="py-16 px-6 items-center">
                            <Text className="text-white/70 text-center text-lg mb-2 font-wix">No goals yet</Text>
                            <Text className="text-white/50 text-center text-sm mb-8">
                            Create a habit first to set goals!
                        </Text>
                        <TouchableOpacity
                                className="h-[56px] w-full bg-white/20 rounded-2xl items-center justify-center border border-white/30"
                                activeOpacity={0.8}
                            onPress={() => router.push('/screens/dashboard/createHabit')}
                        >
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="add" size={24} color="white"/>
                                    <Text className="font-wix text-white text-[16px] font-semibold">
                            Create Habit
                        </Text>
                                </View>
                            </TouchableOpacity>
                    </View>
                )}

                {completedGoals.length > 0 && (
                        <TouchableOpacity
                            className="h-[56px] w-full bg-white/10 rounded-2xl items-center justify-center border border-white/20 mt-6"
                            activeOpacity={0.8}
                        onPress={() => {
                            Alert.alert("Coming Soon", "Completed goals view will be available soon!")
                        }}
                        >
                            <Text className="font-wix text-white/70 text-[16px]">
                                COMPLETED GOALS ({completedGoals.length})
                            </Text>
                        </TouchableOpacity>
                )}
                </ScrollView>
            </Animated.View>

            <HomeUI/>
        </View>
    )
}