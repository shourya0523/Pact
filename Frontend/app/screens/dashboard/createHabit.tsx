import React, { useState } from 'react'
import { View, Text, TextInput, Image } from 'react-native'
import { useRouter } from 'expo-router'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton';
import LightGreyButton from '@/components/ui/lightGreyButton'
import PurpleButton from '@/components/ui/purpleButton'
import GoalType from '@/components/popups/goal-set'
import InvitePartners from '@/components/popups/invite-partner'

export default function StudyHabitCreation() {
    const router = useRouter()
    const [goalPopupVisible, setGoalPopupVisible] = useState(false)
    const [goalType, setGoalType] = useState<'completion' | 'frequency' | null>(null)
    const [invitePopupVisible, setInvitePopupVisible] = useState(false)

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <Image
                source={require('app/images/space/spark.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 300, right: 165 }}
                resizeMode="cover"
            />
            <Image
                source={require('app/images/space/spark.png')}
                className="absolute bottom-0 right-0"
                style={{ height: 380, left: 260, bottom: 600 }}
                resizeMode="cover"
            />
            <View className="flex-1 justify-center items-center">
                <Text className="font-wix text-white text-[38px] mt-12 text-center">Create Habit</Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-12"
                    placeholder="Study everyday"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                />
                <Text className="font-wix text-white text-[24px] text-center mt-4">Habit Type</Text>
                <View className="flex-row justify-center space-x-8 mt-4">
                    <LightGreyButton 
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="Build"
                        style={{ width: '140px' }}
                    />
                    <LightGreyButton 
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="Break"
                        style={{ width: '140px', backgroundColor: "rgba(129, 132, 152, 0.4)" }}
                    />
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
                <View className="flex-row justify-center space-x-16 mt-4">
                    <View className="items-center">
                        <Text className="font-wix text-white text-[24px] text-center mb-8">
                        Invite Partner!
                        </Text>
                        <PurpleButton 
                            onPress={() => setInvitePopupVisible(true)}
                            text="INVITE"
                        />
                    </View>

                    <View className="items-center">
                        <Text className="font-wix text-white text-[24px] text-center mb-8">
                            Set Goal
                        </Text>
                        <PurpleButton 
                            onPress={() => setGoalPopupVisible(true)}
                            text="SET"
                        />
                    </View>
                </View>
                <Text className="font-wix text-white text-[24px] text-center mt-6">Repeat</Text>
                <View className="flex-row justify-center space-x-4 mt-10">
                    <LightGreyButton 
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="Daily"
                    />
                    <LightGreyButton 
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="Weekly"
                    />
                    <LightGreyButton 
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="Monthly"
                    />
                </View>
                <View className="flex-row justify-center mt-20 mb-10">
                    <GreyButton
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="CREATE"
                        style={{ marginRight: 14, width: '200px', height: '65px' }}
                    />
                    <GreyButton
                        onPress={() => router.push('/screens/dashboard/habitCreated')}
                        text="SAVE"
                        style={{ width: '200px', height: '65px'}}
                    />
                </View>
            </View>

            <GoalType
                visible={goalPopupVisible}
                onClose={() => setGoalPopupVisible(false)}
                onSelect={(type) => {
                setGoalType(type)
                }}
            />

            <InvitePartners
                visible={invitePopupVisible}
                onClose={() => setInvitePopupVisible(false)}
                onSelect={(type) => {
                setGoalType(type)
                }}
            />
        </View>
    )
}