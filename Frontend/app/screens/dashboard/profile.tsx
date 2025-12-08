import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, Switch, Alert, TextInput, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../../services/api'
import TutorialElement from '../../components/tutorial/TutorialElement'

export default function Profile() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [displayName, setDisplayName] = useState('')
    const [profilePhotoUrl, setProfilePhotoUrl] = useState('')
    const [notifications, setNotifications] = useState({
        nudges: false,
        partnerRequests: false,
        habitReminders: false,
        goalReminders: false,
    })

    useEffect(() => {
        loadUserProfile()
    }, [])

    const loadUserProfile = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token')
            if (!token) {
                router.replace('/screens/auth/LoginScreen')
                return
            }

            const BASE_URL = await getBaseUrl()
            
            // Load user profile - FIX: Added /api prefix
            const userResponse = await fetch(`${BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            // Handle 401 (unauthorized) - token expired
            if (userResponse.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace('/screens/auth/LoginScreen')
                return
            }

            if (userResponse.ok) {
                const userData = await userResponse.json()
                console.log('📥 Loaded user data:', userData)
                setDisplayName(userData.display_name || userData.username)
                setProfilePhotoUrl(userData.profile_photo_url || '')
            } else {
                // If user fetch fails, still try to load notifications
                console.error('Failed to load user profile:', userResponse.status)
            }
            
            // Load notification preferences - FIX: Added /api prefix
            const notifResponse = await fetch(`${BASE_URL}/api/users/me/notifications`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            
            if (notifResponse.status === 401) {
                await AsyncStorage.clear()
                Alert.alert("Session Expired", "Please log in again.")
                router.replace('/screens/auth/LoginScreen')
                return
            }
            
            if (notifResponse.ok) {
                const notifData = await notifResponse.json()
                console.log('📥 Loaded notification preferences:', notifData)
                
                const prefs = notifData.notification_preferences || {}
                setNotifications({
                    nudges: prefs.nudges || false,
                    partnerRequests: prefs.partner_requests || false,
                    habitReminders: prefs.habit_reminders || false,
                    goalReminders: prefs.goal_reminders || false,
                })
            } else {
                console.error('Failed to load notification preferences:', notifResponse.status)
                // Continue with default notification settings
            }
        } catch (error) {
            console.error('Error loading profile:', error)
            Alert.alert('Error', 'Failed to load profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            handleImageUpload(result.assets[0].uri);
        }
    };

    const handleImageUpload = async (uri: string) => {
        setUploading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) {
                Alert.alert('Error', 'Authentication token not found');
                return;
            }

            const response = await api.uploadProfilePicture(uri, token);
            
            if (response.success && response.data?.url) {
                setProfilePhotoUrl(response.data.url);
                console.log('✅ Image uploaded:', response.data.url);
            } else {
                Alert.alert('Upload Failed', response.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!displayName.trim()) {
            Alert.alert('Error', 'Display name cannot be empty')
            return
        }

        setSaving(true)
        try {
            const token = await AsyncStorage.getItem('access_token')
            if (!token) {
                Alert.alert('Error', 'Not authenticated')
                return
            }

            const BASE_URL = await getBaseUrl()
            
            console.log('💾 Saving profile:', {
                display_name: displayName.trim(),
                profile_photo_url: profilePhotoUrl.trim(),
                notifications
            })
            
            // Update profile (display name and photo) - FIX: Added /api prefix
            const profileResponse = await fetch(`${BASE_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    display_name: displayName.trim(),
                    profile_photo_url: profilePhotoUrl.trim() || null
                })
            })

            console.log('📡 Profile save response status:', profileResponse.status)

            if (!profileResponse.ok) {
                const errorData = await profileResponse.json()
                console.error('❌ Profile save failed:', errorData)
                Alert.alert('Error', errorData.detail || 'Failed to update profile')
                setSaving(false)
                return
            }
            
            // Update notification preferences - FIX: Added /api prefix
            const notifResponse = await fetch(`${BASE_URL}/api/users/me/notifications`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notification_preferences: {
                        nudges: notifications.nudges,
                        partner_requests: notifications.partnerRequests,
                        habit_reminders: notifications.habitReminders,
                        goal_reminders: notifications.goalReminders
                    }
                })
            })
            
            console.log('📡 Notifications save response status:', notifResponse.status)
            
            if (notifResponse.ok) {
                const userData = await profileResponse.json()
                console.log('✅ Profile saved:', userData)
                
                // Update local storage
                await AsyncStorage.setItem('user_data', JSON.stringify(userData))
                
                Alert.alert('Success', 'Profile and notification preferences updated!', [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ])
            } else {
                const errorData = await notifResponse.json()
                console.error('❌ Notification save failed:', errorData)
                Alert.alert('Warning', 'Profile saved but notifications failed to update')
            }
        } catch (error) {
            console.error('Error saving profile:', error)
            Alert.alert('Error', 'Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const handleSignOut = async () => {
        try {
            await AsyncStorage.clear()
            console.log('✅ Signed out successfully - AsyncStorage cleared')
            router.replace('/screens/auth/WelcomeScreen')
        } catch (error) {
            console.error('Sign out error:', error)
            Alert.alert('Error', 'Failed to sign out. Please try again.')
        }
    }

    if (loading) {
        return (
            <View className="flex-1 relative bg-[#1a0033] items-center justify-center">
                <PurpleParticles />
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-white mt-4">Loading Profile...</Text>
            </View>
        )
    }

    return (
        <View className="flex-1 relative bg-[#1a0033]">
            <PurpleParticles />

            {/* Back Button */}
            <TouchableOpacity 
                onPress={() => router.back()}
                className="absolute top-12 left-6 z-20"
                style={{ zIndex: 20 }}
            >
                <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Top text container */}
                <TutorialElement id="profile-screen">
                    <View className="pt-20 w-full">
                        <Text className="text-white font-wix text-[36px] ml-12">
                            Edit Profile
                        </Text>
                    </View>
                </TutorialElement>

                {/* Main content */}
                <View className="flex-1 justify-start items-center mt-6 px-6">
                    {/* Profile Photo Section */}
                    <View className="items-center mb-8">
                        <View className="relative">
                            <TouchableOpacity onPress={pickImage} disabled={uploading}>
                                {profilePhotoUrl ? (
                                    <Image 
                                        source={{ uri: profilePhotoUrl }}
                                        className="w-32 h-32 rounded-full border-4 border-white"
                                        onError={() => {
                                            console.log('❌ Failed to load image:', profilePhotoUrl)
                                            // Alert.alert('Error', 'Failed to load image. Check the URL.')
                                        }}
                                    />
                                ) : (
                                    <View className="w-32 h-32 rounded-full border-4 border-white bg-white/20 items-center justify-center">
                                        <Ionicons name="person" size={64} color="white" />
                                    </View>
                                )}
                                
                                {/* Uploading Indicator Overlay */}
                                {uploading && (
                                    <View className="absolute inset-0 rounded-full bg-black/50 items-center justify-center">
                                        <ActivityIndicator color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                className="absolute bottom-0 right-0 bg-white rounded-full p-2"
                                onPress={pickImage}
                                disabled={uploading}
                            >
                                <Ionicons name="camera" size={24} color="#1a0033" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text className="text-white/60 text-xs mt-2 text-center">
                            Tap to upload a profile photo
                        </Text>
                    </View>

                    {/* Display Name Input */}
                    <View className="w-[90%] bg-white/85 rounded-2xl px-6 py-4 flex-row justify-between items-center">
                        <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Display name"
                            placeholderTextColor="#999"
                            className="flex-1 text-black font-wix text-[16px]"
                        />
                        {displayName.trim() && (
                            <Text className="text-green-500 font-bold text-[20px]">✔</Text>
                        )}
                    </View>

                    {/* Push Notifications Box */}
                    <View className="w-[90%] bg-white/85 rounded-2xl mt-6 px-6 py-4">
                        <Text className="text-gray-700 font-wix text-[16px] mb-3 text-center">
                            Push Notifications
                        </Text>
                        {[
                            { key: 'nudges' as const, label: 'Nudges' },
                            { key: 'partnerRequests' as const, label: 'Partner Requests' },
                            { key: 'habitReminders' as const, label: 'Habit Reminders' },
                            { key: 'goalReminders' as const, label: 'Goal Reminders' },
                        ].map((item) => (
                            <View
                                key={item.key}
                                className="flex-row justify-between items-center mb-3"
                            >
                                <Text className="text-gray-700 font-wix text-[16px]">{item.label}</Text>
                                <Switch
                                    value={notifications[item.key]}
                                    onValueChange={() => toggleNotification(item.key)}
                                    trackColor={{ false: "#ccc", true: "#7C4DFF" }}
                                    thumbColor={notifications[item.key] ? "#fff" : "#fff"}
                                />
                            </View>
                        ))}
                    </View>

                    {/* Settings Link */}
                    <TouchableOpacity
                        className="w-[90%] bg-white/85 rounded-2xl mt-6 px-6 py-4 flex-row items-center justify-between"
                        onPress={() => router.push('/screens/dashboard/Settings')}
                    >
                        <Text className="text-gray-700 font-wix text-[16px]">Settings</Text>
                        <Ionicons name="chevron-forward" size={24} color="#7C4DFF" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Save and Sign Out Buttons */}
            <View className="absolute bottom-5 w-full px-6">
                <Pressable
                    className="w-[85%] bg-white rounded-full py-4 items-center mx-auto"
                    onPress={handleSave}
                    disabled={saving || uploading}
                >
                    {saving ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text className="text-black font-wix text-[18px]">SAVE</Text>
                    )}
                </Pressable>
                
                {/* Sign Out Button */}
                <Pressable
                    className="w-[85%] bg-red-600 rounded-full py-4 items-center mx-auto mt-3"
                    onPress={handleSignOut}
                >
                    <Text className="text-white font-wix text-[18px]">SIGN OUT</Text>
                </Pressable>
            </View>
        </View>
    )
}
