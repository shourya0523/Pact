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
        console.log('🚀 STARTING fetchHabitsWithProgress')
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            console.log('🔍 Fetching habits and goals...')

            // Fetch habits
            const habitsResponse = await fetch(`${BASE_URL}/api/habits`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            console.log('📡 Habits response status:', habitsResponse.status)

            if (habitsResponse.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (!habitsResponse.ok) {
                const errorData = await habitsResponse.json()
                console.error('❌ Failed to fetch habits:', errorData)
                Alert.alert("Error", errorData.detail || "Failed to fetch habits")
                setHabits([])
                setLoading(false)
                return
            }

            const habitsData = await habitsResponse.json()
            console.log('✅ Fetched habits:', habitsData)

            // Fetch goals
            const goalsResponse = await fetch(`${BASE_URL}/api/goals/users/me/goals`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            console.log('📡 Goals response status:', goalsResponse.status)

            if (!goalsResponse.ok) {
                console.error('❌ Failed to fetch goals')
                // If goals fail, just show habits without progress
                const habitsWithZeroProgress = habitsData.map((habit: Habit) => ({
                    ...habit,
                    userProgress: 0,
                    partnerProgress: 0
                }))
                setHabits(habitsWithZeroProgress)
                setLoading(false)
                return
            }

            const goalsData = await goalsResponse.json()
            console.log('✅ Goals data:', goalsData)

            // Debug goals in detail
            goalsData.forEach((goal: any, index: number) => {
                console.log(`Goal ${index}:`, {
                    user_id: goal.user_id,
                    habit_id: goal.habit_id,
                    progress_percentage: goal.progress_percentage,
                    count_checkins: goal.count_checkins,
                    total_checkins_required: goal.total_checkins_required
                })
            })

            // Fetch current user info
            const userResponse = await fetch(`${BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!userResponse.ok) {
                console.error('❌ Failed to fetch user info')
                const habitsWithZeroProgress = habitsData.map((habit: Habit) => ({
                    ...habit,
                    userProgress: 0,
                    partnerProgress: 0
                }))
                setHabits(habitsWithZeroProgress)
                setLoading(false)
                return
            }

            const userData = await userResponse.json()
            const currentUserId = userData.id || userData._id || userData.user_id
            console.log('👤 Current user ID:', currentUserId)

            // Match habits with goals and calculate progress
            const habitsWithProgress: HabitWithProgress[] = habitsData.map((habit: Habit) => {
                console.log(`🔍 Processing habit: ${habit.habit_name} (${habit.id})`)

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

                console.log(`  📊 User progress: ${userProgress}%`)
                console.log(`  📊 Partner progress: ${partnerProgress}%`)
                console.log(`  📊 Average: ${Math.ceil((userProgress + partnerProgress) / 2)}%`)

                return {
                    ...habit,
                    userProgress,
                    partnerProgress
                }
            })

            console.log('✅ Habits with progress:', habitsWithProgress)
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
                style={{ height: scaleSize(300), width: scaleSize(300) }}
                resizeMode="cover"
            />

            <Text className="font-wix text-white text-center mt-16" style={{ fontSize: scaleFont(38) }}>All Habits</Text>

            <View className="items-center justify-center mt-4 mb-10">
                {activeHabits.length > 0 ? (
                    activeHabits.map((habit) => (
                        <TouchableOpacity
                            key={habit.id}
                            onPress={() => {
                                console.log('Navigating to habit:', habit.id, habit.habit_name)
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