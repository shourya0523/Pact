import React from 'react';
import { Image, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scaleSize } from '@/utils/constants';

export default function HomeUI() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View 
            className="absolute bottom-0 w-full bg-white/20 flex-row justify-around items-center z-50"
            style={{ 
                paddingBottom: Math.max(insets.bottom, scaleSize(16)),
                paddingTop: scaleSize(12),
                paddingHorizontal: scaleSize(8),
            }}
        >
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/Home')}>
            <Image
                source={require('app/images/home-ui/Home.png')}
                style={{ width: scaleSize(40), height: scaleSize(40) }}
                resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/HabitViews')}>
            <Image
            source={require('app/images/home-ui/Stat.png')}
            style={{ width: scaleSize(40), height: scaleSize(40) }}
            resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/Notifications')}>
            <Image
            source={require('app/images/home-ui/Status_list.png')}
            style={{ width: scaleSize(40), height: scaleSize(40) }}
            resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/profile')}>
            <Image
            source={require('app/images/home-ui/User.png')}
            style={{ width: scaleSize(40), height: scaleSize(40) }}
            resizeMode="contain"
            />
        </TouchableOpacity>
        </View>
    );
}
