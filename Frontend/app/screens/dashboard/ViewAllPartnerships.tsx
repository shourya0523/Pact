import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BASE_URL } from '../../../config'
import BackwardButton from '@/components/ui/backwardButton'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import DashboardLayout from '../../components/navigation/DashboardLayout'
import { logger } from '../../utils/logger'
import TutorialElement from '../../components/tutorial/TutorialElement'
import { notificationAPI } from '../../services/notificationAPI'
import { Ionicons } from '@expo/vector-icons'

interface PendingRequest {
    request_id: string
    sender_id: string
    username: string
    display_name: string
    profile_picture?: string
    created_at: string
}

interface Partner {
    partnership_id: string
    partner_id: string
    username: string
    display_name: string
    profile_picture?: string
    shared_habits: number
    created_at: string
}

interface SearchUser {
    id: string
    username: string
    display_name: string
    profile_photo_url?: string
    email: string
}

export default function ViewAllPartnerships() {
    const router = useRouter()
    
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchUser[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
    const [currentPartners, setCurrentPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [sendingRequest, setSendingRequest] = useState(false)
    const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        fetchData()
        
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

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [message])

    // Debounced search function
    useEffect(() => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        // If search query is empty, clear results
        if (!searchQuery.trim()) {
            setSearchResults([])
            return
        }

        // Set loading state
        setSearchLoading(true)

        // Debounce search by 500ms
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const token = await AsyncStorage.getItem('access_token')
                
                if (!token) {
                    setSearchResults([])
                    setSearchLoading(false)
                    return
                }

                const response = await fetch(
                    `${BASE_URL}/api/users/search?query=${encodeURIComponent(searchQuery.trim())}&limit=10`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        }
                    }
                )

                if (response.ok) {
                    const data = await response.json()
                    setSearchResults(data)
                } else {
                    setSearchResults([])
                }
            } catch (err: any) {
                logger.error('Error searching users:', err)
                setSearchResults([])
            } finally {
                setSearchLoading(false)
            }
        }, 500)

        // Cleanup function
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [searchQuery])

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type })
    }

    const fetchData = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            // Fetch pending requests
            const requestsResponse = await fetch(`${BASE_URL}/api/partnerships/requests/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            })

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json()
                logger.log('Pending requests:', requestsData.length)
                setPendingRequests(requestsData)
            }

            // Fetch current partnerships
            const partnersResponse = await fetch(`${BASE_URL}/api/partnerships/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            })

            if (partnersResponse.ok) {
                const partnersData = await partnersResponse.json()
                logger.log('Current partners:', partnersData.length)
                setCurrentPartners(partnersData)
            }

        } catch (err: any) {
            logger.error('Error fetching partnerships:', err)
            showMessage("Unable to load partnerships data", "error")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const onRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    const handleSendRequest = async (username?: string) => {
        const targetUsername = username || searchQuery.trim()
        
        if (!targetUsername) {
            showMessage("Please select a user", "error")
            return
        }

        setSendingRequest(true)

        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                return
            }
            
            const response = await fetch(`${BASE_URL}/api/partnerships/requests/send?partner_username=${targetUsername}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            })

            const data = await response.json()

            if (response.ok) {
                const displayName = searchResults.find(u => u.username === targetUsername)?.display_name || targetUsername
                showMessage(`Request sent to ${displayName}!`, "success")
                setSearchQuery('')
                setSearchResults([])
                fetchData()
            } else {
                showMessage(data.detail || "Unable to send request", "error")
            }

        } catch (err: any) {
            logger.error('Error sending request:', err)
            showMessage("Unable to send request", "error")
        } finally {
            setSendingRequest(false)
        }
    }

    const handleAcceptRequest = async (requestId: string, username: string) => {
        // Prevent double-clicks
        if (acceptingRequestId === requestId) {
            return
        }

        setAcceptingRequestId(requestId)
        
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                setAcceptingRequestId(null)
                return
            }
            
            logger.log(`Attempting to accept request: ${requestId} for user: ${username}`)
            
            const response = await fetch(`${BASE_URL}/api/partnerships/requests/${requestId}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            })

            logger.log(`Response status: ${response.status}`)

            let data
            try {
                data = await response.json()
            } catch (parseError) {
                logger.error('Failed to parse response:', parseError)
                showMessage("Server error: Invalid response format", "error")
                setAcceptingRequestId(null)
                return
            }
            
            logger.log('Response data:', data)

            if (response.ok) {
                showMessage(`${username} is now your partner!`, "success")
                // Refresh data after a short delay to ensure backend has processed
                setTimeout(() => {
                    fetchData()
                }, 500)
            } else {
                const errorMsg = data.detail || data.message || `Unable to accept request (${response.status})`
                logger.error('Accept request failed:', errorMsg, data)
                showMessage(errorMsg, "error")
            }

        } catch (err: any) {
            logger.error('Error accepting request:', err)
            const errorMsg = err.message || "Unable to accept request. Please check your connection and try again."
            showMessage(errorMsg, "error")
        } finally {
            setAcceptingRequestId(null)
        }
    }

    const handleDeclineRequest = async (requestId: string, username: string) => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                return
            }
            
            const response = await fetch(`${BASE_URL}/api/partnerships/requests/${requestId}/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            })

            if (response.ok) {
                showMessage(`Request from ${username} declined`, "success")
                fetchData()
            } else {
                showMessage("Unable to decline request", "error")
            }

        } catch (err: any) {
            logger.error('Error declining request:', err)
            showMessage("Unable to decline request", "error")
        }
    }

    const handleRemovePartner = async (partnershipId: string, username: string) => {
        Alert.alert(
            "Remove Partner",
            `Are you sure you want to remove ${username}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('access_token')
                            
                            if (!token) {
                                showMessage("Please log in again", "error")
                                return
                            }
                            
                            const response = await fetch(`${BASE_URL}/api/partnerships/${partnershipId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                }
                            })

                            if (response.ok) {
                                showMessage(`${username} removed`, "success")
                                fetchData()
                            } else {
                                showMessage("Unable to remove partner", "error")
                            }

                        } catch (err: any) {
                            logger.error('Error removing partner:', err)
                            showMessage("Unable to remove partner", "error")
                        }
                    }
                }
            ]
        )
    }

    const handleNudge = async (partnerId: string, partnerName: string, partnershipId?: string) => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                return
            }

            // Fetch shared habits for this specific partnership
            const habitsResponse = await fetch(`${BASE_URL}/api/habits`, {
                headers: {'Authorization': `Bearer ${token}`}
            })
            
            if (!habitsResponse.ok) {
                showMessage("Unable to fetch habits", "error")
                return
            }

            const habitsData = await habitsResponse.json()
            // Filter habits by the specific partnership_id for this partner
            const sharedHabits = partnershipId 
                ? habitsData.filter((h: any) => h.partnership_id === partnershipId)
                : habitsData.filter((h: any) => h.partnership_id)
            
            if (sharedHabits.length === 0) {
                Alert.alert('No Shared Habits', 'You need to have shared habits with this partner to send a nudge.')
                return
            }

            // If only one habit, nudge directly. Otherwise, show selection
            if (sharedHabits.length === 1) {
                const habitId = sharedHabits[0].id || sharedHabits[0]._id
                try {
                    const result = await notificationAPI.sendNudge(partnerId, habitId)
                    showMessage(`✅ Nudge sent to ${partnerName}!`, "success")
                } catch (err: any) {
                    logger.error('Error sending nudge:', err)
                    const errorMessage = err.message || "Failed to send nudge"
                    if (errorMessage.includes('once per day')) {
                        Alert.alert('⏰ Rate Limit', errorMessage)
                    } else {
                        showMessage(errorMessage, "error")
                    }
                }
            } else {
                // Show habit selection
                Alert.alert(
                    'Select Habit',
                    `Which habit would you like to nudge ${partnerName} about?`,
                    sharedHabits.map((habit: any) => ({
                        text: habit.habit_name,
                        onPress: async () => {
                            try {
                                const habitId = habit.id || habit._id
                                const result = await notificationAPI.sendNudge(partnerId, habitId)
                                showMessage(`✅ Nudge sent to ${partnerName}!`, "success")
                            } catch (err: any) {
                                logger.error('Error sending nudge:', err)
                                const errorMessage = err.message || "Failed to send nudge"
                                if (errorMessage.includes('once per day')) {
                                    Alert.alert('⏰ Rate Limit', errorMessage)
                                } else {
                                    showMessage(errorMessage, "error")
                                }
                            }
                        }
                    })).concat([{ text: 'Cancel', style: 'cancel' }])
                )
            }
        } catch (err: any) {
            logger.error('Error sending nudge:', err)
            showMessage("Failed to send nudge", "error")
        }
    }

    const getInitial = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : '?'
    }

    if (loading) {
        return (
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <WhiteParticles />
                <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-white mt-4 font-wix">Loading partnerships...</Text>
                </View>
            </View>
        )
    }

    return (
        <DashboardLayout>
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <WhiteParticles />
                <View className="absolute bottom-0 right-0">
                    <View style={{height: 250, width: 250, opacity: 0.3}}>
                        <View className="absolute inset-0" style={{backgroundColor: '#291133'}} />
                    </View>
                </View>
            
            {/* Back button */}
            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton />
            </View>

            {/* Toast Message */}
            {message && (
                <View 
                    className="absolute top-20 left-0 right-0 mx-6 px-4 py-3 rounded-[15px] z-50"
                    style={{ 
                        backgroundColor: message.type === 'success' 
                            ? 'rgba(167, 243, 208, 0.95)' 
                            : 'rgba(252, 165, 165, 0.95)' 
                    }}
                >
                    <Text 
                        className="font-wix text-center text-[14px] font-semibold"
                        style={{ 
                            color: message.type === 'success' ? '#065f46' : '#7f1d1d' 
                        }}
                    >
                        {message.text}
                    </Text>
                </View>
            )}

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
                        paddingBottom: 120,
                        paddingHorizontal: 20
                    }}
                refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />
                }
                    showsVerticalScrollIndicator={false}
            >
                    {/* Title */}
                    <TutorialElement id="partnerships-screen">
                        <Text className="font-wix text-white text-[36px] text-center mb-8">
                            Partnerships
                        </Text>
                    </TutorialElement>

                    {/* Search Section */}
                    <View className="mb-6">
                        <Text className="font-wix text-white text-[18px] mb-3 ml-1">
                        Find Partners
                    </Text>
                        <View className="relative">
                            <TextInput
                                className="w-full h-[56px] bg-white/90 rounded-2xl text-[16px] font-wix"
                                placeholder="Search by username or name..."
                                placeholderTextColor="#6B7280"
                                style={{ paddingHorizontal: 20 }}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                editable={!sendingRequest}
                            />
                            {searchLoading && (
                                <View className="absolute right-4 top-0 bottom-0 justify-center">
                                    <ActivityIndicator size="small" color="#6B7280" />
                                </View>
                            )}
                        </View>

                        {/* Search Results */}
                        {searchQuery.trim() && searchResults.length > 0 && (
                            <View className="mt-3 bg-white/95 rounded-2xl max-h-[300px] overflow-hidden">
                                <ScrollView 
                                    className="max-h-[300px]"
                                    showsVerticalScrollIndicator={false}
                                >
                                    {searchResults.map((user) => (
                                        <TouchableOpacity
                                            key={user.id}
                                            onPress={() => handleSendRequest(user.username)}
                                            activeOpacity={0.7}
                                            className="p-4 border-b border-gray-200/30 flex-row items-center"
                                            disabled={sendingRequest}
                                        >
                                            <View 
                                                className="w-[40px] h-[40px] rounded-full items-center justify-center"
                                                style={{ backgroundColor: 'rgba(168, 85, 247, 0.8)' }}
                                            >
                                                <Text className="text-white text-[16px] font-wix font-bold">
                                                    {getInitial(user.display_name || user.username)}
                                                </Text>
                                            </View>
                                            
                                            <View className="flex-1 ml-3">
                                                <Text className="font-wix text-gray-800 text-[15px] font-semibold">
                                                    {user.display_name || user.username}
                                                </Text>
                                                <Text className="font-wix text-gray-500 text-[12px]">
                                                    @{user.username}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => handleSendRequest(user.username)}
                                                disabled={sendingRequest}
                                                activeOpacity={0.8}
                                                className="rounded-xl px-4 py-2"
                                                style={{ backgroundColor: 'rgba(168, 85, 247, 0.8)' }}
                                            >
                                                <Text className="font-wix text-white text-[12px] font-bold">
                                                    Send
                                                </Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
                            <View className="mt-3 bg-white/10 rounded-2xl p-4 border border-white/20">
                                <Text className="font-wix text-white/60 text-[14px] text-center">
                                    No users found
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Pending Requests Section */}
                    {pendingRequests.length > 0 && (
                        <View className="w-full mb-8">
                            <View className="flex-row items-center mb-4">
                                <Text className="font-wix text-white text-[20px]">
                                    Pending Requests
                                </Text>
                                <View 
                                    className="ml-2 rounded-full px-3 py-1 min-w-[28px] items-center justify-center"
                                    style={{ backgroundColor: 'rgba(168, 85, 247, 0.6)' }}
                                >
                                    <Text className="font-wix text-white text-[14px] font-bold">
                                        {pendingRequests.length}
                                    </Text>
                                </View>
                            </View>

                            {pendingRequests.map((request) => (
                                <View 
                                    key={request.request_id}
                                    className="bg-white/10 rounded-2xl p-4 mb-3 flex-row items-center border border-white/20"
                                >
                                    <View 
                                        className="w-[48px] h-[48px] rounded-full items-center justify-center"
                                        style={{ backgroundColor: 'rgba(168, 85, 247, 0.8)' }}
                                    >
                                        <Text className="text-white text-[18px] font-wix font-bold">
                                            {getInitial(request.display_name || request.username)}
                                        </Text>
                                    </View>
                                    
                                    <View className="flex-1 ml-3">
                                        <Text className="font-wix text-white text-[16px] font-semibold">
                                            {request.display_name || request.username}
                                        </Text>
                                        <Text className="font-wix text-white/60 text-[13px]">
                                            wants to be partners!
                                        </Text>
                                    </View>

                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => handleAcceptRequest(request.request_id, request.display_name || request.username)}
                                            activeOpacity={0.8}
                                            disabled={acceptingRequestId === request.request_id}
                                            className="rounded-xl px-4 py-2"
                                            style={{ 
                                                backgroundColor: acceptingRequestId === request.request_id 
                                                    ? 'rgba(16, 185, 129, 0.5)' 
                                                    : 'rgba(16, 185, 129, 0.8)',
                                                opacity: acceptingRequestId === request.request_id ? 0.6 : 1
                                            }}
                                        >
                                            {acceptingRequestId === request.request_id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text className="font-wix text-[13px] font-bold text-white">
                                                    Accept
                                                </Text>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleDeclineRequest(request.request_id, request.display_name || request.username)}
                                            activeOpacity={0.8}
                                            className="rounded-xl px-4 py-2"
                                            style={{ backgroundColor: 'rgba(248, 113, 113, 0.8)' }}
                                        >
                                            <Text className="font-wix text-[13px] font-bold text-white">
                                                Decline
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Current Partners Section */}
                    <View className="w-full mb-6">
                        <Text className="font-wix text-white text-[20px] mb-4">
                            Current Partners
                        </Text>

                        {currentPartners.length === 0 ? (
                            <View className="items-center py-10 bg-white/5 rounded-2xl border border-white/10">
                                <Text className="font-wix text-white/60 text-[14px]">
                                    No partners yet
                                </Text>
                                <Text className="font-wix text-white/40 text-[12px] mt-2">
                                    Search for a username above to get started!
                                </Text>
                            </View>
                        ) : (
                            currentPartners.map((partner) => (
                                <View 
                                    key={partner.partnership_id}
                                    className="bg-white/10 rounded-2xl p-4 mb-3 flex-row items-center border border-white/20"
                                >
                                    <View 
                                        className="w-[48px] h-[48px] rounded-full items-center justify-center"
                                        style={{ backgroundColor: 'rgba(168, 85, 247, 0.8)' }}
                                    >
                                        <Text className="text-white text-[18px] font-wix font-bold">
                                            {getInitial(partner.display_name || partner.username)}
                                        </Text>
                                    </View>
                                    
                                    <View className="flex-1 ml-3">
                                        <Text className="font-wix text-white text-[16px] font-semibold">
                                            {partner.display_name || partner.username}
                                        </Text>
                                        <Text className="font-wix text-white/60 text-[13px]">
                                            {partner.shared_habits} shared habit{partner.shared_habits !== 1 ? 's' : ''}
                                        </Text>
                                    </View>

                                    <View className="flex-row gap-2 items-center">
                                        {partner.shared_habits > 0 && (
                                            <TouchableOpacity
                                                onPress={() => handleNudge(partner.partner_id, partner.display_name || partner.username, partner.partnership_id)}
                                                activeOpacity={0.8}
                                                className="rounded-xl px-3 py-2 flex-row items-center gap-1.5"
                                                style={{ backgroundColor: 'rgba(168, 85, 247, 0.8)' }}
                                            >
                                                <Ionicons name="notifications-outline" size={14} color="#fff" />
                                                <Text className="font-wix text-white text-[13px] font-bold">
                                                    Nudge
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => handleRemovePartner(partner.partnership_id, partner.display_name || partner.username)}
                                            activeOpacity={0.8}
                                            className="rounded-xl px-4 py-2"
                                            style={{ backgroundColor: 'rgba(248, 113, 113, 0.8)' }}
                                        >
                                            <Text className="font-wix text-white text-[13px] font-bold">
                                                Remove
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                </View>
            </ScrollView>
            </Animated.View>
            </View>
        </DashboardLayout>
    )
}