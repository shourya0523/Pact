import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../../config';
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground';
import GreyButton from '@/components/ui/greyButton';
import PartnerBox from '@/components/ui/partnerBox';
import HomeUI from '@/components/ui/home-ui';

export default function InvitePartners() {
    const router = useRouter();
    const [searchUsername, setSearchUsername] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [partnershipInfo, setPartnershipInfo] = useState<any>(null);

    useEffect(() => {
        fetchPartnership();
    }, []);

    const fetchPartnership = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const BASE_URL = await getBaseUrl();
            const response = await fetch(`${BASE_URL}/api/partnerships/current`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPartnershipInfo(data);
            }
        } catch (err) {
            console.error('Fetch partnership error:', err);
        }
    };

    const handleInvite = async () => {
        if (!searchUsername.trim()) {
            Alert.alert("Enter Username", "Please enter a username to invite.");
            return;
        }

        setLoading(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            
            if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.");
                router.replace("/screens/auth/LoginScreen");
                return;
            }

            const BASE_URL = await getBaseUrl();
            
            const response = await fetch(`${BASE_URL}/api/partnerships/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    partner_username: searchUsername.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    "Partnership Created! 🎉",
                    `You're now partnered with ${data.partnership.partner_username}!`,
                    [{
                        text: "Go to Dashboard",
                        onPress: () => router.replace("/screens/dashboard/Home")
                    }]
                );
            } else {
                Alert.alert(
                    "Partnership Failed",
                    data.detail || "Unable to create partnership."
                );
            }
        } catch (err: any) {
            console.error('Partnership creation error:', err);
            Alert.alert("Error", "Unable to create partnership. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        Alert.alert("Copy Link", "Invite link feature coming soon!");
    };

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <HomeUI />
            
            <View className="flex-1 justify-center items-center">
                <Text className="font-wix text-white text-[38px] text-center">Invite Partner</Text>
                
                {/* Display current partnership if exists */}
                <View className="mt-10 mb-12">
                    {partnershipInfo ? (
                        <View className="bg-white/10 rounded-2xl p-6 w-[90%] mx-auto">
                            <Text className="text-white text-xl font-semibold text-center mb-4">
                                Current Partnership
                            </Text>
                            <PartnerBox partner={partnershipInfo.partner.username} />
                            <View className="flex-row justify-around mt-6">
                                <View className="items-center">
                                    <Text className="text-white/70 text-xs">Habits</Text>
                                    <Text className="text-white font-bold text-lg">{partnershipInfo.habits?.length || 0}</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-white/70 text-xs">Streak</Text>
                                    <Text className="text-white font-bold text-lg">{partnershipInfo.current_streak || 0} 🔥</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-white/70 text-xs">Days</Text>
                                    <Text className="text-white font-bold text-lg">{partnershipInfo.partnership_age_days || 0}</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <>
                            <PartnerBox partner="Partner #1" />
                            <PartnerBox partner="Partner #2" />
                            <PartnerBox partner="Partner #3" />
                        </>
                    )}
                </View>

                <GreyButton
                    text={loading ? "INVITING..." : partnershipInfo ? "ALREADY PARTNERED" : "INVITE"}
                    onPress={handleInvite}
                    style={{ width: '80%', marginBottom: 40 }}
                />

                {/* OR Component with longer lines */}
                <View className="flex-row justify-center items-center w-full">
                    <View className="h-[2px] w-[40%] bg-white" />
                    <Text className="mx-8 text-white font-wix text-sm">OR</Text>
                    <View className="h-[2px] w-[40%] bg-white" />
                </View>

                <Text className="font-wix text-white text-[24px] mt-2">Invite a Friend!</Text>
                
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-10"
                    placeholder="Search by username"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                    value={searchUsername}
                    onChangeText={setSearchUsername}
                    autoCapitalize="none"
                    editable={!loading}
                />

                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-10"
                    placeholder="Link"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                    value={inviteLink}
                    onChangeText={setInviteLink}
                    editable={!loading}
                />

                <GreyButton
                    text="COPY LINK"
                    onPress={handleCopyLink}
                    style={{ width: '40%', height: '45px', marginTop: 20 }}
                />

                {loading && (
                    <View className="mt-6">
                        <ActivityIndicator size="large" color="#ffffff" />
                        <Text className="text-white mt-2">Creating partnership...</Text>
                    </View>
                )}
            </View>
            
            <HomeUI />
        </View>
    );
}