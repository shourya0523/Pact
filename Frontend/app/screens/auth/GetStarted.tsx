import React, { useState } from 'react'
import { useRouter } from 'expo-router';
import { Text, Image, View, TouchableOpacity, TextInput } from "react-native";

export default function LinkScreen() {
    const router = useRouter();
    const [link, setLink] = useState('')

    const handleCopyLink = () => {
        console.log('Link copied')
    }
    
    return (
        <View className="flex-1 bg-[#291133]">
            <View className="flex-1 items-center justify-between px-6 pt-16 pb-8">
                <View className="items-center">
                    <View className="mb-12">
                        <Image
                            source={require('../../images/space/planet-big.png')}
                            className='w-80 h-80'
                            resizeMode='contain'
                        />
                    </View>

                    <Text className='text-white text-3xl font-bold text-center mb-8 px-4'>
                        Don`t track your habits{'\n'}alone!
                    </Text>

                    <View className="w-full mb-4">
                        <TextInput
                        className="w-full bg-purple-200 rounded-full px-6 py-4 text-purple-900 text-base"
                        placeholder="Link"
                        placeholderTextColor="#7C3AED"
                        value={link}
                        onChangeText={setLink}
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-purple-700/80 rounded-full px-8 py-3 flex-row items-center"
                        activeOpacity={0.8}
                        onPress={handleCopyLink}
                    >
                        <View className="w-5 h-5 mr-2">
                        <View className="absolute top-0 left-1 w-3 h-4 border-2 border-white rounded" />
                        <View className="absolute bottom-0 right-1 w-3 h-4 border-2 border-white rounded bg-purple-700" />
                        </View>
                        <Text className="text-white text-sm font-semibold tracking-wide">
                        COPY LINK
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="absolute bottom-32 left-0 right-0 h-32 opacity-30">
                    <View className="absolute inset-0 bg-gradient-to-t from-purple-300 to-transparent rounded-full blur-3xl" />
                </View>

                <View className="w-full">
                    <TouchableOpacity
                        className="w-full bg-purple-800/60 rounded-full py-4 items-center"
                        activeOpacity={0.8}
                        onPress={() => router.push('/screens/onboarding/HabitSetupScreen')}
                    >
                        <Text className="text-white text-lg font-semibold tracking-wide">
                        CONTINUE
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}