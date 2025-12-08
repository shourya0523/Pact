import React, { useEffect, useState, useRef } from 'react'
import { View, ScrollView, Text, Alert, RefreshControl, ActivityIndicator, Animated, TouchableOpacity } from 'react-native'
import BackwardButton from '@/components/ui/backwardButton'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import Notification from 'app/components/common/ui/notification'
import DashboardLayout from '../../components/navigation/DashboardLayout'
import { useRouter } from 'expo-router'
import { notificationAPI, NotificationData } from '../../services/notificationAPI'
import { partnershipAPI } from '../../services/partnershipAPI'
import { websocketService } from '../../services/websocketService'
import { Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import TutorialElement from '../../components/tutorial/TutorialElement'

export default function Notifications() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current

    useEffect(() => {
        loadNotifications();
        
        // Entrance animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start()

        // Listen for real-time notifications via WebSocket
        const handleNewNotification = (notification: NotificationData) => {
            if (!showArchived) {
                setNotifications(prev => [notification, ...prev]);
            }
        };

        websocketService.onNotification(handleNewNotification);

        // Cleanup
        return () => {
            websocketService.onNotification(() => {});
        };
    }, [showArchived]);

    useEffect(() => {
        loadNotifications();
    }, [showArchived]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationAPI.getNotifications(showArchived);
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
            // Mark as read (which archives it) when tapped
            await notificationAPI.markAsRead(notificationId);
            
            // Remove from local state if not showing archived
            if (!showArchived) {
                setNotifications(prev => 
                    prev.filter(notif => notif.id !== notificationId)
                );
            } else {
                // Update the notification to reflect it's archived
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId 
                            ? { ...notif, is_read: true }
                            : notif
                    )
                );
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleArchiveNotification = async (notificationId: string) => {
        try {
            setProcessingAction(notificationId);
            
            // Archive the notification
            await notificationAPI.archiveNotification(notificationId);
            
            // Remove from local state if not showing archived
            if (!showArchived) {
                setNotifications(prev => 
                    prev.filter(notif => notif.id !== notificationId)
                );
            } else {
                // Keep it in the list but mark as archived
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId 
                            ? { ...notif, archived: true }
                            : notif
                    )
                );
            }
        } catch (error: any) {
            console.error('Error archiving notification:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to archive notification. Please try again.'
            );
        } finally {
            setProcessingAction(null);
        }
    };

    const handleClearAll = async () => {
        if (notifications.length === 0) return;
        
        Alert.alert(
            'Clear All Notifications',
            `Are you sure you want to archive all ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessingAction('clear-all');
                            await notificationAPI.archiveAllNotifications();
                            setNotifications([]);
                        } catch (error: any) {
                            console.error('Error clearing all notifications:', error);
                            Alert.alert(
                                'Error',
                                error.message || 'Failed to clear all notifications. Please try again.'
                            );
                        } finally {
                            setProcessingAction(null);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <PurpleParticles />
                <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#A855F7" />
                <Text className="text-white/70 mt-4 font-wix">Loading notifications...</Text>
                </View>
            </View>
        );
    }

    return (
        <DashboardLayout>
            <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
                <PurpleParticles />
                <View className="absolute bottom-0 right-0">
                    <View style={{height: 250, width: 250, opacity: 0.3}}>
                        <View className="absolute inset-0" style={{backgroundColor: '#291133'}} />
                    </View>
                </View>
                <View className="absolute mt-6 left-8 z-50">
                    <BackwardButton />
                </View>
                <Animated.View 
                    style={{ 
                        flex: 1,
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }}
                >
            <ScrollView 
                className="flex-1"
                    contentContainerStyle={{ 
                        paddingTop: 80,
                        paddingBottom: 120,
                        paddingHorizontal: 20
                    }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#A855F7"
                    />
                }
                    showsVerticalScrollIndicator={false}
                >
                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="font-wix text-white text-[36px]">
                                Notifications
                            </Text>
                            <View className="flex-row items-center gap-2">
                                <Text className="text-white/70 text-sm font-wix">Show Archived</Text>
                                <Switch
                                    value={showArchived}
                                    onValueChange={setShowArchived}
                                    trackColor={{ false: '#767577', true: '#A855F7' }}
                                    thumbColor={showArchived ? '#fff' : '#f4f3f4'}
                                />
                            </View>
                        </View>
                        {!showArchived && notifications.length > 0 && (
                            <TouchableOpacity
                                onPress={handleClearAll}
                                disabled={processingAction !== null}
                                className="bg-purple-600/30 border border-purple-400/50 rounded-xl px-4 py-2 self-start flex-row items-center gap-2"
                                activeOpacity={0.7}
                            >
                                <Ionicons name="archive-outline" size={16} color="#A855F7" />
                                <Text className="text-purple-300 text-sm font-wix">
                                    {processingAction === 'clear-all' ? 'Clearing...' : 'Clear All'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                {notifications.length === 0 ? (
                        <View className="bg-white/5 rounded-2xl p-8 items-center border border-white/10">
                        <Text className="text-white/70 text-center text-lg font-wix mb-2">
                            🔔 {showArchived ? 'No Archived Notifications' : 'No Notifications'}
                        </Text>
                        <Text className="text-white/50 text-center text-sm">
                            {showArchived 
                                ? 'You haven\'t archived any notifications yet.'
                                : 'You\'re all caught up! Check back later for updates from your partner.'}
                        </Text>
                    </View>
                ) : (
                    <>
                            <View className="mb-4 flex-row justify-between items-center">
                                <Text className="text-white/70 text-sm font-wix">
                                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                            </Text>
                            <Text className="text-white/50 text-xs">
                                Pull to refresh
                            </Text>
                        </View>

                        <TutorialElement id="notifications-list">
                            <View className="gap-2 mb-6">
                                {notifications.map((notif) => (
                                    <View key={notif.id} className="relative">
                                    <Notification
                                        id={notif.id}
                                        title={notif.title}
                                        time={notif.time_ago}
                                        type={notif.type}
                                        relatedId={notif.related_id}
                                        actionTaken={notif.action_taken}
                                        onAcceptPress={handleAcceptPartnership}
                                        onDeclinePress={handleDeclinePartnership}
                                        onNotificationPress={handleNotificationPress}
                                        onArchivePress={handleArchiveNotification}
                                    />
                                    {processingAction === notif.id && (
                                            <View className="absolute right-4 top-1/2" style={{ transform: [{ translateY: -10 }] }}>
                                            <ActivityIndicator size="small" color="#A855F7" />
                                        </View>
                                    )}
                                </View>
                                ))}
                            </View>
                        </TutorialElement>
                    </>
                )}

                    <View className="bg-white/10 rounded-2xl p-4 border border-white/20">
                        <Text className="text-white/70 text-sm text-center font-wix">
                        💡 Tip: Notifications help you stay accountable and connected with your partner. Make sure to enable push notifications in your device settings!
                    </Text>
                </View>
            </ScrollView>
            </Animated.View>
            </View>
        </DashboardLayout>
    );
}
