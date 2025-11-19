import React from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import GradientBackground from 'app/components/space/whiteStarsParticlesBackground'

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
                            console.error('Sign out error:', error);
                            Alert.alert('Error', 'Failed to sign out');
                        }
                    }
                }
            ]
        );
    };

    return (
        <GradientBackground>
            <View
                className="flex-1 items-center"
            >
                <Text className="text-white text-[28px] m-4">SETTINGS</Text>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Sound</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Vacation mode</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Help</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#AABAD0] w-[90%] h-20 p-4 m-1 justify-center">
                    <Text className="text-white font-bold">Share app</Text>
                </TouchableOpacity>
                
                {/* Sign Out Button */}
                <TouchableOpacity 
                    className="bg-red-600 w-[90%] h-20 p-4 m-1 justify-center mt-8"
                    onPress={handleSignOut}
                >
                    <Text className="text-white font-bold text-center">🚪 SIGN OUT</Text>
                </TouchableOpacity>
            </View>
        </GradientBackground>
    )
}
