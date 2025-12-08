import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react'
import {View, ScrollView, Text, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, Modal, Animated, Image} from 'react-native'
import {useRouter, useLocalSearchParams} from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {BASE_URL} from '../../../config'
import ProgressCircle from 'app/components/habit/ProgressCircle'
import BackwardButton from '../../components/common/ui/backwardButton'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import HabitBox from '../../components/common/ui/habitBox'
import {Ionicons} from '@expo/vector-icons'
import { logger } from '../../utils/logger'
import { notificationAPI } from '../../services/notificationAPI'

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
    user_id?: string;
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
    const [userName, setUserName] = useState<string>('')
    const [userAvatar, setUserAvatar] = useState<string>('')
    const [partnerName, setPartnerName] = useState<string>('')
    const [partnerAvatar, setPartnerAvatar] = useState<string>('')
    const [partnerId, setPartnerId] = useState<string>('')
    const [sendingNudge, setSendingNudge] = useState(false)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current

    useEffect(() => {
        console.log('🔍 HabitDetails mounted with habitId:', habitId)
        if (habitId) {
            fetchHabitDetails()
        }
        
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
    }, [habitId])

    const fetchHabitDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

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
                setUserName(userData.display_name || userData.username || 'You')
                setUserAvatar(userData.profile_photo_url || '')
            }

            const habitResponse = await fetch(`${BASE_URL}/api/habits/${habitId}`, {
                headers: {'Authorization': `Bearer ${token}`}
            })

            if (habitResponse.ok) {
                const habitData = await habitResponse.json()
                console.log('✅ Habit data:', habitData)
                setHabit(habitData)

                // Fetch partner info from partnership
                if (habitData.partnership_id) {
                    try {
                        const partnershipResponse = await fetch(`${BASE_URL}/api/partnerships/current`, {
                            headers: {'Authorization': `Bearer ${token}`}
                        })
                        if (partnershipResponse.ok) {
                            const partnershipData = await partnershipResponse.json()
                            setPartnerName(partnershipData.partner?.username || partnershipData.partner?.display_name || 'Partner')
                            setPartnerAvatar(partnershipData.partner?.profile_picture || partnershipData.partner?.profile_photo_url || '')
                            setPartnerId(partnershipData.partner?.id || partnershipData.partner?._id || '')
                        }
                    } catch (err) {
                        console.error('Error fetching partner info:', err)
                    }
                }
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

        const uniqueUsers = new Set(logsForDate.map(log => log.user_id).filter(Boolean))

        return {
            completed: logsForDate.length > 0,
            userCount: uniqueUsers.size,
            bothCompleted: uniqueUsers.size === 2
        }
    }, [logs])

    const getDayColor = (completionStatus: { completed: boolean, userCount: number, bothCompleted: boolean }) => {
        if (!completionStatus.completed) {
            return 'bg-white/10'
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

    const handleSendNudge = async () => {
        if (!partnerId || !habitId) {
            Alert.alert('Error', 'Unable to send nudge. Missing partner or habit information.');
            return;
        }

        try {
            setSendingNudge(true);
            const result = await notificationAPI.sendNudge(partnerId, habitId);
            Alert.alert(
                '✅ Nudge Sent!',
                `You've nudged ${partnerName} to work on ${habit?.habit_name || 'their habit'}!`,
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            console.error('Error sending nudge:', error);
            const errorMessage = error.message || 'Failed to send nudge. Please try again.';
            Alert.alert(
                errorMessage.includes('once per day') ? '⏰ Rate Limit' : 'Error',
                errorMessage
            );
        } finally {
            setSendingNudge(false);
        }
    }

    const handleDeleteHabit = async () => {
        Alert.alert(
            "Delete Habit",
            `Are you sure you want to delete "${habit.habit_name}"? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('access_token')
                            if (!token) {
                                Alert.alert("Error", "Please log in again.")
                                return
                            }

                            const response = await fetch(`${BASE_URL}/api/habits/${habitId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            })

                            if (response.ok || response.status === 204) {
                                Alert.alert("Success", "Habit deleted successfully.", [
                                    {
                                        text: "OK",
                                        onPress: () => router.back()
                                    }
                                ])
                            } else if (response.status === 404 || response.status === 405) {
                                Alert.alert("Info", "Habit deletion endpoint may need to be implemented. Returning to habits list.", [
                                    {
                                        text: "OK",
                                        onPress: () => router.back()
                                    }
                                ])
                            } else {
                                const errorData = await response.json().catch(() => ({}))
                                Alert.alert("Error", errorData.detail || "Failed to delete habit.")
                            }
                        } catch (err) {
                            logger.error('Delete habit error:', err)
                            Alert.alert("Error", "Failed to delete habit. Please try again.")
                        }
                    }
                }
            ]
        )
    }

    if (loading) {
        return (
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <PurpleParticles/>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff"/>
                    <Text className="text-white mt-4 font-wix">Loading Habit...</Text>
                </View>
            </View>
        )
    }

    if (!habit) {
        return (
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <PurpleParticles/>
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-white text-xl font-wix">Habit not found</Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
            <PurpleParticles/>
            <Image
                source={require('app/images/space/galaxy.png')}
                className="absolute bottom-0 right-0"
                style={{height: 250, width: 250, opacity: 0.3}}
                resizeMode="cover"
            />

            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton/>
            </View>

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
                        paddingTop: 80,
                        paddingBottom: 180,
                        paddingHorizontal: 20
                    }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7"/>
                }
            >
                    <Text className="font-wix text-white text-[36px] text-center mb-6">
                    {habit.habit_name}
                </Text>

                    <View className="items-center justify-center mb-6">
                    <HabitBox
                        title={habit.habit_name}
                        userProgress={getUserProgress()}
                        partnerProgress={getPartnerProgress()}
                        streak={habit.current_streak || 0}
                            leftAvatar={userAvatar}
                            rightAvatar={partnerAvatar}
                            userName={userName}
                            partnerName={partnerName}
                    />
                </View>

                    <View className="flex-row justify-center items-start gap-6 mb-6">
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
                                <View className="bg-white/10 rounded-2xl p-4 w-40 min-h-[112px] mt-4 justify-center items-center border border-white/20">
                                    <Text className="font-wix font-bold text-lg mb-2 text-center text-white">GOAL:</Text>
                                    <Text className="text-center text-sm text-white/80 font-wix">
                                    {goals[0].goal_name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {goals.length > 1 && (
                        <View
                                className="w-[1px] bg-white/20"
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
                                <View className="bg-white/10 rounded-2xl p-4 w-40 min-h-[112px] mt-4 justify-center items-center border border-white/20">
                                    <Text className="font-wix font-bold text-lg mb-2 text-center text-white">GOAL:</Text>
                                    <Text className="text-center text-sm text-white/80 font-wix">
                                    {goals[1].goal_name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {goals.length === 0 && (
                            <View className="flex-col items-center py-8 bg-white/5 rounded-2xl w-full border border-white/10">
                                <Text className="text-white/70 text-center font-wix">No goals set yet</Text>
                                <Text className="text-white/50 text-sm text-center mt-2">
                                Add a goal to track progress!
                            </Text>
                        </View>
                    )}
                </View>

                    {/* Nudge Partner Button */}
                    {partnerId && habit?.partnership_id && (
                        <TouchableOpacity
                            className="bg-purple-600/80 rounded-2xl p-4 mb-6 border border-purple-400/50 flex-row items-center justify-center gap-3"
                            activeOpacity={0.8}
                            onPress={handleSendNudge}
                            disabled={sendingNudge}
                        >
                            {sendingNudge ? (
                                <>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text className="font-wix text-white text-base">Sending...</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="notifications-outline" size={20} color="#fff" />
                                    <Text className="font-wix text-white text-base font-semibold">
                                        Nudge {partnerName}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <View className="bg-white/10 rounded-2xl p-4 mb-6 border border-white/20">
                        <Text className="text-white text-center text-xl mb-4 font-wix">
                        {getMonthName()}
                    </Text>
                        <View className="flex-row flex-wrap justify-center gap-1">
                        {Array.from({length: getDaysInMonth()}, (_, i) => {
                            const day = i + 1
                            const completionStatus = isDayCompleted(day)
                            const dayColor = getDayColor(completionStatus)

                            return (
                                <View
                                    key={i}
                                        className={`w-9 h-9 rounded-xl justify-center items-center ${dayColor} ${!completionStatus.completed ? 'border border-white/20' : ''}`}
                                >
                                        <Text className={`font-semibold font-wix ${
                                            completionStatus.completed ? 'text-white' : 'text-white/60'
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
                                <Text className="text-white/70 text-xs font-wix">One Partner</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <View className="w-6 h-6 rounded-lg bg-green-400"/>
                                <Text className="text-white/70 text-xs font-wix">Both Partners</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
            </Animated.View>

            <View className="absolute bottom-5 w-full px-5 items-center gap-3">
                <TouchableOpacity
                    className="h-[56px] w-full bg-white rounded-2xl items-center justify-center"
                    activeOpacity={0.8}
                    onPress={handleAddGoal}
                >
                    <Text className="font-wix text-[#291133] text-[16px] font-semibold">
                        ADD GOAL
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="h-[56px] w-full bg-white/20 rounded-2xl items-center justify-center border border-white/30"
                    activeOpacity={0.8}
                    onPress={() => console.log('Edit habit')}
                >
                    <Text className="font-wix text-white text-[16px] font-semibold">
                        EDIT HABIT
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="h-[56px] w-full bg-red-500/20 rounded-2xl items-center justify-center border border-red-500/40"
                    activeOpacity={0.8}
                    onPress={handleDeleteHabit}
                >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        <Text className="font-wix text-red-500 text-[16px] font-semibold">
                            DELETE HABIT
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <Modal
                visible={showGoalTypeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGoalTypeModal(false)}
            >
                <TouchableOpacity
                    className="flex-1 justify-center items-center bg-black/70"
                    activeOpacity={1}
                    onPress={() => setShowGoalTypeModal(false)}
                >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white/10 rounded-2xl p-6 w-[85%] max-w-[320px] items-center border border-white/20">
                            <Text className="text-white text-[20px] text-center mb-8 font-wix">
                                What type of goal would you like to create?
                            </Text>

                            <TouchableOpacity
                                className="bg-white w-full h-[56px] rounded-2xl mb-3 justify-center"
                                activeOpacity={0.8}
                                onPress={() => handleGoalTypeSelect('completion')}
                            >
                                <Text className="text-center text-[#291133] font-wix font-semibold text-[16px]">
                                    Completion Goal
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="bg-white w-full h-[56px] rounded-2xl mb-3 justify-center"
                                activeOpacity={0.8}
                                onPress={() => handleGoalTypeSelect('frequency')}
                            >
                                <Text className="text-center text-[#291133] font-wix font-semibold text-[16px]">
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