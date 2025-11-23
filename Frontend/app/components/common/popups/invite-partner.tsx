import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from 'config';

interface Partner {
    partnership_id: string
    partner_id: string
    username: string
    display_name: string
    shared_habits: number
}

interface InvitePartnersProps {
    visible: boolean
    onClose: () => void
    onSelectPartner: (partnerId: string, partnerName: string) => void
}

export default function InvitePartners({ visible, onClose, onSelectPartner }: InvitePartnersProps) {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            fetchPartners();
        }
    }, [visible]);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            
            if (!token) {
                return;
            }

            const BASE_URL = await getBaseUrl();
            
            const response = await fetch(`${BASE_URL}/api/partnerships/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Partners:', data);
                setPartners(data);
            }

        } catch (err: any) {
            console.error('Error fetching partners:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPartner = (partnerId: string, partnerName: string) => {
        onSelectPartner(partnerId, partnerName);
        onClose();
    };

    const getInitial = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/80 justify-center items-center">
                <View className="bg-[#2D1B4E] rounded-[30px] w-[60%] max-h-[70%] p-6">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="font-wix text-white text-[28px] font-semibold">
                            Invite Partner
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text className="font-wix text-white text-[24px]">✕</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="font-wix text-white/70 text-[14px] mb-4 text-center">
                        Select a partner for this habit
                    </Text>

                    {/* Partners List */}
                    {loading ? (
                        <View className="items-center py-10">
                            <ActivityIndicator size="large" color="#ffffff" />
                            <Text className="text-white mt-4 font-wix">Loading partners...</Text>
                        </View>
                    ) : partners.length === 0 ? (
                        <View className="items-center py-10">
                            <Text className="font-wix text-white/50 text-[16px] text-center">
                                No partners yet
                            </Text>
                            <Text className="font-wix text-white/40 text-[14px] text-center mt-2">
                                Go to Partnerships to add partners first!
                            </Text>
                        </View>
                    ) : (
                        <ScrollView className="max-h-[400px]">
                            {partners.map((partner) => (
                                <TouchableOpacity
                                    key={partner.partnership_id}
                                    onPress={() => handleSelectPartner(partner.partner_id, partner.display_name || partner.username)}
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

                                    <View className="rounded-[12px] px-5 py-2.5" style={{ backgroundColor: 'rgba(139, 92, 246, 0.8)' }}>
                                        <Text className="font-wix text-white text-[12px] font-bold">
                                            SELECT
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}