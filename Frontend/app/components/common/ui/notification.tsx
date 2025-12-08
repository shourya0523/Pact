import React from 'react'
import { View, Text, Pressable } from 'react-native'

interface NotificationProps {
    id: string;
    title: string;
    time: string;
    type: 'partner_nudge' | 'partnership_request' | 'partner_checkin' | 'habit_reminder' | 'progress_milestone' | 'missed_habit';
    relatedId?: string;
    actionTaken?: boolean;
    
    onAcceptPress?: (notificationId: string, requestId: string) => void;
    onDeclinePress?: (notificationId: string, requestId: string) => void;
    onNotificationPress?: (notificationId: string) => void;
}

const Notification: React.FC<NotificationProps> = ({
    id,
    title,
    time,
    type,
    relatedId,
    actionTaken = false,
    onAcceptPress,
    onDeclinePress,
    onNotificationPress
}) => {
    const renderButtons = () => {
        // Show confirmation message if action already taken
        if (actionTaken) {
            if (type === 'partnership_request') {
                return (
                    <View className="rounded-[10px] bg-green-500/30 px-4 py-2">
                        <Text className="text-[14px] font-wix text-green-300 text-center">
                            ✓ Accepted!
                        </Text>
                    </View>
                );
            }
            return null;
        }

        switch (type) {
            case 'partnership_request':
                return (
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={() => onAcceptPress?.(id, relatedId || '')}
                            className="rounded-[10px] bg-[#81C281] flex-row items-center justify-center px-4 py-2"
                        >
                            <Text className="text-[14px] font-wix text-white text-center">
                                ACCEPT
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onDeclinePress?.(id, relatedId || '')}
                            className="rounded-[10px] bg-[#D64545] flex-row items-center justify-center px-4 py-2"
                        >
                            <Text className="text-[14px] font-wix text-white text-center">
                                DECLINE
                            </Text>
                        </Pressable>
                    </View>
                );
                
            case 'partner_nudge':
            case 'habit_reminder':
            case 'partner_checkin':
            case 'progress_milestone':
            case 'missed_habit':
            default:
                return null;
        }
    };

    return (
        <Pressable 
            onPress={() => onNotificationPress?.(id)}
            className="flex flex-row items-center justify-between px-4 py-3 mb-2 bg-white/5 rounded-xl"
        >
            <View className="flex-1 mr-3">
                <Text 
                    className="font-semibold text-white text-base pb-1"
                    numberOfLines={2} 
                    ellipsizeMode="tail"
                >
                    {title}
                </Text>
                <Text className="text-white/60 text-xs">{time}</Text>
            </View>
            <View className="flex-row items-center">
                {renderButtons()}
            </View>
        </Pressable>
    );
};

export default Notification;
