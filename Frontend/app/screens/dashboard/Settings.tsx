import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import GradientBackground from 'app/components/space/whiteStarsParticlesBackground'
import DashboardLayout from '../../components/navigation/DashboardLayout'
import BackwardButton from '@/components/ui/backwardButton'
import { logger } from '../../utils/logger'
import { BASE_URL } from '../../../config'
import { notificationService } from '../../services/notificationService'

export default function Settings() {
    const router = useRouter();
    const [testingPush, setTestingPush] = useState(false);

    const handleTestPushNotification = async () => {
        try {
            setTestingPush(true);
            
            // First, request permissions if not already granted
            const hasPermission = await notificationService.requestPermissions();
            if (!hasPermission) {
                Alert.alert(
                    'Permission Required',
                    'Please enable notification permissions in your device settings to test push notifications.'
                );
                setTestingPush(false);
                return;
            }

            // Test local notification first (immediate)
            await notificationService.sendNotification(
                '🧪 Test Push Notification',
                'This is a local test notification! If you see this, notifications are working! 🎉'
            );

            Alert.alert(
                '✅ Local Notification Sent',
                'Check your notification tray! Now testing server push notification...',
                [{ text: 'OK' }]
            );

            // Then test server notification (via WebSocket)
            const token = await AsyncStorage.getItem('access_token');
            if (!token) {
                Alert.alert('Error', 'Not authenticated. Please log in again.');
                setTestingPush(false);
                return;
            }

            const response = await fetch(`${BASE_URL}/api/notifications/test-push`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                Alert.alert(
                    '✅ Server Notification Sent',
                    'Check your notification tray! The server should send a notification via WebSocket.',
                    [{ text: 'OK' }]
                );
            } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.detail || 'Failed to send server notification');
            }
        } catch (error: any) {
            logger.error('Test push notification error:', error);
            Alert.alert('Error', error.message || 'Failed to test push notification');
        } finally {
            setTestingPush(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Clear all stored data
                            await AsyncStorage.clear();
                            
                            // Navigate back to login
                            router.replace('/screens/auth/LoginScreen');
                        } catch (error) {
                            logger.error('Sign out error:', error);
                            Alert.alert('Error', 'Failed to sign out');
                        }
                    }
                }
            ]
        );
    };

    return (
        <DashboardLayout>
            <View className="flex-1 relative">
                <GradientBackground />
                
                {/* Back button */}
                <View className="absolute mt-6 left-8 z-50">
                    <BackwardButton onPress={() => router.back()} />
                </View>

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 140, paddingTop: 80 }}
            >
                <View className="flex-1 items-center px-6">
                    <Text className="text-white text-[38px] font-wix mb-8">SETTINGS</Text>
                    
                    <TouchableOpacity 
                        className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center rounded-2xl"
                        onPress={() => router.push('/screens/dashboard/profile')}
                    >
                        <Text className="text-white font-wix font-bold text-[18px]">Profile</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center rounded-2xl">
                        <Text className="text-white font-wix font-bold text-[18px]">Sound</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center rounded-2xl">
                        <Text className="text-white font-wix font-bold text-[18px]">Vacation mode</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center rounded-2xl"
                        onPress={() => router.push('/screens/settings/TutorialScreen')}
                    >
                        <Text className="text-white font-wix font-bold text-[18px]">Help</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center rounded-2xl">
                        <Text className="text-white font-wix font-bold text-[18px]">Share app</Text>
                    </TouchableOpacity>
                    
                    {/* Test Push Notification Button */}
                    <TouchableOpacity 
                        className="bg-purple-600 w-[90%] h-20 p-4 m-1 justify-center mt-4 rounded-2xl"
                        onPress={handleTestPushNotification}
                        disabled={testingPush}
                    >
                        {testingPush ? (
                            <View className="flex-row items-center justify-center gap-2">
                                <ActivityIndicator size="small" color="#fff" />
                                <Text className="text-white font-wix font-bold text-[18px]">Testing...</Text>
                            </View>
                        ) : (
                            <Text className="text-white font-wix font-bold text-center text-[18px]">🧪 Test Push Notification</Text>
                        )}
                    </TouchableOpacity>
                    
                    {/* Sign Out Button */}
                    <TouchableOpacity 
                        className="bg-red-600 w-[90%] h-20 p-4 m-1 justify-center mt-8 rounded-2xl"
                        onPress={handleSignOut}
                    >
                        <Text className="text-white font-wix font-bold text-center text-[18px]">🚪 SIGN OUT</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            </View>
        </DashboardLayout>
    )
}
