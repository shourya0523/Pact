import React from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import Particles from '@/components/ui/starsParticlesBackground'
import GreyButton from '@/components/ui/greyButton';

export default function Goals() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
            <Particles />
            <View className="flex-1 justify-center items-center">
                <Text className="font-wix text-white text-[38px] text-center">Create Frequency Goal</Text>
            <TextInput
                className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-16"
                placeholder="Goal name"
                placeholderTextColor="#3F414E"
                style={{ paddingHorizontal: 20 }}
            />
            <Text className="font-wix text-white text-[24px] text-center mt-10">Description</Text>
                <TextInput
                    className="w-[80%] h-[120px] bg-white/85 rounded-[20px] text-[16px] font-wix mt-4"
                    placeholder="Habit descripton"
                    placeholderTextColor="#3F414E"
                    multiline
                    textAlignVertical="top"
                    style={{ padding: 20 }}
                />
            <Text className="font-wix text-white text-[24px] text-center mt-6">Select Frequency</Text>
                <View className="flex-row justify-center space-x-10 mt-10">
                            <Pressable
                                className="w-[125px] h-[40px] rounded-[40px] bg-[#818498] flex items-center justify-center"
                                onPress={() => console.log('Daily pressed')}
                            >
                                <Text className="text-white font-wix text-[16px]">Daily</Text>
                            </Pressable>
            
                            <Pressable
                                className="w-[125px] h-[40px] rounded-[40px] bg-[#818498] flex items-center justify-center"
                                onPress={() => console.log('Weekly pressed')}
                            >
                                <Text className="text-white font-wix text-[16px]">Weekly</Text>
                            </Pressable>
            
                            <Pressable
                                className="w-[125px] h-[40px] rounded-[40px] bg-[#818498] flex items-center justify-center"
                                onPress={() => console.log('Monthly pressed')}
                            >
                        <Text className="text-white font-wix text-[16px]">Monthly</Text>
                    </Pressable>
                </View>
                <Text className="font-wix text-white text-[24px] text-center mt-8">Specify Frequency Amount</Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-8"
                    placeholder="Goal name"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                />
                <View className="flex-row justify-center mt-20">
                    <GreyButton
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="CREATE"
                        style={{ marginRight: 10, width: '190px', height: '65px' }}
                    />
                    <GreyButton
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="SAVE"
                        style={{ width: '190px', height: '65px'}}
                    />
                </View>
            </View>
        </View>
    )
}