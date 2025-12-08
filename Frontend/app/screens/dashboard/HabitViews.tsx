import React, { useEffect, useState, useRef } from 'react'
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions, ScrollView, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BASE_URL } from '../../../config'
import HomeUI from "@/components/ui/home-ui";
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import HabitBox from '@/components/ui/habitBox'
import { Ionicons } from '@expo/vector-icons'
import { logger } from '../../utils/logger'

interface Habit {
    id: string;
    habit_name: string;
    status: string;
    count_checkins: number;
    current_streak?: number;
    partnership_id?: string;
}

interface Goal {
    user_id: string;
    habit_id: string;
    progress_percentage: number;
}

interface HabitWithProgress extends Habit {
    userProgress: number;
    partnerProgress: number;
    userName?: string;
    userAvatar?: string;
    partnerName?: string;
    partnerAvatar?: string;
}

export default function HabitViews() {
    const router = useRouter()
    const [habits, setHabits] = useState<HabitWithProgress[]>([])
    const [loading, setLoading] = useState(true)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current

    useEffect(() => {
        fetchHabitsWithProgress()
        
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

    const fetchHabitsWithProgress = async () => {
        logger.log('🚀 STARTING fetchHabitsWithProgress')
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

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
            let currentUserName = 'You'
            let currentUserAvatar = ''
            if (userResponse.ok) {
                const userData = await userResponse.json()
                currentUserId = userData.id || userData._id || userData.user_id
                currentUserName = userData.display_name || userData.username || 'You'
                currentUserAvatar = userData.profile_photo_url || ''
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

            // Get partner info from partnership (fetch once for all habits)
            let partnerName = 'Partner'
            let partnerAvatar = ''
            try {
                const partnershipResponse = await fetch(`${BASE_URL}/api/partnerships/current`, {
                    headers: {'Authorization': `Bearer ${token}`}
                })
                if (partnershipResponse.ok) {
                    const partnershipData = await partnershipResponse.json()
                    partnerName = partnershipData.partner?.username || partnershipData.partner?.display_name || 'Partner'
                    partnerAvatar = partnershipData.partner?.profile_picture || partnershipData.partner?.profile_photo_url || ''
                }
            } catch (err) {
                logger.error('Error fetching partner info:', err)
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
                    partnerProgress,
                    userName: currentUserName,
                    userAvatar: currentUserAvatar,
                    partnerName,
                    partnerAvatar
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
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <WhiteParticles />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="text-white mt-4 font-wix">Loading Habits...</Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
            <WhiteParticles />
            <Image
                source={require('app/images/space/galaxy.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 250, width: 250, opacity: 0.3 }}
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
                keyboardShouldPersistTaps="handled"
            >
                    <View className="flex-row items-center justify-center mb-8">
                        <Text className="font-wix text-white text-[36px] text-center flex-1">All Habits</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/screens/dashboard/HabitDrafts')}
                            activeOpacity={0.8}
                            className="bg-white/20 rounded-full px-4 py-2 ml-2 border border-white/30"
                    >
                            <Text className="text-white text-xs font-wix">View Drafts</Text>
                    </TouchableOpacity>
                </View>

                    {activeHabits.length > 0 ? (
                        <View className="gap-4 mb-6">
                            {activeHabits.map((habit) => (
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
                            >
                                <HabitBox
                                    title={habit.habit_name}
                                    userProgress={habit.userProgress}
                                    partnerProgress={habit.partnerProgress}
                                    streak={habit.current_streak || 0}
                                        leftAvatar={habit.userAvatar}
                                        rightAvatar={habit.partnerAvatar}
                                        userName={habit.userName}
                                        partnerName={habit.partnerName}
                                />
                            </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View className="py-16 px-6 items-center bg-white/5 rounded-2xl border border-white/10 mb-6">
                            <Text className="text-white/70 text-center text-lg font-wix mb-2">No active habits yet</Text>
                            <Text className="text-white/50 text-center text-sm mb-8">Create your first habit below!</Text>
                        </View>
                    )}

                    {/* Always show add habit button */}
                    <TouchableOpacity
                        className="h-[56px] w-full bg-white rounded-2xl items-center justify-center mb-6"
                        activeOpacity={0.8}
                        onPress={() => router.push('/screens/dashboard/createHabit')}
                    >
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="add" size={24} color="#291133" />
                            <Text className="font-wix text-[#291133] text-[16px] font-semibold">
                                Create Habit
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {inactiveHabits.length > 0 && (
                        <TouchableOpacity
                            className="h-[56px] w-full bg-white/10 rounded-2xl items-center justify-center border border-white/20 mb-6"
                            activeOpacity={0.8}
                            onPress={() => console.log('Show inactive habits')}
                        >
                            <Text className="font-wix text-white/70 text-[16px]">
                                INACTIVE HABITS ({inactiveHabits.length})
                            </Text>
                        </TouchableOpacity>
                    )}
            </ScrollView>
            </Animated.View>
            
            <HomeUI />
        </View>
    )
}