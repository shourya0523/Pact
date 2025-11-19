import React from 'react';
import { Image, View, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scaleSize } from '@/utils/constants';

export default function HomeUI() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isWeb = Platform.OS === 'web';
    const screenWidth = Dimensions.get('window').width;
    const maxWidth = isWeb ? 1200 : screenWidth;
    
    // Desktop-specific sizing
    const iconSize = isWeb ? 28 : scaleSize(40);
    const paddingVertical = isWeb ? 16 : scaleSize(12);
    const paddingBottom = isWeb ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, scaleSize(16));
    const paddingHorizontal = isWeb ? 0 : scaleSize(8);

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
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/Notifications')}>
            <Image
            source={require('app/images/home-ui/Status_list.png')}
            style={{ width: iconSize, height: iconSize }}
            resizeMode="contain"
            />
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
