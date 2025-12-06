import React, { useEffect, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import HomeUI from "@/components/ui/home-ui";
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import HabitBox from '@/components/ui/habitBox'
import GreyButton from '@/components/ui/greyButton'
import { Ionicons } from '@expo/vector-icons'
import { scaleFont, scaleSize } from '../../utils/constants'
import { logger } from '../../utils/logger'

interface Habit {
    id: string;
    habit_name: string;
    status: string;
    count_checkins: number;
    current_streak?: number;
}

interface Goal {
    user_id: string;
    habit_id: string;
    progress_percentage: number;
}

interface HabitWithProgress extends Habit {
    userProgress: number;
    partnerProgress: number;
}

export default function HabitViews() {
    const router = useRouter()
    const [habits, setHabits] = useState<HabitWithProgress[]>([])
    const [loading, setLoading] = useState(true)
    const screenWidth = Dimensions.get('window').width

    useEffect(() => {
        fetchHabitsWithProgress()
    }, [])

    const fetchHabitsWithProgress = async () => {
        logger.log('🚀 STARTING fetchHabitsWithProgress')
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            logger.log('🔍 Fetching habits and goals...')

            // OPTIMIZATION: Fetch all data in parallel instead of sequentially
            const [habitsResponse, goalsResponse, userResponse] = await Promise.all([
                fetch(`${BASE_URL}/api/habits`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${BASE_URL}/api/goals/users/me/goals`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ])

            logger.log('📡 All responses received')

            // Check all responses for 401 (unauthorized) - any 401 means token is expired/invalid
            if (habitsResponse.status === 401 || goalsResponse.status === 401 || userResponse.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (!habitsResponse.ok) {
                const errorData = await habitsResponse.json()
                logger.error('❌ Failed to fetch habits:', errorData)
                Alert.alert("Error", errorData.detail || "Failed to fetch habits")
                setHabits([])
                setLoading(false)
                return
            }

            const habitsData = await habitsResponse.json()
            logger.log('✅ Fetched habits:', habitsData.length)

            // Handle goals response
            let goalsData: Goal[] = []
            if (goalsResponse.ok) {
                goalsData = await goalsResponse.json()
                logger.log('✅ Goals data:', goalsData.length)
            } else {
                logger.error('❌ Failed to fetch goals')
            }

            // Handle user response - CRITICAL: we need user ID to properly match goals
            let currentUserId: string | null = null
            if (userResponse.ok) {
                const userData = await userResponse.json()
                currentUserId = userData.id || userData._id || userData.user_id
                logger.log('👤 Current user ID:', currentUserId)
            } else {
                logger.error('❌ Failed to fetch user info')
                // Without user ID, we cannot properly match goals (user vs partner)
                // Return early with zero progress to prevent corrupted data
                const habitsWithZeroProgress = habitsData.map((habit: Habit) => ({
                    ...habit,
                    userProgress: 0,
                    partnerProgress: 0
                }))
                setHabits(habitsWithZeroProgress)
                setLoading(false)
                return
            }

            // Match habits with goals and calculate progress
            // currentUserId is guaranteed to be non-null at this point
            const habitsWithProgress: HabitWithProgress[] = habitsData.map((habit: Habit) => {
                // Find user's goal for this habit
                const userGoal = goalsData.find((g: Goal) =>
                    g.habit_id === habit.id && g.user_id === currentUserId
                )

                // Find partner's goal for this habit (different user_id)
                const partnerGoal = goalsData.find((g: Goal) =>
                    g.habit_id === habit.id && g.user_id !== currentUserId
                )

                const userProgress = userGoal?.progress_percentage || 0
                const partnerProgress = partnerGoal?.progress_percentage || 0

                return {
                    ...habit,
                    userProgress,
                    partnerProgress
                }
            })

            logger.log('✅ Habits with progress:', habitsWithProgress.length)
            setHabits(habitsWithProgress)

            if (habitsWithProgress.length === 0) {
                setTimeout(() => {
                    Alert.alert(
                        "No Habits Found",
                        "You don't have any habits yet. Create one to get started!",
                        [{ text: "OK" }]
                    )
                }, 500)
            }
        } catch (err) {
            logger.error('💥 Fetch habits error:', err)
            setHabits([])
        } finally {
            setLoading(false)
        }
    }

    const activeHabits = habits.filter(h => h.status === 'active')
    const inactiveHabits = habits.filter(h => h.status !== 'active')

    logger.log('📊 Total habits:', habits.length, 'Active:', activeHabits.length)

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
                style={{ height: scaleSize(300), width: scaleSize(300) }}
                resizeMode="cover"
            />

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-row items-center justify-center mt-16 px-4">
                    <Text className="font-wix text-white text-center flex-1" style={{ fontSize: scaleFont(38) }}>All Habits</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/screens/dashboard/HabitDrafts')}
                        className="bg-white/20 rounded-full px-3 py-1.5 ml-2"
                    >
                        <Text className="text-white text-xs" style={{ fontSize: scaleFont(12) }}>View Drafts</Text>
                    </TouchableOpacity>
                </View>

                <View className="items-center justify-center mt-4 mb-10">
                    {activeHabits.length > 0 ? (
                        activeHabits.map((habit) => (
                            <TouchableOpacity
                                key={habit.id}
                                onPress={() => {
                                    logger.log('Navigating to habit:', habit.id)
                                    router.push({
                                        pathname: '/screens/dashboard/HabitDetails',
                                        params: { habitId: habit.id }
                                    })
                                }}
                                activeOpacity={0.8}
                                className="w-full items-center"
                            >
                                <HabitBox
                                    title={habit.habit_name}
                                    userProgress={habit.userProgress}
                                    partnerProgress={habit.partnerProgress}
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
            </ScrollView>
            
            <HomeUI />
        </View>
    )
}