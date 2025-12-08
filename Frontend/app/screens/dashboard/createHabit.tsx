import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, TouchableOpacity, Dimensions } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BASE_URL } from '../../../config'
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
    
    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const screenWidth = Dimensions.get('window').width

    useEffect(() => {
        if (draftId) {
            loadDraft()
        } else {
            fetchPartnership()
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
            style={{ backgroundColor: '#291133' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        >
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
                        paddingBottom: Platform.OS === 'ios' ? 180 : 140, 
                        paddingTop: Platform.OS === 'ios' ? 60 : 40,
                        paddingHorizontal: 20
                    }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                    <View className="items-center">
                        <Text className="font-wix text-white text-[36px] mb-8 text-center">
                    {isEditingDraft ? 'Edit Draft' : 'Create Habit'}
                </Text>
                        
                        {/* Habit Name Input */}
                        <View className="w-full mb-6">
                            <Text className="font-wix text-white text-[16px] mb-3 ml-1">
                        Habit Name <Text className="text-red-400">*</Text>
                    </Text>
                    <TextInput
                                className="h-[56px] bg-white/90 rounded-2xl text-[16px] font-wix"
                                placeholder="e.g., Study everyday"
                                placeholderTextColor="#6B7280"
                        style={{ paddingHorizontal: 20 }}
                        value={habitName}
                        onChangeText={setHabitName}
                        editable={!loading && !saving}
                    />
                </View>
                        {/* Habit Type */}
                        <View className="w-full mb-6">
                            <Text className="font-wix text-white text-[18px] mb-3 ml-1">Habit Type</Text>
                            <View className="flex-row justify-between gap-3">
                                <TouchableOpacity
                        onPress={() => setHabitType('build')}
                                    activeOpacity={0.7}
                                    className="flex-1 h-[52px] rounded-2xl items-center justify-center"
                        style={{ 
                                        backgroundColor: habitType === 'build' ? 'white' : 'rgba(255, 255, 255, 0.15)',
                                        borderWidth: habitType === 'build' ? 0 : 1,
                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                        }}
                                >
                                    <Text className="font-wix text-[16px]" style={{ color: habitType === 'build' ? '#291133' : 'white' }}>
                                        Build
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                        onPress={() => setHabitType('break')}
                                    activeOpacity={0.7}
                                    className="flex-1 h-[52px] rounded-2xl items-center justify-center"
                        style={{ 
                                        backgroundColor: habitType === 'break' ? 'white' : 'rgba(255, 255, 255, 0.15)',
                                        borderWidth: habitType === 'break' ? 0 : 1,
                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                        }}
                                >
                                    <Text className="font-wix text-[16px]" style={{ color: habitType === 'break' ? '#291133' : 'white' }}>
                                        Break
                                    </Text>
                                </TouchableOpacity>
                            </View>
                </View>
                        
                        {/* Description */}
                        <View className="w-full mb-6">
                            <Text className="font-wix text-white text-[18px] mb-3 ml-1">Description</Text>
                <TextInput
                                className="w-full min-h-[120px] bg-white/90 rounded-2xl text-[16px] font-wix"
                                placeholder="Add a description (optional)"
                                placeholderTextColor="#6B7280"
                    multiline
                    textAlignVertical="top"
                    style={{ padding: 20 }}
                    value={description}
                    onChangeText={setDescription}
                    editable={!loading}
                />
                        </View>
                        {/* Partner & Goal Section */}
                        <View className="w-full mb-6">
                            <View className="flex-row gap-3 mb-4">
                                <View className="flex-1">
                                    <Text className="font-wix text-white text-[16px] mb-3 ml-1">
                                        Partner <Text className="text-red-400">*</Text>
                                    </Text>
                        {selectedPartnerName ? (
                                        <View className="h-[52px] bg-green-500/20 rounded-2xl items-center justify-center border border-green-500/30">
                                            <Text className="font-wix text-green-400 text-[14px]">
                                                ✓ {selectedPartnerName}
                                </Text>
                            </View>
                        ) : (
                                        <TouchableOpacity
                                    onPress={() => setInvitePopupVisible(true)}
                                            activeOpacity={0.7}
                                            className="h-[52px] bg-white/15 rounded-2xl items-center justify-center border border-white/30"
                                        >
                                            <Text className="font-wix text-white text-[16px]">Add Partner</Text>
                                        </TouchableOpacity>
                        )}
                    </View>
                                <View className="flex-1">
                                    <Text className="font-wix text-white text-[16px] mb-3 ml-1">Goal</Text>
                                    <TouchableOpacity
                            onPress={() => setGoalPopupVisible(true)}
                                        activeOpacity={0.7}
                                        className="h-[52px] bg-white/15 rounded-2xl items-center justify-center border border-white/30"
                                    >
                                        <Text className="font-wix text-white text-[16px]">
                                            {goalType ? goalType.charAt(0).toUpperCase() + goalType.slice(1) : 'Set Goal'}
                            </Text>
                                    </TouchableOpacity>
                                </View>
                    </View>
                </View>
                        
                        {/* Frequency */}
                        <View className="w-full mb-8">
                            <Text className="font-wix text-white text-[18px] mb-3 ml-1">Repeat</Text>
                            <View className="flex-row justify-between gap-2">
                                {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                                    <TouchableOpacity
                                        key={freq}
                                        onPress={() => setFrequency(freq)}
                                        activeOpacity={0.7}
                                        className="flex-1 h-[52px] rounded-2xl items-center justify-center"
                        style={{
                                            backgroundColor: frequency === freq ? 'white' : 'rgba(255, 255, 255, 0.15)',
                                            borderWidth: frequency === freq ? 0 : 1,
                                            borderColor: 'rgba(255, 255, 255, 0.3)'
                        }}
                                    >
                                        <Text className="font-wix text-[14px]" style={{ color: frequency === freq ? '#291133' : 'white' }}>
                                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                </View>
                        {/* Action Buttons */}
                        <View className="w-full flex-row gap-3 mb-6">
                            <TouchableOpacity
                                onPress={handleCreate}
                        disabled={loading || saving}
                                activeOpacity={0.8}
                                className="flex-1 h-[56px] bg-white rounded-2xl items-center justify-center"
                                style={{ opacity: (loading || saving) ? 0.6 : 1 }}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#291133" />
                                ) : (
                                    <Text className="font-wix text-[#291133] text-[16px] font-semibold">
                                        CREATE
                                    </Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                        disabled={loading || saving}
                                activeOpacity={0.8}
                                className="flex-1 h-[56px] bg-white/20 rounded-2xl items-center justify-center border border-white/30"
                                style={{ opacity: (loading || saving) ? 0.6 : 1 }}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text className="font-wix text-white text-[16px] font-semibold">
                                        SAVE DRAFT
                                    </Text>
                                )}
                            </TouchableOpacity>
                </View>
                </View>
            </ScrollView>
            </Animated.View>
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