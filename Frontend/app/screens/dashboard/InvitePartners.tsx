import React from 'react'
import { View, Text, TextInput, Image } from 'react-native'
import { useRouter } from 'expo-router'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'
import GreyButton from '@/components/ui/greyButton'
import OrComponent from '@/components/ui/or'
import PartnerBox from '@/components/ui/partnerBox'

export default function InvitePartners() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            <View className="flex-1 justify-center items-center">
                <Text className="font-wix text-white text-[38px] text-center">Invite Partner</Text>
                <View className="mt-10 mb-12">
                    <PartnerBox partner="Partner #1" />
                    <PartnerBox partner="Partner #2" />
                    <PartnerBox partner="Partner #3" />
                </View>
                <GreyButton
                    text="INVITE"
                    onPress={() => console.log('Invite pressed')}
                    style={{ width: '80%', marginBottom: 40 }}
                />
                <OrComponent />
                <Text className="font-wix text-white text-[24px] mt-2">Invite a Friend!</Text>
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-10"
                    placeholder="Search by username"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                />
                <TextInput
                    className="w-[80%] h-[50px] bg-white/85 rounded-[15px] text-[16px] font-wix mt-10"
                    placeholder="Link"
                    placeholderTextColor="#3F414E"
                    style={{ paddingHorizontal: 20 }}
                />
                <GreyButton
                    text="COPY LINK"
                    onPress={() => console.log('Invite pressed')}
                    style={{ width: '40%', height: '45px', marginTop: 20 }}
                />
            </View>
        </View>
    )
}