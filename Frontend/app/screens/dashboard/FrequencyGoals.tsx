import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BASE_URL } from '../../../config'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import BackwardButton from '@/components/ui/backwardButton'
import GreyButton from '@/components/ui/greyButton'

export default function FrequencyGoals() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const habitId = params.habitId as string
    const userId = params.userId as string
    const editMode = params.editMode === 'true'
    
    const [goalName, setGoalName] = useState('')
    const [description, setDescription] = useState('')
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
    const [frequencyAmount, setFrequencyAmount] = useState('')
    const [durationAmount, setDurationAmount] = useState('4')
    const [loading, setLoading] = useState(false)
    const [habitName, setHabitName] = useState('')
    const [existingGoal, setExistingGoal] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)

    // Fetch habit details and check for existing goal on mount
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
                    
                    // Map frequency unit from backend to frontend format
                    if (goalData.frequency_unit) {
                        const unitMap: Record<string, 'daily' | 'weekly' | 'monthly'> = {
                            'day': 'daily',
                            'week': 'weekly',
                            'month': 'monthly'
                        }
                        const mappedFrequency = unitMap[goalData.frequency_unit] || 'daily'
                        setFrequency(mappedFrequency)
                    }
                    
                    if (goalData.frequency_count) {
                        setFrequencyAmount(goalData.frequency_count.toString())
                    }
                    
                    if (goalData.duration_count) {
                        setDurationAmount(goalData.duration_count.toString())
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
            console.log('No existing goal found or error fetching:', err)
        }
    }

    const handleCreate = async () => {
        // Validation
        if (!goalName.trim()) {
            Alert.alert("Missing Goal Name", "Please enter a goal name.")
            return
        }

        if (!habitId) {
            Alert.alert("Error", "No habit selected. Please go back and select a habit.")
            return
        }

        // Only validate frequency/duration for new goals (not in edit mode)
        if (!isEditMode) {
            if (!frequencyAmount || isNaN(Number(frequencyAmount)) || Number(frequencyAmount) < 1) {
                Alert.alert("Invalid Amount", "Please enter a valid frequency amount (e.g., 3).")
                return
            }

            if (!durationAmount || isNaN(Number(durationAmount)) || Number(durationAmount) < 1) {
                Alert.alert("Invalid Duration", "Please enter a valid duration (e.g., 4).")
                return
            }
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
            
            // DEBUG LOGGING
            console.log('🐛 DEBUG INFO:')
            console.log('habitId:', habitId)
            console.log('userId:', targetUserId)
            console.log('BASE_URL:', BASE_URL)
            console.log('isEditMode:', isEditMode)

            if (isEditMode) {
                // Update existing goal (only goal_name can be updated)
                const updateData = {
                    goal_name: goalName.trim()
                }

                console.log('Updating frequency goal:', updateData)

                const response = await fetch(`${BASE_URL}/api/goals/habits/${habitId}/users/${targetUserId}/goal/frequency`, {
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
                    console.error('API Error:', data)
                    Alert.alert("Update Failed", errorMessage)
                }
            } else {
                // Create new goal
                // Map frequency to backend format
                const frequencyUnitMap = {
                    'daily': 'day',
                    'weekly': 'week',
                    'monthly': 'month'
                }

                // NOTE: Description field is stored locally only - API doesn't accept it yet
                const goalData = {
                    goal_type: "frequency",
                    goal_name: goalName.trim(),
                    frequency_count: Number(frequencyAmount),
                    frequency_unit: frequencyUnitMap[frequency],
                    duration_count: Number(durationAmount),
                    duration_unit: frequencyUnitMap[frequency]
                }

                console.log('Creating frequency goal:', goalData)

                const response = await fetch(`${BASE_URL}/api/goals/habits/${habitId}/users/${targetUserId}/goal/frequency`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(goalData)
                })

                const data = await response.json()

                if (response.ok) {
                    // TODO: Save description locally if needed for future feature
                    Alert.alert(
                        "Goal Created! 🎯",
                        `"${goalName}" has been set successfully!`,
                        [{
                            text: "Go to Dashboard",
                            onPress: () => router.replace("/screens/dashboard/Home")
                        }]
                    )
                } else {
                    const errorMessage = data.detail || data.message || "Unable to create goal."
                    console.error('API Error:', data)
                    Alert.alert("Creation Failed", errorMessage)
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
                    {isEditMode ? 'Edit Frequency Goal' : 'Create Frequency Goal'}
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

                {/* Select Frequency */}
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Select Frequency
                </Text>
                {isEditMode && (
                    <Text className="font-wix text-white/70 text-sm text-center mt-2 max-w-[80%]">
                        Note: Frequency and duration cannot be changed after creation
                    </Text>
                )}
                <View className="flex-row justify-center mt-6" style={{ gap: 24 }}>
                    {['Daily', 'Weekly', 'Monthly'].map((freq) => {
                        const isSelected = frequency === freq.toLowerCase()
                        return (
                            <Pressable
                                key={freq}
                                className={`w-[125px] h-[40px] rounded-full flex items-center justify-center ${
                                    isSelected ? 'bg-white' : 'bg-[#818498]'
                                }`}
                                onPress={() => setFrequency(freq.toLowerCase() as 'daily' | 'weekly' | 'monthly')}
                                disabled={loading || isEditMode}
                            >
                                <Text className={`font-wix text-[16px] ${
                                    isSelected ? 'text-[#291133]' : 'text-white'
                                }`}>
                                    {freq}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>

                {/* Frequency Amount */}
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Specify Frequency Amount
                </Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-4"
                    placeholder="Enter value (e.g., 3)"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                    value={frequencyAmount}
                    onChangeText={setFrequencyAmount}
                    keyboardType="numeric"
                    editable={!loading && !isEditMode}
                />

                {/* Duration Amount */}
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Duration Amount
                </Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-4"
                    placeholder="Enter duration (e.g., 4)"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                    value={durationAmount}
                    onChangeText={setDurationAmount}
                    keyboardType="numeric"
                    editable={!loading && !isEditMode}
                />

                {loading && (
                    <View className="mt-6">
                        <ActivityIndicator size="large" color="#ffffff" />
                    </View>
                )}
                </View>
            </ScrollView>

            {/* Buttons fixed at bottom */}
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