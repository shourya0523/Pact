import React, { useEffect, useState } from 'react';
import { Image, View, TouchableOpacity, Platform, Dimensions, Text } from 'react-native';
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scaleSize } from '@/utils/constants';
import { notificationAPI } from '../../../services/notificationAPI';

export default function HomeUI() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isWeb = Platform.OS === 'web';
    const screenWidth = Dimensions.get('window').width;
    const maxWidth = isWeb ? 1200 : screenWidth;
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Desktop-specific sizing
    const iconSize = isWeb ? 28 : scaleSize(40);
    const paddingVertical = isWeb ? 16 : scaleSize(12);
    const paddingBottom = isWeb ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, scaleSize(16));
    const paddingHorizontal = isWeb ? 0 : scaleSize(8);

    useEffect(() => {
        loadUnreadCount();
        // Refresh count every 30 seconds
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadUnreadCount = async () => {
        try {
            const count = await notificationAPI.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    };

    return (
        <View 
            className="absolute bottom-0 w-full bg-white/20 flex-row justify-around items-center z-50"
            style={{ 
                maxWidth: isWeb ? maxWidth : '100%',
                alignSelf: isWeb ? 'center' : 'stretch',
                paddingBottom,
                paddingTop: paddingVertical,
                paddingHorizontal,
            }}
        >
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/Home')}>
            <Image
                source={require('app/images/home-ui/Home.png')}
                style={{ width: iconSize, height: iconSize }}
                resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/HabitViews')}>
            <Image
            source={require('app/images/home-ui/Stat.png')}
            style={{ width: iconSize, height: iconSize }}
            resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/ViewAllPartnerships')}>
            <Ionicons 
                name="people" 
                size={iconSize} 
                color="white" 
            />
        </TouchableOpacity>
        <TouchableOpacity 
            onPress={() => {
                router.push('/screens/dashboard/Notifications');
                // Refresh count after navigation
                setTimeout(loadUnreadCount, 500);
            }}
            style={{ position: 'relative' }}
        >
            <Image
                source={require('app/images/home-ui/Status_list.png')}
                style={{ width: iconSize, height: iconSize }}
                resizeMode="contain"
            />
            {unreadCount > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#ef4444',
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        paddingHorizontal: 6,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: '#fff',
                    }}
                >
                    <Text
                        style={{
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 'bold',
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/profile')}>
            <Image
            source={require('app/images/home-ui/User.png')}
            style={{ width: iconSize, height: iconSize }}
            resizeMode="contain"
            />
        </TouchableOpacity>
        </View>
    );
}
