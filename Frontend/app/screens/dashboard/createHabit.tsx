import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Image, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton';
import LightGreyButton from '@/components/ui/lightGreyButton'
import PurpleButton from '@/components/ui/purpleButton'
import GoalType from '@/components/popups/goal-set'
import InvitePartners from '@/components/popups/invite-partner'

export default function StudyHabitCreation() {
    const router = useRouter()
    
    // Form state
    const [habitName, setHabitName] = useState('')
    const [habitType, setHabitType] = useState<'build' | 'break'>('build')
    const [description, setDescription] = useState('')
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
    const [partnershipId, setPartnershipId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    
    // Popup state
    const [goalPopupVisible, setGoalPopupVisible] = useState(false)
    const [goalType, setGoalType] = useState<'completion' | 'frequency' | null>(null)
    const [invitePopupVisible, setInvitePopupVisible] = useState(false)

    useEffect(() => {
        fetchPartnership()
    }, [])

    const fetchPartnership = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            if (!token) return

            const BASE_URL = await getBaseUrl()
            const response = await fetch(`${BASE_URL}/api/partnerships/current`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                console.log('Partnership data:', data)
                if (data && data.id) {
                    setPartnershipId(data.id)
                    console.log('Partnership ID set:', data.id)
                }
            } else {
                console.log('No partnership found')
            }
        } catch (err) {
            console.error('Error fetching partnership:', err)
        }
    }

    const handleCreate = async () => {
        if (!habitName.trim()) {
            Alert.alert("Missing Habit Name", "Please enter a habit name.")
            return
        }

        if (!partnershipId) {
            Alert.alert(
                "No Partnership",
                "You need a partner to create habits. Would you like to invite one?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Invite Partner", onPress: () => router.push('/screens/dashboard/InvitePartners') }
                ]
            )
            return
        }

        setLoading(true)

        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            
            const habitData = {
                habit_name: habitName.trim(),
                habit_type: habitType,
                category: 'productivity',
                description: description.trim() || undefined,
                frequency: frequency,
                partnership_id: partnershipId
            }

            console.log('Creating habit with data:', habitData)

            const response = await fetch(`${BASE_URL}/api/habits`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(habitData)
            })

            const data = await response.json()
            console.log('Response:', data)

            if (response.ok) {
                const createdHabit = await response.json()
                console.log('✅ Habit created successfully:', createdHabit)
                
                Alert.alert(
                    "Habit Created! ✅",
                    `"${habitName}" has been created and is pending partner approval.\n\nIt will appear in your habits once your partner approves it.`,
                    [{
                        text: "View Habits",
                        onPress: () => router.replace("/screens/dashboard/HabitViews")
                    }]
                )
            } else {
                console.error('Creation failed:', data)
                Alert.alert("Creation Failed", data.detail || "Unable to create habit.")
            }
        } catch (err: any) {
            console.error('Habit creation error:', err)
            Alert.alert("Error", "Unable to create habit. Please check your connection.")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = () => {
        Alert.alert("Draft Saved", "Habit saved as draft (feature coming soon!)")
    }

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <Image
                source={require('app/images/space/spark.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 300, right: 165 }}
                resizeMode="cover"
            />
            <Image
                source={require('app/images/space/spark.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 380, left: 260, bottom: 600 }}
                resizeMode="cover"
            />
            <View className="flex-1 justify-center items-center">
                <Text className="font-wix text-white text-[38px] mt-12 text-center">Create Habit</Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-12"
                    placeholder="Study everyday"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                    value={habitName}
                    onChangeText={setHabitName}
                    editable={!loading}
                />
                <Text className="font-wix text-white text-[24px] text-center mt-4">Habit Type</Text>
                <View className="flex-row justify-center space-x-8 mt-4">
                    <LightGreyButton 
                        onPress={() => setHabitType('build')}
                        text="Build"
                        style={{ 
                            width: '140px',
                            backgroundColor: habitType === 'build' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                    />
                    <LightGreyButton 
                        onPress={() => setHabitType('break')}
                        text="Break"
                        style={{ 
                            width: '140px', 
                            backgroundColor: habitType === 'break' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                    />
                </View>
                <Text className="font-wix text-white text-[24px] text-center mt-4">Description</Text>
                <TextInput
                    className="w-[80%] h-[120px] bg-white/85 rounded-[20px] text-[16px] font-wix mt-4"
                    placeholder="Habit descripton"
                    placeholderTextColor="#3F414E"
                    multiline
                    textAlignVertical="top"
                    style={{ padding: 20 }}
                    value={description}
                    onChangeText={setDescription}
                    editable={!loading}
                />
                <View className="flex-row justify-center space-x-16 mt-4">
                    <View className="items-center">
                        <Text className="font-wix text-white text-[24px] text-center mb-8">
                        Invite Partner!
                        </Text>
                        <PurpleButton 
                            onPress={() => setInvitePopupVisible(true)}
                            text="INVITE"
                        />
                    </View>
                    <View className="items-center">
                        <Text className="font-wix text-white text-[24px] text-center mb-8">
                            Set Goal
                        </Text>
                        <PurpleButton 
                            onPress={() => setGoalPopupVisible(true)}
                            text="SET"
                        />
                    </View>
                </View>
                <Text className="font-wix text-white text-[24px] text-center mt-6">Repeat</Text>
                <View className="flex-row justify-center space-x-4 mt-10">
                    <LightGreyButton 
                        onPress={() => setFrequency('daily')}
                        text="Daily"
                        style={{
                            backgroundColor: frequency === 'daily' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                    />
                    <LightGreyButton 
                        onPress={() => setFrequency('weekly')}
                        text="Weekly"
                        style={{
                            backgroundColor: frequency === 'weekly' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                    />
                    <LightGreyButton 
                        onPress={() => setFrequency('monthly')}
                        text="Monthly"
                        style={{
                            backgroundColor: frequency === 'monthly' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                    />
                </View>
                <View className="flex-row justify-center mt-20 mb-10">
                    <GreyButton
                        onPress={handleCreate}
                        text={loading ? "CREATING..." : "CREATE"}
                        style={{ marginRight: 14, width: '200px', height: '65px' }}
                    />
                    <GreyButton
                        onPress={handleSave}
                        text="SAVE"
                        style={{ width: '200px', height: '65px'}}
                    />
                </View>
                
                {loading && (
                    <ActivityIndicator size="large" color="#ffffff" />
                )}
            </View>
            <GoalType
                visible={goalPopupVisible}
                onClose={() => setGoalPopupVisible(false)}
                onSelect={(type) => {
                setGoalType(type)
                setGoalPopupVisible(false)
                }}
            />
            <InvitePartners
                visible={invitePopupVisible}
                onClose={() => setInvitePopupVisible(false)}
                onSelect={(type) => {
                setGoalType(type)
                setInvitePopupVisible(false)
                }}
            />
        </View>
    )
}