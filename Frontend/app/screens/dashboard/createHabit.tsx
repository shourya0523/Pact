import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton';
import LightGreyButton from '@/components/ui/lightGreyButton'
import PurpleButton from '@/components/ui/purpleButton'
import GoalType from '@/components/popups/goal-set'
import InvitePartners from '@/components/popups/invite-partner'
import { logger } from '../../utils/logger'

export default function StudyHabitCreation() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const draftId = params.draftId as string | undefined
    
    const [habitName, setHabitName] = useState('')
    const [habitType, setHabitType] = useState<'build' | 'break'>('build')
    const [description, setDescription] = useState('')
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
    const [partnershipId, setPartnershipId] = useState<string | null>(null)
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
    const [selectedPartnerName, setSelectedPartnerName] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [createdHabitId, setCreatedHabitId] = useState<string | null>(null)
    const [isEditingDraft, setIsEditingDraft] = useState(false)

    const [goalPopupVisible, setGoalPopupVisible] = useState(false)
    const [goalType, setGoalType] = useState<'completion' | 'frequency' | null>(null)
    const [invitePopupVisible, setInvitePopupVisible] = useState(false)
    const [goalSet, setGoalSet] = useState(false)

    useEffect(() => {
        if (draftId) {
            loadDraft()
        } else {
            fetchPartnership()
        }
    }, [draftId])

    const loadDraft = async () => {
        if (!draftId) return
        
        setLoading(true)
        try {
            const token = await AsyncStorage.getItem('access_token')
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            const response = await fetch(`${BASE_URL}/api/habits/drafts/${draftId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (response.ok) {
                const draftData = await response.json()
                logger.log('📥 Loaded draft:', draftData)
                
                // Populate form with draft data
                setHabitName(draftData.habit_name || '')
                setHabitType(draftData.habit_type || 'build')
                setDescription(draftData.description || '')
                setFrequency(draftData.frequency || 'daily')
                setIsEditingDraft(true)
                
                // Note: Partner info might not be in draft (drafts don't require partners)
                // User can still add/change partner when converting to active habit
            } else {
                Alert.alert("Error", "Failed to load draft.")
                router.back()
            }
        } catch (err) {
            logger.error('Error loading draft:', err)
            Alert.alert("Error", "Failed to load draft.")
            router.back()
        } finally {
            setLoading(false)
        }
    }

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

            if (response.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (response.ok) {
                const data = await response.json()
                logger.log('Partnership data:', data)
                if (data && data.id) {
                    setPartnershipId(data.id)
                    logger.log('Partnership ID set:', data.id)
                }
            } else {
                logger.log('No partnership found')
            }
        } catch (err) {
            logger.error('Error fetching partnership:', err)
        }
    }

    // Validation function to check all required fields
    const validateFields = (): { isValid: boolean; missingFields: string[] } => {
        const missingFields: string[] = []
        
        if (!habitName.trim()) {
            missingFields.push("Habit Name")
        }
        
        if (!selectedPartnerId) {
            missingFields.push("Partner")
        }
        
        // Description and goal are optional, so we don't check them
        
        return {
            isValid: missingFields.length === 0,
            missingFields
        }
    }

    const handleCreate = async () => {
        console.log('🔵 handleCreate called', { habitName, selectedPartnerId, loading, saving })
        
        // Validate all required fields
        const validation = validateFields()
        if (!validation.isValid) {
            const missingList = validation.missingFields.join(", ")
            Alert.alert(
                "Incomplete Form",
                `Please complete the following fields:\n\n${validation.missingFields.map(f => `• ${f}`).join('\n')}`,
                [{ text: "OK" }]
            )
            return
        }

        if (loading || saving) {
            console.log('⏸️ Already loading/saving, ignoring click')
            return
        }

        setLoading(true)
        console.log('🔄 Starting habit creation...')

        try {
            const token = await AsyncStorage.getItem('access_token')
        
        if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                setLoading(false)
                return
            }

            const BASE_URL = await getBaseUrl()
            
            // First, find the partnership_id between current user and selected partner
            let partnershipsResponse
            try {
                partnershipsResponse = await fetch(`${BASE_URL}/api/partnerships/all`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                })
            } catch (err: any) {
                logger.error('Network error fetching partnerships:', err)
                Alert.alert("Network Error", "Unable to connect. Please check your connection.")
                setLoading(false)
                return
            }

            if (partnershipsResponse.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                setLoading(false)
                return
            }

            if (!partnershipsResponse.ok) {
                const errorData = await partnershipsResponse.json().catch(() => ({}))
                logger.error('Failed to fetch partnerships:', errorData)
                Alert.alert("Error", errorData.detail || "Unable to find partnership.")
                setLoading(false)
                return
            }

            const partnerships = await partnershipsResponse.json()
            const partnership = partnerships.find((p: any) => p.partner_id === selectedPartnerId)

            if (!partnership) {
                Alert.alert("Error", "Partnership not found with selected partner.")
                setLoading(false)
                return
            }

            // Now create the habit with the partnership_id
            const habitData = {
                habit_name: habitName.trim(),
                habit_type: habitType,
                category: 'productivity',
                description: description.trim() || undefined,
                frequency: frequency,
                partnership_id: partnership.partnership_id
            }

            logger.log('Creating habit with data:', habitData)

            const response = await fetch(`${BASE_URL}/api/habits`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(habitData)
            })

            if (response.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                setLoading(false)
                return
            }

            const data = await response.json()
            logger.log('Response:', data)

            if (response.ok) {
                logger.log('✅ Habit created successfully:', data)
                setCreatedHabitId(data.id)
                
                // If this was created from a draft, delete the draft and reset state
                if (isEditingDraft && draftId) {
                    try {
                        await fetch(`${BASE_URL}/api/habits/drafts/${draftId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                            }
                        })
                        // Reset draft editing state after successful deletion
                        setIsEditingDraft(false)
                    } catch (err) {
                        logger.error('Error deleting draft after creation:', err)
                        // Don't fail the whole operation if draft deletion fails
                        setIsEditingDraft(false)
                    }
                }
                
                // Navigate directly to all habits screen after successful creation
                // The habit will appear in the list (pending approval)
                router.replace("/screens/dashboard/HabitViews")
            } else {
                logger.error('Creation failed:', data)
                Alert.alert("Creation Failed", data.detail || "Unable to create habit.")
            }
        } catch (err: any) {
            console.error('❌ Habit creation error:', err)
            logger.error('Habit creation error:', err)
            const errorMessage = err?.message || err?.toString() || "Unable to create habit. Please check your connection."
            Alert.alert("Error", errorMessage)
        } finally {
            console.log('✅ handleCreate finished, setting loading to false')
            setLoading(false)
        }
    }

    const handleSave = async () => {
        // Only require habit name for draft (partner is optional for drafts)
        if (!habitName.trim()) {
            Alert.alert("Missing Habit Name", "Please enter a habit name to save as draft.")
            return
        }

        if (loading || saving) {
            return
        }

        setSaving(true)
        console.log('💾 Saving as draft...')

        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const BASE_URL = await getBaseUrl()
            
            const draftData = {
                habit_name: habitName.trim(),
                habit_type: habitType,
                category: 'productivity',
                description: description.trim() || undefined,
                frequency: frequency,
                // Note: partnership_id is intentionally omitted for drafts
            }

            // Check if draft still exists before attempting update
            // If draftId exists but isEditingDraft is false, it means draft was deleted
            // (e.g., after creating habit from draft), so create new draft instead
            const shouldUpdate = isEditingDraft && draftId
            
            logger.log(shouldUpdate ? 'Updating draft:' : 'Creating draft:', draftData)

            const url = shouldUpdate
                ? `${BASE_URL}/api/habits/drafts/${draftId}`
                : `${BASE_URL}/api/habits/drafts`
            
            const method = shouldUpdate ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(draftData)
            })

            if (response.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            const data = await response.json()

            if (response.ok) {
                logger.log('✅ Draft saved successfully:', data)
                
                // Update draftId if this was a new draft (so we can update it later)
                if (!isEditingDraft && data.id) {
                    // Note: We can't update the route params, but the draft is saved
                    // User can continue editing and it will update the existing draft
                }
                
                Alert.alert(
                    "Draft Saved! ✅",
                    isEditingDraft 
                        ? "Your draft has been updated."
                        : "Your habit has been saved as a draft. You can continue editing or create it later.",
                    [{
                        text: "OK",
                        onPress: () => router.back()
                    }]
                )
            } else {
                logger.error('Draft save failed:', data)
                Alert.alert("Save Failed", data.detail || "Unable to save draft.")
            }
        } catch (err: any) {
            console.error('❌ Draft save error:', err)
            logger.error('Draft save error:', err)
            const errorMessage = err?.message || err?.toString() || "Unable to save draft. Please check your connection."
            Alert.alert("Error", errorMessage)
        } finally {
            console.log('✅ handleSave finished')
            setSaving(false)
        }
    }

    return (
        <KeyboardAvoidingView 
            className="flex-1 relative"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
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
            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 140, paddingTop: 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-1 justify-center items-center">
                <Text className="font-wix text-white text-[38px] mt-12 text-center">
                    {isEditingDraft ? 'Edit Draft' : 'Create Habit'}
                </Text>
                <View className="w-[80%] mt-12">
                    <Text className="font-wix text-white text-[16px] mb-2">
                        Habit Name <Text className="text-red-400">*</Text>
                    </Text>
                    <TextInput
                        className="h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix"
                        placeholder="Study everyday"
                        placeholderTextColor="#3F414E"
                        style={{ paddingHorizontal: 20 }}
                        value={habitName}
                        onChangeText={setHabitName}
                        editable={!loading && !saving}
                    />
                </View>
                <Text className="font-wix text-white text-[24px] text-center mt-4">Habit Type</Text>
                <View className="flex-row justify-center space-x-8 mt-4">
                    <LightGreyButton 
                        onPress={() => setHabitType('build')}
                        text="Build"
                        style={{ 
                            width: '140px',
                            backgroundColor: habitType === 'build' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                        textStyle={{
                            color: habitType === 'build' ? '#2D1B4E' : 'white'
                        }}
                    />
                    <LightGreyButton 
                        onPress={() => setHabitType('break')}
                        text="Break"
                        style={{ 
                            width: '140px', 
                            backgroundColor: habitType === 'break' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                        textStyle={{
                            color: habitType === 'break' ? '#2D1B4E' : 'white'
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
                        {selectedPartnerName ? (
                            <View className="items-center">
                                <Text className="font-wix text-white text-[24px] text-center mt-4 mb-2">
                                    Add Partner! <Text className="text-red-400">*</Text>
                                </Text>
                                <Text className="font-wix text-green-400 text-[16px] text-center mt-4 mb-4">
                                    ✓ {selectedPartnerName} added as partner
                                </Text>
                            </View>
                        ) : (
                            <>
                                <Text className="font-wix text-white text-[24px] text-center mt-4 mb-4">
                                    Add Partner! <Text className="text-red-400">*</Text>
                                </Text>
                                <PurpleButton 
                                    onPress={() => setInvitePopupVisible(true)}
                                    text="ADD"
                                />
                            </>
                        )}
                    </View>
                    <View className="items-center">
                        <Text className="font-wix text-white text-[24px] text-center mb-8">
                            Set Goal
                        </Text>
                        <PurpleButton 
                            onPress={() => setGoalPopupVisible(true)}
                            text={goalType ? goalType.toUpperCase() : "SET"}
                        />
                        {goalType && (
                            <Text className="text-white/70 text-xs mt-2">
                                {goalType === 'completion' ? 'Completion goal selected' : 'Frequency goal selected'}
                            </Text>
                        )}
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
                        textStyle={{
                            color: frequency === 'daily' ? '#2D1B4E' : 'white'
                        }}
                    />
                    <LightGreyButton 
                        onPress={() => setFrequency('weekly')}
                        text="Weekly"
                        style={{
                            backgroundColor: frequency === 'weekly' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                        textStyle={{
                            color: frequency === 'weekly' ? '#2D1B4E' : 'white'
                        }}
                    />
                    <LightGreyButton 
                        onPress={() => setFrequency('monthly')}
                        text="Monthly"
                        style={{
                            backgroundColor: frequency === 'monthly' ? 'white' : 'rgba(129, 132, 152, 0.4)'
                        }}
                        textStyle={{
                            color: frequency === 'monthly' ? '#2D1B4E' : 'white'
                        }}
                    />
                </View>
                <View className="flex-row justify-center mt-20 mb-10">
                    <GreyButton
                        onPress={() => {
                            console.log('🔘 CREATE button pressed', { loading, saving, habitName, selectedPartnerId })
                            handleCreate()
                        }}
                        text={loading ? "CREATING..." : "CREATE"}
                        disabled={loading || saving}
                        style={{ marginRight: 14, width: '200px', height: '65px' }}
                    />
                    <GreyButton
                        onPress={() => {
                            console.log('🔘 SAVE button pressed', { loading, saving })
                            handleSave()
                        }}
                        text={saving ? "SAVING..." : "SAVE"}
                        disabled={loading || saving}
                        style={{ width: '200px', height: '65px' }}
                    />
                </View>
                
                {(loading || saving) && (
                    <ActivityIndicator size="large" color="#ffffff" />
                )}
                </View>
            </ScrollView>
            <GoalType
                visible={goalPopupVisible}
                onClose={() => setGoalPopupVisible(false)}
                onSelect={(type) => {
                    logger.log('🎯 Goal type selected:', type)
                    setGoalType(type)
                    setGoalPopupVisible(false)
                    // Note: Navigation to goal screen will happen after habit creation
                    // Goal type is saved in state and will be used when habit is created
                }}
            />
            <InvitePartners
                visible={invitePopupVisible}
                onClose={() => setInvitePopupVisible(false)}
                onSelectPartner={(partnerId, partnerName) => {
                setSelectedPartnerId(partnerId);
                setSelectedPartnerName(partnerName);
                logger.log('Partner selected:', partnerName, partnerId);
                }}
            />
        </KeyboardAvoidingView>
    )
} 