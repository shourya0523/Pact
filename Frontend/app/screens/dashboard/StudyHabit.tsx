import React from 'react'
import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import WhiteParticles from 'app/components/space/whiteStarsParticlesBackground'

export default function StudyHabit() {
    const router = useRouter()

    return (
        <View className="flex-1 relative">
            <WhiteParticles />
            
        </View>
    )
}