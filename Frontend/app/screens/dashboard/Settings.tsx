import React from 'react'
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import GradientBackground from 'app/components/space/whiteStarsParticlesBackground'
import HomeUI from '@/components/ui/home-ui'
import BackwardButton from '@/components/ui/backwardButton'
import { logger } from '../../utils/logger'

export default function Settings() {
    const router = useRouter();

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
                    
                    <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center rounded-2xl">
                        <Text className="text-white font-wix font-bold text-[18px]">Help</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center rounded-2xl">
                        <Text className="text-white font-wix font-bold text-[18px]">Share app</Text>
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
            
            <HomeUI />
        </View>
    )
}
