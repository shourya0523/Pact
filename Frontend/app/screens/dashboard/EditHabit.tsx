
import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import BackwardButton from '@/components/ui/backwardButton'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton'

export default function EditHabit() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const habitId = params.habitId as string
    
    const [habitName, setHabitName] = useState('')
    const [habitType, setHabitType] = useState('')
    const [description, setDescription] = useState('')
    const [invitedPartner, setInvitedPartner] = useState('')
    const [repeat, setRepeat] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchHabitDetails()
    }, [])

    const fetchHabitDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            const response = await fetch(
                `${BASE_URL}/api/habits/${habitId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            )

            if (!response.ok) {
                Alert.alert("Error", "Unable to fetch habit details.")
                router.back()
                return
            }

            const habitData = await response.json()
            
            // Pre-populate fields
            setHabitName(habitData.habit_name || '')
            setHabitType(habitData.habit_type || '')
            setDescription(habitData.description || '')
            setInvitedPartner(habitData.invited_partner || '')
            setRepeat(habitData.repeat || [])
            
        } catch (err) {
            console.error('Error fetching habit:', err)
            Alert.alert("Error", "Unable to load habit details.")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!habitName.trim()) {
            Alert.alert("Missing Habit Name", "Please enter a habit name.")
            return
        }

        setSaving(true)

        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            
            const updatedHabit = {
                habit_name: habitName.trim(),
                habit_type: habitType,
                description: description.trim(),
                invited_partner: invitedPartner.trim(),
                repeat: repeat
            }

            const url = `${BASE_URL}/api/habits/${habitId}`
            console.log('📡 Full URL:', url)
            console.log('📦 Habit Data:', updatedHabit)

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedHabit)
            })

            const data = await response.json()

            if (response.ok) {
                Alert.alert(
                    "Habit Updated! ✅",
                    `"${habitName}" has been updated successfully!`,
                    [{
                        text: "Done",
                        onPress: () => router.back()
                    }]
                )
            } else {
                const errorMessage = data.detail || data.message || "Unable to update habit."
                console.error('❌ API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                })
                Alert.alert("Update Failed", `${response.status}: ${errorMessage}`)
            }
        } catch (err: any) {
            console.error('Habit update error:', err)
            Alert.alert("Error", err.message || "Unable to update habit. Please check your connection.")
        } finally {
            setSaving(false)
        }
    }

    const toggleRepeatDay = (day: string) => {
        if (repeat.includes(day)) {
            setRepeat(repeat.filter(d => d !== day))
        } else {
            setRepeat([...repeat, day])
        }
    }

    if (loading) {
        return (
            <View className="flex-1 bg-[#1a1a2e] justify-center items-center">
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-white mt-4 font-wix">Loading habit...</Text>
            </View>
        )
    }

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            
            {/* Back button */}
            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Main content */}
                <View className="flex-1 justify-start items-center pt-20 px-6">
                    {/* Title */}
                    <Text className="font-wix text-white text-[38px] text-center max-w-[80%]">
                        Edit Habit
                    </Text>

                    {/* Habit Name */}
                    <TextInput
                        className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-12"
                        placeholder="Habit name"
                        placeholderTextColor="#3F414E"
                        style={{ paddingHorizontal: 20 }}
                        value={habitName}
                        onChangeText={setHabitName}
                        editable={!saving}
                    />

                    {/* Habit Type */}
                    <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                        Habit Type
                    </Text>
                    <View className="flex-row mt-4" style={{ gap: 12 }}>
                        <GreyButton
                            onPress={() => setHabitType('Build')}
                            text="Build"
                            style={{
                                width: 100,
                                height: 45,
                                backgroundColor: habitType === 'Build' ? '#6b7280' : '#4b5563'
                            }}
                        />
                        <GreyButton
                            onPress={() => setHabitType('Quit')}
                            text="Quit"
                            style={{
                                width: 100,
                                height: 45,
                                backgroundColor: habitType === 'Quit' ? '#6b7280' : '#4b5563'
                            }}
                        />
                    </View>

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
                        editable={!saving}
                    />

                    {/* Invited Partner */}
                    <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                        Invited Partner
                    </Text>
                    <TextInput
                        className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-4"
                        placeholder="Your invite or @partner_name is pending"
                        placeholderTextColor="#3F414E"
                        style={{ paddingHorizontal: 20 }}
                        value={invitedPartner}
                        onChangeText={setInvitedPartner}
                        editable={!saving}
                    />

                    {/* Repeat */}
                    <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                        Repeat
                    </Text>
                    <View className="flex-row mt-4 flex-wrap justify-center" style={{ gap: 8 }}>
                        {['Daily', 'Weekly', 'Monthly'].map(day => (
                            <GreyButton
                                key={day}
                                onPress={() => toggleRepeatDay(day)}
                                text={day}
                                style={{
                                    width: 90,
                                    height: 45,
                                    backgroundColor: repeat.includes(day) ? '#6b7280' : '#4b5563'
                                }}
                            />
                        ))}
                    </View>

                    {saving && (
                        <View className="mt-6">
                            <ActivityIndicator size="large" color="#ffffff" />
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Save Button */}
            <View className="absolute bottom-12 w-full px-6 flex-row justify-center">
                <GreyButton
                    onPress={handleSave}
                    text={saving ? "SAVING..." : "SAVE"}
                    style={{ width: 280, height: 65 }}
                />
            </View>
        </View>
    )
}