import React from 'react'
import { View, Text, Pressable } from 'react-native'
import LightGreyButton from './lightGreyButton';

interface NotificationProps {
    title: string;
    time: string;
    type: 'nudge' | 'request' | 'habit-reminder' | 'goal-reminder';

    onCheckinPress?: () => void;
    onAcceptPress?: () => void;
    onDeclinePress?: () => void;

    style?: object;
}

const notification: React.FC<NotificationProps> = ({
    title,
    time,
    type,
    onCheckinPress,
    onAcceptPress,
    onDeclinePress,
    style
}) => {
    const renderButtonsOnType = () => {
        switch (type) {
            case 'nudge':
                return (
                    <LightGreyButton
                        onPress={() => {
                            console.log('Checked in!');
                        }}
                        text="CHECK IN"
                        style={[{
                            width: '135px'
                        }]}
                    />
                )
            case 'request':
                return (
                    <>                    
                        <Pressable
                            onPress={onAcceptPress}
                            className="rounded-[10px] bg-[#81C281] flex-row items-center justify-center ml-2"
                            style={[{ 
                                width: '80px',
                                height: '30px'
                            }, style]} 
                        >
                            <Text className="text-[14px] font-wix text-white text-center">
                                ACCEPT
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onDeclinePress}
                            className="rounded-[10px] bg-[#ff0000] flex-row items-center justify-center ml-2"
                            style={[{ 
                                width: '80px',
                                height: '30px'
                            }, style]} 
                        >
                            <Text className="text-[14px] font-wix text-white text-center">
                                DECLINE
                            </Text>
                        </Pressable>
                    </>
                )
            case 'habit-reminder':
                return (
                    <>
                    </>
                )
            case 'goal-reminder':
                return (
                    <>
                    </>
                )
            default:
                return null;
        }
    }

    return (
        <View className="flex flex-row items-center justify-between px-4 py-2">
            <View className="flex-1">
                <Text 
                    className="font-semibold text-white text-base pb-2"
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                >
                        {title}
                </Text>
                <Text className="text-white text-xs">{time}</Text>
            </View>
            <View className="flex-row items-center">
                {renderButtonsOnType()}
            </View>
        </View>
    )
}

export default notification;