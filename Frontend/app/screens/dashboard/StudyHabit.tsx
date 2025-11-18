import React from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import Particles from '@/components/ui/starsParticlesBackground'
import GreyButton from '@/components/ui/greyButton';

export default function StudyHabit() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
            <Particles />
            <View className="flex-1 justify-center items-center">
                <Text className="font-wix text-white text-[38px] text-center">Create Habit</Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-16"
                    placeholder="Study everyday"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                />
                <Text className="font-wix text-white text-[24px] text-center mt-4">Habit Type</Text>
                <View className="flex-row justify-center space-x-8 mt-4">
                    <Pressable
                        className="w-[140px] h-[40px] rounded-[40px] bg-[#818498] flex items-center justify-center"
                        onPress={() => console.log('Daily pressed')}
                    >
                        <Text className="text-white font-wix text-[16px]">Daily</Text>
                    </Pressable>

                    <Pressable
                        className="w-[140px] h-[40px] rounded-[40px] bg-[#818498] flex items-center justify-center"
                        onPress={() => console.log('Weekly pressed')}
                    >
                        <Text className="text-white font-wix text-[16px]">Weekly</Text>
                    </Pressable>
                </View>
                <Text className="font-wix text-white text-[24px] text-center mt-4">Description</Text>
                <TextInput
                    className="w-[80%] h-[120px] bg-white/85 rounded-[20px] text-[16px] font-wix mt-4"
                    placeholder="Habit descripton"
                    placeholderTextColor="#3F414E"
                    multiline
                    textAlignVertical="top"
                    style={{ padding: 20 }}
                />
                <View className="flex-row justify-center space-x-24 mt-4">
                    <View className="items-center">
                        <Text className="font-wix text-white text-[24px] text-center mb-6">
                        Invite Partner!
                        </Text>
                        <Pressable
                        className="w-[160px] h-[50px] rounded-[40px] bg-white/25 flex items-center justify-center"
                        onPress={() => console.log('Invite pressed')}
                        >
                        <Text className="text-white font-wix text-[16px]">INVITE</Text>
                        </Pressable>
                    </View>

                    <View className="items-center">
                        <Text className="font-wix text-white text-[24px] text-center mb-6">
                        Set Goal
                        </Text>

                        <Pressable
                        className="w-[160px] h-[50px] rounded-[40px] bg-[#D256D9] flex items-center justify-center"
                        onPress={() => console.log('Set goal pressed')}
                        >
                        <Text className="text-white font-wix text-[16px]">SET</Text>
                        </Pressable>
                    </View>
                    </View>
                <Text className="font-wix text-white text-[24px] text-center mt-6">Repeat</Text>
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
                <View className="flex-row justify-center mt-20">
                    <GreyButton
                        onPress={() => {
                            console.log('Creating habit...');
                            // TODO: Save habit to backend
                            router.push('/screens/main/DashboardScreen');
                        }}
                        text="CREATE"
                        style={{ marginRight: 10, width: '190px', height: '65px' }}
                    />
                    <GreyButton
                        onPress={() => {
                            console.log('Saving habit as draft...');
                            // TODO: Save habit draft to backend
                            router.push('/screens/main/DashboardScreen');
                        }}
                        text="SAVE"
                        style={{ width: '190px', height: '65px'}}
                    />
                </View>
            </View>
        </View>
    )
}