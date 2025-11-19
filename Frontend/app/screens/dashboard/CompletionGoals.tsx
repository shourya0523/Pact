import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import BackwardButton from '@/components/ui/backwardButton'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton'

export default function Goals() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const habitId = params.habitId as string
    
    const [goalName, setGoalName] = useState('')
    const [description, setDescription] = useState('')
    const [completionValue, setCompletionValue] = useState('')
    const [loading, setLoading] = useState(false)
    const [habitName, setHabitName] = useState('')
    const [existingGoal, setExistingGoal] = useState<any>(null)

    useEffect(() => {
        fetchHabitAndGoal()
    }, [])

    const fetchHabitAndGoal = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            const userData = await AsyncStorage.getItem('user_data')
            
            if (!token || !userData) return

            const user = JSON.parse(userData)
            const BASE_URL = await getBaseUrl()

            // FIRST: Check if habit exists
            const habitResponse = await fetch(
                `${BASE_URL}/api/habits/${habitId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            )

            if (!habitResponse.ok) {
                console.error('❌ Habit not found!', habitResponse.status)
                Alert.alert(
                    "Habit Not Found",
                    `The habit with ID ${habitId} does not exist or you don't have access to it.`,
                    [{
                        text: "Go Back",
                        onPress: () => router.back()
                    }]
                )
                return
            }

            const habitData = await habitResponse.json()
            setHabitName(habitData.habit_name)
            console.log('✅ Habit exists:', habitData.habit_name)

            // Check if user already has a goal for this habit
            const goalResponse = await fetch(
                `${BASE_URL}/api/goals/habits/${habitId}/users/${user.id}/goal`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            )

            if (goalResponse.ok) {
                const goalData = await goalResponse.json()
                setExistingGoal(goalData)
                Alert.alert(
                    "Goal Already Exists",
                    "You already have a goal for this habit. Please edit or delete it first.",
                    [{
                        text: "Go Back",
                        onPress: () => router.back()
                    }]
                )
            }
        } catch (err) {
            console.log('Error fetching habit/goal:', err)
        }
    }

    const handleCreate = async () => {
        if (!goalName.trim()) {
            Alert.alert("Missing Goal Name", "Please enter a goal name.")
            return
        }

        if (!habitId) {
            Alert.alert("Error", "No habit selected. Please go back and select a habit.")
            return
        }

        setLoading(true)

        try {
            const token = await AsyncStorage.getItem('access_token')
            const userData = await AsyncStorage.getItem('user_data')
            
            if (!token || !userData) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const user = JSON.parse(userData)
            const BASE_URL = await getBaseUrl()
            
            console.log('🐛 DEBUG INFO:')
            console.log('habitId:', habitId)
            console.log('user.id:', user.id)
            console.log('BASE_URL:', BASE_URL)

            const goalData = {
                goal_type: "completion",
                goal_name: goalName.trim()
            }

            const url = `${BASE_URL}/api/goals/habits/${habitId}/users/${user.id}/goal/completion`
            console.log('📡 Full URL:', url)
            console.log('📦 Goal Data:', goalData)

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(goalData)
            })

            const data = await response.json()

            if (response.ok) {
                // TODO: Save description and completionValue locally if needed for future feature
                Alert.alert(
                    "Goal Created! 🎯",
                    `"${goalName}" has been set successfully!`,
                    [{
                        text: "View Habits",
                        onPress: () => router.replace("/screens/dashboard/habitViews")
                    }]
                )
            } else {
                const errorMessage = data.detail || data.message || "Unable to create goal."
                console.error('❌ API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                })
                Alert.alert("Creation Failed", `${response.status}: ${errorMessage}`)
            }
        } catch (err: any) {
            console.error('Goal creation error:', err)
            Alert.alert("Error", err.message || "Unable to create goal. Please check your connection.")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = () => {
        Alert.alert("Draft Saved", "Goal saved as draft (feature coming soon!)")
    }

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            {/* Back button */}
            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton />
            </View>
            {/* Main content */}
            <View className="flex-1 justify-start items-center pt-20 px-6">
                {/* Title */}
                <Text className="font-wix text-white text-[38px] text-center max-w-[80%]">
                    Create Completion Goal
                </Text>
                {/* Goal Name */}
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-12"
                    placeholder="Goal name"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                    value={goalName}
                    onChangeText={setGoalName}
                    editable={!loading}
                />
                {/* Description */}
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Description
                </Text>
                <TextInput
                    className="w-[80%] h-[120px] bg-white/85 rounded-[20px] text-[16px] font-wix mt-4"
                    placeholder="Habit description"
                    placeholderTextColor="#3F414E"
                    multiline
                    textAlignVertical="top"
                    style={{ padding: 20 }}
                    value={description}
                    onChangeText={setDescription}
                    editable={!loading}
                />
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Specify Completion Value
                </Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-4"
                    placeholder="Enter value"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                    value={completionValue}
                    onChangeText={setCompletionValue}
                    editable={!loading}
                />

                {loading && (
                    <View className="mt-6">
                        <ActivityIndicator size="large" color="#ffffff" />
                    </View>
                )}
            </View>
            <View className="absolute bottom-12 w-full px-6 flex-row justify-center" style={{ gap: 16 }}>
                <GreyButton
                    onPress={handleCreate}
                    text={loading ? "CREATING..." : "CREATE"}
                    style={{ width: 190, height: 65 }}
                    disabled={loading}
                />
                <GreyButton
                    onPress={handleSave}
                    text="SAVE"
                    style={{ width: 190, height: 65 }}
                    disabled={loading}
                />
            </View>
        </View>
    )
}