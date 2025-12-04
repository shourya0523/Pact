import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from 'config';

interface SearchPartnerPopupProps {
    visible: boolean;
    onClose: () => void;
}

export default function SearchPartnerPopup({ visible, onClose }: SearchPartnerPopupProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        if (!visible) {
            setSearchQuery('');
            setMessage(null);
        }
    }, [visible]);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
    };

    const handleSendRequest = async () => {
        if (!searchQuery.trim()) {
            showMessage("Please enter a username", "error");
            return;
        }

        setSendingRequest(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            
            if (!token) {
                showMessage("Please log in again", "error");
                return;
            }

            const BASE_URL = await getBaseUrl();
            
            const response = await fetch(`${BASE_URL}/api/partnerships/requests/send?partner_username=${searchQuery.trim()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(`Request sent to ${searchQuery}!`, "success");
                setSearchQuery('');
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                showMessage(data.detail || "Unable to send request", "error");
            }

        } catch (err: any) {
            console.error('Error sending request:', err);
            showMessage("Unable to send request", "error");
        } finally {
            setSendingRequest(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/80 justify-center items-center">
                <View className="bg-[#2D1B4E] rounded-[30px] w-[80%] p-6">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="font-wix text-white text-[28px] font-semibold">
                            Find Partners
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text className="font-wix text-white text-[24px]">✕</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="font-wix text-white/70 text-[14px] mb-6 text-center">
                        Search for a user to send a partnership request
                    </Text>

                    {/* Toast Message */}
                    {message && (
                        <View 
                            className="px-4 py-3 rounded-[15px] mb-4"
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

                    {/* Search Input */}
                    <TextInput
                        className="w-full h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mb-4"
                        placeholder="Search by username..."
                        placeholderTextColor="#3F414E"
                        style={{ paddingHorizontal: 20 }}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        editable={!sendingRequest}
                    />

                    {/* Send Request Button */}
                    <TouchableOpacity 
                        onPress={handleSendRequest}
                        disabled={sendingRequest || !searchQuery.trim()}
                        className="rounded-[15px] px-6 py-3 items-center"
                        style={{ 
                            backgroundColor: sendingRequest || !searchQuery.trim() 
                                ? 'rgba(139, 92, 246, 0.3)' 
                                : 'rgba(139, 92, 246, 0.8)' 
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
                </View>
            </View>
        </Modal>
    );
}