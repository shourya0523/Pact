import React from 'react';
import { Image, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router'

export default function HomeUI() {
    const router = useRouter();

    return (
        <View className="absolute bottom-0 w-full bg-white/20 flex-row justify-around items-center py-3 z-50">
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/Home')}>
            <Image
                source={require('app/images/home-ui/Home.png')}
                className="w-8 h-8"
                resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/habitViews')}>
            <Image
            source={require('app/images/home-ui/Stat.png')}
            className="w-8 h-8"
            resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/')}>
            <Image
            source={require('app/images/home-ui/Status_list.png')}
            className="w-8 h-8"
            resizeMode="contain"
            />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/screens/dashboard/profile')}>
            <Image
            source={require('app/images/home-ui/User.png')}
            className="w-8 h-8"
            resizeMode="contain"
            />
        </TouchableOpacity>
        </View>
    );
}
