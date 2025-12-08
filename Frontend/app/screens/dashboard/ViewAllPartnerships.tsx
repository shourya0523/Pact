import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import BackwardButton from '@/components/ui/backwardButton'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import HomeUI from '@/components/ui/home-ui'
import { logger } from '../../utils/logger'

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

export default function ViewAllPartnerships() {
    const router = useRouter()
    
    const [searchQuery, setSearchQuery] = useState('')
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
    const [currentPartners, setCurrentPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [sendingRequest, setSendingRequest] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [message])

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

            const BASE_URL = await getBaseUrl()

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

    const handleSendRequest = async () => {
        if (!searchQuery.trim()) {
            showMessage("Please enter a username", "error")
            return
        }

        setSendingRequest(true)

        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                return
            }

            const BASE_URL = await getBaseUrl()
            
            const response = await fetch(`${BASE_URL}/api/partnerships/requests/send?partner_username=${searchQuery.trim()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            })

            const data = await response.json()

            if (response.ok) {
                showMessage(`Request sent to ${searchQuery}!`, "success")
                setSearchQuery('')
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
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                return
            }

            const BASE_URL = await getBaseUrl()
            
            const response = await fetch(`${BASE_URL}/api/partnerships/requests/${requestId}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            })

            const data = await response.json()

            if (response.ok) {
                showMessage(`${username} is now your partner!`, "success")
                fetchData()
            } else {
                showMessage(data.detail || "Unable to accept request", "error")
            }

        } catch (err: any) {
            logger.error('Error accepting request:', err)
            showMessage("Unable to accept request", "error")
        }
    }

    const handleDeclineRequest = async (requestId: string, username: string) => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            
            if (!token) {
                showMessage("Please log in again", "error")
                return
            }

            const BASE_URL = await getBaseUrl()
            
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

                            const BASE_URL = await getBaseUrl()
                            
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

    const getInitial = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : '?'
    }

    if (loading) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <WhiteParticles />
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-white mt-4 font-wix">Loading partnerships...</Text>
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

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
                }
            >
                {/* Main content */}
                <View className="flex-1 justify-start items-center pt-20 px-6">
                    {/* Title */}
                    <Text className="font-wix text-white text-[38px] text-center max-w-[80%] mb-10">
                        Partnerships
                    </Text>

                    {/* Search Section */}
                    <Text className="font-wix text-white text-[24px] text-center mb-4">
                        Find Partners
                    </Text>
                    <View className="w-[80%] mb-3">
                        <TextInput
                            className="w-full h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix"
                            placeholder="Search by username..."
                            placeholderTextColor="#3F414E"
                            style={{ paddingHorizontal: 20 }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            editable={!sendingRequest}
                        />
                    </View>
                    
                    <TouchableOpacity 
                        onPress={handleSendRequest}
                        disabled={sendingRequest || !searchQuery.trim()}
                        className="rounded-[15px] px-6 py-3 mb-10"
                        style={{ 
                            backgroundColor: sendingRequest || !searchQuery.trim() 
                                ? 'rgba(139, 92, 246, 0.3)' 
                                : 'rgba(139, 92, 246, 0.6)' 
                        }}
                    >
                        {sendingRequest ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text className="font-wix text-white text-[14px] font-bold">
                                Send Request
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Pending Requests Section */}
                    {pendingRequests.length > 0 && (
                        <View className="w-[80%] mb-10">
                            <View className="flex-row items-center justify-center mb-4">
                                <Text className="font-wix text-white text-[24px]">
                                    Pending Requests
                                </Text>
                                <View 
                                    className="ml-2 rounded-full px-2.5 py-0.5 min-w-[24px] items-center justify-center"
                                    style={{ backgroundColor: 'rgba(139, 92, 246, 0.6)' }}
                                >
                                    <Text className="font-wix text-white text-[12px] font-bold">
                                        {pendingRequests.length}
                                    </Text>
                                </View>
                            </View>

                            {pendingRequests.map((request) => (
                                <View 
                                    key={request.request_id}
                                    className="bg-white/85 rounded-[20px] p-4 mb-3 flex-row items-center"
                                >
                                    <View 
                                        className="w-[50px] h-[50px] rounded-full items-center justify-center"
                                        style={{ backgroundColor: 'rgba(139, 92, 246, 0.8)' }}
                                    >
                                        <Text className="text-white text-[20px] font-wix font-bold">
                                            {getInitial(request.display_name || request.username)}
                                        </Text>
                                    </View>
                                    
                                    <View className="flex-1 ml-3">
                                        <Text className="font-wix text-gray-800 text-[16px] font-semibold">
                                            {request.display_name || request.username}
                                        </Text>
                                        <Text className="font-wix text-gray-600 text-[13px]">
                                            wants to be partners!
                                        </Text>
                                    </View>

                                    <View className="flex-row" style={{ gap: 6 }}>
                                        <TouchableOpacity
                                            onPress={() => handleAcceptRequest(request.request_id, request.display_name || request.username)}
                                            className="rounded-[12px] px-4 py-2"
                                            style={{ backgroundColor: '#a7f3d0' }}
                                        >
                                            <Text className="font-wix text-[12px] font-bold" style={{ color: '#065f46' }}>
                                                Accept
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleDeclineRequest(request.request_id, request.display_name || request.username)}
                                            className="rounded-[12px] px-4 py-2"
                                            style={{ backgroundColor: '#fca5a5' }}
                                        >
                                            <Text className="font-wix text-[12px] font-bold" style={{ color: '#7f1d1d' }}>
                                                Decline
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Current Partners Section */}
                    <View className="w-[80%] mb-6">
                        <Text className="font-wix text-white text-[24px] text-center mb-4">
                            Current Partners
                        </Text>

                        {currentPartners.length === 0 ? (
                            <View className="items-center py-10">
                                <Text className="font-wix text-white/50 text-[14px]">
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
                                    className="bg-white/85 rounded-[20px] p-4 mb-3 flex-row items-center"
                                >
                                    <View 
                                        className="w-[50px] h-[50px] rounded-full items-center justify-center"
                                        style={{ backgroundColor: 'rgba(139, 92, 246, 0.8)' }}
                                    >
                                        <Text className="text-white text-[20px] font-wix font-bold">
                                            {getInitial(partner.display_name || partner.username)}
                                        </Text>
                                    </View>
                                    
                                    <View className="flex-1 ml-3">
                                        <Text className="font-wix text-gray-800 text-[16px] font-semibold">
                                            {partner.display_name || partner.username}
                                        </Text>
                                        <Text className="font-wix text-gray-600 text-[13px]">
                                            {partner.shared_habits} shared habit{partner.shared_habits !== 1 ? 's' : ''}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => handleRemovePartner(partner.partnership_id, partner.display_name || partner.username)}
                                        className="rounded-[12px] px-4 py-2"
                                        style={{ backgroundColor: '#f87171' }}
                                    >
                                        <Text className="font-wix text-white text-[12px] font-bold">
                                            Remove
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
            
            <HomeUI />
        </View>
    )
}