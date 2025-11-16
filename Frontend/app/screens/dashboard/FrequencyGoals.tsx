import React from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import BackwardButton from '@/components/ui/backwardButton'
import GreyButton from '@/components/ui/greyButton';

export default function Goals() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
            <WhiteParticles />

            {/* Back button */}
            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton />
            </View>

            {/* Main content */}
            <View className="flex-1 justify-start items-center pt-20 px-6">
                {/* Title */}
                <Text className="font-wix text-white text-[38px] text-center max-w-[80%]">
                    Create Frequency Goal
                </Text>

                {/* Goal Name */}
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-12"
                    placeholder="Goal name"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                />

                {/* Description */}
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Description
                </Text>
                <TextInput
                    className="w-[80%] h-[120px] bg-white/85 rounded-[20px] text-[16px] font-wix mt-4"
                    placeholder="Habit description"
                    placeholderTextColor="#3F414E"
                    multiline
                    textAlignVertical="top"
                    style={{ padding: 20 }}
                />

                {/* Select Frequency */}
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Select Frequency
                </Text>
                <View className="flex-row justify-center space-x-6 mt-6">
                    {['Daily', 'Weekly', 'Monthly'].map((freq) => (
                        <Pressable
                            key={freq}
                            className="w-[125px] h-[40px] rounded-full bg-[#818498] flex items-center justify-center"
                            onPress={() => console.log(`${freq} pressed`)}
                        >
                            <Text className="text-white font-wix text-[16px]">{freq}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Frequency Amount */}
                <Text className="font-wix text-white text-[24px] text-center mt-8 max-w-[80%]">
                    Specify Frequency Amount
                </Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-4"
                    placeholder="Enter value"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                />
            </View>

            {/* Buttons fixed at bottom */}
            <View className="absolute bottom-12 w-full px-6 flex-row justify-center space-x-4">
                <GreyButton
                    onPress={() => router.push('/screens/dashboard/habitCreated')}
                    text="CREATE"
                    style={{ width: 190, height: 65 }}
                />
                <GreyButton
                    onPress={() => router.push('/screens/dashboard/habitCreated')}
                    text="SAVE"
                    style={{ width: 190, height: 65 }}
                />
            </View>
        </View>
    )
}
