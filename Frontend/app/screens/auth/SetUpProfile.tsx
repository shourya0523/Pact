import React, { useState } from 'react';
import { View, Text, Pressable, Alert, TextInput, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../../config';
import { Ionicons } from '@expo/vector-icons';

export default function SetUpProfile() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
    const [showPhotoInput, setShowPhotoInput] = useState(false);

    const handleSave = async () => {
        console.log('🔘 Continue button pressed!');
        console.log('📝 Display Name:', displayName);
        console.log('🖼️ Profile Photo URL:', profilePhotoUrl);
        
        if (!displayName.trim()) {
            console.log('❌ Validation failed: Display name empty');
            Alert.alert('Required', 'Please enter your display name to continue');
            return;
        }

        // Profile photo is now optional - only validate format if provided
        if (profilePhotoUrl.trim() && !profilePhotoUrl.trim().startsWith('http://') && !profilePhotoUrl.trim().startsWith('https://')) {
            console.log('❌ Validation failed: Invalid URL format');
            Alert.alert('Invalid URL', 'Profile photo URL must start with http:// or https://');
            return;
        }

        console.log('✅ Validation passed, starting profile setup...');
        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) {
                Alert.alert('Error', 'Not authenticated. Please log in again.');
                router.replace('/screens/auth/LoginScreen');
                return;
            }

            const BASE_URL = await getBaseUrl();
            
            console.log('💾 Setting up profile:', {
                display_name: displayName.trim(),
                profile_photo_url: profilePhotoUrl.trim() || ''
            });
            
            // Call the profile setup endpoint
            const response = await fetch(`${BASE_URL}/api/users/me/profile-setup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    display_name: displayName.trim(),
                    profile_photo_url: profilePhotoUrl.trim() || '' // Send empty string if no URL provided
                })
            });

            console.log('📡 Profile setup response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Profile setup failed:', errorData);
                Alert.alert('Error', errorData.detail || 'Failed to set up profile');
                setSaving(false);
                return;
            }

            const userData = await response.json();
            console.log('✅ Profile setup successful:', userData);
            
            // Update local storage with the updated user data
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));
            
            // Navigate to the dashboard
            router.replace('/screens/dashboard/Home');
        } catch (error) {
            console.error('Error setting up profile:', error);
            Alert.alert('Error', 'Failed to set up profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View className="flex-1 relative bg-[#1a0033]">
            <PurpleParticles />

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Top text container */}
                <View className="pt-20 w-full">
                    <Text className="text-white font-wix text-[36px] ml-12">
                        Set Up Profile
                    </Text>
                    <Text className="text-white/70 font-wix text-[16px] ml-12 mt-2">
                        Let's personalize your account
                    </Text>
                </View>

                {/* Main content */}
                <View className="flex-1 justify-start items-center mt-6 px-6">
                    {/* Profile Photo Section */}
                    <View className="items-center mb-8">
                        <View className="relative">
                            {profilePhotoUrl ? (
                                <Image 
                                    source={{ uri: profilePhotoUrl }}
                                    className="w-32 h-32 rounded-full border-4 border-white"
                                    onError={() => {
                                        console.log('❌ Failed to load image:', profilePhotoUrl);
                                        Alert.alert('Error', 'Failed to load image. Check the URL.');
                                    }}
                                />
                            ) : (
                                <View className="w-32 h-32 rounded-full border-4 border-white bg-white/20 items-center justify-center">
                                    <Ionicons name="person" size={64} color="white" />
                                </View>
                            )}
                            
                            <TouchableOpacity 
                                className="absolute bottom-0 right-0 bg-white rounded-full p-2"
                                onPress={() => setShowPhotoInput(!showPhotoInput)}
                            >
                                <Ionicons name={showPhotoInput ? "checkmark" : "add"} size={24} color="#1a0033" />
                            </TouchableOpacity>
                        </View>
                        
                        {showPhotoInput && (
                            <View className="w-full mt-4">
                                <TextInput
                                    value={profilePhotoUrl}
                                    onChangeText={setProfilePhotoUrl}
                                    placeholder="Enter image URL (https://...)"
                                    placeholderTextColor="#999"
                                    className="bg-white/85 rounded-2xl px-4 py-3 text-black"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Text className="text-white/60 text-xs mt-2 text-center">
                                    Paste an image URL from the web
                                </Text>
                            </View>
                        )}
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

                    {/* Info Text */}
                    <Text className="text-white/60 text-sm mt-6 text-center px-4">
                        Your display name and photo will be visible to your accountability partners.{' '}
                        <Text className="text-white/80 font-semibold">Profile photo is optional.</Text>
                    </Text>
                </View>
            </ScrollView>

            {/* Continue Button - No Sign Out Button */}
            <View className="absolute bottom-5 w-full px-6" style={{ zIndex: 10 }}>
                <Pressable
                    style={{
                        width: '85%',
                        backgroundColor: 'white',
                        borderRadius: 9999,
                        paddingVertical: 16,
                        alignItems: 'center',
                        marginHorizontal: 'auto',
                        opacity: saving ? 0.5 : 1,
                    }}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text className="text-black font-wix text-[18px]">CONTINUE</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}
