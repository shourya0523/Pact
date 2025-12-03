import React, { useEffect, useState } from 'react'
import { View, ScrollView, Text, Alert, RefreshControl, ActivityIndicator } from 'react-native'
import BackwardButton from '@/components/ui/backwardButton'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import Notification from 'app/components/common/ui/notification'
import HomeUI from '@/components/ui/home-ui'
import { useRouter } from 'expo-router'
import { notificationAPI, NotificationData } from '../../services/notificationAPI'
import { partnershipAPI } from '../../services/partnershipAPI'
import { habitAPI } from '../../services/habitAPI'

export default function Notifications() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingAction, setProcessingAction] = useState<string | null>(null);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationAPI.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
            Alert.alert('Error', 'Failed to load notifications. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handleCheckIn = async (notificationId: string, habitId?: string) => {
        console.log('🔘 CHECK IN BUTTON CLICKED!', { notificationId, habitId });
        
        if (!habitId) {
            Alert.alert('Error', 'No habit associated with this notification');
            return;
        }

        try {
            setProcessingAction(notificationId);
            
            // Check in to the habit
            await habitAPI.checkInHabit(habitId);
            
            // Mark notification as action taken
            await notificationAPI.markActionTaken(notificationId);
            
            // Update local state
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, action_taken: true }
                        : notif
                )
            );
            
            Alert.alert(
                '✅ Checked In!', 
                'Great job! Your habit has been logged.',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            console.error('Error checking in:', error);
            Alert.alert(
                'Error', 
                error.message || 'Failed to check in. Please try again.'
            );
        } finally {
            setProcessingAction(null);
        }
    };

    const handleAcceptPartnership = async (notificationId: string, requestId: string) => {
        console.log('🔘 ACCEPT BUTTON CLICKED!', { notificationId, requestId });
        
        if (!requestId) {
            Alert.alert('Error', 'Invalid partnership request');
            return;
        }

        try {
            setProcessingAction(notificationId);
            
            // Accept the partnership request
            await partnershipAPI.acceptPartnershipRequest(requestId);
            
            // Mark notification as action taken
            await notificationAPI.markActionTaken(notificationId);
            
            // Update local state
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, action_taken: true }
                        : notif
                )
            );
            
            Alert.alert(
                '🎉 Partnership Accepted!',
                'You and your partner are now connected. Time to start building habits together!',
                [
                    { 
                        text: 'View Partnership', 
                        onPress: () => router.push('/screens/dashboard/Partnership')
                    },
                    { text: 'OK' }
                ]
            );
        } catch (error: any) {
            console.error('Error accepting partnership:', error);
            Alert.alert(
                'Error', 
                error.message || 'Failed to accept partnership. Please try again.'
            );
        } finally {
            setProcessingAction(null);
        }
    };

    const handleDeclinePartnership = async (notificationId: string, requestId: string) => {
        console.log('🔘 DECLINE BUTTON CLICKED!', { notificationId, requestId });
        
        if (!requestId) {
            Alert.alert('Error', 'Invalid partnership request');
            return;
        }

        Alert.alert(
            'Decline Partnership',
            'Are you sure you want to decline this partnership request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessingAction(notificationId);
                            
                            // Decline the partnership request
                            await partnershipAPI.declinePartnershipRequest(requestId);
                            
                            // Mark notification as action taken
                            await notificationAPI.markActionTaken(notificationId);
                            
                            // Update local state
                            setNotifications(prev => 
                                prev.map(notif => 
                                    notif.id === notificationId 
                                        ? { ...notif, action_taken: true }
                                        : notif
                                )
                            );
                            
                            Alert.alert('Partnership Declined', 'The request has been declined.');
                        } catch (error: any) {
                            console.error('Error declining partnership:', error);
                            Alert.alert(
                                'Error', 
                                error.message || 'Failed to decline partnership. Please try again.'
                            );
                        } finally {
                            setProcessingAction(null);
                        }
                    }
                }
            ]
        );
    };

    const handleNotificationPress = async (notificationId: string) => {
        try {
            // Mark as read when tapped
            await notificationAPI.markAsRead(notificationId);
            
            // Update local state
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, is_read: true }
                        : notif
                )
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#0A0A0A]">
                <ActivityIndicator size="large" color="#A855F7" />
                <Text className="text-white/70 mt-4 font-wix">Loading notifications...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#0A0A0A]">
            <ScrollView 
                className="flex-1"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#A855F7"
                    />
                }
            >
                <View className="relative">
                    <PurpleParticles />
                    <View className="absolute mt-6 left-8 z-50">
                        <BackwardButton />
                    </View>
                    <View className="mb-8">
                        <Text className="font-wix text-white text-[38px] mt-12 text-center">
                            Notifications
                        </Text>
                    </View>
                </View>

                {notifications.length === 0 ? (
                    <View className="mx-4 mt-8 bg-white/5 rounded-2xl p-8 items-center">
                        <Text className="text-white/70 text-center text-lg font-wix mb-2">
                            🔔 No Notifications
                        </Text>
                        <Text className="text-white/50 text-center text-sm">
                            You're all caught up! Check back later for updates from your partner.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View className="mx-4 mb-4 flex-row justify-between items-center">
                            <Text className="text-white/70 text-sm">
                                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                            </Text>
                            <Text className="text-white/50 text-xs">
                                Pull to refresh
                            </Text>
                        </View>

                        <View className="mx-4 rounded-xl mb-8">
                            {notifications.map((notif) => (
                                <View key={notif.id} className="mb-2">
                                    <Notification
                                        id={notif.id}
                                        title={notif.title}
                                        time={notif.time_ago}
                                        type={notif.type}
                                        relatedId={notif.related_id}
                                        actionTaken={notif.action_taken}
                                        onCheckInPress={handleCheckIn}
                                        onAcceptPress={handleAcceptPartnership}
                                        onDeclinePress={handleDeclinePartnership}
                                        onNotificationPress={handleNotificationPress}
                                    />
                                    {processingAction === notif.id && (
                                        <View className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <ActivityIndicator size="small" color="#A855F7" />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View className="mx-4 mb-8 bg-white/10 rounded-2xl p-4">
                    <Text className="text-white/70 text-sm text-center">
                        💡 Tip: Notifications help you stay accountable and connected with your partner. Make sure to enable push notifications in your device settings!
                    </Text>
                </View>
            </ScrollView>
            <HomeUI />
        </View>
    );
}
