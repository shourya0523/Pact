import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BASE_URL } from '../../../config'
import BackwardButton from '@/components/ui/backwardButton'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton'

export default function Goals() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const habitId = params.habitId as string
    const userId = params.userId as string
    const editMode = params.editMode === 'true'
    
    const [goalName, setGoalName] = useState('')
    const [description, setDescription] = useState('')
    const [completionValue, setCompletionValue] = useState('')
    const [loading, setLoading] = useState(false)
    const [habitName, setHabitName] = useState('')
    const [existingGoal, setExistingGoal] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)

    useEffect(() => {
        fetchHabitAndGoal()
    }, [])

    const fetchHabitAndGoal = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            const userData = await AsyncStorage.getItem('user_data')
            
            if (!token || !userData) return

            const user = JSON.parse(userData)
            const targetUserId = userId || user.id || user._id || user.user_id

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
                `${BASE_URL}/api/goals/habits/${habitId}/users/${targetUserId}/goal`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            )

            if (goalResponse.ok) {
                const goalData = await goalResponse.json()
                setExistingGoal(goalData)
                
                // If in edit mode, populate the form fields
                if (editMode) {
                    setIsEditMode(true)
                    setGoalName(goalData.goal_name || '')
                    if (goalData.target_value !== undefined && goalData.target_value !== null) {
                        setCompletionValue(goalData.target_value.toString())
                    }
                } else {
                    // If not in edit mode and goal exists, show alert
                    Alert.alert(
                        "Goal Already Exists",
                        "You already have a goal for this habit. Please edit or delete it first.",
                        [{
                            text: "Go Back",
                            onPress: () => router.back()
                        }]
                    )
                }
            } else if (editMode) {
                // If edit mode but goal doesn't exist, show error
                Alert.alert(
                    "Goal Not Found",
                    "The goal you're trying to edit doesn't exist.",
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
            const targetUserId = userId || user.id || user._id || user.user_id
            
            if (!targetUserId) {
                Alert.alert("Error", "Unable to get user ID. Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }
            
            console.log('🐛 DEBUG INFO:')
            console.log('habitId:', habitId)
            console.log('userId:', targetUserId)
            console.log('BASE_URL:', BASE_URL)
            console.log('isEditMode:', isEditMode)

            if (isEditMode) {
                // Update existing goal
                const updateData = {
                    goal_name: goalName.trim()
                }

                const url = `${BASE_URL}/api/goals/habits/${habitId}/users/${targetUserId}/goal/completion`
                console.log('📡 Update URL:', url)
                console.log('📦 Update Data:', updateData)

                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                })

                const data = await response.json()

                if (response.ok) {
                    Alert.alert(
                        "Goal Updated! 🎯",
                        `"${goalName}" has been updated successfully!`,
                        [{
                            text: "OK",
                            onPress: () => router.back()
                        }]
                    )
                } else {
                    const errorMessage = data.detail || data.message || "Unable to update goal."
                    console.error('❌ API Error Response:', {
                        status: response.status,
                        statusText: response.statusText,
                        data: data
                    })
                    Alert.alert("Update Failed", `${response.status}: ${errorMessage}`)
                }
            } else {
                // Create new goal
                // Parse completion value (default to 1 if not provided for backward compatibility)
                const targetValue = completionValue.trim() 
                    ? parseFloat(completionValue.trim()) 
                    : undefined

                if (targetValue !== undefined && (isNaN(targetValue) || targetValue <= 0)) {
                    Alert.alert("Invalid Value", "Please enter a valid positive number for the completion value.")
                    setLoading(false)
                    return
                }

                const goalData = {
                    goal_type: "completion",
                    goal_name: goalName.trim(),
                    ...(targetValue !== undefined && { target_value: targetValue })
                }

                const url = `${BASE_URL}/api/goals/habits/${habitId}/users/${targetUserId}/goal/completion`
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
            }
        } catch (err: any) {
            console.error('Goal creation/update error:', err)
            Alert.alert("Error", err.message || `Unable to ${isEditMode ? 'update' : 'create'} goal. Please check your connection.`)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = () => {
        Alert.alert("Draft Saved", "Goal saved as draft (feature coming soon!)")
    }

    return (
        <KeyboardAvoidingView 
            className="flex-1 relative"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <WhiteParticles />
            {/* Back button */}
            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton />
            </View>
            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 140, paddingTop: 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Main content */}
                <View className="flex-1 justify-start items-center pt-20 px-6">
                {/* Title */}
                <Text className="font-wix text-white text-[38px] text-center max-w-[80%]">
                    {isEditMode ? 'Edit Completion Goal' : 'Create Completion Goal'}
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
                {isEditMode && (
                    <Text className="font-wix text-white/70 text-sm text-center mt-2 max-w-[80%]">
                        Note: Completion value cannot be changed after creation
                    </Text>
                )}
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-4"
                    placeholder="e.g., 100 (for 'run 100 miles')"
                    placeholderTextColor="#3F414E"
                    keyboardType="numeric"
                    style={{ paddingHorizontal: 20 }}
                    value={completionValue}
                    onChangeText={setCompletionValue}
                    editable={!loading && !isEditMode}
                />

                {loading && (
                    <View className="mt-6">
                        <ActivityIndicator size="large" color="#ffffff" />
                    </View>
                )}
                </View>
            </ScrollView>
            <View className="absolute bottom-12 w-full px-6 flex-row justify-center" style={{ gap: 16 }}>
                <GreyButton
                    onPress={handleCreate}
                    text={loading ? (isEditMode ? "UPDATING..." : "CREATING...") : (isEditMode ? "UPDATE" : "CREATE")}
                    style={{ width: 190, height: 65 }}
                    disabled={loading}
                />
                {!isEditMode && (
                    <GreyButton
                        onPress={handleSave}
                        text="SAVE"
                        style={{ width: 190, height: 65 }}
                        disabled={loading}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    )
}