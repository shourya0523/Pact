import React, { useEffect, useState } from 'react'
import { View, ScrollView, Text, Alert } from 'react-native'
import BackwardButton from '@/components/ui/backwardButton'
import Notification from '@/components/ui/notification'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton'
import { useRouter } from 'expo-router'
import { notificationService } from '../../services/notificationService'

// Test data - in real app this would come from backend
const notificationsData = [
    {
        id: '1',
        title: 'New connection request from Sarah Connor',
        time: '5 min ago',
        type: 'request' as const, 
    },
    {
        id: '2',
        title: 'Check-in required for Stellar Project',
        time: '1 hour ago',
        type: 'nudge' as const,
    },
    {
        id: '3',
        title: 'Upcoming meeting with Kyle Reese in 15 mins',
        time: '2 hours ago',
        type: 'habit-reminder' as const,
    },
    {
        id: '4',
        title: 'John Doe accepted your request.',
        time: 'Yesterday',
        type: 'nudge' as const,
    },
];

export default function Notifications() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState(false);
    const [scheduledCount, setScheduledCount] = useState(0);
    const [lastNotificationSent, setLastNotificationSent] = useState<string | null>(null);

    useEffect(() => {
        checkPermissions();
        loadScheduledNotifications();
    }, []);

    const checkPermissions = async () => {
        const granted = await notificationService.requestPermissions();
        setHasPermission(granted);
    };

    const loadScheduledNotifications = async () => {
        const scheduled = await notificationService.getScheduledNotifications();
        setScheduledCount(scheduled.length);
    };

    const handleTestNotification = async () => {
        if (!hasPermission) {
            Alert.alert(
                'Permission Required',
                'Please enable notifications in your device settings',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            await notificationService.sendNotification(
                '🎉 Test from Pact!',
                'Your notifications are working perfectly!'
            );
            
            const now = new Date().toLocaleTimeString();
            setLastNotificationSent(now);
            
            Alert.alert('✅ Notification Sent!', 'Check your notification tray - it worked!');
        } catch (error) {
            Alert.alert('Error', 'Failed to send notification');
        }
    };

    const handleScheduleDaily = async () => {
        if (!hasPermission) {
            Alert.alert('Permission Required', 'Enable notifications first');
            return;
        }

        try {
            await notificationService.scheduleDailyReminder('Daily Check-in', 9, 0);
            Alert.alert('Scheduled!', 'Daily reminder set for 9:00 AM');
            loadScheduledNotifications();
        } catch (error) {
            Alert.alert('Error', 'Failed to schedule reminder');
        }
    };

    return (
        <View className="flex-1">
            <ScrollView className="flex-1">
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

                <View className={`mx-4 mb-4 p-4 rounded-2xl ${
                    hasPermission ? 'bg-green-500/20' : 'bg-yellow-500/20'
                }`}>
                    <Text className={`text-center font-semibold text-lg ${
                        hasPermission ? 'text-green-200' : 'text-yellow-200'
                    }`}>
                        {hasPermission 
                            ? '✅ Notifications Enabled' 
                            : '⚠️ Enable Notifications'}
                    </Text>
                    {scheduledCount > 0 && (
                        <Text className="text-white/70 text-center text-sm mt-2">
                            {scheduledCount} scheduled reminder{scheduledCount > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>

                <View className="mx-4 mb-6 items-center">
                    <GreyButton
                        onPress={handleTestNotification}
                        text="📱 SEND TEST NOTIFICATION"
                        style={{ width: '90%', height: 65 }}
                    />
                    
                    {lastNotificationSent && (
                        <View className="mt-4 bg-green-500/20 rounded-2xl p-4 w-[90%]">
                            <Text className="text-green-200 text-center font-semibold text-lg">
                                ✅ IT WORKS!
                            </Text>
                            <Text className="text-green-200/90 text-center text-sm mt-2">
                                Last notification sent at {lastNotificationSent}
                            </Text>
                            <Text className="text-green-200/70 text-center text-sm mt-1">
                                Check your notification tray 🔔
                            </Text>
                        </View>
                    )}

                    <GreyButton
                        onPress={handleScheduleDaily}
                        text="⏰ SCHEDULE DAILY 9 AM"
                        style={{ width: '90%', height: 65, marginTop: 16 }}
                    />
                </View>

                <View className="mx-4 rounded-xl p-2 mb-8">
                    <Text className="text-white/70 text-sm mb-3 ml-2">
                        Recent Activity
                    </Text>
                    {notificationsData.map((notif) => (
                        <Notification 
                            key={notif.id}
                            title={notif.title}
                            time={notif.time}
                            type={notif.type}
                        />
                    ))}
                </View>

                <View className="mx-4 mb-8 bg-white/10 rounded-2xl p-4">
                    <Text className="text-white/70 text-sm text-center">
                        💡 Tip: Make sure to enable notifications in your device settings for the best experience
                    </Text>
                </View>
            </ScrollView>
        </View>
    )
}