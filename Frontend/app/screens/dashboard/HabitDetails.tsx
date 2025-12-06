import React, {useEffect, useState, useMemo, useCallback} from 'react'
import {View, ScrollView, Text, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, Modal} from 'react-native'
import {useRouter, useLocalSearchParams} from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {getBaseUrl} from '../../../config'
import ProgressCircle from 'app/components/habit/ProgressCircle'
import BackwardButton from '../../components/common/ui/backwardButton'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import HabitBox from '../../components/common/ui/habitBox'
import GreyButton from '../../components/common/ui/greyButton'
import { logger } from '../../utils/logger'

interface Goal {
    user_id: string;
    goal_name: string;
    progress_percentage: number;
}

interface HabitData {
    id: string;
    habit_name: string;
    count_checkins: number;
    current_streak?: number;
    partnership_id: string;
}

interface HabitLog {
    date: string;
    completed: boolean;
}

export default function HabitDetails() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const habitId = params.habitId as string

    const [habit, setHabit] = useState<HabitData | null>(null)
    const [goals, setGoals] = useState<Goal[]>([])
    const [logs, setLogs] = useState<HabitLog[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showGoalTypeModal, setShowGoalTypeModal] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string>('')

    useEffect(() => {
        console.log('🔍 HabitDetails mounted with habitId:', habitId)
        if (habitId) {
            fetchHabitDetails()
        }
    }, [habitId])

    const fetchHabitDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            console.log('📡 Fetching habit details for:', habitId)

            // Fetch current user ID
            const userResponse = await fetch(`${BASE_URL}/api/users/me`, {
                headers: {'Authorization': `Bearer ${token}`}
            })

            if (userResponse.ok) {
                const userData = await userResponse.json()
                const userId = userData.id || userData._id || userData.user_id
                console.log('👤 Current user ID:', userId)
                setCurrentUserId(userId)
            }

            const habitResponse = await fetch(`${BASE_URL}/api/habits/${habitId}`, {
                headers: {'Authorization': `Bearer ${token}`}
            })

            if (habitResponse.ok) {
                const habitData = await habitResponse.json()
                console.log('✅ Habit data:', habitData)
                setHabit(habitData)
            } else {
                console.error('❌ Failed to fetch habit')
            }

            const goalsResponse = await fetch(`${BASE_URL}/api/goals/habits/${habitId}/goals`, {
                headers: {'Authorization': `Bearer ${token}`}
            })

            if (goalsResponse.ok) {
                const goalsData = await goalsResponse.json()
                console.log('✅ Goals data:', goalsData)
                setGoals(goalsData)
            }

            const logsResponse = await fetch(`${BASE_URL}/api/habits/${habitId}/logs`, {
                headers: {'Authorization': `Bearer ${token}`},
                'Content-Type': 'application/json'
            })

            if (logsResponse.ok) {
                const logsData = await logsResponse.json()
                console.log('✅ Logs data:', logsData.length, 'logs')
                setLogs(logsData)
            }else {
                console.log("❌ Failed to fetch logs")
            }

        } catch (err) {
            console.error('💥 Fetch habit details error:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const onRefresh = () => {
        setRefreshing(true)
        fetchHabitDetails()
    }

    const handleAddGoal = () => {
        setShowGoalTypeModal(true)
    }

    const handleGoalTypeSelect = (type: 'frequency' | 'completion') => {
        setShowGoalTypeModal(false)

        if (type === 'frequency') {
            router.push({
                pathname: '/screens/dashboard/FrequencyGoals',
                params: {habitId: habitId}
            })
        } else {
            router.push({
                pathname: '/screens/dashboard/CompletionGoals',
                params: {habitId: habitId}
            })
        }
    }

    // Calculate user and partner progress
    const getUserProgress = () => {
        const userGoal = goals.find(g => g.user_id === currentUserId)
        return userGoal?.progress_percentage || 0
    }

    const getPartnerProgress = () => {
        const partnerGoal = goals.find(g => g.user_id !== currentUserId)
        return partnerGoal?.progress_percentage || 0
    }

    const getDaysInMonth = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        return new Date(year, month + 1, 0).getDate()
    }

    // Memoize day completion check to avoid recalculating on every render
    const isDayCompleted = useCallback((day: number) => {
        const now = new Date()
        const checkDate = new Date(now.getFullYear(), now.getMonth(), day)
        const dateStr = checkDate.toISOString().split('T')[0]
        logger.log('🔍 Checking day:', day, 'Date string:', dateStr)

        const logsForDate = logs.filter(log => log.date === dateStr && log.completed)
        logger.log('📊 Logs for', dateStr, ':', logsForDate.length)

        const uniqueUsers = new Set(logsForDate.map(log => log.user_id))

        return {
            completed: logsForDate.length > 0,
            userCount: uniqueUsers.size,
            bothCompleted: uniqueUsers.size === 2
        }
    }, [logs])

    const getDayColor = (completionStatus: { completed: boolean, userCount: number, bothCompleted: boolean }) => {
        if (!completionStatus.completed) {
            return 'bg-white'
        }
        if (completionStatus.bothCompleted) {
            return 'bg-green-400'
        }
        return 'bg-yellow-400'
    }

    const getMonthName = () => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December']
        return `${months[new Date().getMonth()]} ${new Date().getFullYear()}`
    }

    if (loading) {
        return (
            <View className="flex-1 relative">
                <PurpleParticles/>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff"/>
                    <Text className="text-white mt-4">Loading Habit...</Text>
                </View>
            </View>
        )
    }

    if (!habit) {
        return (
            <View className="flex-1 relative">
                <PurpleParticles/>
                <View className="flex-1 items-center justify-center">
                    <Text className="text-white text-xl">Habit not found</Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 relative">
            <PurpleParticles/>

            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton/>
            </View>

            <ScrollView
                className="flex-1 px-5"
                contentContainerStyle={{paddingBottom: 140}}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff"/>
                }
            >
                <Text className="font-wix text-white text-[38px] text-center mt-10">
                    {habit.habit_name}
                </Text>

                <View className="items-center justify-center mt-4">
                    <HabitBox
                        title={habit.habit_name}
                        userProgress={getUserProgress()}
                        partnerProgress={getPartnerProgress()}
                        streak={habit.current_streak || 0}
                        leftAvatar="https://example.com/user-avatar.jpg"
                        rightAvatar="https://example.com/partner-avatar.jpg"
                        partnerName="Partner"
                    />
                </View>

                <View className="flex-row justify-center items-start mt-4 space-x-6">
                    {goals[0] && (
                        <TouchableOpacity
                            onPress={() => {
                                console.log('Navigating to goal:', goals[0].goal_name)
                                router.push({
                                    pathname: '/screens/dashboard/GoalPage',
                                    params: {
                                        habitId: habitId,
                                        userId: goals[0].user_id
                                    }
                                })
                            }}
                            activeOpacity={0.8}
                            className="flex-col items-center"
                        >
                            <ProgressCircle progress={goals[0].progress_percentage} size={80}/>
                            <View className="bg-white rounded-2xl p-4 w-40 h-28 mt-4 justify-center items-center">
                                <Text className="font-bold text-lg mb-2 text-center">GOAL:</Text>
                                <Text className="text-center text-sm">
                                    {goals[0].goal_name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {goals.length > 1 && (
                        <View
                            className="w-[2px] bg-white"
                            style={{height: 240}}
                        />
                    )}

                    {goals[1] && (
                        <TouchableOpacity
                            onPress={() => {
                                console.log('Navigating to goal:', goals[1].goal_name)
                                router.push({
                                    pathname: '/screens/dashboard/GoalPage',
                                    params: {
                                        habitId: habitId,
                                        userId: goals[1].user_id
                                    }
                                })
                            }}
                            activeOpacity={0.8}
                            className="flex-col items-center"
                        >
                            <ProgressCircle progress={goals[1].progress_percentage} size={80}/>
                            <View className="bg-white rounded-2xl p-4 w-40 h-28 mt-4 justify-center items-center">
                                <Text className="font-bold text-lg mb-2 text-center">GOAL:</Text>
                                <Text className="text-center text-sm">
                                    {goals[1].goal_name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {goals.length === 0 && (
                        <View className="flex-col items-center py-8">
                            <Text className="text-white/60 text-center">No goals set yet</Text>
                            <Text className="text-white/40 text-sm text-center mt-2">
                                Add a goal to track progress!
                            </Text>
                        </View>
                    )}
                </View>

                <View className="bg-[#2a0055] rounded-2xl p-4 mt-8">
                    <Text className="text-white text-center text-xl mb-4">
                        {getMonthName()}
                    </Text>
                    <View className="flex-row flex-wrap justify-center">
                        {Array.from({length: getDaysInMonth()}, (_, i) => {
                            const day = i + 1
                            const completionStatus = isDayCompleted(day)
                            const dayColor = getDayColor(completionStatus)

                            return (
                                <View
                                    key={i}
                                    className={`w-9 h-9 rounded-xl justify-center items-center m-1 ${dayColor}`}
                                >
                                    <Text className={`font-semibold ${
                                        completionStatus.completed ? 'text-white' : 'text-black'
                                    }`}>
                                        {day}
                                    </Text>
                                </View>
                            )
                        })}
                    </View>

                    {/* Legend */}
                    <View className="mt-4 flex-row justify-center items-center gap-4">
                        <View className="flex-row items-center gap-2">
                            <View className="w-6 h-6 rounded-lg bg-yellow-400"/>
                            <Text className="text-white text-xs">One Partner</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <View className="w-6 h-6 rounded-lg bg-green-400"/>
                            <Text className="text-white text-xs">Both Partners</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View className="absolute bottom-5 w-full px-5 items-center" style={{gap: 12}}>
                <GreyButton
                    text="ADD GOAL"
                    onPress={handleAddGoal}
                />
                <GreyButton
                    text="EDIT HABIT"
                    onPress={() => console.log('Edit habit')}
                />
            </View>

            <Modal
                visible={showGoalTypeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGoalTypeModal(false)}
            >
                <TouchableOpacity
                    className="flex-1 justify-center items-center bg-black/60"
                    activeOpacity={1}
                    onPress={() => setShowGoalTypeModal(false)}
                >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <View className="bg-[#9A84A2] rounded-2xl p-6 w-72 items-center">
                            <Text className="text-[#291133] text-[20px] text-center mb-10 font-medium">
                                What type of goal would you like to create?
                            </Text>

                            <TouchableOpacity
                                className="bg-white w-full h-[50px] py-2 rounded-2xl mb-3 justify-center"
                                onPress={() => handleGoalTypeSelect('completion')}
                            >
                                <Text className="text-center text-purple-900 font-semibold">
                                    Completion Goal
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="bg-white w-full h-[50px] py-2 rounded-2xl mb-3 justify-center"
                                onPress={() => handleGoalTypeSelect('frequency')}
                            >
                                <Text className="text-center text-purple-900 font-semibold">
                                    Frequency Goal
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}