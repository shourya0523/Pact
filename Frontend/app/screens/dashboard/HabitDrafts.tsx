import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import HomeUI from "@/components/ui/home-ui"
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import BackwardButton from '@/components/ui/backwardButton'
import { Ionicons } from '@expo/vector-icons'
import { scaleFont, scaleSize } from '../../utils/constants'

interface HabitDraft {
    id: string;
    habit_name: string;
    habit_type: string;
    category?: string;
    description?: string;
    frequency?: string;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export default function HabitDrafts() {
    const router = useRouter()
    const [drafts, setDrafts] = useState<HabitDraft[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDrafts()
    }, [])

    // Refresh drafts when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            fetchDrafts()
        }, [])
    )

    const fetchDrafts = async () => {
        console.log('🚀 STARTING fetchDrafts')
        setLoading(true)
        try {
            const token = await AsyncStorage.getItem('access_token')

            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                setLoading(false)
                return
            }

            const BASE_URL = await getBaseUrl()
            console.log('🔍 Fetching drafts...')

            const draftsResponse = await fetch(`${BASE_URL}/api/habits/drafts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            console.log('📡 Drafts response status:', draftsResponse.status)

            if (draftsResponse.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace("/screens/auth/LoginScreen")
                return
            }

            if (!draftsResponse.ok) {
                console.error('❌ Failed to fetch drafts')
                setDrafts([])
                setLoading(false)
                return
            }

            const draftsData = await draftsResponse.json()
            console.log('✅ Fetched drafts:', draftsData)
            setDrafts(draftsData)
        } catch (err) {
            console.error('💥 Fetch drafts error:', err)
            setDrafts([])
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteDraft = async (draftId: string) => {
        Alert.alert(
            "Delete Draft",
            "Are you sure you want to delete this draft?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('access_token')
                            if (!token) return

                            const BASE_URL = await getBaseUrl()
                            const response = await fetch(`${BASE_URL}/api/habits/drafts/${draftId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            })

                            if (response.ok || response.status === 204) {
                                // Remove draft from state
                                setDrafts(drafts.filter(d => d.id !== draftId))
                                Alert.alert("Success", "Draft deleted successfully")
                            } else {
                                Alert.alert("Error", "Failed to delete draft")
                            }
                        } catch (err) {
                            console.error('Error deleting draft:', err)
                            Alert.alert("Error", "Failed to delete draft")
                        }
                    }
                }
            ]
        )
    }

    if (loading) {
        return (
            <View className="flex-1 relative">
                <WhiteParticles />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="text-white mt-4">Loading Drafts...</Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <Image
                source={require('app/images/space/galaxy.png')}
                className="absolute bottom-0 right-0"
                style={{ height: scaleSize(300), width: scaleSize(300) }}
                resizeMode="cover"
            />

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-row items-center justify-between px-4 mt-16">
                    <BackwardButton onPress={() => router.back()} />
                    <Text className="font-wix text-white text-center flex-1" style={{ fontSize: scaleFont(38) }}>Habit Drafts</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View className="items-center justify-center mt-6 mb-10 px-4">
                    {drafts.length > 0 ? (
                        drafts.map((draft) => (
                            <View
                                key={draft.id}
                                className="w-full items-center mb-3"
                            >
                                <TouchableOpacity
                                    onPress={() => {
                                        console.log('Navigating to edit draft:', draft.id)
                                        router.push({
                                            pathname: '/screens/dashboard/createHabit',
                                            params: { draftId: draft.id }
                                        })
                                    }}
                                    activeOpacity={0.8}
                                    className="w-full max-w-[90%]"
                                >
                                    <View className="bg-white/70 rounded-2xl px-4 py-3 flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-black text-[18px] font-semibold">{draft.habit_name}</Text>
                                            {draft.description && (
                                                <Text className="text-black/60 text-sm mt-1" numberOfLines={2}>
                                                    {draft.description}
                                                </Text>
                                            )}
                                            <View className="flex-row items-center mt-2 space-x-2">
                                                {draft.habit_type && (
                                                    <View className="bg-purple-200 rounded-full px-2 py-1">
                                                        <Text className="text-purple-800 text-xs capitalize">{draft.habit_type}</Text>
                                                    </View>
                                                )}
                                                {draft.frequency && (
                                                    <View className="bg-blue-200 rounded-full px-2 py-1">
                                                        <Text className="text-blue-800 text-xs capitalize">{draft.frequency}</Text>
                                                    </View>
                                                )}
                                                {draft.category && (
                                                    <View className="bg-green-200 rounded-full px-2 py-1">
                                                        <Text className="text-green-800 text-xs capitalize">{draft.category}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation()
                                                handleDeleteDraft(draft.id)
                                            }}
                                            className="ml-4 p-2"
                                        >
                                            <Ionicons name="trash-outline" size={24} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <View className="py-12 px-6">
                            <Text className="text-white/60 text-center text-lg">No drafts yet</Text>
                            <Text className="text-white/40 text-center mt-2">Start creating a habit to save drafts!</Text>
                            <TouchableOpacity
                                className="mt-6 bg-white/50 rounded-full p-4 self-center"
                                onPress={() => router.push('/screens/dashboard/createHabit')}
                            >
                                <Ionicons name="add" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
            
            <HomeUI />
        </View>
    )
}

